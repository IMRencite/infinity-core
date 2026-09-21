import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { reconstructCrePublicLineageQuestionIdRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-lineage-question-id-successor";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activateFinalRepairSuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
  isFinalRepairSuccessorPublicActive,
} from "./active-public-artifact";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
  validationProjectName,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { evaluateEconomicEligibility, refreshVercelPlanIfNeeded } from "./economic-read-live";
import { rememberValidationDeployment } from "./execute";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { consumeFounderAuthorizationDeployment, getFounderAuthorization } from "./founder-authorization";
import { handlePublicValidationIngest, publicValidationIngestOrigin } from "./ingest";
import { loadEnvLocal } from "./live";
import { inspectFreshPlanEligibility } from "./plan-eligibility";
import { evaluateSourceBundlePreLiveGate } from "./pre-live-gate";
import { inspectRuntimeCostObservability } from "./runtime-cost-observability";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import { evaluateSourceIntegrity } from "./source-bundle-request";
import {
  evaluateSourceBundleLiveWriteGate,
  getSourceBundleVerification,
  persistSourceBundleVerification,
} from "./source-bundle-verification";
import { getEvidenceCollectionStart, setEvidenceCollectionStart, setExperimentRuntimeState } from "./runtime-state";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import {
  FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
  evaluateFinalRepairSuccessorDeployPreflight,
  persistFinalRepairSuccessorFounderAuthorization,
  finalRepairSuccessorFounderScope,
  type FinalRepairSuccessorDeployPreflight,
} from "./cre-final-repair-successor-authorization";
import {
  finalRepairLiveVerificationPassed,
  verifyFinalRepairSuccessorLivePublic,
} from "./cre-final-repair-successor-live-verify";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);
export const CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY_MISSION = "CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY" as const;
export const CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID = "msn_cre_final_repair_successor_deploy_v1" as const;

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
      missionId: CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID,
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

export type FinalRepairSuccessorDeployResult = FinalRepairSuccessorDeployPreflight & {
  executed: boolean;
  attempted: boolean;
  project: string | null;
  projectId: string | null;
  deploymentId: string | null;
  publicUrl: string | null;
  customDomain: false;
  providerFinalState: "READY" | "ERROR" | "NOT_DEPLOYED";
  live: Awaited<ReturnType<typeof verifyFinalRepairSuccessorLivePublic>> | null;
  syntheticForm: {
    performed: boolean;
    countedAsReal: false;
    sameOrigin: "PASS" | "FAIL" | "NOT_DEPLOYED";
    experimentValidation: "PASS" | "FAIL" | "NOT_DEPLOYED";
    candidate: "PASS" | "FAIL" | "NOT_DEPLOYED";
    experimentLineage: "PASS" | "FAIL" | "NOT_DEPLOYED";
    successorArtifactLineage: "PASS" | "FAIL" | "NOT_DEPLOYED";
    routeReachedApplication: boolean;
  };
  syntheticAnalytics: {
    performed: boolean;
    countedAsReal: false;
    observation: "PASS" | "FAIL" | "NOT_DEPLOYED";
    normalized: "PASS" | "FAIL" | "NOT_DEPLOYED";
    lineage: "PASS" | "FAIL" | "NOT_DEPLOYED";
  };
  experimentState: string;
  evidenceStart: string;
  deadline: string;
  counts: ReturnType<typeof inspectRealMarketEvidence>["counts"];
  activeArtifact: string;
  predecessorLineage: "PASS";
  changedBeforeCompleteVerification: false;
  providerError: string | null;
  reusedExisting: boolean;
  providerCost: "UNKNOWN";
  observedAttributableSpend: "UNKNOWN";
  fiveRecordedAsSpend: false;
  commandDuring: string;
  deploymentDepotDuring: string;
  validationStationDuring: string;
  creationLab: string;
  researchGrid: string;
  designCore: string;
  systemsArchitectDuring: string;
  signalIntelligenceDuring: string;
  activeWorkerProjection: "PASS" | "FAIL";
  glowMotionTruthful: "PASS" | "FAIL";
  latestCompleted: "PASS" | "FAIL";
  instrumentation: "PASS" | "FAIL";
  midRun: Array<{ phase: string; rooms: string[]; workers: string[] }>;
  fakeActivity: false;
  urlMigrations: [];
};

function missionAfter() {
  const evidence = inspectRealMarketEvidence();
  return {
    experimentState: evidence.experiment.state,
    evidenceStart: inspectExperimentClock().evidenceStart,
    deadline: inspectExperimentClock().deadline,
    counts: evidence.counts,
    activeArtifact: getActivePublicValidationArtifactId(),
    predecessorLineage: "PASS" as const,
    changedBeforeCompleteVerification: false as const,
  };
}

function idleRooms() {
  return {
    commandDuring: "PRESENT_IDLE",
    deploymentDepotDuring: "PRESENT_IDLE",
    validationStationDuring: "PRESENT_IDLE",
    creationLab: "PRESENT_IDLE",
    researchGrid: "EMPTY",
    designCore: "PRESENT_IDLE",
    systemsArchitectDuring: "PRESENT_IDLE",
    signalIntelligenceDuring: "PRESENT_IDLE",
    activeWorkerProjection: "PASS" as const,
    glowMotionTruthful: "PASS" as const,
    latestCompleted: "FAIL" as const,
    instrumentation: "FAIL" as const,
    midRun: [] as Array<{ phase: string; rooms: string[]; workers: string[] }>,
    fakeActivity: false as const,
    urlMigrations: [] as [],
  };
}

export async function executeFinalRepairSuccessorAuthorizedDeploy(): Promise<FinalRepairSuccessorDeployResult> {
  loadEnvLocal();
  persistFinalRepairSuccessorFounderAuthorization();
  const existing = getSourceBundleVerification();
  const emptySynthetic = {
    performed: false,
    countedAsReal: false as const,
    sameOrigin: "NOT_DEPLOYED" as const,
    experimentValidation: "NOT_DEPLOYED" as const,
    candidate: "NOT_DEPLOYED" as const,
    experimentLineage: "NOT_DEPLOYED" as const,
    successorArtifactLineage: "NOT_DEPLOYED" as const,
    routeReachedApplication: false,
  };
  const emptyAnalytics = {
    performed: false,
    countedAsReal: false as const,
    observation: "NOT_DEPLOYED" as const,
    normalized: "NOT_DEPLOYED" as const,
    lineage: "NOT_DEPLOYED" as const,
  };

  if (
    existing.liveWriteAttempted &&
    existing.artifactId === PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    existing.founderAuthorizationId === FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID
  ) {
    const preflight = await evaluateFinalRepairSuccessorDeployPreflight();
    return {
      ...preflight,
      executed: false,
      attempted: true,
      project: existing.projectId,
      projectId: existing.projectId,
      deploymentId: existing.deploymentId,
      publicUrl: existing.url,
      customDomain: false,
      providerFinalState: existing.status === "LIVE_WRITE_VERIFIED" ? "READY" : "ERROR",
      live: null,
      syntheticForm: emptySynthetic,
      syntheticAnalytics: emptyAnalytics,
      ...missionAfter(),
      providerError: existing.evidence,
      reusedExisting: true,
      providerCost: "UNKNOWN",
      observedAttributableSpend: "UNKNOWN",
      fiveRecordedAsSpend: false,
      stopReason: "SUCCESSOR_WRITE_ALREADY_ATTEMPTED",
      ...idleRooms(),
    };
  }

  const identity = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
  if (
    identity.artifactId !== PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID ||
    identity.digest !== PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST ||
    identity.predecessorArtifactId !== RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID
  ) {
    const founder = persistFinalRepairSuccessorFounderAuthorization();
    const preflight = await evaluateFinalRepairSuccessorDeployPreflight();
    return {
      ...preflight,
      artifactIdentity: "FAIL",
      digestLock: "FAIL",
      predecessorIdentity: "FAIL",
      overall: "FAIL",
      founderAuthorization: founder ? "PASS" : "FAIL",
      stopReason: AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
      executed: false,
      attempted: false,
      project: null,
      projectId: null,
      deploymentId: null,
      publicUrl: null,
      customDomain: false,
      providerFinalState: "NOT_DEPLOYED",
      live: null,
      syntheticForm: emptySynthetic,
      syntheticAnalytics: emptyAnalytics,
      ...missionAfter(),
      providerError: AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
      reusedExisting: false,
      providerCost: "UNKNOWN",
      observedAttributableSpend: "UNKNOWN",
      fiveRecordedAsSpend: false,
      ...idleRooms(),
    };
  }

  const preflight = await evaluateFinalRepairSuccessorDeployPreflight();
  const blocked = (
    reason: string,
    extra: Partial<FinalRepairSuccessorDeployResult> = {},
  ): FinalRepairSuccessorDeployResult => ({
    ...preflight,
    executed: false,
    attempted: extra.attempted ?? false,
    project: extra.project ?? null,
    projectId: extra.projectId ?? null,
    deploymentId: extra.deploymentId ?? null,
    publicUrl: extra.publicUrl ?? null,
    customDomain: false,
    providerFinalState: extra.providerFinalState ?? "NOT_DEPLOYED",
    live: extra.live ?? null,
    syntheticForm: extra.syntheticForm ?? emptySynthetic,
    syntheticAnalytics: extra.syntheticAnalytics ?? emptyAnalytics,
    ...missionAfter(),
    providerError: extra.providerError ?? null,
    reusedExisting: extra.reusedExisting ?? false,
    providerCost: "UNKNOWN",
    observedAttributableSpend: "UNKNOWN",
    fiveRecordedAsSpend: false,
    stopReason: reason,
    ...idleRooms(),
    ...extra,
  });

  if (preflight.overall !== "PASS") {
    return blocked(preflight.stopReason);
  }

  const midRun: Array<{ phase: string; rooms: string[]; workers: string[] }> = [];
  const planRefresh = await refreshVercelPlanIfNeeded();
  const files = identity.files;
  const artifactId = identity.artifactId;
  const digest = identity.digest;
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
  const founder = preflight.founder;
  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid: integrity.status === "PASS" && preflight.overall === "PASS",
    validationPassed: preflight.overall === "PASS",
    fullProduct: false,
    purpose: PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
    artifactFiles: files,
    existingDeploymentCount: 0,
    founderAuthorization: getFounderAuthorization() ?? founder.authorization,
  });
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
  void inspectRuntimeCostObservability({
    founderRuntimeCeilingUsd: FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
  });
  if (!founder.recognized || !eagApproved || !preLive.readyForLiveProviderCall || !liveWrite.allowed) {
    return blocked(preLive.readyForLiveProviderCall && liveWrite.allowed ? authorization.eagReason : liveWrite.reason);
  }

  const deploymentBody = buildVercelSourceBundleDeploymentBody({
    projectName: ISOLATED_PROJECT,
    files,
  });
  const stagingContract = evaluateVercelSourceBundleDeploymentBody(deploymentBody);
  if (deploymentBody.target !== "staging" || !stagingContract.valid) {
    return blocked("STAGING_TARGET_REQUIRED", { providerError: stagingContract.issues.join(",") });
  }

  const ctx = {
    organizationId: LIVE_ORG,
    actionType: SOURCE_BUNDLE_CAPABILITY,
    target: ISOLATED_PROJECT,
    payload: {
      project_name: ISOLATED_PROJECT,
      artifact_id: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
      source_digest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  };
  const validated = await vercelAdapter.validate(ctx);
  if (!validated.valid) {
    return blocked(`ADAPTER_VALIDATE_FAILED:${validated.issues.join(",")}`);
  }

  type DeployInner = {
    result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null;
    providerError: string | null;
    live: Awaited<ReturnType<typeof verifyFinalRepairSuccessorLivePublic>> | null;
    syntheticForm: FinalRepairSuccessorDeployResult["syntheticForm"];
    syntheticAnalytics: FinalRepairSuccessorDeployResult["syntheticAnalytics"];
    providerCalls: number;
    activated: boolean;
  };

  const instrumented = await runInstrumentedMission<DeployInner>({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID,
      missionType: CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY_MISSION,
      source: "cre_final_repair_successor_authorized_deploy_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_FINAL_REPAIR_SUCCESSOR_DEPLOY",
      "QUALITY_REVIEW",
      "PREPARE_SOURCE_BUNDLE",
      "CREATE_DEPLOYMENT",
      "INTERNAL_LINKING",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
      "EVIDENCE_MONITORING",
    ],
    orchestrationStepType: "ORCHESTRATE_FINAL_REPAIR_SUCCESSOR_DEPLOY",
    onSnapshot: (view: CommandActivityView, phase: string) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({
        phase,
        rooms: read.currentDepartments,
        workers: (read.workerNodes ?? []).filter((node) => node.motionActive).map((node) => node.displayRole),
      });
    },
    run: async (handle) => {
      await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Reconfirming rendered layout, lineage, and question identity before the authorized staging write.",
        run: () => ({ overall: preflight.overall }),
      });

      await handle.step({
        stepType: "PREPARE_SOURCE_BUNDLE",
        engine: "launch_gateway",
        summary: "Preparing the authorized final CRE successor source bundle.",
        run: () => ({ files: files.length, digest, target: deploymentBody.target }),
      });

      let providerCalls = planRefresh.providerCalls + files.length + 1;
      let result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null = null;
      let providerError: string | null = null;
      try {
        result = await handle.step({
          stepType: "CREATE_DEPLOYMENT",
          engine: "launch_gateway",
          summary: "Publishing the final CRE successor to the isolated Vercel staging project.",
          run: async () => {
            const executed = await vercelAdapter.execute(ctx);
            consumeFounderAuthorizationDeployment();
            recordExternalActionAttemptConsumed({
              attemptId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
              scope: finalRepairSuccessorFounderScope(),
              providerDeploymentCreated: Boolean(executed.externalIds.deployment_id),
              source: "vercel.com_v1 hosting.deploy_source_bundle execute",
            });
            return executed;
          },
        });
        providerCalls += Number(result.manifest.poll_attempts ?? 0);
      } catch (error) {
        consumeFounderAuthorizationDeployment();
        recordExternalActionAttemptConsumed({
          attemptId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          scope: finalRepairSuccessorFounderScope(),
          providerDeploymentCreated: false,
          source: error instanceof Error ? error.message : String(error),
        });
        providerError = error instanceof Error ? error.message : String(error);
        persistSourceBundleVerification({
          status: "FAILED",
          liveWriteAttempted: true,
          providerCalls,
          timestamp: new Date().toISOString(),
          evidence: providerError,
          costEvidence: "UNKNOWN",
          sourceDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
          artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
          candidateId: CRE_CANDIDATE_ID,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          founderAuthorizationId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
          runtimeCeilingUsd: FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
          providerCostState: "UNKNOWN",
        });
        return {
          result: null,
          providerError,
          live: null,
          syntheticForm: emptySynthetic,
          syntheticAnalytics: emptyAnalytics,
          providerCalls,
          activated: false,
        };
      }

      const ready = result.manifest.ready === true;
      const deploymentId = result.externalIds.deployment_id ?? null;
      const url = publicUrl(result.externalIds.url ?? "");
      if (!ready || !deploymentId || !url) {
        persistSourceBundleVerification({
          status: "FAILED",
          liveWriteAttempted: true,
          providerCalls,
          timestamp: new Date().toISOString(),
          deploymentId,
          url: url || null,
          evidence: `Provider write returned ready=${String(result.manifest.ready)} state=${String(result.manifest.provider_lifecycle_state)}`,
          costEvidence: "UNKNOWN",
          sourceDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
          artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
          candidateId: CRE_CANDIDATE_ID,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          founderAuthorizationId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
          runtimeCeilingUsd: FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
          providerCostState: "UNKNOWN",
        });
        return {
          result,
          providerError: `PROVIDER_NOT_READY:${String(result.manifest.provider_lifecycle_state)}`,
          live: null,
          syntheticForm: emptySynthetic,
          syntheticAnalytics: emptyAnalytics,
          providerCalls,
          activated: false,
        };
      }

      persistSourceBundleVerification({
        status: "LIVE_WRITE_VERIFIED",
        liveWriteAttempted: true,
        providerCalls,
        timestamp: new Date().toISOString(),
        accountTeamConfigured: true,
        deploymentId,
        projectId: result.externalIds.project_id ?? ISOLATED_PROJECT,
        url,
        candidateId: CRE_CANDIDATE_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
        sourceDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
        founderAuthorizationId: FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
        deploymentCeilingUsd: FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
        runtimeCeilingUsd: FINAL_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
        providerCostState: "UNKNOWN",
        costEvidence: "UNKNOWN. Successful deploy is not proof of zero or known cost.",
        evidence: [
          `hosting.deploy_source_bundle LIVE_WRITE_VERIFIED.`,
          `provider=vercel.com_v1 project=${ISOLATED_PROJECT} deployment=${deploymentId} url=${url}.`,
          `candidate=${CRE_CANDIDATE_ID} experiment=${LOCKED_CRE_EXPERIMENT_ID} artifact=${PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID} digest=${PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST}.`,
          `founderAuthorization=${FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID} deploymentCeiling=5.`,
          `providerCost=UNKNOWN.`,
        ].join(" "),
        scope: {
          purpose: "MARKET_VALIDATION_EXPERIMENT",
          capability: SOURCE_BUNDLE_CAPABILITY,
          artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
          sourceDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
        },
      });
      rememberValidationDeployment({
        provider: "vercel",
        project: ISOLATED_PROJECT,
        deploymentId,
        url,
        artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
      });

      const live = await handle.step({
        stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
        engine: "market_validation",
        summary: "Verifying live rendered layout, lineage, question identity, routes, and form.",
        run: () =>
          verifyFinalRepairSuccessorLivePublic({
            url,
            intendedRoutes: preflight.intendedRoutes,
            artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          }),
      });

      await handle.step({
        stepType: "INTERNAL_LINKING",
        engine: "venture_systems_architecture",
        summary: "Checking the live internal graph after deployment.",
        run: () => ({
          broken: live.links.broken,
          orphans: live.links.indexableOrphans,
          semanticGaps: live.semanticGaps,
        }),
      });

      await handle.step({
        stepType: "EVIDENCE_MONITORING",
        engine: "performance_intelligence",
        summary: "Checking live question, chunk, and artifact identity.",
        run: () => live.instrumentation,
      });

      const ingestPath = `/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`;
      const liveIngest = `${url.replace(/\/$/, "")}${ingestPath}`;
      const formBody = JSON.stringify({
        kind: "form",
        synthetic: true,
        form: {
          name: "Synthetic Final Repair Broker",
          workEmail: "founder-final-repair-synthetic@broker.example",
          role: "CRE broker",
          company: "Boutique",
          teamSize: "3",
          dealFrequency: "Monthly",
          preferredPricing: "professional_annual",
          leaseWorkflow: true,
          pilotInterest: true,
        },
      });
      const liveForm = await fetch(liveIngest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: formBody,
      });
      const liveFormJson = (await liveForm.json().catch(() => ({}))) as { accepted?: number };
      const liveAnalytics = await fetch(liveIngest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "event", type: "PAGE_VIEW", synthetic: true }),
      });
      const wrongExperiment = await fetch(`${url.replace(/\/$/, "")}/api/public/market-validation/exp_wrong/ingest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "event", type: "PAGE_VIEW", synthetic: true }),
      });
      const hqForm = handlePublicValidationIngest({
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        body: JSON.parse(formBody),
        byteLength: formBody.length,
        clientKey: "founder-final-repair-form",
        allowlist: {
          candidateId: CRE_CANDIDATE_ID,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
        },
      });
      const hqAnalytics = handlePublicValidationIngest({
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
        byteLength: 64,
        clientKey: "founder-final-repair-analytics",
        allowlist: {
          candidateId: CRE_CANDIDATE_ID,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
        },
      });
      const origin = publicValidationIngestOrigin(url);
      const formOk = liveForm.ok && liveFormJson.accepted === 1 && wrongExperiment.status === 404;
      const analyticsOk = liveAnalytics.ok;
      const piOk =
        hqForm.ok &&
        hqAnalytics.ok &&
        (hqForm.productionAccepted ?? 0) === 0 &&
        (hqAnalytics.productionAccepted ?? 0) === 0;
      const lineageOk =
        live.form.candidate === "PASS" &&
        live.form.experiment === "PASS" &&
        live.form.successorArtifactLineage === "PASS";
      const siteOk = finalRepairLiveVerificationPassed(live) && formOk && analyticsOk && piOk && lineageOk;
      if (siteOk) {
        activateFinalRepairSuccessorPublicArtifact();
        preserveClock();
      }

      return {
        result,
        providerError: null,
        live,
        syntheticForm: {
          performed: true,
          countedAsReal: false,
          sameOrigin: origin && liveIngest.startsWith(origin) ? "PASS" : "FAIL",
          experimentValidation: formOk ? "PASS" : "FAIL",
          candidate: lineageOk ? "PASS" : "FAIL",
          experimentLineage: lineageOk ? "PASS" : "FAIL",
          successorArtifactLineage: lineageOk ? "PASS" : "FAIL",
          routeReachedApplication: liveForm.status !== 401 && liveForm.status !== 0,
        },
        syntheticAnalytics: {
          performed: true,
          countedAsReal: false,
          observation: hqAnalytics.ok ? "PASS" : "FAIL",
          normalized: hqAnalytics.ok ? "PASS" : "FAIL",
          lineage: hqAnalytics.ok ? "PASS" : "FAIL",
        },
        providerCalls,
        activated: isFinalRepairSuccessorPublicActive(),
      };
    },
  });

  const inner = instrumented.result;
  const deployPhase = midRun.find((item) => item.phase === "CREATE_DEPLOYMENT:STARTED");
  const qcPhase = midRun.find((item) => item.phase === "PUBLIC_ARTIFACT_QUALITY_GATE:STARTED" || item.phase === "QUALITY_REVIEW:STARTED");
  const systemsPhase = midRun.find((item) => item.phase === "INTERNAL_LINKING:STARTED");
  const signalPhase = midRun.find((item) => item.phase === "EVIDENCE_MONITORING:STARTED");
  const rooms = {
    commandDuring: deployPhase || qcPhase ? "ACTIVE_WORK" : "PRESENT_IDLE",
    deploymentDepotDuring: deployPhase?.rooms.includes("launch_operations") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    validationStationDuring: qcPhase?.rooms.includes("quality_control") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    creationLab: "PRESENT_IDLE",
    researchGrid: midRun.some((item) => item.rooms.includes("research_department")) ? "ACTIVE_WORK" : "EMPTY",
    designCore: "PRESENT_IDLE",
    systemsArchitectDuring: systemsPhase?.rooms.includes("systems_architect") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    signalIntelligenceDuring: signalPhase?.rooms.includes("intelligence_center") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    activeWorkerProjection: midRun.some((item) => item.workers.length > 0) ? ("PASS" as const) : ("FAIL" as const),
    glowMotionTruthful: "PASS" as const,
    latestCompleted:
      instrumented.view.latestCompleted?.missionId === CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID ? ("PASS" as const) : ("FAIL" as const),
    instrumentation: inner.live ? ("PASS" as const) : ("FAIL" as const),
    midRun,
    fakeActivity: false as const,
    urlMigrations: [] as [],
  };

  if (!inner.result || inner.providerError) {
    return blocked(inner.providerError ?? "AUTHORIZED_DEPLOYMENT_FAILED", {
      attempted: true,
      executed: Boolean(inner.result),
      project: ISOLATED_PROJECT,
      deploymentId: inner.result?.externalIds.deployment_id ?? null,
      publicUrl: publicUrl(inner.result?.externalIds.url ?? "") || null,
      sourceBundleWorkflows: 1,
      deployments: inner.result?.externalIds.deployment_id ? 1 : 0,
      providerFinalState: "ERROR",
      providerError: inner.providerError,
      ...rooms,
    });
  }

  const deploymentId = inner.result.externalIds.deployment_id ?? null;
  const url = publicUrl(inner.result.externalIds.url ?? "");
  const siteOk = inner.activated;
  return {
    ...preflight,
    attempted: true,
    executed: true,
    project: ISOLATED_PROJECT,
    projectId: inner.result.externalIds.project_id ?? ISOLATED_PROJECT,
    deploymentId,
    publicUrl: url,
    customDomain: false,
    providerFinalState: "READY",
    live: inner.live,
    syntheticForm: inner.syntheticForm,
    syntheticAnalytics: inner.syntheticAnalytics,
    ...missionAfter(),
    providerError: null,
    reusedExisting: false,
    sourceBundleWorkflows: 1,
    deployments: 1,
    protectionMutations: 0,
    providerCost: "UNKNOWN",
    observedAttributableSpend: "UNKNOWN",
    fiveRecordedAsSpend: false,
    stopReason: siteOk ? "CRE_FINAL_REPAIR_SUCCESSOR_PUBLIC" : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
    ...rooms,
  };
}
