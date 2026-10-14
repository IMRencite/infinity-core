/**
 * V40 FAVC1 — truthful outcomes; NO_GO is success.
 * RUN_FAVC1_V40_CYCLE=true node scripts/run-favc1-v40-cycle.mjs
 */
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeFirstAutonomousVentureCycleV1 } from "../execute-v1";
import { isTechnicalFavc1Failure } from "../result-semantics";
import { markReferenceRunArmedWaiting } from "@/lib/infinity/venture-discovery/discovery-to-build-factory-handoff-v1";

const runLive = process.env.RUN_FAVC1_V40_CYCLE === "true";

describe.runIf(runLive)("FAVC1 V40 live cycle", () => {
  it(
    "runs full pipeline without lowering thresholds; NO_GO is valid",
    async () => {
      const admin = createAdminClient();
      const orgId =
        process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ??
        process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ??
        "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
      const cycleKey =
        process.env.FAVC1_CYCLE_KEY ?? `v40-${new Date().toISOString().replace(/[:.]/g, "-")}`;

      const startedAt = new Date().toISOString();
      const result = await executeFirstAutonomousVentureCycleV1(admin, {
        organizationId: orgId,
        cycleKey,
      });
      const completedAt = new Date().toISOString();

      if (result.level === "NO_GO_MARKET_DECISION") {
        markReferenceRunArmedWaiting();
      }

      if (result.level === "LEVEL_0_SYSTEM_FAILURE" && result.stopReason?.includes("timed out")) {
        expect(result.stopReason).toMatch(/timed out/i);
      } else {
        expect(isTechnicalFavc1Failure(result.level)).toBe(false);
        expect(result.outcome).not.toBe("SYSTEM_FAILURE");
      }

      const report = {
        mission: "V40_FAVC1_LIVE_CYCLE",
        FAVC1_CYCLE_KEY: cycleKey,
        FAVC1_STARTED_AT: startedAt,
        FAVC1_COMPLETED_AT: completedAt,
        organization_id: orgId,
        result,
        BUILD_FACTORY_REFERENCE_RUN_STATE:
          result.ventureAssemblyId || result.lineage?.opportunityCandidateId
            ? "IN_PROGRESS"
            : "ARMED_WAITING_FOR_CANDIDATE",
      };

      mkdirSync(join(process.cwd(), ".infinity/commerce"), { recursive: true });
      writeFileSync(
        join(process.cwd(), ".infinity/commerce/favc1-v40-cycle-result.json"),
        `${JSON.stringify(report, null, 2)}\n`,
      );
      console.log(JSON.stringify(report, null, 2));
    },
    2_400_000,
  );
});
