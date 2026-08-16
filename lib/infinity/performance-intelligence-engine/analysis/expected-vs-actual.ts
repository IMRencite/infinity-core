import { randomUUID } from "node:crypto";
import type { DataQualityStatus, TimeWindow } from "../constants";
import type { KPIAssessment, MetricAggregate, VenturePerformanceContext } from "../types";

const TOLERANCE = 0.05;

export function assessExpectedVsActual(input: {
  context: VenturePerformanceContext;
  aggregates: MetricAggregate[];
  window: TimeWindow;
}): KPIAssessment[] {
  const expectations: Array<{
    metric: string;
    expected: number | null;
    source: string;
  }> = [
    {
      metric: "conversion_rate",
      expected: input.context.expectedConversionRate ?? null,
      source: input.context.expectationProvenance ?? "monetization_plan",
    },
    {
      metric: "cac",
      expected: input.context.expectedCac ?? null,
      source: input.context.expectationProvenance ?? "monetization_plan",
    },
    {
      metric: "gross_revenue",
      expected: input.context.expectedRevenue ?? null,
      source: input.context.expectationProvenance ?? "monetization_plan",
    },
    {
      metric: "sessions",
      expected: input.context.expectedOrganicTraffic ?? null,
      source: "organic_growth_forecast",
    },
    {
      metric: "ctr",
      expected: input.context.expectedMediaCtr ?? null,
      source: "creative_media_forecast",
    },
  ];

  return expectations.map(({ metric, expected, source }) => {
    const aggregate = input.aggregates.find((a) => a.metric === metric);
    const actual = aggregate?.value ?? null;
    const variance = expected != null && actual != null ? actual - expected : null;
    const variancePercent =
      expected != null && actual != null && expected !== 0 ? (variance! / expected) * 100 : null;

    let status: KPIAssessment["status"] = "insufficient_data";
    if (expected == null) status = "insufficient_data";
    else if (actual == null) status = "insufficient_data";
    else if (Math.abs((actual - expected) / Math.max(expected, 0.0001)) <= TOLERANCE) status = "on_plan";
    else if (actual > expected) status = "above_plan";
    else status = "below_plan";

    return {
      assessmentId: randomUUID(),
      ventureId: input.context.ventureId,
      metric,
      expectedValue: expected,
      actualValue: actual,
      variance,
      variancePercent,
      window: input.window,
      expectationSource: source,
      actualSource: aggregate ? "normalized_events" : "missing",
      expectationClassification: expected != null ? "ESTIMATED" : "UNKNOWN",
      actualClassification: actual != null ? "KNOWN" : "UNKNOWN",
      confidence: aggregate?.sampleSize ? Math.min(aggregate.sampleSize / 10, 1) : 0,
      dataQuality: (aggregate?.dataQuality ?? "MISSING") as DataQualityStatus,
      status,
    };
  });
}

export function preserveExpectationProvenance(assessment: KPIAssessment): KPIAssessment {
  return { ...assessment, expectationSource: assessment.expectationSource };
}
