import { freshnessFromCompletedAt, type ProviderVerificationFreshness } from "@/lib/infinity/commercialization/probes/status";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { LOCKED_CRE_SOURCE_DIGEST } from "./source-bundle-request";

export type SourceBundleCapabilityStatus = "UNVERIFIED" | "LIVE_WRITE_VERIFIED" | "FAILED";

export type SourceBundleCapabilityVerification = {
  provider: "vercel.com_v1";
  capability: typeof SOURCE_BUNDLE_CAPABILITY;
  status: SourceBundleCapabilityStatus;
  scope: {
    purpose: "MARKET_VALIDATION_EXPERIMENT";
    capability: typeof SOURCE_BUNDLE_CAPABILITY;
    artifactId: string | null;
    sourceDigest: string | null;
  };
  evidence: string;
  timestamp: string | null;
  accountTeamConfigured: boolean;
  deploymentId: string | null;
  projectId: string | null;
  url: string | null;
  candidateId: string | null;
  experimentId: string | null;
  artifactId: string | null;
  founderAuthorizationId: string | null;
  deploymentCeilingUsd: number | null;
  runtimeCeilingUsd: number | null;
  providerCostState: "UNKNOWN";
  sourceDigest: string | null;
  costEvidence: string;
  freshness: ProviderVerificationFreshness;
  unrelatedCapabilitiesGranted: false;
  liveWriteAttempted: boolean;
  providerCalls: number;
  transportPathProven: boolean;
  endToEndCapabilityVerified: boolean;
};

const UNVERIFIED_SOURCE_BUNDLE_RECORD: SourceBundleCapabilityVerification = {
  provider: "vercel.com_v1",
  capability: SOURCE_BUNDLE_CAPABILITY,
  status: "UNVERIFIED",
  scope: {
    purpose: "MARKET_VALIDATION_EXPERIMENT",
    capability: SOURCE_BUNDLE_CAPABILITY,
    artifactId: null,
    sourceDigest: LOCKED_CRE_SOURCE_DIGEST,
  },
  evidence:
    "Adapter implements Vercel /v2/files + /v13/deployments files[] translation. No live write was executed. hosting.deploy remains git_integrated and was not broadened.",
  timestamp: null,
  accountTeamConfigured: false,
  deploymentId: null,
  projectId: null,
  url: null,
  candidateId: null,
  experimentId: null,
  artifactId: null,
  founderAuthorizationId: null,
  deploymentCeilingUsd: null,
  runtimeCeilingUsd: null,
  providerCostState: "UNKNOWN",
  sourceDigest: LOCKED_CRE_SOURCE_DIGEST,
  costEvidence: "UNKNOWN. Adapter estimate 0 and registry 0 are unattested. No billing read capability exists.",
  freshness: "NOT_VERIFIED",
  unrelatedCapabilitiesGranted: false,
  liveWriteAttempted: false,
  providerCalls: 0,
  transportPathProven: false,
  endToEndCapabilityVerified: false,
};

let record: SourceBundleCapabilityVerification = { ...UNVERIFIED_SOURCE_BUNDLE_RECORD };

function unverifiedRecord(): SourceBundleCapabilityVerification {
  return { ...UNVERIFIED_SOURCE_BUNDLE_RECORD, scope: { ...UNVERIFIED_SOURCE_BUNDLE_RECORD.scope } };
}

export function resetSourceBundleVerification(): void {
  record = unverifiedRecord();
}

export function persistSourceBundleVerification(
  update: Partial<SourceBundleCapabilityVerification>,
): SourceBundleCapabilityVerification {
  const next: SourceBundleCapabilityVerification = {
    ...record,
    ...update,
    capability: SOURCE_BUNDLE_CAPABILITY,
    provider: "vercel.com_v1",
    unrelatedCapabilitiesGranted: false,
    freshness: freshnessFromCompletedAt(update.timestamp ?? record.timestamp),
    endToEndCapabilityVerified: false,
    transportPathProven: false,
  };
  next.endToEndCapabilityVerified = next.status === "LIVE_WRITE_VERIFIED";
  next.transportPathProven = Boolean(
    update.transportPathProven ??
      (next.liveWriteAttempted || next.status === "FAILED" || Boolean(next.deploymentId)),
  );
  if (next.status !== "LIVE_WRITE_VERIFIED") {
    next.endToEndCapabilityVerified = false;
  }
  record = next;
  return record;
}

export function sourceBundleTransportProven(verification = record): boolean {
  return Boolean(
    verification.transportPathProven ||
      verification.liveWriteAttempted ||
      verification.status === "FAILED" ||
      verification.deploymentId,
  );
}

export function sourceBundleEndToEndVerified(verification = record): boolean {
  return verification.status === "LIVE_WRITE_VERIFIED";
}

export function getSourceBundleVerification(): SourceBundleCapabilityVerification {
  return record;
}

export function sourceBundleCapabilityIsLiveWriteVerified(): boolean {
  return record.status === "LIVE_WRITE_VERIFIED";
}

export function evaluateSourceBundleLiveWriteGate(input: {
  adapterImplemented: boolean;
  capabilityVerified: boolean;
  unknownCost: boolean;
  eagApproved: boolean;
  sourceIntegrity: "PASS" | "FAIL";
  secretSafety: "PASS" | "FAIL";
  founderCeilingRecognized?: boolean;
}): {
  allowed: boolean;
  liveVerificationAttempted: false;
  state:
    | "ADAPTER_NOT_IMPLEMENTED"
    | "SOURCE_INTEGRITY_FAILED"
    | "CAPABILITY_UNVERIFIED"
    | "CAPABILITY_IMPLEMENTED_BUT_COST_BLOCKED"
    | "EAG_DENIED"
    | "AUTHORIZED_FIRST_WRITE";
  reason: string;
} {
  if (!input.adapterImplemented) {
    return {
      allowed: false,
      liveVerificationAttempted: false,
      state: "ADAPTER_NOT_IMPLEMENTED",
      reason: "hosting.deploy_source_bundle is not implemented on the Vercel adapter.",
    };
  }
  if (input.sourceIntegrity === "FAIL" || input.secretSafety === "FAIL") {
    return {
      allowed: false,
      liveVerificationAttempted: false,
      state: "SOURCE_INTEGRITY_FAILED",
      reason: "Source integrity or secret safety failed.",
    };
  }
  if (input.unknownCost && !input.founderCeilingRecognized) {
    return {
      allowed: false,
      liveVerificationAttempted: false,
      state: "CAPABILITY_IMPLEMENTED_BUT_COST_BLOCKED",
      reason:
        "Unknown-cost public writes are forbidden. The source-bundle adapter exists but the live capability probe and CRE deploy were not executed.",
    };
  }
  if (!input.eagApproved) {
    return {
      allowed: false,
      liveVerificationAttempted: false,
      state: "EAG_DENIED",
      reason: "EAG did not approve the live write.",
    };
  }
  if (!input.capabilityVerified && !input.founderCeilingRecognized) {
    return {
      allowed: false,
      liveVerificationAttempted: false,
      state: "CAPABILITY_UNVERIFIED",
      reason: "hosting.deploy_source_bundle is not LIVE_WRITE_VERIFIED.",
    };
  }
  return {
    allowed: true,
    liveVerificationAttempted: false,
    state: "AUTHORIZED_FIRST_WRITE",
    reason: input.founderCeilingRecognized
      ? "EAG approved one first source-bundle write under UNKNOWN_COST_WITH_EXPLICIT_HUMAN_CEILING. Provider cost remains UNKNOWN."
      : "EAG approved the source-bundle write under known cost and verified capability.",
  };
}
