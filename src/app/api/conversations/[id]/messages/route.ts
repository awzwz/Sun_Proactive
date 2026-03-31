import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
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

  const message = await prisma.directMessage.create({
    data: {
      conversationId: id,
      senderId: session.user.id,
      content: content.trim(),
    },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message }, { status: 201 });
}
