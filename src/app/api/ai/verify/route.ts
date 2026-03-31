import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const VERIFICATION_SCHEMA = {
  name: "verification_result",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      approved: {
        type: "boolean" as const,
        description: "Рекомендация AI: задача выполнена или нет",
      },
      confidence: {
        type: "number" as const,
        description: "Уверенность AI в вердикте от 0 до 1",
      },
      comment: {
        type: "string" as const,
        description: "Подробный комментарий AI о том, что видно на фото",
      },
      detectedElements: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Список обнаруженных элементов на фото",
      },
    },
    required: ["approved", "confidence", "comment", "detectedElements"],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { applicationId, photoUrls } = await req.json();

  if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return NextResponse.json({ error: "Нет фото" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      task: true,
      volunteer: { select: { name: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  // Update photo URLs
  await prisma.application.update({
    where: { id: applicationId },
    data: { completionPhotos: photoUrls },
  });

  const photoMessageContents = photoUrls.map((url: string) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  let response;
  try {
  response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Ты — AI-помощник для верификации выполнения социальных задач.
Проанализируй фотографии отчета и сравни с критериями задачи.

ВАЖНО: Ты выступаешь как ПОМОЩНИК, а не как окончательный судья.
Твоя задача — дать рекомендацию куратору с аргументацией.

Критерии верификации: ${application.task.verificationCriteria || "Не указаны конкретные критерии. Оцени общее соответствие описанию задачи."}
Задача: ${application.task.title}
Описание: ${application.task.description}

Отвечай на русском языке. Будь объективен и детален. Учитывай, что может быть предоставлено несколько фото.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Волонтёр ${application.volunteer.name} загрузил ${photoUrls.length} фото-отчет(ов) о выполнении задачи "${application.task.title}". Проанализируй фото и дай рекомендацию.`,
          },
          ...photoMessageContents,
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: VERIFICATION_SCHEMA,
    },
    max_tokens: 500,
  });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ошибка AI";
    return NextResponse.json(
      { error: `Ошибка анализа фото: ${message}` },
      { status: 500 }
    );
  }

  const content = response.choices[0].message.content;
  if (!content) {
    return NextResponse.json(
      { error: "Не удалось проанализировать фото" },
      { status: 500 }
    );
  }

  const verificationResult = JSON.parse(content);

  // Save result but don't auto-approve — curator decides
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      verificationResult,
      status: "COMPLETED",
    },
  });

  return NextResponse.json({
    result: verificationResult,
    note: "Это AI-рекомендация. Окончательное решение принимает куратор.",
  });
}
