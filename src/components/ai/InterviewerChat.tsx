"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function InterviewerChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyToFinalize, setReadyToFinalize] = useState(false);
  const [taskData, setTaskData] = useState<Record<string, unknown> | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  }, []);

  const handleVoiceError = useCallback((msg: string) => {
    toast.error(msg);
  }, []);

  const voice = useVoiceRecorder({
    onTranscript: handleTranscript,
    onError: handleVoiceError,
  });

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      sendMessage("Привет! Мне нужно создать задачу для волонтёров.", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMerged = (): Record<string, unknown> => {
    return { ...(previewData || {}), ...editedFields };
  };

  const updateField = (key: string, value: unknown) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  };

  const fetchPreview = async (msgs: Message[]) => {
    if (msgs.length < 4) return;
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/ai/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, preview: true }),
      });
      const data = await res.json();
      if (data.taskData) {
        setPreviewData(data.taskData);
      }
    } catch {
      // preview is non-critical
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendMessage = async (text: string, isInit = false) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = isInit ? [userMessage] : [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (data.message) {
        const content = data.message.content?.replace("READY_TO_FINALIZE", "").trim();
        const updatedMessages: Message[] = [...newMessages, { role: "assistant", content }];
        setMessages(updatedMessages);
        if (data.readyToFinalize) {
          setReadyToFinalize(true);
        }
        fetchPreview(updatedMessages);
      }
    } catch {
      toast.error("Ошибка при отправке сообщения");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const merged = getMerged();
      const res = await fetch("/api/ai/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, finalize: true, taskData: merged }),
      });

      const data = await res.json();

      if (data.validationErrors) {
        toast.error(`Валидация: ${data.validationErrors.join(", ")}`);
        setFinalizing(false);
        return;
      }

      if (data.task) {
        setTaskData(data.taskData);
        toast.success("Задача создана!");
        setTimeout(() => {
          router.push(`/curator/tasks/${data.task.id}`);
        }, 2000);
      }
    } catch {
      toast.error("Ошибка при финализации");
    } finally {
      setFinalizing(false);
    }
  };

  // Calculate progress based on conversation length
  const progress = Math.min(95, messages.length * 12);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Chat Interface */}
      <section className="flex-1 flex flex-col bg-surface border-r border-outline-variant/20 h-full">
        {/* Chat Header & Progress */}
        <div className="p-6 border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  psychology
                </span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface tracking-tight font-headline">ИИ-Интервьюер</h2>
                <p className="text-xs text-on-surface-variant/70">Помогу структурировать вашу задачу</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-primary mb-1 block">Заполнение: {progress}%</span>
              <div className="w-32 h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Message History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <div key={i} className="flex gap-4 max-w-2xl">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex-shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
                </div>
                <div className="bg-surface-container-low p-5 rounded-2xl rounded-tl-none shadow-sm">
                  <p className="text-on-surface leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-4 max-w-2xl ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">person</span>
                </div>
                <div className="bg-primary text-white p-5 rounded-2xl rounded-tr-none shadow-sm">
                  <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex gap-4 max-w-2xl">
              <div className="w-8 h-8 rounded-full bg-secondary-fixed flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
              </div>
              <div className="bg-surface-container-low p-5 rounded-2xl rounded-tl-none shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {taskData && (
            <div className="glass-panel border border-primary/20 p-6 rounded-2xl max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <h4 className="font-bold font-headline text-primary">Задача создана!</h4>
              </div>
              <p className="text-sm text-on-surface-variant">Перенаправляем на страницу задачи...</p>
            </div>
          )}
        </div>

        {/* Chat Input */}
        {!taskData && (
          <div className="p-6 bg-surface-container-lowest">
            {/* Recording indicator bar */}
            {voice.state === "recording" && (
              <div className="max-w-4xl mx-auto mb-3 flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 rounded-2xl">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Запись... {formatDuration(voice.duration)}
                </span>
                <span className="text-xs text-red-400 dark:text-red-500 ml-auto">
                  Нажмите стоп для распознавания
                </span>
              </div>
            )}

            {voice.state === "transcribing" && (
              <div className="max-w-4xl mx-auto mb-3 flex items-center gap-3 px-4 py-2.5 bg-primary/5 rounded-2xl">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-primary">
                  Распознаю речь...
                </span>
              </div>
            )}

            <div className="relative max-w-4xl mx-auto">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-4 pr-28 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40 resize-none transition-all outline-none"
                placeholder={
                  voice.state === "transcribing"
                    ? "Распознаю речь..."
                    : "Опишите детали задачи или нажмите на микрофон..."
                }
                rows={2}
                disabled={loading || voice.state === "transcribing"}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Mic button */}
                {voice.isSupported && (
                  <button
                    onClick={
                      voice.state === "recording"
                        ? voice.stopRecording
                        : voice.startRecording
                    }
                    disabled={loading || voice.state === "transcribing"}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md disabled:opacity-50 ${
                      voice.state === "recording"
                        ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container hover:scale-105 active:scale-95"
                    }`}
                    title={
                      voice.state === "recording"
                        ? "Остановить запись"
                        : "Голосовой ввод"
                    }
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {voice.state === "recording" ? "stop" : "mic"}
                    </span>
                  </button>
                )}

                {/* Send button */}
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim() || voice.state !== "idle"}
                  className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-on-surface-variant/50 mt-3 font-medium">
              ИИ Sun Proactive помогает структурировать задачи для точного подбора
            </p>
          </div>
        )}
      </section>

      {/* Right: Editable Preview Panel */}
      <section className="hidden md:block w-[420px] bg-surface-container-high/30 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-extrabold text-on-surface tracking-tight font-headline">Предпросмотр задачи</h3>
          {previewLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant/40">edit_note</span>
          )}
        </div>
        {(() => {
          const d = getMerged();
          const inputClass = "w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";
          return (
            <div className="space-y-4">
              {/* Title */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 block">Название</label>
                <input
                  value={(d.title as string) || ""}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Название задачи..."
                  className={`${inputClass} font-semibold text-base`}
                />
              </div>

              {/* Description */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Описание</label>
                <textarea
                  value={(d.description as string) || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Описание задачи..."
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* Grid: location, city, quota, format */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Локация</label>
                  <input
                    value={(d.location as string) || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Место..."
                    className={inputClass}
                  />
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Город</label>
                  <input
                    value={(d.city as string) || ""}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Город..."
                    className={inputClass}
                  />
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Квота</label>
                  <input
                    type="number"
                    min={1}
                    value={(d.volunteerQuota as number) || ""}
                    onChange={(e) => updateField("volunteerQuota", parseInt(e.target.value) || 1)}
                    placeholder="Кол-во"
                    className={inputClass}
                  />
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Формат</label>
                  <select
                    value={(d.format as string) || "OFFLINE"}
                    onChange={(e) => updateField("format", e.target.value)}
                    className={inputClass}
                  >
                    <option value="OFFLINE">Офлайн</option>
                    <option value="ONLINE">Онлайн</option>
                    <option value="HYBRID">Гибрид</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Дата</label>
                <input
                  type="date"
                  value={d.date ? new Date(d.date as string).toISOString().slice(0, 10) : ""}
                  onChange={(e) => updateField("date", e.target.value ? new Date(e.target.value).toISOString() : "")}
                  className={inputClass}
                />
              </div>

              {/* Required Skills */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Hard skills (через запятую)</label>
                <input
                  value={Array.isArray(d.requiredSkills) ? (d.requiredSkills as string[]).join(", ") : ""}
                  onChange={(e) => updateField("requiredSkills", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="Навык 1, Навык 2"
                  className={inputClass}
                />
              </div>

              {/* Soft Skills */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Soft skills (через запятую)</label>
                <input
                  value={Array.isArray(d.softSkills) ? (d.softSkills as string[]).join(", ") : ""}
                  onChange={(e) => updateField("softSkills", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="Коммуникабельность, Ответственность"
                  className={inputClass}
                />
              </div>

              {/* Verification Criteria */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 block">Критерии верификации</label>
                <textarea
                  value={(d.verificationCriteria as string) || ""}
                  onChange={(e) => updateField("verificationCriteria", e.target.value)}
                  placeholder="Что должно быть видно на фото..."
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* Finalize CTA */}
              {readyToFinalize && !taskData && (
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full py-4 bg-primary text-white rounded-full font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{finalizing ? "Формирую задачу..." : "Создать задачу"}</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              )}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
