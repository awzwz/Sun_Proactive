"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Profile {
  name: string;
  email: string;
  bio: string;
  city: string;
  avatarUrl: string;
}

interface NotifPrefs {
  newApplications: boolean;
  deadlines: boolean;
  verification: boolean;
  aiMatch: boolean;
}

interface Msg {
  type: "success" | "error";
  text: string;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const base =
    "w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none";
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-on-surface-variant">{label}</label>
      {multiline ? (
        <textarea
          className={`${base} min-h-[96px]`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          className={base}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function StatusBanner({ msg }: { msg: Msg }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        msg.type === "success"
          ? "bg-primary/10 text-primary"
          : "bg-error/10 text-error"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {msg.type === "success" ? "check_circle" : "error"}
      </span>
      {msg.text}
    </div>
  );
}

function Toggle({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  icon: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
          <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        </div>
        <div>
          <p className="font-semibold text-on-surface text-sm">{label}</p>
          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? "bg-primary" : "bg-outline-variant"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
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
    newApplications: true,
    deadlines: true,
    verification: true,
    aiMatch: true,
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
      });

    const saved = localStorage.getItem("notif_prefs");
    if (saved) {
      try {
        setNotifs(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setProfileSaving(false);
    if (res.ok) {
      setProfileMsg({ type: "success", text: "Профиль успешно сохранён" });
    } else {
      setProfileMsg({ type: "error", text: data.error || "Ошибка сохранения" });
    }
  };

  const toggleNotif = (key: keyof NotifPrefs) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    localStorage.setItem("notif_prefs", JSON.stringify(updated));
  };

  const savePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      setSecurityMsg({ type: "error", text: "Пароли не совпадают" });
      return;
    }
    if (security.newPassword.length < 8) {
      setSecurityMsg({ type: "error", text: "Пароль должен быть не менее 8 символов" });
      return;
    }
    setSecuritySaving(true);
    setSecurityMsg(null);
    const res = await fetch("/api/user/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      }),
    });
    const data = await res.json();
    setSecuritySaving(false);
    if (res.ok) {
      setSecurityMsg({ type: "success", text: "Пароль успешно изменён" });
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setSecurityMsg({ type: "error", text: data.error || "Ошибка смены пароля" });
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-2xl">
        <div>
          <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight leading-none mb-2">
            Настройки
          </h2>
          <p className="text-on-surface-variant">
            Управление профилем, уведомлениями и безопасностью аккаунта
          </p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList variant="line" className="w-full justify-start border-b border-outline-variant/20 rounded-none pb-0">
            <TabsTrigger value="profile" className="px-4 pb-3">
              Профиль
            </TabsTrigger>
            <TabsTrigger value="notifications" className="px-4 pb-3">
              Уведомления
            </TabsTrigger>
            <TabsTrigger value="security" className="px-4 pb-3">
              Безопасность
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-5 pt-6">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-lg font-headline">Личные данные</h3>

                <InputField
                  label="Имя"
                  value={profile.name}
                  onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
                  placeholder="Ваше имя"
                />
                <InputField
                  label="Email"
                  value={profile.email}
                  type="email"
                  onChange={() => {}}
                  placeholder="email@example.com"
                />
                <InputField
                  label="Город"
                  value={profile.city}
                  onChange={(v) => setProfile((p) => ({ ...p, city: v }))}
                  placeholder="Введите свой город"
                />
                <InputField
                  label="О себе / организации"
                  value={profile.bio}
                  onChange={(v) => setProfile((p) => ({ ...p, bio: v }))}
                  placeholder="Расскажите о вашей организации и деятельности"
                  multiline
                />
                <InputField
                  label="URL аватара"
                  value={profile.avatarUrl}
                  onChange={(v) => setProfile((p) => ({ ...p, avatarUrl: v }))}
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              {profileMsg && <StatusBanner msg={profileMsg} />}

              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {profileSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Сохранить изменения
                  </>
                )}
              </button>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="space-y-5 pt-6">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg font-headline">Настройки уведомлений</h3>
                <p className="text-sm text-on-surface-variant">
                  Выберите, о каких событиях вы хотите получать уведомления
                </p>

                <div className="space-y-3 pt-1">
                  <Toggle
                    label="Новые заявки"
                    description="Когда волонтёр подаёт заявку на вашу задачу"
                    icon="person_add"
                    checked={notifs.newApplications}
                    onChange={() => toggleNotif("newApplications")}
                  />
                  <Toggle
                    label="Дедлайны задач"
                    description="Напоминание за 24 часа до окончания срока задачи"
                    icon="schedule"
                    checked={notifs.deadlines}
                    onChange={() => toggleNotif("deadlines")}
                  />
                  <Toggle
                    label="Верификация отчётов"
                    description="Результаты проверки фотоотчётов волонтёров"
                    icon="verified_user"
                    checked={notifs.verification}
                    onChange={() => toggleNotif("verification")}
                  />
                  <Toggle
                    label="ИИ-матчинг"
                    description="Когда ИИ находит подходящих волонтёров для ваших задач"
                    icon="psychology"
                    checked={notifs.aiMatch}
                    onChange={() => toggleNotif("aiMatch")}
                  />
                </div>
              </div>

              <p className="text-xs text-on-surface-variant px-1">
                Настройки сохраняются автоматически на этом устройстве
              </p>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-5 pt-6">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-lg font-headline">Смена пароля</h3>

                <InputField
                  label="Текущий пароль"
                  value={security.currentPassword}
                  type="password"
                  onChange={(v) => setSecurity((s) => ({ ...s, currentPassword: v }))}
                  placeholder="••••••••"
                />
                <InputField
                  label="Новый пароль"
                  value={security.newPassword}
                  type="password"
                  onChange={(v) => setSecurity((s) => ({ ...s, newPassword: v }))}
                  placeholder="Минимум 8 символов"
                />
                <InputField
                  label="Подтверждение пароля"
                  value={security.confirmPassword}
                  type="password"
                  onChange={(v) => setSecurity((s) => ({ ...s, confirmPassword: v }))}
                  placeholder="Повторите новый пароль"
                />
              </div>

              {securityMsg && <StatusBanner msg={securityMsg} />}

              <button
                onClick={savePassword}
                disabled={
                  securitySaving ||
                  !security.currentPassword ||
                  !security.newPassword ||
                  !security.confirmPassword
                }
                className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {securitySaving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    Изменение...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Изменить пароль
                  </>
                )}
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
