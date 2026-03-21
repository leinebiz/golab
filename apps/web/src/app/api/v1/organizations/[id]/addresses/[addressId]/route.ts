import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateAddressSchema } from '@golab/shared';

interface RouteContext {
  params: Promise<{ id: string; addressId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id, addressId } = await context.params;
    const body = await request.json();
    const parsed = CreateAddressSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify address belongs to this organization
    const existing = await prisma.address.findFirst({
      where: { id: addressId, organizationId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults of same type
    const targetType = parsed.data.type ?? existing.type;
    if (parsed.data.isDefault) {
      await prisma.address.updateMany({
        where: {
          organizationId: id,
          type: targetType,
          isDefault: true,
          NOT: { id: addressId },
        },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: parsed.data,
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error('Failed to update address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id, addressId } = await context.params;

    // Verify address belongs to this organization
    const existing = await prisma.address.findFirst({
      where: { id: addressId, organizationId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await prisma.address.delete({ where: { id: addressId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
