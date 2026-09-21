import { MARKET_VALIDATION_PURPOSE } from "./constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import { inspectHostingProviderCapability } from "./provider-capability";
import type { DeploymentPurpose, PreDeployGate } from "./types";

export function evaluateExperimentPreDeployGate(input: {
  candidateDecision: string;
  validationArtifactAuthorized: boolean;
  fullProductAuthorized: boolean;
  artifactValid: boolean;
  artifactId?: string | null;
  candidateId?: string;
  experimentId?: string;
  purpose?: DeploymentPurpose;
  artifactFiles?: Array<{ path: string; content: string }>;
  origin?: string | null;
  existingDeploymentCount?: number;
  executionNonce?: string | null;
}): PreDeployGate {
  const failed: string[] = [];
  if (input.candidateDecision !== "VALIDATE") failed.push("candidateDecision");
  if (!input.validationArtifactAuthorized) failed.push("validationArtifactAuthority");
  if (input.fullProductAuthorized) failed.push("fullProductBuildAuthority");
  if (!input.artifactValid) failed.push("experimentArtifact");

  const provider = inspectHostingProviderCapability();
  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: input.candidateId ?? "",
    experimentId: input.experimentId ?? "",
    artifactId: input.artifactId ?? "",
    artifactValid: input.artifactValid,
    validationPassed: input.artifactValid,
    fullProduct: input.fullProductAuthorized,
    purpose: input.purpose ?? MARKET_VALIDATION_PURPOSE,
    artifactFiles: input.artifactFiles,
    origin: input.origin,
    existingDeploymentCount: input.existingDeploymentCount,
    executionNonce: input.executionNonce,
    providerCapability: provider,
  });

  if (!authorization.artifactEligible) failed.push("artifactEligible");
  if (authorization.eag !== "APPROVED") failed.push("eag");
  if (authorization.unknownCost) failed.push("deploymentCost");
  if (!authorization.formBackendReady) failed.push("formBackend");
  if (!authorization.analyticsBackendReady) failed.push("analyticsBackend");
  if (!provider.verifiedCapabilities.includes(authorization.requiredCapability)) failed.push("providerCapability");
  if (!authorization.deployInputCompatible) failed.push("providerScope");
  if (!authorization.approved) failed.push("deploymentReadiness");

  return {
    ok: authorization.approved && failed.filter((item) => item !== "deploymentReadiness").length === 0,
    candidateDecision: input.candidateDecision,
    validationArtifactAuthority: input.validationArtifactAuthorized,
    fullProductBuildAuthority: false,
    experimentArtifactValid: input.artifactValid,
    providerCapability: provider.verificationStatus,
    deploymentReadiness: authorization.approved ? "PASS" : "FAIL",
    eag: authorization.eag,
    deploymentCost: authorization.deploymentCost,
    withinAuthorization: authorization.withinAuthorization,
    domainRequired: false,
    dnsRequired: false,
    paymentsRequired: false,
    treasuryRequired: false,
    adSpendRequired: false,
    failed: [...new Set([...failed, ...authorization.blockers])],
    purpose: authorization.purpose,
    costClassification: authorization.costClassification,
    unknownCostTreatedAsZero: false,
    formBackendReady: authorization.formBackendReady,
    analyticsBackendReady: authorization.analyticsBackendReady,
    secretSafety: authorization.secretSafety,
    artifactEligible: authorization.artifactEligible,
    reusableProviderCapability: authorization.reusableCapabilityVerification,
    generalUnlimitedDeployAuthority: false,
    blocker: authorization.blocker,
  };
}
