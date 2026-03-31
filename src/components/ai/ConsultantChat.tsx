"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConsultantChatProps {
  taskId: string;
  taskTitle: string;
}

const SUGGESTIONS = [
  "Подходит ли мне эта задача?",
  "Что нужно подготовить?",
  "Какие навыки нужны?",
];

export function ConsultantChat({ taskId, taskTitle }: ConsultantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendQuestion = async (override?: string) => {
    const question = (override || input).trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          question,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
            sessionId,
          })),
        }),
      });

      const data = await res.json();

      if (data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
        if (data.sessionId) setSessionId(data.sessionId);
      }
    } catch {
      toast.error("Ошибка при отправке вопроса");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface mb-1">Спросите что угодно о задаче</p>
              <p className="text-xs text-on-surface-variant max-w-[260px]">
                Я проанализирую описание &laquo;{taskTitle}&raquo; и помогу разобраться
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendQuestion(s)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                <span className="material-symbols-outlined text-primary text-base">smart_toy</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-surface-container-high text-on-surface rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1 mr-2">
              <span className="material-symbols-outlined text-primary text-base animate-pulse">smart_toy</span>
            </div>
            <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-surface-container p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuestion();
              }
            }}
            placeholder="Задайте вопрос по задаче..."
            disabled={loading}
            className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 border-0 placeholder:text-on-surface-variant/50"
          />
          <button
            onClick={() => sendQuestion()}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
