import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { SettingsContent } from './_components/settings-content';

export default async function CustomerSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = session.user.id!;
  const organizationId = (session.user as unknown as Record<string, unknown>)
    .organizationId as string;

  if (!organizationId) redirect('/login');

  return <SettingsContent organizationId={organizationId} userId={userId} />;
}
