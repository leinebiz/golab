import { logger } from '../observability/logger';

/**
 * Validates required environment variables at startup.
 * Called from instrumentation.ts to fail fast on missing config.
 */
export function validateEnvironment(): void {
  const required: Array<{ name: string; description: string }> = [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string' },
    { name: 'NEXTAUTH_SECRET', description: 'NextAuth.js session encryption secret' },
  ];

  const warnings: Array<{ name: string; description: string }> = [
    { name: 'REDIS_URL', description: 'Redis for BullMQ queues' },
    { name: 'S3_ENDPOINT', description: 'S3/MinIO endpoint for file storage' },
    { name: 'S3_ACCESS_KEY', description: 'S3/MinIO access key' },
    { name: 'S3_SECRET_KEY', description: 'S3/MinIO secret key' },
    { name: 'STRIPE_SECRET_KEY', description: 'Stripe API key for payments' },
    { name: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook verification' },
  ];

  const missing: string[] = [];
  for (const { name, description } of required) {
    if (!process.env[name]) {
      missing.push(`${name} (${description})`);
    }
  }

  if (missing.length > 0) {
    const msg = `Missing required environment variables:\n  - ${missing.join('\n  - ')}`;
    logger.error({ missing }, 'env.validation.failed');
    throw new Error(msg);
  }

  // Check for unsafe defaults
  if (process.env.NEXTAUTH_SECRET === 'change-me-to-a-random-secret-in-production') {
    logger.warn({ var: 'NEXTAUTH_SECRET' }, 'env.validation.unsafe_default');
  }

  // Warn about missing optional vars
  for (const { name, description } of warnings) {
    if (!process.env[name]) {
      logger.warn({ var: name, description }, 'env.validation.missing_optional');
    }
  }
}
