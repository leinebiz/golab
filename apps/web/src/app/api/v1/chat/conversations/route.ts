import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';

/** POST /api/v1/chat/conversations - Create a new conversation */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : null;

  const userId = session.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 400 });
  }

  const conversation = await prisma.chatConversation.create({
    data: {
      userId,
      organizationId,
      title,
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}

/** GET /api/v1/chat/conversations - List conversations for the current user */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.chatConversation.findMany({
    where: { userId: session.user.id },
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
}
