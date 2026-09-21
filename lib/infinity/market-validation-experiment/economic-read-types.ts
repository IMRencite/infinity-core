import type { ProviderVerificationFreshness } from "@/lib/infinity/commercialization/probes/status";
import type { CostClassification } from "./types";

export const ACCOUNT_PLAN_READ_CAPABILITY = "account.plan.read" as const;
export const BILLING_READ_CAPABILITY = "billing.read" as const;
export const BILLING_WRITE_CAPABILITY = "billing.manage" as const;
export const USAGE_READ_CAPABILITY = "usage.read" as const;
export const ECONOMIC_READ_PROVIDER = "vercel.com_v1" as const;
export const MAX_ECONOMIC_READ_CALLS = 5;

export type EconomicReadCapabilityStatus = "READ_ONLY_VERIFIED" | "UNVERIFIED" | "FAILED" | "BLOCKED";

export type AccountPlanReadRequest = {
  capability: typeof ACCOUNT_PLAN_READ_CAPABILITY;
  teamId: string;
  purpose: "MARKET_VALIDATION_EXPERIMENT_COST_EVIDENCE";
};

export type BillingReadRequest = {
  capability: typeof BILLING_READ_CAPABILITY;
  teamId: string;
  from: string;
  to: string;
  purpose: "MARKET_VALIDATION_EXPERIMENT_COST_EVIDENCE";
};

export type NormalizedAccountPlan = {
  teamId: string;
  teamSlug: string | null;
  plan: "hobby" | "pro" | "enterprise" | string | null;
  billingPeriod: string | null;
  source: "GET /v2/teams/{teamId}";
};

export type NormalizedBillingCharge = {
  serviceName: string | null;
  billedCost: number | null;
  effectiveCost: number | null;
  listUnitPrice: number | null;
  chargePeriodStart: string | null;
  chargePeriodEnd: string | null;
};

export type NormalizedBilling = {
  periodFrom: string;
  periodTo: string;
  chargeCount: number;
  charges: NormalizedBillingCharge[];
  billedCostSum: number | null;
  effectiveCostSum: number | null;
  unitPricesObserved: number[];
  source: "GET /v1/billing/charges";
};

export type DeploymentRuntimeEconomics = {
  deploymentActionCost: "UNKNOWN";
  validationRuntimeCost: "UNKNOWN";
  durationDays: 14;
  relevantDimensions: string[];
  deploymentActionSeparatedFromRuntime: true;
};

export type EconomicEvidenceSnapshot = {
  provider: typeof ECONOMIC_READ_PROVIDER;
  teamId: string | null;
  accountId: string | null;
  plan: NormalizedAccountPlan | null;
  billing: NormalizedBilling | null;
  usage: null;
  deploymentRuntime: DeploymentRuntimeEconomics;
  timestamp: string | null;
  freshness: ProviderVerificationFreshness;
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  writeCapabilitiesGranted: false;
};

export type EconomicReadVerification = {
  provider: typeof ECONOMIC_READ_PROVIDER;
  planCapability: typeof ACCOUNT_PLAN_READ_CAPABILITY;
  billingCapability: typeof BILLING_READ_CAPABILITY;
  usageCapability: typeof USAGE_READ_CAPABILITY;
  usageRequired: false;
  planStatus: EconomicReadCapabilityStatus;
  billingStatus: EconomicReadCapabilityStatus;
  usageStatus: "NOT_REQUIRED";
  writeCapabilitiesChanged: false;
  sourceBundleRemainsUnverified: true;
  liveReadAttempted: boolean;
  providerCalls: number;
  mutations: 0;
  teamId: string | null;
  accountId: string | null;
  credentialScope: "team" | "missing";
  evidence: string;
  snapshot: EconomicEvidenceSnapshot;
  timestamp: string | null;
  freshness: ProviderVerificationFreshness;
  persistedInProcess: boolean;
  hqHostingRowMutated: false;
};

export type EconomicEligibility = {
  purpose: "MARKET_VALIDATION_EXPERIMENT";
  economicallyEligible: boolean;
  treasuryAuthorizationRequired: boolean;
  classification: CostClassification | "METERED";
  reason: string;
  eagWriteExecuted: false;
  treasuryMutated: false;
};
