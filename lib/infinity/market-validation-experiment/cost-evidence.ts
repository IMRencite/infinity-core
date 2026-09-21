import { buildProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import type { CommercialProviderVerification } from "@/lib/infinity/commercialization/probes/status";
import { classifyVercelLiveCost } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { ACTION_TYPE_REGISTRY_V1 } from "@/lib/infinity/launch-gateway/action-registry";
import {
  BILLING_WRITE_CAPABILITY,
  type EconomicReadVerification,
} from "./economic-read-types";
import { getEconomicReadVerification } from "./economic-read-verification";
import { relevantDeploymentCharges } from "./vercel-economic-read";
import type { CostClassification } from "./types";

export {
  ACCOUNT_PLAN_READ_CAPABILITY,
  BILLING_READ_CAPABILITY,
  BILLING_WRITE_CAPABILITY,
} from "./economic-read-types";

export const VERCEL_BILLING_CHARGES_PATH = "GET /v1/billing/charges";
export const VERCEL_TEAM_PLAN_PATH = "GET /v2/teams/{teamId}";

export type CostUsageSnapshot = {
  allowance: number | null;
  consumption: number | null;
  dimension: string | null;
  incrementalChargeKnown: false;
};

export type CostEvidenceFacts = {
  accountPlanObserved: boolean;
  accountPlanValue: string | null;
  accountPlanSource: string;
  usageAllowanceObserved: boolean;
  usageConsumptionObserved: boolean;
  usageSource: string;
  billingObservationPresent: boolean;
  billingSource: string;
  providerGuaranteeNoIncrementalCharge: boolean;
  providerUpperBound: number | null;
  providerUpperBoundBasis: string | null;
  meteredRateKnown: boolean;
  meteredRateBasis: string | null;
  adapterEstimateUsd: number;
  registryDefaultUsd: number | null;
  historicalVerificationCostState: "UNKNOWN";
  historicalCostTelemetryPresent: false;
};

export type DeploymentCostEvidence = {
  classification: CostClassification | "METERED";
  estimatedAmount: number | null;
  upperBound: number | null;
  currency: "USD";
  basis: string;
  evidence: string;
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  billingScope: "unattested" | "account" | "team";
  usageSnapshot: CostUsageSnapshot;
  timestamp: string;
  existingAccountPlanEvidence: boolean;
  existingUsageEvidence: boolean;
  existingBillingEvidence: boolean;
  accountPlanSource: string;
  usageSource: string;
  billingSource: string;
  missingEvidence: string[];
  adapterEstimateAcceptedAsKnownZero: false;
  registryDefaultAcceptedAsKnownZero: false;
  historicalVerificationReinterpretedAsZero: false;
  retrospectiveSpendInvented: false;
  unknownTreatedAsZero: false;
  writeBillingInvoked: false;
};

const HOSTING_READ_CAPABILITIES = ["getUser", "listProjects", "listDeployments", "listDomains"] as const;

const PLAN_METADATA_KEYS = ["plan", "billingPlan", "accountPlan", "vercelPlan"];
const USAGE_METADATA_KEYS = ["usage", "allowance", "consumption", "includedUsage", "usageSnapshot"];
const BILLING_METADATA_KEYS = ["invoice", "charges", "billing", "spend", "billingState"];

export function emptyCostFacts(): CostEvidenceFacts {
  return {
    accountPlanObserved: false,
    accountPlanValue: null,
    accountPlanSource: "NONE",
    usageAllowanceObserved: false,
    usageConsumptionObserved: false,
    usageSource: "NONE",
    billingObservationPresent: false,
    billingSource: "NONE",
    providerGuaranteeNoIncrementalCharge: false,
    providerUpperBound: null,
    providerUpperBoundBasis: null,
    meteredRateKnown: false,
    meteredRateBasis: null,
    adapterEstimateUsd: 0,
    registryDefaultUsd: ACTION_TYPE_REGISTRY_V1["hosting.deploy_source_bundle"]?.estimatedCostUsd ?? 0,
    historicalVerificationCostState: "UNKNOWN",
    historicalCostTelemetryPresent: false,
  };
}

function metadataHasMeaningfulValue(
  metadata: Record<string, string | number | boolean | null> | undefined,
  keys: string[],
): boolean {
  if (!metadata) return false;
  return keys.some((key) => {
    const value = metadata[key];
    if (value == null || value === false) return false;
    if (typeof value === "string") return value.trim().length > 0 && value !== "UNKNOWN";
    return true;
  });
}

export function factsFromPersistedHosting(
  persisted: CommercialProviderVerification | null | undefined,
): Pick<CostEvidenceFacts, "accountPlanObserved" | "accountPlanValue" | "accountPlanSource" | "usageAllowanceObserved" | "usageConsumptionObserved" | "usageSource" | "billingObservationPresent" | "billingSource"> {
  const metadata = persisted?.metadata;
  const plan = metadataHasMeaningfulValue(metadata, PLAN_METADATA_KEYS);
  const usage = metadataHasMeaningfulValue(metadata, USAGE_METADATA_KEYS);
  const billing = metadataHasMeaningfulValue(metadata, BILLING_METADATA_KEYS);
  return {
    accountPlanObserved: plan,
    accountPlanValue: plan && typeof metadata?.plan === "string" ? metadata.plan : null,
    accountPlanSource: plan ? "commercial_provider_verifications.HOSTING.metadata" : "NONE",
    usageAllowanceObserved: usage,
    usageConsumptionObserved: usage,
    usageSource: usage ? "commercial_provider_verifications.HOSTING.metadata" : "NONE",
    billingObservationPresent: billing,
    billingSource: billing ? "commercial_provider_verifications.HOSTING.metadata" : "NONE",
  };
}

export function factsFromEconomicVerification(record: EconomicReadVerification): CostEvidenceFacts {
  const plan = record.snapshot.plan;
  const billing = record.snapshot.billing;
  const prices = billing
    ? relevantDeploymentCharges(billing)
        .map((item) => item.listUnitPrice)
        .filter((item): item is number => item != null)
    : [];
  return {
    ...emptyCostFacts(),
    accountPlanObserved: Boolean(plan?.plan),
    accountPlanValue: plan?.plan ?? null,
    accountPlanSource: plan ? plan.source : "NONE",
    usageAllowanceObserved: false,
    usageConsumptionObserved: false,
    usageSource: "NONE",
    billingObservationPresent: record.billingStatus === "READ_ONLY_VERIFIED",
    billingSource: billing ? billing.source : "NONE",
    providerGuaranteeNoIncrementalCharge: false,
    providerUpperBound: null,
    providerUpperBoundBasis: null,
    meteredRateKnown: prices.length > 0,
    meteredRateBasis: prices.length > 0 ? "provider_list_unit_price" : null,
  };
}

export function inspectExistingCostFacts(input: {
  persistedHosting?: CommercialProviderVerification | null;
} = {}): CostEvidenceFacts {
  const fromHq = factsFromPersistedHosting(input.persistedHosting);
  const live = getEconomicReadVerification();
  const fromLive = live.liveReadAttempted ? factsFromEconomicVerification(live) : {};
  return {
    ...emptyCostFacts(),
    ...fromHq,
    ...fromLive,
  };
}

export function evaluateCostProof(facts: CostEvidenceFacts, now = new Date().toISOString()): DeploymentCostEvidence {
  const missing: string[] = [];
  if (!facts.accountPlanObserved) missing.push("account_plan");
  if (!facts.usageAllowanceObserved) missing.push("included_usage_allowance");
  if (!facts.usageConsumptionObserved) missing.push("current_usage_consumption");
  missing.push("relevant_billing_dimension");
  if (!facts.providerGuaranteeNoIncrementalCharge) missing.push("incremental_charge_determination");
  if (!facts.billingObservationPresent) missing.push("invoice_or_billing_observation");
  if (!facts.historicalCostTelemetryPresent) missing.push("attributable_historical_deployment_cost_telemetry");
  if (facts.providerUpperBound == null) missing.push("provider_defensible_upper_bound");
  if (!facts.meteredRateKnown) missing.push("known_metered_rate_semantics");

  const inventedCeiling =
    facts.providerUpperBoundBasis === "historical_verification_ceiling" ||
    facts.providerUpperBoundBasis === "invented_ceiling";
  const planNameOnly = facts.accountPlanObserved && !facts.usageAllowanceObserved;
  const noIncremental =
    facts.accountPlanObserved &&
    facts.usageAllowanceObserved &&
    facts.usageConsumptionObserved &&
    facts.providerGuaranteeNoIncrementalCharge;
  const bounded =
    !inventedCeiling &&
    facts.providerUpperBound != null &&
    facts.providerUpperBoundBasis != null &&
    facts.providerUpperBound > 0;
  const metered = facts.meteredRateKnown && Boolean(facts.meteredRateBasis);

  let classification: CostClassification | "METERED" = "UNKNOWN";
  let basis = "No trustworthy provider/account evidence establishes incremental cost for this deployment.";
  if (noIncremental) {
    classification = "NO_INCREMENTAL_COST";
    basis = "Account plan evidence plus included-usage evidence establishes this action is already covered.";
  } else if (bounded) {
    classification = "BOUNDED";
    basis = facts.providerUpperBoundBasis ?? "provider_upper_bound";
  } else if (metered) {
    classification = "METERED";
    basis = facts.meteredRateBasis ?? "metered_rate";
  } else if (planNameOnly) {
    basis = "Plan name alone is insufficient because usage overages remain possible.";
  }

  const inventory = buildProviderInventory();
  const hostingReads = inventory.hosting.readCapabilities.join(",");

  const evidence = [
    `classifyVercelLiveCost()=${classifyVercelLiveCost()}.`,
    `adapter estimate()=${facts.adapterEstimateUsd} (unattested, not accepted as proof).`,
    `registry hosting.deploy_source_bundle=${facts.registryDefaultUsd} (unattested, not accepted as proof).`,
    `HQ hosting reads=${hostingReads || "none"}; billing/plan/usage are not among verified hosting reads.`,
    `${BILLING_WRITE_CAPABILITY} was not invoked.`,
    `Persisted HOSTING metadata plan=${facts.accountPlanObserved ? "present" : "absent"} usage=${facts.usageAllowanceObserved ? "present" : "absent"} billing=${facts.billingObservationPresent ? "present" : "absent"}.`,
    `Historical GDE verification cost_state=${facts.historicalVerificationCostState}; no attributable cost telemetry.`,
    `Documented Vercel reads ${VERCEL_TEAM_PLAN_PATH} billing.plan and ${VERCEL_BILLING_CHARGES_PATH} cannot by themselves prove included remaining usage or a hard ceiling.`,
    `Missing: ${missing.join(", ")}.`,
  ].join(" ");

  return {
    classification,
    estimatedAmount: classification === "UNKNOWN" ? null : facts.providerUpperBound,
    upperBound: classification === "BOUNDED" ? facts.providerUpperBound : null,
    currency: "USD",
    basis,
    evidence,
    confidence: classification === "UNKNOWN" ? "NONE" : "LOW",
    billingScope: "unattested",
    usageSnapshot: {
      allowance: null,
      consumption: null,
      dimension: null,
      incrementalChargeKnown: false,
    },
    timestamp: now,
    existingAccountPlanEvidence: facts.accountPlanObserved,
    existingUsageEvidence: facts.usageAllowanceObserved && facts.usageConsumptionObserved,
    existingBillingEvidence: facts.billingObservationPresent,
    accountPlanSource: facts.accountPlanSource,
    usageSource: facts.usageSource,
    billingSource: facts.billingSource,
    missingEvidence: missing,
    adapterEstimateAcceptedAsKnownZero: false,
    registryDefaultAcceptedAsKnownZero: false,
    historicalVerificationReinterpretedAsZero: false,
    retrospectiveSpendInvented: false,
    unknownTreatedAsZero: false,
    writeBillingInvoked: false,
  };
}

export function inspectDeploymentCostEvidence(input: {
  persistedHosting?: CommercialProviderVerification | null;
  now?: string;
} = {}): DeploymentCostEvidence {
  return evaluateCostProof(inspectExistingCostFacts(input), input.now ?? new Date().toISOString());
}
