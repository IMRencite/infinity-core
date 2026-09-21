import { describe, expect, it } from "vitest";
import { HQ_DEV_RUNTIME_READINESS_GATE } from "../contract";
import { evaluateHQDevRuntimeReadinessGate } from "../gates";

const healthy: Parameters<typeof evaluateHQDevRuntimeReadinessGate>[0] = {
  homepageStatus: 200,
  dashboardStatus: 200,
  compileCompleted: true,
  recurringCompileLoop: false,
  routeCompileHang: false,
  timeToFirstCompileMs: 8_000,
  fatalBrowserErrors: 0,
  fatalServerErrors: 0,
  navigationResponds: true,
};

describe("HQDevRuntimeReadinessGate", () => {
  it("Fixture A: stuck compiling fails readiness", () => {
    const gate = evaluateHQDevRuntimeReadinessGate({
      ...healthy,
      compileCompleted: false,
      routeCompileHang: true,
      homepageStatus: null,
      dashboardStatus: null,
      navigationResponds: false,
    });
    expect(gate.gate).toBe(HQ_DEV_RUNTIME_READINESS_GATE);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("COMPILE_INCOMPLETE");
    expect(gate.reasons).toContain("ROUTE_COMPILE_HANG");
  });

  it("passes only when the local HQ runtime actually responds", () => {
    const gate = evaluateHQDevRuntimeReadinessGate(healthy);
    expect(gate.result).toBe("PASS");
    expect(gate.reasons).toEqual([]);
  });
});
