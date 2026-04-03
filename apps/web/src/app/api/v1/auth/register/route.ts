import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { RegisterSchema } from '@golab/shared';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

export async function POST(request: Request) {
  const start = performance.now();
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.companyName,
          registrationNumber: data.registrationNumber || null,
          vatNumber: data.vatNumber || null,
          industry: data.industry || null,
          type: 'CUSTOMER',
          paymentType: data.paymentType,
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          name: data.name,
          phone: data.phone || null,
          role: 'CUSTOMER_ADMIN',
          organizationId: organization.id,
        },
      });

      await tx.address.create({
        data: {
          organizationId: organization.id,
          type: 'BILLING',
          line1: data.addressLine1,
          line2: data.addressLine2 || null,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          country: data.country,
          isDefault: true,
        },
      });

      return { user, organization };
    });

    metrics.recordApiRequest(performance.now() - start, {
      route: 'auth.register',
      status: 'success',
    });
    return NextResponse.json(
      {
        message: 'Registration successful. Please check your email to verify your account.',
        userId: result.user.id,
      },
      { status: 201 },
    );
  } catch (error) {
    metrics.recordApiRequest(performance.now() - start, {
      route: 'auth.register',
      status: 'error',
    });
    logger.error({ error }, 'auth.register.failed');
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
