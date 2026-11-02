const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

function createLimiter({ limit, prefix, redisClient, windowMs = 15 * 60 * 1000 }) {
  const options = {
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  };

  if (redisClient) {
    options.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix
    });
  }

  return rateLimit(options);
}

module.exports = { createLimiter };
