import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};

  // Check PostgreSQL
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
      error: (err as Error).message,
    };
  }

  // Check Redis (optional)
  try {
    const Redis = await import('ioredis').catch(() => null);
    if (Redis && process.env.REDIS_URL) {
      const redisStart = Date.now();
      const redis = new Redis.default(process.env.REDIS_URL, {
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await redis.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
      await redis.quit();
    }
  } catch (err) {
    checks.redis = { status: 'error', error: (err as Error).message };
  }

  const overall = Object.values(checks).every((c) => c.status === 'ok') ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? 'dev',
      checks,
    },
    {
      status: overall === 'ok' ? 200 : 503,
    },
  );
}
