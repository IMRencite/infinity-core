import { describe, expect, it } from "vitest";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import {
  artifactsForCandidate,
  buildVentureLineageIndex,
  diagnoseVentureLineage,
} from "@/lib/infinity/operator-console/details/resolve-venture-lineage";
import {
  formatCurrencyActual,
  formatCurrencyEstimate,
  formatNotYetMeasured,
} from "@/lib/infinity/operator-console/details/financial-truth";

function artifact(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title">): HqWorkArtifact {
  return {
    roomId: "opportunity_lab",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "fixture",
    sourceRecordId: partial.sourceRecordId ?? partial.id,
    metadata: {},
    ...partial,
  };
}

describe("HQ detail completeness + lineage isolation", () => {
  it("labels null actual revenue as NOT YET MEASURED", () => {
    expect(formatCurrencyActual(null).display).toBe("NOT YET MEASURED");
    expect(formatCurrencyActual(null).truth).toBe("NOT_YET_MEASURED");
  });

  it("labels estimates distinctly from actuals", () => {
    expect(formatCurrencyEstimate(100_000).display).toBe("$100,000 ESTIMATE");
    expect(formatCurrencyActual(100_000).display).toBe("$100,000 ACTUAL");
  });

  it("does not treat unknown revenue as zero", () => {
    expect(formatNotYetMeasured().display).not.toBe("$0");
  });

  it("returns complete candidate detail fields from persisted payload", () => {
    const candidate = artifact({
      id: "opp:c1",
      artifactType: "opportunity_candidate",
      title: "COI Utility",
      sourceRecordId: "c1",
      metadata: { candidateId: "c1", score: 80.7 },
    });

    const model = buildArtifactInspectorModel(candidate, [candidate], {
      candidate: {
        title: "COI Utility",
        summary: "Compliance automation for subcontractors.",
        targetCustomer: "General contractors",
        problem: "Manual COI tracking",
        market: "Construction SaaS",
        opportunityScore: 80.7,
        discoveryStrategies: ["Vertical wedge"],
        demandEvidence: ["Pain in RFIs"],
        marketEvidence: ["Fragmented tools"],
        monetizationEvidence: ["Per-seat SaaS"],
        competitionEvidence: ["Spreadsheets"],
        risks: ["Sales cycle"],
        unknowns: ["CAC"],
      },
      selection: {
        decision: "VALIDATE",
        selectionScore: 74,
        monetizationScore: 76.7,
        validationScore: 68,
        buildabilityScore: 72,
        confidence: 0.71,
        fatalAssumptionRisk: 0.51,
        expectedRoi: 4.6,
        ltvCacRatio: 4.6,
        estimatedCapitalRequired: 12000,
        platformDependencyRisk: null,
        regulatoryRisk: null,
        blockingAssumptions: ["CAC near $518"],
        queueReason: null,
        recommendedNextAction: "Validate CAC",
      },
      monetization: {
        modelType: "SaaS",
        modelName: "Subscription",
        price: "$149/mo",
        monetizationScore: 76.7,
        ltvCacRatio: 4.6,
        expectedRoi: 4.6,
        rationale: "Per-seat compliance utility",
      },
    });

    const overview = model.sections.find((s) => s.id === "overview");
    expect(overview?.rows.some((r) => r.label === "Target customer" && r.value.includes("contractors"))).toBe(true);
    expect(model.summary).toContain("Compliance automation");
    expect(model.decision).toBe("VALIDATE");

    const revenue = model.sections.find((s) => s.id === "revenue");
    expect(revenue?.rows.some((r) => r.label === "Expected ROI" && r.value.includes("ESTIMATE"))).toBe(true);
    expect(revenue?.rows.some((r) => r.label === "Pricing" && r.value.includes("$149"))).toBe(true);
  });

  it("isolates Venture A artifacts from Venture B candidate lineage", () => {
    const a = "candidate-a";
    const b = "candidate-b";

    const artifacts = [
      artifact({
        id: "opp:a",
        artifactType: "opportunity_candidate",
        title: "Venture A",
        sourceRecordId: a,
        state: "SELECTED",
        metadata: { candidateId: a, selected: true },
      }),
      artifact({
        id: "mon:a",
        roomId: "strategy_finance",
        artifactType: "monetization_plan",
        title: "A plan",
        metadata: { candidateId: a },
      }),
      artifact({
        id: "mon:b",
        roomId: "strategy_finance",
        artifactType: "monetization_plan",
        title: "B plan",
        metadata: { candidateId: b },
      }),
    ];

    const index = buildVentureLineageIndex(artifacts);
    expect(index.candidateId).toBe(a);
    const aOnly = artifactsForCandidate(index, a, index.candidateId);
    expect(aOnly.some((x) => x.id === "mon:b")).toBe(false);
    expect(aOnly.some((x) => x.id === "mon:a")).toBe(true);
  });

  it("diagnoses lineage slots without fabricating missing entities", () => {
    const candidate = artifact({
      id: "opp:c1",
      artifactType: "opportunity_candidate",
      title: "Candidate",
      sourceRecordId: "c1",
      state: "SELECTED",
      metadata: { candidateId: "c1" },
    });
    const monetization = artifact({
      id: "mon:1",
      roomId: "strategy_finance",
      artifactType: "monetization_plan",
      title: "SaaS",
      metadata: { candidateId: "c1" },
    });

    const diagnosis = diagnoseVentureLineage([candidate, monetization]);
    expect(diagnosis.Candidate).toBe("FOUND");
    expect(diagnosis.Monetization).toBe("FOUND");
    expect(diagnosis.Deployment).toBe("NOT_YET_CREATED");
    expect(diagnosis.Performance).toBe("NOT_YET_CREATED");
  });
});
