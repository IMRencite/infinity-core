import {
  CHANGED_MODULE_TYPE_SAFETY_GATE,
  PRODUCTION_BUILD_HEALTH_GATE,
  REPOSITORY_TYPE_HEALTH_GATE,
  type NamedGateResult,
} from "./types";

export function evaluateRepositoryTypeHealthGate(input: {
  projectWideErrorCount: number;
}): NamedGateResult {
  return {
    gate: REPOSITORY_TYPE_HEALTH_GATE,
    result: input.projectWideErrorCount === 0 ? "PASS" : "FAIL",
    reasons: input.projectWideErrorCount === 0 ? [] : [`PROJECT_WIDE_TYPESCRIPT_ERRORS:${input.projectWideErrorCount}`],
  };
}

export function evaluateChangedModuleTypeSafetyGate(input: {
  changedModuleErrorCount: number;
}): NamedGateResult {
  return {
    gate: CHANGED_MODULE_TYPE_SAFETY_GATE,
    result: input.changedModuleErrorCount === 0 ? "PASS" : "FAIL",
    reasons: input.changedModuleErrorCount === 0 ? [] : [`CHANGED_MODULE_TYPESCRIPT_ERRORS:${input.changedModuleErrorCount}`],
  };
}

export function evaluateProductionBuildHealthGate(input: {
  nextProductionBuild: "PASS" | "FAIL";
  projectWideErrorCount: number;
  failure?: string | null;
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.projectWideErrorCount !== 0) reasons.push(`PROJECT_WIDE_TYPESCRIPT_ERRORS:${input.projectWideErrorCount}`);
  if (input.nextProductionBuild !== "PASS") reasons.push(input.failure ? `NEXT_PRODUCTION_BUILD:${input.failure}` : "NEXT_PRODUCTION_BUILD_FAIL");
  return {
    gate: PRODUCTION_BUILD_HEALTH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
