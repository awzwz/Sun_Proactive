import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { taskId, question, chatHistory } = await req.json();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { curator: { select: { name: true } } },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  const context = [
    `Название задачи: ${task.title}`,
    `Описание: ${task.description}`,
    `Дата: ${task.date.toLocaleDateString("ru-RU")}`,
    `Место: ${task.location}`,
    task.city ? `Город: ${task.city}` : "",
    `Формат: ${task.format === "ONLINE" ? "Онлайн (удалённо)" : task.format === "OFFLINE" ? "Очно" : task.format}`,
    task.hours ? `Продолжительность: ${task.hours} ч.` : "",
    `Требуемые навыки: ${task.requiredSkills.join(", ") || "не указаны"}`,
    `Soft skills: ${task.softSkills.join(", ") || "не указаны"}`,
    `Количество волонтёров: ${task.volunteerQuota}`,
    task.verificationCriteria
      ? `Критерии верификации: ${task.verificationCriteria}`
      : "",
    `Куратор: ${task.curator.name}`,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Ты — дружелюбный и полезный AI-помощник, который помогает волонтёрам разобраться в задаче.

КОНТЕКСТ ЗАДАЧИ (вся известная информация):
${context}

ПРАВИЛА ПОВЕДЕНИЯ:
1. Отвечай на русском языке, дружелюбно и по существу.
2. Ты МОЖЕШЬ рассуждать, делать логические выводы и давать советы на основе контекста задачи. Например, если задача — посадка деревьев, логично предположить, что понадобится удобная одежда и перчатки, даже если это не написано явно.
3. Если волонтёр спрашивает «подходит ли мне задача» — проанализируй требования задачи (навыки, формат, локацию) и дай развёрнутый ответ, помогая человеку принять решение.
4. Когда ответ ПРЯМО следует из контекста — ссылайся на конкретные детали (например: «Судя по описанию задачи, …»).
5. Когда ты делаешь ПРЕДПОЛОЖЕНИЕ или вывод — явно скажи это: «Скорее всего…», «Обычно в таких задачах…», «Рекомендую уточнить у куратора, но…».
6. НИКОГДА не выдумывай конкретные факты, которых нет в контексте: точные адреса, номера телефонов, имена людей кроме куратора, точное время начала (если не указано), зарплату/оплату.
7. Если вопрос совершенно не связан с задачей — вежливо верни к теме: «Я помогаю именно по этой задаче. Могу ответить на вопросы о ней!»
8. Будь кратким, но информативным. Длинные простыни текста не нужны.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(chatHistory || []),
    { role: "user" as const, content: question },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.5,
    max_tokens: 600,
  });

  const answer = response.choices[0].message.content || "";

  const sessionId =
    chatHistory?.[0]?.sessionId || `consultant-${taskId}-${session.user.id}-${Date.now()}`;

  await prisma.chatMessage.createMany({
    data: [
      {
        taskId,
        userId: session.user.id,
        role: "user",
        content: question,
        chatType: "consultant",
        sessionId,
      },
      {
        taskId,
        userId: session.user.id,
        role: "assistant",
        content: answer,
        chatType: "consultant",
        sessionId,
      },
    ],
  });

  return NextResponse.json({
    answer,
    sessionId,
  });
}
