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

  const volunteer = await prisma.user.findUnique({
    where: { id, role: "VOLUNTEER" },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      skills: true,
      interests: true,
      goals: true,
      city: true,
      avatarUrl: true,
      createdAt: true,
      applications: {
        select: {
          id: true,
          status: true,
          matchScore: true,
          matchReasoning: true,
          rerankingFactors: true,
          task: {
            select: {
              id: true,
              title: true,
              location: true,
              date: true,
              hours: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!volunteer) {
    return NextResponse.json({ error: "Волонтёр не найден" }, { status: 404 });
  }

  const verifiedApps = volunteer.applications.filter((a) => a.status === "VERIFIED");
  const impactHours = verifiedApps.reduce((acc, app) => acc + (app.task.hours || 4), 0);

  return NextResponse.json({
    volunteer: {
      ...volunteer,
      completedTasks: verifiedApps.length,
      impactHours,
    },
  });
}
