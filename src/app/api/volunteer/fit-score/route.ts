import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  buildProfileText,
  buildTaskText,
} from "@/lib/embeddings";
import { generateTaskMatchExplanation } from "@/lib/matching";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { taskId } = await req.json();
  if (!taskId) {
    return NextResponse.json({ error: "taskId обязателен" }, { status: 400 });
  }

  const [user, task] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.task.findUnique({ where: { id: taskId } }),
  ]);

  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (!task) return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });

  // Ensure user has an embedding
  const hasEmbedding = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "User" WHERE id = $1 AND "profileEmbedding" IS NOT NULL`,
    user.id
  );

  if (!hasEmbedding[0] || hasEmbedding[0].count === BigInt(0)) {
    const profileText = buildProfileText(user);
    const embedding = await generateEmbedding(profileText);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "profileEmbedding" = $1::vector WHERE id = $2`,
      vector,
      user.id
    );
  }

  // Compute cosine similarity between user embedding and task embedding
  const result = await prisma.$queryRawUnsafe<{ similarity: number }[]>(
    `SELECT 1 - ("profileEmbedding" <=> t."descriptionEmbedding") as similarity
     FROM "User" u, "Task" t
     WHERE u.id = $1 AND t.id = $2
       AND u."profileEmbedding" IS NOT NULL
       AND t."descriptionEmbedding" IS NOT NULL`,
    user.id,
    taskId
  );

  if (!result[0]) {
    return NextResponse.json({
      score: null,
      reasoning: "Не удалось рассчитать — заполните профиль и попробуйте снова.",
    });
  }

  let score = Number(result[0].similarity);

  // City match bonus
  const cityMatch =
    task.format === "ONLINE" ||
    (!!user.city && !!task.city && user.city.toLowerCase() === task.city.toLowerCase());
  if (cityMatch) score += 0.1;

  // Experience bonus
  const completedCount = await prisma.application.count({
    where: { volunteerId: user.id, status: { in: ["COMPLETED", "VERIFIED"] } },
  });
  score += Math.min(completedCount * 0.05, 0.15);
  score = Math.min(Math.max(score, 0), 1);

  // Generate a short explanation
  const profileText = buildProfileText(user);
  const taskText = buildTaskText(task);
  const reasoning = await generateTaskMatchExplanation(taskText, profileText, score);

  return NextResponse.json({ score, reasoning });
}
