import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import OpenAI from "openai";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

function buildProfileText(user: {
  name: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  goals: string | null;
  city: string | null;
}): string {
  const parts = [`Имя: ${user.name}`];
  if (user.bio) parts.push(`О себе: ${user.bio}`);
  if (user.skills.length) parts.push(`Навыки: ${user.skills.join(", ")}`);
  if (user.interests.length) parts.push(`Интересы: ${user.interests.join(", ")}`);
  if (user.goals) parts.push(`Цели: ${user.goals}`);
  if (user.city) parts.push(`Город: ${user.city}`);
  return parts.join("\n");
}

function buildTaskText(task: {
  title: string;
  description: string;
  requiredSkills: string[];
  softSkills: string[];
  location: string;
  city: string | null;
  format: string;
}): string {
  const parts = [
    `Задача: ${task.title}`,
    `Описание: ${task.description}`,
    `Локация: ${task.location}`,
  ];
  if (task.city) parts.push(`Город: ${task.city}`);
  parts.push(`Формат: ${task.format}`);
  if (task.requiredSkills.length) parts.push(`Требуемые навыки: ${task.requiredSkills.join(", ")}`);
  if (task.softSkills.length) parts.push(`Soft skills: ${task.softSkills.join(", ")}`);
  return parts.join("\n");
}

async function main() {
  console.log("Generating embeddings for all seed data...\n");

  // Generate volunteer profile embeddings
  const volunteers = await prisma.user.findMany({
    where: { role: "VOLUNTEER" },
  });

  console.log(`Found ${volunteers.length} volunteers`);
  for (const vol of volunteers) {
    const text = buildProfileText(vol);
    const embedding = await generateEmbedding(text);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "profileEmbedding" = $1::vector WHERE id = $2`,
      vector,
      vol.id
    );
    console.log(`  ✓ ${vol.name}`);
  }

  // Generate task description embeddings
  const tasks = await prisma.task.findMany();

  console.log(`\nFound ${tasks.length} tasks`);
  for (const task of tasks) {
    const text = buildTaskText(task);
    const embedding = await generateEmbedding(text);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "Task" SET "descriptionEmbedding" = $1::vector WHERE id = $2`,
      vector,
      task.id
    );
    console.log(`  ✓ ${task.title}`);
  }

  console.log("\nAll embeddings generated!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
