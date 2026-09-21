import type { EpistemicAmount } from "@/lib/infinity/treasury/types";

export const VENTURE_FINANCIAL_LEDGER_CONTRACT = "VentureFinancialLedgerContract" as const;
export const VENTURE_ECONOMICS_ACTUAL_VS_MODELED_CONTRACT = "VentureEconomicsActualVsModeledContract" as const;
export const VENTURE_REVENUE_EVENT_CONTRACT = "VentureRevenueEventContract" as const;
export const VENTURE_COST_EVENT_CONTRACT = "VentureCostEventContract" as const;
export const SHARED_COST_ALLOCATION_CONTRACT = "SharedCostAllocationContract" as const;
export const VENTURE_BUDGET_CONTRACT = "VentureBudgetContract" as const;
export const VENTURE_BUDGET_ENVELOPE_CONTRACT = "VentureBudgetEnvelopeContract" as const;
export const PORTFOLIO_CAPITAL_BUDGET_CONTRACT = "PortfolioCapitalBudgetContract" as const;
export const ACTION_SPEND_AUTHORIZATION_GATE = "ActionSpendAuthorizationGate" as const;
export const PORTFOLIO_CAPITAL_STOP_GATE = "PortfolioCapitalStopGate" as const;
export const PORTFOLIO_MONTHLY_BURN_GATE = "PortfolioMonthlyBurnGate" as const;
export const UNVALIDATED_VENTURE_CAPITAL_RISK_GATE = "UnvalidatedVentureCapitalRiskGate" as const;
export const ACTIVE_VENTURE_BUILD_CAPACITY_GATE = "ActiveVentureBuildCapacityGate" as const;
export const EXPECTED_VALIDATION_BUDGET_GATE = "ExpectedValidationBudgetGate" as const;
export const FINANCIAL_EVENT_IDEMPOTENCY_GATE = "FinancialEventIdempotencyGate" as const;
export const VENTURE_FINANCIAL_RECONCILIATION_GATE = "VentureFinancialReconciliationGate" as const;
export const PORTFOLIO_FINANCIAL_RECONCILIATION_GATE = "PortfolioFinancialReconciliationGate" as const;
export const FINANCIAL_DATA_FRESHNESS_GATE = "FinancialDataFreshnessGate" as const;
export const VENTURE_REVENUE_REINVESTMENT_POLICY = "VentureRevenueReinvestmentPolicy" as const;
export const EPISTEMIC_MONTHLY_BURN_CONTRACT = "EpistemicMonthlyBurnContract" as const;
export const FOUNDER_CAPITAL_POLICY_READINESS_GATE = "FounderCapitalPolicyReadinessGate" as const;

export const ASKREVIEW_VENTURE_MARK = /askreview/i;

export type MoneyTruth = EpistemicAmount;
export type Layer = "MODELED" | "ACTUAL" | "FORECAST";

export const COST_CATEGORIES = [
  "RESEARCH",
  "BUILD",
  "INFRASTRUCTURE",
  "PROVIDER_API",
  "GROWTH",
  "ADVERTISING",
  "COMMUNICATION",
  "DOMAIN",
  "SOFTWARE",
  "FULFILLMENT",
  "CONTRACTOR",
  "LEGAL",
  "COMPLIANCE",
  "SHARED_OVERHEAD",
  "OTHER",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const BUDGET_ENVELOPES = [
  "RESEARCH",
  "VALIDATION",
  "BUILD",
  "INFRASTRUCTURE",
  "GROWTH",
  "PROVIDER_API",
  "FULFILLMENT",
  "CONTINGENCY",
  "OTHER",
] as const;
export type BudgetEnvelope = (typeof BUDGET_ENVELOPES)[number];

export type AllocationMethod = "DIRECT" | "USAGE_BASED" | "PROPORTIONAL" | "UNALLOCATED_SHARED";

export type VentureRevenueEvent = {
  contract: typeof VENTURE_REVENUE_EVENT_CONTRACT;
  event_id: string;
  idempotency_key: string;
  venture_id: string;
  customer_ref: string | null;
  offer: string | null;
  price_usd: number | null;
  payment_id: string;
  provider: string;
  gross_amount: number;
  currency: "USD";
  paid_at: string;
  refund_status: "NONE" | "PARTIAL" | "FULL";
  refunded_amount: number;
  fee_amount: number | null;
  fee_status: "ACTUAL" | "UNKNOWN";
  fulfillment_state: "PAYMENT_RECEIVED" | "FULFILLMENT_PENDING" | "FULFILLMENT_COMPLETED" | "REFUNDED";
  synthetic: false;
  unpaid: false;
  provenance: string;
};

export type VentureRefundEvent = {
  refund_id: string;
  idempotency_key: string;
  venture_id: string;
  payment_id: string;
  amount: number;
  currency: "USD";
  refunded_at: string;
  provider_ref: string;
  reason: string | null;
};

export type VentureCostEvent = {
  contract: typeof VENTURE_COST_EVENT_CONTRACT;
  event_id: string;
  idempotency_key: string;
  venture_id: string | null;
  category: CostCategory;
  amount: number | null;
  currency: "USD";
  provider: string | null;
  source: string;
  occurred_at: string;
  committed_or_spent: "COMMITTED" | "SPENT" | "RESERVED" | "CANCELLED";
  actual_or_estimated: "ACTUAL" | "ESTIMATED" | "UNKNOWN";
  allocation: AllocationMethod;
  campaign_id: string | null;
  provenance: string;
  synthetic: false;
};

export type VentureBudget = {
  contract: typeof VENTURE_BUDGET_CONTRACT;
  venture_id: string;
  total_authorized_budget: number | null;
  status: "NOT_SET" | "AUTHORIZED" | "EXHAUSTED" | "PAUSED";
  authorized_by: string | null;
  start_at: string | null;
  end_at: string | null;
  envelopes: Partial<Record<BudgetEnvelope, number>>;
  last_updated: string;
};

export type PortfolioCapitalPolicy = {
  contract: typeof PORTFOLIO_CAPITAL_BUDGET_CONTRACT;
  total_authorized: number | null;
  monthly_burn_cap: number | null;
  unvalidated_capital_cap: number | null;
  max_active_builds: number | null;
  status: "NOT_SET" | "AUTHORIZED";
  authorized_by: string | null;
  last_updated: string;
};

export type BudgetTransfer = {
  transfer_id: string;
  amount: number;
  from: string;
  to: string;
  reason: string;
  timestamp: string;
  authority: string;
};

export type FinancialIncident = {
  incident_id: string;
  kind: string;
  open: boolean;
  created_at: string;
  detail: string;
};

export type LearningPrior = {
  prior_id: string;
  name: string;
  value: number | null;
  sample_size: number;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  context: string;
  date_range: string;
  evidence_sources: string[];
};

export type CapitalRecommendation = "INVEST_MORE" | "MAINTAIN" | "REDUCE" | "PAUSE" | "PIVOT" | "SHUT_DOWN";

export type NewVentureCreationState =
  | "ALLOWED"
  | "THROTTLED"
  | "BLOCKED_CAPITAL"
  | "BLOCKED_MONTHLY_BURN"
  | "BLOCKED_UNVALIDATED_RISK"
  | "BLOCKED_BUILD_CAPACITY"
  | "BLOCKED_ECONOMICS"
  | "BLOCKED_PENDING_CAPITAL_POLICY";

export type VentureFinancialLedger = {
  contract: typeof VENTURE_FINANCIAL_LEDGER_CONTRACT;
  venture_id: string;
  currency: "USD";
  period: string;
  gross_revenue: MoneyTruth;
  refunds: MoneyTruth;
  net_revenue: MoneyTruth;
  payment_processing_fees: MoneyTruth;
  fulfillment_cost: MoneyTruth;
  infrastructure_cost: MoneyTruth;
  provider_api_cost: MoneyTruth;
  growth_cost: MoneyTruth;
  software_tooling_cost: MoneyTruth;
  domain_cost: MoneyTruth;
  contractor_or_external_service_cost: MoneyTruth;
  allocated_shared_overhead: MoneyTruth;
  other_direct_cost: MoneyTruth;
  gross_profit: MoneyTruth;
  contribution_profit: MoneyTruth;
  operating_contribution: MoneyTruth;
  committed_capital: MoneyTruth;
  spent_capital: MoneyTruth;
  remaining_budget: MoneyTruth;
  reserved_capital: MoneyTruth;
  available_capital: MoneyTruth;
  transaction_count: number;
  actual_cac: MoneyTruth;
  actual_ltv: MoneyTruth;
  actual_payback: MoneyTruth;
  actual_break_even: MoneyTruth;
  updated_at: string;
  data_confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  provenance: string;
};

export type FinancialGovernanceState = {
  revenues: VentureRevenueEvent[];
  refunds: VentureRefundEvent[];
  costs: VentureCostEvent[];
  budgets: VentureBudget[];
  transfers: BudgetTransfer[];
  incidents: FinancialIncident[];
  priors: LearningPrior[];
  portfolio: PortfolioCapitalPolicy;
  reinvestment: "NO_AUTO_REINVESTMENT";
  last_payment_sync: string | null;
  last_cost_sync: string | null;
  last_ledger_calc: string | null;
};

export type NamedGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
