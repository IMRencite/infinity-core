import { describe, expect, it, vi } from "vitest";
import {
  buildExecutiveDedupKey,
  DEFAULT_EXECUTIVE_POLICY_VERSION,
  DEFAULT_REASONING_VERSION,
  executiveDecisionToDb,
  isExecutivePlanningEligibleDecision,
} from "@/lib/infinity/executive/constants-db";
import { ExecutiveGatingError } from "@/lib/infinity/executive/gating";
import { buildEnterpriseBuildQueue } from "@/lib/infinity/executive";
import { isPlannerGateExemptCapability } from "@/lib/infinity/planner-gating";

describe("executive command integration rules", () => {
  it("only allows executive evaluation dedup keys for approved validation runs", () => {
    const key = buildExecutiveDedupKey({
      opportunityId: "opp-1",
      validationRunId: "run-1",
      reasoningVersion: DEFAULT_REASONING_VERSION,
      policyVersion: DEFAULT_EXECUTIVE_POLICY_VERSION,
    });

    expect(key).toContain("validation_run");
    expect(key).toContain("run-1");
  });

  it("maps planning eligibility to approve and queue only", () => {
    expect(isExecutivePlanningEligibleDecision("approve")).toBe(true);
    expect(isExecutivePlanningEligibleDecision("queue")).toBe(true);
    expect(isExecutivePlanningEligibleDecision("defer")).toBe(false);
    expect(isExecutivePlanningEligibleDecision("reject")).toBe(false);
    expect(isExecutivePlanningEligibleDecision("research_more")).toBe(false);
  });

  it("exempts executive capabilities from planner validation gate", () => {
    expect(isPlannerGateExemptCapability("executive.evaluate_opportunity")).toBe(true);
    expect(isPlannerGateExemptCapability("planner.initiative_gate")).toBe(false);
  });

  it("persists lowercase executive decisions for storage", () => {
    expect(executiveDecisionToDb("APPROVE")).toBe("approve");
    expect(executiveDecisionToDb("RESEARCH_MORE")).toBe("research_more");
  });

  it("orders enterprise queue deterministically", () => {
    const base = {
      organizationId: "org-1",
      opportunityName: "A",
      reasoningOutcome: "QUEUE",
      reasoningScore: 70,
      reasoningRank: 2,
      signals: {
        expectedRoiScore: 60,
        timeToValueScore: 60,
        riskScore: 40,
        strategicAlignmentScore: 60,
        enterpriseValueScore: 60,
        portfolioConcentration: 0.1,
        capitalSufficient: true,
        capacityAvailable: true,
        workloadWithinLimits: true,
      },
      rationale: ["r1"],
      decidedAt: "2026-08-02T00:00:00.000Z",
    };

    const queue = buildEnterpriseBuildQueue([
      { ...base, opportunityId: "a", decision: "QUEUE" },
      { ...base, opportunityId: "b", decision: "APPROVE", reasoningRank: 1 },
    ]);

    expect(queue[0]?.opportunityId).toBe("b");
    expect(queue.map((item) => item.queuePosition)).toEqual([1, 2]);
  });
});

describe("executive initiative gating", () => {
  it("blocks initiative planning without executive approval", async () => {
    const supabase = {
      from(table: string) {
        if (table === "validation_runs") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          run_status: "completed",
                          recommendation: "approved_for_planning",
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "executive_decisions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        throw new Error(`unexpected table ${table}`);
      },
    } as never;

    const { assertExecutiveEligibleForInitiativePlanning } = await import(
      "@/lib/infinity/executive/gating"
    );

    await expect(
      assertExecutiveEligibleForInitiativePlanning(supabase, "org-1", "opp-1"),
    ).rejects.toBeInstanceOf(ExecutiveGatingError);
  });
});

describe("executive worker safety", () => {
  it("does not call external APIs or LLM from executive evaluate worker module", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { executiveEvaluateWorker } = await import(
      "@/lib/infinity/runtime/workers/executive-evaluate-worker"
    );

    expect(executiveEvaluateWorker.capabilityKey).toBe("executive.evaluate_opportunity");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
