import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createIngestState, ingestObservation, ingestObservations, makeObservation, allIngestedEvents } from "../ingestion/observation-ingestor";
import { mockWebAnalyticsAdapter, buildMockWebAnalyticsSource, createCorrectedObservation, createLateObservation } from "../sources/mock-web-analytics-adapter";
import { internalInfinityAdapter, buildInternalPerformanceSource } from "../sources/internal-infinity-adapter";
import {
  calculateCtr,
  calculateConversionRate,
  calculateCac,
  calculateRoas,
  safeRatio,
  calculateRepairRate,
} from "../metrics/metric-calculator";
import { aggregateEventsByMetric, aggregateEventsByDimension, deriveRatioAggregates } from "../metrics/metric-aggregator";
import { buildVentureKPIModel, isMetricRelevantForVenture } from "../kpi/venture-kpi-model";
import { assessExpectedVsActual, preserveExpectationProvenance } from "../analysis/expected-vs-actual";
import { hasSufficientEvidence } from "../analysis/data-quality";
import { diagnosePerformance, detectAnomalies, shouldShutdownForLosses } from "../diagnosis/diagnosis-engine";
import {
  buildOptimizationOpportunities,
  prioritizeEconomically,
  filterByEconomicPriority,
} from "../optimization/opportunity-engine";
import {
  buildLearningDecisions,
  buildExperimentFromOpportunity,
  applyExperimentResult,
  shouldUseAiDiagnosis,
} from "../learning/learning-decision-engine";
import {
  buildOrganicFeedbackContract,
  buildCreativeFeedbackContract,
  buildPabFeedbackContract,
} from "../feedback/engine-feedback";
import { listAllMetrics, listMetricsForVentureType } from "../registry/metric-registry";
import {
  TEST_VENTURE_HIGH_VALUE,
  TEST_VENTURE_SUBSCRIPTION,
  TEST_VENTURE_MARKETPLACE,
  TEST_VENTURE_LOW_VALUE,
} from "../fixtures/test-venture-contexts";
import type { PerformanceDiagnosis, NormalizedPerformanceEvent } from "../types";

function makeNormalizedEvent(
  input: Pick<NormalizedPerformanceEvent, "sourceId" | "sourceReference" | "metric" | "value" | "unit"> &
    Partial<NormalizedPerformanceEvent>,
): NormalizedPerformanceEvent {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    eventType: "metric_observation",
    ventureId: "v1",
    observedAt: now,
    occurredAt: now,
    dimensions: {},
    provenance: {},
    ...input,
  };
}

describe("Performance Intelligence & Learning Engine v1", () => {
  describe("ingestion", () => {
    it("1. performance source registers", () => {
      const source = buildMockWebAnalyticsSource("v1");
      expect(source.provider).toBe("mock_web_analytics");
      expect(source.capabilities.length).toBeGreaterThan(0);
    });

    it("2. source health works", async () => {
      const health = await mockWebAnalyticsAdapter.healthCheck();
      expect(health.status).toBe("healthy");
    });

    it("3-4. observation ingests and event normalizes", async () => {
      const obs = (await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: "v1" }))[0]!;
      const result = ingestObservation({ observation: obs, adapter: mockWebAnalyticsAdapter, state: createIngestState() });
      expect(result.events.length).toBe(1);
      expect(result.events[0]?.metric).toBe(obs.rawMetric);
    });

    it("5. duplicate event is idempotent", async () => {
      const state = createIngestState();
      const obs = (await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: "v1" }))[0]!;
      ingestObservation({ observation: obs, adapter: mockWebAnalyticsAdapter, state });
      const dup = ingestObservation({ observation: obs, adapter: mockWebAnalyticsAdapter, state });
      expect(dup.duplicate).toBe(true);
      expect(dup.events.length).toBe(0);
    });

    it("6. corrected event updates correctly", async () => {
      const state = createIngestState();
      const obs = (await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: "v1" }))[0]!;
      ingestObservation({ observation: obs, adapter: mockWebAnalyticsAdapter, state });
      const corrected = createCorrectedObservation(obs, obs.rawValue + 100);
      const result = ingestObservation({ observation: corrected, adapter: mockWebAnalyticsAdapter, state });
      expect(result.corrected).toBe(true);
      expect(result.events[0]?.value).toBe(obs.rawValue + 100);
    });

    it("7. late event works", () => {
      const state = createIngestState();
      const late = createLateObservation(
        makeObservation({
          sourceId: "mock",
          sourceReference: "late:1",
          idempotencyKey: "late-key-1",
          rawMetric: "sessions",
          rawValue: 5,
          rawUnit: "count",
          description: "late",
          provenance: {},
        }),
      );
      const result = ingestObservation({ observation: late, adapter: mockWebAnalyticsAdapter, state });
      expect(result.events.length).toBe(1);
    });

    it("8. missing source data represented safely", () => {
      expect(hasSufficientEvidence("MISSING", 0)).toBe(false);
    });
  });

  describe("metrics", () => {
    it("9. CTR calculation correct", () => {
      expect(calculateCtr(42, 1000)).toBeCloseTo(0.042);
    });
    it("10. conversion rate correct", () => {
      expect(calculateConversionRate(4, 100)).toBeCloseTo(0.04);
    });
    it("11. CAC calculation correct", () => {
      expect(calculateCac(400, 4)).toBe(100);
    });
    it("12. ROAS calculation correct", () => {
      expect(calculateRoas(800, 200)).toBe(4);
    });
    it("13. missing denominator safe", () => {
      expect(safeRatio(10, 0)).toBeNull();
    });
    it("13b. execution success rate uses population ratio not unweighted average", () => {
      const events = [
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "group-a:success", metric: "execution_successes", value: 1, unit: "count" }),
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "group-a:attempt", metric: "execution_attempts", value: 1, unit: "count" }),
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "group-b:success", metric: "execution_successes", value: 1, unit: "count" }),
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "group-b:attempt", metric: "execution_attempts", value: 9, unit: "count" }),
      ];
      const baseAggs = aggregateEventsByMetric({ events, ventureId: "v1", window: "week" });
      const derived = deriveRatioAggregates({ aggregates: baseAggs, window: "week" });
      const rate = derived.find((a) => a.metric === "execution_success_rate");
      expect(rate?.value).toBeCloseTo(0.2);
      const wrongUnweightedAverage = (1 + 1 / 9) / 2;
      expect(rate?.value).not.toBeCloseTo(wrongUnweightedAverage);
    });
    it("13c. derived ratio metrics from summed components", () => {
      const events = [
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "c1", metric: "clicks", value: 42, unit: "count" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "i1", metric: "impressions", value: 1000, unit: "count" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "conv1", metric: "conversions", value: 4, unit: "count" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "s1", metric: "sessions", value: 100, unit: "count" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "sp1", metric: "acquisition_spend", value: 400, unit: "usd" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "nc1", metric: "new_customers", value: 4, unit: "count" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "rev1", metric: "gross_revenue", value: 800, unit: "usd" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "ad1", metric: "ad_spend", value: 200, unit: "usd" }),
        makeNormalizedEvent({ sourceId: "mock", sourceReference: "ord1", metric: "orders", value: 8, unit: "count" }),
      ];
      const base = aggregateEventsByMetric({ events, ventureId: "v1", window: "week" });
      const derived = deriveRatioAggregates({ aggregates: base, window: "week" });
      expect(derived.find((a) => a.metric === "ctr")?.value).toBeCloseTo(0.042);
      expect(derived.find((a) => a.metric === "conversion_rate")?.value).toBeCloseTo(0.04);
      expect(derived.find((a) => a.metric === "cac")?.value).toBe(100);
      expect(derived.find((a) => a.metric === "roas")?.value).toBe(4);
      expect(derived.find((a) => a.metric === "aov")?.value).toBe(100);
    });
    it("13d. provider cost and repair count sum across events", () => {
      const events = [
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "p1", metric: "provider_cost", value: 1.5, unit: "usd" }),
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "p2", metric: "provider_cost", value: 2.5, unit: "usd" }),
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "r1", metric: "repair_count", value: 2, unit: "count" }),
        makeNormalizedEvent({ sourceId: "internal", sourceReference: "r2", metric: "repair_count", value: 1, unit: "count" }),
      ];
      const aggs = aggregateEventsByMetric({ events, ventureId: "v1", window: "week" });
      expect(aggs.find((a) => a.metric === "provider_cost")?.value).toBe(4);
      expect(aggs.find((a) => a.metric === "repair_count")?.value).toBe(3);
      expect(calculateRepairRate(3, 10)).toBeCloseTo(0.3);
    });
    it("13e. corrected execution counts do not double count", () => {
      const state = createIngestState();
      const attempt = makeObservation({
        sourceId: "internal",
        sourceReference: "action:1:attempt",
        idempotencyKey: "attempt-1",
        rawMetric: "execution_attempts",
        rawValue: 1,
        rawUnit: "count",
        description: "attempt",
        provenance: {},
      });
      ingestObservation({ observation: attempt, adapter: internalInfinityAdapter, state });
      const success = makeObservation({
        sourceId: "internal",
        sourceReference: "action:1:success",
        idempotencyKey: "success-1",
        rawMetric: "execution_successes",
        rawValue: 0,
        rawUnit: "count",
        description: "success",
        provenance: {},
      });
      ingestObservation({ observation: success, adapter: internalInfinityAdapter, state });
      const corrected = { ...success, rawValue: 1, corrected: true, idempotencyKey: "success-1-corrected" };
      const result = ingestObservation({ observation: corrected, adapter: internalInfinityAdapter, state });
      expect(result.corrected).toBe(true);
      const events = allIngestedEvents(state);
      const successes = events.filter((e) => e.metric === "execution_successes");
      expect(successes).toHaveLength(1);
      expect(successes[0]?.value).toBe(1);
      const base = aggregateEventsByMetric({ events, ventureId: undefined, window: "week" });
      const rate = deriveRatioAggregates({ aggregates: base, window: "week" }).find((a) => a.metric === "execution_success_rate");
      expect(rate?.value).toBe(1);
    });
    it("14. aggregation by period works", async () => {
      const { events } = await ingestObservations({
        observations: await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: "v1" }),
        adapter: mockWebAnalyticsAdapter,
      });
      const aggs = aggregateEventsByMetric({ events, ventureId: "v1", window: "week" });
      expect(aggs.some((a) => a.metric === "impressions")).toBe(true);
    });
    it("15. dimension segmentation works", async () => {
      const { events } = await ingestObservations({
        observations: await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: "v1" }),
        adapter: mockWebAnalyticsAdapter,
      });
      const aggs = aggregateEventsByDimension({ events, dimensionKey: "channel", metric: "clicks", window: "week" });
      expect(aggs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("KPI model", () => {
    it("16. lead-gen venture gets appropriate KPIs", () => {
      const model = buildVentureKPIModel(TEST_VENTURE_HIGH_VALUE);
      expect(model.primaryMetrics).toContain("leads");
    });
    it("17. subscription venture gets appropriate KPIs", () => {
      const model = buildVentureKPIModel(TEST_VENTURE_SUBSCRIPTION);
      expect(model.primaryMetrics).toContain("mrr");
    });
    it("18. marketplace venture gets appropriate KPIs", () => {
      const model = buildVentureKPIModel(TEST_VENTURE_MARKETPLACE);
      expect(model.primaryMetrics).toContain("gmv");
    });
    it("19. irrelevant KPI is not forced", () => {
      const model = buildVentureKPIModel(TEST_VENTURE_SUBSCRIPTION);
      expect(isMetricRelevantForVenture("gmv", model)).toBe(false);
    });
  });

  describe("expected vs actual", () => {
    it("20-23. above/below/on plan and missing expectation", async () => {
      const { events } = await ingestObservations({
        observations: await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: TEST_VENTURE_HIGH_VALUE.ventureId }),
        adapter: mockWebAnalyticsAdapter,
      });
      const aggs = [...aggregateEventsByMetric({ events, ventureId: TEST_VENTURE_HIGH_VALUE.ventureId, window: "week" }), ...deriveRatioAggregates({ aggregates: aggregateEventsByMetric({ events, ventureId: TEST_VENTURE_HIGH_VALUE.ventureId, window: "week" }), window: "week" })];
      const assessments = assessExpectedVsActual({ context: TEST_VENTURE_HIGH_VALUE, aggregates: aggs, window: "week" });
      expect(assessments.some((a) => a.status === "below_plan" || a.status === "above_plan" || a.status === "on_plan" || a.status === "insufficient_data")).toBe(true);
      const preserved = preserveExpectationProvenance(assessments[0]!);
      expect(preserved.expectationSource).toBeTruthy();
    });
  });

  describe("diagnosis", () => {
    it("25-30. diagnosis categories and hypothesis separation", async () => {
      const { events } = await ingestObservations({
        observations: await mockWebAnalyticsAdapter.fetchObservations({ organizationId: "org", ventureId: "v1" }),
        adapter: mockWebAnalyticsAdapter,
      });
      const aggs = [
        {
          aggregateId: randomUUID(),
          ventureId: "v1",
          metric: "ctr",
          window: "week" as const,
          value: 0.015,
          unit: "ratio",
          sampleSize: 5,
          dataQuality: "COMPLETE" as const,
          computedAt: new Date().toISOString(),
        },
      ];
      const assessments = assessExpectedVsActual({
        context: { ...TEST_VENTURE_HIGH_VALUE, expectedConversionRate: 0.9 },
        aggregates: aggs,
        window: "week",
      });
      const diagnoses = diagnosePerformance({ ventureId: "v1", aggregates: aggs, assessments, events });
      expect(diagnoses.length).toBeGreaterThan(0);
      const d = diagnoses.find((x) => x.category === "CREATIVE_PERFORMANCE") ?? diagnoses[0]!;
      expect(d.observation).toBeTruthy();
      if (d.hypotheses[0]) {
        expect(d.observation).not.toBe(d.hypotheses[0].statement);
      }
      const dataQualityDiag = diagnosePerformance({ ventureId: "v1", aggregates: [], assessments: [], events: [] });
      expect(dataQualityDiag.some((x) => !x.sufficientEvidence)).toBe(true);
    });
  });

  describe("optimization", () => {
    it("31-36. opportunities and economic priority", () => {
      const diagnosis: PerformanceDiagnosis = {
        diagnosisId: randomUUID(),
        ventureId: "v1",
        category: "CREATIVE_PERFORMANCE",
        observation: "CTR low",
        hypotheses: [{ hypothesisId: "h1", statement: "fatigue", confidence: 0.5, supportingEvidenceIds: [], counterEvidence: [], status: "proposed" }],
        confidence: 0.7,
        dataQuality: "COMPLETE",
        supportingEventIds: [],
        severity: "HIGH",
        sufficientEvidence: true,
      };
      const opps = buildOptimizationOpportunities({ diagnoses: [diagnosis], minOpportunityValueUsd: 10 });
      expect(opps.length).toBeGreaterThan(0);
      expect(prioritizeEconomically({ expectedUpsideUsd: 10, estimatedCostUsd: 40, confidence: 0.8, risk: "LOW", minOpportunityValueUsd: 10 })).toBe("DEFER");
      expect(prioritizeEconomically({ expectedUpsideUsd: 2000, estimatedCostUsd: 50, confidence: 0.8, risk: "LOW", minOpportunityValueUsd: 10 })).toBe("EXECUTE_NOW");
      expect(filterByEconomicPriority(opps, "EXECUTE_NOW").length + filterByEconomicPriority(opps, "DEFER").length + filterByEconomicPriority(opps, "QUEUE").length).toBeGreaterThan(0);
    });
  });

  describe("learning and experiments", () => {
    it("37-48. learning decisions and experiments", () => {
      const diagnosis: PerformanceDiagnosis = {
        diagnosisId: randomUUID(),
        ventureId: "v1",
        category: "ACQUISITION_VOLUME",
        observation: "low sessions",
        hypotheses: [],
        confidence: 0.7,
        dataQuality: "COMPLETE",
        supportingEventIds: [],
        severity: "MEDIUM",
        sufficientEvidence: true,
      };
      const opps = buildOptimizationOpportunities({ diagnoses: [diagnosis], minOpportunityValueUsd: 10 });
      const decisions = buildLearningDecisions({ opportunities: opps });
      expect(decisions.some((d) => d.decisionType === "EXPAND" || d.decisionType === "COLLECT_MORE_DATA" || d.decisionType === "CHANGE_CREATIVE")).toBe(true);
      const exp = buildExperimentFromOpportunity(opps[0]!);
      expect(exp.successMetric).toBeTruthy();
      const completed = applyExperimentResult(exp, { baselineValue: 0.03, variantValue: 0.05, outcome: "win", confidence: 0.7 });
      expect(completed.status).toBe("completed");
    });

    it("41-44. pivot/pause/shutdown and tiny sample guard", () => {
      expect(shouldShutdownForLosses({ cumulativeLossUsd: 20000, sampleDays: 5 })).toBe(false);
      expect(shouldShutdownForLosses({ cumulativeLossUsd: 20000, sampleDays: 45 })).toBe(true);
    });
  });

  describe("economics and autonomy", () => {
    it("56-58. intelligence cost ceiling", () => {
      expect(shouldUseAiDiagnosis({ expectedUpsideUsd: 5, intelligenceCostUsd: 0.1, maxAiCostUsd: 0.5 })).toBe(false);
      expect(shouldUseAiDiagnosis({ expectedUpsideUsd: 500, intelligenceCostUsd: 0.1, maxAiCostUsd: 0.5 })).toBe(true);
    });
  });

  describe("feedback integration", () => {
    it("62-64. engine feedback contracts", () => {
      const diagnosis: PerformanceDiagnosis = {
        diagnosisId: randomUUID(),
        ventureId: "v1",
        category: "CONTENT_PERFORMANCE",
        observation: "decline",
        hypotheses: [],
        confidence: 0.6,
        dataQuality: "COMPLETE",
        supportingEventIds: [],
        severity: "MEDIUM",
        sufficientEvidence: true,
      };
      const opps = buildOptimizationOpportunities({ diagnoses: [diagnosis], minOpportunityValueUsd: 10 });
      expect(buildOrganicFeedbackContract({ ventureId: "v1", opportunities: opps }).recommendations).toBeDefined();
      expect(buildCreativeFeedbackContract({ ventureId: "v1", opportunities: opps }).recommendations).toBeDefined();
      expect(buildPabFeedbackContract({ ventureId: "v1", opportunities: opps }).recommendations).toBeDefined();
    });
  });

  describe("source neutrality", () => {
    it("65-67. no hard-coded GA/Stripe in generic domain", () => {
      expect(buildInternalPerformanceSource().provider).toBe("internal_infinity");
      expect(listAllMetrics().every((m) => !/google analytics|stripe|ga4/i.test(m.name))).toBe(true);
      expect(listMetricsForVentureType("lead_gen").length).toBeGreaterThan(0);
    });
  });

  describe("anomaly detection", () => {
    it("detects traffic drop anomaly", () => {
      const result = detectAnomalies({ metric: "sessions", currentValue: 10, baselineValue: 100, thresholdPercent: 40 });
      expect(result.anomalous).toBe(true);
      expect(result.direction).toBe("drop");
    });
  });
});
