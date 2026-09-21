import { auditFooterContract, evaluatePublicLegalCompleteness } from "@/lib/infinity/public-venture-template";
import { reconstructCreDirectResponseSuccessor } from "@/lib/infinity/venture-website-architecture/cre-dr-successor";
import { auditSuccessorAuthorityArtifact } from "@/lib/infinity/venture-website-architecture/answer-authority/successor-audit";
import {
  PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD,
  PREMIUM_AUTHORITY_VALIDATION_READY,
} from "@/lib/infinity/venture-website-architecture/constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
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
  persistFounderAuthorization,
  scopesMatch,
  type FounderAuthorizationEvaluation,
  type FounderAuthorizationScope,
  type FounderExternalCostAuthorization,
} from "./founder-authorization";
import { evaluateSecretSafety } from "./secret-safety";
import { evaluateSourceIntegrity } from "./source-bundle-request";
import { evaluateDirectResponseSuccessorIsolatedReadiness } from "./cre-dr-successor-isolated";
import { evaluateFormBackendReadiness } from "./ingest";
import { PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./premium-authority-successor-authorization";
import { VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./validation-grade-successor-authorization";

export const DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_dr_answer_authority_successor_staging_v1" as const;

export const DIRECT_RESPONSE_SUCCESSOR_DEPLOYMENT_CEILING_USD = 5 as const;
export const DIRECT_RESPONSE_SUCCESSOR_RUNTIME_CEILING_USD = 5 as const;

export const EXPECTED_DR_PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/commercial-lease-npv",
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources",
  "/resources/cam-costs/",
  "/resources/free-rent/",
  "/resources/rent-escalations/",
  "/resources/gross-vs-net-lease/",
  "/for/tenant-rep-brokers/",
  "/pricing",
  "/faq",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
] as const;

const CONSUMED_AUTHORIZATION_IDS = [
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  "founder_ceiling_cre_val_protection_5_10_v1",
] as const;

export function directResponseSuccessorFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function buildDirectResponseSuccessorFounderAuthorization(
  now?: Date,
):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: string } {
  return buildFounderExternalCostAuthorization({
    authorizationId: DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: DIRECT_RESPONSE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: DIRECT_RESPONSE_SUCCESSOR_RUNTIME_CEILING_USD,
    scope: directResponseSuccessorFounderScope(),
    reason:
      "Founder explicit single-use $5 deployment ceiling for art_b50a3f6ea9bebb9c6f59 digest 67159d68c81c1057e70c415a4dbc165f29d4cbccea64e0db1c8c76378ccb58a8. One staging source-bundle workflow. Provider cost remains UNKNOWN. Ceiling is not spend.",
    now,
  });
}

export function persistDirectResponseSuccessorFounderAuthorization(now?: Date) {
  const scope = directResponseSuccessorFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildDirectResponseSuccessorFounderAuthorization(now);
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateDirectResponseSuccessorFounderAuthorization(
  now?: Date,
): FounderAuthorizationEvaluation {
  const scope = directResponseSuccessorFounderScope();
  const built = buildDirectResponseSuccessorFounderAuthorization(now);
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
      reason: built.reason,
      authorization: null,
    };
  }
  return evaluateFounderAuthorization({ authorization: built.authorization, requestedScope: scope, now });
}

export function priorDirectResponseDeploymentAuthorizationsAreNotReusable(): {
  newAuthorizationId: typeof DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID;
  reusedPriorId: false;
  priorIds: readonly string[];
} {
  return {
    newAuthorizationId: DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    reusedPriorId: false,
    priorIds: CONSUMED_AUTHORIZATION_IDS,
  };
}

export type DirectResponseSuccessorDeployPreflight = {
  artifactIdentity: "PASS" | "FAIL";
  digestLock: "PASS" | "FAIL";
  predecessorMutated: false;
  predecessorIdentity: "PASS" | "FAIL";
  questionCoverage: "PASS" | "FAIL";
  answerAuthority: "PASS" | "FAIL";
  citationReadiness: "PASS" | "FAIL";
  directResponse: "PASS" | "FAIL";
  visualQc: "PASS" | "FAIL";
  geoseo: "PASS" | "FAIL";
  schema: "PASS" | "FAIL";
  metadata: "PASS" | "FAIL";
  internalLinks: "PASS" | "FAIL";
  accessibility: "PASS" | "FAIL";
  isolatedBuild: "PASS" | "FAIL";
  secretScan: "PASS" | "FAIL";
  form: "PASS" | "FAIL";
  ingest: "PASS" | "FAIL";
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
  extras: Partial<DirectResponseSuccessorDeployPreflight> & {
    artifactId: string;
    digest: string;
    files: Array<{ path: string; content: string }>;
    founder: FounderAuthorizationEvaluation;
    intendedRoutes?: string[];
  },
): DirectResponseSuccessorDeployPreflight {
  return {
    artifactIdentity: "FAIL",
    digestLock: "FAIL",
    predecessorMutated: false,
    predecessorIdentity: "FAIL",
    questionCoverage: "FAIL",
    answerAuthority: "FAIL",
    citationReadiness: "FAIL",
    directResponse: "FAIL",
    visualQc: "FAIL",
    geoseo: "FAIL",
    schema: "FAIL",
    metadata: "FAIL",
    internalLinks: "FAIL",
    accessibility: "FAIL",
    isolatedBuild: "FAIL",
    secretScan: "FAIL",
    form: "FAIL",
    ingest: "FAIL",
    founderAuthorization: "FAIL",
    economicAuthorization: "FAIL",
    eag: "FAIL",
    overall: "FAIL",
    workflowAttempted: false,
    sourceBundleWorkflows: 0,
    deployments: 0,
    protectionMutations: 0,
    stopReason: extras.stopReason ?? AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
    eagDecision: extras.eagDecision ?? "DENIED",
    eagReason: extras.eagReason ?? extras.stopReason ?? AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
    eagPurpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
    intendedRoutes: extras.intendedRoutes ?? [...EXPECTED_DR_PUBLIC_ROUTES],
    ...extras,
  };
}

export async function evaluateDirectResponseSuccessorDeployPreflight(): Promise<DirectResponseSuccessorDeployPreflight> {
  const reconstructed = await reconstructCreDirectResponseSuccessor();
  const files = reconstructed.files;
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const founder = evaluateDirectResponseSuccessorFounderAuthorization();
  const intendedRoutes = [
    ...new Set(
      [...reconstructed.architecture.pages.map((page) => page.route), ...EXPECTED_DR_PUBLIC_ROUTES].map((route) =>
        route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route,
      ),
    ),
  ];
  const identity = artifactId === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  const predecessorIdentity =
    reconstructed.predecessorArtifactId === PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID &&
    reconstructed.predecessorDigest === PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST
      ? "PASS"
      : "FAIL";
  if (identity === "FAIL" || digestLock === "FAIL" || predecessorIdentity === "FAIL") {
    return failPreflight({
      artifactIdentity: identity,
      digestLock,
      predecessorIdentity,
      artifactId,
      digest,
      files,
      founder,
      intendedRoutes,
      stopReason: AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
    });
  }
  persistDirectResponseSuccessorFounderAuthorization();
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
    expectedArtifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  });
  const legal = evaluatePublicLegalCompleteness(files);
  const footer = auditFooterContract(files);
  const secret = evaluateSecretSafety(files);
  const isolated = evaluateDirectResponseSuccessorIsolatedReadiness();
  const form = evaluateFormBackendReadiness({ artifactFiles: files, experimentId: LOCKED_CRE_EXPERIMENT_ID });
  const audit = await auditSuccessorAuthorityArtifact({
    files,
    architecture: reconstructed.architecture,
    graph: reconstructed.graph,
    artifactId,
    digest,
  });
  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid:
      integrity.status === "PASS" &&
      (audit.newClassification === PREMIUM_AUTHORITY_VALIDATION_READY ||
        audit.newClassification === PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD),
    validationPassed:
      (audit.newClassification === PREMIUM_AUTHORITY_VALIDATION_READY ||
        audit.newClassification === PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD) &&
      audit.hardFailPages === 0,
    fullProduct: false,
    purpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
    artifactFiles: files,
    existingDeploymentCount: 0,
    founderAuthorization: getFounderAuthorization() ?? founder.authorization,
  });
  const legalPass: "PASS" | "FAIL" =
    legal.complete === "PASS" && footer.exactWording === "PASS" && !footer.duplicateRawBrandingUrls ? "PASS" : "FAIL";
  const founderPass: "PASS" | "FAIL" = founder.recognized ? "PASS" : "FAIL";
  const eagPass: "PASS" | "FAIL" = authorization.eag === "APPROVED" ? "PASS" : "FAIL";
  const isolatedPass: "PASS" | "FAIL" = isolated.status === "PASS" ? "PASS" : "FAIL";
  const economicAuthorization: "PASS" | "FAIL" =
    authorization.founderAuthorizationRecognized &&
    authorization.economicAuthorizationKind === "BOUNDED_BY_FOUNDER_AUTHORIZATION"
      ? "PASS"
      : "FAIL";
  const formPass: "PASS" | "FAIL" = form.readyForLiveDeploy ? "PASS" : "FAIL";
  const questionCoverage: "PASS" | "FAIL" =
    audit.unmappedHighPriority === 0 && audit.coverage.answeredQuestions >= 30 ? "PASS" : "FAIL";
  const answerAuthority: "PASS" | "FAIL" = audit.answerAuthorityReady === "PASS" ? "PASS" : "FAIL";
  const citationReadiness: "PASS" | "FAIL" = audit.citationReadyChunks >= 8 ? "PASS" : "FAIL";
  const directResponse: "PASS" | "FAIL" =
    audit.homepage.overall === "PASS" && audit.homepageDr.overall === "PASS" ? "PASS" : "FAIL";
  const visualQc: "PASS" | "FAIL" = audit.pagesUnderVisualized === 0 && audit.npv.visualizations === "PASS" ? "PASS" : "FAIL";
  const geoseo: "PASS" | "FAIL" = audit.technical.geoSeo;
  const schema: "PASS" | "FAIL" = audit.technical.schema;
  const metadata: "PASS" | "FAIL" = audit.technical.metadata;
  const internalLinks: "PASS" | "FAIL" =
    audit.technical.brokenInternalLinks === 0 && audit.technical.indexableOrphans === 0 ? "PASS" : "FAIL";
  const overall: "PASS" | "FAIL" =
    identity === "PASS" &&
    digestLock === "PASS" &&
    predecessorIdentity === "PASS" &&
    questionCoverage === "PASS" &&
    answerAuthority === "PASS" &&
    citationReadiness === "PASS" &&
    directResponse === "PASS" &&
    visualQc === "PASS" &&
    geoseo === "PASS" &&
    schema === "PASS" &&
    metadata === "PASS" &&
    internalLinks === "PASS" &&
    isolatedPass === "PASS" &&
    secret.status === "PASS" &&
    legalPass === "PASS" &&
    formPass === "PASS" &&
    integrity.status === "PASS" &&
    founderPass === "PASS" &&
    economicAuthorization === "PASS" &&
    eagPass === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    artifactIdentity: identity,
    digestLock,
    predecessorMutated: false,
    predecessorIdentity,
    questionCoverage,
    answerAuthority,
    citationReadiness,
    directResponse,
    visualQc,
    geoseo,
    schema,
    metadata,
    internalLinks,
    accessibility: audit.technical.accessibility,
    isolatedBuild: isolatedPass,
    secretScan: secret.status,
    form: formPass,
    ingest: formPass,
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
