import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, msgId } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      participants: { some: { id: session.user.id } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });
  }

  const message = await prisma.directMessage.findUnique({ where: { id: msgId } });

  if (!message || message.conversationId !== id) {
    return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
  }

  if (message.senderId !== session.user.id) {
    return NextResponse.json({ error: "Можно редактировать только свои сообщения" }, { status: 403 });
  }

  if (message.deleted) {
    return NextResponse.json({ error: "Нельзя редактировать удалённое сообщение" }, { status: 400 });
  }

  const updated = await prisma.directMessage.update({
    where: { id: msgId },
    data: { content: content.trim(), edited: true },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ message: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, msgId } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      participants: { some: { id: session.user.id } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });
  }

  const message = await prisma.directMessage.findUnique({ where: { id: msgId } });

  if (!message || message.conversationId !== id) {
    return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
  }

  if (message.senderId !== session.user.id) {
    return NextResponse.json({ error: "Можно удалять только свои сообщения" }, { status: 403 });
  }

  await prisma.directMessage.update({
    where: { id: msgId },
    data: { deleted: true, content: "" },
  });

  return NextResponse.json({ ok: true });
}
