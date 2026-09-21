import { canSupersedeFailure } from "./gates";
import type { ExecutionAttemptRecord } from "./types";
import { EXECUTION_ATTEMPT_CONTRACT } from "./types";

const MISSION = "GLOBAL_ECONOMICS_AND_BUILD_HEALTH_V1";
const STEP = "occupancynpv-validate-economics-authorization";

export function occupancynpvValidateEconomicsBlockedAttempt(): ExecutionAttemptRecord {
  return {
    contract: EXECUTION_ATTEMPT_CONTRACT,
    attempt_id: "attempt_econ_validate_1",
    mission_id: MISSION,
    step_id: STEP,
    started_at: "2026-09-10T07:00:29.000Z",
    completed_at: "2026-09-10T07:00:40.000Z",
    execution_context_id: "ctx_infinity_core",
    input_version: "v1-incorrect-validate-economics",
    result: "FAIL",
    failure_class: "VALIDATE_MISCLASSIFIED_AS_ECONOMICS_BLOCKED",
    failure_reason: "VALIDATE OccupancyNPV incorrectly classified as ECONOMICS_BLOCKED",
    repair_reference: "authorization.ts VALIDATE remains VALIDATE; economics required before BUILD",
    superseded_by: null,
    is_current: true,
    is_final: false,
    evidence: ["64194.txt", "governed-executable-venture-build-orchestration-v1.test.ts"],
  };
}

export function occupancynpvValidateEconomicsRerunPassAttempt(): ExecutionAttemptRecord {
  return {
    contract: EXECUTION_ATTEMPT_CONTRACT,
    attempt_id: "attempt_econ_validate_2",
    mission_id: MISSION,
    step_id: STEP,
    started_at: "2026-09-10T07:01:24.000Z",
    completed_at: "2026-09-10T07:01:34.000Z",
    execution_context_id: "ctx_infinity_core",
    input_version: "v2-validate-semantics-repaired",
    result: "PASS",
    failure_class: null,
    failure_reason: null,
    repair_reference: "authorization.ts VALIDATE remains VALIDATE; economics required before BUILD",
    superseded_by: null,
    is_current: true,
    is_final: true,
    evidence: ["governed-executable-venture-build-orchestration-v1.test.ts", "global-venture-economics-assurance-v1.test.ts"],
  };
}

export function occupancynpvValidateEconomicsHistory(): ExecutionAttemptRecord[] {
  const failed = occupancynpvValidateEconomicsBlockedAttempt();
  const rerun = occupancynpvValidateEconomicsRerunPassAttempt();
  const superseded: ExecutionAttemptRecord = {
    ...failed,
    result: "SUPERSEDED",
    superseded_by: rerun.attempt_id,
    is_current: false,
    is_final: false,
  };
  if (!canSupersedeFailure({ failed, repairChangedRootCause: true, rerun })) {
    throw new Error("OCCUPANCYNPV_VALIDATE_ECONOMICS_CANNOT_SUPERSEDE");
  }
  return [superseded, { ...rerun, is_current: true, is_final: true }];
}

export function newerFailAfterOlderPass(): ExecutionAttemptRecord[] {
  return [
    {
      contract: EXECUTION_ATTEMPT_CONTRACT,
      attempt_id: "attempt_old_pass",
      mission_id: "example",
      step_id: "typecheck",
      started_at: "2026-09-10T06:00:00.000Z",
      completed_at: "2026-09-10T06:00:10.000Z",
      execution_context_id: "ctx_infinity_core",
      input_version: "v1",
      result: "PASS",
      failure_class: null,
      failure_reason: null,
      repair_reference: null,
      superseded_by: null,
      is_current: false,
      is_final: false,
      evidence: [],
    },
    {
      contract: EXECUTION_ATTEMPT_CONTRACT,
      attempt_id: "attempt_new_fail",
      mission_id: "example",
      step_id: "typecheck",
      started_at: "2026-09-10T07:00:00.000Z",
      completed_at: "2026-09-10T07:00:10.000Z",
      execution_context_id: "ctx_infinity_core",
      input_version: "v2",
      result: "FAIL",
      failure_class: "TYPESCRIPT",
      failure_reason: "new code failure",
      repair_reference: null,
      superseded_by: null,
      is_current: true,
      is_final: true,
      evidence: [],
    },
  ];
}
