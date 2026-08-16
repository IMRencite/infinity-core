"use client";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import { HqSection } from "@/components/dashboard/hq/empty-state";
import { CopyIdButton } from "./copy-id-button";

type Props = {
  snapshot: OperatorVentureSnapshot;
  portfolioSummary?: PortfolioSummary;
};

function IdRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-zinc-500">{label}</span>
      <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-300">{value.slice(0, 36)}{value.length > 36 ? "…" : ""}<CopyIdButton value={value} /></span>
    </div>
  );
}

export function SystemView({ snapshot, portfolioSummary }: Props) {
  const { venture, system, lineage, costs, closedLoopRoute } = snapshot;

  return (
    <div className="space-y-4">
      <HqSection title="Venture identifiers" subtitle="Copyable IDs for debugging">
        <div className="space-y-1 px-4 py-3 text-xs">
          <IdRow label="Venture assembly" value={venture.ventureAssemblyId} />
          <IdRow label="Mission" value={venture.missionId} />
          <IdRow label="Opportunity" value={venture.opportunityId} />
          <IdRow label="Company" value={venture.companyId} />
          <IdRow label="Blueprint" value={venture.ventureBlueprintId} />
          <IdRow label="Build" value={venture.buildId} />
          <IdRow label="Production artifact" value={venture.productionArtifactId} />
          <IdRow label="Next mission" value={closedLoopRoute.missionId} />
        </div>
      </HqSection>

      {portfolioSummary ? (
        <HqSection title="Portfolio aggregation" subtitle="Server-side read model trace">
          <div className="space-y-2 px-4 py-3 text-xs text-zinc-400">
            <p>Profit data quality: {portfolioSummary.profitDataQuality}</p>
            <p>Revenue data quality: {portfolioSummary.revenueDataQuality}</p>
            <p>Cost data quality: {portfolioSummary.costDataQuality}</p>
            <p>Included ventures: {portfolioSummary.includedVentureIds.length}</p>
            <p>Excluded ventures: {portfolioSummary.excludedVentureIds.length}</p>
            {portfolioSummary.excludedVentureIds.length ? (
              <pre className="max-h-32 overflow-auto text-[10px] text-zinc-600">
                {JSON.stringify(portfolioSummary.excludedVentureIds, null, 2)}
              </pre>
            ) : null}
            <pre className="max-h-48 overflow-auto text-[10px] text-zinc-600">
              {JSON.stringify(
                portfolioSummary.ventures.map((v) => ({
                  id: v.ventureAssemblyId,
                  excluded: v.excludedFromPortfolio,
                  reason: v.exclusionReason,
                  revenue: v.revenueUsd,
                  costs: v.knownCostsUsd,
                  profit: v.profitUsd,
                  trace: v.traceability,
                })),
                null,
                2,
              )}
            </pre>
          </div>
        </HqSection>
      ) : null}

      <HqSection title="Cost observability">
        <div className="px-4 py-3 text-xs text-zinc-300">
          <p>Known spend: ${costs.knownSpendUsd.toFixed(4)}</p>
          <p>Unpriced provider calls: {costs.unpricedProviderCalls}</p>
        </div>
      </HqSection>

      <HqSection title="Engine runs" subtitle="Latest persisted runs">
        <pre className="max-h-64 overflow-auto p-4 text-[10px] text-zinc-500">
          {JSON.stringify(system.engineRuns, null, 2)}
        </pre>
      </HqSection>

      <HqSection title="Artifacts">
        <pre className="max-h-64 overflow-auto p-4 text-[10px] text-zinc-500">
          {JSON.stringify(system.artifacts, null, 2)}
        </pre>
      </HqSection>

      <HqSection title="Performance & learning">
        <pre className="max-h-64 overflow-auto p-4 text-[10px] text-zinc-500">
          {JSON.stringify({ performance: system.performance, learning: system.learning }, null, 2)}
        </pre>
      </HqSection>

      <HqSection title="Lineage">
        <pre className="max-h-64 overflow-auto p-4 text-[10px] text-zinc-500">
          {JSON.stringify(lineage, null, 2)}
        </pre>
      </HqSection>
    </div>
  );
}
