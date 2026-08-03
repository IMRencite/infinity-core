import Link from "next/link";
import type { HqActivityItem } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { EmptyState, HqSection } from "./empty-state";

export function ActivityFeed({
  items,
  activeSeverity,
}: {
  items: HqActivityItem[];
  activeSeverity?: string | null;
}) {
  const severities = ["critical", "warning", "info"];
  return (
    <HqSection
      id="recent-activity"
      title="Recent Activity"
      subtitle="Canonical engine events (capped). Filter via URL severity."
    >
      <div className="flex flex-wrap gap-2 border-b border-zinc-800/60 px-4 py-2">
        <Link
          href="/dashboard#recent-activity"
          className={`rounded-md px-2 py-1 text-[11px] ${
            !activeSeverity ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
          }`}
        >
          All
        </Link>
        {severities.map((s) => (
          <Link
            key={s}
            href={`/dashboard?eventSeverity=${s}#recent-activity`}
            className={`rounded-md px-2 py-1 text-[11px] ${
              activeSeverity === s ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
            }`}
          >
            {s}
          </Link>
        ))}
        <Link
          href={HQ_ROUTES.intelligence}
          className="ml-auto text-[11px] text-sky-400 hover:underline"
        >
          Intelligence
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="max-h-[420px] divide-y divide-zinc-800/60 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-2.5 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-zinc-600">
                  {formatIsoTime(item.occurredAt)}
                </span>
                <span className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                  {item.severity}
                </span>
              </div>
              <p className="mt-1 text-zinc-200">
                <span className="text-zinc-500">{item.eventType}</span> — {item.message}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                {item.missionId ? `mission ${item.missionId.slice(0, 8)}` : ""}
                {item.opportunityId ? ` · opp ${item.opportunityId.slice(0, 8)}` : ""}
                {item.engineJobId ? ` · job ${item.engineJobId.slice(0, 8)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </HqSection>
  );
}
