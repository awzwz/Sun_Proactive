"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const curatorNav: NavItem[] = [
  { icon: "dashboard", label: "Дашборд", href: "/curator/dashboard" },
  { icon: "swap_horiz", label: "Мои задачи", href: "/curator/tasks" },
  { icon: "add_circle", label: "Создать задачу", href: "/curator/tasks/new" },
  { icon: "chat", label: "Сообщения", href: "/curator/messages" },
  { icon: "verified_user", label: "Верификация", href: "/curator/verification" },
  { icon: "settings", label: "Настройки", href: "/curator/settings" },
];

const volunteerNav: NavItem[] = [
  { icon: "dashboard", label: "Дашборд", href: "/volunteer/dashboard" },
  { icon: "swap_horiz", label: "Задачи", href: "/volunteer/tasks" },
  { icon: "chat", label: "Сообщения", href: "/volunteer/messages" },
  { icon: "notifications", label: "Уведомления", href: "/volunteer/notifications" },
  { icon: "person", label: "Профиль", href: "/volunteer/profile" },
  { icon: "settings", label: "Настройки", href: "/volunteer/settings" },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const isCurator = role === "CURATOR";
  const navItems = isCurator ? curatorNav : volunteerNav;

  return (
    <aside className="hidden md:flex flex-col p-4 gap-y-2 bg-surface-container-high h-screen w-64 fixed left-0 top-0 overflow-y-auto z-50">
      {/* Logo */}
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            wb_sunny
          </span>
        </div>
        <div>
          <h1 className="text-lg font-black text-primary font-headline tracking-tighter">
            Sun Proactive AI
          </h1>
          <p className="text-[10px] opacity-70 font-medium">Интеллектуальный обмен</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "?");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-transform duration-200 ${
                isActive
                  ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                  : "text-on-surface hover:bg-surface-container-low hover:translate-x-1"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-headline text-[15px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto flex flex-col gap-y-1 pt-4 border-t border-outline-variant/20">
        <Link
          href="/help"
          className="text-on-surface hover:bg-surface-container-low rounded-xl flex items-center gap-3 p-3 hover:translate-x-1 transition-transform duration-200"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="font-headline text-[15px]">Помощь</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-on-surface hover:bg-surface-container-low rounded-xl flex items-center gap-3 p-3 hover:translate-x-1 transition-transform duration-200 w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-headline text-[15px]">Выход</span>
        </button>
      </div>
    </aside>
  );
}
