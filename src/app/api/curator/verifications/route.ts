import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CURATOR") {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Fetch pending verifications: applications that are COMPLETED for tasks created by this curator
  const pendingVerifications = await prisma.application.findMany({
    where: {
      status: "COMPLETED",
      task: {
        curatorId: session.user.id,
      },
    },
    include: {
      task: {
        select: { title: true, location: true, verificationCriteria: true },
      },
      volunteer: {
        select: { name: true, avatarUrl: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ verifications: pendingVerifications });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CURATOR") {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { applicationId, action, rating } = await req.json();

  if (!applicationId || !action) {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (rating != null && (typeof rating !== "number" || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "Рейтинг должен быть от 1 до 5" }, { status: 400 });
  }

  // Verify ownership
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { task: true },
  });

  if (!application || application.task.curatorId !== session.user.id) {
    return NextResponse.json({ error: "Заявка не найдена или нет прав" }, { status: 404 });
  }

  let newStatus: Prisma.ApplicationUpdateInput["status"];
  // APPROVE -> VERIFIED (Volunteer gets stats + rating)
  // REJECT -> ACCEPTED (Volunteer can upload again) or back to ACCEPTED for no-photo tasks
  if (action === "APPROVE") {
    newStatus = "VERIFIED";
  } else if (action === "REJECT") {
    newStatus = "ACCEPTED";
  } else {
    return NextResponse.json({ error: "Неверное действие" }, { status: 400 });
  }

  const updateData: Prisma.ApplicationUpdateInput = { status: newStatus };
  if (action === "APPROVE" && typeof rating === "number") {
    updateData.volunteerRating = rating;
  }

  const updatedApp = await prisma.application.update({
    where: { id: applicationId },
    data: updateData,
  });

  // Notify volunteer
  const notifBody =
    action === "APPROVE"
      ? `Ваша работа над "${application.task.title}" подтверждена!${rating ? ` Куратор поставил оценку ${rating}/5.` : ""}`
      : `Куратор вернул ваш отчёт по задаче "${application.task.title}" на доработку.`;

  await prisma.notification.create({
    data: {
      userId: application.volunteerId,
      title: action === "APPROVE" ? "Работа подтверждена!" : "Отчёт на доработке",
      body: notifBody,
      type: "verification_result",
      metadata: { applicationId, taskTitle: application.task.title, rating: rating ?? null },
    },
  });

  return NextResponse.json({ success: true, status: updatedApp.status });
}
