import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { attachCommandActivity, emitMissionActivity, runInstrumentedMission, type CommandActivityView } from "@/lib/infinity/mission-activity";
import { commitMissionActivityDurably } from "@/lib/infinity/mission-activity/commit";
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
  runProviderEquivalentArtifactBuildGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  validationProjectName,
} from "./constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activateHubQuestionBoardLayoutPublicArtifact,
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
  getCanonicalActivePublicValidationState,
} from "./active-public-artifact";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import {
  HUB_LAYOUT_REPAIR_DEPLOY_CEILING_USD,
  HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
  HUB_LAYOUT_REPAIR_DEPLOY_RUNTIME_CEILING_USD,
  evaluateHubLayoutRepairDeployFounderAuthorization,
  hubLayoutRepairDeployAuthorizationAlreadyConsumed,
  hubLayoutRepairDeployFounderScope,
  persistHubLayoutRepairDeployFounderAuthorization,
} from "./cre-hub-layout-repair-deploy-authorization";
import {
  hubLayoutRepairLiveVerificationPassed,
  verifyHubLayoutRepairLivePublic,
} from "./cre-hub-layout-repair-live-verify";
import { reconstructCreHubQuestionBoardLayoutSuccessor } from "@/lib/infinity/venture-website-architecture/cre-hub-question-board-layout-successor";
import { writeFile } from "node:fs/promises";
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
export const GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1 =
  "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1" as const;
export const GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID =
  "msn_cre_hub_layout_repair_deploy_v1" as const;
export const REPAIRED_ARTIFACT_FREEZE_MISMATCH = "REPAIRED_ARTIFACT_FREEZE_MISMATCH" as const;

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
      missionId: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
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

export async function executeHubLayoutRepairAuthorizedDeploy() {
  loadEnvLocal();
  preserveClock();
  persistHubLayoutRepairDeployFounderAuthorization();
  const hqBase = {
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
    missionType: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1,
    source: "governed_cre_hub_layout_repair_deployment_v1",
    executionClass: "VENTURE_EXECUTION" as const,
    synthetic: false,
    traceability: {
      missionId: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
      artifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
    },
  };
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...hqBase,
      engine: "mission_runtime",
      stepType: "ORCHESTRATE_HUB_LAYOUT_REPAIR_DEPLOY",
      eventType: "MISSION_STARTED",
      summary: "Starting the governed hub-layout repair deployment of art_868fc6cf5d72f97cc19a",
    }),
  );
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...hqBase,
      engine: "market_validation",
      stepType: "QUALITY_REVIEW",
      eventType: "STEP_STARTED",
      summary: "Reconfirming artifact identity, digest lock, and 93-route page-level admission",
    }),
  );
  const reconstructed = await reconstructCreHubQuestionBoardLayoutSuccessor();
  const predeploy = {
    overall:
      reconstructed.pageLoop.overall === "PASS" &&
      reconstructed.hookBoundary.overall === "PASS" &&
      reconstructed.hubLayout.overall === "PASS" &&
      reconstructed.discovery.overall === "PASS" &&
      reconstructed.founderVisualReviewReady === "FOUNDER_VISUAL_REVIEW_READY" &&
      reconstructed.digest === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST
        ? ("PASS" as const)
        : ("FAIL" as const),
    reconstructed,
    newDeterministicFailures: reconstructed.pageLoop.finalFailed + reconstructed.pageLoop.missingEvidence,
    pageLoop: reconstructed.pageLoop,
    hookBoundary: reconstructed.hookBoundary.overall,
  };
  await writeFile(
    ".infinity/hub-layout-repair-deploy-successor.json",
    `${JSON.stringify(
      {
        missionId: "msn_cre_hub_layout_repair_deploy_v1",
        predecessorMission: "CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1",
        artifactId: reconstructed.artifactId,
        digest: reconstructed.digest,
        routes: reconstructed.routes,
        predecessorArtifactId: reconstructed.predecessorArtifactId,
        predecessorDigest: reconstructed.predecessorDigest,
        pageLoop: reconstructed.pageLoop,
        hookBoundary: reconstructed.hookBoundary.overall,
        founderVisualReviewReady: reconstructed.founderVisualReviewReady,
        lockedDigest: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
        digestMatchesLock: reconstructed.digest === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
      },
      null,
      2,
    )}\n`,
  );
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const files = reconstructed.files;
  const identity = artifactId === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  const manifest = searchDepthRouteManifest();
  const compatibility = standardCompatibility(files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content })));
  const founder = evaluateHubLayoutRepairDeployFounderAuthorization();
  const blocked = (stopReason: string, extra: Record<string, unknown> = {}) => ({
    artifactIdentity: identity,
    digestLock,
    actualDigest: digest,
    routes: manifest.intendedCount,
    ready: compatibility.ready,
    founderVisualReviewReady: reconstructed.founderVisualReviewReady,
    compatibility,
    predeploy,
    executed: false,
    attempted: repairDeployAttempts > 0,
    authorizationConsumed: false,
    project: ISOLATED_PROJECT,
    deploymentId: null as string | null,
    publicUrl: null as string | null,
    providerFinalState: "NOT_DEPLOYED" as const,
    providerError: null as string | null,
    live: null as Awaited<ReturnType<typeof verifyHubLayoutRepairLivePublic>> | null,
    activated: false,
    activationCount: 0,
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
    deployments: 0,
    activations: 0,
    stopReason,
    commandDuring: "PRESENT_IDLE",
    deploymentDepotDuring: "PRESENT_IDLE",
    validationStationDuring: "PRESENT_IDLE",
    growthNexusDuring: "PRESENT_IDLE",
    latestCompleted: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1,
    publiclyLaunched: false,
    ...extra,
  });

  if (repairDeployAttempts >= 1 || hubLayoutRepairDeployAuthorizationAlreadyConsumed()) {
    return blocked("DEPLOYMENT_AUTHORIZATION_ALREADY_CONSUMED");
  }
  if (identity === "FAIL" || digestLock === "FAIL" || manifest.intendedCount !== 93) {
    return blocked(digestLock === "FAIL" ? REPAIRED_ARTIFACT_FREEZE_MISMATCH : AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH);
  }
  if (
    predeploy.overall === "FAIL" ||
    compatibility.expanded !== "PASS" ||
    compatibility.global !== "PASS" ||
    compatibility.reference !== "PASS" ||
    compatibility.ready !== PREMIUM_AUTHORITY_VALIDATION_READY ||
    reconstructed.founderVisualReviewReady !== "FOUNDER_VISUAL_REVIEW_READY" ||
    reconstructed.demand.overall !== "PASS" ||
    reconstructed.discovery.overall !== "PASS" ||
    reconstructed.hubLayout.overall !== "PASS" ||
    reconstructed.cannibal.overall !== "PASS" ||
    reconstructed.contrast.overall !== "PASS" ||
    reconstructed.pageLoop.overall !== "PASS" ||
    reconstructed.hookBoundary.overall !== "PASS" ||
    reconstructed.pageLoop.missingEvidence !== 0 ||
    reconstructed.pageLoop.repairCeilingExceeded !== 0 ||
    reconstructed.pageLoop.finalFailed !== 0
  ) {
    return blocked("PREDEPLOY_QUALITY_FAILED", { predeployFailures: predeploy.newDeterministicFailures });
  }

  const gate = await runProviderEquivalentArtifactBuildGate({
    artifactId,
    files,
    mode: "full",
    keepRoot: true,
    infinityCoreRoot: process.cwd(),
    freeze: true,
  });
  if (gate.status !== "PASS" || !gate.frozen || !gate.isolatedRoot) {
    return blocked("PROVIDER_EQUIVALENT_BUILD_GATE_FAILED", { gateIssues: gate.issues });
  }
  const eligibility = evaluateProviderEquivalentDeploymentEligibility({ artifactId, digest, files });
  if (eligibility.status !== "PASS") {
    return blocked(eligibility.issues[0] ?? "PROVIDER_EQUIVALENT_BUILD_GATE_REQUIRED");
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
    expectedArtifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
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
      artifact_id: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
      source_digest: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
  };
  const validated = await vercelAdapter.validate(ctx);
  if (!validated.valid) return blocked(`ADAPTER_VALIDATE_FAILED:${validated.issues.join(",")}`);

  repairDeployAttempts += 1;
  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
      missionType: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1,
      source: "governed_cre_hub_layout_repair_deployment_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_HUB_LAYOUT_REPAIR_DEPLOY",
      "QUALITY_REVIEW",
      "PREPARE_SOURCE_BUNDLE",
      "CREATE_DEPLOYMENT",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
      "ACTIVATE_PUBLIC_ARTIFACT",
    ],
    orchestrationStepType: "ORCHESTRATE_HUB_LAYOUT_REPAIR_DEPLOY",
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
        run: () => ({ files: files.length, digest, frozen: Boolean(getFrozenProviderEquivalentGate()?.frozen) }),
      });
      let result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null = null;
      let providerError: string | null = null;
      try {
        result = await handle.step({
          stepType: "CREATE_DEPLOYMENT",
          engine: "launch_gateway",
          summary: "Publishing repaired art_868fc6cf5d72f97cc19a to the isolated Vercel staging project.",
          run: async () => {
            const executed = await vercelAdapter.execute(ctx);
            consumeFounderAuthorizationDeployment();
            recordExternalActionAttemptConsumed({
              attemptId: HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
              scope: hubLayoutRepairDeployFounderScope(),
              providerDeploymentCreated: Boolean(executed.externalIds.deployment_id),
              source: "vercel.com_v1 hosting.deploy_source_bundle execute",
            });
            return executed;
          },
        });
      } catch (error) {
        consumeFounderAuthorizationDeployment();
        recordExternalActionAttemptConsumed({
          attemptId: HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
          scope: hubLayoutRepairDeployFounderScope(),
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
          founderAuthorizationId: HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: HUB_LAYOUT_REPAIR_DEPLOY_CEILING_USD,
          runtimeCeilingUsd: HUB_LAYOUT_REPAIR_DEPLOY_RUNTIME_CEILING_USD,
          providerCostState: "UNKNOWN",
        });
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
        founderAuthorizationId: HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
        deploymentCeilingUsd: HUB_LAYOUT_REPAIR_DEPLOY_CEILING_USD,
        runtimeCeilingUsd: HUB_LAYOUT_REPAIR_DEPLOY_RUNTIME_CEILING_USD,
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
        summary: "Verifying live hub boards, 93 routes, contrast, Trusted Sources, pricing, and human-first language.",
        run: async () =>
          verifyHubLayoutRepairLivePublic({
            url,
            artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
            files,
          }),
      });
      preserveClock();
      let activated = false;
      if (hubLayoutRepairLiveVerificationPassed(live)) {
        await handle.step({
          stepType: "ACTIVATE_PUBLIC_ARTIFACT",
          engine: "launch_gateway",
          summary: "Binding the hub-layout repair successor as the active validation artifact. READY is not PUBLICLY_LAUNCHED.",
          run: () => {
            activateHubQuestionBoardLayoutPublicArtifact({
              artifactId,
              digest,
              deploymentId,
              url,
            });
            activated = true;
            return { activated: true, artifactId, deploymentId, url };
          },
        });
      }
      return { result, providerError: null, live, activated };
    },
  });

  const inner = instrumented.result;
  const deployPhase = midRun.find((item) => item.phase.includes("CREATE_DEPLOYMENT"));
  const qcPhase = midRun.find((item) => item.phase.includes("PUBLIC_ARTIFACT_QUALITY_GATE"))
    ?? midRun.find((item) => item.phase.includes("QUALITY_REVIEW"));
  preserveClock();
  void evaluateSecretSafety(files);
  return {
    artifactIdentity: identity,
    digestLock,
    actualDigest: digest,
    routes: manifest.intendedCount,
    ready: compatibility.ready,
    founderVisualReviewReady: reconstructed.founderVisualReviewReady,
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
    growthNexusDuring: midRun.some((item) => item.rooms.includes("growth_department")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    latestCompleted: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1,
    publiclyLaunched: false,
    missionId: instrumented.view.latestCompleted?.missionId ?? GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
  };
}
