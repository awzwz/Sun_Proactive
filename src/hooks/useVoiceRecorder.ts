"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceState = "idle" | "recording" | "transcribing";

interface UseVoiceRecorderOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}

export function useVoiceRecorder({
  onTranscript,
  onError,
}: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setDuration(0);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setState("transcribing");
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        const res = await fetch("/api/ai/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Transcription failed");
        }

        const data = await res.json();
        if (data.text) {
          onTranscript(data.text);
        }
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : "Ошибка распознавания речи"
        );
      } finally {
        setState("idle");
      }
    },
    [onTranscript, onError]
  );

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          transcribe(blob);
        } else {
          setState("idle");
        }
      };

      recorder.start(250);
      setState("recording");

      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      onError?.("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
      cleanup();
      setState("idle");
    }
  }, [state, transcribe, onError, cleanup]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.MediaRecorder;

  return {
    state,
    duration,
    isSupported,
    startRecording,
    stopRecording,
  };
}
