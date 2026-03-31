import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  storeTaskEmbedding,
  buildTaskText,
} from "@/lib/embeddings";

const SYSTEM_PROMPT = `Ты — AI-ассистент, который помогает кураторам социальных проектов структурировать задачи.
Твоя задача — вести диалог с куратором, задавая уточняющие вопросы ОДНУ ЗА ОДНОЙ, чтобы собрать всю необходимую информацию для создания задачи.

Ты должен собрать следующую информацию:
1. Название задачи (предложи на основе описания)
2. Подробное описание задачи
3. Дата и время проведения
4. Место проведения (адрес или область)
5. Город
6. Формат (онлайн/офлайн/гибрид)
7. Требуемые hard skills (например: фотография, дизайн, SMM)
8. Желаемые soft skills (например: коммуникабельность, командная работа)
9. Количество волонтёров
10. Критерии верификации выполнения (что должно быть видно на фото-отчёте?)

Веди диалог дружелюбно и профессионально. Задавай вопросы по одному.
Когда у тебя достаточно информации для создания задачи, добавь в конец своего сообщения маркер: READY_TO_FINALIZE

Отвечай на русском языке.`;

const TASK_JSON_SCHEMA = {
  name: "task_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" as const, description: "Название задачи" },
      description: {
        type: "string" as const,
        description: "Подробное описание задачи",
      },
      date: {
        type: "string" as const,
        description: "Дата и время в формате ISO 8601",
      },
      location: { type: "string" as const, description: "Место проведения" },
      city: { type: "string" as const, description: "Город" },
      format: {
        type: "string" as const,
        enum: ["ONLINE", "OFFLINE", "HYBRID"],
        description: "Формат проведения",
      },
      requiredSkills: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Список требуемых hard skills",
      },
      softSkills: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Список желаемых soft skills",
      },
      volunteerQuota: {
        type: "number" as const,
        description: "Требуемое количество волонтёров",
      },
      verificationCriteria: {
        type: "string" as const,
        description: "Критерии для проверки выполнения задачи по фото",
      },
    },
    required: [
      "title",
      "description",
      "date",
      "location",
      "city",
      "format",
      "requiredSkills",
      "softSkills",
      "volunteerQuota",
      "verificationCriteria",
    ],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json();
  const { messages, finalize, preview, taskData: submittedData } = body;

  if (preview || finalize) {
    let taskData;

    if (finalize && submittedData) {
      taskData = submittedData;
    } else {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "На основе диалога ниже, извлеки всю информацию о задаче и сформируй структурированный JSON. Если какая-то информация не была явно указана, используй разумные значения по умолчанию. Отвечай строго в JSON формате.",
          },
          ...messages,
        ],
        response_format: {
          type: "json_schema",
          json_schema: TASK_JSON_SCHEMA,
        },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return NextResponse.json(
          { error: "Не удалось сформировать задачу" },
          { status: 500 }
        );
      }

      taskData = JSON.parse(content);
    }

    if (preview) {
      return NextResponse.json({ taskData });
    }

    // Server-side validation
    const errors: string[] = [];
    if (!taskData.title?.trim()) errors.push("Отсутствует название задачи");
    if (!taskData.description?.trim())
      errors.push("Отсутствует описание задачи");
    if (!taskData.date) errors.push("Отсутствует дата проведения");
    if (!taskData.location?.trim())
      errors.push("Отсутствует место проведения");
    if (!taskData.city?.trim()) errors.push("Отсутствует город");
    if (
      !taskData.volunteerQuota ||
      taskData.volunteerQuota < 1
    )
      errors.push("Некорректное количество волонтёров");
    if (!taskData.requiredSkills?.length && !taskData.softSkills?.length)
      errors.push("Укажите хотя бы один навык");
    if (!taskData.verificationCriteria?.trim())
      errors.push("Отсутствуют критерии верификации");

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Валидация не пройдена",
          validationErrors: errors,
          taskData,
        },
        { status: 422 }
      );
    }

    // Save task
    const task = await prisma.task.create({
      data: {
        curatorId: session.user.id,
        title: taskData.title,
        description: taskData.description,
        date: new Date(taskData.date),
        location: taskData.location,
        city: taskData.city,
        format: taskData.format,
        requiredSkills: taskData.requiredSkills,
        softSkills: taskData.softSkills,
        volunteerQuota: taskData.volunteerQuota,
        verificationCriteria: taskData.verificationCriteria,
        interviewHistory: messages,
        rawInput: messages.find((m: { role: string }) => m.role === "user")
          ?.content,
        status: "ACTIVE",
      },
    });

    // Generate and store embedding
    const taskText = buildTaskText(task);
    const embedding = await generateEmbedding(taskText);
    await storeTaskEmbedding(task.id, embedding);

    return NextResponse.json({ task, taskData });
  }

  // Regular conversation turn
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.7,
    max_tokens: 500,
  });

  const assistantMessage = response.choices[0].message;

  return NextResponse.json({
    message: assistantMessage,
    readyToFinalize: assistantMessage.content?.includes("READY_TO_FINALIZE"),
  });
}
