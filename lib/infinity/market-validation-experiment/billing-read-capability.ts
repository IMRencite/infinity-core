import { buildProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import { loadVercelLiveVerificationConfig } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { UNVERIFIED_HOSTING_CAPABILITIES } from "./constants";
import {
  ACCOUNT_PLAN_READ_CAPABILITY,
  BILLING_READ_CAPABILITY,
  BILLING_WRITE_CAPABILITY,
  VERCEL_BILLING_CHARGES_PATH,
  VERCEL_TEAM_PLAN_PATH,
} from "./cost-evidence";

export type ReadOnlyCostCapabilityInspection = {
  capability: typeof BILLING_READ_CAPABILITY;
  companionCapability: typeof ACCOUNT_PLAN_READ_CAPABILITY;
  writeCapability: typeof BILLING_WRITE_CAPABILITY;
  alreadyVerified: false;
  implemented: true;
  provider: "vercel.com_v1";
  documentedReadEndpoints: [typeof VERCEL_BILLING_CHARGES_PATH, typeof VERCEL_TEAM_PLAN_PATH];
  documentedResponseSufficiency:
    | "HISTORICAL_CHARGES_AND_PLAN_NAME_ONLY";
  hostingVerifiedReads: string[];
  writeBillingAmongUnverified: boolean;
  liveReadAttempted: false;
  providerCalls: 0;
  mutations: 0;
  policyAllowsReadOnlyLiveVerify: boolean;
  currentlyAuthorizedToInvoke: false;
  invoked: false;
  reasonNotInvoked: string;
  credentialPresent: boolean;
  teamConfigured: boolean;
};

export function inspectReadOnlyCostCapability(): ReadOnlyCostCapabilityInspection {
  const config = loadVercelLiveVerificationConfig();
  const inventory = buildProviderInventory();
  const policyAllowsReadOnlyLiveVerify =
    config.credentialPresent &&
    config.teamConfigured &&
    !config.teamLooksProduction;
  return {
    capability: BILLING_READ_CAPABILITY,
    companionCapability: ACCOUNT_PLAN_READ_CAPABILITY,
    writeCapability: BILLING_WRITE_CAPABILITY,
    alreadyVerified: false,
    implemented: true,
    provider: "vercel.com_v1",
    documentedReadEndpoints: [VERCEL_BILLING_CHARGES_PATH, VERCEL_TEAM_PLAN_PATH],
    documentedResponseSufficiency: "HISTORICAL_CHARGES_AND_PLAN_NAME_ONLY",
    hostingVerifiedReads: inventory.hosting.readCapabilities,
    writeBillingAmongUnverified: (UNVERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(BILLING_WRITE_CAPABILITY),
    liveReadAttempted: false,
    providerCalls: 0,
    mutations: 0,
    policyAllowsReadOnlyLiveVerify,
    currentlyAuthorizedToInvoke: false,
    invoked: false,
    reasonNotInvoked:
      "billing.read and account.plan.read are modeled from the documented Vercel contract but are not already verified. GET /v2/teams returns billing.plan name only. GET /v1/billing/charges returns historical FOCUS charges. Plan name is insufficient when overages are possible. Historical charges, or the absence of charges, are not proof of no incremental cost for a future deploy. No included-usage allowance or consumption snapshot is available from those responses. The live read was not invoked because it cannot change UNKNOWN and the capability is not already verified.",
    credentialPresent: config.credentialPresent,
    teamConfigured: config.teamConfigured,
  };
}

export function writeBillingWasInvoked(): false {
  return false;
}
