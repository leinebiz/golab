import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, approvedLimit, notes } = body as {
    action: 'approve' | 'decline';
    approvedLimit?: string;
    notes?: string;
  };

  if (!action || !['approve', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const account = await prisma.creditAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: 'Credit account not found' }, { status: 404 });
  }

  if (action === 'approve') {
    const limit = parseFloat(approvedLimit ?? '0');
    await prisma.creditAccount.update({
      where: { id },
      data: {
        status: 'APPROVED',
        creditLimit: limit,
        availableCredit: limit,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });
  } else {
    await prisma.creditAccount.update({
      where: { id },
      data: {
        status: 'DECLINED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });
  }

  return NextResponse.json({ success: true });
}
