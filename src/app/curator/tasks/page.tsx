"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  city: string | null;
  status: string;
  volunteerQuota: number;
  hours: number;
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

type FilterStatus = "ALL" | "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";

function CuratorTasksPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const initialFilter = (searchParams.get("filter") as FilterStatus) || "ALL";
  const [filter, setFilter] = useState<FilterStatus>(initialFilter);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/tasks?curatorId=${session.user.id}`)
        .then((r) => r.json())
        .then((data) => setTasks(data.tasks || []))
        .finally(() => setLoading(false));
    }
  }, [session]);

  const filtered = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

  const counts: Record<string, number> = {
    ALL: tasks.length,
    ACTIVE: tasks.filter((t) => t.status === "ACTIVE").length,
    DRAFT: tasks.filter((t) => t.status === "DRAFT").length,
    COMPLETED: tasks.filter((t) => t.status === "COMPLETED").length,
    CANCELLED: tasks.filter((t) => t.status === "CANCELLED").length,
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-12 bg-surface-container rounded-xl w-64" />
          <div className="h-10 bg-surface-container rounded-xl w-96" />
          <div className="h-64 bg-surface-container rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight leading-none mb-2">
            Мои задачи
          </h2>
          <p className="text-on-surface-variant">
            Все ваши задачи — активные, черновики и завершённые.
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          {(["ALL", "ACTIVE", "DRAFT", "COMPLETED", "CANCELLED"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filter === s
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {s === "ALL" ? "Все" : statusLabels[s]} ({counts[s]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">assignment</span>
            <p className="text-on-surface-variant">
              {filter === "ALL" ? "У вас пока нет задач" : `Нет задач со статусом «${statusLabels[filter as string] || filter}»`}
            </p>
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
                {filtered.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => router.push(`/curator/tasks/${task.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{task.title}</span>
                        <span className="text-xs text-on-surface-variant opacity-70">
                          {task.location}{task.city ? `, ${task.city}` : ""}
                        </span>
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
    </AppShell>
  );
}

function CuratorTasksPageFallback() {
  return (
    <AppShell>
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-surface-container rounded-xl w-64" />
        <div className="h-10 bg-surface-container rounded-xl w-96" />
        <div className="h-64 bg-surface-container rounded-xl" />
      </div>
    </AppShell>
  );
}

export default function CuratorTasksPage() {
  return (
    <Suspense fallback={<CuratorTasksPageFallback />}>
      <CuratorTasksPageContent />
    </Suspense>
  );
}
