"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { InterviewerChat } from "@/components/ai/InterviewerChat";

export default function NewTaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading" || !session) return null;

  const role = (session.user as { role?: string })?.role || "CURATOR";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <InterviewerChat />
      </main>
    </div>
  );
}
