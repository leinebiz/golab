import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { redisConnectionOptions } from '@/lib/notifications/redis';
import { logger } from '@/lib/observability/logger';

/**
 * Redis-backed rate limiter with in-memory fallback.
 *
 * The synchronous `checkRateLimit` uses the in-memory store.
 * The async `checkRateLimitRedis` uses Redis INCR + EXPIRE for
 * multi-instance deployments and falls back to in-memory on error.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired in-memory entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  upload: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  webhook: { maxRequests: 200, windowMs: 60 * 1000 }, // 200 per minute
};

// ---------------------------------------------------------------------------
// Redis client (lazy-init)
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis({
      host: redisConnectionOptions.host,
      port: redisConnectionOptions.port,
      password: redisConnectionOptions.password,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err: unknown) => {
      logger.warn({ err }, 'rate-limiter: redis connection error');
    });

    void redisClient.connect().catch(() => {
      /* handled by error event */
    });

    return redisClient;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// In-memory check (synchronous)
// ---------------------------------------------------------------------------

export function checkRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMITS = 'api',
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

// ---------------------------------------------------------------------------
// Redis-backed check (async, falls back to in-memory)
// ---------------------------------------------------------------------------

export async function checkRateLimitRedis(
  identifier: string,
  type: keyof typeof RATE_LIMITS = 'api',
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[type];
  const key = `rl:${type}:${identifier}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  const redis = getRedisClient();
  if (!redis) {
    return checkRateLimit(identifier, type);
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const count = (results?.[0]?.[1] as number) ?? 1;
    let ttl = (results?.[1]?.[1] as number) ?? -1;

    if (count === 1 || ttl < 0) {
      await redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    const resetAt = Date.now() + Math.max(ttl, 0) * 1000;
    const remaining = Math.max(0, config.maxRequests - count);

    return { allowed: count <= config.maxRequests, remaining, resetAt };
  } catch (err) {
    logger.warn({ err }, 'rate-limiter: redis call failed, falling back to in-memory');
    return checkRateLimit(identifier, type);
  }
}

// ---------------------------------------------------------------------------
// 429 response helper
// ---------------------------------------------------------------------------

export function rateLimitResponse(resetAt: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    },
  );
}
