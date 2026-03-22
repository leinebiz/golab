import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { CreateAddressSchema } from '@golab/shared';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('organization', 'read');
    const user = session.user as { id: string; role: string; organizationId: string };
    const { id } = await params;

    if (!ADMIN_ROLES.includes(user.role) && user.organizationId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const addresses = await prisma.address.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(addresses);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('organization', 'update');
    const user = session.user as { id: string; role: string; organizationId: string };
    const { id } = await params;

    if (!ADMIN_ROLES.includes(user.role) && user.organizationId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const parsed = CreateAddressSchema.parse(body);

    // If setting as default, unset other defaults of same type
    if (parsed.isDefault) {
      await prisma.address.updateMany({
        where: { organizationId: id, type: parsed.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        ...parsed,
        organizationId: id,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
