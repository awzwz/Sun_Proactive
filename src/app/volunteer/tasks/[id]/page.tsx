"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ConsultantChat } from "@/components/ai/ConsultantChat";
import { toast } from "sonner";

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
  status: string;
  verificationCriteria: string | null;
  curatorId: string;
  curator: { name: string; email: string };
  applications: Array<{
    id: string;
    volunteerId: string;
    status: string;
    matchScore: number | null;
    matchReasoning: string | null;
    completionPhotos: string[];
    verificationResult: {
      approved: boolean;
      confidence: number;
      comment: string;
      detectedElements: string[];
    } | null;
  }>;
}

const statusLabels: Record<string, string> = {
  PENDING: "Заявка на рассмотрении",
  ACCEPTED: "Заявка принята",
  REJECTED: "Заявка отклонена",
  COMPLETED: "Работа выполнена",
  VERIFIED: "Работа верифицирована",
};

export default function VolunteerTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [previewScore, setPreviewScore] = useState<{ score: number; reasoning: string } | null>(null);
  const [calculatingScore, setCalculatingScore] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  const fetchTask = () => {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d) => setTask(d.task))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTask(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const myApplication = task?.applications.find((a) => a.volunteerId === session?.user?.id);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, { method: "POST" });
      if (res.ok) { toast.success("Вы откликнулись на задачу!"); fetchTask(); }
      else { const d = await res.json(); toast.error(d.error || "Ошибка"); }
    } catch { toast.error("Ошибка при отклике"); }
    finally { setApplying(false); }
  };

  const handleConfirmComplete = async () => {
    if (!myApplication) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/volunteer/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: myApplication.id }),
      });
      if (res.ok) {
        toast.success("Завершение отправлено куратору на подтверждение");
        fetchTask();
      } else {
        const d = await res.json();
        toast.error(d.error || "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setCompleting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !myApplication) return;
    if (files.length > 5) {
      toast.error("Лимит файлов — не более 5-ти.");
      return;
    }
    
    setUploading(true);
    
    // Read all files as base64
    const photoUrls: string[] = await Promise.all(
      files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    setVerifying(true);
    try {
      const res = await fetch("/api/ai/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: myApplication.id, photoUrls }),
      });
      if (res.ok) { toast.success("Фото отправлены на AI-верификацию"); fetchTask(); }
      else toast.error("Ошибка при верификации");
    } catch { toast.error("Ошибка"); }
    finally { setUploading(false); setVerifying(false); }
  };

  const handleCalculateScore = async () => {
    setCalculatingScore(true);
    try {
      const res = await fetch("/api/volunteer/fit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
      const data = await res.json();
      if (data.score !== null && data.score !== undefined) {
        setPreviewScore({ score: data.score, reasoning: data.reasoning || "" });
      } else {
        toast.error(data.reasoning || "Не удалось рассчитать");
      }
    } catch {
      toast.error("Ошибка при расчёте");
    } finally {
      setCalculatingScore(false);
    }
  };

  if (loading || !task) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-container rounded-xl w-48" />
          <div className="h-80 bg-surface-container rounded-2xl" />
          <div className="h-48 bg-surface-container rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const matchScore = myApplication?.matchScore ?? previewScore?.score ?? null;
  const matchReasoning = myApplication?.matchReasoning ?? previewScore?.reasoning ?? null;
  const circumference = 251.2;
  const dashOffset = matchScore !== null ? circumference * (1 - matchScore) : circumference * 0.15;

  return (
    <AppShell>
      <div>
        {/* Back button — green text with arrow, as in Stitch */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary font-semibold mb-6 hover:-translate-x-1 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Назад к списку заданий</span>
        </button>

        {/* Asymmetric 12-col Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── Main Info Column (8 cols) ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Task Header Card */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm border border-surface-container">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="space-y-2">
                  <span className="px-3 py-1 bg-primary-fixed/30 text-primary font-bold text-xs rounded-full uppercase tracking-wider">
                    {task.format === "ONLINE" ? "Удаленно" : task.city || "Очно"}
                  </span>
                  <h2 className="text-3xl font-black font-headline text-on-surface">{task.title}</h2>
                  <div className="flex items-center gap-4 text-sm opacity-70">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      <span>{new Date(task.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>{task.location}</span>
                    </div>
                  </div>
                </div>
                {!myApplication && (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {applying ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI рассчитывает...</>
                    ) : "Подать заявку"}
                  </button>
                )}
                {myApplication && (
                  <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm border border-primary/20">
                    {statusLabels[myApplication.status]}
                  </div>
                )}
              </div>

              {/* Task image area — gradient placeholder */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-primary/20 via-primary-container/20 to-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary/30" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold font-headline">Описание задачи</h3>
                <p className="text-on-surface/80 leading-relaxed">{task.description}</p>
              </div>

              {/* Skills + Curator Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-surface-container">
                <div>
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                    Требуемые навыки
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {task.requiredSkills.map((s) => (
                      <span key={s} className="px-3 py-1.5 bg-surface-container-low rounded-lg text-sm border border-surface-container-high">{s}</span>
                    ))}
                    {task.softSkills.map((s) => (
                      <span key={s} className="px-3 py-1.5 bg-tertiary-fixed/20 rounded-lg text-sm border border-surface-container">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Организатор
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-fixed/30 flex items-center justify-center font-bold text-primary text-sm">
                      {task.curator.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{task.curator.name}</p>
                      <p className="text-xs opacity-60">Проверено Sun Proactive</p>
                    </div>
                    <button
                      onClick={async () => {
                        setStartingChat(true);
                        try {
                          const res = await fetch("/api/conversations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ recipientId: task.curatorId }),
                          });
                          if (res.ok) {
                            const { conversationId } = await res.json();
                            router.push(`/volunteer/messages?conv=${conversationId}`);
                          }
                        } finally {
                          setStartingChat(false);
                        }
                      }}
                      disabled={startingChat}
                      className="ml-auto inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      Написать
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Verification / Photo Upload */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm border border-surface-container">
              <h3 className="text-xl font-bold font-headline mb-4">Отчет о выполнении</h3>

              {/* VERIFIED — final state */}
              {myApplication?.status === "VERIFIED" && (
                <div className="p-6 rounded-2xl bg-primary-fixed/20 border border-primary/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <div>
                      <p className="font-bold text-primary">Работа подтверждена куратором!</p>
                      <p className="text-sm text-on-surface-variant">Часы и баллы начислены</p>
                    </div>
                  </div>
                  {myApplication?.verificationResult && (
                    <p className="text-sm leading-relaxed text-on-surface/80">{myApplication.verificationResult.comment}</p>
                  )}
                </div>
              )}

              {/* COMPLETED (waiting for curator) */}
              {myApplication?.status === "COMPLETED" && (
                <div className="space-y-4">
                  {/* AI verification result if exists */}
                  {myApplication.verificationResult && (
                    <div className={`p-6 rounded-2xl border ${myApplication.verificationResult.approved ? 'bg-primary-fixed/20 border-primary/20' : 'bg-error-container/20 border-error/20'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {myApplication.verificationResult.approved ? "verified" : "error"}
                        </span>
                        <div>
                          <p className="font-bold">{myApplication.verificationResult.approved ? "ИИ одобрил отчёт" : "ИИ не подтвердил"}</p>
                          <p className="text-sm text-on-surface-variant">Уверенность: {Math.round(myApplication.verificationResult.confidence * 100)}%</p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">{myApplication.verificationResult.comment}</p>
                    </div>
                  )}
                  {/* Waiting state */}
                  <div className="p-5 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-start gap-4">
                    <span className="material-symbols-outlined text-yellow-500 text-2xl mt-0.5">schedule</span>
                    <div className="flex-1">
                      <p className="font-bold text-yellow-800">Ожидает подтверждения куратора</p>
                      <p className="text-sm text-yellow-700 mt-1 leading-relaxed">Куратор рассматривает вашу работу. Обычно это занимает 1–2 дня.</p>
                    </div>
                  </div>
                  {/* Support link */}
                  <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm">Куратор долго не отвечает?</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Обратитесь в поддержку — мы поможем разрешить ситуацию.</p>
                    </div>
                    <a
                      href="mailto:support@sun-proactive.ru"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">support_agent</span>
                      Поддержка
                    </a>
                  </div>
                </div>
              )}

              {/* ACCEPTED — action zone */}
              {myApplication?.status === "ACCEPTED" && (
                <div className="space-y-4">
                  <p className="text-sm opacity-70">
                    После завершения работы подтвердите выполнение.
                  </p>

                  {/* No verificationCriteria — simple confirm button */}
                  {!task.verificationCriteria && (
                    <button
                      onClick={handleConfirmComplete}
                      disabled={completing}
                      className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                    >
                      {completing ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Отправка...</>
                      ) : (
                        <><span className="material-symbols-outlined">task_alt</span>Подтвердить завершение работы</>
                      )}
                    </button>
                  )}

                  {/* With verificationCriteria — photo upload */}
                  {task.verificationCriteria && (
                    <>
                      <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 text-sm text-on-surface">
                        <p className="font-semibold mb-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[18px]">photo_camera</span>
                          Требуется фотоотчёт
                        </p>
                        <p className="text-on-surface-variant text-xs">{task.verificationCriteria}</p>
                      </div>
                      <label className="border-2 border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-surface-container-low/50 hover:bg-surface-container/50 transition-colors cursor-pointer group">
                        <div className="h-12 w-12 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-primary text-2xl">cloud_upload</span>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">Загрузить фотоотчёт</p>
                          <p className="text-xs opacity-60 mt-1">PNG, JPG или HEIC (макс. 5 файлов)</p>
                        </div>
                        {(uploading || verifying) && (
                          <div className="flex items-center gap-2 text-primary">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">{verifying ? "AI анализирует фото..." : "Загрузка..."}</span>
                          </div>
                        )}
                        <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploading || verifying} className="hidden" />
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* No application yet */}
              {!myApplication && (
                <p className="text-sm text-on-surface-variant">Подайте заявку, чтобы участвовать в задаче.</p>
              )}
            </section>
          </div>

          {/* ─── AI Sidebar Column (4 cols) ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Trust UI — Fit Score — gradient bg + SVG circle */}
            <section className="bg-gradient-to-br from-primary to-[#004d46] rounded-2xl p-6 text-white shadow-xl">
              <h3 className="font-bold text-lg mb-6">Ваш уровень соответствия</h3>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="transparent"
                      stroke="#89f5e7" strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute text-2xl font-black">
                    {matchScore !== null ? `${Math.round(matchScore * 100)}%` : "—"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">
                    {matchScore !== null && matchScore >= 0.7 ? "Высокий шанс" : matchScore !== null && matchScore >= 0.4 ? "Средний шанс" : matchScore !== null ? "Низкий шанс" : "Не рассчитан"}
                  </p>
                  <p className="text-sm leading-snug">
                    {matchScore !== null && matchScore >= 0.7
                      ? "Ваш профиль идеально подходит для этого типа активности."
                      : matchScore !== null
                        ? "AI оценил ваш профиль относительно требований задачи."
                        : "Нажмите «Рассчитать», чтобы узнать, насколько задача вам подходит."}
                  </p>
                </div>
              </div>

              {/* Calculate button — visible when no score yet */}
              {matchScore === null && (
                <button
                  onClick={handleCalculateScore}
                  disabled={calculatingScore}
                  className="w-full mb-4 py-3 rounded-xl bg-white/20 backdrop-blur text-white font-bold text-sm hover:bg-white/30 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {calculatingScore ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      AI анализирует...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">calculate</span>
                      Рассчитать совместимость
                    </>
                  )}
                </button>
              )}

              {matchReasoning && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Почему это подходит именно вам</p>
                  <p className="text-sm italic opacity-90 leading-relaxed">
                    &quot;{matchReasoning}&quot;
                  </p>
                </div>
              )}
              {!matchReasoning && matchScore === null && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Как работает</p>
                  <p className="text-sm italic opacity-90 leading-relaxed">
                    &quot;AI сравнивает ваш профиль с требованиями задачи и рассчитывает персональный Match Score.&quot;
                  </p>
                </div>
              )}
            </section>

            {/* RAG Assistant — exact Stitch layout */}
            <section className="bg-surface-container rounded-2xl shadow-sm border border-surface-container-high flex flex-col overflow-hidden" style={{ height: "600px" }}>
              {/* Chat Header */}
              <div className="p-4 bg-surface-container-lowest border-b border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">ИИ-Помощник по задаче</h4>
                    <p className="text-[10px] text-primary font-bold uppercase">В сети • Анализирует детали</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant opacity-50">more_vert</span>
              </div>
              {/* Chat — ConsultantChat fills remaining space */}
              <div className="flex-1 overflow-hidden">
                <ConsultantChat taskId={task.id} taskTitle={task.title} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
