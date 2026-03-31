"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

interface VolunteerApp {
  id: string;
  status: string;
  matchScore: number | null;
  matchReasoning: string | null;
  rerankingFactors: {
    semanticScore: number;
    cityMatch: boolean;
    formatMatch: boolean;
    experienceBoost: boolean;
    finalScore: number;
  } | null;
  task: {
    id: string;
    title: string;
    location: string;
    date: string;
    hours: number;
  };
}

interface Volunteer {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  goals: string | null;
  city: string | null;
  avatarUrl: string | null;
  createdAt: string;
  completedTasks: number;
  impactHours: number;
  applications: VolunteerApp[];
}

const statusLabels: Record<string, string> = {
  PENDING: "На рассмотрении",
  ACCEPTED: "Одобрено",
  REJECTED: "Отклонён",
  COMPLETED: "Выполнено",
  VERIFIED: "Верифицировано",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-secondary-fixed text-on-secondary-fixed-variant",
  ACCEPTED: "bg-primary/10 text-primary",
  REJECTED: "bg-error/10 text-error",
  COMPLETED: "bg-surface-container text-on-surface-variant",
  VERIFIED: "bg-primary-fixed text-on-primary-fixed-variant",
};

export default function CuratorVolunteerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    fetch(`/api/volunteers/${id}`)
      .then((r) => r.json())
      .then((data) => setVolunteer(data.volunteer))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !volunteer) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-surface-container rounded-xl w-64" />
          <div className="h-64 bg-surface-container rounded-xl" />
        </div>
      </AppShell>
    );
  }

  const startConversation = async () => {
    setStartingChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: volunteer.id }),
      });
      if (res.ok) {
        const { conversationId } = await res.json();
        router.push(`/curator/messages?conv=${conversationId}`);
      }
    } finally {
      setStartingChat(false);
    }
  };

  const appsWithReasoning = volunteer.applications.filter((a) => a.matchReasoning);

  return (
    <AppShell>
      <div className="space-y-10">
        <nav className="flex text-xs font-semibold uppercase tracking-widest text-primary gap-2 items-center">
          <span className="cursor-pointer hover:underline" onClick={() => router.back()}>
            Назад
          </span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="opacity-50">Профиль волонтёра</span>
        </nav>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary text-3xl font-black shrink-0">
            {volunteer.name.charAt(0)}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black font-headline tracking-tight">{volunteer.name}</h1>
              <button
                onClick={startConversation}
                disabled={startingChat}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Написать
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {volunteer.city && (
                <span className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {volunteer.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                <span className="material-symbols-outlined text-sm">mail</span>
                {volunteer.email}
              </span>
              <span className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                На платформе с {new Date(volunteer.createdAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            {volunteer.bio && (
              <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-3 font-headline">О себе</h3>
                <p className="text-on-surface leading-relaxed">{volunteer.bio}</p>
              </section>
            )}

            {/* Skills & Interests */}
            <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 font-headline">Навыки и интересы</h3>
              {volunteer.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant mb-2">Навыки</p>
                  <div className="flex flex-wrap gap-2">
                    {volunteer.skills.map((s) => (
                      <span key={s} className="px-3 py-1.5 bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {volunteer.interests.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant mb-2">Интересы</p>
                  <div className="flex flex-wrap gap-2">
                    {volunteer.interests.map((s) => (
                      <span key={s} className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-xs font-medium rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {volunteer.goals && (
                <div>
                  <p className="text-xs font-bold uppercase text-on-surface-variant mb-2">Цели</p>
                  <p className="text-sm text-on-surface leading-relaxed">{volunteer.goals}</p>
                </div>
              )}
            </section>

            {/* AI Match Analysis */}
            {appsWithReasoning.length > 0 && (
              <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  ИИ-анализ совместимости
                </h3>
                <div className="space-y-4">
                  {appsWithReasoning.map((app) => (
                    <div key={app.id} className="border-l-4 border-l-primary bg-surface-container-low/50 p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span
                            className="font-bold text-on-surface hover:text-primary cursor-pointer transition-colors"
                            onClick={() => router.push(`/curator/tasks/${app.task.id}`)}
                          >
                            {app.task.title}
                          </span>
                          <span className="text-xs text-on-surface-variant block">{app.task.location}</span>
                        </div>
                        {app.matchScore !== null && (
                          <span className="bg-primary text-white px-2 py-1 rounded text-xs font-black">
                            {Math.round((app.rerankingFactors?.finalScore ?? app.matchScore) * 100)}% MATCH
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{app.matchReasoning}</p>
                      {app.rerankingFactors && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {app.rerankingFactors.cityMatch && (
                            <span className="px-2 py-1 bg-primary-fixed/50 text-on-primary-fixed-variant text-[10px] font-bold rounded-full">Город совпадает</span>
                          )}
                          {app.rerankingFactors.experienceBoost && (
                            <span className="px-2 py-1 bg-primary-fixed/50 text-on-primary-fixed-variant text-[10px] font-bold rounded-full">Есть опыт</span>
                          )}
                          {app.rerankingFactors.formatMatch && (
                            <span className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded-full">Формат подходит</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Task History */}
            {volunteer.applications.length > 0 && (
              <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 font-headline">История задач</h3>
                <div className="space-y-3">
                  {volunteer.applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors"
                      onClick={() => router.push(`/curator/tasks/${app.task.id}`)}
                    >
                      <div>
                        <span className="font-bold text-sm">{app.task.title}</span>
                        <span className="text-xs text-on-surface-variant block">
                          {app.task.location} &middot; {new Date(app.task.date).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusStyles[app.status]}`}>
                        {statusLabels[app.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Stats */}
          <div className="space-y-6">
            <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 font-headline">Статистика</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background p-4 rounded-2xl text-center">
                  <div className="text-3xl font-black text-primary">{volunteer.completedTasks}</div>
                  <div className="text-xs opacity-60 font-bold mt-1">Завершено задач</div>
                </div>
                <div className="bg-background p-4 rounded-2xl text-center">
                  <div className="text-3xl font-black text-primary">{volunteer.impactHours}</div>
                  <div className="text-xs opacity-60 font-bold mt-1">Часов помощи</div>
                </div>
                <div className="bg-background p-4 rounded-2xl text-center">
                  <div className="text-3xl font-black">{volunteer.applications.length}</div>
                  <div className="text-xs opacity-60 font-bold mt-1">Всего заявок</div>
                </div>
                <div className="bg-background p-4 rounded-2xl text-center">
                  <div className="text-3xl font-black">{volunteer.skills.length}</div>
                  <div className="text-xs opacity-60 font-bold mt-1">Навыков</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
