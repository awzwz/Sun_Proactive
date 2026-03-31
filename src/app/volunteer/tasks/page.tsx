"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  city: string | null;
  format: string;
  requiredSkills: string[];
  softSkills: string[];
  volunteerQuota: number;
  _count: { applications: number };
  curator: { name: string };
}

interface Application {
  id: string;
  status: string;
  task: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    format: string;
    status: string;
  };
}

const appStatusLabels: Record<string, string> = {
  PENDING: "На рассмотрении",
  ACCEPTED: "Принята",
  REJECTED: "Отклонена",
  COMPLETED: "Ожидает куратора",
  VERIFIED: "Завершена",
};

const appStatusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-primary/10 text-primary",
  REJECTED: "bg-error/10 text-error",
  COMPLETED: "bg-orange-100 text-orange-700",
  VERIFIED: "bg-primary-fixed/40 text-on-primary-fixed-variant",
};

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isFull = task._count.applications >= task.volunteerQuota;
  return (
    <div
      className={`bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 group ${isFull ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
          task.format === "ONLINE"
            ? "bg-secondary-fixed text-on-secondary-fixed-variant"
            : "bg-primary-fixed text-on-primary-fixed-variant"
        }`}>
          {task.format === "ONLINE" ? "Удаленно" : "Очно"}
        </span>
        <span className={`text-xs font-medium ${isFull ? "text-error" : "text-on-surface-variant"}`}>
          {task._count.applications}/{task.volunteerQuota} {isFull ? "— мест нет" : ""}
        </span>
      </div>
      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
      <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{task.description}</p>
      <div className="flex flex-wrap gap-1 mb-4">
        {task.requiredSkills.slice(0, 3).map((s) => (
          <span key={s} className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded-full">{s}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          {new Date(task.date).toLocaleDateString("ru-RU")}
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">location_on</span>
          {task.location}
        </div>
      </div>
    </div>
  );
}

export default function VolunteerTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "mine">("available");

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks?status=ACTIVE").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
    ])
      .then(([tasksData, appsData]) => {
        setTasks(tasksData.tasks || []);
        setApplications(appsData.applications || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const appliedTaskIds = new Set(applications.map((a) => a.task.id));

  // Sort available tasks — days matching volunteer availability first
  const availableTasks = (() => {
    const filtered = tasks.filter((t) => !appliedTaskIds.has(t.id));
    try {
      const saved = localStorage.getItem("volunteer_availability");
      if (!saved) return filtered;
      const { days } = JSON.parse(saved) as { days: boolean[] };
      if (!days || days.every((d) => !d)) return filtered;
      const jsToIdx = [6, 0, 1, 2, 3, 4, 5];
      return [...filtered].sort((a, b) => {
        const dayA = jsToIdx[new Date(a.date).getDay()];
        const dayB = jsToIdx[new Date(b.date).getDay()];
        return (days[dayB] ? 1 : 0) - (days[dayA] ? 1 : 0);
      });
    } catch { return filtered; }
  })();
  const myApplications = applications.filter((a) =>
    ["PENDING", "ACCEPTED", "COMPLETED", "VERIFIED"].includes(a.status)
  );

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-12 bg-surface-container rounded-xl w-48" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-container rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface mb-2">Все задачи</h1>
          <p className="text-on-surface-variant">Найдите проект по душе или отслеживайте свои заявки</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("available")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "available"
                ? "bg-surface-container-lowest shadow-sm text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Доступные
            {availableTasks.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "available" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
                {availableTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "mine"
                ? "bg-surface-container-lowest shadow-sm text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Мои заявки
            {myApplications.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "mine" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
                {myApplications.length}
              </span>
            )}
          </button>
        </div>

        {/* Available tasks */}
        {activeTab === "available" && (
          availableTasks.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl p-12 shadow-sm text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">assignment</span>
              <p className="text-on-surface-variant">Нет доступных задач — вы уже откликнулись на все!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => router.push(`/volunteer/tasks/${task.id}`)} />
              ))}
            </div>
          )
        )}

        {/* My applications */}
        {activeTab === "mine" && (
          myApplications.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl p-12 shadow-sm text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">list_alt</span>
              <p className="text-on-surface-variant mb-4">У вас пока нет заявок</p>
              <button
                onClick={() => setActiveTab("available")}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold"
              >
                Найти задачи
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => router.push(`/volunteer/tasks/${app.task.id}`)}
                  className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-transparent hover:border-primary/20 hover:shadow-md transition-all cursor-pointer flex items-center gap-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">volunteer_activism</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-on-surface truncate">{app.task.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {app.task.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {new Date(app.task.date).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${appStatusStyles[app.status]}`}>
                    {appStatusLabels[app.status]}
                  </span>
                  <span className="material-symbols-outlined text-outline flex-shrink-0">arrow_forward_ios</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
