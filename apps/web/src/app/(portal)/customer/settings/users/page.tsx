import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { UsersContent } from './_components/users-content';

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const organizationId = (session.user as unknown as Record<string, unknown>)
    .organizationId as string;

  if (!organizationId) redirect('/login');

  return <UsersContent organizationId={organizationId} />;
}
