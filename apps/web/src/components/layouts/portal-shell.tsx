'use client';

import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import type { NavItem } from '@golab/shared';

interface PortalShellProps {
  children: ReactNode;
  navItems: NavItem[];
  role: string;
  userName?: string;
}

export function PortalShell({ children, navItems, role, userName }: PortalShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <Sidebar navItems={navItems} userName={userName} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header navItems={navItems} userName={userName} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">{children}</main>

        {/* Mobile bottom tabs */}
        <MobileNav role={role} />
      </div>
    </div>
  );
}
