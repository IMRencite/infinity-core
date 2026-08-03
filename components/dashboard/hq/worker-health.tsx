import Link from "next/link";
import type { HqWorkerHealth } from "@/lib/infinity/hq/types";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { HqSection } from "./empty-state";

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border border-zinc-800/70 bg-[#0a0a0a] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {value === null ? "No data yet" : value}
      </p>
    </div>
  );
}

export function WorkerHealthPanel({ worker }: { worker: HqWorkerHealth }) {
  return (
    <HqSection
      id="worker-runtime-health"
      title="Worker and Runtime Health"
      subtitle="Engine job and worker run counts from durable records."
    >
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <Stat label="Queued" value={worker.queuedJobs} />
        <Stat label="Running" value={worker.runningJobs} />
        <Stat label="Completed" value={worker.completedJobs} />
        <Stat label="Failed" value={worker.failedJobs} />
        <Stat label="Retrying" value={worker.retryingJobs} />
        <Stat label="Dead letter" value={worker.deadLetterJobs} />
        <Stat label="Active worker runs" value={worker.activeWorkerRuns} />
        <Stat label="Avg duration (ms)" value={worker.averageRecentDurationMs} />
        <Stat label="Idle capabilities" value={worker.idleRegisteredCapabilities} />
        <Stat label="Unavailable caps" value={worker.unavailableCapabilities} />
      </div>
      {worker.latestWorkerFailure ? (
        <p className="border-t border-zinc-800/60 px-4 py-3 text-[12px] text-amber-200/90">
          Latest failure: {worker.latestWorkerFailure}
        </p>
      ) : null}
      <p className="border-t border-zinc-800/60 px-4 py-2 text-[11px] text-zinc-600">
        Development controls remain on{" "}
        <Link href={HQ_ROUTES.runtime} className="text-sky-400 hover:underline">
          Mission Runtime
        </Link>
        .
      </p>
    </HqSection>
  );
}
