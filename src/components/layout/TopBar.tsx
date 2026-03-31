"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

interface SearchTask {
  id: string;
  title: string;
  location: string;
  city: string | null;
  status: string;
}

interface SearchVolunteer {
  id: string;
  name: string;
  email: string;
  city: string | null;
  skills: string[];
}

interface ConvPreview {
  id: string;
  otherUser: { id: string; name: string; role: string; avatarUrl: string | null } | null;
  lastMessage: { id: string; content: string; senderId: string; createdAt: string } | null;
  updatedAt: string;
}

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export function TopBar() {
  const { data: session } = useSession();
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const [volunteers, setVolunteers] = useState<SearchVolunteer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Chat panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [convList, setConvList] = useState<ConvPreview[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const myId = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role;

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setTasks([]);
      setVolunteers([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setVolunteers(data.volunteers || []);
        setShowResults(true);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigateToTask = (id: string) => {
    setShowResults(false);
    setQuery("");
    router.push(`/curator/tasks/${id}`);
  };

  const navigateToVolunteer = (id: string) => {
    setShowResults(false);
    setQuery("");
    router.push(`/curator/volunteers/${id}`);
  };

  const openChat = async () => {
    setChatOpen(true);
    setLoadingChat(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConvList(data.conversations || []);
      }
    } finally {
      setLoadingChat(false);
    }
  };

  const goToConversation = (convId: string) => {
    setChatOpen(false);
    const prefix = userRole === "CURATOR" ? "/curator" : "/volunteer";
    router.push(`${prefix}/messages?conv=${convId}`);
  };

  const goToAllMessages = () => {
    setChatOpen(false);
    const prefix = userRole === "CURATOR" ? "/curator" : "/volunteer";
    router.push(`${prefix}/messages`);
  };

  const hasResults = tasks.length > 0 || volunteers.length > 0;

  return (
    <header className="flex justify-between items-center w-full px-8 h-16 bg-background sticky top-0 z-40">
      {/* Search */}
      <div className="flex items-center gap-8">
        <div className="relative group" ref={searchRef}>
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-primary/20 focus:w-80 transition-all outline-none"
            placeholder="Поиск задач и волонтеров..."
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
          />

          {showResults && (
            <div className="absolute top-full left-0 mt-2 w-96 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50">
              {searching ? (
                <div className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-xl block mb-1">progress_activity</span>
                  Поиск...
                </div>
              ) : !hasResults ? (
                <div className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl block mb-2 opacity-50">search_off</span>
                  Ничего не найдено по запросу «{query}»
                </div>
              ) : (
                <>
                  {tasks.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold text-outline uppercase tracking-widest bg-surface-container-low/50">
                        Задачи
                      </div>
                      {tasks.map((t) => (
                        <button
                          key={t.id}
                          className="w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors flex items-center gap-3"
                          onClick={() => navigateToTask(t.id)}
                        >
                          <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-on-surface truncate">{t.title}</div>
                            <div className="text-xs text-on-surface-variant truncate">
                              {t.location}{t.city ? `, ${t.city}` : ""} · {statusLabels[t.status] || t.status}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {volunteers.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold text-outline uppercase tracking-widest bg-surface-container-low/50">
                        Волонтеры
                      </div>
                      {volunteers.map((v) => (
                        <button
                          key={v.id}
                          className="w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors flex items-center gap-3"
                          onClick={() => navigateToVolunteer(v.id)}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {v.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-on-surface truncate">{v.name}</div>
                            <div className="text-xs text-on-surface-variant truncate">
                              {v.email}{v.city ? ` · ${v.city}` : ""}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* Chat / Messages */}
        <div className="relative" ref={chatRef}>
          <button
            className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-all flex items-center justify-center"
            onClick={() => (chatOpen ? setChatOpen(false) : openChat())}
          >
            <span className="material-symbols-outlined text-[22px]">chat_bubble_outline</span>
          </button>

          {chatOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                <h4 className="text-sm font-bold font-headline">Сообщения</h4>
                <button
                  onClick={goToAllMessages}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Все
                </button>
              </div>

              {loadingChat ? (
                <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-xl block mb-1">progress_activity</span>
                  Загрузка...
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {convList.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">forum</span>
                      Нет диалогов
                    </div>
                  ) : (
                    convList.map((c) => (
                      <button
                        key={c.id}
                        className="w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors border-b border-outline-variant/5 last:border-0 flex items-center gap-3"
                        onClick={() => goToConversation(c.id)}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {c.otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-on-surface truncate">
                              {c.otherUser?.name || "Пользователь"}
                            </span>
                            {c.lastMessage && (
                              <span className="text-[10px] text-outline shrink-0">
                                {new Date(c.lastMessage.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          {c.lastMessage && (
                            <p className="text-xs text-on-surface-variant truncate">
                              {c.lastMessage.senderId === myId ? "Вы: " : ""}
                              {c.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            const prefix = userRole === "CURATOR" ? "/curator" : "/volunteer";
            router.push(`${prefix}/settings`);
          }}
          className="flex items-center gap-2 pl-2 ml-2 border-l border-outline-variant/30 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="text-sm font-bold font-headline">
            {session?.user?.name || "Пользователь"}
          </span>
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </button>
      </div>
    </header>
  );
}
