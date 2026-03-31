"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { toast } from "sonner";

interface Application {
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
  completionPhotos: string[];
  verificationResult: {
    approved: boolean;
    confidence: number;
    comment: string;
    detectedElements: string[];
  } | null;
  volunteer: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    skills: string[];
    interests: string[];
    city: string | null;
  };
}

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
  hours: number;
  status: string;
  verificationCriteria: string | null;
  applications: Application[];
  curator: { id: string; name: string; email: string };
}

interface TaskEditForm {
  title: string;
  description: string;
  date: string;
  location: string;
  city: string;
  format: string;
  requiredSkills: string;
  softSkills: string;
  volunteerQuota: number;
  hours: number;
  verificationCriteria: string;
}

interface MatchResult {
  volunteer: {
    id: string;
    name: string;
    city: string | null;
    skills: string[];
  };
  factors: {
    semanticScore: number;
    cityMatch: boolean;
    formatMatch: boolean;
    experienceBoost: boolean;
    finalScore: number;
  };
  reasoning?: string;
}

const appStatusStyles: Record<string, string> = {
  PENDING: "bg-secondary-fixed text-on-secondary-fixed-variant",
  ACCEPTED: "bg-primary/10 text-primary",
  REJECTED: "bg-error/10 text-error",
  COMPLETED: "bg-surface-container text-on-surface-variant",
  VERIFIED: "bg-primary-fixed text-on-primary-fixed-variant",
};

const appStatusLabels: Record<string, string> = {
  PENDING: "На рассмотрении",
  ACCEPTED: "Одобрено",
  REJECTED: "Отклонён",
  COMPLETED: "Выполнено",
  VERIFIED: "Верифицировано",
};

export default function CuratorTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [findingMatches, setFindingMatches] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<TaskEditForm | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [addingVolunteer, setAddingVolunteer] = useState<string | null>(null);

  const fetchTask = () => {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d) => setTask(d.task))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApplicationAction = async (appId: string, newStatus: string) => {
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(
      newStatus === "ACCEPTED" ? "Заявка принята" : newStatus === "VERIFIED" ? "Работа верифицирована" : "Статус обновлён"
    );
    fetchTask();
  };

  const findMatches = async () => {
    setFindingMatches(true);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
      const data = await res.json();
      const matches: MatchResult[] = data.matches || [];
      if (matches.length > 0) {
        setMatchResults(matches);
        toast.success(`Найдено ${matches.length} подходящих волонтёров`);
      } else {
        toast.warning("Доступных волонтёров нет на данный момент. Попробуйте позже — новые волонтёры регистрируются каждый день.");
      }
    } catch {
      toast.error("Ошибка поиска");
    } finally {
      setFindingMatches(false);
    }
  };

  const addVolunteerFromMatch = async (match: MatchResult) => {
    setAddingVolunteer(match.volunteer.id);
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerId: match.volunteer.id,
          matchScore: match.factors.finalScore,
          matchReasoning: match.reasoning || null,
          rerankingFactors: match.factors,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${match.volunteer.name} добавлен в заявки`);
      setMatchResults((prev) => prev.filter((m) => m.volunteer.id !== match.volunteer.id));
      fetchTask();
    } catch {
      toast.error("Не удалось добавить волонтёра");
    } finally {
      setAddingVolunteer(null);
    }
  };

  const triggerAIManager = async () => {
    const res = await fetch("/api/cron/ai-manager");
    const data = await res.json();
    toast.success(`AI-менеджер: обработано ${data.processed} задач, отправлено ${data.notificationsSent} уведомлений`);
  };

  const startEditing = () => {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description,
      date: new Date(task.date).toISOString().slice(0, 10),
      location: task.location,
      city: task.city || "",
      format: task.format,
      requiredSkills: task.requiredSkills.join(", "),
      softSkills: task.softSkills.join(", "),
      volunteerQuota: task.volunteerQuota,
      hours: task.hours || 4,
      verificationCriteria: task.verificationCriteria || "",
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm(null);
  };

  const saveTask = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        date: new Date(editForm.date).toISOString(),
        location: editForm.location,
        city: editForm.city || null,
        format: editForm.format,
        requiredSkills: editForm.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        softSkills: editForm.softSkills.split(",").map((s) => s.trim()).filter(Boolean),
        volunteerQuota: editForm.volunteerQuota,
        hours: editForm.hours,
        verificationCriteria: editForm.verificationCriteria || null,
      };
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      toast.success("Задача обновлена");
      setEditing(false);
      setEditForm(null);
      fetchTask();
    } catch {
      toast.error("Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !task) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-surface-container rounded-xl w-96" />
          <div className="h-64 bg-surface-container rounded-xl" />
        </div>
      </AppShell>
    );
  }

  const acceptedCount = task.applications.filter((a) => ["ACCEPTED", "COMPLETED", "VERIFIED"].includes(a.status)).length;
  const fillPercent = Math.round((acceptedCount / task.volunteerQuota) * 100);

  return (
    <AppShell>
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <nav className="flex text-xs font-semibold uppercase tracking-widest text-primary gap-2 items-center mb-4">
              <span className="cursor-pointer hover:underline" onClick={() => router.push("/curator/dashboard")}>Задания</span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="opacity-50">Детали</span>
            </nav>
            {editing && editForm ? (
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="text-4xl lg:text-5xl font-black font-headline tracking-tight text-on-surface bg-surface-container-high rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tight text-on-surface">{task.title}</h1>
            )}
            {editing && editForm ? (
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">location_on</span>
                  <input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Локация"
                    className="bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">apartment</span>
                  <input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Город"
                    className="bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">calendar_today</span>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">schedule</span>
                  <input
                    type="number"
                    min={1}
                    value={editForm.hours}
                    onChange={(e) => setEditForm({ ...editForm, hours: parseInt(e.target.value) || 1 })}
                    className="bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium w-20 outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-on-surface-variant">ч.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">group</span>
                  <input
                    type="number"
                    min={1}
                    value={editForm.volunteerQuota}
                    onChange={(e) => setEditForm({ ...editForm, volunteerQuota: parseInt(e.target.value) || 1 })}
                    className="bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium w-20 outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-on-surface-variant">волонтеров</span>
                </div>
                <select
                  value={editForm.format}
                  onChange={(e) => setEditForm({ ...editForm, format: e.target.value })}
                  className="bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="OFFLINE">Оффлайн</option>
                  <option value="ONLINE">Онлайн</option>
                  <option value="HYBRID">Гибрид</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {task.location}
                </div>
                {task.city && (
                  <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                    <span className="material-symbols-outlined text-sm">apartment</span>
                    {task.city}
                  </div>
                )}
                <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {new Date(task.date).toLocaleDateString("ru-RU")}
                </div>
                {task.hours > 0 && (
                  <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full text-sm font-medium">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {task.hours} ч.
                  </div>
                )}
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold">
                  <span className="material-symbols-outlined text-sm">group</span>
                  Квота: {acceptedCount} / {task.volunteerQuota} волонтеров
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={cancelEditing}
                  className="px-6 py-3 border-2 border-outline text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveTask}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="px-6 py-3 border-2 border-outline text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Редактировать
                </button>
                <button
                  onClick={findMatches}
                  disabled={findingMatches}
                  className="px-6 py-3 border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {findingMatches ? "Ищу..." : "ИИ-подбор волонтёров"}
                </button>
                <button
                  onClick={triggerAIManager}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  AI-Менеджер
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Task Description & Applications */}
          <div className="lg:col-span-8 space-y-8">
            {/* Description */}
            {editing && editForm ? (
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Описание</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={5}
                    className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-on-surface leading-relaxed outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Требуемые навыки (через запятую)</label>
                  <input
                    value={editForm.requiredSkills}
                    onChange={(e) => setEditForm({ ...editForm, requiredSkills: e.target.value })}
                    className="w-full bg-surface-container-high rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Навык 1, Навык 2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Soft skills (через запятую)</label>
                  <input
                    value={editForm.softSkills}
                    onChange={(e) => setEditForm({ ...editForm, softSkills: e.target.value })}
                    className="w-full bg-surface-container-high rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Коммуникабельность, Ответственность"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Критерии верификации</label>
                  <textarea
                    value={editForm.verificationCriteria}
                    onChange={(e) => setEditForm({ ...editForm, verificationCriteria: e.target.value })}
                    rows={3}
                    className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
                <p className="text-on-surface leading-relaxed">{task.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {task.requiredSkills.map((s) => (
                    <span key={s} className="px-3 py-1.5 bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold rounded-full">
                      {s}
                    </span>
                  ))}
                  {task.softSkills.map((s) => (
                    <span key={s} className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-xs font-medium rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Applicants Table */}
            <section className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-headline">Заявки волонтеров</h2>
                <div className="flex gap-2">
                  <span className="text-xs font-bold bg-surface-container-high px-3 py-1 rounded-full">
                    Все ({task.applications.length})
                  </span>
                </div>
              </div>

              {task.applications.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-outline mb-4 block">group_off</span>
                  <p className="text-on-surface-variant">Пока нет откликов</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-surface-container-high">
                      <tr className="text-xs uppercase font-bold text-on-surface/50">
                        <th className="py-4 px-2">Волонтер</th>
                        <th className="py-4 px-2 text-center">Match</th>
                        <th className="py-4 px-2">Статус</th>
                        <th className="py-4 px-2 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/50">
                      {task.applications.map((app) => (
                        <tr key={app.id} className="group hover:bg-surface-container-low transition-colors">
                          <td className="py-4 px-2">
                            <div
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); router.push(`/curator/volunteers/${app.volunteer.id}`); }}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">
                                {app.volunteer.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold hover:text-primary transition-colors">{app.volunteer.name}</span>
                                {app.volunteer.city && (
                                  <span className="text-xs text-on-surface-variant block">{app.volunteer.city}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            {app.matchScore !== null ? (
                              <span className="text-primary font-black">{Math.round(app.matchScore * 100)}%</span>
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                          <td className="py-4 px-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${appStatusStyles[app.status]}`}>
                              {appStatusLabels[app.status]}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            {app.status === "PENDING" && (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleApplicationAction(app.id, "ACCEPTED")}
                                  className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all"
                                >
                                  Принять
                                </button>
                                <button
                                  onClick={() => handleApplicationAction(app.id, "REJECTED")}
                                  className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-lg text-xs font-bold hover:bg-error/10 hover:text-error transition-all"
                                >
                                  Отклонить
                                </button>
                              </div>
                            )}
                            {app.status === "COMPLETED" && app.completionPhotos && app.completionPhotos.length > 0 && (
                              <button
                                onClick={() => handleApplicationAction(app.id, "VERIFIED")}
                                className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold"
                              >
                                Верифицировать
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* AI Match Results Panel */}
            {matchResults.length > 0 && (
              <section className="bg-secondary-container/20 rounded-3xl p-8 shadow-sm border-2 border-secondary/30">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    Результаты ИИ-подбора
                  </h2>
                  <button
                    onClick={() => setMatchResults([])}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                    Закрыть
                  </button>
                </div>
                <p className="text-sm text-on-surface-variant mb-6">
                  Найдено {matchResults.length} подходящих волонтёров. Добавьте нужных в заявки или закройте панель.
                </p>
                <div className="space-y-3">
                  {matchResults.map((match) => (
                    <div key={match.volunteer.id} className="bg-surface-container-lowest rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shrink-0">
                          {match.volunteer.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold truncate">{match.volunteer.name}</div>
                          <div className="text-xs text-on-surface-variant">{match.volunteer.city || "Город не указан"}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {match.volunteer.skills.slice(0, 3).map((s) => (
                          <span key={s} className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded-full">{s}</span>
                        ))}
                      </div>
                      <div className="text-primary font-black text-lg shrink-0">
                        {Math.round(match.factors.finalScore * 100)}%
                      </div>
                      {match.reasoning && (
                        <p className="text-xs text-on-surface-variant leading-relaxed flex-1 min-w-0 hidden lg:block">{match.reasoning}</p>
                      )}
                      <button
                        onClick={() => addVolunteerFromMatch(match)}
                        disabled={addingVolunteer === match.volunteer.id}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                      >
                        {addingVolunteer === match.volunteer.id ? "Добавляю..." : "Добавить"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hint: click volunteer name to see full profile and AI analysis */}
          </div>

          {/* Right Column: Verification & Stats */}
          <div className="lg:col-span-4 space-y-8">
            {/* Verification Widget */}
            {(() => {
              const hasAnyPhotos = task.applications.some((a) => a.completionPhotos && a.completionPhotos.length > 0);
              const pendingVerifications = task.applications.filter(
                (a) => a.status === "COMPLETED" && a.completionPhotos && a.completionPhotos.length > 0
              ).length;
              return (
                <section
                  className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container hover:bg-surface-container-low transition-colors cursor-pointer"
                  onClick={() => router.push("/curator/verification")}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <h3 className="font-bold text-lg font-headline">Верификация фото</h3>
                    </div>
                    <span className="material-symbols-outlined text-primary text-xl">arrow_forward</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-4">Проверьте отчеты волонтеров.</p>
                  {!hasAnyPhotos ? (
                    <div className="flex items-center gap-3 bg-surface-container px-4 py-3 rounded-xl">
                      <span className="material-symbols-outlined text-on-surface-variant">hourglass_empty</span>
                      <span className="text-sm font-medium text-on-surface-variant">Ещё никто не отправлял отчёты</span>
                    </div>
                  ) : pendingVerifications > 0 ? (
                    <div className="flex items-center gap-3 bg-secondary-container/40 px-4 py-3 rounded-xl">
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                      <span className="text-sm font-bold text-on-secondary-container">
                        {pendingVerifications} {pendingVerifications === 1 ? "отчет ждёт" : pendingVerifications < 5 ? "отчета ждут" : "отчетов ждут"} проверки
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-primary-fixed/30 px-4 py-3 rounded-xl">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="text-sm font-bold text-on-primary-fixed-variant">Все отчеты проверены</span>
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Progress Card */}
            <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 font-headline">Прогресс задания</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span>Укомплектованность</span>
                    <span>{fillPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${fillPercent}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background p-4 rounded-2xl">
                    <div className="text-xs opacity-50 font-bold mb-1">Принято</div>
                    <div className="text-2xl font-black">{acceptedCount}</div>
                  </div>
                  <div className="bg-background p-4 rounded-2xl">
                    <div className="text-xs opacity-50 font-bold mb-1">Осталось</div>
                    <div className="text-2xl font-black">{task.volunteerQuota - acceptedCount}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Verification Criteria */}
            {task.verificationCriteria && (
              <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-3 font-headline">Критерии верификации</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{task.verificationCriteria}</p>
              </section>
            )}

            {/* Support Card */}
            <div className="bg-surface-container-high/50 rounded-3xl p-6 border-2 border-dashed border-primary/20 text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-2 block">support_agent</span>
              <h4 className="font-bold mb-1">Нужна помощь?</h4>
              <p className="text-xs opacity-60 mb-4">ИИ-ассистент поможет подобрать волонтёров или составить описание задачи.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
