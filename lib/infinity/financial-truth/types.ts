import type { EpistemicAmount } from "@/lib/infinity/treasury/types";

export const FINANCIAL_SOURCE_REGISTRY = "FinancialSourceRegistry" as const;
export const FINANCIAL_ACCOUNT_PROVIDER_ADAPTER = "FinancialAccountProviderAdapter" as const;
export const MERCURY_FINANCIAL_ACCOUNT_ADAPTER = "MercuryFinancialAccountAdapter" as const;
export const PORTFOLIO_CASH_POSITION_CONTRACT = "PortfolioCashPositionContract" as const;
export const PORTFOLIO_CAPITAL_POSITION = "PortfolioCapitalPosition" as const;
export const STRIPE_MERCURY_SETTLEMENT_RECONCILIATION = "StripeMercurySettlementReconciliation" as const;
export const VERIFIED_CASH_COMPLETENESS_GATE = "VerifiedCashCompletenessGate" as const;
export const FINANCIAL_DATA_FRESHNESS_GATE = "FinancialDataFreshnessGate" as const;
export const FINANCIAL_RECONCILIATION_ANOMALY_GATE = "FinancialReconciliationAnomalyGate" as const;
export const FINANCIAL_ACCOUNT_RECONCILIATION_GATE = "FinancialAccountReconciliationGate" as const;
export const FOUNDER_CAPITAL_POLICY_FINANCIAL_TRUTH_GATE = "FounderCapitalPolicyFinancialTruthGate" as const;
export const PORTFOLIO_CAPITAL_ALLOCATION_GATE = "PortfolioCapitalAllocationGate" as const;
export const FOUNDER_CAPITAL_POLICY_CONTRACT = "FounderCapitalPolicy" as const;
export const HQ_LIVE_FINANCIAL_REFRESH_GATE = "HQLiveFinancialRefreshGate" as const;
export const PARENT_FINANCIAL_INFRASTRUCTURE_MODE = "ParentFinancialInfrastructureMode" as const;
export const SHARED_PROCESSOR_ACCOUNT_CONTRACT = "SharedProcessorAccountContract" as const;
export const SETTLEMENT_DESTINATION_CONTRACT = "SettlementDestinationContract" as const;
export const MERCURY_TREASURY_STRUCTURE = "MercuryTreasuryStructure" as const;
export const VENTURE_CAPITAL_ALLOCATION = "VentureCapitalAllocation" as const;
export const MERCURY_TREASURY_MUTATION_ADAPTER = "MercuryTreasuryMutationAdapter" as const;
export const VENTURE_PAYMENT_LINEAGE_CONTRACT = "VenturePaymentLineageContract" as const;
export const CANONICAL_TREASURY_PROJECTION = "CanonicalTreasuryProjection" as const;
export const HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE = "HQTreasuryFinancialConsistencyGate" as const;
export const CANONICAL_TREASURY_PROJECTION_GATE = "CanonicalTreasuryProjectionGate" as const;
export const TREASURY_BANK_CASH_TRUTH_GATE = "TreasuryBankCashTruthGate" as const;
export const TREASURY_CASH_TRUTH_CONTRACT = "TreasuryCashTruthContract" as const;
export const TREASURY_CASH_TRUTH_GATE = "TreasuryCashTruthGate" as const;
export const TREASURY_COMPLETENESS_GATE = "TreasuryCompletenessGate" as const;
export const FOUNDER_BUDGET_POLICY_MUTATION_GATE = "FounderBudgetPolicyMutationGate" as const;
export const FOUNDER_CAPITAL_ALLOCATION_MUTATION_GATE = "FounderCapitalAllocationMutationGate" as const;
export const BUDGET_WITHIN_CAPITAL_AUTHORITY_GATE = "BudgetWithinCapitalAuthorityGate" as const;
export const VENTURE_ALLOCATION_IDENTITY_GATE = "VentureAllocationIdentityGate" as const;
export const ALLOCATION_VS_SPEND_SEPARATION_GATE = "AllocationVsSpendSeparationGate" as const;
export const TREASURY_LIVE_UPDATE_GATE = "TreasuryLiveUpdateGate" as const;
export const VENTURE_CAPITAL_ELIGIBILITY_GATE = "VentureCapitalEligibilityGate" as const;
export const CAPITAL_USE_EVIDENCE_GATE = "CapitalUseEvidenceGate" as const;
export const CAPITAL_EFFICIENCY_GATE = "CapitalEfficiencyGate" as const;
export const PORTFOLIO_RESERVE_INTEGRITY_GATE = "PortfolioReserveIntegrityGate" as const;
export const CAPITAL_ALLOCATION_EXPLAINABILITY_GATE = "CapitalAllocationExplainabilityGate" as const;
export const VENTURE_CAPITAL_ALLOCATION_DECISION = "VentureCapitalAllocationDecision" as const;
export const FINANCIAL_QC_TEST_ISOLATION_GATE = "FinancialQCTestIsolationGate" as const;
export const HQ_FINANCIAL_PULSE_CONTRACT = "HqFinancialPulse" as const;
export const PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION = "PortfolioActualEconomicsProjection" as const;
export const HQ_FINANCIAL_PULSE_GATE = "HQFinancialPulseGate" as const;
export const HQ_FINANCIAL_PULSE_CONSISTENCY_GATE = "HQFinancialPulseConsistencyGate" as const;
export const HQ_EXECUTIVE_ECONOMIC_PULSE_GATE = "HQExecutiveEconomicPulseGate" as const;
export const HQ_ECONOMIC_PULSE_CONSISTENCY_GATE = "HQEconomicPulseConsistencyGate" as const;
export const PORTFOLIO_REVENUE_TRUTH_GATE = "PortfolioRevenueTruthGate" as const;
export const CROSS_VENTURE_REVENUE_ATTRIBUTION_GATE = "CrossVentureRevenueAttributionGate" as const;
export const ACTUAL_CONTRIBUTION_TRUTH_GATE = "ActualContributionTruthGate" as const;
export const TOP_REVENUE_VENTURE_TRUTH_GATE = "TopRevenueVentureTruthGate" as const;
export const HQ_LIVE_ECONOMIC_REFRESH_GATE = "HQLiveEconomicRefreshGate" as const;
export const HQ_TOP_INFORMATION_HIERARCHY_GATE = "HQTopInformationHierarchyGate" as const;
export const CARD_TEXT_CONTAINMENT_GATE = "CardTextContainmentGate" as const;
export const HORIZONTAL_OVERFLOW_GATE = "HorizontalOverflowGate" as const;
export const HQ_OPERATIONAL_ROOMS_PROMINENCE_GATE = "HQOperationalRoomsProminenceGate" as const;
export const HQ_INFORMATION_HIERARCHY_GATE = "HQInformationHierarchyGate" as const;
export const RESPONSIVE_FINANCIAL_PULSE_GATE = "ResponsiveFinancialPulseGate" as const;
export const HQ_FINANCIAL_TRUTH_ANCHOR = "hq-financial-truth" as const;

export const OCCUPANCYNPV_STRIPE_ACCOUNT_ID = "acct_18h5CjLdvXKx7R7G" as const;
export const MERCURY_SYNC_INTERVAL_MS = 10 * 60 * 1000;
export const STRIPE_STALE_REFRESH_MS = 15 * 60 * 1000;
export const SETTLEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const FINANCIAL_SOURCE_TYPES = [
  "PAYMENT_PROCESSOR",
  "BANK_ACCOUNT",
  "TREASURY_LEDGER",
  "PROVIDER_COST_LEDGER",
  "INFRASTRUCTURE_PROVIDER",
  "DOMAIN_PROVIDER",
  "GROWTH_PROVIDER",
  "FULFILLMENT_PROVIDER",
  "MANUAL_VERIFIED",
  "MODELED",
] as const;
export type FinancialSourceType = (typeof FINANCIAL_SOURCE_TYPES)[number];

export const MERCURY_CONNECTION_STATES = [
  "LIVE",
  "CREDENTIALS_REQUIRED",
  "APPROVAL_PENDING",
  "PERMISSION_REQUIRED",
  "FAIL",
] as const;
export type MercuryConnectionState = (typeof MERCURY_CONNECTION_STATES)[number];

export const STRIPE_CONNECTION_STATES = ["LIVE", "FAIL"] as const;
export type StripeConnectionState = (typeof STRIPE_CONNECTION_STATES)[number];

export const SOURCE_CONNECTION_STATES = [
  "LIVE",
  "CREDENTIALS_REQUIRED",
  "APPROVAL_PENDING",
  "PERMISSION_REQUIRED",
  "MODELED",
  "DISCONNECTED",
  "FAIL",
] as const;
export type SourceConnectionState = (typeof SOURCE_CONNECTION_STATES)[number];

export const VERIFICATION_STATES = ["VERIFIED", "UNVERIFIED", "UNKNOWN"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const FRESHNESS_STATES = ["FRESH", "AGING", "STALE", "UNKNOWN"] as const;
export type FreshnessState = (typeof FRESHNESS_STATES)[number];

export const CASH_COMPLETENESS_STATES = ["COMPLETE", "PARTIAL", "UNKNOWN"] as const;
export type CashCompleteness = (typeof CASH_COMPLETENESS_STATES)[number];

export const RECONCILIATION_STATES = [
  "RECONCILED",
  "PENDING_SETTLEMENT",
  "PARTIALLY_RECONCILED",
  "UNRECONCILED",
  "UNKNOWN",
] as const;
export type ReconciliationState = (typeof RECONCILIATION_STATES)[number];

export const PAYOUT_DESTINATIONS = ["MERCURY_VERIFIED", "OTHER_VERIFIED", "UNKNOWN"] as const;
export type PayoutDestination = (typeof PAYOUT_DESTINATIONS)[number];

export const PARENT_INFRASTRUCTURE_MODES = [
  "SHARED_PARENT_FINANCIAL_INFRASTRUCTURE",
  "SEPARATE_VENTURE_ENTITY_INFRASTRUCTURE",
] as const;
export type ParentFinancialInfrastructureMode = (typeof PARENT_INFRASTRUCTURE_MODES)[number];

export const FINANCIAL_CONCEPTS = [
  "REVENUE_ATTRIBUTION",
  "PAYMENT_PROCESSOR_BALANCE",
  "SETTLEMENT_DESTINATION",
  "BANK_CASH",
  "CAPITAL_ALLOCATION",
  "SPENDING_AUTHORITY",
  "PROFITABILITY",
  "TREASURY_TRANSFERS",
] as const;
export type FinancialConcept = (typeof FINANCIAL_CONCEPTS)[number];

export const CANONICAL_FINANCIAL_RULES = [
  "STRIPE_PAYOUT_DESTINATION_MUST_BE_KNOWN_OR_EXPLICITLY_UNKNOWN",
  "STRIPE_PAYMENT_REVENUE_MUST_BE_ATTRIBUTABLE_TO_THE_CORRECT_VENTURE",
  "SETTLEMENT_DESTINATION_MUST_NOT_CHANGE_ECONOMIC_ATTRIBUTION",
  "CASH_LOCATION_MUST_NOT_BE_CONFUSED_WITH_REVENUE_OWNERSHIP",
  "SPENDING_AUTHORITY_MUST_NOT_BE_DERIVED_DIRECTLY_FROM_REVENUE_OR_ACCOUNT_BALANCE",
] as const;
export type CanonicalFinancialRule = (typeof CANONICAL_FINANCIAL_RULES)[number];

export const FORBIDDEN_FINANCIAL_RULES = ["STRIPE_PAYOUT_DESTINATION_MUST_EQUAL_MERCURY"] as const;

export type NotSet = "NOT_SET";

export const SETTLEMENT_DESTINATION_CLASSIFICATIONS = [
  "MERCURY_PARENT",
  "MERCURY_VENTURE",
  "KNOWN_PARENT_BANK",
  "KNOWN_VENTURE_BANK",
  "KNOWN_EXTERNAL_BANK",
  "UNKNOWN",
] as const;
export type SettlementDestinationClassification = (typeof SETTLEMENT_DESTINATION_CLASSIFICATIONS)[number];

export const SETTLEMENT_RECONCILIATION_STATUSES = [
  "FULLY_RECONCILED",
  "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED",
  "PENDING",
  "FAILED",
  "UNKNOWN",
] as const;
export type SettlementReconciliationStatus = (typeof SETTLEMENT_RECONCILIATION_STATUSES)[number];

export const MERCURY_TREASURY_ROLES = [
  "PARENT_TREASURY",
  "VENTURE_TREASURY",
  "VENTURE_ALLOCATION",
  "RESERVE",
  "OPERATING_CASH",
] as const;
export type MercuryTreasuryRole = (typeof MERCURY_TREASURY_ROLES)[number];

export const VENTURE_PAYMENT_LINEAGE_FIELDS = [
  "venture_id",
  "venture_slug",
  "product_id",
  "offer_id",
  "checkout_session_id",
  "payment_intent_id",
  "customer_id",
  "transaction_timestamp",
  "gross_amount",
  "currency",
  "stripe_fee",
  "net_processor_amount",
  "payment_status",
] as const;
export type VenturePaymentLineageField = (typeof VENTURE_PAYMENT_LINEAGE_FIELDS)[number];

export const MERCURY_TXN_CLASSES = [
  "FOUNDER_FUNDING",
  "STRIPE_SETTLEMENT",
  "PROVIDER_EXPENSE",
  "INFRASTRUCTURE_EXPENSE",
  "DOMAIN_EXPENSE",
  "GROWTH_EXPENSE",
  "FULFILLMENT_EXPENSE",
  "TRANSFER",
  "OTHER_INCOME",
  "OTHER_EXPENSE",
  "UNKNOWN",
] as const;
export type MercuryTxnClass = (typeof MERCURY_TXN_CLASSES)[number];

export const READ_ONLY_BANK_CAPABILITIES = [
  "LIST_AUTHORIZED_ACCOUNTS",
  "READ_ACCOUNT_METADATA",
  "READ_CURRENT_BALANCE",
  "READ_AVAILABLE_BALANCE",
  "READ_RECENT_TRANSACTIONS",
  "READ_TRANSACTION_DETAIL",
  "IDENTIFY_STRIPE_SETTLEMENTS",
] as const;
export type ReadOnlyBankCapability = (typeof READ_ONLY_BANK_CAPABILITIES)[number];

export const DENIED_BANK_CAPABILITIES = [
  "ACH_SEND",
  "WIRE_SEND",
  "INTERNAL_TRANSFER",
  "RECIPIENT_CREATE",
  "CARD_ISSUANCE",
  "CARD_SPENDING",
  "PAYOUT_DESTINATION_MUTATION",
] as const;
export type DeniedBankCapability = (typeof DENIED_BANK_CAPABILITIES)[number];

export type MoneyDisplay = EpistemicAmount;

export type FinancialProvenance = {
  source: string;
  verified_at: string | null;
  freshness: FreshnessState;
  verification_status: VerificationState;
};

export type FinancialSourceRecord = {
  source_id: string;
  provider: string;
  source_type: FinancialSourceType;
  safe_account_reference: string;
  currency: string;
  connection_status: SourceConnectionState;
  verification_status: VerificationState;
  last_sync_at: string | null;
  freshness_status: FreshnessState;
  capabilities: string[];
};

export type SafeBankAccount = {
  account_id: string;
  provider: "mercury";
  display_name: string;
  safe_account_reference: string;
  last4: string | null;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED" | "UNKNOWN";
};

export type ClassifiedMercuryTransaction = {
  safe_transaction_id: string;
  account_id: string;
  amount: number | null;
  currency: string;
  classification: MercuryTxnClass;
  description: string | null;
  merchant: string | null;
  occurred_at: string | null;
  status: string;
  stripe_settlement: boolean;
  evidence: string[];
};

export const MERCURY_FAILURE_STAGES = [
  "auth/session/config",
  "account selection",
  "live provider request",
  "response parsing",
  "current/available balance",
  "completeness calculation",
  "CanonicalTreasuryProjection",
  "HQ Executive Pulse",
  "Treasury Control Center",
] as const;
export type MercuryFailureStage = (typeof MERCURY_FAILURE_STAGES)[number];

export type MercuryCashSnapshot = {
  connection: MercuryConnectionState;
  operating_account_verified: boolean;
  current: number | null;
  available: number | null;
  currency: string;
  last_verified: string | null;
  safe_account_reference: string;
  founder_estimate_treated_as_verified: false;
  transactions: ClassifiedMercuryTransaction[];
  freshness: FreshnessState;
  mutation_capability: false;
  money_movement_capability: false;
  read_only: true;
  failure_stage?: MercuryFailureStage | null;
  provider_error?: string | null;
};

export type StripeCashSnapshot = {
  connection: StripeConnectionState;
  account: typeof OCCUPANCYNPV_STRIPE_ACCOUNT_ID;
  available: number | null;
  pending: number | null;
  currency: string;
  recent_payout_amount: number | null;
  recent_payout_id: string | null;
  recent_payout_status: string | null;
  payout_destination: PayoutDestination;
  settlement_destination_classification: SettlementDestinationClassification;
  last_verified: string | null;
  processor_fees: number | null;
  net_settlement: number | null;
  balance_transactions: StripeBalanceTxn[];
  payouts: StripePayoutRecord[];
  freshness: FreshnessState;
};

export type StripeBalanceTxn = {
  safe_id: string;
  type: string;
  reporting_category: string | null;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  created_at: string;
  source: string | null;
  payout_id: string | null;
  description: string | null;
};

export type StripePayoutRecord = {
  safe_id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_at: string | null;
  created_at: string;
  destination_safe_ref: string | null;
};

export type SettlementLineage = {
  safe_payment_id: string | null;
  safe_balance_transaction_id: string | null;
  safe_payout_id: string | null;
  safe_mercury_transaction_id: string | null;
  amount: number | null;
  currency: string;
  expected_amount: number | null;
  observed_amount: number | null;
  difference: number | null;
  status: ReconciliationState;
  timestamps: {
    payment_at: string | null;
    available_at: string | null;
    payout_at: string | null;
    mercury_at: string | null;
  };
  kind: "SETTLEMENT_BALANCE_TRANSFER";
  is_revenue: false;
};

export type StripeMercurySettlementReconciliation = {
  contract: typeof STRIPE_MERCURY_SETTLEMENT_RECONCILIATION;
  stripe_to_ledger: "PASS" | "FAIL" | "PARTIAL";
  stripe_payout_to_mercury: "PASS" | "PENDING" | "FAIL" | "UNKNOWN" | "NO_SETTLEMENT_HISTORY" | "OTHER_DESTINATION";
  settlement_reconciliation_status: SettlementReconciliationStatus;
  destination_classification: SettlementDestinationClassification;
  mercury_match_expected: boolean;
  lineages: SettlementLineage[];
  duplicate_settlements: number;
  anomalies: FinancialAnomaly[];
};

export type SharedProcessorAccount = {
  contract: typeof SHARED_PROCESSOR_ACCOUNT_CONTRACT;
  provider: "STRIPE";
  provider_account_id: typeof OCCUPANCYNPV_STRIPE_ACCOUNT_ID;
  legal_owner: "UNKNOWN";
  operating_entity: "IMR";
  shared_across_ventures: true;
  connected_ventures: string[];
  settlement_destination_classification: SettlementDestinationClassification;
  settlement_destination_reference: string;
  last_verified_at: string | null;
  status: "LIVE" | "FAIL";
};

export type SettlementDestination = {
  contract: typeof SETTLEMENT_DESTINATION_CONTRACT;
  classification: SettlementDestinationClassification;
  safe_reference: string;
  connected_to_infinity_treasury: boolean;
  mercury_required: false;
};

export type MercuryTreasuryStructure = {
  contract: typeof MERCURY_TREASURY_STRUCTURE;
  role: MercuryTreasuryRole;
  safe_account_reference: string;
  provider_capabilities_verified: false;
  subaccounts_assumed: false;
};

export type VentureCapitalAllocation = {
  contract: typeof VENTURE_CAPITAL_ALLOCATION;
  venture_id: string;
  source_treasury_account_id: string | null;
  destination_treasury_account_id: string | null;
  allocated_amount: number | null;
  currency: string;
  authorized_amount: NotSet | number;
  committed_amount: number | null;
  spent_amount: number | null;
  remaining_authority: NotSet | number;
  allocation_status: "NOT_SET" | "NOT_ALLOCATED" | "AUTHORIZED" | "COMMITTED" | "CLOSED" | "RESERVED" | "ALLOCATED";
  authorized_by: string | null;
  authorized_at: string | null;
  effective_at: string | null;
  policy_reference: null;
  evidence_reference: string | null;
};

export type VentureEconomicsProjection = {
  venture_id: string;
  venture_slug: string;
  display_name?: string;
  gross_revenue: number | null;
  refunds: number | null;
  processor_fees: number | null;
  net_processor_revenue: number | null;
  fulfillment_costs: number | null;
  other_actual_costs: number | null;
  contribution: number | null;
  current_month_gross_revenue?: number;
  settlement_status: SettlementReconciliationStatus;
  allocated_capital: NotSet | number;
  authorized_spend: NotSet | number;
  actual_spend: number | null;
};

export type PortfolioUnknownCostState = "KNOWN" | "PARTIAL" | "UNKNOWN";

export type PortfolioVentureEconomicsRow = {
  venture_id: string;
  display_name: string;
  current_month_gross_revenue: number;
  lifetime_gross_revenue: number;
  refunds: number;
  processor_fees: number | null;
  known_actual_cost: number | null;
  unknown_cost_state: PortfolioUnknownCostState;
  actual_contribution: number | null;
};

export type PortfolioActualEconomicsProjection = {
  contract: typeof PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION;
  current_month_gross_revenue: number;
  lifetime_gross_revenue: number;
  current_month_refunds: number;
  current_month_processor_fees: number | null;
  known_actual_cost: number | null;
  unknown_cost_state: PortfolioUnknownCostState;
  actual_contribution: number | null;
  contribution_display: "UNKNOWN" | "PARTIAL" | string;
  top_revenue_venture: {
    venture_id: string | null;
    display_name: string | null;
    current_month_gross_revenue: number;
    ranking_basis: "CURRENT_MONTH_REVENUE";
    display: string;
  };
  operating_venture_count: number;
  last_updated_at: string;
  ventures: PortfolioVentureEconomicsRow[];
};

export const ALLOCATION_SOURCES = ["FOUNDER_DIRECT_ALLOCATION", "AUTONOMOUS_ALLOCATION_DECISION"] as const;
export type AllocationSource = (typeof ALLOCATION_SOURCES)[number];

export const ALLOCATION_DECISION_OUTCOMES = ["ALLOCATE", "DEFER", "REJECT", "NOT_ELIGIBLE"] as const;
export type AllocationDecisionOutcome = (typeof ALLOCATION_DECISION_OUTCOMES)[number];

export type VentureCapitalAllocationDecisionRow = {
  venture_id: string;
  display_name: string;
  lifecycle_state: string;
  production_state: string | null;
  eligible: boolean;
  decision: AllocationDecisionOutcome;
  amount: number;
  purpose: string | null;
  reason: string;
  expected_evidence: string | null;
  review_condition: string | null;
  capital_dependent_next_action: string | null;
  use_case: string | null;
  spend_category: string | null;
};

export type VentureCapitalAllocationDecision = {
  contract: typeof VENTURE_CAPITAL_ALLOCATION_DECISION;
  decision_id: string;
  decided_at: string;
  source: "AUTONOMOUS_ALLOCATION_DECISION";
  authorized_capital: number;
  allocated_capital: number;
  unallocated_authorized_capital: number;
  committed_capital: 0;
  actual_spend: 0;
  paid_acquisition_budget: 0;
  money_moved: false;
  mercury_write_access: false;
  reserve_reason: string;
  ventures: VentureCapitalAllocationDecisionRow[];
};

export const SUPPORTED_BUDGET_CATEGORIES = [
  "AI_API",
  "HOSTING",
  "DOMAINS",
  "CREATIVE_MEDIA",
  "SOFTWARE_TOOLS",
  "VENDORS_CONTRACTORS",
  "MARKETING",
] as const;
export type SupportedBudgetCategory = (typeof SUPPORTED_BUDGET_CATEGORIES)[number];

export type SourcedTreasuryAmount = {
  value: number | NotSet | null;
  display: string;
  source: string;
  sync: string | null;
};

export type PortfolioBudgetPolicy = {
  classification: "CANONICAL_POLICY" | "LEGACY_STALE_POLICY";
  portfolio_capital_ceiling: number;
  monthly_burn_cap: NotSet | number;
  maximum_single_autonomous_purchase: NotSet | number;
  daily_spending_ceiling: NotSet | number;
  reserve_requirement: NotSet | number;
  paid_acquisition_budget: number;
  category_limits: Partial<Record<SupportedBudgetCategory, NotSet | number>>;
  updated_at: string | null;
};

export type VentureBudgetPolicy = {
  venture_id: string;
  venture_budget_ceiling: NotSet | number;
  monthly_spend_limit: NotSet | number;
  maximum_single_purchase: NotSet | number;
  category_limits: Partial<Record<SupportedBudgetCategory, NotSet | number>>;
  updated_at: string | null;
};

export type CanonicalAllocationRecord = {
  venture_id: string;
  display_name: string;
  lifecycle_state: string;
  allocated_amount: number;
  reserved_amount: number;
  committed_amount: number;
  spent_amount: number;
  remaining: number;
  purpose: string | null;
  allocation_source: AllocationSource | null;
  status: "NOT_ALLOCATED" | "ALLOCATED" | "RESERVED";
  review_condition: string | null;
  created_at: string | null;
  updated_at: string | null;
  allocation_id?: string | null;
  created_by?: string | null;
  idempotency_key?: string | null;
  supersedes?: string | null;
  correction_lineage?: string[] | null;
};

export type CanonicalAllocationEvent = {
  allocation_id: string;
  venture_id: string;
  amount: number;
  source: string;
  status: "ACTIVE" | "SUPERSEDED" | "REVERSED";
  kind: "ALLOCATE" | "CORRECT" | "REVERSE";
  created_at: string;
  created_by: string;
  idempotency_key: string | null;
  purpose: string | null;
  committed_amount: number;
  spent_amount: number;
  supersedes: string | null;
  correction_of: string[] | null;
};

export type CanonicalTreasuryVenture = {
  venture_id: string;
  display_name: string;
  lifecycle_state: string;
  production_state: string | null;
  allocatable: boolean;
  reserve_only: boolean;
};

export type CanonicalTreasuryTransaction = {
  date: string;
  description: string;
  amount: string;
  direction: "INFLOW" | "OUTFLOW" | "UNKNOWN";
  status: string;
  classification: string;
  venture_attribution: string;
  reconciliation_state: string;
  safe_transaction_id: string;
};

export type CanonicalTreasuryCommitment = {
  commitment_id: string;
  venture: string;
  provider: string;
  amount: string;
  purpose: string;
  status: string;
  created: string;
  expected_settlement: string | null;
  actual_settlement: string | null;
};

export type ManualAccountingEvent = {
  id: string;
  kind: "MANUAL_ACCOUNTING_EVENT";
  amount: number;
  source: string;
  memo: string | null;
  created_at: string;
  reconciled_mercury_txn_id: string | null;
  increases_verified_bank_cash: false;
};

export type CanonicalTreasuryProjection = {
  contract: typeof CANONICAL_TREASURY_PROJECTION;
  treasury_status: "LIVE" | "DEGRADED";
  bank_provider: "Mercury";
  bank_connection: "READ_ONLY";
  last_financial_sync: string | null;
  cash_completeness: CashCompleteness;
  infrastructure_mode: ParentFinancialInfrastructureMode;
  parent_entity: "IMR";
  verified_treasury_cash: SourcedTreasuryAmount;
  mercury_available: SourcedTreasuryAmount;
  mercury_current: SourcedTreasuryAmount;
  authorized_capital: SourcedTreasuryAmount;
  allocated_capital: SourcedTreasuryAmount;
  committed_capital: SourcedTreasuryAmount;
  actual_spend: SourcedTreasuryAmount;
  remaining_authorization: SourcedTreasuryAmount;
  unallocated_authorized_capital: SourcedTreasuryAmount;
  monthly_burn_cap: SourcedTreasuryAmount;
  stripe_available: SourcedTreasuryAmount;
  stripe_pending: SourcedTreasuryAmount;
  paid_acquisition_budget: SourcedTreasuryAmount;
  money_movement_enabled: false;
  mercury_write_access: false;
  execute_approved_payment_enabled: false;
  legacy_monthly_policy_active: false;
  manual_ledger_is_bank_cash_source: false;
  portfolio_budget: PortfolioBudgetPolicy;
  venture_budgets: VentureBudgetPolicy[];
  ventures: CanonicalTreasuryVenture[];
  allocations: CanonicalAllocationRecord[];
  transactions: CanonicalTreasuryTransaction[];
  commitments: CanonicalTreasuryCommitment[];
  accounting_events: ManualAccountingEvent[];
  latest_allocation_decision: VentureCapitalAllocationDecision | null;
  spend_authorities: import("./spend-authority").VentureSpendAuthority[];
  venture_financial_commitments: import("./spend-authority").VentureFinancialCommitment[];
  mercury_provider_error?: string | null;
  mercury_last_verified_at?: string | null;
  mercury_last_verified_available?: number | null;
  mercury_failure_stage?: string | null;
};

export type FinancialAnomaly = {
  code:
    | "PAYMENT_WITHOUT_REVENUE_EVENT"
    | "REFUND_WITHOUT_LEDGER_EVENT"
    | "STRIPE_FEE_MISSING_FROM_LEDGER"
    | "PAYOUT_MISSING_EXPECTED_SETTLEMENT"
    | "MERCURY_STRIPE_DEPOSIT_WITHOUT_PAYOUT"
    | "LEDGER_REVENUE_INCONSISTENT_WITH_STRIPE"
    | "UNEXPECTED_BANK_TRANSACTION"
    | "STALE_FINANCIAL_SOURCE"
    | "DUPLICATE_SETTLEMENT_COUNTING";
  detail: string;
  severity: "INFO" | "WARN" | "FAIL";
};

export type PortfolioCashPosition = {
  contract: typeof PORTFOLIO_CASH_POSITION_CONTRACT;
  mercury_current: number | null;
  mercury_available: number | null;
  stripe_available: number | null;
  stripe_pending: number | null;
  other_processor_available: number | null;
  other_processor_pending: number | null;
  verified_liquid_cash: number | null;
  cash_completeness: CashCompleteness;
  unverified_accounts: number;
  verified_at: string | null;
};

export type PortfolioCapitalPosition = {
  contract: typeof PORTFOLIO_CAPITAL_POSITION;
  verified_liquid_cash: number | null;
  configured_portfolio_cap: NotSet | number;
  authorized_capital: NotSet | number;
  committed_capital: number | null;
  spent_capital: number | null;
  remaining_authorized_capital: NotSet | number;
  reserve_requirement: NotSet | number;
  available_for_new_ventures: NotSet | number;
  monthly_burn_cap: NotSet | number;
  current_month_known_burn: number | null;
  unknown_cost_state: "KNOWN" | "PARTIAL" | "UNKNOWN";
  founder_deposits_auto_increase_spend_authority: false;
  allocated_capital: number;
  unallocated_authorized_capital: NotSet | number;
  portfolio_capital_ceiling: NotSet | number;
  policy_status: "ACTIVE" | "NOT_SET";
  authorization_source: "FOUNDER_EXPLICIT_AUTHORIZATION" | "NOT_SET";
  founder_decision: "AUTHORIZE_ALL_CURRENT_VERIFIED_MERCURY_CASH" | null;
  future_deposits_auto_authorize: false;
  revenue_auto_authorizes: false;
  paid_advertising_budget: number;
  money_movement_enabled: false;
};

export type ActualEconomics = {
  layer: "ACTUAL";
  gross_revenue: number | null;
  refunds: number | null;
  processor_fees: number | null;
  net_revenue: number | null;
  known_costs: number | null;
  unknown_cost_categories: string[];
  contribution: number | null;
  current_month_gross_revenue: number | null;
};

export type ModeledEconomics = {
  layer: "MODELED";
  modeled_revenue: number | null;
  modeled_costs: number | null;
  modeled_contribution: number | null;
  separated_from_actual: true;
};

export type NamedFinancialGate = {
  gate: string;
  result: "PASS" | "FAIL" | "PARTIAL" | "PASS_WITH_UNCONNECTED_SETTLEMENT_DESTINATION";
  reasons: string[];
};

export type HqFinancialMetric = {
  id: string;
  label: string;
  display: string;
  canonical_state?: string | null;
  layer: "LIVE_CASH" | "ACTUAL" | "MODELED" | "CAPITAL" | "RECONCILIATION" | "PARENT" | "VENTURE";
  provenance: FinancialProvenance;
};

export type HqFinancialTruthView = {
  contract: "HqFinancialTruthView";
  version: string;
  mercury: MercuryCashSnapshot;
  stripe: StripeCashSnapshot;
  cash: PortfolioCashPosition;
  capital: PortfolioCapitalPosition;
  actual: ActualEconomics;
  modeled: ModeledEconomics;
  reconciliation: StripeMercurySettlementReconciliation;
  registry: FinancialSourceRecord[];
  metrics: HqFinancialMetric[];
  gates: {
    cash_completeness: NamedFinancialGate;
    freshness: NamedFinancialGate;
    anomaly: NamedFinancialGate;
    account_reconciliation: NamedFinancialGate;
    founder_capital_policy_truth: NamedFinancialGate;
    hq_live_financial_refresh: NamedFinancialGate;
    portfolio_capital_allocation: NamedFinancialGate;
    canonical_treasury_projection: NamedFinancialGate;
    hq_treasury_consistency: NamedFinancialGate;
    treasury_bank_cash_truth: NamedFinancialGate;
    budget_within_capital_authority: NamedFinancialGate;
    venture_allocation_identity: NamedFinancialGate;
    allocation_vs_spend_separation: NamedFinancialGate;
    treasury_live_update: NamedFinancialGate;
    founder_budget_policy_mutation: NamedFinancialGate;
    founder_capital_allocation_mutation: NamedFinancialGate;
    venture_capital_eligibility: NamedFinancialGate;
    capital_use_evidence: NamedFinancialGate;
    capital_efficiency: NamedFinancialGate;
    portfolio_reserve_integrity: NamedFinancialGate;
    capital_allocation_explainability: NamedFinancialGate;
  };
  treasury_control: CanonicalTreasuryProjection;
  last_financial_sync: string | null;
  layers_separated: true;
  read_only_bank_access: true;
  founder_estimate_used: false;
  infrastructure_mode: ParentFinancialInfrastructureMode;
  parent_entity: "IMR";
  shared_processor: SharedProcessorAccount;
  settlement_destination: SettlementDestination;
  treasury: MercuryTreasuryStructure;
  allocations: VentureCapitalAllocation[];
  venture_economics: VentureEconomicsProjection[];
  portfolio_economics: PortfolioActualEconomicsProjection;
  mutation_adapter_status: "NOT_ACTIVE";
};

export type FinancialTruthSnapshot = {
  mercury: MercuryCashSnapshot;
  stripe: StripeCashSnapshot;
  actual: ActualEconomics;
  modeled: ModeledEconomics;
  committed_capital: number | null;
  spent_capital: number | null;
  current_month_known_burn: number | null;
  unknown_cost_state: "KNOWN" | "PARTIAL" | "UNKNOWN";
  lineages: SettlementLineage[];
  anomalies: FinancialAnomaly[];
  registry: FinancialSourceRecord[];
  captured_at: string;
};
