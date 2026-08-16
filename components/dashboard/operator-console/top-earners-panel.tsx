"use client";

import Link from "next/link";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";

type Props = {
  summary: PortfolioSummary;
};

function formatUsd(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopEarnersPanel({ summary }: Props) {
  const metricLabel =
    summary.rankingMetric === "profit"
      ? "By realized profit"
      : summary.rankingMetric === "revenue"
        ? "By realized revenue"
        : null;

  if (summary.topEarners.length < 2) {
    return (
      <section className="rounded-xl border border-zinc-800/50 bg-zinc-950/30 px-5 py-8 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Top Earners</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          Financial performance will appear here as ventures begin generating measurable results.
        </p>
      </section>
    );
  }

  const maxValue = Math.max(...summary.topEarners.map((v) => v.rankingValue ?? 0), 1);

  return (
    <section aria-label="Top earners ranking" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Top Earners</h2>
          {metricLabel ? <p className="mt-1 text-[10px] text-zinc-500">{metricLabel}</p> : null}
        </div>
        <p className="text-[10px] text-zinc-600">{summary.qualifyingVentureCount} qualifying ventures</p>
      </div>

      <div className="space-y-2.5">
        {summary.topEarners.map((venture, index) => {
          const value = venture.rankingValue ?? 0;
          const width = Math.max(8, (value / maxValue) * 100);
          return (
            <Link
              key={venture.ventureAssemblyId}
              href={`/dashboard/ventures/${venture.ventureAssemblyId}`}
              className="group block rounded-lg border border-zinc-800/40 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-sky-500/30 hover:bg-zinc-900/50"
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium text-zinc-200 group-hover:text-sky-100">
                  {index + 1}. {venture.ventureName}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-400">
                  {formatUsd(venture.rankingValue)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600/70 to-sky-400/80 transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="mt-1.5 flex gap-3 text-[9px] text-zinc-600">
                {venture.revenueUsd != null ? <span>Revenue {formatUsd(venture.revenueUsd)}</span> : null}
                {venture.knownCostsUsd != null ? <span>Costs {formatUsd(venture.knownCostsUsd)}</span> : null}
                <span>{venture.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
