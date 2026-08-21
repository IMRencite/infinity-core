"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { HqCopilotSource } from "@/lib/infinity/hq-copilot/types";

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
  const conversationId = useMemo(() => `hq-copilot-${Date.now()}`, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
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
          placeholder="Ask Infinity anything..."
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          type="button"
          disabled
          title="Voice is not available yet"
          aria-label="Voice coming later"
          className="rounded-full p-1.5 text-zinc-700"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M10 2a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 1 0 5 0v-5A2.5 2.5 0 0 0 10 2Zm-5 7a.75.75 0 0 1 .75.75 4.25 4.25 0 1 0 8.5 0 .75.75 0 0 1 1.5 0 5.75 5.75 0 0 1-5 5.698V17h2.25a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5H9.25v-1.552A5.75 5.75 0 0 1 4.25 9.75.75.75 0 0 1 5 9Z" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-40"
        >
          {loading ? "Reading" : "Ask"}
        </button>
      </form>

      {error ? (
        <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {result && open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-[min(24rem,70vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-800/80 bg-[#07070b]/95 p-3 text-left shadow-2xl">
          {result.blockedAction ? (
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-amber-300">Blocked · {result.blockedAction}</p>
          ) : result.navigation ? (
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-cyan-300">Navigate · {result.navigation.label}</p>
          ) : (
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">{result.groundingStatus}</p>
          )}
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
