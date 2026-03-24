const express = require('express');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const { passport } = require('./config/passport');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./utils/migrationRunner');
const smtpListener = require('./services/smtp-listener');
const { logger } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const SMTP_PORTS = (process.env.SMTP_PORTS || '25,587,465')
  .split(',').map(p => parseInt(p.trim()));
const isProduction = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const frontendBuildPath = path.resolve(__dirname, '../public');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');

let redisClient = null;
let sessionConfigured = false;
let runtimeConfigured = false;

function getSessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (isProduction) {
    throw new Error('SESSION_SECRET is required in production');
  }

  logger.warn('SESSION_SECRET is not set; using an in-memory development fallback');
  return 'development-only-session-secret';
}

// Trust proxy - important for HAProxy/reverse proxy setups
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function createRedisClient() {
  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis reconnection failed');
        }

        return retries * 100;
      }
    }
  });

  client.on('error', (err) => logger.error('Redis client error', { error: err.message }));
  client.on('connect', () => logger.info('Redis client connecting', { url: redisUrl }));
  client.on('ready', () => logger.info('Redis client connected and ready'));

  return client;
}

async function resolveSessionStore() {
  const client = createRedisClient();

  try {
    await client.connect();
    redisClient = client;

    return new RedisStore({
      client,
      prefix: 'mailler:sess:',
      ttl: 24 * 60 * 60
    });
  } catch (error) {
    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch (closeError) {
      logger.warn('Failed to close Redis client after connection error', { error: closeError.message });
    }

    if (isProduction) {
      throw new Error(`Redis is required in production: ${error.message}`);
    }

    logger.warn('Redis unavailable; using in-memory session store', {
      redisUrl,
      error: error.message
    });

    return null;
  }
}

function configureSession(store) {
  if (sessionConfigured) {
    return;
  }

  const sessionOptions = {
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    proxy: process.env.TRUST_PROXY === 'true',
    cookie: {
      secure: isProduction || process.env.TRUST_PROXY === 'true',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    }
  };

  if (store) {
    sessionOptions.store = store;
  } else if (!isProduction) {
    logger.warn('Using express-session MemoryStore; sessions will reset on restart');
  }

  app.use(session(sessionOptions));
  sessionConfigured = true;
}

function configureRuntime() {
  if (runtimeConfigured) {
    return;
  }

  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, res, next) => {
    if (req.originalUrl === '/health' || req.originalUrl.endsWith('/health')) {
      return next();
    }

    logger.debug('Incoming request', {
      method: req.method,
      url: req.originalUrl,
      authenticated: req.isAuthenticated()
    });

    if (Object.keys(req.query).length > 0) {
      logger.debug('Request query', { query: req.query });
    }

    if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
      const sanitizedBody = { ...req.body };
      ['password', 'imap_password', 'smtp_password'].forEach((field) => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '***';
        }
      });
      logger.debug('Request body', { body: sanitizedBody });
    }

    next();
  });

  const hasFrontendBuild = fs.existsSync(frontendIndexPath);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const authRoutes = require('./routes/auth');
  const messageRoutes = require('./routes/messages');
  const accountRoutes = require('./routes/accounts');

  app.use('/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/webmail', authRoutes);

  if (hasFrontendBuild) {
    logger.info('Serving frontend build from backend', { frontendBuildPath });
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health') {
        return next();
      }

      return res.sendFile(frontendIndexPath);
    });
  } else {
    app.get('/', (req, res) => {
      res.json({
        message: 'Mailler API',
        version: '1.0.0',
        authenticated: req.isAuthenticated()
      });
    });
  }

  const { errorHandler } = require('./middleware/errorHandler');
  app.use(errorHandler);

  runtimeConfigured = true;
}

// Start server
async function start() {
  try {
    const sessionStore = await resolveSessionStore();
    configureSession(sessionStore);
    configureRuntime();

    // Initialize database and run migrations (similar to EF Core)
    if (process.env.AUTO_MIGRATE !== 'false') {
      await initializeDatabase();
    }

    await testConnection();

    app.listen(PORT, () => {
      logger.info('Mailler backend running', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Start SMTP servers for receiving emails on multiple ports
    smtpListener.startMultiple(SMTP_PORTS);
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

if (require.main !== module) {
  configureSession(null);
  configureRuntime();
}

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.app = app;
module.exports.start = start;
module.exports.redisClient = redisClient;
