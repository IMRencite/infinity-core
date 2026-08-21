"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { HqCopilotSource } from "@/lib/infinity/hq-copilot/types";
import { HQ_VOICE_MAX_BYTES, HQ_VOICE_MAX_DURATION_MS } from "@/lib/infinity/hq-copilot/voice/constants";
import {
  errorVoiceState,
  formatVoiceElapsed,
  idleVoiceState,
  mapBrowserGetUserMediaError,
  previewVoiceState,
  recordingVoiceState,
  requestingVoiceState,
  transcribingVoiceState,
  voiceElapsedMs,
  HQ_VOICE_USER_MESSAGES,
} from "@/lib/infinity/hq-copilot/voice/recorder-state";
import type { HqVoiceCaptureState } from "@/lib/infinity/hq-copilot/voice/types";
import {
  isBrowserSpeechSynthesisAvailable,
  shouldSpeakHqCopilotAnswer,
  spokenAnswerText,
} from "@/lib/infinity/hq-copilot/voice/speech-output";

type CopilotClientResponse = {
  answer: string;
  intent: string;
  sources: Array<Pick<HqCopilotSource, "type" | "label" | "href">>;
  groundingStatus: string;
  navigation?: { type: "NAVIGATE"; href: string; label: string } | null;
  blockedAction?: string | null;
  error?: string;
};

type Props = {
  currentRoute: string;
  currentVentureId?: string | null;
  currentRoom?: DepartmentId | null;
  selectedArtifactId?: string | null;
};

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function HqCopilotDock({
  currentRoute,
  currentVentureId = null,
  currentRoom = null,
  selectedArtifactId = null,
}: Props) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotClientResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [voice, setVoice] = useState<HqVoiceCaptureState>(idleVoiceState());
  const [elapsedLabel, setElapsedLabel] = useState("0:00");
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const conversationId = useMemo(() => `hq-copilot-${Date.now()}`, []);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  useEffect(() => {
    if (voice.status !== "recording") return;
    const tick = window.setInterval(() => {
      setElapsedLabel(formatVoiceElapsed(voiceElapsedMs(voice, Date.now())));
    }, 250);
    return () => window.clearInterval(tick);
  }, [voice]);

  useEffect(() => {
    return () => {
      releaseMicrophone();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, []);

  async function uploadRecording(blob: Blob, durationMs: number) {
    setVoice(transcribingVoiceState());
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "hq-copilot-voice.webm");
      form.append("durationMs", String(durationMs));
      form.append("mimeType", blob.type || "audio/webm");
      const res = await fetch("/api/hq-copilot/transcribe", { method: "POST", body: form });
      const payload = (await res.json()) as { transcript?: string; error?: string; code?: string };
      if (!res.ok) {
        const code = payload.code === "unauthorized" ? "unauthorized" : payload.code === "too_large" ? "too_large" : payload.code === "too_long" ? "too_long" : payload.code === "empty" ? "empty" : payload.code === "unsupported_type" ? "unsupported_type" : "unavailable";
        setVoice(errorVoiceState(code, payload.error));
        setError(payload.error ?? HQ_VOICE_USER_MESSAGES[code]);
        return;
      }
      const transcript = (payload.transcript ?? "").trim();
      if (!transcript) {
        setVoice(errorVoiceState("empty"));
        setError(HQ_VOICE_USER_MESSAGES.empty);
        return;
      }
      setQuestion(transcript);
      setVoice(previewVoiceState(transcript));
    } catch {
      setVoice(errorVoiceState("network"));
      setError(HQ_VOICE_USER_MESSAGES.network);
    }
  }

  function finishRecorder() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      releaseMicrophone();
      return;
    }
    recorder.stop();
  }

  async function startRecording() {
    if (loading || voice.status === "recording" || voice.status === "transcribing") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoice(errorVoiceState("unsupported"));
      setError(HQ_VOICE_USER_MESSAGES.unsupported);
      return;
    }
    setVoice(requestingVoiceState());
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMime();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        releaseMicrophone();
        setVoice(errorVoiceState("malformed"));
        setError(HQ_VOICE_USER_MESSAGES.malformed);
      };
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAt;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        releaseMicrophone();
        if (blob.size > HQ_VOICE_MAX_BYTES) {
          setVoice(errorVoiceState("too_large"));
          setError(HQ_VOICE_USER_MESSAGES.too_large);
          return;
        }
        if (blob.size < 256) {
          setVoice(errorVoiceState("empty"));
          setError(HQ_VOICE_USER_MESSAGES.empty);
          return;
        }
        void uploadRecording(blob, durationMs);
      };
      recorder.start(250);
      setVoice(recordingVoiceState(startedAt));
      setElapsedLabel("0:00");
      stopTimerRef.current = window.setTimeout(() => finishRecorder(), HQ_VOICE_MAX_DURATION_MS);
    } catch (caught) {
      releaseMicrophone();
      const code = mapBrowserGetUserMediaError(caught);
      setVoice(errorVoiceState(code));
      setError(HQ_VOICE_USER_MESSAGES[code]);
    }
  }

  function speakAnswer(answer: string) {
    const available = isBrowserSpeechSynthesisAvailable();
    if (
      !shouldSpeakHqCopilotAnswer({
        userEnabled: true,
        autoPlay: false,
        synthesisAvailable: available,
        answer,
      })
    ) {
      setSpeakEnabled(true);
      return;
    }
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(spokenAnswerText(answer));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeakEnabled(true);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading || voice.status === "recording" || voice.status === "transcribing") return;
    stopSpeaking();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hq-copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          currentRoute,
          currentVentureId,
          currentRoom,
          selectedArtifactId,
          conversationId,
          conversation: result ? [{ role: "assistant", text: result.answer }, { role: "user", text: trimmed }] : [],
        }),
      });
      const payload = (await res.json()) as CopilotClientResponse;
      if (!res.ok) {
        setError(payload.error ?? "HQ Copilot is unavailable.");
        setResult(null);
        return;
      }
      setResult(payload);
      setOpen(true);
      setVoice(idleVoiceState());
      if (payload.navigation?.href) {
        router.push(payload.navigation.href);
      }
    } catch {
      setError("HQ Copilot is unavailable.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const recording = voice.status === "recording";
  const transcribing = voice.status === "transcribing";
  const voiceBusy = recording || transcribing;

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-2xl overflow-x-hidden px-1">
      <form onSubmit={submit} className="flex min-w-0 items-center gap-1.5 rounded-full border border-cyan-500/20 bg-zinc-950/80 px-2 py-1 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
        <label className="sr-only" htmlFor="hq-copilot-input">
          Ask Infinity
        </label>
        <input
          id="hq-copilot-input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={transcribing ? "Transcribing..." : recording ? "Listening..." : "Ask Infinity anything..."}
          autoComplete="off"
          disabled={voiceBusy}
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-70"
        />
        {recording ? (
          <span className="shrink-0 font-mono text-[10px] text-cyan-200" aria-live="polite">
            {elapsedLabel}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => (recording ? finishRecorder() : void startRecording())}
          disabled={loading || transcribing}
          aria-pressed={recording}
          aria-label={recording ? "Stop recording" : transcribing ? "Transcribing" : "Start voice recording"}
          title={recording ? "Stop recording" : "Record a question"}
          className={`rounded-full p-1.5 ${recording ? "bg-cyan-500/20 text-cyan-100" : "text-zinc-400 hover:text-cyan-100"} disabled:opacity-40`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            {recording ? (
              <rect x="5" y="5" width="10" height="10" rx="1.5" />
            ) : (
              <path d="M10 2a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 1 0 5 0v-5A2.5 2.5 0 0 0 10 2Zm-5 7a.75.75 0 0 1 .75.75 4.25 4.25 0 1 0 8.5 0 .75.75 0 0 1 1.5 0 5.75 5.75 0 0 1-5 5.698V17h2.25a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5H9.25v-1.552A5.75 5.75 0 0 1 4.25 9.75.75.75 0 0 1 5 9Z" />
            )}
          </svg>
        </button>
        <button
          type="submit"
          disabled={loading || voiceBusy || !question.trim()}
          className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-40"
        >
          {loading ? "Reading" : transcribing ? "Wait" : "Ask"}
        </button>
      </form>

      {voice.status === "preview" ? (
        <p className="mt-2 truncate px-2 text-[10px] uppercase tracking-[0.14em] text-cyan-300/80">
          Transcript ready · edit if needed, then Ask
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {result && open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-[min(24rem,70vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-800/80 bg-[#07070b]/95 p-3 text-left shadow-2xl">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
            {result.blockedAction ? (
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-300">Blocked · {result.blockedAction}</p>
            ) : result.navigation ? (
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">Navigate · {result.navigation.label}</p>
            ) : (
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{result.groundingStatus}</p>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => speakAnswer(result.answer)}
                className="rounded-full border border-zinc-700/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
              >
                {speakEnabled && speaking ? "Replay" : "Speak"}
              </button>
              <button
                type="button"
                onClick={stopSpeaking}
                disabled={!speaking}
                className="rounded-full border border-zinc-700/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300 disabled:opacity-40"
              >
                Stop
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed break-words text-zinc-100">{result.answer}</p>
          {result.sources.length ? (
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
              {result.sources.map((source) =>
                source.href ? (
                  <a
                    key={`${source.type}-${source.label}`}
                    href={source.href}
                    className="max-w-full truncate rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-100"
                  >
                    {source.label}
                  </a>
                ) : (
                  <span
                    key={`${source.type}-${source.label}`}
                    className="max-w-full truncate rounded-full border border-zinc-700/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400"
                  >
                    {source.label}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
