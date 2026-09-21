import { createHash } from "node:crypto";
import {
  auditFooterContract,
  auditValidationGrade,
  evaluatePublicLegalCompleteness,
} from "@/lib/infinity/public-venture-template";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { currentCreValidationArtifactId } from "./current-cre-artifact";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { executeMarketValidationExperiment } from "./execute";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
  FOUNDER_APPROVED_RUNTIME_CEILING_USD,
  FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_PROVIDER,
  buildFounderExternalCostAuthorization,
  evaluateFounderAuthorization,
  getFounderAuthorization,
  parseFounderCeilingAmount,
  persistFounderAuthorization,
  scopesMatch,
  type FounderAuthorizationEvaluation,
  type FounderAuthorizationScope,
  type FounderExternalCostAuthorization,
} from "./founder-authorization";
import { evaluateSecretSafety } from "./secret-safety";
import { evaluateSourceIntegrity, VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "./source-bundle-request";
import { inspectCollectingHqPresence } from "./collecting-hq";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { inspectMarketValidationAcquisitionMission } from "./acquisition-mission";
import { inspectFounderProspectAvailability } from "./founder-assisted-cohort";
import { getActivePublicValidationArtifactId } from "./active-public-artifact";
import { evaluateValidationGradeSuccessorIsolatedReadiness } from "./validation-grade-successor-isolated";

export const VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_val_grade_successor_staging_v1" as const;

export const VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD = FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD;
export const VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD = FOUNDER_APPROVED_RUNTIME_CEILING_USD;

/** Explicit founder amounts for this single-use successor staging write. */
export const THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS = {
  deploymentCeilingUsd: VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  runtimeCeilingUsd: VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
} as const;

const CONSUMED_AUTHORIZATION_IDS = [
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  "founder_ceiling_cre_val_protection_5_10_v1",
] as const;

export function validationGradeSuccessorFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function digestOfFiles(files: Array<{ path: string; content: string }>): string {
  const manifest = files
    .map((file) => `${file.path}:${createHash("sha256").update(file.content).digest("hex")}`)
    .sort()
    .join("|");
  return createHash("sha256").update(manifest).digest("hex");
}

export function evaluateValidationGradeSuccessorCeilings(input?: {
  deploymentCeiling?: unknown;
  runtimeCeiling?: unknown;
}): {
  explicitFounderAuthorization: boolean;
  deploymentCeiling: string;
  runtimeCeiling: string;
  parsed: ReturnType<typeof parseFounderCeilingAmount>;
  reason: string;
} {
  const deployment =
    input?.deploymentCeiling ?? THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.deploymentCeilingUsd;
  const runtime = input?.runtimeCeiling ?? THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.runtimeCeilingUsd;
  const parsed = parseFounderCeilingAmount(deployment);
  const runtimeParsed = parseFounderCeilingAmount(runtime);
  const ok = parsed.ok && runtimeParsed.ok;
  return {
    explicitFounderAuthorization: ok,
    deploymentCeiling: String(deployment),
    runtimeCeiling: String(runtime),
    parsed: parsed.ok && runtimeParsed.ok ? parsed : parsed.ok ? runtimeParsed : parsed,
    reason: ok
      ? "BOUNDED_BY_FOUNDER_AUTHORIZATION. Provider cost remains UNKNOWN."
      : NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED,
  };
}

export function buildValidationGradeSuccessorFounderAuthorization(
  now?: Date,
):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: string } {
  return buildFounderExternalCostAuthorization({
    authorizationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.deploymentCeilingUsd,
    runtimeCeiling: THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.runtimeCeilingUsd,
    scope: validationGradeSuccessorFounderScope(),
    reason:
      "Founder explicit NEW $5 deployment / $10 remaining-window runtime ceiling for one validation-grade successor staging MARKET_VALIDATION_EXPERIMENT source-bundle write.",
    now,
  });
}

export function persistValidationGradeSuccessorFounderAuthorization(now?: Date) {
  const scope = validationGradeSuccessorFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildValidationGradeSuccessorFounderAuthorization(now);
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateValidationGradeSuccessorFounderAuthorization(
  now?: Date,
): FounderAuthorizationEvaluation {
  const scope = validationGradeSuccessorFounderScope();
  const built = buildValidationGradeSuccessorFounderAuthorization(now);
  if (!built.ok) {
    return {
      present: false,
      recognized: false,
      economicAuthorization: "NONE",
      providerCostClassification: "UNKNOWN",
      founderCeilingTreatedAsProviderCost: false,
      treasuryMovement: 0,
      globalHostingAuthority: false,
      singleUse: true,
      expired: false,
      consumed: false,
      scopeMatches: false,
      reason: NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED,
      authorization: null,
    };
  }
  return evaluateFounderAuthorization({ authorization: built.authorization, requestedScope: scope, now });
}

export function priorDeploymentAuthorizationsAreNotReusable(): {
  newAuthorizationId: typeof VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID;
  reusedPriorId: false;
  priorIds: readonly string[];
} {
  return {
    newAuthorizationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    reusedPriorId: false,
    priorIds: CONSUMED_AUTHORIZATION_IDS,
  };
}

export type ValidationGradeSuccessorDeployPreflight = {
  artifactIdentity: "PASS" | "FAIL";
  digestLock: "PASS" | "FAIL";
  predecessorMutated: false;
  isolatedBuild: "PASS" | "FAIL";
  secretScan: "PASS" | "FAIL";
  validationGradeQuality: "PASS" | "FAIL";
  footer: "PASS" | "FAIL";
  privacy: "PASS" | "FAIL";
  terms: "PASS" | "FAIL";
  sitemap: "PASS" | "FAIL";
  deployablePackage: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  experimentLineage: "PASS" | "FAIL";
  founderAuthorization: "PASS" | "FAIL";
  economicAuthorization: "PASS" | "FAIL";
  eag: "PASS" | "FAIL";
  overall: "PASS" | "FAIL";
  workflowAttempted: boolean;
  sourceBundleWorkflows: number;
  deployments: number;
  protectionMutations: number;
  stopReason: string;
  artifactId: string;
  digest: string;
  files: Array<{ path: string; content: string }>;
  founder: FounderAuthorizationEvaluation;
  eagDecision: string;
  eagReason: string;
};

function failPreflight(
  extras: Partial<ValidationGradeSuccessorDeployPreflight> & {
    artifactId: string;
    digest: string;
    files: Array<{ path: string; content: string }>;
    founder: FounderAuthorizationEvaluation;
  },
): ValidationGradeSuccessorDeployPreflight {
  return {
    artifactIdentity: "FAIL",
    digestLock: "FAIL",
    predecessorMutated: false,
    isolatedBuild: "FAIL",
    secretScan: "FAIL",
    validationGradeQuality: "FAIL",
    footer: "FAIL",
    privacy: "FAIL",
    terms: "FAIL",
    sitemap: "FAIL",
    deployablePackage: "FAIL",
    candidateLineage: "FAIL",
    experimentLineage: "FAIL",
    founderAuthorization: "FAIL",
    economicAuthorization: "FAIL",
    eag: "FAIL",
    overall: "FAIL",
    workflowAttempted: false,
    sourceBundleWorkflows: 0,
    deployments: 0,
    protectionMutations: 0,
    stopReason: extras.stopReason ?? NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED,
    eagDecision: extras.eagDecision ?? "DENIED",
    eagReason: extras.eagReason ?? extras.stopReason ?? NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED,
    ...extras,
  };
}

export async function evaluateValidationGradeSuccessorDeployPreflight(): Promise<ValidationGradeSuccessorDeployPreflight> {
  const experiment = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
  const files = experiment.artifact?.files ?? [];
  const artifactId = experiment.artifact?.artifactId ?? "";
  const digest = digestOfFiles(files);
  const founder = evaluateValidationGradeSuccessorFounderAuthorization();
  const identity =
    artifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID &&
    currentCreValidationArtifactId() === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID
      ? "PASS"
      : "FAIL";
  const digestLock = digest === VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  if (identity === "FAIL" || digestLock === "FAIL") {
    return failPreflight({
      artifactIdentity: identity,
      digestLock,
      artifactId,
      digest,
      files,
      founder,
      stopReason: "DIGEST_LOCK_FAILED",
    });
  }
  persistValidationGradeSuccessorFounderAuthorization();
  const pkg = buildDeployableSourcePackage({
    artifactId,
    ventureId: experiment.experiment.ventureId,
    experimentId: experiment.experiment.experimentId,
    candidateId: CRE_CANDIDATE_ID,
    files,
  });
  const integrity = evaluateSourceIntegrity({
    pkg,
    files,
    expectedArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
  });
  const grade = auditValidationGrade(files);
  const legal = evaluatePublicLegalCompleteness(files);
  const footer = auditFooterContract(files);
  const secret = evaluateSecretSafety(files);
  const isolated = evaluateValidationGradeSuccessorIsolatedReadiness();
  const blob = files.map((file) => file.content).join("\n");
  const candidateLineage = blob.includes(CRE_CANDIDATE_ID) ? "PASS" : "FAIL";
  const experimentLineage = blob.includes(LOCKED_CRE_EXPERIMENT_ID) ? "PASS" : "FAIL";
  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid: integrity.status === "PASS" && experiment.authorization.artifactValidation === "PASS",
    validationPassed: experiment.authorization.artifactValidation === "PASS",
    fullProduct: false,
    purpose: MARKET_VALIDATION_PURPOSE,
    artifactFiles: files,
    existingDeploymentCount: 0,
    founderAuthorization: getFounderAuthorization() ?? founder.authorization,
  });
  const footerPass: "PASS" | "FAIL" =
    legal.footer === "PASS" && footer.exactWording === "PASS" && !footer.duplicateRawBrandingUrls ? "PASS" : "FAIL";
  const founderPass: "PASS" | "FAIL" = founder.recognized ? "PASS" : "FAIL";
  const eagPass: "PASS" | "FAIL" = authorization.eag === "APPROVED" ? "PASS" : "FAIL";
  const isolatedPass: "PASS" | "FAIL" = isolated.status === "PASS" ? "PASS" : "FAIL";
  const economicAuthorization: "PASS" | "FAIL" =
    authorization.founderAuthorizationRecognized &&
    authorization.economicAuthorizationKind === "BOUNDED_BY_FOUNDER_AUTHORIZATION"
      ? "PASS"
      : "FAIL";
  const overall: "PASS" | "FAIL" =
    identity === "PASS" &&
    digestLock === "PASS" &&
    isolatedPass === "PASS" &&
    secret.status === "PASS" &&
    grade.validationGradeOverall === "PASS" &&
    footerPass === "PASS" &&
    legal.privacy === "PASS" &&
    legal.terms === "PASS" &&
    legal.sitemap === "PASS" &&
    integrity.status === "PASS" &&
    candidateLineage === "PASS" &&
    experimentLineage === "PASS" &&
    founderPass === "PASS" &&
    economicAuthorization === "PASS" &&
    eagPass === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    artifactIdentity: identity,
    digestLock,
    predecessorMutated: false,
    isolatedBuild: isolatedPass,
    secretScan: secret.status,
    validationGradeQuality: grade.validationGradeOverall,
    footer: footerPass,
    privacy: legal.privacy,
    terms: legal.terms,
    sitemap: legal.sitemap,
    deployablePackage: integrity.status,
    candidateLineage,
    experimentLineage,
    founderAuthorization: founderPass,
    economicAuthorization,
    eag: eagPass,
    overall,
    workflowAttempted: false,
    sourceBundleWorkflows: 0,
    deployments: 0,
    protectionMutations: 0,
    stopReason: overall === "PASS" ? "PREFLIGHT_READY" : authorization.eagReason || founder.reason,
    artifactId,
    digest,
    files,
    founder,
    eagDecision: authorization.eag,
    eagReason: authorization.eagReason,
  };
}

export function inspectValidationGradeSuccessorDeployStop() {
  const clock = inspectExperimentClock();
  const evidence = inspectRealMarketEvidence();
  const prospects = inspectFounderProspectAvailability();
  const mission = inspectMarketValidationAcquisitionMission({
    blocker: evidence.acquisition.outreach.blocker,
    messagesBeingPrepared: false,
  });
  const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
  const ceilings = evaluateValidationGradeSuccessorCeilings();
  return {
    ceilings,
    reuse: priorDeploymentAuthorizationsAreNotReusable(),
    predecessor: SUCCESSOR_CRE_ARTIFACT_ID,
    successor: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    digest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
    experiment: {
      state: evidence.experiment.state,
      evidenceStart: clock.evidenceStart,
      deadline: clock.deadline,
      counts: evidence.counts,
    },
    activeArtifact: getActivePublicValidationArtifactId(),
    mission,
    prospects,
    hq,
    providerCost: "UNKNOWN" as const,
    founderCeilingTreatedAsSpend: false,
    messagesSent: 0,
  };
}
