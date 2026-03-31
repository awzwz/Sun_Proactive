import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  buildProfileText,
  buildTaskText,
} from "@/lib/embeddings";
import { generateMatchExplanation } from "@/lib/matching";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id: taskId } = await params;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 403 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  // Curator adding a volunteer from AI match results
  if (user.role === "CURATOR" && body.volunteerId) {
    const existing = await prisma.application.findUnique({
      where: { taskId_volunteerId: { taskId, volunteerId: body.volunteerId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Волонтёр уже в списке заявок" }, { status: 409 });
    }

    const application = await prisma.application.create({
      data: {
        taskId,
        volunteerId: body.volunteerId,
        matchScore: body.matchScore ?? null,
        matchReasoning: body.matchReasoning ?? null,
        rerankingFactors: body.rerankingFactors ?? null,
      },
    });
    return NextResponse.json({ application });
  }

  // Volunteer self-applying
  if (user.role !== "VOLUNTEER") {
    return NextResponse.json({ error: "Доступно только для волонтёров" }, { status: 403 });
  }

  const existing = await prisma.application.findUnique({
    where: { taskId_volunteerId: { taskId, volunteerId: user.id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Вы уже откликнулись на эту задачу" },
      { status: 409 }
    );
  }

  const profileText = buildProfileText(user);
  const taskText = buildTaskText(task);

  const [profileEmb, taskEmb] = await Promise.all([
    generateEmbedding(profileText),
    generateEmbedding(taskText),
  ]);

  const dotProduct = profileEmb.reduce((sum, a, i) => sum + a * taskEmb[i], 0);
  const normA = Math.sqrt(profileEmb.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(taskEmb.reduce((sum, a) => sum + a * a, 0));
  const similarity = dotProduct / (normA * normB);

  const factors = {
    semanticScore: similarity,
    cityMatch:
      task.format === "ONLINE" ||
      (!!user.city &&
        !!task.city &&
        user.city.toLowerCase() === task.city.toLowerCase()),
    formatMatch: true,
    experienceBoost: false,
    finalScore: similarity,
  };

  const reasoning = await generateMatchExplanation(
    profileText,
    taskText,
    factors
  );

  const application = await prisma.application.create({
    data: {
      taskId,
      volunteerId: user.id,
      matchScore: similarity,
      matchReasoning: reasoning,
      rerankingFactors: factors,
    },
  });

  return NextResponse.json({ application });
}
