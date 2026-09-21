import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { attachCommandActivity, emitMissionActivity, runInstrumentedMission, type CommandActivityView } from "@/lib/infinity/mission-activity";
import { commitMissionActivityDurably } from "@/lib/infinity/mission-activity/commit";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "@/lib/infinity/venture-website-architecture/constants";
import { evaluateExpandedPublicAuthorityPublishability } from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import {
  buildPublicAuthorityPageContract,
  buildPublicAuthoritySiteProfile,
  creReferenceCompatibility,
  evaluatePublicAuthorityPublishability as evaluateGlobalAuthorityPublishability,
  infinityPublicAuthorityStandard,
  publicPageArchetypeRegistry,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard";
import { HARD_PUBLISHABILITY_GATES } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import {
  evaluateProviderEquivalentDeploymentEligibility,
  getFrozenProviderEquivalentGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  validationProjectName,
} from "./constants";
import {
  homepageHeroLinkContrastProviderWriteAlreadyConsumed,
  persistHomepageHeroLinkContrastDeployAttemptState,
  readHomepageHeroLinkContrastDeployAttemptState,
} from "./cre-homepage-hero-link-contrast-deploy-attempt-state";
import {
  HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS,
  resolveFrozenHomepageHeroLinkContrastDeploymentBundle,
} from "./resolve-frozen-homepage-hero-link-contrast-bundle";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activateHomepageHeroLinkContrastPublicArtifact,
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
  getCanonicalActivePublicValidationState,
} from "./active-public-artifact";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import {
  HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_CEILING_USD,
  HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
  HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD,
  evaluateHomepageHeroLinkContrastDeployFounderAuthorization,
  homepageHeroLinkContrastDeployAuthorizationAlreadyConsumed,
  homepageHeroLinkContrastDeployFounderScope,
  persistHomepageHeroLinkContrastDeployFounderAuthorization,
} from "./cre-homepage-hero-link-contrast-deploy-authorization";
import {
  homepageHeroLinkContrastLiveVerificationPassed,
  verifyHomepageHeroLinkContrastLivePublic,
} from "./cre-homepage-hero-link-contrast-live-verify";
import { searchDepthRouteManifest } from "./cre-authority-expansion-routes";
import { buildDeployableSourcePackage } from "./deployable-package";
import { evaluateEconomicEligibility, refreshVercelPlanIfNeeded } from "./economic-read-live";
import { rememberValidationDeployment } from "./execute";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { consumeFounderAuthorizationDeployment, getFounderAuthorization } from "./founder-authorization";
import { loadEnvLocal } from "./live";
import { inspectFreshPlanEligibility } from "./plan-eligibility";
import { evaluateSourceBundlePreLiveGate } from "./pre-live-gate";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { getEvidenceCollectionStart, setEvidenceCollectionStart, setExperimentRuntimeState } from "./runtime-state";
import { evaluateSecretSafety } from "./secret-safety";
import { evaluateSourceIntegrity } from "./source-bundle-request";
import { evaluateSourceBundleLiveWriteGate, persistSourceBundleVerification } from "./source-bundle-verification";

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);
export const GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1 =
  "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1" as const;
export const GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID =
  "msn_cre_homepage_hero_link_contrast_deploy_v1" as const;
export const GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED =
  "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED" as const;
export const REPAIRED_ARTIFACT_FREEZE_MISMATCH = "REPAIRED_ARTIFACT_FREEZE_MISMATCH" as const;
export const HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING = {
  functionName: "executeHomepageHeroLinkContrastAuthorizedDeploy",
  mission: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1,
  missionId: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
  authorization: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
  artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  digest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  routes: 93,
  maximumDeployments: 1,
  maximumActivations: 1,
  liveVerifier: "verifyHomepageHeroLinkContrastLivePublic",
  activationEligibility: "homepageHeroLinkContrastLiveVerificationPassed",
  terminalActive: "CRE_HOMEPAGE_LINK_CONTRAST_ACTIVE",
  terminalDeployedNotActivated: "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYED_NOT_ACTIVATED",
  terminalFailed: "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_FAILED",
  forbiddenPredecessorArtifactIds: HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS,
} as const;

let repairDeployAttempts = 0;

function publicUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function preserveClock() {
  setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  if (!getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID)) {
    setEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID, CANONICAL_EVIDENCE_START);
  }
}

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "CRE lease NPV validation",
      ventureType: "validation",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: (
      [
        ["research_department", "Research Grid"],
        ["systems_architect", "Systems Architect"],
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
        ["creative_studio", "Design Core"],
        ["launch_operations", "Deployment Depot"],
        ["intelligence_center", "Signal Intelligence"],
        ["growth_department", "Growth Nexus"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED" as const,
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    })),
    pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
    workerNodes: [],
  };
}

function standardCompatibility(files: Array<{ path: string; content: string }>) {
  const expanded = evaluateExpandedPublicAuthorityPublishability(files);
  const standard = infinityPublicAuthorityStandard();
  const contract = buildPublicAuthorityPageContract({
    pageArchetype: "QUESTION_AUTHORITY",
    primaryTopic: "commercial-lease-npv",
    primaryQuestion: "How is lease NPV calculated?",
    targetPersona: "tenant-rep broker",
  });
  const profile = buildPublicAuthoritySiteProfile({
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    industry: "commercial real estate advisory",
    market: "tenant-rep brokers",
    audiences: ["tenant-rep broker", "CFO"],
    topicTaxonomy: [
      "commercial-lease-npv",
      "lease-comparison",
      "effective-rent",
      "occupancy-costs",
      "lease-sensitivity-analysis",
      "tenant-rep-analysis",
      "lease-financial-modeling",
    ],
    hubArchitecture: [{ topic: "commercial-lease-npv", hubRoute: "/commercial-lease-npv" }],
    visualLanguage: "editorial photography plus diagrams",
  });
  const registry = publicPageArchetypeRegistry();
  const reference = creReferenceCompatibility();
  const gateResults = Object.fromEntries(
    HARD_PUBLISHABILITY_GATES.map((gate) => {
      const mapped =
        gate === "HumanReadabilityGate"
          ? expanded.expansionReadability
          : gate === "HumanFirstPublicLanguageGate"
            ? expanded.humanFirstPublicLanguage
            : gate === "RenderedTextContrastGate"
              ? expanded.renderedTextContrast
              : gate === "RenderedHeadingInkGate"
                ? expanded.renderedTextContrast
                : gate === "TopicalCompletenessGate"
                  ? expanded.topicalCompleteness
                  : gate === "AnswerSurfaceCoverageGate"
                    ? expanded.answerSurfaceCoverage
                    : gate === "CitationReadinessGate"
                      ? expanded.citationReadiness
                      : gate === "SemanticInternalLinkDensityGate"
                        ? expanded.semanticInternalLinkDensity
                        : gate === "TopicGraphConnectivityGate"
                          ? expanded.topicGraphConnectivity
                          : gate === "SearchIntentConversionPathGate"
                            ? expanded.searchIntentConversionPath
                            : gate === "AboveFoldVisualCoverageGate"
                              ? expanded.aboveFoldVisualCoverage
                              : expanded.overall;
      return [gate, mapped === "PASS" ? ("PASS" as const) : ("FAIL" as const)];
    }),
  );
  const global = evaluateGlobalAuthorityPublishability({ gateResults });
  return {
    standardId: standard.model,
    standardVersion: standard.version,
    pageContract: contract.model === "PublicAuthorityPageContract" ? ("PASS" as const) : ("FAIL" as const),
    siteProfile: profile.model === "PublicAuthoritySiteProfile" ? ("PASS" as const) : ("FAIL" as const),
    archetypes: registry.model === "PublicPageArchetypeRegistry" ? ("PASS" as const) : ("FAIL" as const),
    reference: reference.overall,
    expanded: expanded.overall,
    global: global.overall,
    ready: expanded.ready,
    publishability: expanded,
  };
}

async function closeConsumedHomepageHeroRepairAuthorization() {
  await commitMissionActivityDurably(
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: "msn_cre_homepage_hero_and_hq_infinity_core_repair_v1",
      missionType: "CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1",
      engine: "mission_runtime",
      stepType: "QUALITY_REVIEW",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      summary:
        "Homepage hero-link contrast repair completed. The authorized provider write already occurred, so this mission is no longer current.",
      technicalDetail: "authorization_consumed=GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED",
      source: "governed_cre_homepage_hero_link_contrast_deployment_v1",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: "msn_cre_homepage_hero_and_hq_infinity_core_repair_v1",
        artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
}

export async function executeHomepageHeroLinkContrastAuthorizedDeploy() {
  loadEnvLocal();
  preserveClock();
  const persistedAttempts = readHomepageHeroLinkContrastDeployAttemptState();
  repairDeployAttempts = Math.max(repairDeployAttempts, persistedAttempts.deployments);
  const hqBase = {
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
    missionType: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1,
    source: "governed_cre_homepage_hero_link_contrast_deployment_v1",
    executionClass: "VENTURE_EXECUTION" as const,
    synthetic: false,
    traceability: {
      missionId: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
      artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
    },
  };
  const blocked = (stopReason: string, extra: Record<string, unknown> = {}) => ({
    artifactIdentity: extra.artifactIdentity ?? "PASS",
    digestLock: extra.digestLock ?? "PASS",
    actualDigest: extra.actualDigest ?? CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
    routes: extra.routes ?? HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.routes,
    ready: extra.ready ?? "PREMIUM_AUTHORITY_VALIDATION_READY",
    founderVisualReviewReady: extra.founderVisualReviewReady ?? "FOUNDER_VISUAL_REVIEW_READY",
    compatibility: extra.compatibility ?? null,
    predeploy: extra.predeploy ?? { overall: "PASS", composed: false },
    executed: false,
    attempted: persistedAttempts.deployments > 0 || repairDeployAttempts > 0,
    authorizationConsumed: persistedAttempts.authorizationConsumed || homepageHeroLinkContrastDeployAuthorizationAlreadyConsumed(),
    project: ISOLATED_PROJECT,
    deploymentId: extra.deploymentId ?? persistedAttempts.deploymentId,
    publicUrl: extra.publicUrl ?? persistedAttempts.publicUrl,
    providerFinalState: extra.providerFinalState ?? persistedAttempts.providerState ?? "NOT_DEPLOYED",
    providerError: extra.providerError ?? null,
    live: extra.live ?? null,
    activated: false,
    activationCount: persistedAttempts.activations,
    activeArtifact: getActivePublicValidationArtifactId(),
    activeDeployment: getActivePublicValidationDeploymentId(),
    activeUrl: getActivePublicValidationUrl(),
    canonicalReadback: getCanonicalActivePublicValidationState(),
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
    experimentState: inspectRealMarketEvidence().experiment.state,
    evidenceStart: inspectExperimentClock().evidenceStart,
    deadline: inspectExperimentClock().deadline,
    counts: inspectRealMarketEvidence().counts,
    providerCost: "UNKNOWN" as const,
    deployments: persistedAttempts.deployments,
    activations: persistedAttempts.activations,
    stopReason,
    commandDuring: "PRESENT_IDLE",
    deploymentDepotDuring: "PRESENT_IDLE",
    validationStationDuring: "PRESENT_IDLE",
    creationLabDuring: "PRESENT_IDLE",
    systemsArchitectDuring: "PRESENT_IDLE",
    growthNexusDuring: "PRESENT_IDLE",
    missionRoomActivityProjection: "PASS" as const,
    latestCompleted: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1,
    publiclyLaunched: false,
    deployFunctionMissionBinding: "PASS" as const,
    deployArtifactExactMatch: extra.deployArtifactExactMatch ?? "PASS",
    deployDigestExactMatch: extra.deployDigestExactMatch ?? "PASS",
    publicBundleHqFiles: extra.publicBundleHqFiles ?? 0,
    storedQcUsedAsLiveProof: false,
    ...extra,
  });

  if (
    persistedAttempts.deployments >= HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_BINDING.maximumDeployments ||
    repairDeployAttempts >= 1 ||
    homepageHeroLinkContrastProviderWriteAlreadyConsumed() ||
    homepageHeroLinkContrastDeployAuthorizationAlreadyConsumed()
  ) {
    return blocked("DEPLOYMENT_AUTHORIZATION_ALREADY_CONSUMED", {
      providerFinalState: persistedAttempts.providerState ?? "READY",
    });
  }

  persistHomepageHeroLinkContrastDeployFounderAuthorization();
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...hqBase,
      engine: "mission_runtime",
      stepType: "ORCHESTRATE_HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY",
      eventType: "MISSION_STARTED",
      summary: "Starting the governed homepage hero-link contrast deployment of art_dbf624e41599420891e2",
    }),
  );
  const resolved = resolveFrozenHomepageHeroLinkContrastDeploymentBundle();
  const predeploy = {
    overall: resolved.admission,
    composed: resolved.composed,
    composeInvoked: resolved.composeInvoked,
    reconstructed: null,
    newDeterministicFailures: 0,
    pageLoop: { overall: resolved.pageLoopOverall },
    hookBoundary: resolved.hookBoundary,
    hqFiles: resolved.hqFiles,
  };
  const artifactId = resolved.artifactId;
  const digest = resolved.digest;
  const files = resolved.files;
  const identity = resolved.artifactExactMatch;
  const digestLock = resolved.digestExactMatch;
  const manifest = searchDepthRouteManifest();
  const compatibility = standardCompatibility(files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content })));
  const founder = evaluateHomepageHeroLinkContrastDeployFounderAuthorization();

  if (
    identity === "FAIL" ||
    digestLock === "FAIL" ||
    manifest.intendedCount !== 93 ||
    HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS.includes(
      artifactId as (typeof HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS)[number],
    )
  ) {
    return blocked(digestLock === "FAIL" ? REPAIRED_ARTIFACT_FREEZE_MISMATCH : AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH, {
      artifactIdentity: identity,
      digestLock,
      actualDigest: digest,
      deployArtifactExactMatch: identity,
      deployDigestExactMatch: digestLock,
      publicBundleHqFiles: resolved.hqFiles,
      predeploy,
      compatibility,
    });
  }
  if (
    !resolved.ok ||
    resolved.composed ||
    resolved.composeInvoked ||
    resolved.hqFiles !== 0 ||
    resolved.scopeSeparation !== "PASS" ||
    resolved.peBuildFrozen !== "PASS" ||
    predeploy.overall === "FAIL" ||
    compatibility.expanded !== "PASS" ||
    compatibility.global !== "PASS" ||
    compatibility.reference !== "PASS" ||
    compatibility.ready !== PREMIUM_AUTHORITY_VALIDATION_READY ||
    !resolved.fullFrozenBundleAvailable
  ) {
    return blocked(
      !resolved.fullFrozenBundleAvailable ? "FROZEN_FULL_BUNDLE_UNAVAILABLE" : resolved.stopReason ?? "PREDEPLOY_QUALITY_FAILED",
      {
      artifactIdentity: identity,
      digestLock,
      actualDigest: digest,
      publicBundleHqFiles: resolved.hqFiles,
      predeploy,
      compatibility,
    });
  }

  const eligibility = evaluateProviderEquivalentDeploymentEligibility({ artifactId, digest, files });
  if (eligibility.status !== "PASS") {
    return blocked(eligibility.issues[0] ?? "PROVIDER_EQUIVALENT_BUILD_GATE_REQUIRED", {
      artifactIdentity: identity,
      digestLock,
      actualDigest: digest,
      publicBundleHqFiles: resolved.hqFiles,
      predeploy,
      compatibility,
    });
  }

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
    expectedArtifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  });
  if (integrity.status !== "PASS") return blocked("SOURCE_INTEGRITY_FAILED", { integrity });

  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid: true,
    validationPassed: true,
    fullProduct: false,
    purpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
    artifactFiles: files,
    existingDeploymentCount: 0,
    founderAuthorization: getFounderAuthorization() ?? founder.authorization,
  });
  await refreshVercelPlanIfNeeded();
  const plan = inspectFreshPlanEligibility();
  const economic = evaluateEconomicEligibility("UNKNOWN", { recognized: founder.recognized });
  const eagApproved = authorization.eag === "APPROVED";
  const preLive = evaluateSourceBundlePreLiveGate({
    adapterPass: true,
    artifactPass: authorization.artifactValidation === "PASS",
    formPass: authorization.formBackendReady,
    analyticsPass: authorization.analyticsBackendReady,
    secretSafety: authorization.secretSafety,
    planPass: plan.marketValidationExperiment === "PASS",
    commercialEligibilityPass: plan.commercialUse === "YES",
    deployPackagePass: integrity.status === "PASS",
    costClassification: "UNKNOWN",
    unknownCost: true,
    economicAuthorizationPass: economic.economicallyEligible && founder.recognized,
    eagApproved,
    eagPermitsBoundedVerification: eagApproved,
    founderCeilingRecognized: founder.recognized,
  });
  const liveWrite = evaluateSourceBundleLiveWriteGate({
    adapterImplemented: true,
    capabilityVerified: false,
    unknownCost: true,
    eagApproved,
    sourceIntegrity: integrity.status,
    secretSafety: authorization.secretSafety,
    founderCeilingRecognized: founder.recognized,
  });
  if (!founder.recognized || !eagApproved || !preLive.readyForLiveProviderCall || !liveWrite.allowed) {
    return blocked(preLive.readyForLiveProviderCall && liveWrite.allowed ? authorization.eagReason : liveWrite.reason);
  }

  const deploymentBody = buildVercelSourceBundleDeploymentBody({ projectName: ISOLATED_PROJECT, files });
  const stagingContract = evaluateVercelSourceBundleDeploymentBody(deploymentBody);
  if (deploymentBody.target !== "staging" || !stagingContract.valid) {
    return blocked("STAGING_TARGET_REQUIRED");
  }
  const ctx = {
    organizationId: LIVE_ORG,
    actionType: SOURCE_BUNDLE_CAPABILITY,
    target: ISOLATED_PROJECT,
    payload: {
      project_name: ISOLATED_PROJECT,
      artifact_id: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
      source_digest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
  };
  const validated = await vercelAdapter.validate(ctx);
  if (!validated.valid) return blocked(`ADAPTER_VALIDATE_FAILED:${validated.issues.join(",")}`);

  repairDeployAttempts += 1;
  persistHomepageHeroLinkContrastDeployAttemptState({
    deployments: 1,
    activations: persistedAttempts.activations,
    authorizationConsumed: true,
    terminalState: null,
  });
  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
      missionType: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1,
      source: "governed_cre_homepage_hero_link_contrast_deployment_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY",
      "QUALITY_REVIEW",
      "PREPARE_SOURCE_BUNDLE",
      "CREATE_DEPLOYMENT",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
      "ACTIVATE_PUBLIC_ARTIFACT",
    ],
    orchestrationStepType: "ORCHESTRATE_HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY",
    onSnapshot: (view: CommandActivityView, phase: string) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Reconfirming repaired digest, rendered contrast, human-first language, and 93-route freeze.",
        run: () => ({ identity, digestLock, ready: compatibility.ready, routes: manifest.intendedCount, predeploy: predeploy.overall }),
      });
      await handle.step({
        stepType: "PREPARE_SOURCE_BUNDLE",
        engine: "launch_gateway",
        summary: "Handing the frozen repaired successor bundle to the adapter.",
        run: () => ({ files: files.length, digest, frozen: resolved.peBuildFrozen === "PASS" || Boolean(getFrozenProviderEquivalentGate()?.frozen) }),
      });
      let result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null = null;
      let providerError: string | null = null;
      try {
        result = await handle.step({
          stepType: "CREATE_DEPLOYMENT",
          engine: "launch_gateway",
          summary: "Publishing repaired art_dbf624e41599420891e2 to the isolated Vercel staging project.",
          run: async () => {
            const executed = await vercelAdapter.execute(ctx);
            consumeFounderAuthorizationDeployment();
            recordExternalActionAttemptConsumed({
              attemptId: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
              scope: homepageHeroLinkContrastDeployFounderScope(),
              providerDeploymentCreated: Boolean(executed.externalIds.deployment_id),
              source: "vercel.com_v1 hosting.deploy_source_bundle execute",
            });
            return executed;
          },
        });
      } catch (error) {
        consumeFounderAuthorizationDeployment();
        recordExternalActionAttemptConsumed({
          attemptId: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
          scope: homepageHeroLinkContrastDeployFounderScope(),
          providerDeploymentCreated: false,
          source: error instanceof Error ? error.message : String(error),
        });
        providerError = error instanceof Error ? error.message : String(error);
        persistSourceBundleVerification({
          status: "FAILED",
          liveWriteAttempted: true,
          timestamp: new Date().toISOString(),
          evidence: providerError,
          costEvidence: "UNKNOWN",
          sourceDigest: digest,
          artifactId,
          candidateId: CRE_CANDIDATE_ID,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          founderAuthorizationId: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_CEILING_USD,
          runtimeCeilingUsd: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD,
          providerCostState: "UNKNOWN",
        });
        persistHomepageHeroLinkContrastDeployAttemptState({
          deployments: 1,
          activations: 0,
          authorizationConsumed: true,
          terminalState: "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_FAILED",
        });
        await closeConsumedHomepageHeroRepairAuthorization();
        return { result: null, providerError, live: null, activated: false };
      }

      const lifecycle = String(result.manifest.provider_lifecycle_state ?? "");
      const ready = result.manifest.ready === true;
      const deploymentId = result.externalIds.deployment_id ?? null;
      const url = publicUrl(result.externalIds.url ?? "");
      persistSourceBundleVerification({
        status: ready ? "LIVE_WRITE_VERIFIED" : "FAILED",
        liveWriteAttempted: true,
        timestamp: new Date().toISOString(),
        deploymentId,
        projectId: ISOLATED_PROJECT,
        url: url || null,
        evidence: ready
          ? `hosting.deploy_source_bundle LIVE_WRITE_VERIFIED. deployment=${deploymentId} url=${url}`
          : `Provider write returned ready=${String(result.manifest.ready)} state=${lifecycle}`,
        costEvidence: "UNKNOWN. Successful deploy is not proof of zero or known cost.",
        sourceDigest: digest,
        artifactId,
        candidateId: CRE_CANDIDATE_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        founderAuthorizationId: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
        deploymentCeilingUsd: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_CEILING_USD,
        runtimeCeilingUsd: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD,
        providerCostState: "UNKNOWN",
      });
      if (deploymentId && url) {
        rememberValidationDeployment({
          provider: "vercel",
          project: ISOLATED_PROJECT,
          deploymentId,
          url,
          artifactId,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
        });
      }
      await closeConsumedHomepageHeroRepairAuthorization();
      if (!ready || !deploymentId || !url) {
        return {
          result,
          providerError: lifecycle === "timed_out" ? "PENDING_EXTERNAL" : `PROVIDER_NOT_READY:${lifecycle}`,
          live: null,
          activated: false,
        };
      }

      const live = await handle.step({
        stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
        engine: "market_validation",
        summary: "Verifying live nav contrast, 93 routes, hub boards, Trusted Sources, pricing, and human-first language.",
        run: async () =>
          verifyHomepageHeroLinkContrastLivePublic({
            url,
            artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
            files,
          }),
      });
      preserveClock();
      let activated = false;
      if (homepageHeroLinkContrastLiveVerificationPassed(live)) {
        await handle.step({
          stepType: "ACTIVATE_PUBLIC_ARTIFACT",
          engine: "launch_gateway",
          summary: "Binding the homepage hero-link contrast successor as the active validation artifact. READY is not PUBLICLY_LAUNCHED.",
          run: () => {
            activateHomepageHeroLinkContrastPublicArtifact({
              artifactId,
              digest,
              deploymentId,
              url,
            });
            activated = true;
            persistHomepageHeroLinkContrastDeployAttemptState({
              deployments: 1,
              activations: 1,
              deploymentId,
              publicUrl: url,
              providerState: "READY",
              authorizationConsumed: true,
              terminalState: "CRE_HOMEPAGE_LINK_CONTRAST_ACTIVE",
            });
            return { activated: true, artifactId, deploymentId, url };
          },
        });
      } else {
        persistHomepageHeroLinkContrastDeployAttemptState({
          deployments: 1,
          activations: 0,
          deploymentId,
          publicUrl: url,
          providerState: ready ? "READY" : lifecycle,
          authorizationConsumed: true,
          terminalState: "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYED_NOT_ACTIVATED",
        });
      }
      return { result, providerError: null, live, activated };
    },
  });

  const inner = instrumented.result;
  const deployPhase = midRun.find((item) => item.phase.includes("CREATE_DEPLOYMENT"));
  const qcPhase = midRun.find((item) => item.phase.includes("PUBLIC_ARTIFACT_QUALITY_GATE"));
  const projection = evaluateMissionRoomActivityProjectionGate({
    openSteps: qcPhase ? [{ stepType: "PUBLIC_ARTIFACT_QUALITY_GATE", engine: "market_validation" }] : [],
    rooms: {
      quality_control: qcPhase?.rooms.includes("quality_control") ? "ACTIVE_WORK" : "PRESENT_IDLE",
      executive_office: midRun.some((item) => item.rooms.includes("executive_office")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
      launch_operations:
        deployPhase?.rooms.includes("launch_operations") || qcPhase?.rooms.includes("launch_operations")
          ? "ACTIVE_WORK"
          : "PRESENT_IDLE",
    },
    command: midRun.some((item) => item.rooms.includes("executive_office")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    deploymentWriteCompleted: Boolean(inner.result?.externalIds.deployment_id),
    liveValidationOpen: Boolean(qcPhase),
    consumedDeploymentAuthorizationStillActive: false,
    terminalOutcome: inner.activated ? "COMPLETED" : inner.result?.externalIds.deployment_id ? "DEPLOYED_NOT_ACTIVATED" : null,
    newRepairBlocker: inner.activated ? null : inner.result?.externalIds.deployment_id ? "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REPAIR_REQUIRED" : null,
  });
  preserveClock();
  void evaluateSecretSafety(files);
  return {
    artifactIdentity: identity,
    digestLock,
    actualDigest: digest,
    routes: manifest.intendedCount,
    ready: compatibility.ready,
    founderVisualReviewReady: resolved.founderVisualReviewReady,
    compatibility,
    predeploy,
    executed: Boolean(inner.result?.externalIds.deployment_id),
    attempted: true,
    authorizationConsumed: true,
    project: ISOLATED_PROJECT,
    deploymentId: inner.result?.externalIds.deployment_id ?? null,
    publicUrl: publicUrl(inner.result?.externalIds.url ?? ""),
    providerFinalState: inner.result?.manifest.ready === true ? ("READY" as const) : inner.providerError ? ("ERROR" as const) : ("NOT_DEPLOYED" as const),
    providerError: inner.providerError,
    live: inner.live,
    activated: inner.activated === true,
    activationCount: inner.activated === true ? 1 : 0,
    activeArtifact: getActivePublicValidationArtifactId(),
    activeDeployment: getActivePublicValidationDeploymentId(),
    activeUrl: getActivePublicValidationUrl(),
    canonicalReadback: getCanonicalActivePublicValidationState(),
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
    experimentState: inspectRealMarketEvidence().experiment.state,
    evidenceStart: inspectExperimentClock().evidenceStart,
    deadline: inspectExperimentClock().deadline,
    counts: inspectRealMarketEvidence().counts,
    providerCost: "UNKNOWN" as const,
    deployments: inner.result?.externalIds.deployment_id ? 1 : 0,
    activations: inner.activated === true ? 1 : 0,
    stopReason: inner.activated ? "NONE" : inner.providerError ?? "NOT_ACTIVATED",
    commandDuring: midRun.some((item) => item.rooms.includes("executive_office")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    deploymentDepotDuring: deployPhase?.rooms.includes("launch_operations") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    validationStationDuring: qcPhase?.rooms.includes("quality_control") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    creationLabDuring: midRun.some((item) => item.rooms.includes("product_lab")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    systemsArchitectDuring: midRun.some((item) => item.rooms.includes("systems_architect")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    growthNexusDuring: midRun.some((item) => item.rooms.includes("growth_department")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    missionRoomActivityProjection: projection.overall,
    latestCompleted: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1,
    publiclyLaunched: false,
    missionId: instrumented.view.latestCompleted?.missionId ?? GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
  };
}
