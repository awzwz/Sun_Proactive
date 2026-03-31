"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

const typeConfig: Record<string, { icon: string; bgColor: string; textColor: string }> = {
  match_found: { icon: "psychology", bgColor: "bg-secondary-fixed", textColor: "text-secondary" },
  quota_warning: { icon: "warning", bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
  verification_result: { icon: "verified_user", bgColor: "bg-secondary-fixed", textColor: "text-secondary" },
  deadline_alert: { icon: "schedule", bgColor: "bg-primary-fixed", textColor: "text-primary" },
};
const defaultType = { icon: "notifications", bgColor: "bg-surface-container", textColor: "text-on-surface-variant" };

export default function NotificationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [impactHours, setImpactHours] = useState(0);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setNotifications(d.notifications || []))
        .finally(() => setLoading(false));

      fetch("/api/volunteers/profile")
        .then((r) => r.json())
        .then((d) => setImpactHours(d.user?.impactHours || 0))
        .catch(() => {});
    }
  }, [session]);

  const markAsRead = async (id: string, redirectUrl?: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      if (redirectUrl) router.push(redirectUrl);
    } catch { /* silently fail */ }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} часа назад`;
    return `${Math.floor(hours / 24)} д назад`;
  };

  const unreadNotifs = notifications.filter((n) => !n.read);
  const primaryNotif = notifications[0] || null;
  const secondaryNotifs = notifications.slice(1);

  if (loading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6 max-w-5xl">
          <div className="h-10 bg-surface-container rounded-xl w-64" />
          <div className="h-64 bg-surface-container rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-surface-container rounded-2xl" />
            <div className="h-32 bg-surface-container rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl space-y-8">

        {/* ─── Page Header ─── */}
        <div>
          <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">
            Центр уведомлений
          </h1>
          <p className="text-on-surface-variant text-lg mt-2">
            Управляйте вашим вкладом в развитие сообщества
          </p>
        </div>

        {/* ─── Main Notification Section ─── */}
        <section className="space-y-6">

          {/* Hero / Priority Notification — exact Stitch layout */}
          {primaryNotif ? (
            <div className="relative p-8 rounded-3xl bg-surface-container-lowest shadow-sm overflow-hidden">
              {/* Urgency blur in corner */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

              <div className="relative z-10 space-y-4">
                {/* Type badge + time */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
                  <span className="text-on-surface-variant text-sm flex items-center gap-1 ml-auto">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {getTimeAgo(primaryNotif.createdAt)}
                  </span>
                </div>

                {/* Title + Body */}
                <div className="space-y-3">
                  <h2 className="font-headline text-2xl font-bold text-on-surface leading-tight">
                    {primaryNotif.title}
                  </h2>
                  <p className="text-on-surface-variant text-lg leading-relaxed">
                    {primaryNotif.body}
                  </p>
                </div>

                {/* CTA Buttons + Avatars — exact Stitch */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:scale-105 transition-transform shadow-sm"
                    onClick={() => {
                      const taskId = (primaryNotif.metadata as any)?.taskId;
                      markAsRead(primaryNotif.id, taskId ? `/volunteer/tasks/${taskId}` : "/volunteer/tasks");
                    }}
                  >
                    Посмотреть задачу
                  </button>
                  {/* Stacked volunteer avatars */}
                  <div className="flex -space-x-3 ml-auto">
                    {["bg-primary/20", "bg-secondary/20", "bg-tertiary/20"].map((bg, i) => (
                      <div key={i} className={`w-10 h-10 rounded-full ${bg} border-2 border-surface-container-lowest flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-sm text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface-container-lowest flex items-center justify-center text-xs font-bold text-on-surface-variant">
                      +5
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-surface-container-lowest text-center">
              <span className="material-symbols-outlined text-6xl text-outline mb-4 block">notifications_off</span>
              <p className="text-on-surface-variant text-lg">Нет новых уведомлений</p>
            </div>
          )}

          {/* Secondary Notifications Grid — 2-col, no border, shadow-sm */}
          {secondaryNotifs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {secondaryNotifs.map((n) => {
                const config = typeConfig[n.type] || defaultType;
                return (
                  <div
                    key={n.id}
                    className={`p-6 rounded-xl bg-surface-container-lowest shadow-sm flex gap-4 hover:shadow-md transition-shadow cursor-pointer ${!n.read ? 'ring-1 ring-primary/10' : ''}`}
                    onClick={() => {
                        const taskId = (n.metadata as any)?.taskId;
                        markAsRead(n.id, taskId ? `/volunteer/tasks/${taskId}` : undefined);
                    }}
                  >
                    <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined ${config.textColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {config.icon}
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-on-surface">{n.title}</h4>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-sm text-on-surface-variant leading-snug">{n.body}</p>
                      <span className="text-[11px] text-outline pt-2 block">{getTimeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Bento: Social Impact + Rating ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Social Impact — dark green, 2-col */}
          <div className="md:col-span-2 p-8 rounded-2xl bg-primary text-white flex flex-col justify-between min-h-[200px] relative overflow-hidden">
            <div className="z-10 relative">
              <h3 className="font-headline text-xl font-bold mb-2">Ваш социальный импакт</h3>
              <p className="opacity-80 max-w-sm">
                Благодаря вашим усилиям в прошлом месяце было восстановлено 1.2 га городской флоры.
              </p>
            </div>
            <div className="z-10 relative mt-6 flex gap-4 items-end">
              <span className="text-5xl font-extrabold tracking-tighter">{impactHours}</span>
              <span className="text-sm font-medium pb-2 opacity-90">часа помощи сообществу</span>
            </div>
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary-container rounded-full opacity-50 blur-3xl" />
          </div>

          {/* Rating — secondary bg */}
          <div className="p-8 rounded-2xl bg-secondary text-white flex flex-col justify-between">
            <span className="material-symbols-outlined text-4xl">star_rate</span>
            <div className="space-y-1">
              <p className="text-sm opacity-80">Ваш рейтинг эксперта</p>
              <h3 className="font-headline text-3xl font-black tracking-tight">4.9 / 5.0</h3>
            </div>
          </div>
        </div>

        {/* ─── Unread count ─── */}
        {unreadNotifs.length > 0 && (
          <p className="text-sm text-on-surface-variant text-center">
            <span className="font-bold text-primary">{unreadNotifs.length}</span> непрочитанных уведомлений
          </p>
        )}
      </div>

      {/* ─── Floating toast reminder (Stitch: fixed top-20 right-8) ─── */}
      {notifications.some((n) => !n.read && n.type === "deadline_alert") && (
        <div className="fixed top-20 right-8 z-[60] max-w-sm w-full hidden md:block">
          <div className="glass-panel p-4 rounded-xl shadow-2xl border border-white/20 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-xl">priority_high</span>
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-xs font-bold text-error uppercase tracking-wider">Напоминание</p>
              <p className="text-sm font-bold text-on-surface">
                {notifications.find((n) => n.type === "deadline_alert")?.title}
              </p>
              <p className="text-xs text-on-surface-variant">
                {notifications.find((n) => n.type === "deadline_alert")?.body?.slice(0, 60)}...
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
