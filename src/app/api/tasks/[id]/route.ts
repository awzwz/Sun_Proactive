import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      curator: { select: { id: true, name: true, email: true } },
      applications: {
        include: {
          volunteer: {
            select: {
              id: true,
              name: true,
              email: true,
              bio: true,
              skills: true,
              interests: true,
              city: true,
            },
          },
        },
        orderBy: { matchScore: "desc" },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const data = await req.json();

  const task = await prisma.task.update({
    where: { id },
    data,
  });

  return NextResponse.json({ task });
}
