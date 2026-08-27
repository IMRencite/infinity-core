import type { InspectorSection, InspectorSectionRow } from "../artifacts/inspector-types";
import type { HQEntityDetailMetric } from "./entity-detail-types";

export const INSIGHT_METRIC_IDS = {
  opportunityQuality: "opportunity-quality",
  historicalOpportunityQuality: "historical-opportunity-quality",
  selectionScore: "selection-score",
  selectionScoreValidateThreshold: "selection-score-validate-threshold",
  portfolioAdjustedScore: "portfolio-adjusted-score",
  portfolioAdjustment: "portfolio-adjustment",
  validationScore: "validation-score",
  monetizationScore: "monetization-score",
  validateThreshold: "validate-threshold",
  rejectThreshold: "reject-threshold",
  buildReadiness: "build-readiness",
} as const;

export type InsightMetricId = (typeof INSIGHT_METRIC_IDS)[keyof typeof INSIGHT_METRIC_IDS];

/**
 * Build readiness is the canonical boolean `buildReady`, never the decision string.
 * HOLD / VALIDATE / REJECT / BUILD are decisions, not readiness.
 */
export function formatBuildReadyDisplay(buildReady: unknown): string {
  return buildReady === true || buildReady === "YES" ? "YES" : "NO";
}

const HARVEST_LABEL = /score|risk|roi|ltv|cac|revenue|cost|confidence/i;

export function metricIdFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function insightMetricRow(
  id: string,
  label: string,
  value: string,
  tone?: InspectorSectionRow["tone"],
): InspectorSectionRow {
  return { id, label, value, tone, insightMetric: true };
}

export function namedInspectorRow(
  id: string,
  label: string,
  value: string,
  tone?: InspectorSectionRow["tone"],
): InspectorSectionRow {
  return { id, label, value, tone };
}

export function reactKeyForInsightMetric(metric: Pick<HQEntityDetailMetric, "id" | "kind" | "label">): string {
  if (metric.id) return metric.id;
  return `${metric.kind ?? "metric"}:${metric.label}`;
}

export function dedupeInsightMetrics(metrics: HQEntityDetailMetric[]): HQEntityDetailMetric[] {
  const byId = new Map<string, HQEntityDetailMetric>();
  for (const metric of metrics) {
    const id = metric.id;
    if (!id) {
      throw new Error("INSIGHT_METRIC_MISSING_ID");
    }
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, metric);
      continue;
    }
    if (existing.value !== metric.value || existing.label !== metric.label) {
      throw new Error(
        `INSIGHT_METRIC_ID_CONFLICT id=${id} existing=${existing.label}:${existing.value} incoming=${metric.label}:${metric.value}`,
      );
    }
  }
  return [...byId.values()];
}

function toMetric(row: InspectorSectionRow, kind: HQEntityDetailMetric["kind"]): HQEntityDetailMetric {
  return {
    id: row.id ?? metricIdFromLabel(row.label),
    label: row.label,
    value: row.value,
    tone: row.tone,
    kind,
  };
}

export function collectInsightMetrics(sections: InspectorSection[]): HQEntityDetailMetric[] {
  const tagged: HQEntityDetailMetric[] = [];
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.insightMetric) tagged.push(toMetric(row, "insight-metric"));
    }
  }
  if (tagged.length > 0) return dedupeInsightMetrics(tagged);

  const harvested: HQEntityDetailMetric[] = [];
  for (const section of sections) {
    for (const row of section.rows.slice(0, 8)) {
      if (!HARVEST_LABEL.test(row.label)) continue;
      harvested.push(toMetric(row, "harvested"));
    }
  }
  return dedupeInsightMetrics(harvested.slice(0, 12));
}
