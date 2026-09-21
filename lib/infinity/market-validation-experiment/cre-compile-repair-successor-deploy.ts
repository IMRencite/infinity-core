import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { persistFailedFinalRepairSuccessorMissionHistory } from "@/lib/infinity/mission-activity/persist-failed-cre-final-repair-mission";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-provider-equivalent-compile-repair-successor";
import { auditSuccessorAuthorityArtifact } from "@/lib/infinity/venture-website-architecture/answer-authority/successor-audit";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "@/lib/infinity/venture-website-architecture/constants";
import { inspectRenderedLineageAndQuestionIdentity } from "@/lib/infinity/venture-website-architecture/public-lineage-question-id";
import {
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import {
  evaluateHandoffParity,
  evaluateProviderEquivalentDeploymentEligibility,
  getFrozenProviderEquivalentGate,
  runProviderEquivalentArtifactBuildGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  getActivePublicValidationArtifactId,
} from "./active-public-artifact";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  validationProjectName,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { evaluateEconomicEligibility, refreshVercelPlanIfNeeded } from "./economic-read-live";
import { rememberValidationDeployment } from "./execute";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { consumeFounderAuthorizationDeployment, getFounderAuthorization } from "./founder-authorization";
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
import { evaluateSecretSafety } from "./secret-safety";
import { evaluateFormBackendReadiness } from "./ingest";
import {
  COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  COMPILE_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
  EXPECTED_COMPILE_REPAIR_PUBLIC_ROUTES,
  compileRepairSuccessorFounderScope,
  evaluateCompileRepairSuccessorFounderAuthorization,
  persistCompileRepairSuccessorFounderAuthorization,
} from "./cre-compile-repair-successor-authorization";
import {
  finalRepairLiveVerificationPassed,
  verifyFinalRepairSuccessorLivePublic,
} from "./cre-final-repair-successor-live-verify";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);
export const CRE_COMPILE_REPAIR_SUCCESSOR_DEPLOY_MISSION = "CRE_GOVERNED_COMPILE_REPAIR_SUCCESSOR_DEPLOY" as const;
export const CRE_COMPILE_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID = "msn_cre_compile_repair_successor_deploy_v1" as const;

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
      missionId: CRE_COMPILE_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID,
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

export type CompileRepairSuccessorDeployResult = {
  artifactIdentity: "PASS" | "FAIL";
  digestLock: "PASS" | "FAIL";
  frozen: "PASS" | "FAIL";
  providerEquivalentGate: "PASS" | "FAIL";
  exactBuild: "PASS" | "FAIL";
  handoffParity: "PASS" | "FAIL";
  fileHashes: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  questionIdentity: "PASS" | "FAIL";
  renderedLayout: "PASS" | "FAIL";
  authority: "PASS" | "FAIL";
  secretScan: "PASS" | "FAIL";
  founderAuthorization: "PASS" | "FAIL";
  overall: "PASS" | "FAIL";
  executed: boolean;
  attempted: boolean;
  authorizationConsumed: boolean;
  project: string | null;
  projectId: string | null;
  deploymentId: string | null;
  publicUrl: string | null;
  providerFinalState: "READY" | "ERROR" | "CANCELED" | "PENDING_EXTERNAL" | "NOT_DEPLOYED";
  live: Awaited<ReturnType<typeof verifyFinalRepairSuccessorLivePublic>> | null;
  readyForActivation: boolean;
  activated: false;
  deploymentStatus: "DEPLOYED_SUCCESSOR_CANDIDATE" | "NOT_DEPLOYED" | "FAILED";
  experimentState: string;
  evidenceStart: string;
  deadline: string;
  counts: ReturnType<typeof inspectRealMarketEvidence>["counts"];
  activeArtifactBefore: string;
  activeArtifactAfter: string;
  predecessorLineage: "PASS";
  providerError: string | null;
  providerCost: "UNKNOWN";
  fiveRecordedAsSpend: false;
  sourceBundleWorkflows: number;
  deployments: number;
  protectionMutations: 0;
  retries: 0;
  syntheticEvidenceInserted: false;
  stopReason: string;
  commandDuring: string;
  deploymentDepotDuring: string;
  validationStationDuring: string;
  creationLab: string;
  systemsArchitectDuring: string;
  latestCompleted: "PASS" | "FAIL";
  midRun: Array<{ phase: string; rooms: string[]; workers: string[] }>;
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  digest: string;
};

function missionAfter() {
  const evidence = inspectRealMarketEvidence();
  return {
    experimentState: evidence.experiment.state,
    evidenceStart: inspectExperimentClock().evidenceStart,
    deadline: inspectExperimentClock().deadline,
    counts: evidence.counts,
    activeArtifactBefore: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    activeArtifactAfter: getActivePublicValidationArtifactId(),
    predecessorLineage: "PASS" as const,
    syntheticEvidenceInserted: false as const,
  };
}

function idleRooms() {
  return {
    commandDuring: "PRESENT_IDLE",
    deploymentDepotDuring: "PRESENT_IDLE",
    validationStationDuring: "PRESENT_IDLE",
    creationLab: "PRESENT_IDLE",
    systemsArchitectDuring: "PRESENT_IDLE",
    latestCompleted: "FAIL" as const,
    midRun: [] as Array<{ phase: string; rooms: string[]; workers: string[] }>,
  };
}

export async function evaluateCompileRepairSuccessorDeployPreflight(): Promise<{
  overall: "PASS" | "FAIL";
  artifactIdentity: "PASS" | "FAIL";
  digestLock: "PASS" | "FAIL";
  frozen: "PASS" | "FAIL";
  providerEquivalentGate: "PASS" | "FAIL";
  exactBuild: "PASS" | "FAIL";
  handoffParity: "PASS" | "FAIL";
  fileHashes: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  questionIdentity: "PASS" | "FAIL";
  renderedLayout: "PASS" | "FAIL";
  authority: "PASS" | "FAIL";
  secretScan: "PASS" | "FAIL";
  founderAuthorization: "PASS" | "FAIL";
  stopReason: string;
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  digest: string;
  founder: ReturnType<typeof evaluateCompileRepairSuccessorFounderAuthorization>;
}> {
  persistCompileRepairSuccessorFounderAuthorization();
  const reconstructed = await reconstructCreProviderEquivalentCompileRepairSuccessor();
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const files = reconstructed.files;
  const founder = evaluateCompileRepairSuccessorFounderAuthorization();
  const identity = artifactId === PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  const predecessor =
    reconstructed.predecessorArtifactId === PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    reconstructed.predecessorDigest === PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST
      ? "PASS"
      : "FAIL";
  if (identity === "FAIL" || digestLock === "FAIL" || predecessor === "FAIL") {
    return {
      overall: "FAIL",
      artifactIdentity: identity,
      digestLock,
      frozen: "FAIL",
      providerEquivalentGate: "FAIL",
      exactBuild: "FAIL",
      handoffParity: "FAIL",
      fileHashes: "FAIL",
      candidateLineage: "FAIL",
      questionIdentity: "FAIL",
      renderedLayout: "FAIL",
      authority: "FAIL",
      secretScan: evaluateSecretSafety(files).status,
      founderAuthorization: founder.recognized ? "PASS" : "FAIL",
      stopReason: AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
      files,
      artifactId,
      digest,
      founder,
    };
  }
  const gate = await runProviderEquivalentArtifactBuildGate({
    artifactId,
    files,
    mode: "full",
    keepRoot: false,
    infinityCoreRoot: process.cwd(),
    freeze: true,
  });
  const eligibility = evaluateProviderEquivalentDeploymentEligibility({ artifactId, digest, files });
  const parity = evaluateHandoffParity({ artifactId, digest, files, uploadFiles: files, record: getFrozenProviderEquivalentGate() });
  const lineage = inspectRenderedLineageAndQuestionIdentity({ files, artifactId });
  const layout = auditRenderedLayoutQualityGate(files);
  const audit = await auditSuccessorAuthorityArtifact({
    files,
    architecture: reconstructed.architecture,
    graph: reconstructed.graph,
    artifactId,
    digest,
    predecessorArtifactId: reconstructed.predecessorArtifactId,
    repairReason: reconstructed.repairReason,
  });
  const form = evaluateFormBackendReadiness({ artifactFiles: files, experimentId: LOCKED_CRE_EXPERIMENT_ID });
  const renderedLayout: "PASS" | "FAIL" = renderedLayoutPassesPremiumAuthority(layout) ? "PASS" : "FAIL";
  const candidateLineage: "PASS" | "FAIL" = lineage.candidate.liveVerifiable ? "PASS" : "FAIL";
  const questionIdentity: "PASS" | "FAIL" =
    lineage.questions.missing === 0 && lineage.questions.dataQuestionId === "PASS" ? "PASS" : "FAIL";
  const authority: "PASS" | "FAIL" =
    audit.newClassification === PREMIUM_AUTHORITY_VALIDATION_READY && form.readyForLiveDeploy ? "PASS" : "FAIL";
  const secretScan = evaluateSecretSafety(files).status;
  const founderPass: "PASS" | "FAIL" = founder.recognized ? "PASS" : "FAIL";
  const overall: "PASS" | "FAIL" =
    identity === "PASS" &&
    digestLock === "PASS" &&
    gate.status === "PASS" &&
    gate.frozen &&
    eligibility.status === "PASS" &&
    parity.status === "PASS" &&
    candidateLineage === "PASS" &&
    questionIdentity === "PASS" &&
    renderedLayout === "PASS" &&
    authority === "PASS" &&
    secretScan === "PASS" &&
    founderPass === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    overall,
    artifactIdentity: identity,
    digestLock,
    frozen: gate.frozen ? "PASS" : "FAIL",
    providerEquivalentGate: gate.status,
    exactBuild: gate.typescript === "PASS" && gate.nextBuild === "PASS" ? "PASS" : "FAIL",
    handoffParity: parity.status,
    fileHashes: parity.fileHashesIdentical ? "PASS" : "FAIL",
    candidateLineage,
    questionIdentity,
    renderedLayout,
    authority,
    secretScan,
    founderAuthorization: founderPass,
    stopReason: overall === "PASS" ? "READY_FOR_GOVERNED_WRITE" : eligibility.issues[0] ?? "PRE_WRITE_GATE_FAILED",
    files,
    artifactId,
    digest,
    founder,
  };
}

export async function executeCompileRepairSuccessorAuthorizedDeploy(): Promise<CompileRepairSuccessorDeployResult> {
  loadEnvLocal();
  preserveClock();
  await persistFailedFinalRepairSuccessorMissionHistory();
  persistCompileRepairSuccessorFounderAuthorization();
  const existing = getSourceBundleVerification();
  const baseBlocked = {
    activated: false as const,
    protectionMutations: 0 as const,
    retries: 0 as const,
    providerCost: "UNKNOWN" as const,
    fiveRecordedAsSpend: false as const,
    ...missionAfter(),
    ...idleRooms(),
  };

  if (
    existing.liveWriteAttempted &&
    existing.artifactId === PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    existing.founderAuthorizationId === COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID
  ) {
    return {
      artifactIdentity: "PASS",
      digestLock: "PASS",
      frozen: "FAIL",
      providerEquivalentGate: "FAIL",
      exactBuild: "FAIL",
      handoffParity: "FAIL",
      fileHashes: "FAIL",
      candidateLineage: "FAIL",
      questionIdentity: "FAIL",
      renderedLayout: "FAIL",
      authority: "FAIL",
      secretScan: "FAIL",
      founderAuthorization: "FAIL",
      overall: "FAIL",
      executed: false,
      attempted: true,
      authorizationConsumed: true,
      project: existing.projectId,
      projectId: existing.projectId,
      deploymentId: existing.deploymentId,
      publicUrl: existing.url,
      providerFinalState: existing.status === "LIVE_WRITE_VERIFIED" ? "READY" : "ERROR",
      live: null,
      readyForActivation: false,
      deploymentStatus: "FAILED",
      providerError: "SUCCESSOR_WRITE_ALREADY_ATTEMPTED",
      sourceBundleWorkflows: 1,
      deployments: existing.deploymentId ? 1 : 0,
      stopReason: "SUCCESSOR_WRITE_ALREADY_ATTEMPTED",
      files: [],
      artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
      digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
      ...baseBlocked,
    };
  }

  const preflight = await evaluateCompileRepairSuccessorDeployPreflight();
  const blocked = (
    reason: string,
    extra: Partial<CompileRepairSuccessorDeployResult> = {},
  ): CompileRepairSuccessorDeployResult => ({
    artifactIdentity: preflight.artifactIdentity,
    digestLock: preflight.digestLock,
    frozen: preflight.frozen,
    providerEquivalentGate: preflight.providerEquivalentGate,
    exactBuild: preflight.exactBuild,
    handoffParity: preflight.handoffParity,
    fileHashes: preflight.fileHashes,
    candidateLineage: preflight.candidateLineage,
    questionIdentity: preflight.questionIdentity,
    renderedLayout: preflight.renderedLayout,
    authority: preflight.authority,
    secretScan: preflight.secretScan,
    founderAuthorization: preflight.founderAuthorization,
    overall: "FAIL",
    executed: false,
    attempted: extra.attempted ?? false,
    authorizationConsumed: extra.authorizationConsumed ?? false,
    project: extra.project ?? null,
    projectId: extra.projectId ?? null,
    deploymentId: extra.deploymentId ?? null,
    publicUrl: extra.publicUrl ?? null,
    providerFinalState: extra.providerFinalState ?? "NOT_DEPLOYED",
    live: extra.live ?? null,
    readyForActivation: false,
    deploymentStatus: extra.deploymentStatus ?? "NOT_DEPLOYED",
    providerError: extra.providerError ?? reason,
    sourceBundleWorkflows: extra.sourceBundleWorkflows ?? 0,
    deployments: extra.deployments ?? 0,
    stopReason: reason,
    files: preflight.files,
    artifactId: preflight.artifactId,
    digest: preflight.digest,
    ...baseBlocked,
    ...extra,
  });

  if (preflight.overall !== "PASS") {
    return blocked(preflight.stopReason);
  }

  const files = preflight.files;
  const artifactId = preflight.artifactId;
  const digest = preflight.digest;
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
    expectedArtifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  });
  if (integrity.status !== "PASS") {
    return blocked("SOURCE_INTEGRITY_FAILED");
  }
  const founder = preflight.founder;
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
  void inspectRuntimeCostObservability({
    founderRuntimeCeilingUsd: COMPILE_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
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
      artifact_id: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
      source_digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  };
  const validated = await vercelAdapter.validate(ctx);
  if (!validated.valid) {
    return blocked(`ADAPTER_VALIDATE_FAILED:${validated.issues.join(",")}`);
  }

  const midRun: Array<{ phase: string; rooms: string[]; workers: string[] }> = [];
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_COMPILE_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID,
      missionType: CRE_COMPILE_REPAIR_SUCCESSOR_DEPLOY_MISSION,
      source: "cre_compile_repair_successor_authorized_deploy_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_DEPLOY",
      "QUALITY_REVIEW",
      "PREPARE_SOURCE_BUNDLE",
      "CREATE_DEPLOYMENT",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
    ],
    orchestrationStepType: "ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_DEPLOY",
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
        summary: "Reconfirming frozen provider-equivalent gates immediately before the authorized write.",
        run: () => ({ overall: preflight.overall, frozen: preflight.frozen }),
      });
      await handle.step({
        stepType: "PREPARE_SOURCE_BUNDLE",
        engine: "launch_gateway",
        summary: "Handing the already frozen compile-repair successor bundle to the adapter.",
        run: () => ({ files: files.length, digest, target: deploymentBody.target }),
      });

      let result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null = null;
      let providerError: string | null = null;
      try {
        result = await handle.step({
          stepType: "CREATE_DEPLOYMENT",
          engine: "launch_gateway",
          summary: "Publishing the compile-repair successor to the isolated Vercel staging project.",
          run: async () => {
            const executed = await vercelAdapter.execute(ctx);
            consumeFounderAuthorizationDeployment();
            recordExternalActionAttemptConsumed({
              attemptId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
              scope: compileRepairSuccessorFounderScope(),
              providerDeploymentCreated: Boolean(executed.externalIds.deployment_id),
              source: "vercel.com_v1 hosting.deploy_source_bundle execute",
            });
            return executed;
          },
        });
      } catch (error) {
        consumeFounderAuthorizationDeployment();
        recordExternalActionAttemptConsumed({
          attemptId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          scope: compileRepairSuccessorFounderScope(),
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
          founderAuthorizationId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
          runtimeCeilingUsd: COMPILE_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
          providerCostState: "UNKNOWN",
        });
        return { result: null, providerError, live: null };
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
        founderAuthorizationId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
        deploymentCeilingUsd: COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
        runtimeCeilingUsd: COMPILE_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
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
        };
      }

      const live = await handle.step({
        stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
        engine: "market_validation",
        summary: "Verifying live routes, lineage, question identity, and rendered layout. No form submit.",
        run: () =>
          verifyFinalRepairSuccessorLivePublic({
            url,
            intendedRoutes: [...EXPECTED_COMPILE_REPAIR_PUBLIC_ROUTES],
            artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          }),
      });
      preserveClock();
      return { result, providerError: null, live };
    },
  });

  const inner = instrumented.result;
  const deployPhase = midRun.find((item) => item.phase.includes("CREATE_DEPLOYMENT"));
  const qcPhase = midRun.find((item) => item.phase.includes("QUALITY_REVIEW") || item.phase.includes("PUBLIC_ARTIFACT_QUALITY_GATE"));
  const rooms = {
    commandDuring: midRun.some((item) => item.rooms.includes("executive_office")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    deploymentDepotDuring: deployPhase?.rooms.includes("launch_operations") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    validationStationDuring: qcPhase?.rooms.includes("quality_control") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    creationLab: "PRESENT_IDLE",
    systemsArchitectDuring: "PRESENT_IDLE",
    latestCompleted:
      instrumented.view.latestCompleted?.missionId === CRE_COMPILE_REPAIR_SUCCESSOR_DEPLOY_MISSION_ID
        ? ("PASS" as const)
        : ("FAIL" as const),
    midRun,
  };

  const authorizationConsumed = Boolean(getFounderAuthorization()?.executionsConsumed);
  if (!inner.result || inner.providerError) {
    const pending = inner.providerError === "PENDING_EXTERNAL";
    return blocked(inner.providerError ?? "AUTHORIZED_DEPLOYMENT_FAILED", {
      attempted: true,
      executed: Boolean(inner.result),
      authorizationConsumed,
      project: ISOLATED_PROJECT,
      projectId: ISOLATED_PROJECT,
      deploymentId: inner.result?.externalIds.deployment_id ?? null,
      publicUrl: publicUrl(inner.result?.externalIds.url ?? "") || null,
      sourceBundleWorkflows: 1,
      deployments: inner.result?.externalIds.deployment_id ? 1 : 0,
      providerFinalState: pending ? "PENDING_EXTERNAL" : "ERROR",
      providerError: inner.providerError,
      deploymentStatus: "FAILED",
      live: inner.live,
      ...rooms,
    });
  }

  const deploymentId = inner.result.externalIds.deployment_id ?? null;
  const url = publicUrl(inner.result.externalIds.url ?? "");
  const siteOk = inner.live ? finalRepairLiveVerificationPassed(inner.live) : false;
  preserveClock();
  return {
    artifactIdentity: preflight.artifactIdentity,
    digestLock: preflight.digestLock,
    frozen: preflight.frozen,
    providerEquivalentGate: preflight.providerEquivalentGate,
    exactBuild: preflight.exactBuild,
    handoffParity: preflight.handoffParity,
    fileHashes: preflight.fileHashes,
    candidateLineage: preflight.candidateLineage,
    questionIdentity: preflight.questionIdentity,
    renderedLayout: preflight.renderedLayout,
    authority: preflight.authority,
    secretScan: preflight.secretScan,
    founderAuthorization: preflight.founderAuthorization,
    overall: siteOk ? "PASS" : "FAIL",
    executed: true,
    attempted: true,
    authorizationConsumed,
    project: ISOLATED_PROJECT,
    projectId: ISOLATED_PROJECT,
    deploymentId,
    publicUrl: url,
    providerFinalState: "READY",
    live: inner.live,
    readyForActivation: siteOk,
    activated: false,
    deploymentStatus: "DEPLOYED_SUCCESSOR_CANDIDATE",
    providerError: null,
    sourceBundleWorkflows: 1,
    deployments: 1,
    protectionMutations: 0,
    retries: 0,
    providerCost: "UNKNOWN",
    fiveRecordedAsSpend: false,
    stopReason: siteOk ? "DEPLOYED_SUCCESSOR_CANDIDATE_READY_FOR_ACTIVATION" : "LIVE_VERIFICATION_INCOMPLETE",
    files,
    artifactId,
    digest,
    ...missionAfter(),
    ...rooms,
  };
}
