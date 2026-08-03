import { describe, expect, it } from "vitest";
import {
  PlannerGatingError,
  assertPlannerMayExecute,
  isPlannerGateExemptCapability,
} from "@/lib/infinity/planner-gating";

describe("planner gate", () => {
  it("exempts discovery, decision, and validation pipeline capabilities", () => {
    expect(isPlannerGateExemptCapability("discovery.scan")).toBe(true);
    expect(isPlannerGateExemptCapability("decision.evaluate_opportunity")).toBe(true);
    expect(isPlannerGateExemptCapability("validation.run")).toBe(true);
    expect(isPlannerGateExemptCapability("planner.initiative_gate")).toBe(false);
    expect(isPlannerGateExemptCapability("planner.ai_plan_v1")).toBe(false);
  });

  it("requires validation approval for non-exempt planner capabilities", async () => {
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
      assertPlannerMayExecute(supabase, "org-1", "planner.initiative_gate", "opp-1"),
    ).rejects.toBeInstanceOf(PlannerGatingError);
  });

  it("allows exempt capabilities without validation approval", async () => {
    const supabase = {} as never;

    await expect(
      assertPlannerMayExecute(supabase, "org-1", "validation.run", "opp-1"),
    ).resolves.toBeUndefined();
  });
});
