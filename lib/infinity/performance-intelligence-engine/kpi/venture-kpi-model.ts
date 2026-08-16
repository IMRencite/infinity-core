import { randomUUID } from "node:crypto";
import type { VentureModelType } from "../constants";
import type { VentureKPIModel, VenturePerformanceContext } from "../types";
import { listMetricsForVentureType } from "../registry/metric-registry";

const KPI_SETS: Record<
  VentureModelType,
  { primary: string[]; secondary: string[]; guardrails: string[]; rationale: string[] }
> = {
  lead_gen: {
    primary: ["leads", "conversion_rate", "cac", "gross_revenue"],
    secondary: ["sessions", "ctr", "clicks"],
    guardrails: ["provider_cost", "build_cost"],
    rationale: ["Lead-gen ventures optimize qualified lead volume and cost efficiency"],
  },
  subscription: {
    primary: ["mrr", "conversion_rate", "cac", "gross_revenue"],
    secondary: ["sessions", "conversions"],
    guardrails: ["provider_cost", "repair_count"],
    rationale: ["Subscription ventures optimize recurring revenue and trial conversion"],
  },
  marketplace: {
    primary: ["gmv", "conversions", "conversion_rate", "gross_revenue"],
    secondary: ["sessions", "clicks"],
    guardrails: ["provider_cost", "execution_success_rate"],
    rationale: ["Marketplace ventures optimize GMV and transaction liquidity"],
  },
  content_media: {
    primary: ["sessions", "ctr", "watch_time", "gross_revenue"],
    secondary: ["impressions", "clicks", "roas"],
    guardrails: ["provider_cost", "build_cost"],
    rationale: ["Content/media ventures optimize traffic, engagement, and media ROI"],
  },
  generic: {
    primary: ["sessions", "conversion_rate", "gross_revenue"],
    secondary: ["clicks", "provider_cost"],
    guardrails: ["build_cost", "repair_count"],
    rationale: ["Generic fallback KPI model when venture type is unspecified"],
  },
};

export function buildVentureKPIModel(context: VenturePerformanceContext): VentureKPIModel {
  const set = KPI_SETS[context.ventureModelType];
  const applicable = listMetricsForVentureType(context.ventureModelType).map((m) => m.name);
  const filterApplicable = (metrics: string[]) => metrics.filter((m) => applicable.includes(m));

  return {
    modelId: randomUUID(),
    ventureId: context.ventureId,
    ventureModelType: context.ventureModelType,
    primaryMetrics: filterApplicable(set.primary),
    secondaryMetrics: filterApplicable(set.secondary),
    guardrailMetrics: filterApplicable(set.guardrails),
    rationale: set.rationale,
  };
}

export function isMetricRelevantForVenture(metric: string, model: VentureKPIModel): boolean {
  return (
    model.primaryMetrics.includes(metric) ||
    model.secondaryMetrics.includes(metric) ||
    model.guardrailMetrics.includes(metric)
  );
}
