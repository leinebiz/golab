/**
 * Redis connection config for BullMQ queues.
 *
 * Uses plain connection options (not an IORedis instance) to avoid
 * version mismatches between the app's ioredis and BullMQ's bundled version.
 */
export const redisConnectionOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD ?? undefined,
  maxRetriesPerRequest: null as null, // required by BullMQ
};
