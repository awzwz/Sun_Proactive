import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { findSimilarVolunteers } from "@/lib/embeddings";

export async function GET(req: NextRequest) {
  // Verify cron secret for production
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find urgent tasks: date within 24h, active, and unfilled quota
  const urgentTasks = await prisma.task.findMany({
    where: {
      status: "ACTIVE",
      date: {
        gte: now,
        lte: in24Hours,
      },
    },
    include: {
      _count: {
        select: {
          applications: {
            where: {
              status: { in: ["ACCEPTED", "PENDING"] },
            },
          },
        },
      },
    },
  });

  const notifications: Array<{
    taskId: string;
    taskTitle: string;
    volunteerId: string;
    volunteerName: string;
    message: string;
  }> = [];

  for (const task of urgentTasks) {
    const acceptedCount = task._count.applications;
    if (acceptedCount >= task.volunteerQuota) continue;

    // Get task embedding
    const embeddingResult = await prisma.$queryRawUnsafe<
      { embedding: string }[]
    >(
      `SELECT "descriptionEmbedding"::text as embedding FROM "Task" WHERE id = $1`,
      task.id
    );

    if (!embeddingResult[0]?.embedding) continue;

    const taskEmbedding = JSON.parse(embeddingResult[0].embedding);

    // Find matching volunteers who haven't applied yet
    const allVolunteers = await findSimilarVolunteers(taskEmbedding, 10);

    // Filter out those who already applied
    const existingApplications = await prisma.application.findMany({
      where: { taskId: task.id },
      select: { volunteerId: true },
    });
    const appliedIds = new Set(existingApplications.map((a) => a.volunteerId));
    const candidates = allVolunteers.filter((v) => !appliedIds.has(v.id));

    // Generate personalized notifications for top 5 candidates
    const slotsLeft = task.volunteerQuota - acceptedCount;

    for (const candidate of candidates.slice(0, 5)) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Сгенерируй короткое (2-3 предложения) персонализированное уведомление для волонтёра.
Тон: дружелюбный, мотивирующий, с указанием срочности.
Упомяни конкретные навыки волонтёра, которые подходят.
Отвечай на русском.`,
          },
          {
            role: "user",
            content: `Задача: "${task.title}" — ${task.description}
Дата: ${task.date.toLocaleDateString("ru-RU")} (менее 24 часов!)
Место: ${task.location}
Осталось мест: ${slotsLeft}
Волонтёр: ${candidate.name}
Навыки: ${candidate.skills.join(", ")}
Интересы: ${candidate.interests.join(", ")}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const message =
        response.choices[0].message.content || "Новая задача ждёт вас!";

      await prisma.notification.create({
        data: {
          userId: candidate.id,
          title: `Срочно: ${task.title}`,
          body: message,
          type: "deadline_alert",
          metadata: {
            taskId: task.id,
            similarity: Number(candidate.similarity),
            slotsLeft,
          },
        },
      });

      notifications.push({
        taskId: task.id,
        taskTitle: task.title,
        volunteerId: candidate.id,
        volunteerName: candidate.name,
        message,
      });
    }
  }

  return NextResponse.json({
    processed: urgentTasks.length,
    notificationsSent: notifications.length,
    details: notifications,
  });
}
