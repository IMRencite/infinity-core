import Link from "next/link";
import type { ExecutiveQueueSort } from "@/lib/infinity/hq/queries";
import type { HqExecutiveQueueItem } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { EmptyState, HqSection } from "./empty-state";

const SORT_OPTIONS: { id: ExecutiveQueueSort; label: string }[] = [
  { id: "priority", label: "Priority" },
  { id: "oldest", label: "Oldest" },
  { id: "newest", label: "Newest" },
  { id: "blocked", label: "Blocked" },
  { id: "planning_eligible", label: "Planning eligible" },
];

export function ExecutiveQueuePanel({
  items,
  activeSort,
}: {
  items: HqExecutiveQueueItem[];
  activeSort: ExecutiveQueueSort;
}) {
  return (
    <HqSection
      id="executive-queue"
      title="Executive Queue"
      subtitle="Enterprise queue and executive decisions — read-only."
    >
      <div className="flex flex-wrap gap-2 border-b border-zinc-800/60 px-4 py-2">
        {SORT_OPTIONS.map((opt) => (
          <Link
            key={opt.id}
            href={`/dashboard?queueSort=${opt.id}#executive-queue`}
            className={`rounded-md px-2 py-1 text-[11px] ${
              activeSort === opt.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </Link>
        ))}
        <Link href={HQ_ROUTES.executive} className="ml-auto text-[11px] text-sky-400 hover:underline">
          Full executive view
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-100">{item.opportunityName}</span>
                <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] uppercase text-zinc-300">
                  {item.decision}
                </span>
              </div>
              <p className="mt-1 text-zinc-500">
                Priority {item.priority ?? "—"} · Queue {item.queueStatus} · Validation{" "}
                {item.validationStatus ?? "—"} · Planning{" "}
                {item.planningEligible === null ? "—" : item.planningEligible ? "yes" : "no"}
              </p>
              {item.reasoningRecommendation ? (
                <p className="mt-1 text-zinc-400">Reasoning: {item.reasoningRecommendation}</p>
              ) : null}
              {item.rationale ? (
                <p className="mt-1 line-clamp-2 text-zinc-500">{item.rationale}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-zinc-600">{formatIsoTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </HqSection>
  );
}
