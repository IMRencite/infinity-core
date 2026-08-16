"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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

function profitPrimary(summary: PortfolioSummary): { label: string; value: string; hint: string | null } {
  if (summary.profitDisplayMode === "unavailable" || summary.totalProfitUsd == null) {
    return {
      label: "Profit generated",
      value: "Not available yet",
      hint:
        summary.totalRevenueUsd != null || summary.knownCostsUsd != null
          ? `Revenue ${formatUsd(summary.totalRevenueUsd)} · Known costs ${formatUsd(summary.knownCostsUsd)}`
          : null,
    };
  }
  if (summary.profitDisplayMode === "known_net_contribution") {
    return {
      label: "Known net contribution",
      value: formatUsd(summary.totalProfitUsd),
      hint: "Partial financial coverage",
    };
  }
  return {
    label: "Total profit generated",
    value: formatUsd(summary.totalProfitUsd),
    hint: summary.profitDataQuality === "PARTIAL" ? "Partial financial coverage" : null,
  };
}

export function PortfolioExecutiveStrip({ summary }: Props) {
  const profit = profitPrimary(summary);
  const top = summary.topVenture;

  return (
    <section
      aria-label="Portfolio performance summary"
      className="relative overflow-hidden border border-zinc-700/35 bg-gradient-to-r from-zinc-950/80 via-[#070709] to-zinc-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.04),transparent)]" aria-hidden />
      <div className="relative grid grid-cols-2 gap-px bg-zinc-800/40 md:grid-cols-4">
        <MetricCell label={profit.label} value={profit.value} hint={profit.hint} accent="sky" />
        <MetricCell
          label="Companies built"
          value={String(summary.totalVenturesBuilt)}
          hint={summary.activeVentures > 0 ? `${summary.activeVentures} currently active` : null}
        />
        <MetricCell label="Active ventures" value={String(summary.activeVentures)} hint="Running" />
        <MetricCell
          label="Top venture"
          value={
            top ? (
              <Link href={`/dashboard/ventures/${top.ventureAssemblyId}`} className="hover:text-sky-200">
                {top.ventureName}
              </Link>
            ) : (
              "Not enough financial data"
            )
          }
          hint={
            top && top.value != null
              ? `${top.value >= 0 ? "+" : ""}${formatUsd(top.value)} ${top.displayLabel}`
              : null
          }
          accent="violet"
        />
      </div>
    </section>
  );
}

function MetricCell({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string | null;
  accent?: "sky" | "violet";
}) {
  return (
    <div className="bg-[#060608] px-4 py-3">
      <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums tracking-tight md:text-xl ${
          accent === "sky" ? "text-sky-100" : accent === "violet" ? "text-violet-100" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[9px] text-zinc-600">{hint}</p> : null}
    </div>
  );
}
