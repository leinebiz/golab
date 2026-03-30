/**
 * Next.js instrumentation hook (Next.js 15 convention).
 *
 * This file is automatically loaded by Next.js when the app starts.
 * It initialises OpenTelemetry tracing and metrics collection.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fail fast on missing required environment variables
    const { validateEnvironment } = await import('@/lib/security/env-validation');
    validateEnvironment();

    // Dynamic import so the OTel SDK is only loaded on the server
    await import('@/lib/observability/instrumentation');
  }
}
