import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one digit'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Verify the target user belongs to the requester's org (or requester is admin).
 * Returns the target user if authorized, or a NextResponse error.
 */
async function verifyTargetUserOrg(
  sessionUser: { id: string; role: string; organizationId: string },
  targetUserId: string,
) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, organizationId: true },
  });

  if (!targetUser) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }

  if (
    !ADMIN_ROLES.includes(sessionUser.role) &&
    targetUser.organizationId !== sessionUser.organizationId
  ) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { targetUser };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const sessionUser = session.user as { id: string; role: string; organizationId: string };
    const { id } = await context.params;
    const body = await request.json();

    // Verify target user belongs to requester's org
    const check = await verifyTargetUserOrg(sessionUser, id);
    if ('error' in check && check.error instanceof NextResponse) {
      return check.error;
    }

    // Password change action
    if (body._action === 'changePassword') {
      const parsed = ChangePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.passwordHash) {
        const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
      }

      const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
      await prisma.user.update({
        where: { id },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({ success: true });
    }

    // Default: update user profile fields
    const allowedFields = [
      'name',
      'phone',
      'role',
      'isActive',
      'preferredChannel',
      'whatsappNumber',
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    logger.error({ error }, 'users.update.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const sessionUser = session.user as { id: string; role: string; organizationId: string };
    const { id } = await context.params;

    // Verify target user belongs to requester's org
    const check = await verifyTargetUserOrg(sessionUser, id);
    if ('error' in check && check.error instanceof NextResponse) {
      return check.error;
    }

    // Soft delete - deactivate rather than delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    logger.error({ error }, 'users.deactivate.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
