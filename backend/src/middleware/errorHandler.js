const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('\n❌ ========== ERROR OCCURRED ==========');
  console.error('Timestamp:', new Date().toISOString());
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Error type:', err.constructor.name);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);

  if (req.sessionID) {
    console.error('Session ID:', req.sessionID);
  }

  if (req.user) {
    console.error('User:', req.user.email || req.user.id);
  }

  if (err.response) {
    console.error('HTTP Response:', {
      status: err.response.status,
      statusText: err.response.statusText,
      data: err.response.data
    });
  }
  console.error('========================================\n');

  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

module.exports = { errorHandler, logger };
