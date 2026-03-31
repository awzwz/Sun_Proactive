import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Volunteer confirms task completion (for tasks without photo verification)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { applicationId } = await req.json();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId обязателен" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { task: { select: { title: true, curatorId: true, verificationCriteria: true } } },
  });

  if (!application) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  if (application.volunteerId !== session.user.id) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  if (application.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Заявка должна быть в статусе 'Принята'" }, { status: 400 });
  }

  // Update status to COMPLETED so curator can confirm
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "COMPLETED" },
  });

  // Notify curator
  await prisma.notification.create({
    data: {
      userId: application.task.curatorId,
      title: "Волонтёр завершил задачу",
      body: `Волонтёр отметил завершение работы по задаче "${application.task.title}". Подтвердите или отклоните.`,
      type: "verification_result",
      metadata: { applicationId, taskTitle: application.task.title },
    },
  });

  return NextResponse.json({ ok: true });
}
