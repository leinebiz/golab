import pino from 'pino';

/**
 * PII redaction paths — covers all sensitive fields across request objects,
 * nested properties, and top-level keys.
 */
const PII_REDACT_PATHS = [
  // Auth headers
  'req.headers.authorization',
  'req.headers.cookie',
  // Passwords
  'password',
  'passwordHash',
  '*.password',
  '*.passwordHash',
  // Tokens
  'accessToken',
  'refreshToken',
  'token',
  '*.accessToken',
  '*.refreshToken',
  '*.token',
  // API keys / secrets
  'stripe_secret',
  '*.apiKey',
  '*.secretKey',
  // PII fields
  'email',
  '*.email',
  'ssn',
  '*.ssn',
  'creditCard',
  '*.creditCard',
  'creditCardNumber',
  '*.creditCardNumber',
  // Cookie / authorization at any nesting
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
];

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
    paths: PII_REDACT_PATHS,
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
 * Context fields that can be bound to a child logger.
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

/**
 * Returns a child logger with the given context fields bound to every log line.
 *
 * Usage:
 *   const log = withContext({ requestId: req.id, userId: session.user.id });
 *   log.info('Processing request');
 */
export function withContext(context: LogContext): pino.Logger {
  return logger.child(context);
}

/**
 * Express/Connect-style middleware that injects request context into a child logger.
 * Attaches `req.log` with requestId, userId, and traceId bound.
 *
 * For Next.js API routes, use `getRequestLogger()` instead.
 */
export function requestContextMiddleware(
  req: {
    headers: Record<string, string | string[] | undefined>;
    id?: string;
    log?: pino.Logger;
  },
  _res: unknown,
  next: () => void,
): void {
  const requestId =
    (req.headers['x-request-id'] as string) ?? req.id ?? crypto.randomUUID();
  const traceId = req.headers['x-trace-id'] as string | undefined;
  const userId = req.headers['x-user-id'] as string | undefined;

  req.log = withContext({
    requestId,
    ...(traceId ? { traceId } : {}),
    ...(userId ? { userId } : {}),
  });

  next();
}

/**
 * Creates a request-scoped logger from Next.js request headers.
 * Use in API route handlers and server components.
 */
export function getRequestLogger(headers: Headers): pino.Logger {
  const requestId = headers.get('x-request-id') ?? crypto.randomUUID();
  const traceId = headers.get('x-trace-id') ?? undefined;
  const userId = headers.get('x-user-id') ?? undefined;

  return withContext({
    requestId,
    ...(traceId ? { traceId } : {}),
    ...(userId ? { userId } : {}),
  });
}
