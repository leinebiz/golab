import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

/**
 * Middleware that combines NextAuth authorization with request-ID propagation.
 * Uses NextAuth v5's `auth` wrapper which injects `request.auth` and runs
 * the `authorized` callback defined in the auth config.
 */
export default auth((request) => {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);
  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
