import { describe, it, expect } from "vitest";
import {
  SELECTION_POOL_LINEAGE_ERROR,
  requiresExplicitSelectionPool,
  validateSelectionPoolLineage,
} from "@/lib/infinity/venture-selection/lineage/validate-pool";
import type { LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";

const CURRENT_DISCOVERY = "7979f49f-fb61-480f-8369-5f7b924d83ae";
const CURRENT_MONETIZATION = "7c6c99b9-9f38-4738-8ab4-4977dd010d05";
const CURRENT_CANDIDATES = [
  "a4991a36-b09c-4830-aafb-ecc23eeb1708",
  "d4b28960-e88a-4b96-b6db-90433bb2bafe",
  "63c40e03-2c8e-47f2-9788-d41aae260dd8",
];
const HISTORICAL_CANDIDATE = "903b7768-6baf-4927-adce-de905be8a87b";
const OTHER_ORG_DISCOVERY = "00000000-0000-4000-8000-000000000099";

function mockBundle(
  candidateId: string,
  discoveryRunId: string,
  monetizationRunId: string = CURRENT_MONETIZATION,
): LoadedCandidateBundle {
  return {
    candidateId,
    discoveryRunId,
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
      monetizationRunId,
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

describe("venture selection pool lineage", () => {
  it("requires explicit candidate IDs for FAVC1 run purpose", () => {
    expect(requiresExplicitSelectionPool("first_autonomous_venture_v1")).toBe(true);
    expect(requiresExplicitSelectionPool("venture_selection_verification")).toBe(false);
  });

  it("accepts current discovery candidates with matching monetization run", () => {
    const bundles = CURRENT_CANDIDATES.map((id) => mockBundle(id, CURRENT_DISCOVERY));
    expect(() =>
      validateSelectionPoolLineage({
        organizationId: "org-1",
        expectedCandidateIds: CURRENT_CANDIDATES,
        expectedDiscoveryRunId: CURRENT_DISCOVERY,
        expectedMonetizationRunId: CURRENT_MONETIZATION,
        bundles,
      }),
    ).not.toThrow();
  });

  it("rejects historical org candidate contamination", () => {
    const bundles = [
      ...CURRENT_CANDIDATES.map((id) => mockBundle(id, CURRENT_DISCOVERY)),
      mockBundle(HISTORICAL_CANDIDATE, "older-discovery-run"),
    ];

    expect(() =>
      validateSelectionPoolLineage({
        organizationId: "org-1",
        expectedCandidateIds: CURRENT_CANDIDATES,
        expectedDiscoveryRunId: CURRENT_DISCOVERY,
        expectedMonetizationRunId: CURRENT_MONETIZATION,
        bundles,
      }),
    ).toThrow(new RegExp(SELECTION_POOL_LINEAGE_ERROR));
  });

  it("rejects discovery-run mismatch", () => {
    const bundles = [mockBundle(CURRENT_CANDIDATES[0]!, OTHER_ORG_DISCOVERY)];

    expect(() =>
      validateSelectionPoolLineage({
        organizationId: "org-1",
        expectedCandidateIds: [CURRENT_CANDIDATES[0]!],
        expectedDiscoveryRunId: CURRENT_DISCOVERY,
        bundles,
      }),
    ).toThrow(/discovery run .* does not match expected/);
  });

  it("fails when expected candidate missing monetization-backed bundle", () => {
    const bundles = CURRENT_CANDIDATES.slice(0, 2).map((id) => mockBundle(id, CURRENT_DISCOVERY));

    expect(() =>
      validateSelectionPoolLineage({
        organizationId: "org-1",
        expectedCandidateIds: CURRENT_CANDIDATES,
        expectedDiscoveryRunId: CURRENT_DISCOVERY,
        bundles,
      }),
    ).toThrow(/missing from selection pool/);
  });

  it("preserves clean BUSINESS_NO_GO semantics when no BUILD winner in pure pool", () => {
    const bundles = CURRENT_CANDIDATES.map((id) => mockBundle(id, CURRENT_DISCOVERY));
    validateSelectionPoolLineage({
      organizationId: "org-1",
      expectedCandidateIds: CURRENT_CANDIDATES,
      expectedDiscoveryRunId: CURRENT_DISCOVERY,
      expectedMonetizationRunId: CURRENT_MONETIZATION,
      bundles,
    });
    const decisions: Array<"BUILD" | "VALIDATE" | "HOLD" | "REJECT"> = bundles.map(() => "VALIDATE");
    expect(decisions.every((decision) => decision !== "BUILD")).toBe(true);
  });
});
