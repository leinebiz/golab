import IORedis from 'ioredis';

/**
 * Shared Redis connection for BullMQ queues.
 * Reuses a singleton in development to avoid exhausting connections.
 */
const globalForRedis = globalThis as unknown as {
  bullRedis: IORedis | undefined;
};

function createRedisConnection(): IORedis {
  return new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });
}

export const redisConnection: IORedis = globalForRedis.bullRedis ?? createRedisConnection();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.bullRedis = redisConnection;
}
