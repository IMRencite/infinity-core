import { auditFooterContract, evaluatePublicLegalCompleteness } from "@/lib/infinity/public-venture-template";
import { reconstructCrePublicLineageQuestionIdRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-lineage-question-id-successor";
import { auditSuccessorAuthorityArtifact } from "@/lib/infinity/venture-website-architecture/answer-authority/successor-audit";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "@/lib/infinity/venture-website-architecture/constants";
import { inspectRenderedLineageAndQuestionIdentity } from "@/lib/infinity/venture-website-architecture/public-lineage-question-id";
import {
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { EXPECTED_DR_PUBLIC_ROUTES } from "./cre-dr-successor-authorization";
import { DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-dr-successor-authorization";
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
import { evaluateFormBackendReadiness } from "./ingest";
import { PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./premium-authority-successor-authorization";
import { VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./validation-grade-successor-authorization";
import { evaluateFinalRepairSuccessorIsolatedReadiness } from "./cre-final-repair-successor-isolated";

export const FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_final_lineage_qid_successor_staging_v1" as const;

export const FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD = 5 as const;
export const FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD = 5 as const;

export const EXPECTED_FINAL_REPAIR_PUBLIC_ROUTES = EXPECTED_DR_PUBLIC_ROUTES;

const CONSUMED_AUTHORIZATION_IDS = [
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  "founder_ceiling_cre_val_protection_5_10_v1",
] as const;

export function finalRepairSuccessorFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function buildFinalRepairSuccessorFounderAuthorization(
  now?: Date,
):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: string } {
  return buildFounderExternalCostAuthorization({
    authorizationId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
    scope: finalRepairSuccessorFounderScope(),
    reason:
      "Founder explicit single-use $5 deployment ceiling for art_3f619b664ab7740751a0 digest 8fa3ffe8d4c75f378439dbfff4a57306368e7f86902b306fbfbfa221d8c095fc. One staging source-bundle workflow. Provider cost remains UNKNOWN. Ceiling is not spend.",
    now,
  });
}

export function persistFinalRepairSuccessorFounderAuthorization(now?: Date) {
  const scope = finalRepairSuccessorFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildFinalRepairSuccessorFounderAuthorization(now);
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateFinalRepairSuccessorFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = finalRepairSuccessorFounderScope();
  const built = buildFinalRepairSuccessorFounderAuthorization(now);
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

export function priorFinalRepairDeploymentAuthorizationsAreNotReusable(): {
  newAuthorizationId: typeof FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID;
  reusedPriorId: false;
  priorIds: readonly string[];
} {
  return {
    newAuthorizationId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    reusedPriorId: false,
    priorIds: CONSUMED_AUTHORIZATION_IDS,
  };
}

export type FinalRepairSuccessorDeployPreflight = {
  artifactIdentity: "PASS" | "FAIL";
  digestLock: "PASS" | "FAIL";
  predecessorMutated: false;
  predecessorIdentity: "PASS" | "FAIL";
  renderedLayout: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  experimentLineage: "PASS" | "FAIL";
  questionIdentity: "PASS" | "FAIL";
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
  extras: Partial<FinalRepairSuccessorDeployPreflight> & {
    artifactId: string;
    digest: string;
    files: Array<{ path: string; content: string }>;
    founder: FounderAuthorizationEvaluation;
    intendedRoutes?: string[];
  },
): FinalRepairSuccessorDeployPreflight {
  return {
    artifactIdentity: "FAIL",
    digestLock: "FAIL",
    predecessorMutated: false,
    predecessorIdentity: "FAIL",
    renderedLayout: "FAIL",
    candidateLineage: "FAIL",
    experimentLineage: "FAIL",
    questionIdentity: "FAIL",
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
    intendedRoutes: extras.intendedRoutes ?? [...EXPECTED_FINAL_REPAIR_PUBLIC_ROUTES],
    ...extras,
  };
}

export async function evaluateFinalRepairSuccessorDeployPreflight(): Promise<FinalRepairSuccessorDeployPreflight> {
  const reconstructed = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
  const files = reconstructed.files;
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const founder = evaluateFinalRepairSuccessorFounderAuthorization();
  const intendedRoutes = [
    ...new Set(
      [...reconstructed.architecture.pages.map((page) => page.route), ...EXPECTED_FINAL_REPAIR_PUBLIC_ROUTES].map((route) =>
        route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route,
      ),
    ),
  ];
  const identity = artifactId === PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  const predecessorIdentity =
    reconstructed.predecessorArtifactId === RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    reconstructed.predecessorDigest === RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST
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
  persistFinalRepairSuccessorFounderAuthorization();
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
    expectedArtifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  });
  const legal = evaluatePublicLegalCompleteness(files);
  const footer = auditFooterContract(files);
  const secret = evaluateSecretSafety(files);
  const isolated = evaluateFinalRepairSuccessorIsolatedReadiness();
  const form = evaluateFormBackendReadiness({ artifactFiles: files, experimentId: LOCKED_CRE_EXPERIMENT_ID });
  const layout = auditRenderedLayoutQualityGate(files);
  const lineage = inspectRenderedLineageAndQuestionIdentity({ files, artifactId });
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
    artifactValid: integrity.status === "PASS" && audit.newClassification === PREMIUM_AUTHORITY_VALIDATION_READY,
    validationPassed: audit.newClassification === PREMIUM_AUTHORITY_VALIDATION_READY && audit.hardFailPages === 0,
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
  const renderedLayout: "PASS" | "FAIL" = renderedLayoutPassesPremiumAuthority(layout) ? "PASS" : "FAIL";
  const candidateLineage: "PASS" | "FAIL" = lineage.candidate.liveVerifiable ? "PASS" : "FAIL";
  const experimentLineage: "PASS" | "FAIL" = lineage.experiment.renderedDerivable === "PASS" ? "PASS" : "FAIL";
  const questionIdentity: "PASS" | "FAIL" = lineage.questions.missing === 0 && lineage.questions.dataQuestionId === "PASS" ? "PASS" : "FAIL";
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
    renderedLayout === "PASS" &&
    candidateLineage === "PASS" &&
    experimentLineage === "PASS" &&
    questionIdentity === "PASS" &&
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
    renderedLayout,
    candidateLineage,
    experimentLineage,
    questionIdentity,
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
