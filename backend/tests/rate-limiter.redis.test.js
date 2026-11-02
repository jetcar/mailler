const express = require('express');
const request = require('supertest');
const { createClient } = require('redis');
const { createLimiter } = require('../src/middleware/rateLimiter');

const redisUrl = process.env.TEST_REDIS_URL;
const describeWithRedis = redisUrl ? describe : describe.skip;

describeWithRedis('Redis-backed rate limiting', () => {
  let redisClient;
  let prefix;

  beforeAll(async () => {
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
  });

  afterAll(async () => {
    if (!redisClient) {
      return;
    }

    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*` })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    await redisClient.quit();
  });

  test('shares counters and TTLs across application instances', async () => {
    prefix = `mailler:test-rate-limit:${Date.now()}:`;
    const buildApp = () => {
      const app = express();
      app.use(createLimiter({ limit: 2, prefix, redisClient, windowMs: 60_000 }));
      app.get('/limited', (req, res) => res.json({ ok: true }));
      return app;
    };
    const firstApp = buildApp();
    const secondApp = buildApp();

    await request(firstApp).get('/limited').expect(200);
    await request(firstApp).get('/limited').expect(200);
    await request(secondApp).get('/limited').expect(429);

    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*` })) {
      keys.push(key);
    }
    expect(keys).toHaveLength(1);
    const ttl = await redisClient.pTTL(keys[0]);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60_000);
  });
});
