/**
 * OpenTelemetry tracing helpers.
 *
 * The actual SDK initialisation lives in ./instrumentation.ts and is
 * bootstrapped via the Next.js instrumentation hook at src/instrumentation.ts.
 *
 * This module re-exports the OTel API so business code can create custom
 * spans without depending on the SDK directly.
 */
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export const OTEL_SERVICE_NAME =
  process.env.OTEL_SERVICE_NAME ?? 'golab-portal';

/** Get a tracer scoped to a subsystem (e.g. "golab.requests") */
export function getTracer(name: string) {
  return trace.getTracer(name);
}

export { trace, context, SpanStatusCode };
