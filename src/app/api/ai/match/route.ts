import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  findSimilarTasks,
  findSimilarVolunteers,
  buildProfileText,
  buildTaskText,
} from "@/lib/embeddings";
import {
  rerankVolunteers,
  generateMatchExplanation,
  generateTaskMatchExplanation,
} from "@/lib/matching";

// GET: Volunteer sees matching tasks
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Доступно только для волонтёров" },
      { status: 403 }
    );
  }

  // Check if user has embedding
  const hasEmbedding = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "User" WHERE id = $1 AND "profileEmbedding" IS NOT NULL`,
    user.id
  );

  if (!hasEmbedding[0] || hasEmbedding[0].count === BigInt(0)) {
    // Generate embedding on the fly
    const profileText = buildProfileText(user);
    const embedding = await generateEmbedding(profileText);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "profileEmbedding" = $1::vector WHERE id = $2`,
      vector,
      user.id
    );
  }

  // Get profile embedding
  const embeddingResult = await prisma.$queryRawUnsafe<
    { embedding: string }[]
  >(
    `SELECT "profileEmbedding"::text as embedding FROM "User" WHERE id = $1`,
    user.id
  );

  if (!embeddingResult[0]?.embedding) {
    return NextResponse.json({ matches: [] });
  }

  const profileEmbedding = JSON.parse(embeddingResult[0].embedding);
  const tasks = await findSimilarTasks(profileEmbedding, 10);

  // Generate explanations for top 5
  const profileText = buildProfileText(user);
  const matchesWithExplanations = await Promise.all(
    tasks.slice(0, 5).map(async (task) => {
      const taskText = buildTaskText(task);
      const reasoning = await generateTaskMatchExplanation(
        taskText,
        profileText,
        Number(task.similarity)
      );
      return {
        ...task,
        similarity: Number(task.similarity),
        reasoning,
      };
    })
  );

  // Return remaining without explanations
  const remaining = tasks.slice(5).map((t) => ({
    ...t,
    similarity: Number(t.similarity),
    reasoning: null,
  }));

  return NextResponse.json({
    matches: [...matchesWithExplanations, ...remaining],
  });
}

// POST: Curator sees matching volunteers for a task
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { taskId } = await req.json();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  // Get task embedding
  const embeddingResult = await prisma.$queryRawUnsafe<
    { embedding: string }[]
  >(
    `SELECT "descriptionEmbedding"::text as embedding FROM "Task" WHERE id = $1`,
    taskId
  );

  if (!embeddingResult[0]?.embedding) {
    return NextResponse.json({ matches: [] });
  }

  const taskEmbedding = JSON.parse(embeddingResult[0].embedding);
  const volunteers = await findSimilarVolunteers(taskEmbedding, 20);

  // Get completed task counts for experience boost
  const completedCounts = await prisma.application.groupBy({
    by: ["volunteerId"],
    where: {
      status: { in: ["COMPLETED", "VERIFIED"] },
      volunteerId: { in: volunteers.map((v) => v.id) },
    },
    _count: true,
  });

  const countMap: Record<string, number> = {};
  for (const c of completedCounts) {
    countMap[c.volunteerId] = c._count;
  }

  // Hybrid reranking
  const rankedMatches = rerankVolunteers(
    volunteers.map((v) => ({ ...v, similarity: Number(v.similarity) })),
    task,
    countMap
  );

  // Filter out volunteers who already have an application for this task
  const existingApplications = await prisma.application.findMany({
    where: {
      taskId,
      volunteerId: { in: rankedMatches.map((m) => m.volunteer.id) },
    },
    select: { volunteerId: true },
  });
  const existingIds = new Set(existingApplications.map((a) => a.volunteerId));
  const newMatches = rankedMatches.filter((m) => !existingIds.has(m.volunteer.id));

  // Generate explanations for top 5 new matches
  const taskText = buildTaskText(task);
  const topMatches = await Promise.all(
    newMatches.slice(0, 5).map(async (match) => {
      const profileText = buildProfileText(match.volunteer);
      const reasoning = await generateMatchExplanation(
        profileText,
        taskText,
        match.factors
      );
      return { ...match, reasoning };
    })
  );

  const remaining = newMatches.slice(5);
  const allNewMatches = [...topMatches, ...remaining];

  return NextResponse.json({
    matches: allNewMatches,
  });
}
