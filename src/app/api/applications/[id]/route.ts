import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["ACCEPTED", "REJECTED", "COMPLETED", "VERIFIED"].includes(status)) {
    return NextResponse.json({ error: "Неверный статус" }, { status: 400 });
  }

  const application = await prisma.application.update({
    where: { id },
    data: { status },
    include: {
      task: { select: { title: true } },
      volunteer: { select: { name: true } },
    },
  });

  // Create notification for volunteer
  const notificationMessages: Record<string, string> = {
    ACCEPTED: `Ваша заявка на "${application.task.title}" принята!`,
    REJECTED: `К сожалению, ваша заявка на "${application.task.title}" отклонена.`,
    VERIFIED: `Ваша работа над "${application.task.title}" верифицирована! Часы подтверждены.`,
  };

  if (notificationMessages[status]) {
    await prisma.notification.create({
      data: {
        userId: application.volunteerId,
        title: status === "ACCEPTED" ? "Заявка принята!" : status === "VERIFIED" ? "Работа подтверждена!" : "Статус заявки",
        body: notificationMessages[status],
        type: "application_update",
        metadata: { applicationId: id, taskTitle: application.task.title },
      },
    });
  }

  return NextResponse.json({ application });
}
