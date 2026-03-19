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
  logger.error('Unhandled request error', {
    message: err.message,
    stack: err.stack,
    errorType: err.constructor?.name,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.email || req.user?.id,
    status: err.status || err.response?.status
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
