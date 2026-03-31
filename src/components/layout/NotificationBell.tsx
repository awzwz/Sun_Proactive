"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
    });
    fetchNotifications();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative p-2 text-on-surface hover:bg-surface-container rounded-full transition-all flex items-center justify-center outline-none">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] rounded-full bg-error text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b">
          <h4 className="text-sm font-semibold">Уведомления</h4>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              Нет уведомлений
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  !n.read ? "bg-orange-50" : ""
                }`}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <span className="text-sm font-medium">{n.title}</span>
                <span className="text-xs text-gray-600 line-clamp-2">
                  {n.body}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(n.createdAt).toLocaleString("ru-RU")}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
