/**
 * RUN_FIRST_AUTONOMOUS_VENTURE_CYCLE_V1=true node scripts/execute-first-autonomous-venture-cycle-v1.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeFirstAutonomousVentureCycleV1 } from "../execute-v1";
import { isTechnicalFavc1Failure } from "../result-semantics";

const runLive = process.env.RUN_FIRST_AUTONOMOUS_VENTURE_CYCLE_V1 === "true";

describe.runIf(runLive)("First Autonomous Venture Cycle V1 live verification", () => {
  it(
    "requires LEVEL_4 closed-loop success — technical failures must fail the test",
    async () => {
      const admin = createAdminClient();
      const orgId =
        process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ??
        process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ??
        "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

      const result = await executeFirstAutonomousVentureCycleV1(admin, {
        organizationId: orgId,
        cycleKey: process.env.FAVC1_CYCLE_KEY,
      });

      console.log(JSON.stringify(result, null, 2));

      expect(isTechnicalFavc1Failure(result.level)).toBe(false);
      expect(result.outcome).not.toBe("SYSTEM_FAILURE");
      expect(result.outcome).not.toBe("INFRASTRUCTURE_BLOCKED");
      expect(result.ok).toBe(true);
      expect(result.level).toBe("LEVEL_4");
      expect(result.closedLoopProven).toBe(true);
      expect(result.ventureAssemblyId).toBeTruthy();
      expect(result.budget.filter((b) => b.known).reduce((s, b) => s + (b.costUsd ?? 0), 0)).toBeLessThanOrEqual(
        10.01,
      );
    },
    2_400_000,
  );
});

describe("First Autonomous Venture Cycle V1 live contract guards", () => {
  it("documents that historical cycle-1786902188200 would fail verification", () => {
    const historicalFailure = {
      ok: false,
      level: "LEVEL_0_SYSTEM_FAILURE" as const,
      outcome: "SYSTEM_FAILURE" as const,
      closedLoopProven: false,
      stopReason: "[scanner_unavailable] Unknown scanner failure.",
      ventureAssemblyId: null,
    };

    expect(isTechnicalFavc1Failure(historicalFailure.level)).toBe(true);
    expect(historicalFailure.ok).toBe(false);
    expect(historicalFailure.level).not.toBe("LEVEL_4");
  });
});
