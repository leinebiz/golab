import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { TolerancesContent } from './_components/tolerances-content';

export default async function TolerancesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const organizationId = (session.user as unknown as Record<string, unknown>)
    .organizationId as string;

  if (!organizationId) redirect('/login');

  return <TolerancesContent organizationId={organizationId} />;
}
