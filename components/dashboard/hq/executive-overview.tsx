import Link from "next/link";
import type { HqExecutiveOverview } from "@/lib/infinity/hq/types";
import { HqSection } from "./empty-state";

export function ExecutiveOverview({ overview }: { overview: HqExecutiveOverview }) {
  return (
    <HqSection
      id="executive-overview"
      title="Executive Overview"
      subtitle="Read-only metrics from durable records. Each tile links to the relevant dashboard."
    >
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {overview.metrics.map((metric) => {
          const inner = (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                {metric.label}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-white">{metric.value}</p>
              {metric.hint ? (
                <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{metric.hint}</p>
              ) : null}
            </>
          );
          if (metric.href) {
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-3 transition hover:border-zinc-600"
              >
                {inner}
              </Link>
            );
          }
          return (
            <div
              key={metric.label}
              className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-3"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </HqSection>
  );
}
