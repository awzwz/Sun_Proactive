import { openai } from "./openai";
import { prisma } from "./prisma";

const EMBEDDING_MODEL = "text-embedding-3-small";

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

export async function storeTaskEmbedding(
  taskId: string,
  embedding: number[]
): Promise<void> {
  const vector = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "Task" SET "descriptionEmbedding" = $1::vector WHERE id = $2`,
    vector,
    taskId
  );
}

export async function storeProfileEmbedding(
  userId: string,
  embedding: number[]
): Promise<void> {
  const vector = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "profileEmbedding" = $1::vector WHERE id = $2`,
    vector,
    userId
  );
}

export async function findSimilarTasks(
  profileEmbedding: number[],
  limit: number = 20
): Promise<
  Array<{
    id: string;
    title: string;
    description: string;
    date: Date;
    location: string;
    city: string | null;
    format: string;
    requiredSkills: string[];
    softSkills: string[];
    volunteerQuota: number;
    status: string;
    curatorId: string;
    similarity: number;
  }>
> {
  const vector = `[${profileEmbedding.join(",")}]`;
  return prisma.$queryRawUnsafe(
    `SELECT id, title, description, date, location, city, format,
            "requiredSkills", "softSkills", "volunteerQuota", status, "curatorId",
            1 - ("descriptionEmbedding" <=> $1::vector) as similarity
     FROM "Task"
     WHERE status = 'ACTIVE'
       AND "descriptionEmbedding" IS NOT NULL
     ORDER BY "descriptionEmbedding" <=> $1::vector
     LIMIT $2`,
    vector,
    limit
  );
}

export async function findSimilarVolunteers(
  taskEmbedding: number[],
  limit: number = 20
): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    bio: string | null;
    skills: string[];
    interests: string[];
    goals: string | null;
    city: string | null;
    similarity: number;
  }>
> {
  const vector = `[${taskEmbedding.join(",")}]`;
  return prisma.$queryRawUnsafe(
    `SELECT id, name, email, bio, skills, interests, goals, city,
            1 - ("profileEmbedding" <=> $1::vector) as similarity
     FROM "User"
     WHERE role = 'VOLUNTEER'
       AND "profileEmbedding" IS NOT NULL
     ORDER BY "profileEmbedding" <=> $1::vector
     LIMIT $2`,
    vector,
    limit
  );
}

export function buildProfileText(user: {
  name: string;
  bio?: string | null;
  skills: string[];
  interests: string[];
  goals?: string | null;
  city?: string | null;
}): string {
  const parts = [`Имя: ${user.name}`];
  if (user.bio) parts.push(`О себе: ${user.bio}`);
  if (user.skills.length) parts.push(`Навыки: ${user.skills.join(", ")}`);
  if (user.interests.length)
    parts.push(`Интересы: ${user.interests.join(", ")}`);
  if (user.goals) parts.push(`Цели: ${user.goals}`);
  if (user.city) parts.push(`Город: ${user.city}`);
  return parts.join("\n");
}

export function buildTaskText(task: {
  title: string;
  description: string;
  requiredSkills: string[];
  softSkills: string[];
  location: string;
  city?: string | null;
  format?: string;
}): string {
  const parts = [
    `Задача: ${task.title}`,
    `Описание: ${task.description}`,
    `Локация: ${task.location}`,
  ];
  if (task.city) parts.push(`Город: ${task.city}`);
  if (task.format) parts.push(`Формат: ${task.format}`);
  if (task.requiredSkills.length)
    parts.push(`Требуемые навыки: ${task.requiredSkills.join(", ")}`);
  if (task.softSkills.length)
    parts.push(`Soft skills: ${task.softSkills.join(", ")}`);
  return parts.join("\n");
}
