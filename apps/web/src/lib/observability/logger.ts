import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin: () => ({
    service: 'golab-portal',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION ?? '0.0.1',
  }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'stripe_secret',
      '*.apiKey',
      '*.secret',
      '*.token',
      'email',
      '*.email',
      'phone',
      '*.phone',
      'creditCard',
      '*.creditCard',
      'ssn',
      '*.ssn',
      'req.headers["x-api-key"]',
    ],
    remove: true,
  },
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Create a child logger with request context bound.
 * Use in API routes and server actions to correlate log entries.
 */
export function createRequestLogger(
  requestId: string,
  userId?: string,
  traceId?: string,
) {
  return logger.child({
    requestId,
    ...(userId != null && { userId }),
    ...(traceId != null && { traceId }),
  });
}
