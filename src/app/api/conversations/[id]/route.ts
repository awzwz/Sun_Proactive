import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      participants: { some: { id: session.user.id } },
    },
    include: {
      participants: {
        select: { id: true, name: true, role: true, avatarUrl: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });
  }

  const messages = await prisma.directMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      senderId: true,
      edited: true,
      deleted: true,
      createdAt: true,
      updatedAt: true,
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  const other = conversation.participants.find((p) => p.id !== session.user.id);

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      otherUser: other || null,
      participants: conversation.participants,
    },
    messages: messages.map((m) => ({
      ...m,
      content: m.deleted ? "Сообщение удалено" : m.content,
    })),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      participants: { some: { id: session.user.id } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
