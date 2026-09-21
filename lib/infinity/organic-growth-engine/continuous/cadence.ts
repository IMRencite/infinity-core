import { ORGANIC_CADENCE_DEFAULT, ORGANIC_CONTENT_VELOCITY_GATE, ORGANIC_PUBLISHING_CADENCE_GATE } from "./contract";
import type { ContentOpportunity, OrganicCadenceDecision, OrganicNamedGate } from "./types";

export type VelocityInputs = {
  topic_universe_size: number;
  topical_coverage: number;
  content_gap_count: number;
  question_demand: number;
  search_demand: number;
  commercial_value: number;
  venture_maturity: "NEW" | "GROWING" | "MATURE" | "SMALL_NICHE";
  crawl_health: number;
  indexation_health: number;
  organic_impressions: number;
  organic_clicks: number;
  geo_visibility: number;
  conversion_performance: number;
  engagement: number;
  duplicate_risk: number;
  refresh_backlog: number;
  site_authority: number;
  publishing_success_rate: number;
  quality_pass_rate: number;
};

export function defaultVelocityInputs(overrides: Partial<VelocityInputs> = {}): VelocityInputs {
  return {
    topic_universe_size: 40,
    topical_coverage: 0.2,
    content_gap_count: 12,
    question_demand: 0.7,
    search_demand: 0.55,
    commercial_value: 0.7,
    venture_maturity: "NEW",
    crawl_health: 0.85,
    indexation_health: 0.85,
    organic_impressions: 0,
    organic_clicks: 0,
    geo_visibility: 0.2,
    conversion_performance: 0.2,
    engagement: 0.2,
    duplicate_risk: 0.1,
    refresh_backlog: 0,
    site_authority: 0.4,
    publishing_success_rate: 1,
    quality_pass_rate: 0.9,
    ...overrides,
  };
}

export function decideVentureContentVelocity(input: VelocityInputs): { min: number; max: number; band: string } {
  if (input.duplicate_risk >= 0.6 || input.indexation_health < 0.55 || input.quality_pass_rate < 0.7) {
    return { min: 0, max: 1, band: "REDUCED" };
  }
  if (input.venture_maturity === "SMALL_NICHE") return { min: 0, max: 2, band: "SMALL_NICHE" };
  if (input.venture_maturity === "MATURE") return { min: 1, max: 3, band: "MATURE" };
  if (input.content_gap_count >= 8 && input.indexation_health >= 0.75 && input.quality_pass_rate >= 0.8) {
    return { min: 3, max: 5, band: "LARGE_CONTENT_GAP" };
  }
  return { min: ORGANIC_CADENCE_DEFAULT.target_min, max: ORGANIC_CADENCE_DEFAULT.target_max, band: "NEW_VENTURE" };
}

export function decideOrganicPublishingCadence(input: {
  strong_opportunities: ContentOpportunity[];
  velocity: { min: number; max: number };
  quality_override?: boolean;
}): OrganicCadenceDecision {
  const strong = input.strong_opportunities.filter((row) => row.score >= 55 && row.content_type !== "CONTENT_REFRESH");
  const limit = input.velocity.max;
  if (input.quality_override === false) {
    return {
      target_min: input.velocity.min,
      target_max: limit,
      allowed_new_urls: 0,
      refresh_slots: Math.max(limit, 1),
      reason: "quality_gate_blocks_quota",
    };
  }
  if (strong.length >= 4) {
    return {
      target_min: input.velocity.min,
      target_max: limit,
      allowed_new_urls: Math.min(limit, strong.length),
      refresh_slots: 0,
      reason: "enough_strong_opportunities",
    };
  }
  if (strong.length >= 2) {
    return {
      target_min: input.velocity.min,
      target_max: limit,
      allowed_new_urls: Math.min(2, limit),
      refresh_slots: Math.max(0, limit - 2),
      reason: "two_strong_opportunities",
    };
  }
  if (strong.length === 1) {
    return {
      target_min: input.velocity.min,
      target_max: limit,
      allowed_new_urls: 1,
      refresh_slots: Math.max(0, limit - 1),
      reason: "one_strong_opportunity_plus_refresh",
    };
  }
  return {
    target_min: input.velocity.min,
    target_max: limit,
    allowed_new_urls: 0,
    refresh_slots: Math.max(limit, 1),
    reason: "no_strong_opportunities_refresh_substitution",
  };
}

export function scheduleContentRefresh(input: {
  last_reviewed?: string | null;
  last_updated?: string | null;
  impressions_delta?: number;
  ranking_delta?: number;
  stale_facts?: boolean;
  stale_sources?: boolean;
  new_questions?: number;
  geo_weak?: boolean;
  conversion_weak?: boolean;
  topic_kind?: "evergreen" | "market" | "regulated";
  now: string;
}): { due: boolean; next_review_due: string; reason: string } {
  const days = input.topic_kind === "regulated" ? 30 : input.topic_kind === "market" ? 60 : 180;
  const last = Date.parse(input.last_reviewed ?? input.last_updated ?? "1970-01-01");
  const dueByAge = Date.parse(input.now) - last > days * 86400000;
  const dueByPerf = (input.impressions_delta ?? 0) < -0.2 || (input.ranking_delta ?? 0) < -0.2;
  const due = Boolean(dueByAge || dueByPerf || input.stale_facts || input.stale_sources || (input.new_questions ?? 0) > 0 || input.geo_weak || input.conversion_weak);
  return {
    due,
    next_review_due: new Date(Date.parse(input.now) + days * 86400000).toISOString(),
    reason: dueByPerf ? "performance_decline" : input.stale_sources ? "stale_sources" : dueByAge ? "review_cycle" : due ? "coverage_gap" : "fresh",
  };
}

export function evaluateOrganicPublishingCadenceGate(decision: OrganicCadenceDecision): OrganicNamedGate {
  const reasons: string[] = [];
  if (decision.allowed_new_urls > decision.target_max) reasons.push("exceeds_target_max");
  if (decision.allowed_new_urls > 0 && decision.reason.includes("no_strong")) reasons.push("quota_without_quality");
  return { gate: ORGANIC_PUBLISHING_CADENCE_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateOrganicContentVelocityGate(input: VelocityInputs, allowed: number): OrganicNamedGate {
  const velocity = decideVentureContentVelocity(input);
  const reasons: string[] = [];
  if (allowed > velocity.max) reasons.push("velocity_exceeds_band");
  if (input.duplicate_risk >= 0.6 && allowed > 1) reasons.push("duplicate_risk_requires_reduction");
  if (input.indexation_health < 0.55 && allowed > 1) reasons.push("indexation_requires_reduction");
  return { gate: ORGANIC_CONTENT_VELOCITY_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}
