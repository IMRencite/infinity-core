import { randomUUID } from "node:crypto";
import type { DataQualityStatus, TimeWindow } from "../constants";
import type { MetricAggregate, NormalizedPerformanceEvent } from "../types";
import {
  calculateAov,
  calculateCac,
  calculateConversionRate,
  calculateCtr,
  calculateExecutionSuccessRate,
  calculateRoas,
  sumMetricValues,
} from "./metric-calculator";
import { getMetricDefinition } from "../registry/metric-registry";

const DERIVED_RATIO_METRICS = new Set([
  "ctr",
  "conversion_rate",
  "cac",
  "roas",
  "aov",
  "execution_success_rate",
]);

export function aggregateEventsByMetric(input: {
  events: NormalizedPerformanceEvent[];
  ventureId?: string;
  window: TimeWindow;
}): MetricAggregate[] {
  const byMetric = new Map<string, NormalizedPerformanceEvent[]>();
  for (const event of input.events) {
    if (input.ventureId && event.ventureId !== input.ventureId) continue;
    if (DERIVED_RATIO_METRICS.has(event.metric)) continue;
    const list = byMetric.get(event.metric) ?? [];
    list.push(event);
    byMetric.set(event.metric, list);
  }

  const aggregates: MetricAggregate[] = [];
  for (const [metric, events] of byMetric) {
    const values = events.map((e) => e.value);
    const definition = getMetricDefinition(metric);
    const method = definition?.aggregationMethod ?? "sum";
    aggregates.push({
      aggregateId: randomUUID(),
      ventureId: input.ventureId,
      metric,
      window: input.window,
      value: method === "sum" ? sumMetricValues(values) : sumMetricValues(values),
      unit: events[0]?.unit ?? "count",
      sampleSize: values.length,
      dataQuality: assessAggregateQuality(events.length),
      computedAt: new Date().toISOString(),
    });
  }
  return aggregates;
}

export function aggregateEventsByDimension(input: {
  events: NormalizedPerformanceEvent[];
  dimensionKey: string;
  metric: string;
  window: TimeWindow;
}): MetricAggregate[] {
  const groups = new Map<string, NormalizedPerformanceEvent[]>();
  for (const event of input.events) {
    if (event.metric !== input.metric) continue;
    const dimVal = String(event.dimensions?.[input.dimensionKey] ?? "unknown");
    const list = groups.get(dimVal) ?? [];
    list.push(event);
    groups.set(dimVal, list);
  }

  return [...groups.entries()].map(([dimVal, events]) => ({
    aggregateId: randomUUID(),
    ventureId: events[0]?.ventureId,
    metric: input.metric,
    window: input.window,
    value: sumMetricValues(events.map((e) => e.value)),
    unit: events[0]?.unit ?? "count",
    sampleSize: events.length,
    dataQuality: assessAggregateQuality(events.length),
    dimensions: { [input.dimensionKey]: dimVal },
    computedAt: new Date().toISOString(),
  }));
}

function assessAggregateQuality(sampleSize: number): DataQualityStatus {
  if (sampleSize === 0) return "MISSING";
  if (sampleSize < 3) return "LOW_CONFIDENCE";
  if (sampleSize < 10) return "PARTIAL";
  return "COMPLETE";
}

export function deriveRatioAggregates(input: {
  aggregates: MetricAggregate[];
  window: TimeWindow;
}): MetricAggregate[] {
  const get = (metric: string) => input.aggregates.find((a) => a.metric === metric)?.value;
  const sample = (metric: string) => input.aggregates.find((a) => a.metric === metric)?.sampleSize ?? 0;
  const derived: MetricAggregate[] = [];
  const ventureId = input.aggregates[0]?.ventureId;

  const ctr = calculateCtr(get("clicks") ?? NaN, get("impressions") ?? NaN);
  if (ctr != null) {
    derived.push(makeDerived({ ventureId, metric: "ctr", window: input.window, value: ctr, unit: "ratio", sampleSize: Math.min(sample("clicks"), sample("impressions")) }));
  }

  const conversionRate = calculateConversionRate(get("conversions") ?? NaN, get("sessions") ?? NaN);
  if (conversionRate != null) {
    derived.push(makeDerived({ ventureId, metric: "conversion_rate", window: input.window, value: conversionRate, unit: "ratio", sampleSize: Math.min(sample("conversions"), sample("sessions")) }));
  }

  const cac = calculateCac(get("acquisition_spend") ?? NaN, get("new_customers") ?? NaN);
  if (cac != null) {
    derived.push(makeDerived({ ventureId, metric: "cac", window: input.window, value: cac, unit: "usd", sampleSize: Math.min(sample("acquisition_spend"), sample("new_customers")) }));
  }

  const roas = calculateRoas(get("gross_revenue") ?? NaN, get("ad_spend") ?? NaN);
  if (roas != null) {
    derived.push(makeDerived({ ventureId, metric: "roas", window: input.window, value: roas, unit: "ratio", sampleSize: Math.min(sample("gross_revenue"), sample("ad_spend")) }));
  }

  const aov = calculateAov(get("gross_revenue") ?? NaN, get("orders") ?? NaN);
  if (aov != null) {
    derived.push(makeDerived({ ventureId, metric: "aov", window: input.window, value: aov, unit: "usd", sampleSize: Math.min(sample("gross_revenue"), sample("orders")) }));
  }

  const executionSuccessRate = calculateExecutionSuccessRate(
    get("execution_successes") ?? NaN,
    get("execution_attempts") ?? NaN,
  );
  if (executionSuccessRate != null) {
    derived.push(makeDerived({
      ventureId,
      metric: "execution_success_rate",
      window: input.window,
      value: executionSuccessRate,
      unit: "ratio",
      sampleSize: get("execution_attempts") ?? 0,
    }));
  }

  return derived;
}

function makeDerived(input: {
  ventureId?: string;
  metric: string;
  window: TimeWindow;
  value: number;
  unit: string;
  sampleSize: number;
}): MetricAggregate {
  return {
    aggregateId: randomUUID(),
    ventureId: input.ventureId,
    metric: input.metric,
    window: input.window,
    value: input.value,
    unit: input.unit,
    sampleSize: input.sampleSize,
    dataQuality: "PARTIAL",
    computedAt: new Date().toISOString(),
  };
}
