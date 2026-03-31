"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function Header() {
  const { data: session } = useSession();

  if (!session) return null;

  const role = (session.user as { role: string }).role;
  const isCurator = role === "CURATOR";

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-orange-600">
            Sun Proactive
          </Link>
          <nav className="hidden md:flex gap-6">
            {isCurator ? (
              <>
                <Link
                  href="/curator/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Дашборд
                </Link>
                <Link
                  href="/curator/tasks/new"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Создать задачу
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/volunteer/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Дашборд
                </Link>
                <Link
                  href="/volunteer/tasks"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Задачи
                </Link>
                <Link
                  href="/volunteer/profile"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Профиль
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent focus:bg-accent outline-none">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-gray-500">{session.user.email}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {isCurator ? "Куратор" : "Волонтёр"}
                </p>
              </div>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
