"use client";

import { useEffect, useState } from "react";
import type { VentureImprovementHqView } from "@/lib/infinity/product-improvement-loop/hq";

const BUCKETS: Array<{ key: keyof VentureImprovementHqView["buckets"]; label: string }> = [
  { key: "new_suggestions", label: "New Suggestions" },
  { key: "repeated_requests", label: "Repeated Requests" },
  { key: "under_evaluation", label: "Under Evaluation" },
  { key: "approved_for_build", label: "Approved for Build" },
  { key: "building", label: "Building" },
  { key: "qc", label: "QC" },
  { key: "deployed", label: "Deployed" },
  { key: "measuring", label: "Measuring" },
  { key: "validated_improvements", label: "Validated Improvements" },
];

export function CanonicalVentureImprovement({ ventureId }: { ventureId: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [view, setView] = useState<VentureImprovementHqView | null>(null);

  async function refresh() {
    const res = await fetch(`/api/hq/ventures/${encodeURIComponent(ventureId)}/improvement`);
    const json = await res.json() as { ok?: boolean; view?: VentureImprovementHqView };
    if (json.ok && json.view) setView(json.view);
  }

  useEffect(() => {
    void refresh();
  }, [ventureId]);

  async function submit(kind: "suggest" | "review") {
    const res = await fetch(`/api/hq/ventures/${encodeURIComponent(ventureId)}/improvement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        text: kind === "review" ? "Ask Infinity to Review This Venture" : text,
      }),
    });
    const json = await res.json() as { ok?: boolean; reason?: string };
    setStatus(json.ok ? (kind === "review" ? "Review requested." : "Suggestion recorded.") : (json.reason ?? "UNAVAILABLE"));
    if (json.ok && kind === "suggest") setText("");
    if (json.ok) void refresh();
  }

  return (
    <section data-hq-region="improvement" data-hq-venture-improvement="true" className="rounded-lg border border-white/10 p-4">
      <h2 className="text-sm font-semibold text-white">Improvement</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Customer and founder suggestions share one governed loop. Real feedback: {view?.real_feedback_count ?? 0}.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" data-hq-improvement-buckets="true">
        {BUCKETS.map((bucket) => (
          <div key={bucket.key} data-hq-improvement-bucket={bucket.key}>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{bucket.label}</p>
            <p className="mt-1 text-sm text-zinc-200">{view?.buckets[bucket.key].length ?? 0}</p>
            <ul className="mt-1 space-y-1 text-xs text-zinc-400">
              {(view?.buckets[bucket.key] ?? []).slice(0, 3).map((item) => (
                <li key={item.improvement_id}>
                  {item.requested_capability || item.workflow} · {item.source_channels.join(", ") || "UNKNOWN"} · {item.unique_requesters} unique · cost {item.estimated_cost}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("suggest");
        }}
      >
        <label className="block text-xs text-zinc-400" htmlFor="hq-suggest-improvement">Suggest Improvement</label>
        <textarea
          id="hq-suggest-improvement"
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button className="rounded bg-sky-600 px-3 py-2 text-sm text-white" type="submit">Suggest Improvement</button>
      </form>
      <button
        className="mt-3 rounded border border-white/20 px-3 py-2 text-sm text-zinc-100"
        type="button"
        onClick={() => void submit("review")}
      >
        Ask Infinity to Review This Venture
      </button>
      {status ? <p className="mt-2 text-xs text-zinc-400">{status}</p> : null}
    </section>
  );
}
