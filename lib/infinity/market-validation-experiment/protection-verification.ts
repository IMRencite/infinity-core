import { HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE } from "./live-validation-failure";
import { FAILED_CRE_VALIDATION_PROJECT } from "./constants";

export type ProtectionCapabilityStatus = "UNVERIFIED" | "LIVE_WRITE_VERIFIED" | "FAILED";

export type ProtectionCapabilityVerification = {
  provider: "vercel.com_v1";
  capability: typeof HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE;
  status: ProtectionCapabilityStatus;
  project: typeof FAILED_CRE_VALIDATION_PROJECT;
  teamId: string | null;
  mutationEndpoint: string | null;
  mutationResult: string | null;
  timestamp: string | null;
  artifactId: string | null;
  digest: string | null;
  deploymentId: string | null;
  founderAuthorizationId: string | null;
  providerCostState: "UNKNOWN";
  unrelatedCapabilitiesGranted: false;
  liveWriteAttempted: boolean;
  providerWrites: number;
  httpStatus: number | null;
  providerError: string | null;
  evidence: string;
};

let record: ProtectionCapabilityVerification = unverifiedProtection();

function unverifiedProtection(): ProtectionCapabilityVerification {
  return {
    provider: "vercel.com_v1",
    capability: HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
    status: "UNVERIFIED",
    project: FAILED_CRE_VALIDATION_PROJECT,
    teamId: null,
    mutationEndpoint: null,
    mutationResult: null,
    timestamp: null,
    artifactId: null,
    digest: null,
    deploymentId: null,
    founderAuthorizationId: null,
    providerCostState: "UNKNOWN",
    unrelatedCapabilitiesGranted: false,
    liveWriteAttempted: false,
    providerWrites: 0,
    httpStatus: null,
    providerError: null,
    evidence:
      "hosting.deployment_protection.configure is modeled and unimplemented as LIVE_WRITE_VERIFIED. No project protection mutation has run.",
  };
}

export function resetProtectionVerification(): void {
  record = unverifiedProtection();
}

export function getProtectionVerification(): ProtectionCapabilityVerification {
  return record;
}

export function persistProtectionVerification(
  update: Partial<ProtectionCapabilityVerification>,
): ProtectionCapabilityVerification {
  record = {
    ...record,
    ...update,
    capability: HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
    unrelatedCapabilitiesGranted: false,
    project: FAILED_CRE_VALIDATION_PROJECT,
    providerCostState: "UNKNOWN",
  };
  return record;
}
