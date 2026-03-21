import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { redirect } from 'next/navigation';
import { CreditApplicationForm } from './credit-form';

export default async function CreditApplicationPage() {
  const session = await requirePermission('creditAccount', 'apply');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const organizationId = user.organizationId as string;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { creditAccount: true },
  });

  if (!org) redirect('/portal/customer');
  if (org.creditAccount?.status === 'APPROVED') redirect('/portal/customer/finances');

  const existing = org.creditAccount;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Apply for Credit Account</h1>

      {existing?.status === 'PENDING_REVIEW' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-600">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Your credit application is currently under review.
          </p>
          <p className="text-sm text-amber-700 mt-1 dark:text-amber-400">
            Submitted on{' '}
            {existing.applicationDate
              ? new Date(existing.applicationDate).toLocaleDateString('en-ZA')
              : 'unknown date'}
            . We will notify you once a decision has been made.
          </p>
        </div>
      )}

      {existing?.status === 'DECLINED' && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:bg-red-900/20 dark:border-red-600">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Your previous application was declined.
          </p>
          {existing.reviewNotes && (
            <p className="text-sm text-red-700 mt-1 dark:text-red-400">
              Reason: {existing.reviewNotes}
            </p>
          )}
          <p className="text-sm text-red-700 mt-1 dark:text-red-400">
            You may submit a new application below.
          </p>
        </div>
      )}

      {(!existing || existing.status === 'NOT_APPLIED' || existing.status === 'DECLINED') && (
        <CreditApplicationForm organizationId={organizationId} organizationName={org.name} />
      )}
    </div>
  );
}
