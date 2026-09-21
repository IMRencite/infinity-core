import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  inspectVercelLiveCredentialAttestation,
} from "@/lib/infinity/governed-deployment-execution/vercel-live";
import { classifyVercelLiveCost, loadVercelLiveVerificationConfig } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import {
  MARKET_VALIDATION_PURPOSE,
  UNVERIFIED_HOSTING_CAPABILITIES,
  VERIFIED_HOSTING_CAPABILITIES,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE } from "./live-validation-failure";
import { getProtectionVerification } from "./protection-verification";
import { getSourceBundleVerification } from "./source-bundle-verification";
import type { CommercialProviderVerification } from "@/lib/infinity/commercialization/probes/status";

export const PROVIDER_DEPLOY_INPUT_GIT_SHA = "GIT_SHA" as const;
export const PROVIDER_DEPLOY_INPUT_SANDBOX_FILES = "SANDBOX_FILES" as const;

export type HostingProviderCapabilityInspection = {
  provider: "vercel";
  adapterKey: "vercel.com_v1";
  accountScope: {
    teamConfigured: boolean;
    teamLooksProduction: boolean;
    testTeamConfirmed: boolean;
    testResource: string | null;
    testResourceDisposable: boolean;
    repositoryDisposable: boolean;
  };
  verificationMode: "LIVE_WRITE_PROBE" | "READ_ONLY_HQ" | "CONFIG_ONLY" | "NONE";
  verificationStatus: "LIVE_WRITE_VERIFIED" | "READ_ONLY_VERIFIED" | "CONFIGURED_UNVERIFIED" | "UNVERIFIED";
  verifiedCapabilities: string[];
  intendedCapabilities: string[];
  reusableCapabilityVerification: boolean;
  artifactBoundProbe: boolean;
  projectBoundProbe: boolean;
  capabilityBound: boolean;
  verificationArtifactId: string | null;
  verificationEvidence: string;
  unverifiedCapabilitiesGranted: false;
  costClassification: "KNOWN_ZERO" | "KNOWN_COST" | "POTENTIALLY_BILLABLE" | "UNKNOWN";
  adapterEstimateUsd: number;
  adapterEstimateAcceptedAsKnownZero: false;
  hostingDeployContract: "git_integrated_commit_sha";
  deployInputClassVerified: typeof PROVIDER_DEPLOY_INPUT_GIT_SHA;
  deployInputClassRequired: typeof PROVIDER_DEPLOY_INPUT_SANDBOX_FILES;
  deployInputCompatible: boolean;
  newCapabilityRequired: boolean;
  newCapability: "hosting.deploy_source_bundle";
  newCapabilityVerified: boolean;
  vercelPackageSupport: "SUPPORTED" | "UNSUPPORTED_CAPABILITY";
  unlimitedDeployAuthority: false;
  persistedHq: {
    present: boolean;
    mode: "READ_ONLY" | null;
    mutationAuthority: "LOCKED" | null;
    status: string | null;
    capabilitiesChecked: string[];
    freshness: string | null;
  };
};

export function inspectHostingProviderCapability(input: {
  persistedHosting?: CommercialProviderVerification | null;
} = {}): HostingProviderCapabilityInspection {
  const config = loadVercelLiveVerificationConfig();
  const attestation = inspectVercelLiveCredentialAttestation();
  const adapterActions = vercelAdapter.capabilities.supportedActions;
  const intended = config.intendedActions.length ? config.intendedActions : [...adapterActions];
  const extrasGranted = intended.some(
    (action) =>
      action !== SOURCE_BUNDLE_CAPABILITY &&
      action !== HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE &&
      !(VERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(action),
  );
  const historicalProbeConfigured =
    config.credentialPresent &&
    config.intendedScopeAttested &&
    config.testTeamConfirmed &&
    config.testResourceDisposable &&
    config.artifactMatched &&
    config.repositoryDisposable &&
    config.shaValid;
  const liveWriteVerified = historicalProbeConfigured && !extrasGranted && !attestation.providerEnforcedActionScope;
  const persisted = input.persistedHosting ?? null;
  const persistedHosting = persisted && persisted.providerCategory === "HOSTING" ? persisted : null;

  const verifiedCapabilities = liveWriteVerified ? [...VERIFIED_HOSTING_CAPABILITIES] : [];

  return {
    provider: "vercel",
    adapterKey: "vercel.com_v1",
    accountScope: {
      teamConfigured: config.teamConfigured,
      teamLooksProduction: config.teamLooksProduction,
      testTeamConfirmed: config.testTeamConfirmed,
      testResource: config.testResource,
      testResourceDisposable: config.testResourceDisposable,
      repositoryDisposable: config.repositoryDisposable,
    },
    verificationMode: liveWriteVerified ? "LIVE_WRITE_PROBE" : persistedHosting ? "READ_ONLY_HQ" : config.credentialPresent ? "CONFIG_ONLY" : "NONE",
    verificationStatus: liveWriteVerified
      ? "LIVE_WRITE_VERIFIED"
      : persistedHosting?.status === "READ_ONLY_VERIFIED"
        ? "READ_ONLY_VERIFIED"
        : config.credentialPresent
          ? "CONFIGURED_UNVERIFIED"
          : "UNVERIFIED",
    verifiedCapabilities,
    intendedCapabilities: intended,
    reusableCapabilityVerification: liveWriteVerified,
    artifactBoundProbe: config.artifactMatched,
    projectBoundProbe: Boolean(config.testResource),
    capabilityBound: true,
    verificationArtifactId: config.artifactId,
    verificationEvidence: liveWriteVerified
      ? `Historical GDE live-write probe for ${VERCEL_LIVE_VERIFICATION_ARTIFACT_ID} attested hosting.create_project, hosting.deploy, hosting.verify_deployment on a disposable test resource. Capability-scoped; not artifact-unlimited.`
      : config.credentialPresent
        ? "Vercel credential is present but live-write capability evidence is incomplete for this execution context."
        : "No Vercel live-write verification evidence.",
    unverifiedCapabilitiesGranted: false,
    costClassification: classifyVercelLiveCost(),
    adapterEstimateUsd: 0,
    adapterEstimateAcceptedAsKnownZero: false,
    hostingDeployContract: "git_integrated_commit_sha",
    deployInputClassVerified: PROVIDER_DEPLOY_INPUT_GIT_SHA,
    deployInputClassRequired: PROVIDER_DEPLOY_INPUT_SANDBOX_FILES,
    deployInputCompatible: false,
    newCapabilityRequired: true,
    newCapability: SOURCE_BUNDLE_CAPABILITY,
    newCapabilityVerified: getSourceBundleVerification().status === "LIVE_WRITE_VERIFIED",
    vercelPackageSupport: adapterActions.includes(SOURCE_BUNDLE_CAPABILITY) ? "SUPPORTED" : "UNSUPPORTED_CAPABILITY",
    unlimitedDeployAuthority: false,
    persistedHq: {
      present: Boolean(persistedHosting),
      mode: persistedHosting ? "READ_ONLY" : null,
      mutationAuthority: persistedHosting ? "LOCKED" : null,
      status: persistedHosting?.status ?? null,
      capabilitiesChecked: persistedHosting?.capabilitiesChecked ?? [],
      freshness: persistedHosting?.freshness ?? null,
    },
  };
}

export function capabilityIsVerified(
  inspection: HostingProviderCapabilityInspection,
  capability: string,
): boolean {
  if (capability === HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE) {
    return getProtectionVerification().status === "LIVE_WRITE_VERIFIED";
  }
  if ((UNVERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(capability)) return false;
  if (capability === SOURCE_BUNDLE_CAPABILITY) return inspection.newCapabilityVerified;
  return inspection.verifiedCapabilities.includes(capability);
}

export function purposeAllowsTemporaryProviderUrl(purpose: string): boolean {
  return (
    purpose === MARKET_VALIDATION_PURPOSE ||
    purpose === "PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR" ||
    purpose === "PROVIDER_VERIFICATION" ||
    purpose === "INTERNAL_PREVIEW"
  );
}

export function purposeAllowsCustomDomain(purpose: string): boolean {
  void purpose;
  return false;
}
