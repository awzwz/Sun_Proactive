import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, password, name, role } = await req.json();

  if (!email || !password || !name || !role) {
    return NextResponse.json(
      { error: "Все поля обязательны" },
      { status: 400 }
    );
  }

  if (!["CURATOR", "VOLUNTEER"].includes(role)) {
    return NextResponse.json(
      { error: "Неверная роль" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с таким email уже существует" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
