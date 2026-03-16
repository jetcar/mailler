const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const { passport } = require('./config/passport');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./utils/migrationRunner');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.TRUST_PROXY === 'true',
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true',
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

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);

  // Log query params if present
  if (Object.keys(req.query).length > 0) {
    console.log('  Query:', JSON.stringify(req.query));
  }

  // Log body for POST/PUT requests (but hide passwords)
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    console.log('  Body:', JSON.stringify(sanitizedBody));
  }

  // Log authentication status
  console.log('  Authenticated:', req.isAuthenticated());
  if (req.isAuthenticated()) {
    console.log('  User:', req.user?.email || req.user?.id);
  }
  console.log('  Session ID:', req.sessionID);

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
    // Initialize database and run migrations (similar to EF Core)
    if (process.env.AUTO_MIGRATE !== 'false') {
      await initializeDatabase();
    }

    await testConnection();

    app.listen(PORT, () => {
      console.log(`Mailler backend running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;

module.exports = app;
