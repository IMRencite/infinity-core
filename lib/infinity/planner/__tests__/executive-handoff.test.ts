import { describe, it, expect, vi } from "vitest";
import {
  verifyExecutiveHandoffPlan,
  readCanonicalDecisionId,
} from "@/lib/infinity/planner/v2-executive-handoff";
import type { PlannerExecutiveAuthorization } from "@/lib/infinity/executive-selection/authorization";
import type { Plan, PlanStep } from "@/lib/infinity/types";

vi.mock("@/lib/infinity/planner-gating", () => ({
  assertPlannerMayExecute: vi.fn(),
}));

const auth: PlannerExecutiveAuthorization = {
  organizationId: "org-1",
  missionId: "mission-1",
  runtimeInstanceId: "rt-1",
  opportunityId: "opp-1",
  canonicalDecisionId: "dec-canonical",
  canonicalDecisionType: "select_for_planning",
  sourceSystem: "executive_selection_v2",
  planningEligible: true,
  reviewStatus: "passed",
  qaStatus: "passed",
  deterministicScore: 1,
  confidence: 1,
  policyVersion: "p",
  modelVersion: "m",
  contextHash: "h",
  finalizedAt: "2026-01-01T00:00:00Z",
  superseded: false,
  blockers: [],
  escalationRequired: false,
  executiveContextId: "ctx",
  validationRunId: "vr",
};

describe("Executive planner handoff plan QA", () => {
  it("passes when plan metadata and steps are bounded", async () => {
    const plan = {
      id: "plan-1",
      metadata: {
        opportunity_id: "opp-1",
        canonical_executive_selection_decision_id: "dec-canonical",
        build_factory: false,
      },
    } as Plan;

    const steps = [
      {
        capability_key: "planner.initiative_gate",
        step_order: 1,
      },
    ] as PlanStep[];

    const result = await verifyExecutiveHandoffPlan({} as never, auth, plan, steps);
    expect(result.verdict).toBe("pass");
  });

  it("fails when build capabilities appear in steps", async () => {
    const plan = {
      id: "plan-1",
      metadata: {
        opportunity_id: "opp-1",
        canonical_executive_selection_decision_id: "dec-canonical",
      },
    } as Plan;

    const steps = [{ capability_key: "build.factory.start", step_order: 1 }] as PlanStep[];

    const result = await verifyExecutiveHandoffPlan({} as never, auth, plan, steps);
    expect(result.verdict).toBe("fail");
    expect(result.issues).toContain("build_capability_in_plan");
  });
});

describe("readCanonicalDecisionId", () => {
  it("reads id from metadata", () => {
    expect(
      readCanonicalDecisionId({ canonical_executive_selection_decision_id: "x" }),
    ).toBe("x");
  });
});
