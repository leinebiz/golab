import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { RequestForm } from './_components/request-form';

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  return <RequestForm organizationId={organizationId} />;
}
