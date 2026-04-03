import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

/** POST /api/v1/chat/conversations - Create a new conversation */
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizationId = (session.user as any).organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization context' }, { status: 400 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.slice(0, 200) : null;

    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        organizationId,
        title,
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'chat.conversations.create.failed');
  }
}

/** GET /api/v1/chat/conversations - List conversations for the current user */
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user!.id!;

    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        isResolved: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    return handleApiError(error, 'chat.conversations.list.failed');
  }
}
