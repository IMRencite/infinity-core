export const VENTURE_ECONOMICS_INTELLIGENCE_CONTRACT = "VentureEconomicsIntelligenceContract" as const;
export const VENTURE_COMPETITOR_INTELLIGENCE_CONTRACT = "VentureCompetitorIntelligenceContract" as const;
export const VENTURE_ECONOMICS_CONFIDENCE_CONTRACT = "VentureEconomicsConfidenceContract" as const;

export const VENTURE_ECONOMICS_READINESS_GATE = "VentureEconomicsReadinessGate" as const;
export const VENTURE_COMPETITOR_RESEARCH_GATE = "VentureCompetitorResearchGate" as const;
export const VENTURE_COMMERCIAL_INTELLIGENCE_GATE = "VentureCommercialIntelligenceGate" as const;
export const VENTURE_ECONOMICS_FRESHNESS_GATE = "VentureEconomicsFreshnessGate" as const;
export const PROFIT_LAB_COMPLETENESS_GATE = "ProfitLabCompletenessGate" as const;
export const HQ_VENTURE_ECONOMICS_VISIBILITY_GATE = "HQVentureEconomicsVisibilityGate" as const;

export const EMPTY_ECONOMICS_IS_A_NO_GO = "EMPTY ECONOMICS IS A NO-GO." as const;
export const UNKNOWN_REQUIRES_COMPLETED_RESEARCH =
  "UNKNOWN is valid only after research ran and evidence remains insufficient." as const;
export const UNKNOWN_IS_NOT_ZERO = "UNKNOWN COST != ZERO COST. UNKNOWN CAC != ZERO CAC." as const;
export const RESEARCH_NEVER_RAN = "RESEARCH_NEVER_RAN" as const;
export const INSUFFICIENT_COMPETITOR_EVIDENCE = "INSUFFICIENT_COMPETITOR_EVIDENCE" as const;

export const ECONOMICS_PRELIMINARY = "ECONOMICS_PRELIMINARY" as const;
export const ECONOMICS_COMMERCIALIZATION_READY = "ECONOMICS_COMMERCIALIZATION_READY" as const;
export type EconomicsStage = typeof ECONOMICS_PRELIMINARY | typeof ECONOMICS_COMMERCIALIZATION_READY;

export const EVIDENCE_CLASSES = ["OBSERVED", "DERIVED", "ESTIMATED", "HYPOTHESIS", "UNKNOWN"] as const;
export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

export const COMPETITOR_TYPES = [
  "DIRECT_COMPETITOR",
  "INDIRECT_COMPETITOR",
  "SUBSTITUTE",
  "MANUAL_PROCESS",
  "STATUS_QUO",
] as const;
export type CompetitorType = (typeof COMPETITOR_TYPES)[number];

export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const ECONOMICS_STATUSES = [
  "RESEARCH_REQUIRED",
  "RESEARCH_COMPLETE_INSUFFICIENT_EVIDENCE",
  "PRELIMINARY",
  "COMMERCIALIZATION_READY",
] as const;
export type EconomicsStatus = (typeof ECONOMICS_STATUSES)[number];

export const PROFIT_LAB_ROOM_STATES = [
  "ACTIVE",
  "WAITING",
  "BLOCKED",
  "RESEARCH_REQUIRED",
  "AUTHORIZATION_REQUIRED",
  "IDLE",
] as const;
export type ProfitLabRoomState = (typeof PROFIT_LAB_ROOM_STATES)[number];

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type ClassifiedValue = {
  display: string;
  numeric: number | null;
  unit: string | null;
  classification: EvidenceClass;
  note: string;
};

export type EconomicsEvidenceRef = {
  id: string;
  label: string;
  url: string | null;
  retrieved_at: string;
  classification: EvidenceClass;
};

export type CompetitorRecord = {
  name: string;
  type: CompetitorType;
  website: string | null;
  customer_segment: string;
  primary_offer: string;
  observed_pricing: ClassifiedValue;
  pricing_model: string;
  free_tier_or_trial: string;
  key_features: string[];
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  differentiation_opportunity: string;
  evidence_source: string;
  retrieved_at: string;
  confidence: ConfidenceLevel;
};

export type PricingBenchmark = {
  name: string;
  amount_display: string;
  amount_usd: number | null;
  interval: string;
  pricing_model: string;
  classification: EvidenceClass;
  source: string;
  retrieved_at: string;
  confidence: ConfidenceLevel;
};

export type MonetizationModelEval = {
  model: string;
  fit: "PLAUSIBLE" | "WEAK" | "REJECTED" | "UNKNOWN";
  rationale: string;
  classification: EvidenceClass;
};

export type ScenarioCase = {
  name: "LOW" | "BASE" | "HIGH";
  price: ClassifiedValue;
  conversion: ClassifiedValue;
  cac: ClassifiedValue;
  retention: ClassifiedValue;
  revenue: ClassifiedValue;
  gross_margin: ClassifiedValue;
  contribution_margin: ClassifiedValue;
  cac_payback: ClassifiedValue;
  ltv: ClassifiedValue;
  ltv_cac: ClassifiedValue;
  break_even_customers: ClassifiedValue;
};

export type ConfidenceDimensions = {
  competitor_evidence: ConfidenceLevel;
  pricing_evidence: ConfidenceLevel;
  demand_evidence: ConfidenceLevel;
  cost_evidence: ConfidenceLevel;
  cac_evidence: ConfidenceLevel;
  retention_evidence: ConfidenceLevel;
  margin_confidence: ConfidenceLevel;
};

export type VentureEconomicsConfidenceRecord = {
  contract: typeof VENTURE_ECONOMICS_CONFIDENCE_CONTRACT;
  overall: ConfidenceLevel;
  dimensions: ConfidenceDimensions;
};

export type UnitEconomicsBlock = {
  price: ClassifiedValue;
  revenue_per_customer: ClassifiedValue;
  revenue_frequency: ClassifiedValue;
  variable_delivery_cost: ClassifiedValue;
  provider_api_cost: ClassifiedValue;
  infrastructure_allocation: ClassifiedValue;
  support_cost: ClassifiedValue;
  payment_processing_cost: ClassifiedValue;
  gross_profit: ClassifiedValue;
  gross_margin: ClassifiedValue;
  contribution_profit: ClassifiedValue;
  contribution_margin: ClassifiedValue;
};

export type VentureEconomicsIntelligenceRecord = {
  contract: typeof VENTURE_ECONOMICS_INTELLIGENCE_CONTRACT;
  competitor_contract: typeof VENTURE_COMPETITOR_INTELLIGENCE_CONTRACT;
  venture_id: string;
  venture_name: string;
  opportunity_id: string;
  research_run_id: string;
  economics_version: number;
  generated_at: string;
  last_verified_at: string;
  stage: EconomicsStage;
  market_category: string;
  customer_segment: string;
  primary_job_to_be_done: string;
  competitors: CompetitorRecord[];
  substitutes: CompetitorRecord[];
  competitor_research_status: "PASS" | typeof INSUFFICIENT_COMPETITOR_EVIDENCE;
  pricing_benchmarks: PricingBenchmark[];
  monetization_models: MonetizationModelEval[];
  recommended_monetization_model: string;
  recommended_pricing_hypothesis: string;
  revenue_model: string;
  estimated_variable_costs: ClassifiedValue;
  estimated_fixed_costs: ClassifiedValue;
  gross_margin_model: ClassifiedValue;
  contribution_margin_model: ClassifiedValue;
  customer_acquisition_model: ClassifiedValue;
  lifetime_value_model: ClassifiedValue;
  ltv_cac_ratio: ClassifiedValue;
  payback_period: ClassifiedValue;
  break_even_model: ClassifiedValue;
  unit_economics: UnitEconomicsBlock;
  low_case: ScenarioCase;
  base_case: ScenarioCase;
  high_case: ScenarioCase;
  economic_risks: string[];
  economic_unknowns: string[];
  evidence: EconomicsEvidenceRef[];
  confidence: VentureEconomicsConfidenceRecord;
  status: EconomicsStatus;
  research_ran: boolean;
  fabricated_competitors: 0;
  production_advancement: "UNCHANGED" | "PAUSED";
};

export type ProfitLabHqRow = {
  venture_id: string;
  venture_name: string;
  monetization_model: string;
  current_price: string;
  competitor_price_range: string;
  gross_margin: string;
  contribution_margin: string;
  cac: string;
  ltv: string;
  ltv_cac: string;
  payback: string;
  break_even: string;
  confidence: ConfidenceLevel;
  last_research: string;
  next_refresh: string;
  freshness: string;
  room_state: ProfitLabRoomState;
  room_state_label: string;
  research_ran: boolean;
  unknowns: string[];
};

export type ProfitLabNamedValue = {
  label: string;
  value: string;
  classification: string;
};

export type ProfitLabScenarioCard = {
  name: "LOW" | "BASE" | "HIGH";
  lines: ProfitLabNamedValue[];
};

export type ProfitLabExpectedActual = {
  metric: string;
  expected: string;
  actual: string;
  variance: string;
  evidence_status: string;
};

export type ProfitLabHqVentureCard = {
  venture_id: string;
  venture_name: string;
  research_required: boolean;
  research_ran: boolean;
  production_note: string | null;
  room_state_label: string;
  monetization_model: string;
  monetization_why: string;
  monetization_options: Array<{ model: string; fit: string; rationale: string }>;
  current_price: string;
  pricing_benchmarks: Array<{ name: string; amount: string; classification: string; source: string }>;
  unit_economics: ProfitLabNamedValue[];
  cac: string;
  ltv: string;
  ltv_cac: string;
  payback: string;
  break_even: string;
  scenarios: ProfitLabScenarioCard[];
  unknowns: string[];
  risks: string[];
  confidence_overall: string;
  confidence_dimensions: ProfitLabNamedValue[];
  expected_vs_actual: ProfitLabExpectedActual[];
  last_research: string;
  next_refresh: string;
  freshness: string;
  current_version: number;
  prior_snapshots: number;
};

export type ProfitLabFinancialLine = {
  label: string;
  value: string;
  layer: "MODELED" | "ACTUAL" | "FORECAST" | "BUDGET";
};

export type ProfitLabVentureFinancialProjection = {
  venture_id: string;
  modeled: ProfitLabFinancialLine[];
  actual: ProfitLabFinancialLine[];
  forecast: ProfitLabFinancialLine[];
  budget: ProfitLabFinancialLine[];
  transaction_count: number;
  freshness: {
    last_payment_sync: string | null;
    last_cost_sync: string | null;
    last_ledger_calc: string | null;
    stale: boolean;
    labels: string[];
  };
  layers_separated: true;
};

export type ProfitLabPortfolioCapitalProjection = {
  authorized_capital: string;
  allocated: string;
  spent: string;
  committed: string;
  reserved: string;
  remaining: string;
  known_monthly_burn: string;
  estimated_monthly_burn: string;
  monthly_burn: string;
  monthly_burn_state: "KNOWN" | "PARTIAL" | "UNKNOWN";
  monthly_burn_completeness: string;
  missing_cost_categories: string;
  monthly_burn_cap: string;
  revenue: string;
  operating_contribution: string;
  active_ventures: number;
  pre_revenue_ventures: number;
  profitable_ventures: number;
  unvalidated_capital_at_risk: string;
  active_build_count: number;
  new_venture_creation_state: string;
  discovery_may_continue: true;
  new_spend_build_may_begin: boolean;
};

export type ProfitLabOfferProjection = {
  venture_id: string;
  pricing_architecture: string;
  purchase_model: string;
  promotional_offer: string;
  offer_optimization: string;
  conversion_ux: string;
  above_fold_cta: string;
  panel_spacing: string;
  card_required: string;
  auto_convert: string;
  pricing_content_depth: string;
  page: string;
  information_depth: string;
  question_coverage: string;
  product_understanding: string;
  buyer_decision_support: string;
  information_gain: string;
  thinness: string;
  missing_material_questions: number;
  page_depth_summary?: string;
  page_depth_thin_pages?: string;
  page_depth_missing_questions?: string;
  whitespace: string;
  current_offer: string;
  offer_type: string;
  trial_pilot: string;
  purchase_friction: string;
  time_to_value: string;
  customer_suggestion_signals: string;
  current_experiment?: string;
};

export type ProfitLabHqView = {
  inspected_venture_id?: string | null;
  projection_error?: string | null;
  room_state: ProfitLabRoomState;
  room_state_label: string;
  empty_canonical_rooms: number;
  rows: ProfitLabHqRow[];
  ventures: ProfitLabHqVentureCard[];
  financials?: ProfitLabVentureFinancialProjection[];
  portfolio_capital?: ProfitLabPortfolioCapitalProjection;
  competitors: Array<{
    venture_name: string;
    name: string;
    type_label: string;
    observed_pricing: string;
    positioning: string;
    differentiation: string;
    source: string;
    last_checked: string;
    confidence: string;
  }>;
  evidence: Array<EconomicsEvidenceRef & { venture_name: string; claim: string }>;
  pricing_benchmarks: Array<{
    venture_name: string;
    name: string;
    amount: string;
    classification: string;
    source: string;
  }>;
  offer_architecture?: ProfitLabOfferProjection[];
};

export type EconomicsStoreFile = {
  qcVersion: "GLOBAL_VENTURE_ECONOMICS_ASSURANCE_V1";
  current: VentureEconomicsIntelligenceRecord[];
  history: VentureEconomicsIntelligenceRecord[];
};
