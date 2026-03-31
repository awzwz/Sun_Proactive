import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ tasks: [], volunteers: [] });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isCurator = user?.role === "CURATOR";

  const tasks = await prisma.task.findMany({
    where: {
      ...(isCurator ? { curatorId: session.user.id } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      location: true,
      city: true,
      status: true,
      date: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  let volunteers: {
    id: string;
    name: string;
    email: string;
    city: string | null;
    skills: string[];
  }[] = [];

  if (isCurator) {
    volunteers = await prisma.user.findMany({
      where: {
        role: "VOLUNTEER",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { skills: { hasSome: [q] } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        skills: true,
      },
      take: 5,
    });
  }

  return NextResponse.json({ tasks, volunteers });
}
