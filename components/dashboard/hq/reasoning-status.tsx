import Link from "next/link";
import type { HqReasoningStatus } from "@/lib/infinity/hq/types";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { HqSection } from "./empty-state";

export function ReasoningStatusPanel({ reasoning }: { reasoning: HqReasoningStatus }) {
  return (
    <HqSection
      id="ai-reasoning"
      title="AI Reasoning Status"
      subtitle="Advisory/shadow mode only. No chain-of-thought or secrets are shown."
    >
      <dl className="divide-y divide-zinc-800/60 text-[12px]">
        {[
          ["Mode", reasoning.mode],
          ["Provider", reasoning.provider],
          ["Model", reasoning.model],
          ["Latest session", reasoning.latestSessionId ?? "No data yet"],
          ["Session status", reasoning.sessionStatus ?? "No data yet"],
          ["Recommendation", reasoning.recommendation ?? "No data yet"],
          ["Confidence", reasoning.confidence ?? "No data yet"],
          ["Latency (ms)", reasoning.latencyMs ?? "No data yet"],
          [
            "Tokens in/out",
            `${reasoning.inputTokens ?? "—"} / ${reasoning.outputTokens ?? "—"}`,
          ],
          ["Est. cost", reasoning.estimatedCost ?? "No data yet"],
          ["Executive review", reasoning.executiveReviewStatus],
          ["Failure", reasoning.failureReason ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-2">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="max-w-[60%] text-right text-zinc-200">{String(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-zinc-800/60 px-4 py-2 text-[11px] text-zinc-600">
        <Link href={HQ_ROUTES.reasoning} className="text-sky-400 hover:underline">
          Reasoning dashboard
        </Link>
      </p>
    </HqSection>
  );
}
