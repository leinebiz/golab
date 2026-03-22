import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';

/**
 * Standard API error response handler.
 *
 * Maps known error messages (Unauthorized, Forbidden) to appropriate HTTP
 * status codes and logs unknown errors before returning 500.
 */
export function handleApiError(err: unknown, context: string): NextResponse {
  const message = err instanceof Error ? err.message : 'Internal server error';

  if (message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (message === 'Forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (message.startsWith('Invalid transition') || message.startsWith('Guard rejected')) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, context);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
