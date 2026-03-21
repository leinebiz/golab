import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await prisma.notification.count({
    where: {
      userId,
      channel: 'PORTAL',
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
