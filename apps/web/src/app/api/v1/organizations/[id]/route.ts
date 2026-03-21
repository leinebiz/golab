import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdateOrganizationSchema, CreateAddressSchema } from '@golab/shared';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { createdAt: 'desc' } },
        users: {
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
        },
        defaultTolerances: {
          include: {
            testCatalogue: {
              select: { id: true, code: true, name: true, category: true, toleranceUnit: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to fetch organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (body._action === 'createAddress') {
      const parsed = CreateAddressSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      if (parsed.data.isDefault) {
        await prisma.address.updateMany({
          where: { organizationId: id, type: parsed.data.type, isDefault: true },
          data: { isDefault: false },
        });
      }

      const address = await prisma.address.create({
        data: { ...parsed.data, organizationId: id },
      });

      return NextResponse.json(address, { status: 201 });
    }

    if (body._action === 'updateAddress') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _action, addressId, ...addressData } = body;
      const parsed = CreateAddressSchema.safeParse(addressData);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      if (parsed.data.isDefault) {
        await prisma.address.updateMany({
          where: { organizationId: id, type: parsed.data.type, isDefault: true },
          data: { isDefault: false },
        });
      }

      const address = await prisma.address.update({
        where: { id: addressId as string },
        data: parsed.data,
      });

      return NextResponse.json(address);
    }

    if (body._action === 'deleteAddress') {
      await prisma.address.delete({ where: { id: body.addressId } });
      return NextResponse.json({ success: true });
    }

    if (body._action === 'setDefaultAddress') {
      const address = await prisma.address.findUnique({ where: { id: body.addressId } });
      if (!address) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
      }

      await prisma.address.updateMany({
        where: { organizationId: id, type: address.type, isDefault: true },
        data: { isDefault: false },
      });

      const updated = await prisma.address.update({
        where: { id: body.addressId },
        data: { isDefault: true },
      });

      return NextResponse.json(updated);
    }

    // Default: update organization profile
    const parsed = UpdateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
