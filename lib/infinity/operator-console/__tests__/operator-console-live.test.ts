/**
 * Live operator console verification — RUN_OPERATOR_CONSOLE_V1_LIVE=true
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOperatorVentureSnapshot } from "../operator-read-model";

const runLive = process.env.RUN_OPERATOR_CONSOLE_V1_LIVE === "true";

describe.runIf(runLive)("Operator Console live verification", () => {
  it("loads real venture snapshot with persisted engine data", async () => {
    const admin = createAdminClient();
    const orgId =
      process.env.OPERATOR_CONSOLE_TEST_ORG_ID ??
      process.env.PERFORMANCE_INTELLIGENCE_TEST_ORG_ID ??
      "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

    const { data: assemblies } = await admin
      .from("venture_assemblies")
      .select("id")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const ventureId = assemblies?.[0]?.id;
    expect(ventureId).toBeTruthy();

    const snapshot = await loadOperatorVentureSnapshot(admin, orgId, ventureId!);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.departments.length).toBe(11);
    expect(snapshot!.activityFeed.length).toBeGreaterThanOrEqual(0);

    const populated = snapshot!.departments.filter((d) => d.recordCount > 0).map((d) => d.id);
    console.log(
      JSON.stringify(
        {
          ventureAssemblyId: ventureId,
          ventureName: snapshot!.venture.ventureName,
          overallStatus: snapshot!.overallStatus,
          populatedDepartments: populated,
          activityFeedCount: snapshot!.activityFeed.length,
          knownSpendUsd: snapshot!.costs.knownSpendUsd,
          latestDecision: snapshot!.closedLoopRoute.decisionType,
          performanceRunId: (snapshot!.system.engineRuns.performanceIntelligence as Record<string, unknown>[])?.[0]?.id ?? null,
        },
        null,
        2,
      ),
    );
  }, 60_000);
});
