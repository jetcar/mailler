const express = require('express');
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

// Initialize Redis client for sessions
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection failed');
      }
      return retries * 100; // Exponential backoff
    }
  }
});

redisClient.on('error', (err) => logger.error('Redis client error', { error: err.message }));
redisClient.on('connect', () => logger.info('Redis client connecting'));
redisClient.on('ready', () => logger.info('Redis client connected and ready'));

// Session configuration
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'mailler:sess:',
    ttl: 24 * 60 * 60 // 24 hours in seconds
  }),
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  proxy: process.env.TRUST_PROXY === 'true',
  cookie: {
    secure: isProduction || process.env.TRUST_PROXY === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    path: '/'
  }
}));

// Passport initialization (uses openid-client with signature validation)
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware - log all incoming requests (except health checks)
app.use((req, res, next) => {
  // Skip logging health check requests
  if (req.originalUrl === '/health' || req.originalUrl.endsWith('/health')) {
    return next();
  }

  logger.debug('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    authenticated: req.isAuthenticated()
  });

  // Log query params if present
  if (Object.keys(req.query).length > 0) {
    logger.debug('Request query', { query: req.query });
  }

  // Log body for POST/PUT requests (but hide passwords)
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

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Mailler API',
    version: '1.0.0',
    authenticated: req.isAuthenticated()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const accountRoutes = require('./routes/accounts');

app.use('/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/accounts', accountRoutes);

// Webmail OIDC callback route (mounted separately for HAProxy routing)
app.use('/webmail', authRoutes);

// Error handler
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
async function start() {
  try {
    await redisClient.connect();

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

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.app = app;
module.exports.start = start;
module.exports.redisClient = redisClient;
