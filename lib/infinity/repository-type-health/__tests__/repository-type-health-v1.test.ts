import { describe, expect, it } from "vitest";
import {
  CHANGED_MODULE_TYPE_SAFETY_GATE,
  PRODUCTION_BUILD_HEALTH_GATE,
  REPOSITORY_TYPE_HEALTH_GATE,
  evaluateChangedModuleTypeSafetyGate,
  evaluateProductionBuildHealthGate,
  evaluateRepositoryTypeHealthGate,
} from "../index";

describe("REPOSITORY_TYPE_HEALTH_GATES_V1", () => {
  it("passes only when project-wide TypeScript errors are zero", () => {
    expect(evaluateRepositoryTypeHealthGate({ projectWideErrorCount: 0 })).toEqual({
      gate: REPOSITORY_TYPE_HEALTH_GATE,
      result: "PASS",
      reasons: [],
    });
    expect(evaluateRepositoryTypeHealthGate({ projectWideErrorCount: 829 }).result).toBe("FAIL");
  });

  it("requires changed-module type safety every milestone", () => {
    expect(evaluateChangedModuleTypeSafetyGate({ changedModuleErrorCount: 0 }).gate).toBe(CHANGED_MODULE_TYPE_SAFETY_GATE);
    expect(evaluateChangedModuleTypeSafetyGate({ changedModuleErrorCount: 0 }).result).toBe("PASS");
    expect(evaluateChangedModuleTypeSafetyGate({ changedModuleErrorCount: 1 }).result).toBe("FAIL");
  });

  it("fails production-readiness claims when Next build or TypeScript is unclean", () => {
    expect(evaluateProductionBuildHealthGate({
      nextProductionBuild: "PASS",
      projectWideErrorCount: 0,
    })).toEqual({
      gate: PRODUCTION_BUILD_HEALTH_GATE,
      result: "PASS",
      reasons: [],
    });
    expect(evaluateProductionBuildHealthGate({
      nextProductionBuild: "FAIL",
      projectWideErrorCount: 0,
      failure: "PRERENDER",
    }).result).toBe("FAIL");
  });
});
