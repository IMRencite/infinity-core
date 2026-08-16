/**
 * Live Performance Intelligence verification — RUN_PERFORMANCE_INTELLIGENCE_V1_TEST=true
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPerformanceIntelligenceCycle } from "../run";
import { TEST_VENTURE_HIGH_VALUE } from "../fixtures/test-venture-contexts";
import { prioritizeEconomically } from "../optimization/opportunity-engine";

const runTest = process.env.RUN_PERFORMANCE_INTELLIGENCE_V1_TEST === "true";

describe.runIf(runTest)("Performance Intelligence live verification", () => {
  it("persists internal-data cycle with mission handoff in draft mode", async () => {
    const admin = createAdminClient();
    const orgId =
      process.env.PERFORMANCE_INTELLIGENCE_TEST_ORG_ID ??
      process.env.CREATIVE_MEDIA_TEST_ORG_ID ??
      process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
      "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.PERFORMANCE_INTELLIGENCE_TEST_SUFFIX ?? `live-${Date.now()}`;

    const output = await runPerformanceIntelligenceCycle(admin, {
      organizationId: orgId,
      idempotencyKey: `performance-intelligence-v1-${suffix}`,
      simulationOnly: false,
      capabilityTest: false,
      ventureContexts: [TEST_VENTURE_HIGH_VALUE],
      enableMissionHandoff: true,
      executeMissions: false,
    });

    expect(output.ok).toBe(true);
    expect(output.buildPackages.length).toBe(1);
    const pkg = output.buildPackages[0]!;
    expect(pkg.observations.length).toBeGreaterThan(0);
    expect(pkg.normalizedEvents.length).toBeGreaterThan(0);
    expect(pkg.metricAggregates.length).toBeGreaterThan(0);
    expect(pkg.diagnoses.length).toBeGreaterThan(0);
    expect(pkg.traceabilityLinks.some((l) => l.linkType === "source_to_observation")).toBe(true);

    const readyDecision = pkg.learningDecisions.find((d) => d.status === "READY");
    if (readyDecision) {
      expect(readyDecision.missionId).toBeTruthy();
    }

    const { data: events } = await admin
      .from("performance_events")
      .select("event_id, metric, value")
      .eq("performance_intelligence_run_id", output.performanceIntelligenceRunId);
    expect(events?.length ?? 0).toBeGreaterThan(0);

    console.log(
      JSON.stringify(
        {
          classification: "LIVE_INTERNAL",
          performanceIntelligenceRunId: output.performanceIntelligenceRunId,
          observationsIngested: pkg.observations.length,
          eventsNormalized: pkg.normalizedEvents.length,
          executionSuccessRate: pkg.metricAggregates.find((a) => a.metric === "execution_success_rate")?.value ?? null,
          executionSuccesses: pkg.metricAggregates.find((a) => a.metric === "execution_successes")?.value ?? null,
          executionAttempts: pkg.metricAggregates.find((a) => a.metric === "execution_attempts")?.value ?? null,
          diagnoses: pkg.diagnoses.map((d) => ({ id: d.diagnosisId, category: d.category, observation: d.observation })),
          opportunities: pkg.optimizationOpportunities.map((o) => ({
            id: o.opportunityId,
            action: o.actionType,
            economicDecision: o.economicDecision,
            upside: o.expectedUpsideUsd,
            cost: o.estimatedCostUsd,
          })),
          decisions: pkg.learningDecisions.map((d) => ({
            id: d.decisionId,
            type: d.decisionType,
            status: d.status,
            missionId: d.missionId,
          })),
          economicDemo: {
            lowValue: prioritizeEconomically({ expectedUpsideUsd: 10, estimatedCostUsd: 40, confidence: 0.8, risk: "LOW", minOpportunityValueUsd: 10 }),
            highValue: prioritizeEconomically({ expectedUpsideUsd: 2000, estimatedCostUsd: 50, confidence: 0.8, risk: "LOW", minOpportunityValueUsd: 10 }),
          },
        },
        null,
        2,
      ),
    );
  }, 120_000);
});
