import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const rated = await (prisma.application.findMany as any)({
    where: {
      volunteerId: session.user.id,
      status: "VERIFIED",
      volunteerRating: { not: null },
    },
    select: { volunteerRating: true },
  });

  if (rated.length === 0) {
    return NextResponse.json({ rating: null, count: 0 });
  }

  const avg = rated.reduce((sum: number, a: { volunteerRating: number }) => sum + a.volunteerRating, 0) / rated.length;
  return NextResponse.json({ rating: Math.round(avg * 10) / 10, count: rated.length });
}
