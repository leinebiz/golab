import type { ReactNode } from 'react';
import Link from 'next/link';
import { GoLabLogo } from '@/components/ui/golab-logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3">
            <GoLabLogo size="lg" className="shadow-lg shadow-blue-600/30" />
            <h1 className="text-3xl font-bold text-white">GoLab</h1>
          </Link>
          <p className="text-sm text-slate-400 mt-2">Laboratory Sample Testing Portal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
