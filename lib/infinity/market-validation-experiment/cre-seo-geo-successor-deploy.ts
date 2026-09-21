import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { attachCommandActivity, runInstrumentedMission, type CommandActivityView } from "@/lib/infinity/mission-activity";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "@/lib/infinity/venture-website-architecture/constants";
import { reconstructCreSeoGeoDigitalRealEstateSuccessor } from "@/lib/infinity/venture-website-architecture/cre-digital-real-estate-successor";
import { seoGeoPageRouteManifest } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { evaluatePublicAuthorityPublishability } from "@/lib/infinity/venture-website-architecture/public-authority-publishability-gate";
import {
  evaluateProviderEquivalentDeploymentEligibility,
  getFrozenProviderEquivalentGate,
  runProviderEquivalentArtifactBuildGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import {
  runServedProductionRenderedLayoutGate,
  runServedProductionRenderedLayoutGateAgainstOrigin,
  servedProductionLayoutPasses,
} from "@/lib/infinity/public-venture-design/rendered-layout/served-production";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH,
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
  validationProjectName,
} from "./constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activateSeoGeoDigitalRealEstateSuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
  getCanonicalActivePublicValidationState,
} from "./active-public-artifact";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import {
  EXPECTED_SEO_GEO_PAGE_ROUTES,
  SEO_GEO_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  SEO_GEO_SUCCESSOR_RUNTIME_CEILING_USD,
  evaluateSeoGeoSuccessorFounderAuthorization,
  persistSeoGeoSuccessorFounderAuthorization,
  seoGeoSuccessorFounderScope,
} from "./cre-seo-geo-successor-authorization";
import { seoGeoLiveVerificationPassed, verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
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
import {
  evaluateSourceBundleLiveWriteGate,
  persistSourceBundleVerification,
} from "./source-bundle-verification";

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);
export const CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_V1 =
  "CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_V1" as const;
export const CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_MISSION_ID =
  "msn_cre_premium_authority_surface_governed_deploy_v1" as const;

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
      missionId: CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_MISSION_ID,
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

export async function executeSeoGeoDigitalRealEstateSuccessorAuthorizedDeploy() {
  loadEnvLocal();
  preserveClock();
  persistSeoGeoSuccessorFounderAuthorization();
  const reconstructed = await reconstructCreSeoGeoDigitalRealEstateSuccessor();
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const files = reconstructed.files;
  const identity = artifactId === SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  const pageRoutes = seoGeoPageRouteManifest().pageRoutes;
  const publishability = evaluatePublicAuthorityPublishability(files);
  const founder = evaluateSeoGeoSuccessorFounderAuthorization();
  const blocked = (stopReason: string, extra: Record<string, unknown> = {}) => ({
    artifactIdentity: identity,
    digestLock,
    routes: pageRoutes.length,
    ready: publishability.ready,
    executed: false,
    attempted: false,
    authorizationConsumed: false,
    project: ISOLATED_PROJECT,
    deploymentId: null as string | null,
    publicUrl: null as string | null,
    providerFinalState: "NOT_DEPLOYED" as const,
    providerError: null as string | null,
    live: null,
    geometry: null,
    activated: false,
    activationCount: 0,
    activeArtifact: getActivePublicValidationArtifactId(),
    activeDeployment: getActivePublicValidationDeploymentId(),
    activeUrl: getActivePublicValidationUrl(),
    canonicalReadback: getCanonicalActivePublicValidationState(),
    predecessorArtifact: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
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
    latestCompleted: CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_V1,
    publiclyLaunched: false,
    ...extra,
  });

  if (identity === "FAIL" || digestLock === "FAIL") {
    return blocked(AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH);
  }
  if (publishability.overall !== "PASS" || publishability.ready !== PREMIUM_AUTHORITY_VALIDATION_READY) {
    return blocked("PREDEPLOY_QUALITY_FAILED");
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
  const served = await runServedProductionRenderedLayoutGate({
    artifactId,
    files,
    isolatedRoot: gate.isolatedRoot,
    routes: pageRoutes,
    viewports: ["desktop", "mobile"],
    freeze: true,
  });
  if (!servedProductionLayoutPasses(served)) {
    return blocked("PREDEPLOY_GEOMETRY_FAILED", {
      geometry: {
        status: served.status,
        overflow: served.horizontalOverflow,
        footer: served.footerPadding,
        desktop: served.pages.filter((page) => page.viewportName === "desktop").every((page) => page.failReasons.length === 0),
        mobile: served.pages.filter((page) => page.viewportName === "mobile").every((page) => page.failReasons.length === 0),
      },
    });
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
    expectedArtifactId: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
  });
  if (integrity.status !== "PASS") return blocked("SOURCE_INTEGRITY_FAILED");

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
      artifact_id: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
      source_digest: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  };
  const validated = await vercelAdapter.validate(ctx);
  if (!validated.valid) return blocked(`ADAPTER_VALIDATE_FAILED:${validated.issues.join(",")}`);

  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_MISSION_ID,
      missionType: CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_V1,
      source: "cre_premium_authority_surface_governed_deployment_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_AUTHORITY_SURFACE_DEPLOY",
      "QUALITY_REVIEW",
      "PREPARE_SOURCE_BUNDLE",
      "CREATE_DEPLOYMENT",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
    ],
    orchestrationStepType: "ORCHESTRATE_AUTHORITY_SURFACE_DEPLOY",
    onSnapshot: (view: CommandActivityView, phase: string) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Reconfirming exact artifact identity, publishability, and served geometry.",
        run: () => ({ identity, digestLock, ready: publishability.ready, served: served.status }),
      });
      await handle.step({
        stepType: "PREPARE_SOURCE_BUNDLE",
        engine: "launch_gateway",
        summary: "Handing the frozen premium authority successor bundle to the adapter.",
        run: () => ({ files: files.length, digest, frozen: Boolean(getFrozenProviderEquivalentGate()?.frozen) }),
      });
      let result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null = null;
      let providerError: string | null = null;
      try {
        result = await handle.step({
          stepType: "CREATE_DEPLOYMENT",
          engine: "launch_gateway",
          summary: "Publishing art_ba6e91dc5e569f6c13a9 to the isolated Vercel staging project.",
          run: async () => {
            const executed = await vercelAdapter.execute(ctx);
            consumeFounderAuthorizationDeployment();
            recordExternalActionAttemptConsumed({
              attemptId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
              scope: seoGeoSuccessorFounderScope(),
              providerDeploymentCreated: Boolean(executed.externalIds.deployment_id),
              source: "vercel.com_v1 hosting.deploy_source_bundle execute",
            });
            return executed;
          },
        });
      } catch (error) {
        consumeFounderAuthorizationDeployment();
        recordExternalActionAttemptConsumed({
          attemptId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          scope: seoGeoSuccessorFounderScope(),
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
          founderAuthorizationId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: SEO_GEO_SUCCESSOR_DEPLOYMENT_CEILING_USD,
          runtimeCeilingUsd: SEO_GEO_SUCCESSOR_RUNTIME_CEILING_USD,
          providerCostState: "UNKNOWN",
        });
        return { result: null, providerError, live: null, liveGeometry: null, activated: false };
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
        founderAuthorizationId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
        deploymentCeilingUsd: SEO_GEO_SUCCESSOR_DEPLOYMENT_CEILING_USD,
        runtimeCeilingUsd: SEO_GEO_SUCCESSOR_RUNTIME_CEILING_USD,
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
          liveGeometry: null,
          activated: false,
        };
      }

      const live = await handle.step({
        stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
        engine: "market_validation",
        summary: "Verifying live routes, SEO/GEO, footer, and served browser geometry.",
        run: async () => {
          const verified = await verifySeoGeoSuccessorLivePublic({
            url,
            intendedRoutes: [...EXPECTED_SEO_GEO_PAGE_ROUTES],
            artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          });
          const liveGeometry = await runServedProductionRenderedLayoutGateAgainstOrigin({
            artifactId,
            digest,
            origin: url,
            files,
            routes: pageRoutes,
            viewports: ["desktop", "mobile"],
            freeze: false,
          });
          return { verified, liveGeometry };
        },
      });
      preserveClock();
      let activated = false;
      if (seoGeoLiveVerificationPassed(live.verified) && servedProductionLayoutPasses(live.liveGeometry)) {
        activateSeoGeoDigitalRealEstateSuccessorPublicArtifact({
          artifactId,
          digest,
          deploymentId,
          url,
        });
        activated = true;
      }
      return { result, providerError: null, live: live.verified, liveGeometry: live.liveGeometry, activated };
    },
  });

  const inner = instrumented.result;
  const deployPhase = midRun.find((item) => item.phase.includes("CREATE_DEPLOYMENT"));
  const qcPhase = midRun.find((item) => item.phase.includes("QUALITY_REVIEW") || item.phase.includes("PUBLIC_ARTIFACT_QUALITY_GATE"));
  preserveClock();
  void evaluateSecretSafety(files);
  return {
    artifactIdentity: identity,
    digestLock,
    routes: pageRoutes.length,
    ready: publishability.ready,
    executed: Boolean(inner.result?.externalIds.deployment_id),
    attempted: true,
    authorizationConsumed: true,
    project: ISOLATED_PROJECT,
    deploymentId: inner.result?.externalIds.deployment_id ?? null,
    publicUrl: publicUrl(inner.result?.externalIds.url ?? ""),
    providerFinalState: inner.result?.manifest.ready === true ? ("READY" as const) : inner.providerError ? ("ERROR" as const) : ("NOT_DEPLOYED" as const),
    providerError: inner.providerError,
    live: inner.live,
    geometry: inner.liveGeometry,
    activated: inner.activated === true,
    activationCount: inner.activated === true ? 1 : 0,
    activeArtifact: getActivePublicValidationArtifactId(),
    activeDeployment: getActivePublicValidationDeploymentId(),
    activeUrl: getActivePublicValidationUrl(),
    canonicalReadback: getCanonicalActivePublicValidationState(),
    predecessorArtifact: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
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
    latestCompleted: CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_V1,
    publiclyLaunched: false,
    missionId: instrumented.view.latestCompleted?.missionId ?? CRE_PREMIUM_AUTHORITY_SURFACE_GOVERNED_DEPLOYMENT_MISSION_ID,
  };
}
