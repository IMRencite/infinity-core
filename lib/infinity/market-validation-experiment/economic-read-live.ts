import { loadVercelLiveVerificationConfig } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { getSourceBundleVerification } from "./source-bundle-verification";
import { inspectEagEconomicPolicy } from "./eag-economics";
import { evaluateCostProof, factsFromEconomicVerification } from "./cost-evidence";
import type { CostClassification } from "./types";
import {
  MAX_ECONOMIC_READ_CALLS,
  type EconomicEligibility,
  type EconomicReadVerification,
} from "./economic-read-types";
import { persistEconomicReadVerification, getEconomicReadVerification } from "./economic-read-verification";
import {
  billingChargesPath,
  billingWindow,
  configuredVercelTeamId,
  normalizeAccountId,
  normalizeAccountPlan,
  normalizeBillingCharges,
  relevantDeploymentCharges,
  teamPathFor,
  vercelEconomicGet,
  vercelEconomicReadCredentialPresent,
  VERCEL_USER_PATH,
} from "./vercel-economic-read";

export function economicReadLivePermitted(): { allowed: boolean; reason: string } {
  const config = loadVercelLiveVerificationConfig();
  if (!config.credentialPresent || !vercelEconomicReadCredentialPresent()) {
    return { allowed: false, reason: "Vercel credential is not present." };
  }
  if (!config.teamConfigured || !configuredVercelTeamId()) {
    return { allowed: false, reason: "Vercel team/account scope is not configured." };
  }
  if (config.teamLooksProduction) {
    return { allowed: false, reason: "Configured team looks production-scoped." };
  }
  return { allowed: true, reason: "Bounded GET-only economic reads are permitted for the configured team." };
}

export function evaluateEconomicEligibility(
  classification: CostClassification | "METERED",
  founder: { recognized?: boolean } = {},
): EconomicEligibility {
  const policy = inspectEagEconomicPolicy();
  if (classification === "UNKNOWN") {
    if (founder.recognized) {
      return {
        purpose: "MARKET_VALIDATION_EXPERIMENT",
        economicallyEligible: true,
        treasuryAuthorizationRequired: false,
        classification,
        reason: "BOUNDED_BY_FOUNDER_AUTHORIZATION. Provider cost remains UNKNOWN. No Treasury movement.",
        eagWriteExecuted: false,
        treasuryMutated: false,
      };
    }
    return {
      purpose: "MARKET_VALIDATION_EXPERIMENT",
      economicallyEligible: false,
      treasuryAuthorizationRequired: false,
      classification,
      reason: "UNKNOWN cost remains forbidden for MARKET_VALIDATION_EXPERIMENT public deployment.",
      eagWriteExecuted: false,
      treasuryMutated: false,
    };
  }
  return {
    purpose: "MARKET_VALIDATION_EXPERIMENT",
    economicallyEligible: false,
    treasuryAuthorizationRequired: policy.treasuryRequiredForKnownCost,
    classification,
    reason: policy.treasuryRequiredForKnownCost
      ? "Cost class is known, but existing EAG still requires Treasury authorization. No allocation was created."
      : "Known cost class is not yet authorized for a write.",
    eagWriteExecuted: false,
    treasuryMutated: false,
  };
}

export async function refreshVercelPlanIfNeeded(): Promise<{
  refreshed: boolean;
  providerCalls: number;
  verification: EconomicReadVerification;
}> {
  const existing = getEconomicReadVerification();
  if (existing.freshness === "VERIFIED_FRESH" && existing.snapshot.plan?.plan) {
    return { refreshed: false, providerCalls: 0, verification: existing };
  }
  const gate = economicReadLivePermitted();
  const teamId = configuredVercelTeamId();
  if (!gate.allowed || !teamId) {
    return {
      refreshed: false,
      providerCalls: 0,
      verification: persistEconomicReadVerification({
        planStatus: "BLOCKED",
        liveReadAttempted: false,
        providerCalls: 0,
        teamId,
        credentialScope: teamId ? "team" : "missing",
        evidence: gate.reason,
      }),
    };
  }
  let calls = 0;
  const userRes = await vercelEconomicGet(VERCEL_USER_PATH);
  calls += 1;
  let accountId: string | null = null;
  if (userRes.ok) {
    try {
      accountId = normalizeAccountId(JSON.parse(userRes.text));
    } catch {
      accountId = null;
    }
  }
  const teamRes = await vercelEconomicGet(teamPathFor(teamId));
  calls += 1;
  let plan = null;
  if (teamRes.ok) {
    try {
      plan = normalizeAccountPlan(JSON.parse(teamRes.text), teamId);
    } catch {
      plan = null;
    }
  }
  const completed = new Date().toISOString();
  return {
    refreshed: true,
    providerCalls: calls,
    verification: persistEconomicReadVerification({
      planStatus: teamRes.ok && plan ? "READ_ONLY_VERIFIED" : "FAILED",
      liveReadAttempted: true,
      providerCalls: calls,
      teamId,
      accountId,
      credentialScope: "team",
      timestamp: completed,
      evidence: `Minimum plan refresh. GET /v2/user status=${userRes.status}. GET /v2/teams/{teamId} status=${teamRes.status} plan=${plan?.plan ?? "UNKNOWN"}. Billing was not re-read.`,
      snapshot: {
        ...getEconomicReadVerification().snapshot,
        teamId,
        accountId,
        plan,
        timestamp: completed,
        confidence: plan ? "LOW" : "NONE",
      },
    }),
  };
}

export async function verifyVercelEconomicReadsLive(): Promise<EconomicReadVerification> {
  const gate = economicReadLivePermitted();
  const teamId = configuredVercelTeamId();
  if (!gate.allowed || !teamId) {
    return persistEconomicReadVerification({
      planStatus: "BLOCKED",
      billingStatus: "BLOCKED",
      liveReadAttempted: false,
      providerCalls: 0,
      teamId,
      credentialScope: teamId ? "team" : "missing",
      evidence: gate.reason,
    });
  }

  let calls = 0;
  const started = new Date().toISOString();
  const userRes = await vercelEconomicGet(VERCEL_USER_PATH);
  calls += 1;
  let accountId: string | null = null;
  if (userRes.ok) {
    try {
      accountId = normalizeAccountId(JSON.parse(userRes.text));
    } catch {
      accountId = null;
    }
  }

  const teamRes = await vercelEconomicGet(teamPathFor(teamId));
  calls += 1;
  let plan = null;
  if (teamRes.ok) {
    try {
      plan = normalizeAccountPlan(JSON.parse(teamRes.text), teamId);
    } catch {
      plan = null;
    }
  }

  const window = billingWindow();
  const chargesRes = await vercelEconomicGet(billingChargesPath(window.from, window.to));
  calls += 1;
  const billing = chargesRes.ok ? normalizeBillingCharges(chargesRes.text, window.from, window.to) : null;

  if (calls > MAX_ECONOMIC_READ_CALLS) {
    throw new Error("economic_read_call_budget_exceeded");
  }

  const completed = new Date().toISOString();
  const planStatus = teamRes.ok && plan ? "READ_ONLY_VERIFIED" : teamRes.ok ? "FAILED" : "FAILED";
  const billingStatus = chargesRes.ok && billing ? "READ_ONLY_VERIFIED" : "FAILED";
  const relevant = billing ? relevantDeploymentCharges(billing) : [];
  const proof = evaluateCostProof(factsFromEconomicVerification({
    ...getEconomicReadVerification(),
    planStatus,
    billingStatus,
    snapshot: {
      ...getEconomicReadVerification().snapshot,
      teamId,
      accountId,
      plan,
      billing,
      timestamp: completed,
    },
  }));

  return persistEconomicReadVerification({
    planStatus,
    billingStatus,
    liveReadAttempted: true,
    providerCalls: calls,
    teamId,
    accountId,
    credentialScope: "team",
    timestamp: completed,
    evidence: [
      `Live GET verification started ${started}.`,
      `GET /v2/user status=${userRes.status}.`,
      `GET /v2/teams/{teamId} status=${teamRes.status} plan=${plan?.plan ?? "UNKNOWN"}.`,
      `GET /v1/billing/charges status=${chargesRes.status} chargeCount=${billing?.chargeCount ?? "none"} relevantDeploymentCharges=${relevant.length}.`,
      `usage.read not invoked. classifyVercelLiveCost remains UNKNOWN. Adapter/registry zeros remain unattested.`,
      `hosting.deploy_source_bundle remains ${getSourceBundleVerification().status}.`,
      `Cost classification=${proof.classification}.`,
    ].join(" "),
    snapshot: {
      ...getEconomicReadVerification().snapshot,
      teamId,
      accountId,
      plan,
      billing,
      timestamp: completed,
      confidence: plan || billing ? "LOW" : "NONE",
    },
  });
}
