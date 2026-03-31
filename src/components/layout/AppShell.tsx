"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-headline text-lg animate-pulse">
          Загрузка...
        </div>
      </div>
    );
  }

  if (!session) return null;

  const role = (session.user as { role?: string })?.role || "VOLUNTEER";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 md:ml-64 min-h-screen">
        <TopBar />
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
