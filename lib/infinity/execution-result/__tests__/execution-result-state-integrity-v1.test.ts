import { describe, expect, it } from "vitest";
import { evaluateClientSafeBarrelExportGate, evaluateServerClientBoundaryIntegrityGate } from "@/lib/infinity/server-client-boundary/gates";
import { evaluateBuildAuthorization } from "@/lib/infinity/venture-build-orchestration/authorization";
import { authorizedBuildCompileInput, validateCreCompileInput } from "@/lib/infinity/venture-build-orchestration/fixtures";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  canSupersedeFailure,
  evaluateCurrentMilestoneHealthGate,
  evaluateExecutionAttemptContract,
  evaluateExecutionResultLineageGate,
  evaluateStaleFailureProjectionGate,
  evaluateSupersededExecutionAttemptContract,
  evaluateSupersededExecutionAttemptGate,
  historicalFailureIsActiveIncident,
  newerFailAfterOlderPass,
  occupancynpvValidateEconomicsBlockedAttempt,
  occupancynpvValidateEconomicsHistory,
  occupancynpvValidateEconomicsRerunPassAttempt,
  projectCurrentExecutionResult,
  projectExecutionResultHq,
} from "../index";

describe("run history", () => {
  it("retains every required ExecutionAttemptContract field", () => {
    const failed = occupancynpvValidateEconomicsBlockedAttempt();
    const rerun = occupancynpvValidateEconomicsRerunPassAttempt();
    expect(evaluateExecutionAttemptContract(failed).result).toBe("PASS");
    expect(evaluateExecutionAttemptContract(rerun).result).toBe("PASS");
    expect(failed.attempt_id).toBe("attempt_econ_validate_1");
    expect(failed.evidence.length).toBeGreaterThan(0);
    expect(rerun.result).toBe("PASS");
  });

  it("preserves the OccupancyNPV VALIDATE failure as history after the successful rerun", () => {
    const history = occupancynpvValidateEconomicsHistory();
    const projection = projectCurrentExecutionResult(history);
    expect(history).toHaveLength(2);
    expect(history[0]?.result).toBe("SUPERSEDED");
    expect(history[0]?.failure_reason).toContain("ECONOMICS_BLOCKED");
    expect(history[1]?.result).toBe("PASS");
    expect(projection.current_result).toBe("PASS");
    expect(projection.history).toHaveLength(2);
    expect(evaluateExecutionResultLineageGate(history).result).toBe("PASS");
  });

  it("uses the latest valid terminal verification as current health", () => {
    const projection = projectCurrentExecutionResult(occupancynpvValidateEconomicsHistory());
    expect(evaluateCurrentMilestoneHealthGate(projection).result).toBe("PASS");
    expect(projection.unresolved_failures).toBe(0);
    expect(projection.current?.attempt_id).toBe("attempt_econ_validate_2");
    expect(projection.current_headline).toBe("Resolved after repair");
  });

  it("does not erase the original failed attempt after repair", () => {
    const history = occupancynpvValidateEconomicsHistory();
    expect(history.some((row) => row.attempt_id === "attempt_econ_validate_1")).toBe(true);
    expect(history.some((row) => row.repair_reference?.includes("VALIDATE remains VALIDATE"))).toBe(true);
    expect(history.some((row) => row.superseded_by === "attempt_econ_validate_2")).toBe(true);
  });
});

describe("superseded result", () => {
  it("marks the OccupancyNPV VALIDATE failure superseded only after repair plus passing rerun", () => {
    const failed = occupancynpvValidateEconomicsBlockedAttempt();
    const rerun = occupancynpvValidateEconomicsRerunPassAttempt();
    const history = occupancynpvValidateEconomicsHistory();
    const superseded = history[0]!;
    expect(canSupersedeFailure({ failed, repairChangedRootCause: true, rerun })).toBe(true);
    expect(evaluateSupersededExecutionAttemptContract(superseded).result).toBe("PASS");
    expect(evaluateSupersededExecutionAttemptGate({
      failed: superseded,
      repairChangedRootCause: true,
      rerun,
    }).result).toBe("PASS");
  });

  it("does not supersede a failure merely because time passed", () => {
    const failed = occupancynpvValidateEconomicsBlockedAttempt();
    const laterSameFailure = {
      ...occupancynpvValidateEconomicsRerunPassAttempt(),
      result: "FAIL" as const,
      repair_reference: null,
    };
    expect(canSupersedeFailure({
      failed,
      repairChangedRootCause: false,
      rerun: laterSameFailure,
    })).toBe(false);
  });

  it("fails StaleFailureProjectionGate when a superseded FAIL is shown as current", () => {
    const history = projectCurrentExecutionResult(occupancynpvValidateEconomicsHistory());
    expect(evaluateStaleFailureProjectionGate({
      history,
      projectedCurrent: "FAIL",
    }).result).toBe("FAIL");
    expect(evaluateStaleFailureProjectionGate({
      history,
      projectedCurrent: "PASS",
    }).result).toBe("PASS");
  });

  it("does not let an older PASS hide a newer FAIL", () => {
    const attempts = newerFailAfterOlderPass();
    const projection = projectCurrentExecutionResult(attempts);
    expect(projection.current_result).toBe("FAIL");
    expect(projection.history.some((row) => row.result === "PASS")).toBe(true);
    expect(evaluateStaleFailureProjectionGate({
      history: projection,
      projectedCurrent: "PASS",
    }).result).toBe("FAIL");
    expect(evaluateExecutionResultLineageGate([
      { ...attempts[0]!, is_current: true },
      attempts[1]!,
    ]).reasons).toContain("OLD_PASS_HIDING_NEWER_FAIL");
  });
});

describe("validate/build economics", () => {
  it("keeps OccupancyNPV VALIDATE when economics are incomplete", () => {
    const result = evaluateBuildAuthorization(validateCreCompileInput({
      ventureId: CRE_VENTURE_ID,
      economics: { known: false, placeholder: false },
    }));
    expect(result.result).toBe("VALIDATION_REQUIRED");
    expect(result.result).not.toBe("ECONOMICS_BLOCKED");
    expect(result.reasons).toContain("ECONOMICS_RESEARCH_REQUIRED_BEFORE_BUILD");
    expect(result.buildReady).toBe(false);
  });

  it("blocks BUILD when required economics are incomplete", () => {
    const result = evaluateBuildAuthorization(validateCreCompileInput({
      ventureId: CRE_VENTURE_ID,
      decision: "BUILD",
      buildReady: true,
      economics: { known: false, placeholder: false },
    }));
    expect(result.result).toBe("ECONOMICS_BLOCKED");
    expect(result.reasons).toContain("BUILD_BLOCKED_BY_ECONOMICS");
    expect(result.buildReady).toBe(false);
  });

  it("restores build eligibility after economics are complete on an authorized BUILD fixture", () => {
    const result = evaluateBuildAuthorization(authorizedBuildCompileInput());
    expect(result.result).toBe("AUTHORIZED_BUILD");
    expect(result.buildReady).toBe(true);
  });

  it("projects the historical OccupancyNPV VALIDATE misclassification as SUPERSEDED after the passing rerun", () => {
    const projection = projectCurrentExecutionResult(occupancynpvValidateEconomicsHistory());
    expect(projection.current_result).toBe("PASS");
    expect(projection.superseded_count).toBe(1);
    expect(evaluateCurrentMilestoneHealthGate(projection).result).toBe("PASS");
  });
});

describe("HQ projection", () => {
  it("shows current PASS and resolved-after-repair instead of a FAIL headline", () => {
    const hq = projectExecutionResultHq(occupancynpvValidateEconomicsHistory());
    expect(hq.current_status).toBe("Resolved after repair");
    expect(hq.milestone.current_result).toBe("PASS");
    expect(hq.historical_failed_attempt_visible).toBe(true);
    expect(hq.successful_rerun_visible).toBe(true);
  });

  it("keeps both the superseded failure and the successful rerun visible", () => {
    const hq = projectExecutionResultHq(occupancynpvValidateEconomicsHistory());
    expect(hq.resolved_superseded_visible).toBe(true);
    expect(hq.history.some((row) => row.result === "SUPERSEDED")).toBe(true);
    expect(hq.history.some((row) => row.result === "PASS")).toBe(true);
  });

  it("does not treat a superseded historical failure as an active Operations incident", () => {
    const history = occupancynpvValidateEconomicsHistory();
    const hq = projectExecutionResultHq(history);
    expect(history.some(historicalFailureIsActiveIncident)).toBe(false);
    expect(hq.operations_blocked_by_historical_failure).toBe(false);
  });
});

describe("boundary", () => {
  it("keeps Playwright and async_hooks out of Client Component graphs", () => {
    const barrels = evaluateClientSafeBarrelExportGate();
    const boundary = evaluateServerClientBoundaryIntegrityGate();
    expect(barrels.result).toBe("PASS");
    expect(boundary.result).toBe("PASS");
    expect(boundary.playwrightReach).toBe(0);
    expect(boundary.asyncHooksReach).toBe(0);
  });
});
