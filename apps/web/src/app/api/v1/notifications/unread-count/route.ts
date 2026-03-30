import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { auth } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const count = await prisma.notification.count({
    where: {
      userId,
      channel: 'PORTAL',
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
