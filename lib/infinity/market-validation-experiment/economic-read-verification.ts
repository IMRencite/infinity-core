import { freshnessFromCompletedAt, type ProviderVerificationFreshness } from "@/lib/infinity/commercialization/probes/status";
import {
  ACCOUNT_PLAN_READ_CAPABILITY,
  BILLING_READ_CAPABILITY,
  ECONOMIC_READ_PROVIDER,
  USAGE_READ_CAPABILITY,
  type EconomicEvidenceSnapshot,
  type EconomicReadVerification,
} from "./economic-read-types";

function emptySnapshot(freshness: ProviderVerificationFreshness = "NOT_VERIFIED"): EconomicEvidenceSnapshot {
  return {
    provider: ECONOMIC_READ_PROVIDER,
    teamId: null,
    accountId: null,
    plan: null,
    billing: null,
    usage: null,
    deploymentRuntime: {
      deploymentActionCost: "UNKNOWN",
      validationRuntimeCost: "UNKNOWN",
      durationDays: 14,
      relevantDimensions: [
        "POST /v2/files",
        "POST /v13/deployments",
        "next_build",
        "preview_hosting",
        "form_api_requests",
        "analytics_ingest",
      ],
      deploymentActionSeparatedFromRuntime: true,
    },
    timestamp: null,
    freshness,
    confidence: "NONE",
    writeCapabilitiesGranted: false,
  };
}

function unverifiedRecord(): EconomicReadVerification {
  return {
    provider: ECONOMIC_READ_PROVIDER,
    planCapability: ACCOUNT_PLAN_READ_CAPABILITY,
    billingCapability: BILLING_READ_CAPABILITY,
    usageCapability: USAGE_READ_CAPABILITY,
    usageRequired: false,
    planStatus: "UNVERIFIED",
    billingStatus: "UNVERIFIED",
    usageStatus: "NOT_REQUIRED",
    writeCapabilitiesChanged: false,
    sourceBundleRemainsUnverified: true,
    liveReadAttempted: false,
    providerCalls: 0,
    mutations: 0,
    teamId: null,
    accountId: null,
    credentialScope: "missing",
    evidence:
      "account.plan.read and billing.read are implemented against GET /v2/teams/{teamId} and GET /v1/billing/charges. They begin UNVERIFIED. usage.read is not required because no documented usage-allowance snapshot endpoint is in the current provider contract. No live read has run.",
    snapshot: emptySnapshot(),
    timestamp: null,
    freshness: "NOT_VERIFIED",
    persistedInProcess: true,
    hqHostingRowMutated: false,
  };
}

let record: EconomicReadVerification = unverifiedRecord();

export function resetEconomicReadVerification(): void {
  record = unverifiedRecord();
}

export function persistEconomicReadVerification(
  update: Partial<EconomicReadVerification>,
): EconomicReadVerification {
  const timestamp = update.timestamp ?? record.timestamp;
  record = {
    ...record,
    ...update,
    provider: ECONOMIC_READ_PROVIDER,
    planCapability: ACCOUNT_PLAN_READ_CAPABILITY,
    billingCapability: BILLING_READ_CAPABILITY,
    usageCapability: USAGE_READ_CAPABILITY,
    usageRequired: false,
    usageStatus: "NOT_REQUIRED",
    writeCapabilitiesChanged: false,
    sourceBundleRemainsUnverified: true,
    mutations: 0,
    hqHostingRowMutated: false,
    persistedInProcess: true,
    freshness: freshnessFromCompletedAt(timestamp),
    snapshot: {
      ...record.snapshot,
      ...(update.snapshot ?? {}),
      writeCapabilitiesGranted: false,
      freshness: freshnessFromCompletedAt(update.snapshot?.timestamp ?? timestamp),
    },
  };
  return record;
}

export function getEconomicReadVerification(): EconomicReadVerification {
  return record;
}
