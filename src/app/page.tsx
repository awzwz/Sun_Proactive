"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      const role = (session.user as { role: string }).role;
      if (role === "CURATOR") {
        router.push("/curator/dashboard");
      } else {
        router.push("/volunteer/dashboard");
      }
    }
  }, [session, router]);

  if (status === "loading") return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-lg px-4">
        <h1 className="text-4xl font-bold text-orange-600 mb-4">
          Sun Proactive
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          AI-биржа социальных задач
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Умная платформа для координации социальных проектов.
          AI подбирает волонтёров, проводит интервью и верифицирует результаты.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/login">
            <Button variant="outline" size="lg">
              Войти
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
              Регистрация
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
