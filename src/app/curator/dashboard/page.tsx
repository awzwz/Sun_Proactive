"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  status: string;
  volunteerQuota: number;
  requiredSkills: string[];
  _count: { applications: number };
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-surface-container text-outline",
  ACTIVE: "bg-primary/10 text-primary",
  COMPLETED: "bg-primary-fixed text-on-primary-fixed-variant",
  CANCELLED: "bg-error/10 text-error",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export default function CuratorDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ aiEfficiency: 0, verificationStatus: 0, pendingVerificationsCount: 0, hasData: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      Promise.all([
        fetch(`/api/tasks?curatorId=${session.user.id}`).then((r) => r.json()),
        fetch(`/api/curator/stats`).then((r) => r.json())
      ])
        .then(([tasksData, statsData]) => {
          setTasks(tasksData.tasks || []);
          if (!statsData.error) setStats(statsData);
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  const activeTasks = tasks.filter((t) => t.status === "ACTIVE");
  const pendingCount = tasks.reduce((sum, t) => sum + t._count.applications, 0);
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const urgentCount = tasks.filter((t) => {
    const diff = new Date(t.date).getTime() - Date.now();
    return diff > 0 && diff < 86400000 && t.status === "ACTIVE";
  }).length;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-12 bg-surface-container rounded-xl w-64" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-surface-container rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-surface-container rounded-xl" />
        </div>
      </AppShell>
    );
  }

  // Calculate SVG stroke dashes
  const DASHARRAY = 213.6;
  const aiDashOffset = stats.hasData ? DASHARRAY * (1 - (stats.aiEfficiency / 100)) : DASHARRAY;

  return (
    <AppShell>
      <div className="space-y-10">
        {/* Editorial Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight leading-none mb-2">
              Обзор куратора
            </h2>
            <p className="text-on-surface-variant max-w-md">
              Добро пожаловать обратно. ИИ проанализировал {pendingCount} заявок и выделил приоритетные задачи на сегодня.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/curator/tasks/new"
              className="bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              Создать новую задачу через ИИ
            </Link>
          </div>
        </section>

        {/* Overview Cards: Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div
            onClick={() => router.push("/curator/tasks?filter=ACTIVE")}
            className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-sm flex flex-col justify-between h-40 group hover:bg-surface-container transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-medium text-sm">Активные задачи</span>
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">task_alt</span>
            </div>
            <div className="text-4xl font-extrabold font-headline">{String(activeTasks.length).padStart(2, "0")}</div>
          </div>
          <div
            onClick={() => router.push("/curator/tasks?filter=ACTIVE")}
            className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-sm flex flex-col justify-between h-40 group hover:bg-surface-container transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-medium text-sm">Ожидают ответа</span>
              <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">pending_actions</span>
            </div>
            <div className="text-4xl font-extrabold font-headline text-secondary">{String(pendingCount).padStart(2, "0")}</div>
          </div>
          <div
            onClick={() => router.push("/curator/tasks?filter=ACTIVE")}
            className="bg-error-container p-6 rounded-xl border-none shadow-sm flex flex-col justify-between h-40 group hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-on-error-container font-bold text-sm">Срочно</span>
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
            </div>
            <div className="text-4xl font-extrabold font-headline text-on-error-container">{String(urgentCount).padStart(2, "0")}</div>
          </div>
          <div
            onClick={() => router.push("/curator/tasks?filter=COMPLETED")}
            className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-sm flex flex-col justify-between h-40 group hover:bg-surface-container transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-medium text-sm">Завершенные</span>
              <span className="material-symbols-outlined text-outline group-hover:scale-110 transition-transform">verified</span>
            </div>
            <div className="text-4xl font-extrabold font-headline text-on-surface-variant">{completedCount}</div>
          </div>
        </section>

        {/* AI Alerts & Active Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* AI Alerts */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-headline">Умные уведомления</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">AI Power</span>
            </div>
            <div className="space-y-4">
              {pendingCount > 0 && (
                <div className="glass-panel border-l-4 border-secondary p-5 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="bg-secondary/10 p-2 rounded-lg">
                      <span className="material-symbols-outlined text-secondary">psychology</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1 text-secondary">Новые отклики</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Получено {pendingCount} откликов от волонтёров. ИИ оценил совместимость.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {urgentCount > 0 && (
                <div className="bg-surface-container-low p-5 rounded-xl border-none shadow-sm">
                  <div className="flex gap-4 items-start">
                    <div className="bg-error/10 p-2 rounded-lg">
                      <span className="material-symbols-outlined text-error">warning</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1 text-on-surface">Дедлайн скоро</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {urgentCount} задач с дедлайном менее 24 часов.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {tasks.length === 0 && (
                <div className="bg-surface-container-low p-5 rounded-xl border-none shadow-sm text-center">
                  <p className="text-sm text-on-surface-variant">Нет активных уведомлений</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Task Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-headline">Активные задачи</h3>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm text-center">
                <span className="material-symbols-outlined text-5xl text-outline mb-4 block">assignment</span>
                <p className="text-on-surface-variant mb-4">У вас пока нет задач</p>
                <Link
                  href="/curator/tasks/new"
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold transition-all hover:shadow-lg"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Создать первую задачу
                </Link>
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Задача</th>
                      <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Статус</th>
                      <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Отклики</th>
                      <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => router.push(`/curator/tasks/${task.id}`)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{task.title}</span>
                            <span className="text-xs text-on-surface-variant opacity-70">{task.location}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center justify-center px-3 py-1 text-[11px] font-bold rounded-full whitespace-nowrap leading-normal ${statusStyles[task.status]}`}>
                            {statusLabels[task.status]}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-medium">
                            {task._count.applications}/{task.volunteerQuota}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-on-surface-variant">
                          {new Date(task.date).toLocaleDateString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-outline-variant/30">
          <div className="flex items-center gap-6 bg-surface-container-low/40 p-6 rounded-2xl">
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1 font-headline">Эффективность ИИ</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Система автоматически оценивает совместимость волонтёров, экономя ваше время на подбор.
              </p>
            </div>
            <div className="w-20 h-20 relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-outline-variant/20" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="8" />
                <circle className="text-primary transition-all duration-1000" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeDasharray={DASHARRAY} strokeDashoffset={aiDashOffset} strokeWidth="8" strokeLinecap="round" />
              </svg>
              <span className="absolute text-sm font-black text-primary">
                {stats.hasData ? `${stats.aiEfficiency}%` : "—%"}
              </span>
            </div>
          </div>
          <Link
            href="/curator/verification"
            className="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-secondary/5 relative overflow-hidden group hover:bg-surface-container-low transition-colors block"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-500">
              <span className="material-symbols-outlined text-8xl">verified_user</span>
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-lg font-headline mb-1">Верификация фото</h4>
                  <p className="text-sm text-on-surface-variant">Проверьте отчеты волонтеров.</p>
                </div>
                <span className="material-symbols-outlined text-primary text-2xl group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
              {stats.pendingVerificationsCount > 0 ? (
                <div className="flex items-center gap-3 bg-secondary-container/40 px-4 py-3 rounded-xl">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                  <span className="text-sm font-bold text-on-secondary-container">
                    {stats.pendingVerificationsCount} {stats.pendingVerificationsCount === 1 ? "отчет ждёт" : stats.pendingVerificationsCount < 5 ? "отчета ждут" : "отчетов ждут"} проверки
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-primary-fixed/30 px-4 py-3 rounded-xl">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-sm font-bold text-on-primary-fixed-variant">Все отчеты проверены</span>
                </div>
              )}
            </div>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
