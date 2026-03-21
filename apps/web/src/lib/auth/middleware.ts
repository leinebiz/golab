import { auth } from './config';
import { hasPermission } from '@golab/shared';

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role as string;
  if (!allowedRoles.includes(role)) {
    throw new Error('Forbidden');
  }
  return session;
}

export async function requirePermission(resource: string, action: string) {
  const session = await requireAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role as string;
  if (!hasPermission(role, resource, action)) {
    throw new Error('Forbidden');
  }
  return session;
}
