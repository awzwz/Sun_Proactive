import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const curatorId = searchParams.get("curatorId");
  const query = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (curatorId) where.curatorId = curatorId;
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
      { city: { contains: query, mode: "insensitive" } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      curator: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          applications: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}
