/** Commercialization Control Plane v1 — shared types */

export type CommercializationPlanStatus =
  | "DRAFT"
  | "READY"
  | "EXECUTING"
  | "ACTIVE"
  | "BLOCKED"
  | "FAILED";

export type CommercializationStage =
  | "PLAN"
  | "DOMAIN"
  | "INFRASTRUCTURE"
  | "DEPLOY"
  | "REVENUE_ACTIVATION"
  | "VERIFY"
  | "READY";

export type SpendCategory =
  | "DOMAIN_REGISTRATION"
  | "DOMAIN_RENEWAL"
  | "HOSTING"
  | "EMAIL"
  | "SAAS_INFRASTRUCTURE"
  | "PAYMENT_PROCESSING"
  | "CREATIVE"
  | "MARKETING"
  | "OTHER";

export type PolicyOutcome = "AUTO_ALLOWED" | "CONDITIONALLY_ALLOWED" | "HITL_REQUIRED" | "DENIED";

export type FinancialTruth = "ACTUAL" | "ESTIMATE" | "UNKNOWN";

export type SpendIntentStatus = "PENDING" | "AUTHORIZED" | "DENIED" | "EXECUTED" | "FAILED" | "CANCELLED";

export type LedgerEntryType =
  | "MODEL_SPEND"
  | "DOMAIN_SPEND"
  | "HOSTING_SPEND"
  | "PAYMENT_PROCESSING_FEES"
  | "MARKETING_SPEND"
  | "OTHER_EXTERNAL_SPEND"
  | "GROSS_REVENUE"
  | "REFUNDS"
  | "NET_REVENUE";

export type CommercialFailureCode =
  | "PROVIDER_UNAVAILABLE"
  | "AUTHORIZATION_MISSING"
  | "BUDGET_DENIED"
  | "DOMAIN_UNAVAILABLE"
  | "PRICE_CHANGED"
  | "DNS_VERIFICATION_FAILED"
  | "DEPLOYMENT_FAILED"
  | "CHECKOUT_CONFIGURATION_FAILED"
  | "WEBHOOK_FAILED"
  | "FULFILLMENT_FAILED";

export type CommercialHealthStatus = "READY" | "DEGRADED" | "BLOCKED";

export type PricingModelType =
  | "ONE_TIME"
  | "SUBSCRIPTION"
  | "USAGE_BASED"
  | "LEAD_GENERATION"
  | "SERVICE_DEPOSIT"
  | "FREE_WITH_UPGRADE";

export type PaymentEventType =
  | "CHECKOUT_COMPLETED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_STARTED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_CANCELLED"
  | "REFUND_CREATED";

export type EntitlementStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "CAA";

export type DeploymentLifecycleStatus =
  | "PENDING"
  | "PRODUCTION_READY"
  | "DEPLOYED"
  | "DOMAIN_ATTACHED"
  | "PUBLICLY_LAUNCHED"
  | "FAILED"
  | "ROLLED_BACK";

export type CommercializationPlan = {
  id: string;
  organizationId: string;
  ventureId: string;
  ventureBlueprintId: string | null;
  selectedCandidateId: string | null;
  missionId: string | null;
  cycleKey: string | null;
  brandName: string;
  productType: string | null;
  businessModel: string | null;
  domainRequirements: Record<string, unknown>;
  hostingRequirements: Record<string, unknown>;
  paymentModel: Record<string, unknown>;
  pricing: Record<string, unknown>;
  fulfillmentModel: Record<string, unknown>;
  expectedInfrastructureSpend: Record<string, unknown>;
  externalActionRequirements: unknown[];
  status: CommercializationPlanStatus;
  currentStage: CommercializationStage;
  idempotencyKey: string;
  createdAt: string;
};

export type VentureBudget = {
  id: string;
  organizationId: string;
  ventureId: string;
  currency: string;
  authorizedBudgetUsd: number | null;
  actualSpendUsd: number;
  actualRevenueUsd: number;
  budgetTruth: FinancialTruth;
  revenueTruth: FinancialTruth;
  policyConfig: Record<string, unknown>;
};

export type SpendIntent = {
  id: string;
  organizationId: string;
  ventureId: string;
  missionId: string | null;
  commercializationPlanId: string | null;
  category: SpendCategory;
  provider: string;
  capability: string;
  purpose: string;
  requestedAmountUsd: number;
  currency: string;
  estimatedRecurringAmountUsd: number | null;
  reversibility: string;
  expectedValue: Record<string, unknown>;
  policyDecision: PolicyOutcome | null;
  authoritySource: string | null;
  status: SpendIntentStatus;
  idempotencyKey: string;
  createdAt: string;
};

export type SpendAuthorization = {
  id: string;
  organizationId: string;
  spendIntentId: string;
  externalActionId: string | null;
  authorizedAmountUsd: number;
  policyOutcome: PolicyOutcome;
  authoritySource: string;
  expiresAt: string | null;
  createdAt: string;
};

export type SpendExecution = {
  id: string;
  organizationId: string;
  spendIntentId: string;
  spendAuthorizationId: string;
  externalActionId: string | null;
  provider: string;
  capability: string;
  executionStatus: "PENDING" | "SUCCEEDED" | "FAILED" | "BLOCKED";
  actualCostUsd: number | null;
  costTruth: FinancialTruth;
  providerReference: string | null;
  idempotencyKey: string;
  result: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
};

export type DomainRequirement = {
  id: string;
  organizationId: string;
  ventureId: string;
  commercializationPlanId: string | null;
  brandName: string;
  businessDescription: string | null;
  preferredKeywords: string[];
  preferredTlds: string[];
  maxLength: number | null;
  avoidHyphens: boolean;
  avoidNumbers: boolean;
  brandabilityPriority: number | null;
  seoPriority: number | null;
  maximumPurchasePriceUsd: number | null;
  renewalPriceConstraintUsd: number | null;
};

export type DomainCandidateScoreBreakdown = {
  brandFit: number;
  memorability: number;
  spellingClarity: number;
  length: number;
  customerRelevance: number;
  tldQuality: number;
  businessRelevance: number;
  price: number;
  renewalCost: number;
  confusionRisk: number;
  trademarkRiskSignal: number;
};

export type DomainCandidate = {
  id: string;
  organizationId: string;
  domainRequirementId: string;
  domain: string;
  tld: string;
  available: boolean | null;
  registrationPriceUsd: number | null;
  renewalPriceUsd: number | null;
  priceTruth: FinancialTruth;
  totalScore: number;
  scoreBreakdown: DomainCandidateScoreBreakdown;
  selected: boolean;
};

export type DomainAsset = {
  id: string;
  organizationId: string;
  ventureId: string;
  domain: string;
  registrar: string;
  registrarDomainId: string | null;
  registrationPriceUsd: number | null;
  renewalPriceUsd: number | null;
  priceTruth: FinancialTruth;
  currency: string;
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  status: "PENDING" | "REGISTERED" | "FAILED" | "EXPIRED" | "TRANSFERRED";
  nameserverMode: string | null;
  dnsProvider: string | null;
  verificationState: string;
  spendExecutionId: string | null;
  idempotencyKey: string;
};

export type DnsDesiredRecord = {
  recordType: DnsRecordType;
  name: string;
  value: string;
  ttl: number;
  purpose: string | null;
};

export type DnsDesiredState = {
  id: string;
  organizationId: string;
  ventureId: string;
  domainAssetId: string | null;
  zoneName: string;
  provider: string;
  status: "PENDING" | "RECONCILING" | "SYNCED" | "DEGRADED" | "FAILED";
  records: DnsDesiredRecord[];
  idempotencyKey: string;
};

export type DeploymentAsset = {
  id: string;
  organizationId: string;
  ventureId: string;
  provider: string;
  projectId: string | null;
  deploymentId: string | null;
  environment: string;
  status: DeploymentLifecycleStatus;
  deploymentUrl: string | null;
  customDomain: string | null;
  artifactId: string | null;
  commitHash: string | null;
  productionReady: boolean;
  deployed: boolean;
  domainAttached: boolean;
  publiclyLaunched: boolean;
  rollbackReference: string | null;
  verifiedAt: string | null;
  idempotencyKey: string;
};

export type RevenueActivationPlan = {
  id: string;
  organizationId: string;
  ventureId: string;
  commercializationPlanId: string | null;
  monetizationPlanId: string | null;
  monetizationRunId: string | null;
  businessModel: string;
  pricingModel: string;
  status: "DRAFT" | "CONFIGURING" | "READY" | "ACTIVE" | "BLOCKED" | "FAILED";
  idempotencyKey: string;
};

export type CommercialProduct = {
  id: string;
  organizationId: string;
  ventureId: string;
  revenueActivationPlanId: string | null;
  provider: string;
  providerProductId: string | null;
  name: string;
  description: string | null;
  businessModel: string;
  status: "DRAFT" | "CONFIGURED" | "ACTIVE" | "ARCHIVED";
  monetizationPlanId: string | null;
  monetizationRunId: string | null;
  idempotencyKey: string;
};

export type CommercialPrice = {
  id: string;
  organizationId: string;
  commercialProductId: string;
  providerPriceId: string | null;
  amountUsd: number;
  currency: string;
  interval: string | null;
  pricingType: PricingModelType;
  active: boolean;
  estimateSource: string | null;
  monetizationPlanId: string | null;
  lineage: Record<string, unknown>;
  idempotencyKey: string;
};

export type CommercialCheckoutConfiguration = {
  id: string;
  organizationId: string;
  ventureId: string;
  commercialProductId: string;
  commercialPriceId: string;
  provider: string;
  checkoutUrl: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  status: "DRAFT" | "READY" | "ACTIVE" | "FAILED";
  ventureMetadata: Record<string, unknown>;
  idempotencyKey: string;
};

export type CommercialPaymentEvent = {
  id: string;
  organizationId: string;
  ventureId: string;
  provider: string;
  providerEventId: string;
  eventType: PaymentEventType;
  commercialProductId: string | null;
  commercialPriceId: string | null;
  grossAmountUsd: number | null;
  feeAmountUsd: number | null;
  netAmountUsd: number | null;
  amountTruth: FinancialTruth;
  currency: string;
  customerReference: string | null;
  payloadSanitized: Record<string, unknown>;
  processedAt: string | null;
  idempotencyKey: string;
  createdAt: string;
};

export type CommercialEntitlement = {
  id: string;
  organizationId: string;
  ventureId: string;
  customerId: string;
  commercialProductId: string;
  commercialPriceId: string | null;
  providerSubscriptionId: string | null;
  entitlementType: string;
  status: EntitlementStatus;
  paymentEventId: string | null;
  startedAt: string;
  expiresAt: string | null;
  idempotencyKey: string;
};

export type CommercialLedgerEntry = {
  id: string;
  organizationId: string;
  ventureId: string;
  entryType: LedgerEntryType;
  amountUsd: number;
  currency: string;
  truth: FinancialTruth;
  category: string | null;
  sourceType: string;
  sourceId: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  recordedAt: string;
};

export const COMMERCIALIZATION_MISSION_TYPE = "COMMERCIALIZE_VENTURE" as const;

export const COMMERCIALIZATION_STAGES: CommercializationStage[] = [
  "PLAN",
  "DOMAIN",
  "INFRASTRUCTURE",
  "DEPLOY",
  "REVENUE_ACTIVATION",
  "VERIFY",
  "READY",
];
