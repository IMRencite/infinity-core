import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { sanitizeArtifactMetadata } from "@/lib/infinity/operator-console/artifacts/metadata-sanitize";
import type { DepartmentUiState } from "@/lib/infinity/operator-console/types";
import { OPPORTUNITIES_ROUTE, OPPORTUNITY_TOP_N, type CanonicalOpportunityRecord } from "./types";

function scoreLabel(value: number | "UNKNOWN"): string {
  return value === "UNKNOWN" ? "UNKNOWN" : value.toFixed(1);
}

export function buildLiveVentureRadarArtifacts(input: {
  organizationId: string;
  createdAt: string | null;
  discoveryState: DepartmentUiState;
  universeCount: number;
  liveTop10: CanonicalOpportunityRecord[];
}): HqWorkArtifact[] {
  const topCount = input.liveTop10.length;
  const universe: HqWorkArtifact = {
    id: `opp-universe:${input.organizationId}`,
    roomId: "opportunity_lab",
    artifactType: "opportunity_candidate",
    title: `${input.universeCount} canonical opportunities`,
    subtitle: `${topCount} currently top-ranked · View all →`,
    state: "READY",
    createdAt: input.createdAt,
    sourceRecordType: "opportunity_universe",
    sourceRecordId: input.organizationId,
    metadata: sanitizeArtifactMetadata({
      score: input.universeCount,
      href: OPPORTUNITIES_ROUTE,
      universe: true,
      topCount,
      viewAll: "View all →",
    }),
  };

  const cards = input.liveTop10.map((row) => {
    const opp = scoreLabel(row.opportunityScore);
    const mon = scoreLabel(row.monetizationScore);
    const movement = row.movement?.label ?? "";
    return {
      id: `opp:${row.candidateId}`,
      roomId: "opportunity_lab" as const,
      artifactType: "opportunity_candidate" as const,
      title: row.name,
      subtitle: `#${row.liveRank} · Opp ${opp} · Mon ${mon} · ${row.lifecycle}${row.selectedVenture ? " · VENTURE" : ""}${movement ? ` · ${movement}` : ""}`,
      state: row.selectedVenture ? "SELECTED" as const : input.discoveryState === "RUNNING" ? "CREATING" as const : "READY" as const,
      createdAt: row.createdAt,
      sourceRecordType: "opportunity_candidate",
      sourceRecordId: row.candidateId,
      metadata: sanitizeArtifactMetadata({
        score: typeof row.opportunityScore === "number" ? row.opportunityScore : "UNKNOWN",
        monetizationScore: typeof row.monetizationScore === "number" ? row.monetizationScore : "UNKNOWN",
        rank: row.liveRank,
        candidateId: row.candidateId,
        status: row.lifecycle,
        lifecycle: row.lifecycle,
        selectionState: row.selectionState,
        decision: row.currentDecision,
        movement: movement || null,
        selected: row.selectedVenture,
        shortlisted: row.lifecycle === "SHORTLISTED" || row.shortlistIds.length > 0,
        href: row.detailRoute,
      }),
    } satisfies HqWorkArtifact;
  });

  return [universe, ...cards];
}

export function liveTop10Label(count = OPPORTUNITY_TOP_N): string {
  return `CURRENT TOP ${count} OPPORTUNITIES`;
}
