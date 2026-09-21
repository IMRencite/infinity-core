import type {
  ClassifiedValue,
  CompetitorType,
  EvidenceClass,
  ProfitLabExpectedActual,
  ProfitLabHqVentureCard,
  ProfitLabNamedValue,
  ProfitLabRoomState,
  ProfitLabScenarioCard,
  ScenarioCase,
  VentureEconomicsIntelligenceRecord,
} from "./types";

export function humanizeCompetitorType(type: CompetitorType): string {
  switch (type) {
    case "DIRECT_COMPETITOR":
      return "Direct competitor";
    case "INDIRECT_COMPETITOR":
      return "Adjacent / indirect competitor";
    case "SUBSTITUTE":
      return "Substitute";
    case "MANUAL_PROCESS":
      return "Manual process";
    case "STATUS_QUO":
      return "Status quo";
  }
}

export function humanizeClassification(value: EvidenceClass | string): string {
  switch (value) {
    case "OBSERVED":
      return "Observed";
    case "DERIVED":
      return "Derived";
    case "ESTIMATED":
      return "Estimated";
    case "HYPOTHESIS":
      return "Hypothesis";
    case "UNKNOWN":
      return "Unknown";
    default:
      return value.replace(/_/g, " ").toLowerCase();
  }
}

export function humanizeRoomState(state: ProfitLabRoomState): string {
  switch (state) {
    case "ACTIVE":
      return "Research running";
    case "WAITING":
      return "Waiting on evidence";
    case "BLOCKED":
      return "Blocked";
    case "RESEARCH_REQUIRED":
      return "Research required";
    case "AUTHORIZATION_REQUIRED":
      return "Authorization required";
    case "IDLE":
      return "Idle";
  }
}

export function freshnessLabel(iso: string, now = Date.now()): string {
  const verified = Date.parse(iso);
  if (!Number.isFinite(verified)) return "Unknown freshness — research required";
  const age = now - verified;
  if (age > 90 * 24 * 60 * 60 * 1000) return "Stale — refresh required";
  return "Current";
}

function named(label: string, value: ClassifiedValue): ProfitLabNamedValue {
  return {
    label,
    value: value.display,
    classification: humanizeClassification(value.classification),
  };
}

function scenarioCard(row: ScenarioCase): ProfitLabScenarioCard {
  return {
    name: row.name,
    lines: [
      named("Price", row.price),
      named("Conversion", row.conversion),
      named("CAC", row.cac),
      named("Retention", row.retention),
      named("Revenue", row.revenue),
      named("Gross margin", row.gross_margin),
      named("Contribution margin", row.contribution_margin),
      named("Payback", row.cac_payback),
      named("LTV", row.ltv),
      named("LTV:CAC", row.ltv_cac),
      named("Break-even customers", row.break_even_customers),
    ],
  };
}

function expectedVsActual(record: VentureEconomicsIntelligenceRecord): ProfitLabExpectedActual[] {
  if (!record.research_ran) {
    return [{
      metric: "Economics",
      expected: "UNKNOWN — RESEARCH REQUIRED",
      actual: "UNKNOWN — RESEARCH REQUIRED",
      variance: "UNKNOWN — RESEARCH REQUIRED",
      evidence_status: "Research has not run",
    }];
  }
  if (record.venture_name === "AskReview" || record.production_advancement === "PAUSED") {
    return [
      {
        metric: "Price",
        expected: record.unit_economics.price.display,
        actual: "No post-launch evidence — production paused",
        variance: "UNKNOWN — no live AskReview charges",
        evidence_status: "Hypothesis only. Do not treat as validated.",
      },
      {
        metric: "CAC / LTV / demand",
        expected: "UNKNOWN after research — no acquisition or retention evidence",
        actual: "No post-launch evidence — production paused",
        variance: "UNKNOWN",
        evidence_status: "Insufficient",
      },
    ];
  }
  return [
    {
      metric: "Published offers",
      expected: record.unit_economics.price.display,
      actual: record.unit_economics.price.display,
      variance: "No list-price change. This is not realized revenue.",
      evidence_status: "Observed live Stripe offers",
    },
    {
      metric: "CAC",
      expected: record.customer_acquisition_model.display,
      actual: "UNKNOWN — no post-launch acquisition data",
      variance: "UNKNOWN",
      evidence_status: "Insufficient. Do not fabricate actual CAC.",
    },
    {
      metric: "LTV / retention",
      expected: record.lifetime_value_model.display,
      actual: "UNKNOWN — Professional renewal and Per-Deal repeat unobserved",
      variance: "UNKNOWN",
      evidence_status: "Insufficient. Do not invent subscription LTV.",
    },
    {
      metric: "Demand / conversion",
      expected: "UNKNOWN — no pre-launch conversion model was validated as fact",
      actual: "UNKNOWN — post-launch demand evidence remains sparse",
      variance: "UNKNOWN",
      evidence_status: "Insufficient",
    },
    {
      metric: "Payment processing cost",
      expected: record.unit_economics.payment_processing_cost.display,
      actual: record.unit_economics.payment_processing_cost.display,
      variance: "Schedule-derived, not a measured average of live charges",
      evidence_status: "Derived from published Stripe US card fees",
    },
  ];
}

export function buildProfitLabVentureCard(
  record: VentureEconomicsIntelligenceRecord,
  priorSnapshots: number,
): ProfitLabHqVentureCard {
  const researchRequired = !record.research_ran;
  return {
    venture_id: record.venture_id,
    venture_name: record.venture_name,
    research_required: researchRequired,
    research_ran: record.research_ran,
    production_note: record.production_advancement === "PAUSED" ? "Production paused" : null,
    room_state_label: researchRequired ? "Research required" : "Waiting on evidence",
    monetization_model: record.recommended_monetization_model || "UNKNOWN — RESEARCH REQUIRED",
    monetization_why: researchRequired
      ? "Competitor, pricing, and monetization research has not run."
      : `${record.recommended_monetization_model} fits ${record.customer_segment} doing ${record.primary_job_to_be_done}. ${record.recommended_pricing_hypothesis}`,
    monetization_options: record.monetization_models.map((row) => ({
      model: row.model,
      fit: row.fit.replace(/_/g, " "),
      rationale: row.rationale,
    })),
    current_price: record.unit_economics.price.display,
    pricing_benchmarks: record.pricing_benchmarks.map((row) => ({
      name: row.name,
      amount: row.amount_display,
      classification: humanizeClassification(row.classification),
      source: row.source,
    })),
    unit_economics: [
      named("Price", record.unit_economics.price),
      named("Revenue per customer", record.unit_economics.revenue_per_customer),
      named("Revenue frequency", record.unit_economics.revenue_frequency),
      named("Payment processing", record.unit_economics.payment_processing_cost),
      named("Provider / API cost", record.unit_economics.provider_api_cost),
      named("Infrastructure", record.unit_economics.infrastructure_allocation),
      named("Support", record.unit_economics.support_cost),
      named("Variable delivery", record.unit_economics.variable_delivery_cost),
      named("Gross profit", record.unit_economics.gross_profit),
      named("Gross margin", record.unit_economics.gross_margin),
      named("Contribution profit", record.unit_economics.contribution_profit),
      named("Contribution margin", record.unit_economics.contribution_margin),
    ],
    cac: record.customer_acquisition_model.display,
    ltv: record.lifetime_value_model.display,
    ltv_cac: record.ltv_cac_ratio.display,
    payback: record.payback_period.display,
    break_even: record.break_even_model.display,
    scenarios: [scenarioCard(record.low_case), scenarioCard(record.base_case), scenarioCard(record.high_case)],
    unknowns: record.economic_unknowns,
    risks: record.economic_risks,
    confidence_overall: record.confidence.overall,
    confidence_dimensions: [
      { label: "Competitor evidence", value: record.confidence.dimensions.competitor_evidence, classification: "Confidence" },
      { label: "Pricing evidence", value: record.confidence.dimensions.pricing_evidence, classification: "Confidence" },
      { label: "Demand evidence", value: record.confidence.dimensions.demand_evidence, classification: "Confidence" },
      { label: "Cost evidence", value: record.confidence.dimensions.cost_evidence, classification: "Confidence" },
      { label: "CAC evidence", value: record.confidence.dimensions.cac_evidence, classification: "Confidence" },
      { label: "Retention evidence", value: record.confidence.dimensions.retention_evidence, classification: "Confidence" },
      { label: "Margin confidence", value: record.confidence.dimensions.margin_confidence, classification: "Confidence" },
    ],
    expected_vs_actual: expectedVsActual(record),
    last_research: record.last_verified_at,
    next_refresh: Number.isFinite(Date.parse(record.last_verified_at))
      ? new Date(Date.parse(record.last_verified_at) + 90 * 24 * 60 * 60 * 1000).toISOString()
      : "UNKNOWN — RESEARCH REQUIRED",
    freshness: freshnessLabel(record.last_verified_at),
    current_version: record.economics_version,
    prior_snapshots: priorSnapshots,
  };
}
