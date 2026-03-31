"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

interface MatchedTask {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  city: string | null;
  format: string;
  requiredSkills: string[];
  volunteerQuota: number;
  similarity: number;
  reasoning: string | null;
}

interface Application {
  id: string;
  status: string;
  matchScore: number | null;
  task: {
    id: string;
    title: string;
    date: string;
    location: string;
    status: string;
  };
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const appStatusColors: Record<string, string> = {
  PENDING: "border-yellow-400",
  ACCEPTED: "border-primary",
  REJECTED: "border-error",
  COMPLETED: "border-outline",
  VERIFIED: "border-primary-container",
};

const appStatusDots: Record<string, string> = {
  PENDING: "bg-yellow-400",
  ACCEPTED: "bg-primary",
  REJECTED: "bg-error",
  COMPLETED: "bg-outline",
  VERIFIED: "bg-primary-container",
};

const appStatusLabels: Record<string, string> = {
  PENDING: "Рассмотрение",
  ACCEPTED: "Одобрено",
  REJECTED: "Отклонено",
  COMPLETED: "Выполнено",
  VERIFIED: "Верифицировано",
};

export default function VolunteerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchedTask[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [showAllApps, setShowAllApps] = useState(false);
  const [rating, setRating] = useState<{ rating: number | null; count: number } | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/ai/match").then((r) => r.json()).then((d) => setMatches(d.matches || [])).catch(() => {}).finally(() => setLoadingMatches(false));
      fetch("/api/applications").then((r) => r.json()).then((d) => setApplications(d.applications || [])).catch(() => {}).finally(() => setLoadingApps(false));
      fetch("/api/notifications").then((r) => r.json()).then((d) => setNotifications((d.notifications || []).slice(0, 3))).catch(() => {});
      fetch("/api/volunteer/rating").then((r) => r.json()).then((d) => setRating(d)).catch(() => {});
    }
  }, [session]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const appliedTaskIds = new Set(applications.map((a) => a.task.id));

  // Load availability from localStorage and prioritize / filter matches by available days
  const sortedMatches = (() => {
    try {
      const saved = localStorage.getItem("volunteer_availability");
      if (!saved) return matches;
      const { days } = JSON.parse(saved) as { days: boolean[] };
      if (!days || days.every((d) => !d)) return matches;
      // JS getDay(): 0=Sun,1=Mon...6=Sat → map to Mon-Sun index
      const jsToIdx = [6, 0, 1, 2, 3, 4, 5];
      const filtered = matches.filter((m) => {
        const idx = jsToIdx[new Date(m.date).getDay()];
        return !!days[idx];
      });
      const base = filtered.length > 0 ? filtered : matches;
      return [...base].sort((a, b) => {
        const dayA = jsToIdx[new Date(a.date).getDay()];
        const dayB = jsToIdx[new Date(b.date).getDay()];
        const availA = days[dayA] ? 1 : 0;
        const availB = days[dayB] ? 1 : 0;
        return availB - availA;
      });
    } catch { return matches; }
  })();

  const visibleMatches = sortedMatches.filter((m) => !appliedTaskIds.has(m.id));
  const verifiedCount = applications.filter((a) => a.status === "VERIFIED").length;
  const firstName = session?.user?.name?.split(" ")[0] || "";
  const displayedApps = showAllApps ? applications : applications.slice(0, 4);

  return (
    <AppShell>
      <div className="space-y-10">
        <section className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div>
            <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Привет, {firstName}! 👋</h1>
            <p className="text-primary font-medium mt-2">{visibleMatches.length > 0 ? `Сегодня ИИ подобрал для вас ${visibleMatches.length} идеальных проектов.` : "Заполните профиль, чтобы получить персональные рекомендации."}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-l-4 border-primary">
            <div className="p-3 bg-primary/10 rounded-full">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Ваш рейтинг</p>
              {rating?.rating !== null && rating?.rating !== undefined ? (
                <p className="text-xl font-bold">{rating.rating.toFixed(1)} / 5.0
                  <span className="text-xs font-normal text-on-surface-variant ml-1">({rating.count} оц.)</span>
                </p>
              ) : (
                <p className="text-xl font-bold text-on-surface-variant">—</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-headline flex items-center gap-2"><span className="material-symbols-outlined text-primary">auto_awesome</span>Рекомендовано вам</h2>
            <Link href="/volunteer/profile" className="text-primary font-semibold text-sm hover:underline">Настроить ИИ-профиль</Link>
          </div>
          {loadingMatches ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1, 2, 3].map((i) => <div key={i} className="h-64 bg-surface-container rounded-3xl animate-pulse" />)}</div>
          ) : visibleMatches.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">person_search</span>
              <p className="text-on-surface-variant mb-4">Заполните профиль, чтобы получить AI-рекомендации</p>
              <Link href="/volunteer/profile" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold hover:shadow-lg transition-all">Заполнить профиль</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleMatches[0] && (
                <div className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => router.push(`/volunteer/tasks/${visibleMatches[0].id}`)}>
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-white/90 backdrop-blur rounded-full flex items-center gap-1.5"><span className="text-primary font-bold text-sm">Match Score {Math.round(visibleMatches[0].similarity * 100)}%</span></div>
                  <div className="h-64 relative bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-end"><div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent" /><div className="absolute bottom-6 left-6 right-6 text-white z-10"><h3 className="text-2xl font-bold mb-2">{visibleMatches[0].title}</h3><p className="text-white/80 line-clamp-2">{visibleMatches[0].description}</p></div></div>
                  {visibleMatches[0].reasoning && <div className="p-6 bg-primary-fixed/20"><p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">psychology</span>Почему это для вас:</p><p className="text-on-surface/80 text-sm italic">&quot;{visibleMatches[0].reasoning}&quot;</p></div>}
                  <div className="px-6 pb-6">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/volunteer/tasks/${visibleMatches[0].id}`); }} className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>Подробнее
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-6">
                {visibleMatches.slice(1, 3).map((match) => (
                  <div key={match.id} className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border border-transparent hover:border-primary/20 cursor-pointer" onClick={() => router.push(`/volunteer/tasks/${match.id}`)}>
                    <div className="flex justify-between items-start mb-4"><span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold rounded uppercase">{match.format === "ONLINE" ? "Удаленно" : match.city || "Очно"}</span><span className="text-primary font-bold text-xs italic">Match {Math.round(match.similarity * 100)}%</span></div>
                    <h3 className="font-bold text-lg mb-2">{match.title}</h3>
                    {match.reasoning && <p className="text-sm text-on-surface-variant mb-4 italic">&quot;{match.reasoning}&quot;</p>}
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/volunteer/tasks/${match.id}`); }} className="w-full py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                      Подробнее
                    </button>
                  </div>
                ))}
                <div className="bg-primary p-6 rounded-3xl shadow-sm text-white relative overflow-hidden">
                  <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/10 text-9xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <h3 className="font-bold text-lg mb-2 font-headline">Статус &quot;Мастер&quot;</h3>
                  <p className="text-sm text-white/80 mb-4 leading-relaxed">Вам осталось выполнить {Math.max(0, 5 - verifiedCount)} задания до нового уровня привилегий.</p>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden"><div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, verifiedCount * 20)}%` }} /></div>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {visibleMatches.length > 3 && (
              <>
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2"><span className="material-symbols-outlined text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>Срочно</h2>
                <div className="space-y-4">
                  {visibleMatches.slice(3, 5).map((match) => (
                    <div key={match.id} className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-2xl border-l-4 border-red-500 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => router.push(`/volunteer/tasks/${match.id}`)}>
                      <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1"><h4 className="font-bold truncate">{match.title}</h4><span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Срочно</span></div>
                        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{match.location}</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span>{new Date(match.date).toLocaleDateString("ru-RU")}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant">arrow_forward_ios</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="pt-2">
              <h2 className="text-2xl font-bold font-headline mb-6">Все задачи</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleMatches.slice(5, 9).map((match, idx) => {
                  const icons = ["eco", "pets", "volunteer_activism", "school"];
                  const colors = ["text-primary bg-primary/10", "text-orange-500 bg-orange-100", "text-primary bg-primary/10", "text-secondary bg-secondary/10"];
                  return (
                    <div key={match.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/volunteer/tasks/${match.id}`)}>
                      <div className="flex justify-between mb-4"><span className={`material-symbols-outlined p-2 rounded-lg ${colors[idx % colors.length]}`}>{icons[idx % icons.length]}</span><span className="text-xs font-bold text-on-surface-variant">Match {Math.round(match.similarity * 100)}%</span></div>
                      <h4 className="font-bold mb-2">{match.title}</h4><p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{match.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">Квота: {match.volunteerQuota}</span>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/volunteer/tasks/${match.id}`); }} className="text-primary text-sm font-bold hover:underline">Подробнее</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/volunteer/tasks" className="mt-4 flex items-center justify-center gap-2 bg-surface-container-lowest p-4 rounded-2xl hover:shadow-md transition-all"><span className="material-symbols-outlined text-primary">explore</span><span className="font-bold text-primary">Посмотреть все задачи</span></Link>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container">
              <h2 className="text-xl font-bold font-headline mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>list_alt</span>Мои заявки</h2>
              {loadingApps ? (
                <div className="space-y-4 animate-pulse">{[1, 2].map((i) => <div key={i} className="h-16 bg-surface-container rounded-xl" />)}</div>
              ) : applications.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">Нет активных заявок</p>
              ) : (
                <div className="space-y-6">
                  {displayedApps.map((app) => (
                    <div key={app.id} className={`relative pl-6 border-l-2 ${appStatusColors[app.status]} cursor-pointer`} onClick={() => router.push(`/volunteer/tasks/${app.task.id}`)}>
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-surface-container-lowest ${appStatusDots[app.status]}`} />
                      <h4 className="text-sm font-bold leading-none mb-1">{app.task.title}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-2 uppercase tracking-wide">Статус: {appStatusLabels[app.status]}</p>
                      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden"><div className={`h-full rounded-full ${appStatusDots[app.status]}`} style={{ width: app.status === "PENDING" ? "40%" : app.status === "ACCEPTED" ? "70%" : app.status === "COMPLETED" ? "90%" : app.status === "VERIFIED" ? "100%" : "10%" }} /></div>
                      {app.status === "ACCEPTED" && <button className="mt-2 px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg uppercase" onClick={(e) => { e.stopPropagation(); router.push(`/volunteer/tasks/${app.task.id}`); }}>Начать</button>}
                    </div>
                  ))}
                </div>
              )}
              {applications.length > 4 && (
                <button onClick={() => setShowAllApps(!showAllApps)} className="w-full mt-8 py-2 text-on-surface-variant text-xs font-bold uppercase hover:text-on-surface transition-colors">
                  {showAllApps ? "Свернуть" : `Посмотреть все (${applications.length})`}
                </button>
              )}
            </div>

            <div className="bg-surface-container-high/30 rounded-3xl p-6 border border-surface-container-high">
              <h2 className="text-xl font-bold font-headline mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-primary">smart_toy</span>AI-Напоминания</h2>
              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-transparent hover:border-primary/10">
                      <p className="text-xs text-primary font-bold mb-1 uppercase">{n.type === "match_found" ? "Рекомендация" : n.type === "deadline_alert" ? "Дедлайн" : "Уведомление"}</p>
                      <p className="text-sm leading-relaxed">{n.body}</p>
                      <div className="mt-3 flex gap-2">
                        {n.type === "match_found" && <Link href="/volunteer/tasks" className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">ПоСмотреть</Link>}
                        <button onClick={() => handleDismissNotification(n.id)} className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container-high">Скрыть</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-transparent hover:border-primary/10">
                      <p className="text-xs text-primary font-bold mb-1 uppercase">Рекомендация</p>
                      <p className="text-sm leading-relaxed">Система проанализировала ваш профиль и может посоветовать подходящие задачи.</p>
                      <div className="mt-3 flex gap-2">
                        <Link href="/volunteer/tasks" className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">Перейти к задачам</Link>
                      </div>
                    </div>
                  </>
                )}
                {notifications.length > 0 && <Link href="/volunteer/notifications" className="block text-center text-xs font-bold text-primary hover:underline pt-2">Все уведомления →</Link>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
