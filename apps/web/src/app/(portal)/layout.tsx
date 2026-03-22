import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/layouts/portal-shell';
import { auth } from '@/lib/auth/config';
import { getNavForRole } from '@golab/shared';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const rawRole = (session.user as Record<string, unknown>)?.role;
  const role = typeof rawRole === 'string' ? rawRole : 'CUSTOMER_USER';
  const userName = session.user.name ?? 'User';
  const navItems = getNavForRole(role);

  return (
    <PortalShell navItems={navItems} role={role} userName={userName}>
      {children}
    </PortalShell>
  );
}
