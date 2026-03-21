import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type CreditStatus = 'NOT_APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED' | 'SUSPENDED';

const STATUS_VARIANT: Record<
  CreditStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  NOT_APPLIED: 'secondary',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  DECLINED: 'destructive',
  SUSPENDED: 'destructive',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value);
}

const PLACEHOLDER_ACCOUNTS: {
  id: string;
  organizationName: string;
  paymentType: 'CREDIT' | 'COD';
  creditStatus: CreditStatus;
  creditLimit: number;
  availableCredit: number;
  outstandingBalance: number;
}[] = [];

export default function AccountsPage() {
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
          {PLACEHOLDER_ACCOUNTS.length === 0 ? (
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
                  {PLACEHOLDER_ACCOUNTS.map((account) => (
                    <tr key={account.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{account.organizationName}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={account.paymentType === 'CREDIT' ? 'default' : 'secondary'}>
                          {account.paymentType}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={STATUS_VARIANT[account.creditStatus]}>
                          {account.creditStatus.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono">{formatCurrency(account.creditLimit)}</td>
                      <td className="py-3 pr-4 font-mono text-green-600">
                        {formatCurrency(account.availableCredit)}
                      </td>
                      <td className="py-3 font-mono text-orange-600">
                        {formatCurrency(account.outstandingBalance)}
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
