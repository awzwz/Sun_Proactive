"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface OtherUser {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface ConversationPreview {
  id: string;
  otherUser: OtherUser | null;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "сейчас";
  if (mins < 60) return `${mins} мин`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч`;
  const days = Math.floor(hrs / 24);
  return `${days} д`;
}

function dateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

const AVATAR_COLORS = [
  "from-primary to-emerald-500",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function MessagesView() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const myId = session?.user?.id;

  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get("conv"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setOtherUser(data.conversation?.otherUser || null);
      }
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
  }, [activeConvId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConvId) return;
    const interval = setInterval(() => {
      fetchMessages(activeConvId);
      fetchConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvId, fetchMessages, fetchConversations]);

  const openConv = (id: string) => {
    setActiveConvId(id);
    setEditingId(null);
    setMenuOpenId(null);
    const role = (session?.user as { role?: string })?.role;
    const prefix = role === "CURATOR" ? "/curator" : "/volunteer";
    router.replace(`${prefix}/messages?conv=${id}`);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) => [...prev, message]);
        setInput("");
        inputRef.current?.focus();
        fetchConversations();
      }
    } finally {
      setSending(false);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !activeConvId || !editingId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        const { message: updated } = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === editingId ? { ...m, content: updated.content, edited: true } : m)));
        setEditingId(null);
        setEditContent("");
      }
    } catch {
      toast.error("Ошибка при редактировании");
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!activeConvId) return;
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages/${msgId}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, deleted: true, content: "Сообщение удалено" } : m))
        );
      }
    } catch {
      toast.error("Ошибка при удалении");
    }
  };

  const deleteConversation = async () => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
        setActiveConvId(null);
        setMessages([]);
        setOtherUser(null);
        setConfirmDelete(false);
        toast.success("Диалог удалён");
        const role = (session?.user as { role?: string })?.role;
        const prefix = role === "CURATOR" ? "/curator" : "/volunteer";
        router.replace(`${prefix}/messages`);
      }
    } catch {
      toast.error("Ошибка при удалении диалога");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] animate-pulse gap-0">
        <div className="w-[340px] bg-surface-container-low/60 rounded-l-3xl" />
        <div className="flex-1 bg-surface-container-lowest rounded-r-3xl" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-3xl overflow-hidden shadow-lg border border-outline-variant/8">
      {/* ─── Left: Conversations ─── */}
      <div className="w-[340px] bg-surface-container-low/40 backdrop-blur-sm flex flex-col shrink-0 border-r border-outline-variant/8">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-2xl font-black font-headline tracking-tight">Чаты</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Ваши переписки с участниками</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-12">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-outline/40">chat_bubble</span>
              </div>
              <p className="font-bold text-on-surface-variant/70 mb-1">Пока нет диалогов</p>
              <p className="text-xs text-on-surface-variant/50 leading-relaxed">
                Начните переписку из профиля волонтёра или страницы задачи
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = activeConvId === conv.id;
                const name = conv.otherUser?.name || "Пользователь";
                const gradient = avatarColor(name);
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConv(conv.id)}
                    className={`w-full px-4 py-3.5 text-left flex items-center gap-3.5 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 shadow-sm"
                        : "hover:bg-surface-container-lowest/80"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm truncate ${isActive ? "text-primary" : "text-on-surface"}`}>
                          {name}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-outline/70 shrink-0 tabular-nums">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        {conv.otherUser?.role === "CURATOR" ? "Куратор" : "Волонтёр"}
                      </span>
                      {conv.lastMessage && (
                        <p className="text-xs text-on-surface-variant/70 truncate mt-0.5">
                          {conv.lastMessage.senderId === myId && (
                            <span className="text-primary/60 font-medium">Вы: </span>
                          )}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right: Chat Thread ─── */}
      {activeConvId ? (
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header */}
          <div className="px-6 py-4 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline-variant/8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => {
                  setActiveConvId(null);
                  const role = (session?.user as { role?: string })?.role;
                  const prefix = role === "CURATOR" ? "/curator" : "/volunteer";
                  router.replace(`${prefix}/messages`);
                }}
                className="md:hidden p-1.5 hover:bg-surface-container rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(otherUser?.name || "?")} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <span className="font-bold text-sm block">{otherUser?.name || "Загрузка..."}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-on-surface-variant/70 font-medium">
                    {otherUser?.role === "CURATOR" ? "Куратор" : "Волонтёр"}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative">
              {confirmDelete ? (
                <div className="flex items-center gap-2.5 bg-error-container/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm animate-in fade-in">
                  <span className="text-xs font-semibold text-on-error-container">Удалить диалог?</span>
                  <button onClick={deleteConversation} className="text-xs font-bold text-error hover:underline">
                    Да
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-on-error-container/70 hover:underline">
                    Нет
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 text-outline/50 hover:text-error hover:bg-error/5 rounded-xl transition-all"
                  title="Удалить диалог"
                >
                  <span className="material-symbols-outlined text-[20px]">delete_outline</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-3xl text-primary/40">progress_activity</span>
                  <span className="text-xs text-on-surface-variant/50">Загрузка сообщений...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-xs">
                  <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-5">
                    <span className="material-symbols-outlined text-4xl text-primary/30" style={{ fontVariationSettings: "'FILL' 1" }}>waving_hand</span>
                  </div>
                  <p className="font-bold text-on-surface mb-1">Начните общение</p>
                  <p className="text-sm text-on-surface-variant/60 leading-relaxed">
                    Напишите первое сообщение — {otherUser?.name || "собеседник"} увидит его сразу
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {messages.map((msg, i) => {
                  const isMine = msg.senderId === myId;
                  const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;
                  const prevDate = i > 0 ? new Date(messages[i - 1].createdAt).toDateString() : null;
                  const curDate = new Date(msg.createdAt).toDateString();
                  const showDate = i === 0 || prevDate !== curDate;

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-5">
                          <span className="px-3 py-1 bg-surface-container/60 rounded-full text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
                            {dateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-0.5"} group`}>
                        {!isMine && showAvatar && (
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor(msg.sender.name)} flex items-center justify-center text-white font-bold text-[10px] shrink-0 mr-2.5 mt-1 shadow-sm`}>
                            {msg.sender.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {!isMine && !showAvatar && <div className="w-8 mr-2.5 shrink-0" />}

                        <div className={`relative max-w-[65%] ${isMine ? "order-1" : ""}`}>
                          {msg.deleted ? (
                            <div className="px-4 py-2.5 rounded-2xl bg-surface-container/30 border border-outline-variant/5">
                              <span className="text-sm text-on-surface-variant/40 italic flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">block</span>
                                Сообщение удалено
                              </span>
                            </div>
                          ) : editingId === msg.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                className="px-4 py-2.5 rounded-2xl bg-surface-container-lowest border-2 border-primary/30 text-sm outline-none focus:border-primary/60 transition-colors"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-xs px-3 py-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                                >
                                  Отмена
                                </button>
                                <button
                                  onClick={saveEdit}
                                  className="text-xs px-3 py-1 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                                >
                                  Сохранить
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2.5 text-sm leading-relaxed ${
                                isMine
                                  ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl rounded-br-lg shadow-sm shadow-primary/10"
                                  : "bg-surface-container-lowest text-on-surface rounded-2xl rounded-bl-lg shadow-sm border border-outline-variant/5"
                              }`}
                            >
                              {showAvatar && !isMine && (
                                <span className="text-[11px] font-bold text-primary/70 block mb-0.5">{msg.sender.name}</span>
                              )}
                              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                              <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end" : ""}`}>
                                {msg.edited && (
                                  <span className={`text-[10px] italic ${isMine ? "text-white/40" : "text-on-surface-variant/40"}`}>
                                    изм.
                                  </span>
                                )}
                                <span className={`text-[10px] tabular-nums ${isMine ? "text-white/40" : "text-on-surface-variant/40"}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          )}

                          {isMine && !msg.deleted && editingId !== msg.id && (
                            <div className="absolute -left-9 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150">
                              <button
                                onClick={() => setMenuOpenId(menuOpenId === msg.id ? null : msg.id)}
                                className="p-1 hover:bg-surface-container rounded-lg text-outline/50 hover:text-outline transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">more_vert</span>
                              </button>
                              {menuOpenId === msg.id && (
                                <div className="absolute right-full top-0 mr-1 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 py-1.5 z-20 whitespace-nowrap min-w-[160px]">
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                                    onClick={() => startEdit(msg)}
                                  >
                                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">edit</span>
                                    Редактировать
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/5 flex items-center gap-2.5 transition-colors"
                                    onClick={() => deleteMessage(msg.id)}
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                                    Удалить
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-6 py-4 bg-surface-container-lowest/80 backdrop-blur-sm border-t border-outline-variant/8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  className="w-full pl-5 pr-4 py-3 bg-surface-container-low/60 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/15 focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/40"
                  placeholder="Напишите сообщение..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="p-3 bg-gradient-to-br from-primary to-primary/85 text-white rounded-2xl disabled:opacity-30 disabled:from-outline disabled:to-outline hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-sm px-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 rotate-6" />
              <div className="absolute inset-0 rounded-3xl bg-primary/8 -rotate-3" />
              <div className="relative w-full h-full rounded-3xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-primary/40" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
              </div>
            </div>
            <h3 className="text-xl font-black font-headline tracking-tight mb-2">Выберите диалог</h3>
            <p className="text-sm text-on-surface-variant/60 leading-relaxed">
              Выберите существующий чат слева или начните новый из профиля волонтёра или задачи
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
