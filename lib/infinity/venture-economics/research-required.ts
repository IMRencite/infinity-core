import { classified, unknownScenario, unknownValue } from "./classified";
import {
  ECONOMICS_PRELIMINARY,
  VENTURE_COMPETITOR_INTELLIGENCE_CONTRACT,
  VENTURE_ECONOMICS_CONFIDENCE_CONTRACT,
  VENTURE_ECONOMICS_INTELLIGENCE_CONTRACT,
  type VentureEconomicsIntelligenceRecord,
} from "./types";

const RESEARCH_NOTE = "Research never ran. UNKNOWN here means work-not-run, which fails readiness.";

export function buildResearchRequiredEconomics(input: {
  venture_id: string;
  venture_name: string;
  opportunity_id: string;
}): VentureEconomicsIntelligenceRecord {
  const blank = unknownValue("required field", "Research has not run for this venture.");
  const price = classified("UNKNOWN — RESEARCH REQUIRED", "UNKNOWN", "No research run yet. This is not a zero price.");
  return {
    contract: VENTURE_ECONOMICS_INTELLIGENCE_CONTRACT,
    competitor_contract: VENTURE_COMPETITOR_INTELLIGENCE_CONTRACT,
    venture_id: input.venture_id,
    venture_name: input.venture_name,
    opportunity_id: input.opportunity_id,
    research_run_id: "RESEARCH_NEVER_RAN",
    economics_version: 0,
    generated_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    stage: ECONOMICS_PRELIMINARY,
    market_category: "UNKNOWN — RESEARCH REQUIRED",
    customer_segment: "UNKNOWN — RESEARCH REQUIRED",
    primary_job_to_be_done: "UNKNOWN — RESEARCH REQUIRED",
    competitors: [],
    substitutes: [],
    competitor_research_status: "INSUFFICIENT_COMPETITOR_EVIDENCE",
    pricing_benchmarks: [],
    monetization_models: [],
    recommended_monetization_model: "",
    recommended_pricing_hypothesis: "UNKNOWN — RESEARCH REQUIRED",
    revenue_model: "UNKNOWN — RESEARCH REQUIRED",
    estimated_variable_costs: blank,
    estimated_fixed_costs: blank,
    gross_margin_model: blank,
    contribution_margin_model: blank,
    customer_acquisition_model: blank,
    lifetime_value_model: blank,
    ltv_cac_ratio: blank,
    payback_period: blank,
    break_even_model: blank,
    unit_economics: {
      price,
      revenue_per_customer: blank,
      revenue_frequency: blank,
      variable_delivery_cost: blank,
      provider_api_cost: blank,
      infrastructure_allocation: blank,
      support_cost: blank,
      payment_processing_cost: blank,
      gross_profit: blank,
      gross_margin: blank,
      contribution_profit: blank,
      contribution_margin: blank,
    },
    low_case: unknownScenario("LOW", price),
    base_case: unknownScenario("BASE", price),
    high_case: unknownScenario("HIGH", price),
    economic_risks: [RESEARCH_NOTE],
    economic_unknowns: ["ALL_REQUIRED_FIELDS"],
    evidence: [],
    confidence: {
      contract: VENTURE_ECONOMICS_CONFIDENCE_CONTRACT,
      overall: "INSUFFICIENT",
      dimensions: {
        competitor_evidence: "INSUFFICIENT",
        pricing_evidence: "INSUFFICIENT",
        demand_evidence: "INSUFFICIENT",
        cost_evidence: "INSUFFICIENT",
        cac_evidence: "INSUFFICIENT",
        retention_evidence: "INSUFFICIENT",
        margin_confidence: "INSUFFICIENT",
      },
    },
    status: "RESEARCH_REQUIRED",
    research_ran: false,
    fabricated_competitors: 0,
    production_advancement: "UNCHANGED",
  };
}
