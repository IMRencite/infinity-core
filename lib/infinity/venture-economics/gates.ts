import {
  HQ_VENTURE_ECONOMICS_VISIBILITY_GATE,
  PROFIT_LAB_COMPLETENESS_GATE,
  RESEARCH_NEVER_RAN,
  VENTURE_COMMERCIAL_INTELLIGENCE_GATE,
  VENTURE_COMPETITOR_RESEARCH_GATE,
  VENTURE_ECONOMICS_FRESHNESS_GATE,
  VENTURE_ECONOMICS_READINESS_GATE,
  type NamedGateResult,
  type ProfitLabHqView,
  type VentureEconomicsIntelligenceRecord,
} from "./types";

const FRESHNESS_MS = 90 * 24 * 60 * 60 * 1000;

function fail(gate: string, reasons: string[]): NamedGateResult {
  return { gate, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureCompetitorResearchGate(
  record: VentureEconomicsIntelligenceRecord | null,
): NamedGateResult {
  if (!record) return fail(VENTURE_COMPETITOR_RESEARCH_GATE, [RESEARCH_NEVER_RAN]);
  if (!record.research_ran) return fail(VENTURE_COMPETITOR_RESEARCH_GATE, [RESEARCH_NEVER_RAN]);
  const refs = [...record.competitors, ...record.substitutes];
  if (refs.length === 0) {
    return fail(VENTURE_COMPETITOR_RESEARCH_GATE, ["COMPETITOR_INTELLIGENCE_MISSING"]);
  }
  if (record.fabricated_competitors !== 0) {
    return fail(VENTURE_COMPETITOR_RESEARCH_GATE, ["FABRICATED_COMPETITORS"]);
  }
  if (record.competitor_research_status !== "PASS" && record.evidence.length === 0) {
    return fail(VENTURE_COMPETITOR_RESEARCH_GATE, ["INSUFFICIENT_COMPETITOR_EVIDENCE_WITHOUT_SEARCH_PROOF"]);
  }
  return fail(VENTURE_COMPETITOR_RESEARCH_GATE, []);
}

export function evaluateVentureEconomicsReadinessGate(
  record: VentureEconomicsIntelligenceRecord | null,
): NamedGateResult {
  if (!record) return fail(VENTURE_ECONOMICS_READINESS_GATE, [RESEARCH_NEVER_RAN, "REQUIRED_ECONOMICS_BLANK"]);
  const reasons: string[] = [];
  if (!record.research_ran) reasons.push(RESEARCH_NEVER_RAN);
  if (!record.recommended_monetization_model) reasons.push("MONETIZATION_MODEL_BLANK");
  if (record.pricing_benchmarks.length === 0) reasons.push("PRICING_INTELLIGENCE_BLANK");
  if (!record.unit_economics.price.display) reasons.push("UNIT_ECONOMICS_BLANK");
  if (!record.low_case || !record.base_case || !record.high_case) reasons.push("SCENARIOS_BLANK");
  if (!record.confidence.overall) reasons.push("CONFIDENCE_BLANK");
  const competitor = evaluateVentureCompetitorResearchGate(record);
  if (competitor.result === "FAIL") reasons.push(...competitor.reasons);
  return fail(VENTURE_ECONOMICS_READINESS_GATE, reasons);
}

export function evaluateVentureCommercialIntelligenceGate(
  record: VentureEconomicsIntelligenceRecord | null,
): NamedGateResult {
  const readiness = evaluateVentureEconomicsReadinessGate(record);
  if (readiness.result === "FAIL") {
    return { gate: VENTURE_COMMERCIAL_INTELLIGENCE_GATE, result: "FAIL", reasons: readiness.reasons };
  }
  return { gate: VENTURE_COMMERCIAL_INTELLIGENCE_GATE, result: "PASS", reasons: [] };
}

export function evaluateVentureEconomicsFreshnessGate(
  record: VentureEconomicsIntelligenceRecord | null,
  now = Date.now(),
): NamedGateResult {
  if (!record) return fail(VENTURE_ECONOMICS_FRESHNESS_GATE, [RESEARCH_NEVER_RAN]);
  const verified = Date.parse(record.last_verified_at);
  if (!Number.isFinite(verified) || now - verified > FRESHNESS_MS) {
    return fail(VENTURE_ECONOMICS_FRESHNESS_GATE, ["ECONOMICS_STALE"]);
  }
  return fail(VENTURE_ECONOMICS_FRESHNESS_GATE, []);
}

export function evaluateProfitLabCompletenessGate(view: ProfitLabHqView): NamedGateResult {
  const reasons: string[] = [];
  if (view.empty_canonical_rooms > 0) reasons.push(`EMPTY_PROFIT_LAB_ROOMS:${view.empty_canonical_rooms}`);
  if (view.rows.length === 0) reasons.push("PROFIT_LAB_ROWS_MISSING");
  for (const row of view.rows) {
    if (!row.research_ran) reasons.push(`RESEARCH_REQUIRED:${row.venture_id}`);
    if (!row.monetization_model || !row.current_price || !row.confidence) {
      reasons.push(`INCOMPLETE_ROW:${row.venture_id}`);
    }
    if (row.current_price === "" || row.current_price === "$0") {
      reasons.push(`BLANK_OR_ZERO_PRICE:${row.venture_id}`);
    }
  }
  return fail(PROFIT_LAB_COMPLETENESS_GATE, reasons);
}

export function evaluateHQVentureEconomicsVisibilityGate(input: {
  view: ProfitLabHqView;
  artifactsVisible: boolean;
  rendered?: {
    ventureId?: string | null;
    lifecycle?: string | null;
    competitorsVisible?: boolean;
    pricingVisible?: boolean;
    scenariosVisible?: boolean;
    unknownsVisible?: boolean;
    evidenceVisible?: boolean;
    confidenceVisible?: boolean;
    genericFallback?: boolean;
    wrongVenture?: boolean;
  } | null;
}): NamedGateResult {
  const completeness = evaluateProfitLabCompletenessGate(input.view);
  const reasons = [...completeness.reasons];
  if (!input.artifactsVisible) reasons.push("ECONOMICS_HIDDEN_FROM_HQ");
  if (input.view.competitors.length === 0) reasons.push("COMPETITORS_NOT_VISIBLE");
  if (input.view.evidence.length === 0) reasons.push("EVIDENCE_NOT_VISIBLE");
  if (input.view.pricing_benchmarks.length === 0) reasons.push("PRICING_BENCHMARKS_NOT_VISIBLE");
  if (input.rendered) {
    if (input.rendered.wrongVenture) reasons.push("RENDERED_IDENTITY_MISMATCH");
    if (input.rendered.genericFallback) reasons.push("GENERIC_PLACEHOLDER_RENDERED");
    if (input.rendered.competitorsVisible === false) reasons.push("COMPETITORS_NOT_VISIBLE");
    if (input.rendered.pricingVisible === false) reasons.push("PRICING_NOT_VISIBLE");
    if (input.rendered.scenariosVisible === false) reasons.push("SCENARIOS_NOT_VISIBLE");
    if (input.rendered.unknownsVisible === false) reasons.push("UNKNOWNS_NOT_VISIBLE");
    if (input.rendered.evidenceVisible === false) reasons.push("EVIDENCE_NOT_VISIBLE");
    if (input.rendered.confidenceVisible === false) reasons.push("CONFIDENCE_NOT_VISIBLE");
    if (!input.rendered.lifecycle) reasons.push("LIFECYCLE_NOT_VISIBLE");
  }
  for (const card of input.view.ventures) {
    if (card.research_required) continue;
    if (card.scenarios.length !== 3) reasons.push(`SCENARIOS_HIDDEN:${card.venture_id}`);
    if (card.unit_economics.length < 6) reasons.push(`UNIT_ECONOMICS_HIDDEN:${card.venture_id}`);
    if (card.expected_vs_actual.length === 0) reasons.push(`EXPECTED_VS_ACTUAL_HIDDEN:${card.venture_id}`);
    if (!card.payback) reasons.push(`PAYBACK_HIDDEN:${card.venture_id}`);
    if (card.confidence_dimensions.length < 4) reasons.push(`CONFIDENCE_DIMENSIONS_HIDDEN:${card.venture_id}`);
    if (!card.monetization_why) reasons.push(`MONETIZATION_ANALYSIS_HIDDEN:${card.venture_id}`);
  }
  return fail(HQ_VENTURE_ECONOMICS_VISIBILITY_GATE, reasons);
}

export function missingEconomicsBlocksAdvancement(record: VentureEconomicsIntelligenceRecord | null): boolean {
  return evaluateVentureCommercialIntelligenceGate(record).result === "FAIL";
}
