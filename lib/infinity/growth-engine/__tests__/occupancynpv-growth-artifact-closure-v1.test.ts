import { describe, expect, it } from "vitest";
import {
  evaluateGrowthArtifactAskReviewIsolationGate,
  evaluateGrowthRuntimeUIIndependenceGate,
  classifyOverlayProvenance,
} from "../artifact-gates";
import {
  evaluateIsolatedProductionArtifactContract,
  evaluateProductionArtifactContaminationGate,
  inspectIsolatedGrowthArtifact,
  GROWTH_RUNTIME_OVERLAY_FILES,
} from "../isolated-artifact";
import { evaluateOutboundSchedulerWindowCoverageGate } from "../scheduler-coverage";
import { evaluateStaleGrowthScheduleGate, nextHourlyRunAt } from "../stale-schedule";

describe("AskReview contamination fixture", () => {
  it("fails GrowthArtifactAskReviewIsolationGate when a registry pulls AskReview", () => {
    const gate = evaluateGrowthArtifactAskReviewIsolationGate([
      "lib/infinity/growth-engine/occupancynpv-experiment.ts",
      "app/askreview/page.tsx",
    ]);
    expect(gate.result).toBe("FAIL");
    expect(gate.askReviewDependencies).toBe(1);
  });
});

describe("HQ UI contamination fixture", () => {
  it("fails GrowthRuntimeUIIndependenceGate when a growth route imports HQ dashboard", () => {
    const gate = evaluateGrowthRuntimeUIIndependenceGate([
      "app/api/runtime/tick/route.ts",
      "components/dashboard/operator-console/infinity-hq-experience.tsx",
    ]);
    expect(gate.result).toBe("FAIL");
    expect(gate.hqUiDependencies).toBe(1);
  });
});

describe("missing transitive dependency fixture", () => {
  it("fails IsolatedProductionArtifactContract when the workspace omits a required overlay file", () => {
    const isolation = evaluateIsolatedProductionArtifactContract(
      inspectIsolatedGrowthArtifact({
        workspaceRoot: "C:/does-not-exist-growth-artifact",
        includedPaths: ["lib/infinity/growth-engine/occupancynpv-experiment.ts"],
      }),
    );
    expect(isolation.result).toBe("FAIL");
    expect(isolation.reasons.some((row) => row.startsWith("OVERLAY_MISSING") || row.startsWith("BASELINE_MISMATCH"))).toBe(true);
  });
});

describe("unknown file fixture", () => {
  it("fails ProductionArtifactContaminationGate when an overlay file is UNKNOWN", () => {
    const artifact = inspectIsolatedGrowthArtifact({
      includedPaths: ["favc1-run.log", "lib/infinity/growth-engine/contract.ts"],
    });
    expect(classifyOverlayProvenance("favc1-run.log")).toBe("UNKNOWN");
    expect(evaluateProductionArtifactContaminationGate(artifact).result).toBe("FAIL");
  });
});

describe("scheduler coverage fixtures", () => {
  it("fails twelve-hour UTC cadence for US local windows", () => {
    const gate = evaluateOutboundSchedulerWindowCoverageGate({
      cronExpressions: ["0 0 * * *", "0 12 * * *"],
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.morningSupport).toBe("FAIL");
  });

  it("passes hourly eligibility without changing send-volume policy", () => {
    const gate = evaluateOutboundSchedulerWindowCoverageGate({
      cronExpressions: ["0 * * * *"],
    });
    expect(gate.result).toBe("PASS");
    expect(gate.matrix.every((row) => row.morning === "PASS" && row.afternoon === "PASS")).toBe(true);
  });
});

describe("stale next run fixture", () => {
  it("fails StaleGrowthScheduleGate and requires recompute", () => {
    const gate = evaluateStaleGrowthScheduleGate({
      nextRunAt: "2026-09-09T18:05:00.000Z",
      now: "2026-09-11T00:30:00.000Z",
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.recomputeRequired).toBe(true);
    expect(nextHourlyRunAt(new Date("2026-09-11T00:30:00.000Z"))).toBe("2026-09-11T01:00:00.000Z");
  });
});

describe("overlay provenance", () => {
  it("classifies every default overlay file", () => {
    for (const path of GROWTH_RUNTIME_OVERLAY_FILES) {
      expect(classifyOverlayProvenance(path)).not.toBe("UNKNOWN");
    }
  });
});

describe("deployment target gates", () => {
  it("passes GrowthDeploymentSourceIntegrityGate only for the isolated artifact path", async () => {
    const { evaluateGrowthDeploymentSourceIntegrityGate } = await import("../deployment-target");
    expect(evaluateGrowthDeploymentSourceIntegrityGate({
      sourcePath: "C:\\Users\\Antivist\\AppData\\Local\\Temp\\infinity-occupancynpv-growth-artifact-v1",
    }).result).toBe("PASS");
    expect(evaluateGrowthDeploymentSourceIntegrityGate({
      sourcePath: "C:\\Users\\Antivist\\Desktop\\Infinity\\infinity-core",
    }).result).toBe("FAIL");
  });

  it("fails GrowthRuntimeDeploymentTargetGate for customer, AskReview, test, or missing runtime", async () => {
    const { evaluateGrowthRuntimeDeploymentTargetGate } = await import("../deployment-target");
    expect(evaluateGrowthRuntimeDeploymentTargetGate({
      projectId: "prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d",
      isOccupancyNpvCustomer: true,
    }).result).toBe("FAIL");
    expect(evaluateGrowthRuntimeDeploymentTargetGate({
      projectId: "prj_188YspuXKKVurXCf2lxnP4ywyggg",
      projectName: "infinity-test-live-verification-gde",
      isDisposableTest: true,
    }).result).toBe("FAIL");
    expect(evaluateGrowthRuntimeDeploymentTargetGate({}).result).toBe("FAIL");
  });
});
