const winston = require('winston');
const { safeErrorMetadata } = require('../utils/safeErrorMetadata');

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
  logger.error('Unhandled request error', safeErrorMetadata(err, {
    path: req.path,
    method: req.method,
    userId: req.user?.id
  }));

  const status = err.status || err.response?.status || 500;
  const message = status >= 500 ? 'Internal server error' : (err.message || 'Request failed');

  res.status(status).json({
    error: {
      message
    }
  });
}

module.exports = { errorHandler, logger };
