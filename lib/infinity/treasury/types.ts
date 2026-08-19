import type {
  Actuality,
  AuthorizationSource,
  BudgetScopeType,
  CommitmentFrequency,
  CommitmentStatus,
  FinancialActionStatus,
  FinancialActionType,
  FinancialCapability,
  FinancialPolicyDecision,
  FinancialProviderKey,
  LedgerEntryType,
  LedgerSubtype,
  ProviderFreshness,
  ProviderTransactionClass,
  ReservationStatus,
  TreasuryBudgetCategory,
} from "./constants";

export type { Actuality, FinancialPolicyDecision, ProviderFreshness };

/** Numeric field with truthful epistemic semantics. Missing amounts stay null — never defaulted to zero. */
export type EpistemicAmount = {
  value: number | null;
  actuality: Actuality;
  currency: string;
};

export function unknownAmount(currency = "USD"): EpistemicAmount {
  return { value: null, actuality: "UNKNOWN", currency };
}

export function actualAmount(value: number, currency = "USD"): EpistemicAmount {
  return { value, actuality: "ACTUAL", currency };
}

export function estimateAmount(value: number, currency = "USD"): EpistemicAmount {
  return { value, actuality: "ESTIMATE", currency };
}

export type ProviderAccount = {
  accountId: string;
  provider: FinancialProviderKey | string;
  displayName: string;
  currency: string;
  accountKind: "CHECKING" | "SAVINGS" | "TREASURY" | "CARD" | "OTHER";
  externalAccountId: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED" | "UNKNOWN";
};

export type ProviderBalance = {
  accountId: string;
  available: EpistemicAmount;
  current: EpistemicAmount;
  asOf: string;
};

export type ProviderTransaction = {
  providerTransactionId: string;
  accountId: string;
  amount: EpistemicAmount;
  classification: ProviderTransactionClass;
  merchant: string | null;
  description: string | null;
  occurredAt: string;
  status: "PENDING" | "POSTED" | "FAILED" | "REVERSED";
};

export type ProviderCard = {
  cardId: string;
  last4: string | null;
  status: "ACTIVE" | "FROZEN" | "CANCELLED";
  dailyLimit: EpistemicAmount;
  monthlyLimit: EpistemicAmount;
  singleTransactionLimit: EpistemicAmount;
};

export type ProviderPayment = {
  paymentId: string;
  amount: EpistemicAmount;
  recipientId: string | null;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  createdAt: string;
};

export type ProviderRecipient = {
  recipientId: string;
  displayName: string;
  status: "ACTIVE" | "DISABLED";
};

export type ProviderRecurringCommitment = {
  commitmentId: string;
  vendor: string;
  amount: EpistemicAmount;
  frequency: CommitmentFrequency;
  nextExpectedCharge: string | null;
  status: CommitmentStatus;
};

export type ProviderCapabilityMap = Partial<Record<FinancialCapability, boolean>>;

export type FinancialProviderConfig = {
  providerKey: FinancialProviderKey | string;
  displayName: string;
  capabilities: ProviderCapabilityMap;
  connectionStatus: "NOT_CONFIGURED" | "CONFIGURED" | "DEGRADED" | "UNAVAILABLE";
};

export type TreasuryProviderConnection = {
  connectionId: string;
  organizationId: string;
  provider: string;
  connectionStatus: "NOT_CONFIGURED" | "CONFIGURED" | "DEGRADED" | "UNAVAILABLE";
  externalAccountIds: string[];
  capabilities: FinancialCapability[];
  lastSyncAt: string | null;
  createdAt: string;
};

export type TreasuryAccount = {
  accountId: string;
  organizationId: string;
  provider: string;
  externalAccountId: string;
  displayName: string;
  currency: string;
  accountKind: ProviderAccount["accountKind"];
  status: ProviderAccount["status"];
};

export type TreasuryBalanceSnapshot = {
  snapshotId: string;
  organizationId: string;
  accountId: string;
  available: EpistemicAmount;
  current: EpistemicAmount;
  capturedAt: string;
  source: "PROVIDER" | "CACHE";
};

export type TreasuryTransaction = {
  transactionId: string;
  organizationId: string;
  ventureId: string | null;
  accountId: string | null;
  provider: string;
  providerTransactionId: string;
  amount: EpistemicAmount;
  classification: ProviderTransactionClass;
  merchant: string | null;
  category: TreasuryBudgetCategory | null;
  purpose: string | null;
  financialActionRequestId: string | null;
  authorizationId: string | null;
  occurredAt: string;
  status: ProviderTransaction["status"];
  createdAt: string;
};

export type BudgetScope = {
  scopeType: BudgetScopeType;
  organizationId: string;
  ventureId?: string | null;
  missionId?: string | null;
  category?: TreasuryBudgetCategory | null;
  provider?: string | null;
  period?: "DAILY" | "MONTHLY" | "LIFETIME" | null;
  currency: string;
};

export type TreasuryBudget = {
  budgetId: string;
  scope: BudgetScope;
  allocated: EpistemicAmount;
  spent: EpistemicAmount;
  reserved: EpistemicAmount;
  committed: EpistemicAmount;
  available: EpistemicAmount;
  createdAt: string;
  updatedAt: string;
};

export type BudgetReservation = {
  reservationId: string;
  organizationId: string;
  budgetId: string;
  financialActionRequestId: string;
  amount: EpistemicAmount;
  status: ReservationStatus;
  createdAt: string;
  releasedAt: string | null;
  spentAt: string | null;
};

export type VentureCapitalAllocation = {
  allocationId: string;
  organizationId: string;
  ventureId: string;
  capitalAllocated: EpistemicAmount;
  capitalSpent: EpistemicAmount;
  capitalReserved: EpistemicAmount;
  capitalCommitted: EpistemicAmount;
  capitalAvailable: EpistemicAmount;
  expectedRevenue: EpistemicAmount;
  actualRevenue: EpistemicAmount;
  expectedProfit: EpistemicAmount;
  actualProfit: EpistemicAmount;
  expectedROI: EpistemicAmount;
  actualROI: EpistemicAmount;
  selectionScore: number | null;
  monetizationScore: number | null;
  risk: number | null;
  stage: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Inputs for a future portfolio allocator — models only in V1. */
export type PortfolioAllocationInputs = {
  selectionScore: number | null;
  monetizationScore: number | null;
  validationConfidence: number | null;
  fatalAssumptionRisk: number | null;
  expectedROI: number | null;
  actualROI: number | null;
  revenue: EpistemicAmount;
  profit: EpistemicAmount;
  capitalEfficiency: EpistemicAmount;
  burn: EpistemicAmount;
  stage: string | null;
  technicalRisk: number | null;
};

export type RecurrenceSpec = {
  frequency: CommitmentFrequency;
  monthlyEquivalent: EpistemicAmount;
  annualEquivalent: EpistemicAmount;
};

export type FinancialActionRequest = {
  requestId: string;
  organizationId: string;
  ventureId: string | null;
  missionId: string | null;
  opportunityId: string | null;
  purpose: string;
  category: TreasuryBudgetCategory;
  actionType: FinancialActionType;
  merchant: string | null;
  provider: string | null;
  recipient: string | null;
  amount: EpistemicAmount;
  currency: string;
  recurring: boolean;
  recurrence: RecurrenceSpec | null;
  expectedValue: EpistemicAmount;
  economicJustification: string | null;
  requiredForMVP: boolean;
  alternatives: string[];
  risk: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  budgetSource: string | null;
  maximumAuthorizedAmount: EpistemicAmount;
  idempotencyKey: string;
  status: FinancialActionStatus;
  spendIntentId: string | null;
  mediaRequirementId: string | null;
  createdAt: string;
};

export type FinancialPolicyEvaluation = {
  decision: FinancialPolicyDecision;
  reasonCodes: string[];
  policyVersion: string;
  evaluatedAt: string;
};

export type FinancialAuthorization = {
  authorizationId: string;
  organizationId: string;
  financialActionRequestId: string;
  decision: FinancialPolicyDecision;
  authorizedAmount: EpistemicAmount;
  currency: string;
  policyVersion: string;
  reasonCodes: string[];
  authorizationSource: AuthorizationSource;
  expiresAt: string | null;
  createdAt: string;
};

export type FinancialActionExecution = {
  executionId: string;
  organizationId: string;
  financialActionRequestId: string;
  authorizationId: string;
  reservationId: string | null;
  externalActionId: string | null;
  provider: string | null;
  status: "PENDING" | "SIMULATED" | "SUCCEEDED" | "FAILED" | "BLOCKED";
  providerReference: string | null;
  idempotencyKey: string;
  result: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
};

export type TreasuryLedgerEntry = {
  entryId: string;
  organizationId: string;
  ventureId: string | null;
  missionId: string | null;
  type: LedgerEntryType;
  subtype: LedgerSubtype | null;
  amount: EpistemicAmount;
  currency: string;
  provider: string | null;
  providerTransactionId: string | null;
  financialActionRequestId: string | null;
  authorizationId: string | null;
  externalActionId: string | null;
  commercialPaymentEventId: string | null;
  occurredAt: string;
  createdAt: string;
  actuality: Actuality;
  idempotencyKey: string;
};

export type RecurringCommitment = {
  commitmentId: string;
  organizationId: string;
  ventureId: string | null;
  vendor: string;
  provider: string | null;
  purpose: string;
  category: TreasuryBudgetCategory;
  amount: EpistemicAmount;
  currency: string;
  frequency: CommitmentFrequency;
  monthlyEquivalent: EpistemicAmount;
  annualEquivalent: EpistemicAmount;
  nextExpectedCharge: string | null;
  lastUsedAt: string | null;
  businessValue: string | null;
  cancellationMechanism: string | null;
  status: CommitmentStatus;
  financialActionRequestId: string | null;
  createdAt: string;
};

export type TreasuryControlState = {
  organizationId: string;
  financialAutonomyEnabled: boolean;
  emergencyFinancialFreeze: boolean;
  updatedAt: string;
};

export type TreasuryState = {
  organizationId: string;
  totalCash: EpistemicAmount;
  internalCapital: EpistemicAmount;
  unallocatedCapital: EpistemicAmount;
  infinityAllocatedCapital: EpistemicAmount;
  availableCapital: EpistemicAmount;
  reservedCapital: EpistemicAmount;
  committedCapital: EpistemicAmount;
  dailySpend: EpistemicAmount;
  monthlySpend: EpistemicAmount;
  lifetimeSpend: EpistemicAmount;
  revenue: EpistemicAmount;
  expenses: EpistemicAmount;
  profit: EpistemicAmount;
  cashReturned: EpistemicAmount;
  pendingTransactions: number | null;
  recurringCommitments: number | null;
  providerFreshness: ProviderFreshness;
  lastProviderSyncAt: string | null;
};

export type CapitalEfficiencyMetrics = {
  revenuePerCapitalSpent: EpistemicAmount;
  profitPerCapitalSpent: EpistemicAmount;
  capitalReturnedRatio: EpistemicAmount;
};

export type CapitalFlywheelStage =
  | "CAPITAL"
  | "VENTURE_ALLOCATION"
  | "FINANCIAL_ACTION"
  | "SPEND"
  | "ACQUISITION"
  | "REVENUE"
  | "PROFIT"
  | "CASH_RETURNED"
  | "PORTFOLIO_PERFORMANCE"
  | "REALLOCATION";

export type CapitalFlywheelModel = {
  stages: CapitalFlywheelStage[];
  autonomousReallocationEnabled: false;
};

export type FinancialLineage = {
  opportunityId: string | null;
  ventureId: string | null;
  missionId: string | null;
  budgetId: string | null;
  financialActionRequestId: string;
  policyDecision: FinancialPolicyDecision | null;
  authorizationId: string | null;
  reservationId: string | null;
  externalActionId: string | null;
  provider: string | null;
  transactionId: string | null;
  ledgerEntryId: string | null;
};

export type ProviderSyncResult = {
  organizationId: string;
  freshness: ProviderFreshness;
  lastProviderSyncAt: string | null;
  accountsUpserted: number;
  balancesUpserted: number;
  transactionsIngested: number;
  transactionsDuplicate: number;
  commitmentsUpserted: number;
  degraded: boolean;
  reason: string | null;
};

export type PolicyEvaluationContext = {
  organizationId: string;
  request: FinancialActionRequest;
  now?: Date;
};
