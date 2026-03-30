'use client';

import Link from 'next/link';
import { Bell, Menu, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@golab/shared';

interface HeaderProps {
  navItems: NavItem[];
  userName?: string;
}

export function Header({ navItems, userName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center h-14 px-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={20} />
        </button>

        {/* Logo (mobile only) */}
        <Link href="/" className="lg:hidden ml-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            GL
          </div>
          <span className="text-base font-semibold text-slate-900">GoLab</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors relative">
          <Bell size={18} />
        </button>

        {/* User avatar */}
        <div className="ml-1 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-medium text-white">
            {userName
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2) ?? 'U'}
          </div>
          <span className="hidden md:block text-sm font-medium text-slate-700">{userName}</span>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-950 z-50 shadow-xl">
            <div className="flex items-center h-16 px-4 border-b">
              <Link
                href="/"
                className="text-xl font-bold text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                GoLab
              </Link>
            </div>
            <nav className="py-4">
              <ul className="space-y-1 px-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                        'text-gray-700 hover:bg-gray-100 dark:text-gray-300',
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
