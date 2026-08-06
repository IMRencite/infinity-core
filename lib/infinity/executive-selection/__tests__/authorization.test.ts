import { describe, it, expect } from "vitest";
import {
  authorizationFromSelectionRow,
  buildPlannerHandoffIdempotencyKey,
  type PlannerExecutiveAuthorization,
} from "@/lib/infinity/executive-selection/authorization";

const baseRow = {
  id: "dec-1",
  organization_id: "org-1",
  mission_id: "mission-1",
  runtime_instance_id: "rt-1",
  opportunity_id: "opp-1",
  decision: "select_for_planning",
  planning_eligible: true,
  review_status: "passed",
  deterministic_score: 90,
  confidence: 80,
  policy_version: "v1",
  decision_model_version: "sel-v1",
  context_hash: "hash-abc",
  finalized_at: new Date().toISOString(),
  status: "finalized",
  executive_context_id: "ctx-1",
  blockers: [],
  escalation_reasons: [],
  validation_run_id: "vr-1",
};

describe("PlannerExecutiveAuthorization", () => {
  it("maps canonical selection rows to v2 authorization", () => {
    const auth = authorizationFromSelectionRow(baseRow);
    expect(auth).not.toBeNull();
    expect(auth?.sourceSystem).toBe("executive_selection_v2");
    expect(auth?.canonicalDecisionType).toBe("select_for_planning");
    expect(auth?.planningEligible).toBe(true);
  });

  it("rejects non-finalized rows", () => {
    expect(
      authorizationFromSelectionRow({ ...baseRow, status: "draft", finalized_at: null }),
    ).toBeNull();
  });

  it("marks escalation from disposition", () => {
    const auth = authorizationFromSelectionRow({
      ...baseRow,
      decision: "escalate_for_human_review",
      planning_eligible: false,
      opportunity_id: "opp-2",
    });
    expect(auth?.escalationRequired).toBe(true);
  });

  it("builds deterministic planner handoff idempotency keys", () => {
    const auth: PlannerExecutiveAuthorization = {
      organizationId: "org-1",
      missionId: "mission-1",
      runtimeInstanceId: "rt-1",
      opportunityId: "opp-1",
      canonicalDecisionId: "dec-1",
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
    const key = buildPlannerHandoffIdempotencyKey(auth);
    expect(key).toContain("dec-1");
    expect(key).toContain("opp-1");
    expect(buildPlannerHandoffIdempotencyKey(auth)).toBe(key);
  });
});
