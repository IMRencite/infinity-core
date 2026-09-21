import type { ActionAuthorityGrant, TreasuryActionGrant } from "@/lib/infinity/governed-deployment-execution/types";
import { isValidationExperimentPurpose, WRITE_BOUNDARY } from "./constants";
import { eagAllowsUnknownCostWithExplicitHumanCeiling } from "./eag-economics";
import type { CostClassification, DeploymentPurpose, EagDecision } from "./types";

export type ValidationExperimentEagInput = {
  artifactEligible: boolean;
  purpose: DeploymentPurpose;
  providerCapabilityVerified: boolean;
  deployInputCompatible: boolean;
  newCapabilityRequired: boolean;
  newCapabilityVerified: boolean;
  formReady: boolean;
  analyticsReady: boolean;
  secretSafety: "PASS" | "FAIL";
  costClassification: CostClassification | "METERED";
  unknownCost: boolean;
  treasuryAuthorized: boolean;
  customDomainRequested: boolean;
  dnsRequested: boolean;
  paymentsRequested: boolean;
  treasuryRequested: boolean;
  adsRequested: boolean;
  existingDeploymentCount: number;
  eagGrants: ActionAuthorityGrant[];
  treasuryGrants: TreasuryActionGrant[];
  founderAuthorizationRecognized?: boolean;
  firstCapabilityVerificationWrite?: boolean;
  founderAuthorizationSingleUse?: boolean;
};

export type ValidationExperimentEagResult = {
  decision: EagDecision;
  reason: string;
  bypassed: false;
  hardcodedDenied: false;
  autoAuthorizeGranted: boolean;
  primaryBlocker: string | null;
  blockers: string[];
};

const PRIORITY = [
  "ARTIFACT_READINESS",
  "FORM_BACKEND",
  "ANALYTICS_BACKEND",
  "PROVIDER_CAPABILITY_REFRESH_REQUIRED",
  "PROVIDER_SCOPE",
  "UNKNOWN_COST",
  "EAG_POLICY",
] as const;

export function evaluateValidationExperimentEag(input: ValidationExperimentEagInput): ValidationExperimentEagResult {
  const founderCeiling = eagAllowsUnknownCostWithExplicitHumanCeiling({
    founderAuthorizationRecognized: Boolean(input.founderAuthorizationRecognized),
    singleUse: input.founderAuthorizationSingleUse !== false,
    providerCostState: input.costClassification,
  });
  const firstFounderWrite = founderCeiling && Boolean(input.firstCapabilityVerificationWrite);
  const blockers: string[] = [];
  if (!input.artifactEligible || input.secretSafety === "FAIL") blockers.push("ARTIFACT_READINESS");
  if (!isValidationExperimentPurpose(input.purpose)) blockers.push("EAG_POLICY");
  if (input.customDomainRequested || input.dnsRequested || input.paymentsRequested || input.treasuryRequested || input.adsRequested) {
    blockers.push("EAG_POLICY");
  }
  if (!input.formReady) blockers.push("FORM_BACKEND");
  if (!input.analyticsReady) blockers.push("ANALYTICS_BACKEND");
  if (input.newCapabilityRequired && !input.newCapabilityVerified && !firstFounderWrite) {
    blockers.push("PROVIDER_CAPABILITY_REFRESH_REQUIRED");
  }
  if ((!input.providerCapabilityVerified || !input.deployInputCompatible) && !firstFounderWrite) {
    blockers.push("PROVIDER_SCOPE");
  }
  const unknownCost = input.unknownCost || input.costClassification === "UNKNOWN";
  if (unknownCost) {
    if (!founderCeiling) blockers.push("UNKNOWN_COST");
  } else if (!input.treasuryAuthorized) {
    blockers.push("UNKNOWN_COST");
  }
  const grant =
    input.eagGrants.some((item) => item.decision === "AUTO_AUTHORIZE") || founderCeiling;
  if (!grant) blockers.push("EAG_POLICY");
  if (input.existingDeploymentCount >= WRITE_BOUNDARY.validationDeploymentsMax) blockers.push("EAG_POLICY");

  const unique = [...new Set(blockers)];
  const primary = PRIORITY.find((item) => unique.includes(item)) ?? unique[0] ?? null;
  let decision: EagDecision = "DENIED";
  if (!primary) decision = "APPROVED";
  else if (primary === "ARTIFACT_READINESS") decision = "BLOCKED_BY_ARTIFACT";
  else if (primary === "FORM_BACKEND") decision = "BLOCKED_BY_FORM_BACKEND";
  else if (primary === "ANALYTICS_BACKEND") decision = "BLOCKED_BY_ANALYTICS_BACKEND";
  else if (primary === "PROVIDER_CAPABILITY_REFRESH_REQUIRED") decision = "BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH";
  else if (primary === "PROVIDER_SCOPE") decision = "BLOCKED_BY_PROVIDER_SCOPE";
  else if (primary === "UNKNOWN_COST") decision = "BLOCKED_BY_UNKNOWN_COST";
  else decision = "DENIED";

  const reason =
    decision === "APPROVED"
      ? founderCeiling
        ? "Canonical policy authorized one MARKET_VALIDATION_EXPERIMENT hosting action under UNKNOWN_COST_WITH_EXPLICIT_HUMAN_CEILING. Provider cost remains UNKNOWN. Global unknown-cost policy was not weakened."
        : "Canonical policy authorized one MARKET_VALIDATION_EXPERIMENT hosting action under explicit grant, known cost, verified capability, and ready ingest."
      : decision === "BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH"
        ? "hosting.deploy_source_bundle is implemented on the Vercel adapter but is not LIVE_WRITE_VERIFIED. Unknown-cost public writes are forbidden, so the live capability probe was not executed."
        : decision === "BLOCKED_BY_UNKNOWN_COST"
          ? "Deployment cost remains UNKNOWN. Unknown is not treated as zero. Policy does not auto-authorize unknown-cost publishes."
          : decision === "BLOCKED_BY_FORM_BACKEND"
            ? "Same-origin validation ingest is not ready in the deployment package."
            : decision === "BLOCKED_BY_ANALYTICS_BACKEND"
              ? "Same-origin analytics ingest is not ready in the deployment package."
              : decision === "BLOCKED_BY_ARTIFACT"
                ? "Validation artifact is ineligible or secret safety failed."
                : decision === "BLOCKED_BY_PROVIDER_SCOPE"
                  ? "Required hosting capability is unverified for this execution context."
                  : "Canonical policy did not authorize this experiment, artifact, purpose, and capability.";

  return {
    decision,
    reason,
    bypassed: false,
    hardcodedDenied: false,
    autoAuthorizeGranted: grant && decision === "APPROVED",
    primaryBlocker: primary,
    blockers: unique,
  };
}
