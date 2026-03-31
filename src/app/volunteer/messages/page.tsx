"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesView } from "@/components/messages/MessagesView";

function MessagesFallback() {
  return (
    <div className="h-[60vh] animate-pulse rounded-2xl bg-surface-container" />
  );
}

export default function VolunteerMessagesPage() {
  return (
    <AppShell>
      <Suspense fallback={<MessagesFallback />}>
        <MessagesView />
      </Suspense>
    </AppShell>
  );
}
