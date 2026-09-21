import type { ActionAuthorityGrant, TreasuryActionGrant } from "@/lib/infinity/governed-deployment-execution/types";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED,
  isValidationExperimentPurpose,
} from "./constants";
import { isCreValidationArtifactId } from "./current-cre-artifact";
import { classifyValidationDeploymentCost } from "./cost";
import {
  buildDeployableSourcePackage,
  evaluateVercelSourcePackageSupport,
} from "./deployable-package";
import { evaluateValidationExperimentEag } from "./eag-policy";
import { evaluateAnalyticsBackendReadiness, evaluateFormBackendReadiness } from "./ingest";
import { capabilityIsVerified, inspectHostingProviderCapability, type HostingProviderCapabilityInspection } from "./provider-capability";
import { evaluateSecretSafety } from "./secret-safety";
import type { FounderExternalCostAuthorization } from "./founder-authorization";
import { evaluateFounderAuthorization, lockedCreFounderScope } from "./founder-authorization";
import type {
  CostClassification,
  DeploymentPurpose,
  ValidationArtifactDeploymentAuthorization,
} from "./types";

export type ValidationArtifactDeploymentAuthorizationInput = {
  candidateId: string;
  experimentId: string;
  artifactId: string;
  artifactType?: string;
  artifactValid: boolean;
  validationPassed: boolean;
  fullProduct: boolean;
  purpose: DeploymentPurpose;
  provider?: "vercel";
  requiredCapability?: "hosting.deploy" | "hosting.deploy_source_bundle" | "hosting.create_project" | "hosting.verify_deployment";
  customDomainRequested?: boolean;
  dnsRequested?: boolean;
  paymentsRequested?: boolean;
  treasuryRequested?: boolean;
  adsRequested?: boolean;
  artifactFiles?: Array<{ path: string; content: string }>;
  origin?: string | null;
  eagGrants?: ActionAuthorityGrant[];
  treasuryGrants?: TreasuryActionGrant[];
  existingDeploymentCount?: number;
  executionNonce?: string | null;
  providerCapability?: HostingProviderCapabilityInspection;
  ventureId?: string;
  founderAuthorization?: FounderExternalCostAuthorization | null;
};

export function evaluateValidationArtifactDeploymentAuthorization(
  input: ValidationArtifactDeploymentAuthorizationInput,
): ValidationArtifactDeploymentAuthorization {
  void input.origin;
  const purpose = input.purpose;
  const capability = input.requiredCapability ?? "hosting.deploy_source_bundle";
  const providerCapability = input.providerCapability ?? inspectHostingProviderCapability();
  const secret = evaluateSecretSafety(input.artifactFiles ?? []);
  const form = evaluateFormBackendReadiness({
    artifactFiles: input.artifactFiles,
    experimentId: input.experimentId,
  });
  const analytics = evaluateAnalyticsBackendReadiness({
    artifactFiles: input.artifactFiles,
    experimentId: input.experimentId,
  });
  const liveCost = classifyValidationDeploymentCost();
  const mockedCost = providerCapability.costClassification;
  const costClassification: CostClassification =
    mockedCost === "KNOWN_ZERO"
      ? "NO_INCREMENTAL_COST"
      : mockedCost === "KNOWN_COST"
        ? "BOUNDED"
        : "UNKNOWN";
  const unknownCost = costClassification === "UNKNOWN";
  const pkg = input.artifactFiles?.length
    ? buildDeployableSourcePackage({
        artifactId: input.artifactId,
        ventureId: input.ventureId ?? `candidate:${input.candidateId}`,
        experimentId: input.experimentId,
        candidateId: input.candidateId,
        files: input.artifactFiles,
      })
    : null;
  const vercelSupport = evaluateVercelSourcePackageSupport(
    pkg ??
      buildDeployableSourcePackage({
        artifactId: input.artifactId || LOCKED_CRE_ARTIFACT_ID,
        ventureId: input.ventureId ?? `candidate:${input.candidateId}`,
        experimentId: input.experimentId,
        candidateId: input.candidateId,
        files: [],
      }),
  );
  const artifactEligible =
    input.candidateId === CRE_CANDIDATE_ID &&
    input.experimentId === LOCKED_CRE_EXPERIMENT_ID &&
    isCreValidationArtifactId(input.artifactId) &&
    input.artifactValid &&
    input.validationPassed &&
    !input.fullProduct &&
    (input.artifactType ?? "nextjs_web_product") === "nextjs_web_product" &&
    isValidationExperimentPurpose(purpose) &&
    secret.status === "PASS";

  const treasury = input.treasuryGrants ?? [];
  const treasuryAuthorized = treasury.some(
    (grant) =>
      grant.decision === "AUTO_AUTHORIZE" &&
      (grant.costActuality === "KNOWN" || grant.costActuality === "ESTIMATE") &&
      grant.authorizedAmountUsd != null &&
      grant.authorizedAmountUsd > 0,
  );
  const lockedScope = lockedCreFounderScope();
  const requestedDigest =
    input.artifactId === lockedScope.artifactId
      ? lockedScope.artifactDigest
      : pkg?.sourceDigest ?? lockedScope.artifactDigest;
  const founder = evaluateFounderAuthorization({
    authorization: input.founderAuthorization ?? null,
    requestedScope: {
      ...lockedScope,
      candidateId: input.candidateId,
      experimentId: input.experimentId,
      artifactId: input.artifactId,
      artifactDigest: requestedDigest,
    },
  });
  const founderRecognized = founder.recognized && isValidationExperimentPurpose(purpose);
  const identityChanged =
    input.artifactId !== lockedScope.artifactId ||
    Boolean(pkg && pkg.sourceDigest !== lockedScope.artifactDigest);
  const newFounderAuthorizationRequired = !founderRecognized && identityChanged;

  const eag = evaluateValidationExperimentEag({
    artifactEligible,
    purpose,
    providerCapabilityVerified: capabilityIsVerified(providerCapability, capability),
    deployInputCompatible: providerCapability.deployInputCompatible,
    newCapabilityRequired: providerCapability.newCapabilityRequired,
    newCapabilityVerified: providerCapability.newCapabilityVerified,
    formReady: form.readyForLiveDeploy,
    analyticsReady: analytics.readyForLiveDeploy,
    secretSafety: secret.status,
    costClassification,
    unknownCost,
    treasuryAuthorized,
    customDomainRequested: Boolean(input.customDomainRequested),
    dnsRequested: Boolean(input.dnsRequested),
    paymentsRequested: Boolean(input.paymentsRequested),
    treasuryRequested: Boolean(input.treasuryRequested),
    adsRequested: Boolean(input.adsRequested),
    existingDeploymentCount: input.existingDeploymentCount ?? 0,
    eagGrants: input.eagGrants ?? [],
    treasuryGrants: treasury,
    founderAuthorizationRecognized: founderRecognized,
    firstCapabilityVerificationWrite: founderRecognized && !providerCapability.newCapabilityVerified,
    founderAuthorizationSingleUse: founder.singleUse,
  });

  const approved = eag.decision === "APPROVED";
  return {
    approved,
    eag: eag.decision,
    eagReason: newFounderAuthorizationRequired
      ? NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED
      : eag.reason,
    eagBypassed: false,
    purpose,
    provider: "vercel",
    requiredCapability: capability,
    providerVerificationSeparated: true,
    artifactScoped: true,
    experimentPurposeModeled: true,
    generalUnlimitedDeployAuthority: false,
    artifactEligible,
    artifactValidation: input.validationPassed && input.artifactValid ? "PASS" : "FAIL",
    formBackendReady: form.readyForLiveDeploy,
    analyticsBackendReady: analytics.readyForLiveDeploy,
    secretSafety: secret.status,
    customDomainAllowed: false,
    temporaryProviderUrlAllowed: isValidationExperimentPurpose(purpose) && !input.customDomainRequested,
    deploymentCost: costClassification,
    costClassification,
    costConfidence: unknownCost ? "NONE" : "LOW",
    estimatedCost: unknownCost ? null : liveCost.estimatedAmount,
    economicState: founderRecognized
      ? "BOUNDED_BY_FOUNDER_AUTHORIZATION"
      : unknownCost
        ? vercelSupport.adapterImplemented
          ? "CAPABILITY_IMPLEMENTED_BUT_COST_BLOCKED"
          : "UNKNOWN_COST"
        : "BOUNDED",
    authorizedCeiling:
      founder.authorization?.deploymentCeilingUsd ??
      treasury.find((grant) => grant.authorizedAmountUsd != null)?.authorizedAmountUsd ??
      null,
    withinCeiling: founderRecognized || (treasuryAuthorized && !unknownCost),
    unknownCost,
    unknownCostTreatedAsZero: false,
    founderAuthorizationRecognized: founderRecognized,
    economicAuthorizationKind: founderRecognized
      ? "BOUNDED_BY_FOUNDER_AUTHORIZATION"
      : treasuryAuthorized && !unknownCost
        ? "TREASURY_KNOWN_COST"
        : "NONE",
    withinAuthorization: approved,
    reusableCapabilityVerification: providerCapability.reusableCapabilityVerification,
    unverifiedCapabilitiesGranted: false,
    providerVerificationStatus: providerCapability.verificationStatus,
    verifiedCapabilities: providerCapability.verifiedCapabilities,
    deployInputCompatible: providerCapability.deployInputCompatible,
    newCapabilityRequired: providerCapability.newCapabilityRequired,
    newCapabilityVerified: providerCapability.newCapabilityVerified,
    vercelPackageSupport: vercelSupport.result,
    hardcodedDenied: false,
    blocker: eag.primaryBlocker,
    blockers: eag.blockers,
    executionScope: {
      candidateId: input.candidateId,
      experimentId: input.experimentId,
      artifactId: input.artifactId,
      purpose,
      provider: "vercel",
      capability,
      nonce: input.executionNonce ?? null,
    },
  };
}
