import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Новый пароль должен быть не менее 8 символов" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });
  }

  const newHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ ok: true });
}
