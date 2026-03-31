import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  if (sessionId) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        chatType: true,
        task: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ messages });
  }

  // Get distinct chat sessions for the user
  const rawSessions = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    distinct: ["sessionId"],
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      chatType: true,
      createdAt: true,
      content: true,
      task: { select: { id: true, title: true } },
    },
    take: 20,
  });

  const sessions = rawSessions.map((s) => ({
    sessionId: s.sessionId,
    chatType: s.chatType,
    taskTitle: s.task?.title || null,
    taskId: s.task?.id || null,
    lastMessageAt: s.createdAt,
    preview: s.content.slice(0, 80),
  }));

  return NextResponse.json({ sessions });
}
