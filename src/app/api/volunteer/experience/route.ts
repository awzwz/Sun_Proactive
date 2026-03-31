import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Keywords for category classification
const CATEGORIES = [
  {
    key: "ecology",
    label: "Экология",
    icon: "eco",
    color: "bg-emerald-100 text-emerald-600",
    keywords: ["эколог", "природ", "эко", "окружающ", "раст", "уборк", "посадк", "лес", "озер", "мусор", "перераб", "климат", "живот", "птиц", "биолог", "зелен", "парк", "дерев"],
  },
  {
    key: "education",
    label: "Образование",
    icon: "school",
    color: "bg-blue-100 text-blue-600",
    keywords: ["образован", "обучен", "школ", "урок", "курс", "ментор", "наставник", "детей", "студент", "учебн", "воркшоп", "семинар", "лекц", "преподав", "тренинг", "кружок"],
  },
  {
    key: "social",
    label: "Социальная помощь",
    icon: "diversity_3",
    color: "bg-orange-100 text-orange-600",
    keywords: ["социальн", "помощ", "пожил", "дет", "сирот", "бездомн", "приют", "больниц", "уязвим", "благотвор", "инвалид", "реабилит", "волонтер", "донор", "кровь", "еда", "питан"],
  },
];

const POINTS_PER_HOUR = 10;
const DEFAULT_TASK_HOURS = 4;

function classifyTask(title: string, description: string, skills: string[]): string {
  const text = [title, description, ...skills].join(" ").toLowerCase();
  const scores = CATEGORIES.map((cat) => ({
    key: cat.key,
    score: cat.keywords.filter((kw) => text.includes(kw)).length,
  }));
  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
  // Default to social if no keywords matched
  return best.score > 0 ? best.key : "social";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // All VERIFIED applications with task data
  const verified = await prisma.application.findMany({
    where: { volunteerId: session.user.id, status: "VERIFIED" },
    include: {
      task: { select: { title: true, description: true, requiredSkills: true, softSkills: true, hours: true } },
    },
  });

  // All active tasks for max calculation
  const allTasks = await prisma.task.findMany({
    where: { status: "ACTIVE" },
    select: { title: true, description: true, requiredSkills: true, softSkills: true, hours: true },
  });

  // Count completed per category
  const counts: Record<string, number> = { ecology: 0, education: 0, social: 0 };
  const hours: Record<string, number> = { ecology: 0, education: 0, social: 0 };
  const points: Record<string, number> = { ecology: 0, education: 0, social: 0 };

  for (const app of verified) {
    const cat = classifyTask(
      app.task.title,
      app.task.description,
      [...app.task.requiredSkills, ...app.task.softSkills]
    );
    counts[cat] = (counts[cat] || 0) + 1;
    const h = app.task.hours ?? DEFAULT_TASK_HOURS;
    hours[cat] = (hours[cat] || 0) + h;
    points[cat] = (points[cat] || 0) + h * POINTS_PER_HOUR;
  }

  // Max per category = total active tasks in that category
  const maxCounts: Record<string, number> = { ecology: 0, education: 0, social: 0 };
  const maxHours: Record<string, number> = { ecology: 0, education: 0, social: 0 };
  for (const task of allTasks) {
    const cat = classifyTask(task.title, task.description, [...task.requiredSkills, ...task.softSkills]);
    maxCounts[cat] = (maxCounts[cat] || 0) + 1;
    maxHours[cat] = (maxHours[cat] || 0) + (task.hours ?? DEFAULT_TASK_HOURS);
  }

  const totalHours = verified.reduce((sum, app) => sum + (app.task.hours ?? DEFAULT_TASK_HOURS), 0);
  const totalPoints = totalHours * POINTS_PER_HOUR;

  return NextResponse.json({
    categories: CATEGORIES.map((cat) => ({
      ...cat,
      count: counts[cat.key] || 0,
      hours: hours[cat.key] || 0,
      max: maxCounts[cat.key] || 0,
      points: points[cat.key] || 0,
      maxPoints: (maxHours[cat.key] || 0) * POINTS_PER_HOUR,
    })),
    totalVerified: verified.length,
    totalHours,
    totalPoints,
  });
}
