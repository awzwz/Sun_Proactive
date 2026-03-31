"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MessagesView } from "@/components/messages/MessagesView";

export default function CuratorMessagesPage() {
  return (
    <AppShell>
      <MessagesView />
    </AppShell>
  );
}
