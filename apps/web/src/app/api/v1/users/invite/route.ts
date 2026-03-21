import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { InviteUserSchema } from '@golab/shared';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = InviteUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { organizationId } = body;
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Check if user with this email already exists
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Create the invited user (without password - they'll set one via email invitation)
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        organizationId,
        isActive: true,
      },
    });

    // In production, this would send an invitation email via Resend
    // For now, just create the user record

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to invite user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
