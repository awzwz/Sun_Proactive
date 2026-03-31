"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  taskId: string;
  completionPhotos: string[];
  verificationResult: {
    approved: boolean;
    confidence: number;
    comment: string;
    detectedElements: string[];
  } | null;
  task: { title: string; location: string; verificationCriteria: string | null };
  volunteer: { name: string; avatarUrl: string | null };
  createdAt: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <span
            className={`material-symbols-outlined text-2xl ${(hover || value) >= star ? "text-yellow-400" : "text-outline-variant"}`}
            style={{ fontVariationSettings: `'FILL' ${(hover || value) >= star ? 1 : 0}` }}
          >
            star
          </span>
        </button>
      ))}
      {value > 0 && <span className="text-sm font-bold text-on-surface-variant ml-1">{value}/5</span>}
    </div>
  );
}

export default function VerificationPage() {
  const router = useRouter();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const fetchVerifications = () => {
    fetch("/api/curator/verifications")
      .then((res) => res.json())
      .then((data) => {
        setVerifications(data.verifications || []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchVerifications(); }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/curator/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: id, action, ...(ratings[id] ? { rating: ratings[id] } : {}) }),
      });
      if (res.ok) {
        toast.success(action === "APPROVE" ? "Работа подтверждена!" : "Отчёт возвращён волонтёру.");
        fetchVerifications();
      } else {
        toast.error("Ошибка при обновлении статуса");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-12 bg-surface-container rounded-xl w-64" />
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="h-96 bg-surface-container-low rounded-2xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // Split into photo verifications and simple completions
  const photoVerifications = verifications.filter((v) => v.task.verificationCriteria);
  const simpleCompletions = verifications.filter((v) => !v.task.verificationCriteria);

  return (
    <AppShell>
      <div className="space-y-10">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight leading-none mb-2">
              Верификация
            </h2>
            <p className="text-on-surface-variant max-w-md">
              Подтвердите завершение работы волонтёров и поставьте оценку.
            </p>
          </div>
        </section>

        {verifications.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-16 shadow-sm border border-surface-container-low text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-6xl text-outline opacity-50 mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <h3 className="text-xl font-bold font-headline mb-2">Все отчёты проверены</h3>
            <p className="text-on-surface-variant max-w-sm mx-auto">
              Новых отчётов на проверку пока нет.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Simple completions (no photo) */}
            {simpleCompletions.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">task_alt</span>
                  Запросы на подтверждение завершения
                  <span className="ml-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">{simpleCompletions.length}</span>
                </h3>
                <div className="space-y-4">
                  {simpleCompletions.map((req) => (
                    <div key={req.id} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-3">
                        <div>
                          <span
                            className="font-black text-lg font-headline hover:text-primary cursor-pointer transition-colors"
                            onClick={() => router.push(`/curator/tasks/${req.taskId}`)}
                          >
                            {req.task.title}
                          </span>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="h-7 w-7 bg-surface-container-highest rounded-full flex items-center justify-center text-xs font-bold">
                              {req.volunteer.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{req.volunteer.name}</span>
                            <span className="text-xs text-on-surface-variant">{req.task.location}</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-container-low text-sm text-on-surface-variant">
                          Волонтёр отметил завершение работы и ожидает вашего подтверждения.
                        </div>
                        {/* Rating */}
                        <div>
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">Оценка волонтёра (необязательно)</p>
                          <StarRating
                            value={ratings[req.id] || 0}
                            onChange={(v) => setRatings((prev) => ({ ...prev, [req.id]: v }))}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 md:w-48 justify-center">
                        <button
                          onClick={() => handleAction(req.id, "APPROVE")}
                          disabled={actionLoading !== null}
                          className="w-full bg-primary text-white py-3 px-4 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                        >
                          {actionLoading === req.id
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <><span className="material-symbols-outlined text-[18px]">check_circle</span>Подтвердить</>
                          }
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "REJECT")}
                          disabled={actionLoading !== null}
                          className="w-full bg-surface-container-high text-on-surface py-3 px-4 rounded-xl font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo verifications */}
            {photoVerifications.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">photo_library</span>
                  ИИ-верификация фотоотчётов
                  <span className="ml-1 px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-bold rounded-full">{photoVerifications.length}</span>
                </h3>
                <div className="space-y-8">
                  {photoVerifications.map((req) => (
                    <div key={req.id} className="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container overflow-hidden">
                      <div className="p-6 md:p-8 flex flex-col xl:flex-row gap-8">
                        {/* Photo Gallery */}
                        <div className="xl:w-1/3 space-y-4">
                          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-on-surface-variant">photo_library</span>
                            Фотоотчёт ({req.completionPhotos?.length || 0})
                          </h4>
                          {req.completionPhotos && req.completionPhotos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {req.completionPhotos.map((url, idx) => (
                                <div key={idx} className={`relative rounded-xl overflow-hidden bg-surface-container-low border border-surface-container flex items-center justify-center ${idx === 0 ? "col-span-2 aspect-video" : "aspect-square"}`}>
                                  {url.startsWith("data:image") ? (
                                    <img src={url} alt="Photo" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                  ) : (
                                    <span className="material-symbols-outlined text-4xl opacity-20">visibility</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="aspect-video bg-surface-container rounded-xl flex items-center justify-center border border-dashed border-outline-variant">
                              <span className="text-sm opacity-50">Фото отсутствуют</span>
                            </div>
                          )}
                        </div>

                        {/* Info and AI Report */}
                        <div className="xl:flex-1 space-y-6 flex flex-col">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-xs font-bold text-primary uppercase tracking-widest">{req.task.location}</span>
                              <h3
                                className="text-2xl font-black font-headline text-on-surface mt-1 hover:text-primary cursor-pointer transition-colors"
                                onClick={() => router.push(`/curator/tasks/${req.taskId}`)}
                              >
                                {req.task.title}
                                <span className="material-symbols-outlined text-base align-middle ml-1 opacity-40">arrow_forward</span>
                              </h3>
                              <div className="flex items-center gap-3 mt-3">
                                <div className="h-8 w-8 bg-surface-container-highest rounded-full flex items-center justify-center text-xs font-bold">
                                  {req.volunteer.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{req.volunteer.name}</p>
                                  <p className="text-xs text-on-surface-variant">Волонтёр</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {req.verificationResult ? (
                            <div className={`p-6 rounded-2xl flex-1 border ${req.verificationResult.approved ? 'bg-primary-fixed/20 border-primary/20' : 'bg-error-container/20 border-error/20'}`}>
                              <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  {req.verificationResult.approved ? "verified" : "error"}
                                </span>
                                <h4 className="font-bold text-sm uppercase tracking-wider">AI Рекомендация</h4>
                              </div>
                              <div className="flex items-end gap-3 mb-4">
                                <span className="text-4xl font-black font-headline">
                                  {Math.round(req.verificationResult.confidence * 100)}%
                                </span>
                                <span className="text-sm pb-1 font-medium opacity-80">Уверенность ИИ</span>
                              </div>
                              <p className="text-sm leading-relaxed mb-4">{req.verificationResult.comment}</p>
                              {req.verificationResult.detectedElements?.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                                  <span className="text-xs font-bold mt-1 opacity-60">Распознано:</span>
                                  {req.verificationResult.detectedElements.map((el) => (
                                    <span key={el} className="px-2 py-1 bg-white/40 rounded-md text-xs font-medium">{el}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-6 rounded-2xl bg-surface-container-low flex-1 border border-surface-container flex items-center justify-center text-on-surface-variant flex-col text-center">
                              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">robot_2</span>
                              <p className="text-sm">ИИ ещё не проанализировал этот отчёт.<br />Вы можете принять решение самостоятельно.</p>
                            </div>
                          )}

                          {/* Rating */}
                          <div>
                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">Оценка волонтёра (необязательно)</p>
                            <StarRating
                              value={ratings[req.id] || 0}
                              onChange={(v) => setRatings((prev) => ({ ...prev, [req.id]: v }))}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-4 pt-4 border-t border-surface-container-low">
                            <button
                              onClick={() => handleAction(req.id, "APPROVE")}
                              disabled={actionLoading !== null}
                              className="flex-1 bg-primary text-white py-3 px-6 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                            >
                              {actionLoading === req.id
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : "Утвердить (начислить часы)"}
                            </button>
                            <button
                              onClick={() => handleAction(req.id, "REJECT")}
                              disabled={actionLoading !== null}
                              className="flex-1 bg-surface-container-high text-on-surface py-3 px-6 rounded-xl font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                            >
                              {actionLoading === req.id ? "Подождите..." : "Отклонить (вернуть волонтёру)"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
