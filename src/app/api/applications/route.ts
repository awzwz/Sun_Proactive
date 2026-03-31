import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { volunteerId: session.user.id },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}
