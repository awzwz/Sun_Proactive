"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

type Msg = { type: "success" | "error"; text: string };

type Profile = {
  name: string;
  email: string;
  bio: string;
  city: string;
  avatarUrl: string;
};

type NotifPrefs = {
  recommendations: boolean;
  messages: boolean;
  deadlines: boolean;
};

function Toggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full p-4 rounded-2xl bg-surface-container-lowest hover:bg-surface-container transition-colors"
    >
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <span
        className={`w-12 h-7 rounded-full p-1 transition-colors ${checked ? "bg-primary" : "bg-outline/30"}`}
        aria-hidden
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

export default function VolunteerSettingsPage() {
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    bio: "",
    city: "",
    avatarUrl: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null);

  const [notifs, setNotifs] = useState<NotifPrefs>({
    recommendations: true,
    messages: true,
    deadlines: true,
  });

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<Msg | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setProfile({
            name: data.name || "",
            email: data.email || "",
            bio: data.bio || "",
            city: data.city || "",
            avatarUrl: data.avatarUrl || "",
          });
        }
      })
      .catch(() => {});

    const saved = localStorage.getItem("volunteer_notif_prefs");
    if (saved) {
      try {
        setNotifs(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const toggleNotif = (key: keyof NotifPrefs) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    localStorage.setItem("volunteer_notif_prefs", JSON.stringify(updated));
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (res.ok) setProfileMsg({ type: "success", text: "Профиль сохранён" });
      else setProfileMsg({ type: "error", text: data.error || "Ошибка сохранения" });
    } catch {
      setProfileMsg({ type: "error", text: "Ошибка сети" });
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    setSecurityMsg(null);
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      setSecurityMsg({ type: "error", text: "Заполните все поля" });
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setSecurityMsg({ type: "error", text: "Пароли не совпадают" });
      return;
    }
    setSecuritySaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: security.currentPassword, newPassword: security.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityMsg({ type: "success", text: "Пароль обновлён" });
        setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setSecurityMsg({ type: "error", text: data.error || "Ошибка" });
      }
    } catch {
      setSecurityMsg({ type: "error", text: "Ошибка сети" });
    } finally {
      setSecuritySaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Настройки</h1>
          <p className="text-on-surface-variant mt-2">Профиль, уведомления и безопасность аккаунта.</p>
        </div>

        <section className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container shadow-sm">
          <h2 className="text-xl font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            Профиль
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Имя</span>
              <input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
                placeholder="Ваше имя"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Email</span>
              <input
                value={profile.email}
                disabled
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm border-0 opacity-70"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">О себе</span>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0 resize-none"
                placeholder="Коротко о себе"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Город</span>
              <input
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
                placeholder="Введите свой город"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ссылка на аватар</span>
              <input
                value={profile.avatarUrl}
                onChange={(e) => setProfile((p) => ({ ...p, avatarUrl: e.target.value }))}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
                placeholder="https://..."
              />
            </label>
          </div>

          {profileMsg && (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
              profileMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {profileMsg.text}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
            >
              {profileSaving ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container shadow-sm">
          <h2 className="text-xl font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">notifications</span>
            Уведомления
          </h2>
          <div className="space-y-3">
            <Toggle label="AI-рекомендации задач" checked={notifs.recommendations} onToggle={() => toggleNotif("recommendations")} />
            <Toggle label="Новые сообщения" checked={notifs.messages} onToggle={() => toggleNotif("messages")} />
            <Toggle label="Напоминания о дедлайнах" checked={notifs.deadlines} onToggle={() => toggleNotif("deadlines")} />
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container shadow-sm">
          <h2 className="text-xl font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">lock</span>
            Безопасность
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Текущий пароль</span>
              <input
                type="password"
                value={security.currentPassword}
                onChange={(e) => setSecurity((s) => ({ ...s, currentPassword: e.target.value }))}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Новый пароль</span>
              <input
                type="password"
                value={security.newPassword}
                onChange={(e) => setSecurity((s) => ({ ...s, newPassword: e.target.value }))}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Повторите пароль</span>
              <input
                type="password"
                value={security.confirmPassword}
                onChange={(e) => setSecurity((s) => ({ ...s, confirmPassword: e.target.value }))}
                className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border-0"
              />
            </label>
          </div>

          {securityMsg && (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
              securityMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {securityMsg.text}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={savePassword}
              disabled={securitySaving}
              className="px-6 py-3 rounded-xl bg-surface-container-highest text-on-surface font-bold hover:bg-surface-container-high active:scale-95 transition-all disabled:opacity-60"
            >
              {securitySaving ? "Обновляю..." : "Сменить пароль"}
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

