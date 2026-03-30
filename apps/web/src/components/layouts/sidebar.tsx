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
  CreditCard,
  Receipt,
  Banknote,
  Building,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type NavItem } from '@golab/shared';
import { GoLabLogo } from '@/components/ui/golab-logo';
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
  CreditCard,
  Receipt,
  Banknote,
  Building,
  Mail,
  Shield,
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
        'hidden lg:flex flex-col bg-slate-900 text-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <GoLabLogo size="sm" />
            <span className="text-lg font-semibold tracking-tight">GoLab</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto">
            <GoLabLogo size="sm" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors',
            collapsed ? 'mx-auto mt-2' : 'ml-auto',
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' &&
                item.href !== '/customer' &&
                item.href !== '/lab' &&
                item.href !== '/finance' &&
                pathname.startsWith(item.href + '/'));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      {userName && !collapsed && (
        <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-200">
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
