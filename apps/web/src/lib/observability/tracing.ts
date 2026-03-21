// OpenTelemetry instrumentation — loaded via NODE_OPTIONS or instrumentation.ts
// This module is imported at app startup to initialize tracing.

// Tracing is configured via environment variables:
// OTEL_EXPORTER_OTLP_ENDPOINT - OTel collector endpoint
// OTEL_SERVICE_NAME - Service name (default: golab-portal)

// The actual initialization is handled by @opentelemetry/auto-instrumentations-node
// which auto-instruments: HTTP, Prisma, fetch, etc.

export const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'golab-portal';
