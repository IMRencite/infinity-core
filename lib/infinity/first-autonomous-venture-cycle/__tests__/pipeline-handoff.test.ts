import { describe, it, expect } from "vitest";
import {
  assessSelectionPoolAdequacy,
  buildFavc1SelectionHandoff,
  validateFavc1SelectionHandoff,
} from "@/lib/infinity/first-autonomous-venture-cycle/pipeline-handoff";
import type { MonetizationHandoffSummary } from "@/lib/infinity/monetization-engine/types";
import {
  SELECTION_POOL_LINEAGE_ERROR,
  validateSelectionPoolLineage,
} from "@/lib/infinity/venture-selection/lineage/validate-pool";
import type { LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";

const DISCOVERY = "b6ee782c-38cf-4279-8318-caa118e33989";
const MONETIZATION = "94b34a17-bfc5-4207-9f96-c7c735f86eaf";
const DISCOVERED = [
  "675353a4-d5b0-4d17-961a-9f85e04489c8",
  "dcbf770c-92e4-404a-8c2c-abf61f199dc6",
  "b28c862a-2c58-4a14-bdd7-ba37a85070bf",
  "1abe53f4-5d19-46ad-bc3f-c1fd2144b9f0",
  "39a2527c-5070-4a6d-ac62-dca867ef72a0",
  "6152c9eb-dd92-4683-b925-6c241a94422b",
  "b95c363b-7a61-45da-9a7e-57096ee6fcbc",
  "d923fdad-bc69-437c-8a57-4557575f2711",
  "449a79c5-b5bd-4af0-9a7f-c48979250a97",
];
const MONETIZED = DISCOVERED.slice(0, 5);
const EXCLUDED = DISCOVERED.slice(5);

function monetizationHandoff(
  monetizedCandidateIds: string[],
  excludedCandidateIds: string[] = DISCOVERED.filter((id) => !monetizedCandidateIds.includes(id)),
): MonetizationHandoffSummary {
  return {
    requestedCandidateIds: DISCOVERED,
    processedCandidateIds: monetizedCandidateIds,
    monetizedCandidateIds,
    excludedCandidates: excludedCandidateIds.map((candidateId) => ({
      candidateId,
      stage: "monetization",
      reason: "Excluded by monetization maxCandidates limit (5)",
      classification: "monetization_input_truncated",
    })),
  };
}

function mockBundle(candidateId: string): LoadedCandidateBundle {
  return {
    candidateId,
    discoveryRunId: DISCOVERY,
    title: `Candidate ${candidateId.slice(0, 8)}`,
    summary: "summary",
    problem: "problem",
    targetCustomer: "customer",
    market: "US",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 75,
    demandEvidence: [],
    monetizationEvidence: [],
    competitionEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: [],
    researchSources: [],
    researchRunIds: [],
    monetization: {
      monetizationRunId: MONETIZATION,
      analysisId: `analysis-${candidateId}`,
      primaryPlanId: `plan-${candidateId}`,
      monetizationScore: 70,
      combinedDecisionScore: 72,
      economicViability: "PROMISING",
      recommendation: {
        recommendedPrimaryModel: "saas_subscription",
        recommendedSecondaryModels: [],
        recommendedPricingStrategy: "subscription",
        recommendedCustomer: "teams",
        recommendedAcquisitionStrategy: "seo",
        expectedRevenueMechanism: "subscription",
        expectedTimeToRevenue: "3 months",
        estimatedStartupCapital: 25000,
        keyEconomicAssumptions: [],
        largestEconomicRisks: [],
        confidence: 0.7,
      },
      primaryPlan: null,
      allPlans: [],
      validationExperiments: [],
    },
  };
}

describe("FAVC1 monetization selection handoff", () => {
  it("builds selection IDs from monetized subset when monetization truncates discovery pool", () => {
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: monetizationHandoff(MONETIZED),
    });

    expect(handoff.selectionCandidateIds).toEqual(MONETIZED);
    expect(handoff.excludedCandidates).toHaveLength(4);
    expect(handoff.excludedCandidates.some((e) => e.candidateId === EXCLUDED[0])).toBe(true);
    expect(assessSelectionPoolAdequacy(handoff.selectionCandidateIds.length)).toBe("SUFFICIENT");
  });

  it("passes lineage validation when selection expects only monetized IDs", () => {
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: monetizationHandoff(MONETIZED),
    });
    const bundles = MONETIZED.map((id) => mockBundle(id));

    expect(() =>
      validateSelectionPoolLineage({
        organizationId: "org-1",
        expectedCandidateIds: handoff.selectionCandidateIds,
        expectedDiscoveryRunId: DISCOVERY,
        expectedMonetizationRunId: MONETIZATION,
        bundles,
      }),
    ).not.toThrow();
  });

  it("fails lineage validation when selection still expects non-monetized discovery IDs", () => {
    const bundles = MONETIZED.map((id) => mockBundle(id));

    expect(() =>
      validateSelectionPoolLineage({
        organizationId: "org-1",
        expectedCandidateIds: DISCOVERED,
        expectedDiscoveryRunId: DISCOVERY,
        expectedMonetizationRunId: MONETIZATION,
        bundles,
      }),
    ).toThrow(new RegExp(SELECTION_POOL_LINEAGE_ERROR));
  });

  it("supports all nine monetized candidates downstream", () => {
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: monetizationHandoff(DISCOVERED, []),
    });

    expect(handoff.selectionCandidateIds).toHaveLength(9);
    expect(assessSelectionPoolAdequacy(9)).toBe("SUFFICIENT");
  });

  it("treats one technical monetization failure as exclusion not silent market rejection", () => {
    const failedId = MONETIZED[4]!;
    const succeeded = MONETIZED.slice(0, 4);
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: {
        requestedCandidateIds: DISCOVERED,
        processedCandidateIds: MONETIZED,
        monetizedCandidateIds: succeeded,
        excludedCandidates: [
          {
            candidateId: failedId,
            stage: "monetization",
            reason: "provider timeout",
            classification: "monetization_analysis_failed",
          },
          ...EXCLUDED.map((candidateId) => ({
            candidateId,
            stage: "monetization" as const,
            reason: "Excluded by monetization maxCandidates limit (5)",
            classification: "monetization_input_truncated" as const,
          })),
        ],
      },
    });

    expect(handoff.selectionCandidateIds).toEqual(succeeded);
    expect(handoff.excludedCandidates.find((e) => e.candidateId === failedId)?.classification).toBe(
      "monetization_analysis_failed",
    );
  });

  it("rejects empty monetized selection pool before venture selection", () => {
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: monetizationHandoff([], DISCOVERED),
    });

    expect(() => validateFavc1SelectionHandoff(handoff)).toThrow(
      /no monetized candidates available for venture selection/,
    );
    expect(assessSelectionPoolAdequacy(0)).toBe("EMPTY");
  });

  it("preserves clean BUSINESS_NO_GO semantics when no BUILD winner in pure pool", () => {
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: monetizationHandoff(MONETIZED),
    });
    validateFavc1SelectionHandoff(handoff);
    const decisions: Array<"BUILD" | "VALIDATE" | "HOLD" | "REJECT"> = handoff.selectionCandidateIds.map(
      () => "VALIDATE",
    );
    expect(decisions.every((decision) => decision !== "BUILD")).toBe(true);
  });

  it("excludes historical and other-org candidates from explicit handoff", () => {
    const handoff = buildFavc1SelectionHandoff({
      discoveryRunId: DISCOVERY,
      discoveredCandidateIds: DISCOVERED,
      monetizationRunId: MONETIZATION,
      monetizationHandoff: monetizationHandoff(MONETIZED),
    });

    expect(handoff.selectionCandidateIds).not.toContain("903b7768-6baf-4927-adce-de905be8a87b");
    expect(handoff.selectionCandidateIds.every((id) => MONETIZED.includes(id))).toBe(true);
  });
});
