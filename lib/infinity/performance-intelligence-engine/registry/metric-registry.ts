import type { MetricDefinition } from "../types";
import type { VentureModelType } from "../constants";

const METRICS: MetricDefinition[] = [
  {
    name: "impressions",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "content_media", "generic"],
  },
  {
    name: "clicks",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "content_media", "generic"],
  },
  {
    name: "sessions",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "ctr",
    canonicalUnit: "ratio",
    aggregationMethod: "ratio",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "content_media", "generic"],
    formula: "clicks / impressions",
  },
  {
    name: "conversion_rate",
    canonicalUnit: "ratio",
    aggregationMethod: "ratio",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "generic"],
    formula: "conversions / sessions",
  },
  {
    name: "leads",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "generic"],
  },
  {
    name: "conversions",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "generic"],
  },
  {
    name: "gross_revenue",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "cac",
    canonicalUnit: "usd",
    aggregationMethod: "ratio",
    directionality: "lower_better",
    applicableVentureTypes: ["lead_gen", "subscription", "generic"],
    formula: "acquisition_spend / new_customers",
  },
  {
    name: "roas",
    canonicalUnit: "ratio",
    aggregationMethod: "ratio",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "content_media", "generic"],
    formula: "attributed_revenue / ad_spend",
  },
  {
    name: "provider_cost",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "lower_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "build_cost",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "lower_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "repair_count",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "lower_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "execution_successes",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "execution_attempts",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "neutral",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
  },
  {
    name: "execution_success_rate",
    canonicalUnit: "ratio",
    aggregationMethod: "ratio",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "content_media", "generic"],
    formula: "execution_successes / execution_attempts",
  },
  {
    name: "acquisition_spend",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "lower_better",
    applicableVentureTypes: ["lead_gen", "subscription", "generic"],
  },
  {
    name: "new_customers",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "generic"],
  },
  {
    name: "ad_spend",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "lower_better",
    applicableVentureTypes: ["lead_gen", "content_media", "generic"],
  },
  {
    name: "orders",
    canonicalUnit: "count",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "generic"],
  },
  {
    name: "aov",
    canonicalUnit: "usd",
    aggregationMethod: "ratio",
    directionality: "higher_better",
    applicableVentureTypes: ["lead_gen", "subscription", "marketplace", "generic"],
    formula: "gross_revenue / orders",
  },
  {
    name: "mrr",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["subscription"],
  },
  {
    name: "gmv",
    canonicalUnit: "usd",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["marketplace"],
  },
  {
    name: "watch_time",
    canonicalUnit: "seconds",
    aggregationMethod: "sum",
    directionality: "higher_better",
    applicableVentureTypes: ["content_media"],
  },
];

export function getMetricDefinition(metric: string): MetricDefinition | undefined {
  return METRICS.find((m) => m.name === metric);
}

export function listMetricsForVentureType(ventureType: VentureModelType): MetricDefinition[] {
  return METRICS.filter((m) => m.applicableVentureTypes.includes(ventureType));
}

export function listAllMetrics(): MetricDefinition[] {
  return [...METRICS];
}
