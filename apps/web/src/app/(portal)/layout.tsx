import type { ReactNode } from 'react';
import { PortalShell } from '@/components/layouts/portal-shell';
import { CUSTOMER_NAV } from '@golab/shared';

// In production, this reads from the session to determine role + nav
// For now, default to customer nav as placeholder
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell navItems={CUSTOMER_NAV} role="CUSTOMER_ADMIN" userName="Demo User">
      {children}
    </PortalShell>
  );
}
