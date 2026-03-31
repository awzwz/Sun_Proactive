import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: session.user.id } },
    },
    include: {
      participants: {
        select: { id: true, name: true, role: true, avatarUrl: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          deleted: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = conversations.map((c) => {
    const other = c.participants.find((p) => p.id !== session.user.id);
    const lastMsg = c.messages[0] || null;
    return {
      id: c.id,
      otherUser: other || null,
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            content: lastMsg.deleted ? "Сообщение удалено" : lastMsg.content,
            senderId: lastMsg.senderId,
            createdAt: lastMsg.createdAt,
          }
        : null,
      updatedAt: c.updatedAt,
    };
  });

  return NextResponse.json({ conversations: result });
  } catch (err) {
    console.error("GET /api/conversations error:", err);
    return NextResponse.json({ error: "Ошибка сервера", conversations: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { recipientId } = await req.json();
  if (!recipientId) {
    return NextResponse.json({ error: "recipientId обязателен" }, { status: 400 });
  }

  if (recipientId === session.user.id) {
    return NextResponse.json({ error: "Нельзя начать диалог с самим собой" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: session.user.id } } },
        { participants: { some: { id: recipientId } } },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: [{ id: session.user.id }, { id: recipientId }],
      },
    },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
