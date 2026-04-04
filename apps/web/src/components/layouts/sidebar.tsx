'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  ClipboardList,
  FileCheck,
  Wallet,
  SlidersHorizontal,
  MessageCircle,
  Settings,
  PackageCheck,
  FlaskConical,
  Upload,
  AlertTriangle,
  CheckSquare,
  Building2,
  Users,
  BarChart3,
  FileText,
  Shield,
  CreditCard,
  Receipt,
  Banknote,
  Building,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type NavItem } from '@golab/shared';
import { useState } from 'react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Plus,
  ClipboardList,
  FileCheck,
  Wallet,
  SlidersHorizontal,
  MessageCircle,
  Settings,
  PackageCheck,
  FlaskConical,
  Upload,
  AlertTriangle,
  CheckSquare,
  Building2,
  Users,
  BarChart3,
  FileText,
  Shield,
  CreditCard,
  Receipt,
  Banknote,
  Building,
};

interface SidebarProps {
  navItems: NavItem[];
  userName?: string;
}

export function Sidebar({ navItems, userName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-white dark:bg-gray-950 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b">
        {!collapsed && (
          <Link href="/" className="text-xl font-bold text-blue-600">
            GoLab
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('p-1.5 rounded-md hover:bg-gray-100', collapsed ? 'mx-auto' : 'ml-auto')}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      {userName && !collapsed && (
        <div className="border-t p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {userName}
          </p>
        </div>
      )}
    </aside>
  );
}
