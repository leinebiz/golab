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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth/config';
import { prisma } from '@golab/database';
import { redirect } from 'next/navigation';

async function getKpis() {
  const [activeRequests, pendingReviews, pendingCreditApps, activeLabs] = await Promise.all([
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
  ]);

  return { activeRequests, pendingReviews, pendingCreditApps, activeLabs };
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
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of GoLab operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const value = kpis[kpi.key];
          return (
            <Link key={kpi.key} href={kpi.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{kpi.title}</CardTitle>
                  <Icon className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{value}</div>
                  <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
                  {kpi.key === 'pendingReviews' && value > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      Needs attention
                    </Badge>
                  )}
                  {kpi.key === 'pendingCreditApps' && value > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      Pending
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-100 p-2">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{link.title}</CardTitle>
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
