import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  storeProfileEmbedding,
  buildProfileText,
} from "@/lib/embeddings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      skills: true,
      interests: true,
      goals: true,
      city: true,
      role: true,
      avatarUrl: true,
      applications: {
        where: { status: "VERIFIED" },
        select: {
          task: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  // Bypass TS error temporarily pending Prisma type sync
  const userApps = (user as any).applications || [];
  const impactHours = userApps.reduce((acc: number, app: any) => acc + (app.task?.hours || 4), 0);
  const completedTasks = userApps.length;

  return NextResponse.json({ 
    user: {
      ...user,
      impactHours,
      completedTasks
    } 
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const data = await req.json();
  const { bio, skills, interests, goals, city, name } = data;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(bio !== undefined && { bio }),
      ...(skills !== undefined && { skills }),
      ...(interests !== undefined && { interests }),
      ...(goals !== undefined && { goals }),
      ...(city !== undefined && { city }),
      ...(name !== undefined && { name }),
    },
  });

  // Regenerate embedding
  const profileText = buildProfileText(user);
  const embedding = await generateEmbedding(profileText);
  await storeProfileEmbedding(user.id, embedding);

  return NextResponse.json({ user });
}
