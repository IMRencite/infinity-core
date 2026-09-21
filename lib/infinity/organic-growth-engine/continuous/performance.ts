import { ORGANIC_GROWTH_PERFORMANCE_FEEDBACK_GATE, ORGANIC_INDEXATION_GATE } from "./contract";
import type { OrganicAsset, OrganicNamedGate, VentureTopicGraph } from "./types";
import type { VelocityInputs } from "./cadence";

export type OrganicPerformanceRecord = {
  url: string;
  indexation: OrganicAsset["indexation"];
  impressions: number;
  clicks: number;
  ranking_visibility: number;
  engagement: number;
  conversions: number;
  assisted_conversions: number;
  organic_leads: number;
  sales_usage: number;
  outbound_usage: number;
  geo_visibility: number;
  refresh_impact: number;
};

export function applyOrganicGrowthPerformanceFeedback(input: {
  records: OrganicPerformanceRecord[];
  graph: VentureTopicGraph;
  velocity: VelocityInputs;
}): {
  cluster_priority_boosts: string[];
  velocity_adjustment: "INCREASE" | "HOLD" | "REDUCE";
  investigations: string[];
  refresh_urls: string[];
} {
  const cluster_priority_boosts: string[] = [];
  const investigations: string[] = [];
  const refresh_urls: string[] = [];
  let gaining = 0;
  let converting = 0;
  let notIndexed = 0;
  for (const row of input.records) {
    if (row.impressions > 0 && row.ranking_visibility > 0.4) {
      gaining += 1;
      const cluster = row.url.split("/").filter(Boolean)[2];
      if (cluster) cluster_priority_boosts.push(cluster);
    }
    if (row.conversions > 0 || row.organic_leads > 0) converting += 1;
    if (row.indexation === "not_indexed" || row.indexation === "deindexed") {
      notIndexed += 1;
      investigations.push(row.url);
    }
    if (row.impressions < 0 && row.ranking_visibility < 0.2) refresh_urls.push(row.url);
    if (row.sales_usage > 0) {
      const cluster = row.url.split("/").filter(Boolean)[2];
      if (cluster) cluster_priority_boosts.push(cluster);
    }
  }
  const velocity_adjustment =
    notIndexed > 0 || input.velocity.duplicate_risk >= 0.6 || input.velocity.quality_pass_rate < 0.7
      ? "REDUCE"
      : gaining > 0 && converting > 0 && input.velocity.indexation_health >= 0.75
        ? "INCREASE"
        : "HOLD";
  return {
    cluster_priority_boosts: [...new Set(cluster_priority_boosts)],
    velocity_adjustment,
    investigations,
    refresh_urls,
  };
}

export function evaluateOrganicIndexationGate(input: {
  published_at: string;
  now: string;
  indexation: OrganicAsset["indexation"];
  threshold_hours?: number;
}): OrganicNamedGate {
  const hours = (Date.parse(input.now) - Date.parse(input.published_at)) / 3600000;
  const threshold = input.threshold_hours ?? 72;
  const late = hours >= threshold && (input.indexation === "published" || input.indexation === "discovered" || input.indexation === "not_indexed");
  return {
    gate: ORGANIC_INDEXATION_GATE,
    result: late ? "FAIL" : "PASS",
    reasons: late ? ["not_indexed_after_threshold"] : [],
  };
}

export function evaluateOrganicGrowthPerformanceFeedbackGate(records: OrganicPerformanceRecord[]): OrganicNamedGate {
  return {
    gate: ORGANIC_GROWTH_PERFORMANCE_FEEDBACK_GATE,
    result: "PASS",
    reasons: records.length ? ["feedback_applied"] : ["no_performance_yet"],
  };
}

export function buildOrganicPerformanceObservations(records: OrganicPerformanceRecord[], ventureId: string) {
  return records.map((row) => ({
    observationId: `organic-perf:${ventureId}:${row.url}`,
    sourceId: "organic-growth-continuous-v2",
    ventureId,
    sourceReference: row.url,
    idempotencyKey: `organic-perf:${ventureId}:${row.url}:${row.indexation}`,
    observedAt: new Date().toISOString(),
    rawMetric: "organic_clicks",
    rawValue: row.clicks,
    rawUnit: "count",
    description: "Organic continuous publishing performance",
    pageId: row.url,
    dimensions: {
      indexation: row.indexation,
      impressions: row.impressions,
      sales_usage: row.sales_usage,
      geo_visibility: row.geo_visibility,
    },
    provenance: { engine: "organic_growth_continuous_publishing_v2" },
  }));
}
