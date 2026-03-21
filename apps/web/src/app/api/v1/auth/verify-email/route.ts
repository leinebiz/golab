import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ message: 'Invalid verification token' }, { status: 400 });
    }

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'EMAIL_VERIFICATION_REQUESTED',
        metadata: {
          path: ['token'],
          equals: token,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!auditLog) {
      return NextResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 400 },
      );
    }

    const metadata = auditLog.metadata as { expiresAt?: string } | null;
    if (metadata?.expiresAt && new Date(metadata.expiresAt) < new Date()) {
      return NextResponse.json({ message: 'Verification token has expired' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auditLog.entityId },
        data: { emailVerified: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: auditLog.entityId,
          actorType: 'system',
          action: 'EMAIL_VERIFIED',
          entityType: 'User',
          entityId: auditLog.entityId,
        },
      });
    });

    return NextResponse.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
