'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  ClipboardList,
  MessageCircle,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTabItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MobileNavProps {
  role: string;
}

function getBottomTabs(role: string): MobileTabItem[] {
  if (role.startsWith('CUSTOMER')) {
    return [
      { label: 'Home', href: '/portal/customer', icon: LayoutDashboard },
      { label: 'Requests', href: '/portal/customer/requests', icon: ClipboardList },
      { label: 'New', href: '/portal/customer/requests/new', icon: Plus },
      { label: 'Reports', href: '/portal/customer/finances', icon: BarChart3 },
      { label: 'Chat', href: '/portal/customer/chat', icon: MessageCircle },
    ];
  }
  if (role.startsWith('LAB')) {
    return [
      { label: 'Home', href: '/portal/lab', icon: LayoutDashboard },
      { label: 'Incoming', href: '/portal/lab/incoming', icon: ClipboardList },
      { label: 'Progress', href: '/portal/lab/in-progress', icon: BarChart3 },
      { label: 'Upload', href: '/portal/lab/upload', icon: Plus },
      { label: 'Issues', href: '/portal/lab/issues', icon: MessageCircle },
    ];
  }
  // Admin / Finance
  return [
    { label: 'Home', href: '/portal/admin', icon: LayoutDashboard },
    { label: 'Requests', href: '/portal/admin/requests', icon: ClipboardList },
    { label: 'Review', href: '/portal/admin/review', icon: Plus },
    { label: 'Reports', href: '/portal/admin/reports', icon: BarChart3 },
    { label: 'Labs', href: '/portal/admin/labs', icon: MessageCircle },
  ];
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const tabs = getBottomTabs(role);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-gray-950 z-50">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium',
                isActive ? 'text-blue-600' : 'text-gray-500',
              )}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
