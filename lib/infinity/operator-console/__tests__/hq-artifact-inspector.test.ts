import { describe, expect, it } from "vitest";
import {
  artifactRenderId,
  assertUniqueHqArtifactIds,
  buildArtifactRenderId,
  findDuplicateArtifactRenderIds,
} from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { deriveHotTakes } from "@/lib/infinity/operator-console/artifacts/hot-takes";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

function artifact(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title">): HqWorkArtifact {
  return {
    roomId: "company_operations",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "candidate_selection_evaluation",
    sourceRecordId: "eval-1",
    metadata: {},
    ...partial,
  };
}

describe("HQ artifact inspector + identity", () => {
  it("uses distinct render ids for blueprint and decision from same evaluation", () => {
    const evalId = "25ef7587-0bfe-42df-8696-2dc852a2581a";
    const blueprint = artifact({
      id: buildArtifactRenderId({
        artifactType: "selection_blueprint",
        sourceRecordType: "candidate_selection_evaluation",
        sourceRecordId: evalId,
        artifactRole: "blueprint",
      }),
      artifactType: "selection_blueprint",
      title: "Candidate blueprint",
      metadata: { artifactRole: "blueprint", candidateId: "c1" },
    });
    const decision = artifact({
      id: buildArtifactRenderId({
        artifactType: "decision",
        sourceRecordType: "candidate_selection_evaluation",
        sourceRecordId: evalId,
        artifactRole: "selection",
      }),
      artifactType: "decision",
      title: "VALIDATE",
      metadata: { artifactRole: "selection", decision: "VALIDATE", candidateId: "c1" },
    });

    expect(artifactRenderId(blueprint)).not.toBe(artifactRenderId(decision));
    expect(() =>
      assertUniqueHqArtifactIds({
        company_operations: [blueprint, decision],
      }),
    ).not.toThrow();
  });

  it("detects duplicate render ids in a room snapshot", () => {
    const evalId = "25ef7587-0bfe-42df-8696-2dc852a2581a";
    const dupA = artifact({
      id: `decision:${evalId}`,
      artifactType: "decision",
      title: "VALIDATE",
      metadata: { decision: "VALIDATE" },
    });
    const dupB = artifact({
      id: `decision:${evalId}`,
      artifactType: "decision",
      title: "VALIDATE",
      metadata: { decision: "VALIDATE" },
    });
    const duplicates = findDuplicateArtifactRenderIds({ company_operations: [dupA, dupB] });
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.count).toBe(2);
  });

  it("builds candidate inspector with empty revenue when monetization missing", () => {
    const candidate = artifact({
      id: "opp:c1",
      roomId: "opportunity_lab",
      artifactType: "opportunity_candidate",
      title: "PropTech SaaS",
      sourceRecordType: "opportunity_candidate",
      sourceRecordId: "c1",
      metadata: { score: 84.3, rank: 3, candidateId: "c1" },
    });
    const model = buildArtifactInspectorModel(candidate, [candidate], {
      candidate: {
        title: "PropTech SaaS",
        summary: "A software utility for compliance tracking.",
        targetCustomer: "GCs",
        problem: "COI tracking is manual",
        market: "Construction",
        opportunityScore: 84.3,
        discoveryStrategies: [],
        demandEvidence: [],
        marketEvidence: [],
        monetizationEvidence: [],
        competitionEvidence: [],
        risks: [],
        unknowns: [],
      },
    });
    const revenue = model.sections.find((s) => s.id === "revenue");
    expect(revenue?.emptyMessage).toBe("Not generated yet.");
    expect(model.summary).toContain("software utility");
  });

  it("does not invent traction in hot takes", () => {
    const takes = deriveHotTakes({ hasMarketPerformance: false, decision: "VALIDATE", fatalAssumptionRisk: 0.51 });
    expect(takes.some((t) => /traction|market performance/i.test(t))).toBe(false);
  });

  it("links monetization artifacts in related work for candidate inspector", () => {
    const candidateId = "c1";
    const candidate = artifact({
      id: "opp:c1",
      roomId: "opportunity_lab",
      artifactType: "opportunity_candidate",
      title: "Candidate",
      sourceRecordType: "opportunity_candidate",
      sourceRecordId: candidateId,
      metadata: { candidateId },
    });
    const monetization = artifact({
      id: "mon:1",
      roomId: "strategy_finance",
      artifactType: "monetization_plan",
      title: "SaaS",
      sourceRecordType: "monetization_candidate_analysis",
      sourceRecordId: "analysis-1",
      metadata: { candidateId },
    });
    const model = buildArtifactInspectorModel(candidate, [candidate, monetization]);
    expect(model.relatedWork.some((r) => r.artifactId === "mon:1")).toBe(true);
  });
});
