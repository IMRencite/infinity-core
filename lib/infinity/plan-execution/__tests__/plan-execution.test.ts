import { describe, it, expect } from "vitest";
import {
  classifyPlanStepCapability,
  classifyPlanStep,
} from "@/lib/infinity/plan-execution/step-classification";
import { planExecutionIdempotencyKey } from "@/lib/infinity/plan-execution/idempotency";
import { PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL } from "@/lib/infinity/plan-execution/constants";
import { missionUsesAutonomousPlanExecution } from "@/lib/infinity/plan-execution/integration";
import { MISSION_RUNTIME_VERSION_V2 } from "@/lib/infinity/mission-runtime/constants";
import type { MissionRuntimeInstance } from "@/lib/infinity/mission-runtime/types";
import type { StageInspectionSnapshot } from "@/lib/infinity/mission-runtime/types";
import { EMPTY_STAGE_INSPECTION } from "@/lib/infinity/mission-runtime/stage-inspection";

describe("Autonomous Plan Execution v1", () => {
  it("classifies prohibited external capabilities as unsupported_external", () => {
    expect(classifyPlanStepCapability("deploy.publish")).toBe("unsupported_external");
    expect(classifyPlanStepCapability("build.workspace_initialize")).toBe("build");
  });

  it("marks external deploy steps blocked_external_capability_required", () => {
    const classified = classifyPlanStep(
      {
        id: "step-1",
        organization_id: "org",
        plan_id: "plan",
        step_order: 1,
        capability_key: "deploy.publish",
        title: "Deploy",
        description: "",
        constraints: {},
        status: "pending",
        created_at: "",
        updated_at: "",
      },
      {
        organizationId: "org",
        missionId: "m",
        planId: "plan",
        planVersion: 1,
        executionPolicyVersion: "plan_execution_v1",
      },
    );
    expect(classified.eligibilityStatus).toBe(PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL);
  });

  it("builds deterministic plan execution idempotency keys", () => {
    const key = planExecutionIdempotencyKey({
      organizationId: "org",
      missionId: "m",
      runtimeInstanceId: "rt",
      executiveDecisionId: "exec",
      planId: "plan",
      planVersion: 1,
      executionPolicyVersion: "plan_execution_v1",
    });
    expect(key).toContain("plan_execution");
    expect(key).toContain("org");
  });

  it("enables autonomous flow only for v2 runtime with canonical handoff", () => {
    const instance = {
      runtimeVersion: MISSION_RUNTIME_VERSION_V2,
      status: "running",
      metadata: {},
    } as MissionRuntimeInstance;
    const inspection: StageInspectionSnapshot = {
      ...EMPTY_STAGE_INSPECTION,
      hasPlannerEligiblePlan: true,
      canonicalExecutiveSelectionDecisionId: "exec-1",
      missionActive: true,
    };
    expect(missionUsesAutonomousPlanExecution(instance, inspection)).toBe(true);
  });

  it("disables autonomous flow for legacy v1 runtime", () => {
    const instance = {
      runtimeVersion: "mission_runtime_v1",
      status: "running",
      metadata: {},
    } as MissionRuntimeInstance;
    const inspection: StageInspectionSnapshot = {
      ...EMPTY_STAGE_INSPECTION,
      hasPlannerEligiblePlan: true,
      canonicalExecutiveSelectionDecisionId: "exec-1",
    };
    expect(missionUsesAutonomousPlanExecution(instance, inspection)).toBe(false);
  });

  it("respects pause — no autonomous scheduling when runtime paused", () => {
    const instance = {
      runtimeVersion: MISSION_RUNTIME_VERSION_V2,
      status: "paused",
      metadata: {},
    } as MissionRuntimeInstance;
    const inspection: StageInspectionSnapshot = {
      ...EMPTY_STAGE_INSPECTION,
      hasPlannerEligiblePlan: true,
      canonicalExecutiveSelectionDecisionId: "exec-1",
    };
    expect(missionUsesAutonomousPlanExecution(instance, inspection)).toBe(false);
  });

  it("maps content_website venture type to build project content_site", async () => {
    const { VENTURE_TYPE_TO_BUILD_PROJECT } = await import("@/lib/infinity/build-factory/constants");
    expect(VENTURE_TYPE_TO_BUILD_PROJECT.content_website).toBe("content_site");
  });
});
