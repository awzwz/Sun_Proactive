"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { toast } from "sonner";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const AVAIL_KEY = "volunteer_availability";
const DEFAULT_AVAIL = {
  days: [false, false, false, false, false, false, false],
  times: ["", "", "", "", "", "", ""],
};

export default function VolunteerProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [city, setCity] = useState("");
  const [impactHours, setImpactHours] = useState(0);
  const [experience, setExperience] = useState<{
    categories: { key: string; label: string; icon: string; color: string; count: number; hours: number; max: number; points: number; maxPoints: number }[];
    totalVerified: number;
    totalHours: number;
    totalPoints: number;
  } | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [availDays, setAvailDays] = useState(DEFAULT_AVAIL.days);
  const [availTimes, setAvailTimes] = useState(DEFAULT_AVAIL.times);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load availability from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVAIL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.days) setAvailDays(parsed.days);
        if (parsed.times) setAvailTimes(parsed.times);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      Promise.all([
        fetch("/api/volunteers/profile").then((r) => r.json()),
        fetch("/api/volunteer/experience").then((r) => r.json()),
      ])
        .then(([d, exp]) => {
          if (d.user) {
            setName(d.user.name || "");
            setBio(d.user.bio || "");
            setSkills(d.user.skills || []);
            setInterests(d.user.interests || []);
            setGoals(d.user.goals || "");
            setCity(d.user.city || "");
            setImpactHours(d.user.impactHours || 0);
          }
          if (!exp.error) setExperience(exp);
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/volunteers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, skills, interests, goals, city }),
      });
      if (res.ok) {
        localStorage.setItem(AVAIL_KEY, JSON.stringify({ days: availDays, times: availTimes }));
        toast.success("Профиль сохранён! AI-embedding обновлён.");
        setEditing(false);
      } else toast.error("Ошибка при сохранении");
    } catch { toast.error("Ошибка"); }
    finally { setSaving(false); }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) { setSkills([...skills, newSkill.trim()]); setNewSkill(""); }
  };
  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) { setInterests([...interests, newInterest.trim()]); setNewInterest(""); }
  };

  const toggleDay = (i: number) => {
    setAvailDays((prev) => prev.map((v, idx) => idx === i ? !v : v));
  };

  const setTime = (i: number, val: string) => {
    setAvailTimes((prev) => prev.map((t, idx) => idx === i ? val : t));
  };

  const allSkills = [...skills, ...interests];
  const goalItems = goals ? goals.split("\n").filter(Boolean) : [];

  if (loading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-surface-container rounded-3xl" />
          <div className="h-48 bg-surface-container rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ─── Profile Hero Banner — exact Stitch: bg-primary, avatar with verified badge, edit button ─── */}
        <section className="relative h-64 rounded-3xl overflow-hidden bg-primary">
          {/* Abstract texture overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            background: "radial-gradient(ellipse at 80% 50%, rgba(137, 245, 231, 0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 60%, rgba(0, 40, 35, 0.6) 0%, transparent 50%)"
          }} />
          {/* Bottom gradient + content */}
          <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/60 to-transparent flex items-end gap-6">
            {/* Avatar with verified badge */}
            <div className="relative group shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-primary-fixed/30 border-4 border-white shadow-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
            </div>
            {/* Name & meta */}
            <div className="text-white pb-2 flex-1 min-w-0">
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-3xl font-extrabold tracking-tight bg-transparent border-b border-white/50 focus:outline-none w-full mb-2"
                />
              ) : (
                <h1 className="text-3xl font-extrabold tracking-tight font-headline">{name || "Ваше имя"}</h1>
              )}
              <div className="flex items-center gap-4 mt-1 opacity-90">
                <span className="flex items-center gap-1 text-sm font-medium">
                  <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                  Волонтер
                </span>
                {city && (
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                    {city}
                  </span>
                )}
              </div>
            </div>
            {/* Edit / Save Button */}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className="ml-auto mb-2 bg-white/20 backdrop-blur-md text-white px-6 py-2.5 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-2 shrink-0"
            >
              <span className="material-symbols-outlined">{editing ? (saving ? "hourglass_top" : "save") : "edit"}</span>
              {editing ? (saving ? "Сохраняю..." : "Сохранить") : "Редактировать"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ─── Left 8 cols ─── */}
          <div className="lg:col-span-8 space-y-8">

            {/* About — glass-card from Stitch */}
            <div className="glass-panel rounded-3xl p-8 shadow-sm border border-white/30">
              <h2 className="text-xl font-bold mb-4 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_search</span>
                Обо мне
              </h2>
              {editing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Профессиональный эколог с пятилетним опытом..."
                  rows={5}
                  className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-on-surface/90 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 border-0 resize-none"
                />
              ) : (
                <p className="text-lg leading-relaxed text-on-surface/80 font-medium">
                  {bio || "Нажмите «Редактировать» чтобы добавить информацию о себе..."}
                </p>
              )}
            </div>

            {/* Skills & Goals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skills & Interests — glass-card */}
              <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/30">
                <h3 className="text-lg font-bold mb-4 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">star</span>
                  Навыки и интересы
                </h3>
                {editing && (
                  <div className="space-y-2 mb-4">
                    <div className="flex gap-2">
                      <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="Навык" className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg text-sm focus:outline-none border-0" />
                      <button onClick={addSkill} className="px-3 py-2 bg-primary/10 text-primary rounded-lg font-bold text-sm">+</button>
                    </div>
                    <div className="flex gap-2">
                      <input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())} placeholder="Интерес" className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg text-sm focus:outline-none border-0" />
                      <button onClick={addInterest} className="px-3 py-2 bg-secondary/10 text-secondary rounded-lg font-bold text-sm">+</button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {allSkills.map((s) => (
                    <span
                      key={s}
                      className={`px-3 py-1.5 bg-surface-container-high text-primary rounded-full text-sm font-bold ${editing ? 'cursor-pointer hover:bg-error/10 hover:text-error' : ''}`}
                      onClick={() => editing && (setSkills(skills.filter((x) => x !== s)), setInterests(interests.filter((x) => x !== s)))}
                    >
                      {s}
                    </span>
                  ))}
                  {allSkills.length === 0 && <p className="text-sm text-on-surface-variant">Добавьте навыки и интересы</p>}
                </div>
              </div>

              {/* Goals — glass-card */}
              <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/30">
                <h3 className="text-lg font-bold mb-4 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">emoji_events</span>
                  Мои цели
                </h3>
                {editing ? (
                  <textarea
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder={"Помощь экосистеме Урала\nМенторство для молодых\nЗапуск курса"}
                    rows={5}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-xl text-sm focus:outline-none border-0 resize-none"
                  />
                ) : (
                  <ul className="space-y-3">
                    {goalItems.map((goal, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="material-symbols-outlined text-emerald-500 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-sm font-medium">{goal}</span>
                      </li>
                    ))}
                    {goalItems.length === 0 && (
                      <li className="text-sm text-on-surface-variant">Нажмите «Редактировать» чтобы добавить цели...</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="glass-panel rounded-3xl p-8 shadow-sm border border-white/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                  График доступности
                </h3>
                {!editing && (
                  <span className="text-xs text-on-surface-variant">
                    {availDays.filter(Boolean).length > 0
                      ? `${availDays.filter(Boolean).length} дн. в неделю`
                      : "Не указан"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex flex-col gap-1">
                    <div
                      onClick={() => editing && toggleDay(i)}
                      className={`text-center p-3 rounded-2xl border transition-all select-none ${editing ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${
                        availDays[i]
                          ? i >= 5
                            ? "bg-primary shadow-lg border-transparent text-white"
                            : "bg-primary/5 border border-primary/20 text-primary"
                          : "bg-surface-container-lowest shadow-sm border-surface-container"
                      }`}
                    >
                      <p className={`text-[10px] uppercase font-bold mb-1.5 ${availDays[i] ? (i >= 5 ? 'text-white' : 'text-primary') : 'text-on-surface-variant'}`}>{day}</p>
                      <div className={`w-2 h-2 rounded-full mx-auto ${availDays[i] ? (i >= 5 ? 'bg-white' : 'bg-primary') : 'bg-surface-container-high'}`} />
                      {!editing && availDays[i] && availTimes[i] && (
                        <p className={`text-[9px] mt-1.5 font-bold ${i >= 5 ? 'text-white/80' : 'text-primary/80'}`}>{availTimes[i]}</p>
                      )}
                    </div>
                    {editing && availDays[i] && (
                      <input
                        type="text"
                        value={availTimes[i]}
                        onChange={(e) => setTime(i, e.target.value)}
                        placeholder="напр. 18-21"
                        className="w-full text-center text-[10px] bg-surface-container-low border-0 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <p className="text-xs text-on-surface-variant mt-4">Нажмите на день чтобы отметить доступность, затем укажите удобное время</p>
              )}
            </div>

            {/* Location — city input when editing */}
            {editing && (
              <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/30">
                <h3 className="text-lg font-bold mb-4 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Местоположение
                </h3>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Введите свой город"
                  className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
                />
              </div>
            )}
          </div>

          {/* ─── Right 4 cols ─── */}
          <div className="lg:col-span-4 space-y-8">

            {/* Confirmed Experience */}
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-container">
              <h3 className="text-lg font-bold mb-6 font-headline">Подтверждённый опыт</h3>
              <div className="space-y-5">
                {(experience?.categories ?? [
                  { key: "ecology", label: "Экология", icon: "eco", color: "bg-emerald-100 text-emerald-600", count: 0, hours: 0, max: 0, points: 0, maxPoints: 0 },
                  { key: "education", label: "Образование", icon: "school", color: "bg-blue-100 text-blue-600", count: 0, hours: 0, max: 0, points: 0, maxPoints: 0 },
                  { key: "social", label: "Социальная помощь", icon: "diversity_3", color: "bg-orange-100 text-orange-600", count: 0, hours: 0, max: 0, points: 0, maxPoints: 0 },
                ]).map(({ icon, label, color, count, hours: catHours, max, points, maxPoints }) => {
                  const pct = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${color}`}>
                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm">{label}</p>
                            <p className="text-[10px] text-on-surface-variant">
                              {catHours} ч. • {points} баллов{maxPoints > 0 ? ` / ${maxPoints}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-primary">{count}</span>
                          {max > 0 && <span className="text-xs text-on-surface-variant">/{max}</span>}
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-5 border-t border-surface-container text-center">
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">Всего часов волонтёрства</p>
                  <p className="text-4xl font-black text-primary">{experience?.totalHours ?? impactHours}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Всего баллов: <span className="font-bold text-on-surface">{experience?.totalPoints ?? 0}</span>
                  </p>
                  {(experience?.totalVerified ?? 0) > 0 && (
                    <p className="text-xs text-on-surface-variant mt-1">{experience!.totalVerified} подтверждённых задач</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location card when not editing */}
            {!editing && (
              <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/30">
                <h3 className="text-sm font-bold mb-4 text-on-surface-variant uppercase tracking-widest">Местоположение</h3>
                <div className="h-32 rounded-2xl overflow-hidden bg-surface-container mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-30" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary">pin_drop</span>
                  <p className="text-sm font-medium">{city || "Город не указан"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Achievements — full width ─── */}
        <section className="bg-primary rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Ваши достижения</p>
              <h3 className="text-2xl font-extrabold font-headline mb-3">Трофеи и награды</h3>
              <p className="text-white/70 text-sm leading-relaxed max-w-md">
                Система достижений скоро будет доступна. Выполняйте задачи, чтобы открывать трофеи и подниматься в рейтинге волонтёров.
              </p>
            </div>
            {/* Preview trophies */}
            <div className="flex gap-4 flex-shrink-0">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center" title="Первые 10 часов">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center" title="Эко-амбассадор">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>nature</span>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center" title="Наставник">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center opacity-40">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center opacity-40">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-6 pt-6 border-t border-white/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-yellow-300" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
            <span className="text-sm font-medium text-white/80">Раздел достижений находится в разработке — следите за обновлениями</span>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
