import { createHash } from "node:crypto";
import {
  auditFooterContract,
  evaluatePublicLegalCompleteness,
} from "@/lib/infinity/public-venture-template";
import { reconstructCreAuthoritySiteSuccessor } from "@/lib/infinity/venture-website-architecture/cre-successor";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
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
import { evaluateSourceIntegrity } from "./source-bundle-request";
import { inspectCollectingHqPresence } from "./collecting-hq";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { inspectMarketValidationAcquisitionMission } from "./acquisition-mission";
import { inspectFounderProspectAvailability } from "./founder-assisted-cohort";
import { getActivePublicValidationArtifactId } from "./active-public-artifact";
import { evaluatePremiumAuthoritySuccessorIsolatedReadiness } from "./premium-authority-successor-isolated";
import { evaluateFormBackendReadiness } from "./ingest";
import { VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./validation-grade-successor-authorization";

export const PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_authority_site_successor_staging_v1" as const;

export const PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_CEILING_USD = 5 as const;
export const PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD = 5 as const;

export const THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS = {
  deploymentCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  runtimeCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD,
} as const;

const CONSUMED_AUTHORIZATION_IDS = [
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  "founder_ceiling_cre_val_protection_5_10_v1",
] as const;

export function premiumAuthoritySuccessorFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
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

export function evaluatePremiumAuthoritySuccessorCeilings(input?: {
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
    input?.deploymentCeiling ?? THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS.deploymentCeilingUsd;
  const runtime = input?.runtimeCeiling ?? THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS.runtimeCeilingUsd;
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
      : NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
  };
}

export function buildPremiumAuthoritySuccessorFounderAuthorization(
  now?: Date,
):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: string } {
  return buildFounderExternalCostAuthorization({
    authorizationId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS.deploymentCeilingUsd,
    runtimeCeiling: THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS.runtimeCeilingUsd,
    scope: premiumAuthoritySuccessorFounderScope(),
    reason:
      "Founder explicit NEW $5 deployment / $5 remaining-window runtime ceiling for one PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR staging source-bundle write. Provider cost remains UNKNOWN. Ceiling is an authorization boundary, not spend.",
    now,
  });
}

export function persistPremiumAuthoritySuccessorFounderAuthorization(now?: Date) {
  const scope = premiumAuthoritySuccessorFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildPremiumAuthoritySuccessorFounderAuthorization(now);
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluatePremiumAuthoritySuccessorFounderAuthorization(
  now?: Date,
): FounderAuthorizationEvaluation {
  const scope = premiumAuthoritySuccessorFounderScope();
  const built = buildPremiumAuthoritySuccessorFounderAuthorization(now);
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
      reason: NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
      authorization: null,
    };
  }
  return evaluateFounderAuthorization({ authorization: built.authorization, requestedScope: scope, now });
}

export function priorPremiumAuthorityDeploymentAuthorizationsAreNotReusable(): {
  newAuthorizationId: typeof PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID;
  reusedPriorId: false;
  priorIds: readonly string[];
} {
  return {
    newAuthorizationId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    reusedPriorId: false,
    priorIds: CONSUMED_AUTHORIZATION_IDS,
  };
}

export type PremiumAuthoritySuccessorDeployPreflight = {
  artifactIdentity: "PASS" | "FAIL";
  digestLock: "PASS" | "FAIL";
  predecessorMutated: false;
  premiumAuthority: "PASS" | "FAIL";
  isolatedBuild: "PASS" | "FAIL";
  secretScan: "PASS" | "FAIL";
  routes: "PASS" | "FAIL";
  links: "PASS" | "FAIL";
  schema: "PASS" | "FAIL";
  metadata: "PASS" | "FAIL";
  sitemap: "PASS" | "FAIL";
  robots: "PASS" | "FAIL";
  geoseo: "PASS" | "FAIL";
  design: "PASS" | "FAIL";
  accessibility: "PASS" | "FAIL";
  legal: "PASS" | "FAIL";
  form: "PASS" | "FAIL";
  ingest: "PASS" | "FAIL";
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
  intendedRoutes: string[];
  founder: FounderAuthorizationEvaluation;
  eagDecision: string;
  eagReason: string;
  eagPurpose: typeof PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE;
};

function failPreflight(
  extras: Partial<PremiumAuthoritySuccessorDeployPreflight> & {
    artifactId: string;
    digest: string;
    files: Array<{ path: string; content: string }>;
    founder: FounderAuthorizationEvaluation;
    intendedRoutes?: string[];
  },
): PremiumAuthoritySuccessorDeployPreflight {
  return {
    artifactIdentity: "FAIL",
    digestLock: "FAIL",
    predecessorMutated: false,
    premiumAuthority: "FAIL",
    isolatedBuild: "FAIL",
    secretScan: "FAIL",
    routes: "FAIL",
    links: "FAIL",
    schema: "FAIL",
    metadata: "FAIL",
    sitemap: "FAIL",
    robots: "FAIL",
    geoseo: "FAIL",
    design: "FAIL",
    accessibility: "FAIL",
    legal: "FAIL",
    form: "FAIL",
    ingest: "FAIL",
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
    stopReason: extras.stopReason ?? NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
    eagDecision: extras.eagDecision ?? "DENIED",
    eagReason: extras.eagReason ?? extras.stopReason ?? NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
    eagPurpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
    intendedRoutes: extras.intendedRoutes ?? [],
    ...extras,
  };
}

export async function evaluatePremiumAuthoritySuccessorDeployPreflight(): Promise<PremiumAuthoritySuccessorDeployPreflight> {
  const reconstructed = await reconstructCreAuthoritySiteSuccessor();
  const files = reconstructed.files;
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const founder = evaluatePremiumAuthoritySuccessorFounderAuthorization();
  const intendedRoutes = reconstructed.architecture.pages.map((page) => page.route);
  const identity = artifactId === PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  if (identity === "FAIL" || digestLock === "FAIL") {
    return failPreflight({
      artifactIdentity: identity,
      digestLock,
      artifactId,
      digest,
      files,
      founder,
      intendedRoutes,
      stopReason: "DIGEST_LOCK_FAILED",
    });
  }
  persistPremiumAuthoritySuccessorFounderAuthorization();
  const pkg = buildDeployableSourcePackage({
    artifactId,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
    files,
  });
  const integrity = evaluateSourceIntegrity({
    pkg,
    files,
    expectedArtifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  });
  const legal = evaluatePublicLegalCompleteness(files);
  const footer = auditFooterContract(files);
  const secret = evaluateSecretSafety(files);
  const isolated = evaluatePremiumAuthoritySuccessorIsolatedReadiness();
  const form = evaluateFormBackendReadiness({ artifactFiles: files, experimentId: LOCKED_CRE_EXPERIMENT_ID });
  const blob = files.map((file) => file.content).join("\n");
  const candidateLineage = blob.includes(CRE_CANDIDATE_ID) ? "PASS" : "FAIL";
  const experimentLineage = blob.includes(LOCKED_CRE_EXPERIMENT_ID) ? "PASS" : "FAIL";
  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid: integrity.status === "PASS" && reconstructed.quality.premiumAuthorityOverall === "PASS",
    validationPassed: reconstructed.quality.premiumAuthorityOverall === "PASS",
    fullProduct: false,
    purpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
    artifactFiles: files,
    existingDeploymentCount: 0,
    founderAuthorization: getFounderAuthorization() ?? founder.authorization,
  });
  const legalPass: "PASS" | "FAIL" =
    legal.complete === "PASS" &&
    footer.exactWording === "PASS" &&
    !footer.duplicateRawBrandingUrls
      ? "PASS"
      : "FAIL";
  const founderPass: "PASS" | "FAIL" = founder.recognized ? "PASS" : "FAIL";
  const eagPass: "PASS" | "FAIL" = authorization.eag === "APPROVED" ? "PASS" : "FAIL";
  const isolatedPass: "PASS" | "FAIL" = isolated.status === "PASS" ? "PASS" : "FAIL";
  const economicAuthorization: "PASS" | "FAIL" =
    authorization.founderAuthorizationRecognized &&
    authorization.economicAuthorizationKind === "BOUNDED_BY_FOUNDER_AUTHORIZATION"
      ? "PASS"
      : "FAIL";
  const formPass: "PASS" | "FAIL" = form.readyForLiveDeploy ? "PASS" : "FAIL";
  const routesPass: "PASS" | "FAIL" = intendedRoutes.length >= 12 ? "PASS" : "FAIL";
  const overall: "PASS" | "FAIL" =
    identity === "PASS" &&
    digestLock === "PASS" &&
    reconstructed.quality.premiumAuthorityOverall === "PASS" &&
    isolatedPass === "PASS" &&
    secret.status === "PASS" &&
    routesPass === "PASS" &&
    reconstructed.quality.internalLinks === "PASS" &&
    reconstructed.quality.schema === "PASS" &&
    reconstructed.quality.metadata === "PASS" &&
    reconstructed.quality.sitemap === "PASS" &&
    reconstructed.quality.robots === "PASS" &&
    reconstructed.quality.geoSeo === "PASS" &&
    reconstructed.quality.premiumDesign === "PASS" &&
    reconstructed.quality.accessibility === "PASS" &&
    legalPass === "PASS" &&
    formPass === "PASS" &&
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
    premiumAuthority: reconstructed.quality.premiumAuthorityOverall,
    isolatedBuild: isolatedPass,
    secretScan: secret.status,
    routes: routesPass,
    links: reconstructed.quality.internalLinks,
    schema: reconstructed.quality.schema,
    metadata: reconstructed.quality.metadata,
    sitemap: reconstructed.quality.sitemap,
    robots: reconstructed.quality.robots,
    geoseo: reconstructed.quality.geoSeo,
    design: reconstructed.quality.premiumDesign,
    accessibility: reconstructed.quality.accessibility,
    legal: legalPass,
    form: formPass,
    ingest: formPass,
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
    intendedRoutes,
    founder,
    eagDecision: authorization.eag,
    eagReason: authorization.eagReason,
    eagPurpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  };
}

export function inspectPremiumAuthoritySuccessorDeployStop() {
  const clock = inspectExperimentClock();
  const evidence = inspectRealMarketEvidence();
  const prospects = inspectFounderProspectAvailability();
  const mission = inspectMarketValidationAcquisitionMission({
    blocker: evidence.acquisition.outreach.blocker,
    messagesBeingPrepared: false,
  });
  const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
  const ceilings = evaluatePremiumAuthoritySuccessorCeilings();
  return {
    ceilings,
    reuse: priorPremiumAuthorityDeploymentAuthorizationsAreNotReusable(),
    predecessor: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    successor: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    digest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
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
