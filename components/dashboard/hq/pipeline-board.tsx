import Link from "next/link";
import type { HqPipelineStage } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { EmptyState, HqSection } from "./empty-state";

export function PipelineBoard({ stages }: { stages: HqPipelineStage[] }) {
  const hasAny = stages.some((s) => s.count !== null && s.count > 0);
  return (
    <HqSection
      id="opportunity-pipeline"
      title="Opportunity Pipeline"
      subtitle="Display-only bucket counts from existing records. Pipeline engines are unchanged."
    >
      {!hasAny && stages.every((s) => s.count === null) ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto p-3">
          <div className="flex min-w-[720px] gap-2">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex flex-1 items-stretch gap-2">
                <Link
                  href={stage.href}
                  className="flex flex-1 flex-col rounded-lg border border-zinc-800/80 bg-[#0a0a0a] px-3 py-3 hover:border-zinc-600"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {stage.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {stage.count === null ? "—" : stage.count}
                  </p>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Oldest: {stage.oldestItemAge ?? "—"}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Latest: {formatIsoTime(stage.latestItemAt)}
                  </p>
                </Link>
                {index < stages.length - 1 ? (
                  <span className="self-center text-zinc-600" aria-hidden>
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </HqSection>
  );
}
