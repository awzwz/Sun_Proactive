"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CURATOR" | "VOLUNTEER">("VOLUNTEER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      if (role === "CURATOR") {
        router.push("/curator/dashboard");
      } else {
        router.push("/volunteer/profile");
      }
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex items-center justify-center p-6 md:p-12 overflow-x-hidden relative">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] bg-secondary-fixed/30 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-primary-fixed/20 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />

      <main className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-12 lg:gap-24 items-center">
        {/* Left Column: Branding */}
        <div className="hidden md:flex flex-col w-1/2 space-y-8">
          <div className="space-y-4">
            <h1 className="font-headline text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tighter leading-tight">
              Интеллект для <br />
              <span className="text-primary">социальных перемен</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
              Sun Proactive объединяет кураторов и волонтеров через прозрачную систему ИИ-подбора и верификации задач.
            </p>
          </div>
          <div className="relative pt-10">
            <div className="absolute -top-4 -left-8 w-64 h-64 bg-primary-fixed opacity-20 asymmetric-shape blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <h3 className="font-headline font-bold text-on-surface">ИИ-Подбор</h3>
                <p className="text-sm text-on-surface-variant">Точное соответствие навыков волонтера задачам проекта.</p>
              </div>
              <div className="mt-8 bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <h3 className="font-headline font-bold text-on-surface">Верификация</h3>
                <p className="text-sm text-on-surface-variant">Прозрачный процесс подтверждения выполненных работ.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div className="w-full md:w-1/2 max-w-md">
          <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[2rem] shadow-sm border border-outline-variant/10">
            <div className="mb-8 text-center md:text-left">
              <div className="text-xl font-black text-primary font-headline tracking-tighter mb-6">
                Sun Proactive
              </div>
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">
                Регистрация
              </h2>
              <p className="text-on-surface-variant">Создайте аккаунт и начните менять мир</p>
            </div>

            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <label className="cursor-pointer group">
                <input
                  type="radio"
                  name="role"
                  className="peer hidden"
                  checked={role === "CURATOR"}
                  onChange={() => setRole("CURATOR")}
                />
                <div className="flex flex-col items-center justify-center p-4 border-2 border-surface-container text-on-surface-variant rounded-xl transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary-fixed/20 peer-checked:text-primary group-hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-3xl mb-2">manage_accounts</span>
                  <span className="font-headline font-bold text-sm tracking-tight">Куратор</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input
                  type="radio"
                  name="role"
                  className="peer hidden"
                  checked={role === "VOLUNTEER"}
                  onChange={() => setRole("VOLUNTEER")}
                />
                <div className="flex flex-col items-center justify-center p-4 border-2 border-surface-container text-on-surface-variant rounded-xl transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary-fixed/20 peer-checked:text-primary group-hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-3xl mb-2">volunteer_activism</span>
                  <span className="font-headline font-bold text-sm tracking-tight">Волонтер</span>
                </div>
              </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="name">
                  Имя
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline outline-none"
                  placeholder="Ваше имя"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="email">
                  Электронная почта
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline outline-none"
                  placeholder="example@mail.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="password">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline outline-none"
                  placeholder="Минимум 6 символов"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-error bg-error-container p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-full font-headline font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Регистрация..." : "Создать аккаунт"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-on-surface-variant text-sm">
                Уже есть аккаунт?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Войти
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
