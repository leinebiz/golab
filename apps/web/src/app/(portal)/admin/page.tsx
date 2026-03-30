import Link from 'next/link';
import {
  ClipboardList,
  Users,
  FlaskConical,
  BarChart3,
  ShieldCheck,
  TestTubes,
  FileSearch,
  CreditCard,
  Activity,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth/config';
import { prisma } from '@golab/database';
import { redirect } from 'next/navigation';

async function getKpis() {
  const [activeRequests, pendingReviews, pendingCreditApps, activeLabs, openExceptions] =
    await Promise.all([
      prisma.request
        .count({
          where: {
            status: {
              notIn: ['CLOSED', 'CANCELLED'],
            },
          },
        })
        .catch(() => 0),
      prisma.subRequest
        .count({
          where: {
            status: 'AWAITING_GOLAB_REVIEW',
          },
        })
        .catch(() => 0),
      prisma.creditAccount
        .count({
          where: {
            status: 'PENDING_REVIEW',
          },
        })
        .catch(() => 0),
      prisma.laboratory
        .count({
          where: {
            isActive: true,
          },
        })
        .catch(() => 0),
      prisma.sampleIssue
        .count({
          where: {
            resolvedAt: null,
          },
        })
        .catch(() => 0),
    ]);

  return { activeRequests, pendingReviews, pendingCreditApps, activeLabs, openExceptions };
}

const kpiCards = [
  {
    title: 'Active Requests',
    key: 'activeRequests' as const,
    icon: ClipboardList,
    description: 'Requests not closed or cancelled',
    href: '/admin/requests',
  },
  {
    title: 'Pending Reviews',
    key: 'pendingReviews' as const,
    icon: FileSearch,
    description: 'Sub-requests awaiting GoLab review',
    href: '/admin/review',
  },
  {
    title: 'Credit Applications',
    key: 'pendingCreditApps' as const,
    icon: CreditCard,
    description: 'Credit accounts pending review',
    href: '/admin/customers',
  },
  {
    title: 'Active Labs',
    key: 'activeLabs' as const,
    icon: Building2,
    description: 'Currently active laboratories',
    href: '/admin/labs',
  },
];

const quickLinks = [
  {
    title: 'Requests',
    description: 'View and manage test requests',
    href: '/admin/requests',
    icon: ClipboardList,
  },
  {
    title: 'Customers',
    description: 'Manage customer accounts and credit',
    href: '/admin/customers',
    icon: Users,
  },
  {
    title: 'Laboratories',
    description: 'Manage partner labs and capabilities',
    href: '/admin/labs',
    icon: FlaskConical,
  },
  {
    title: 'Reports',
    description: 'Analytics and business reports',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    title: 'Review Queue',
    description: 'Review pending test results',
    href: '/admin/review',
    icon: ShieldCheck,
  },
  {
    title: 'Test Catalogue',
    description: 'Manage available tests and pricing',
    href: '/admin/tests',
    icon: TestTubes,
  },
  {
    title: 'Exceptions',
    description: 'Manage sample issues and exceptions',
    href: '/admin/exceptions',
    icon: AlertTriangle,
  },
];

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as unknown as Record<string, unknown>).role as string;
  const adminRoles = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];
  if (!adminRoles.includes(role)) {
    redirect('/login');
  }

  const kpis = await getKpis();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of GoLab operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const value = kpis[kpi.key];
          return (
            <Link key={kpi.key} href={kpi.href}>
              <Card className="hover:shadow-md hover:border-slate-300 transition-all group h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">{kpi.title}</CardTitle>
                  <div className="rounded-lg bg-slate-100 p-1.5 group-hover:bg-blue-50 transition-colors">
                    <Icon className="h-4 w-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{value}</div>
                  <p className="text-xs text-slate-500 mt-1">{kpi.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:shadow-md hover:border-slate-300 transition-all h-full group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2.5 group-hover:bg-blue-100 transition-colors">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-slate-900">{link.title}</CardTitle>
                        <CardDescription>{link.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
