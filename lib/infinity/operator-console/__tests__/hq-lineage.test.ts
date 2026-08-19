import { describe, expect, it } from "vitest";
import { colorKeyForLineageId, HQ_LINEAGE_PALETTE } from "@/lib/infinity/operator-console/artifacts/lineage-palette";
import {
  applyLineageFields,
  resolveArtifactLineage,
  resolveHandoffLineageColorKey,
} from "@/lib/infinity/operator-console/artifacts/resolve-artifact-lineage";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

const CANDIDATE_A = "ce09ed5b-c085-45a2-b9c4-473e37fbf0c1";
const CANDIDATE_B = "f1336945-3350-4d08-921e-4dcb5bc77b8e";

function artifact(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title">): HqWorkArtifact {
  return {
    roomId: "opportunity_lab",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "fixture",
    sourceRecordId: partial.id,
    metadata: {},
    ...partial,
  };
}

function context(selected: string | null = CANDIDATE_A) {
  return {
    candidateRankById: new Map([
      [CANDIDATE_A, 1],
      [CANDIDATE_B, 2],
    ]),
    candidateTitleById: new Map([
      [CANDIDATE_A, "PropTech SaaS"],
      [CANDIDATE_B, "Contractor CRM"],
    ]),
    selectedCandidateId: selected,
  };
}

describe("HQ candidate lineage", () => {
  it("assigns the same colorKey for the same candidate ID deterministically", () => {
    const first = colorKeyForLineageId(CANDIDATE_A);
    const second = colorKeyForLineageId(CANDIDATE_A);
    expect(first).toBe(second);
  });

  it("retains lineage from candidate to monetization to selection to validation", () => {
    const candidate = artifact({
      id: `opp:${CANDIDATE_A}`,
      artifactType: "opportunity_candidate",
      title: "PropTech SaaS",
      sourceRecordId: CANDIDATE_A,
      metadata: { rank: 1, candidateId: CANDIDATE_A },
    });
    const monetization = artifact({
      id: "mon:1",
      roomId: "strategy_finance",
      artifactType: "monetization_plan",
      title: "SaaS",
      metadata: { candidateId: CANDIDATE_A },
    });
    const blueprint = artifact({
      id: "sel:1",
      roomId: "company_operations",
      artifactType: "selection_blueprint",
      title: "PropTech SaaS",
      metadata: { candidateId: CANDIDATE_A, decision: "VALIDATE" },
    });
    const assumption = artifact({
      id: "assume:1",
      roomId: "quality_control",
      artifactType: "assumption",
      title: "CAC near $518",
      metadata: { candidateId: CANDIDATE_A, selected: true },
    });

    const ctx = context();
    const color = resolveArtifactLineage(candidate, ctx).colorKey;
    expect(resolveArtifactLineage(monetization, ctx).colorKey).toBe(color);
    expect(resolveArtifactLineage(blueprint, ctx).colorKey).toBe(color);
    expect(resolveArtifactLineage(assumption, ctx).colorKey).toBe(color);
  });

  it("keeps general discovery research neutral", () => {
    const research = artifact({
      id: "research:1",
      roomId: "research_department",
      artifactType: "research_packet",
      title: "Discovery evidence packet",
    });
    const resolved = resolveArtifactLineage(research, context());
    expect(resolved.lineageId).toBeNull();
    expect(resolved.colorKey).toBeNull();
  });

  it("does not infer lineage from similar titles alone", () => {
    const guess = artifact({
      id: "mon:guess",
      roomId: "strategy_finance",
      artifactType: "monetization_plan",
      title: "PropTech SaaS",
    });
    const resolved = resolveArtifactLineage(guess, context());
    expect(resolved.lineageId).toBeNull();
  });

  it("preserves lineage color after venture promotion using originating candidate ID", () => {
    const ventureId = "venture-assembly-123";
    const promoted = applyLineageFields(
      artifact({
        id: "company:1",
        roomId: "growth_nexus",
        artifactType: "company_blueprint",
        title: "Venture blueprint",
        metadata: { candidateId: CANDIDATE_A },
      }),
      {
        ...context(),
        ventureIdByCandidateId: new Map([[CANDIDATE_A, ventureId]]),
      },
    );
    expect(promoted.lineageId).toBe(ventureId);
    expect(promoted.lineageColorKey).toBe(colorKeyForLineageId(CANDIDATE_A));
  });

  it("keeps state semantics separate from lineage color", () => {
    const withLineage = applyLineageFields(
      artifact({
        id: "dec:1",
        roomId: "company_operations",
        artifactType: "decision",
        title: "VALIDATE",
        state: "SELECTED",
        metadata: { decision: "VALIDATE", candidateId: CANDIDATE_A, selected: true },
      }),
      context(),
    );
    expect(withLineage.lineageColorKey).toBeTruthy();
    expect(withLineage.state).toBe("SELECTED");
    expect(withLineage.metadata.decision).toBe("VALIDATE");
  });

  it("uses selected candidate lineage for handoff packets only when stage proves it", () => {
    expect(resolveHandoffLineageColorKey("selection_to_validation", context())).toBe(
      colorKeyForLineageId(CANDIDATE_A),
    );
    expect(resolveHandoffLineageColorKey("discovery_to_monetization", context())).toBeNull();
    expect(resolveHandoffLineageColorKey("selection_to_validation", context(null))).toBeNull();
  });

  it("exposes stable rank labels instead of array order", () => {
    const ranked = applyLineageFields(
      artifact({
        id: `opp:${CANDIDATE_B}`,
        artifactType: "opportunity_candidate",
        title: "Contractor CRM",
        sourceRecordId: CANDIDATE_B,
        metadata: { rank: 2, candidateId: CANDIDATE_B },
      }),
      context(),
    );
    expect(ranked.lineageLabel).toBe("#2");
  });

  it("uses a controlled palette size", () => {
    expect(HQ_LINEAGE_PALETTE.length).toBe(10);
  });
});
