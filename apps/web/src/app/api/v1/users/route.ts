import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { InviteUserSchema } from '@golab/shared';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; role: string; organizationId: string };

    const { searchParams } = new URL(request.url);
    const queryOrgId = searchParams.get('organizationId');

    // Admin roles can query any org; customer roles always use their own org
    const organizationId =
      ADMIN_ROLES.includes(user.role) && queryOrgId ? queryOrgId : user.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        preferredChannel: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; role: string; organizationId: string };

    const body = await request.json();
    const parsed = InviteUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const queryOrgId = searchParams.get('organizationId');

    // Admin roles can invite to any org; customer roles always use their own org
    const organizationId =
      ADMIN_ROLES.includes(user.role) && queryOrgId ? queryOrgId : user.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        organizationId,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    console.error('Failed to invite user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
