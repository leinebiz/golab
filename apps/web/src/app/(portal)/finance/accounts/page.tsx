import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR } from '@/lib/finance/format';
import { CREDIT_STATUS_VARIANT } from '@/lib/finance/status-variants';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type CreditStatus = 'NOT_APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED' | 'SUSPENDED';

async function getAccounts() {
  const organizations = await prisma.organization.findMany({
    where: { type: 'CUSTOMER' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      paymentType: true,
      creditAccount: {
        select: {
          status: true,
          creditLimit: true,
          availableCredit: true,
          outstandingBalance: true,
        },
      },
    },
  });

  return organizations.map((org) => ({
    id: org.id,
    organizationName: org.name,
    paymentType: org.paymentType as 'CREDIT' | 'COD',
    creditStatus: (org.creditAccount?.status ?? 'NOT_APPLIED') as CreditStatus,
    creditLimit: org.creditAccount?.creditLimit?.toString() ?? '0',
    availableCredit: org.creditAccount?.availableCredit?.toString() ?? '0',
    outstandingBalance: org.creditAccount?.outstandingBalance?.toString() ?? '0',
  }));
}

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const role = (session.user as unknown as Record<string, unknown>).role as string;
  if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(role)) {
    redirect('/login');
  }

  const accounts = await getAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Accounts</h1>
        <p className="text-gray-500">Overview of all customer financial accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>Customer payment types and credit status</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Payment Type</th>
                    <th className="pb-2 pr-4">Credit Status</th>
                    <th className="pb-2 pr-4">Credit Limit</th>
                    <th className="pb-2 pr-4">Available</th>
                    <th className="pb-2">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{account.organizationName}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={account.paymentType === 'CREDIT' ? 'default' : 'secondary'}>
                          {account.paymentType}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={CREDIT_STATUS_VARIANT[account.creditStatus]}>
                          {account.creditStatus.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono">{formatZAR(account.creditLimit)}</td>
                      <td className="py-3 pr-4 font-mono text-green-600">
                        {formatZAR(account.availableCredit)}
                      </td>
                      <td className="py-3 font-mono text-orange-600">
                        {formatZAR(account.outstandingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
