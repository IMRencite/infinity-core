import { describe, expect, it } from "vitest";
import {
  aggregateValidationScores,
  calculateValidationCategories,
  detectSparseSystemValidation,
} from "@/lib/infinity/validation/categories";
import {
  generateValidationRecommendation,
  isPlannerEligible,
} from "@/lib/infinity/validation/recommend";
import type { ValidationModel } from "@/lib/infinity/validation/types";
import { PlannerGatingError, assertOpportunityApprovedForPlanning } from "@/lib/infinity/planner-gating";

const model = {
  id: "model-1",
  organization_id: "org-1",
  name: "Enterprise Value Validation Model",
  version: "1.0.0",
  status: "active",
  categories: [],
  thresholds: {
    approve_planning_min_confidence: 70,
    approve_planning_min_score: 65,
    approve_planning_min_evidence_strength: 60,
    research_more_max_confidence: 55,
    reject_max_score: 35,
  },
  requirements: {},
  description: null,
  activated_at: null,
  deprecated_at: null,
  created_at: "",
  updated_at: "",
} as ValidationModel;

describe("validation categories", () => {
  it("marks unknown dimensions instead of treating missing scores as zero", () => {
    const categories = calculateValidationCategories(model, {
      opportunity: {
        id: "opp-1",
        organization_id: "org-1",
        source_snapshot: {},
        industry: "software",
        overall_score: null,
      } as never,
      latestScore: null,
      evidence: [],
      evaluation: {
        recommendation: "validate",
      } as never,
      claims: [],
      knowledge: [],
      isSparseSystemValidation: false,
    });

    const demand = categories.find((c) => c.category === "demand");
    expect(demand?.score).toBeNull();
    expect(demand?.dataStatus).toBe("unknown");
  });

  it("lowers confidence when important evidence is missing", () => {
    const categories = calculateValidationCategories(model, {
      opportunity: {
        id: "opp-1",
        organization_id: "org-1",
        source_snapshot: {},
        industry: "software",
        overall_score: 70,
      } as never,
      latestScore: {
        demand_score: 70,
        profitability_score: 65,
      } as never,
      evidence: [],
      evaluation: { recommendation: "validate" } as never,
      claims: [],
      knowledge: [],
      isSparseSystemValidation: false,
    });

    const aggregated = aggregateValidationScores(categories);
    expect(aggregated.overallConfidence).not.toBeNull();
    expect(aggregated.overallConfidence ?? 100).toBeLessThan(85);
    expect(aggregated.missingInformation.length).toBeGreaterThan(0);
  });
});

describe("validation recommendations", () => {
  it("does not approve planning for sparse system validation data", () => {
    const recommendation = generateValidationRecommendation({
      model,
      overallScore: 90,
      overallConfidence: 90,
      categories: [],
      isSparseSystemValidation: true,
      hasCriticalBlockers: true,
      evaluationRecommendation: "validate",
    });

    expect(recommendation).not.toBe("approved_for_planning");
  });

  it("blocks approval when critical blockers exist", () => {
    const recommendation = generateValidationRecommendation({
      model,
      overallScore: 80,
      overallConfidence: 80,
      categories: [
        {
          category: "evidence_strength",
          score: 70,
          confidence: 70,
          dataStatus: "known",
          findings: [],
          missingInformation: [],
          blockingIssues: ["critical_gap"],
        },
      ],
      isSparseSystemValidation: false,
      hasCriticalBlockers: true,
      evaluationRecommendation: "approve_initiative",
    });

    expect(recommendation).toBe("hold");
  });

  it("only marks planner eligible for approved_for_planning", () => {
    expect(isPlannerEligible("approved_for_planning")).toBe(true);
    expect(isPlannerEligible("validate_again")).toBe(false);
  });
});

describe("planner gating", () => {
  it("rejects unapproved opportunities", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      run_status: "completed",
                      recommendation: "validate_again",
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never;

    await expect(
      assertOpportunityApprovedForPlanning(supabase, "org-1", "opp-1"),
    ).rejects.toBeInstanceOf(PlannerGatingError);
  });
});

describe("sparse detection", () => {
  it("detects system validation opportunities", () => {
    expect(
      detectSparseSystemValidation({
        source_snapshot: { validation_scope: "discovery_foundation_v1" },
        industry: "software",
        category: "saas",
      } as never),
    ).toBe(true);
  });
});
