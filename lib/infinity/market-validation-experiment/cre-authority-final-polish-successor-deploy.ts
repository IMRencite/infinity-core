import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { attachCommandActivity, runInstrumentedMission, type CommandActivityView } from "@/lib/infinity/mission-activity";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "@/lib/infinity/venture-website-architecture/constants";
import { reconstructCreAuthorityFinalPolishSuccessor } from "@/lib/infinity/venture-website-architecture/cre-authority-final-polish-successor";
import { evaluateExpandedPublicAuthorityPublishability } from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
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
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
  validationProjectName,
} from "./constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activateAuthorityFinalPolishSuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
  getCanonicalActivePublicValidationState,
} from "./active-public-artifact";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import {
  AUTHORITY_FINAL_POLISH_DEPLOYMENT_CEILING_USD,
  AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID,
  AUTHORITY_FINAL_POLISH_RUNTIME_CEILING_USD,
  authorityFinalPolishFounderScope,
  evaluateAuthorityFinalPolishFounderAuthorization,
  persistAuthorityFinalPolishFounderAuthorization,
} from "./cre-authority-final-polish-authorization";
import { clarifyAuthorityGraphCounts } from "./cre-authority-final-polish-graph";
import {
  authorityFinalPolishLiveVerificationPassed,
  verifyAuthorityFinalPolishLivePublic,
} from "./cre-authority-final-polish-live-verify";
import { authorityExpansionRouteManifest } from "./cre-authority-expansion-routes";
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
export const GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1 =
  "GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1" as const;
export const GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_MISSION_ID =
  "msn_cre_final_authority_polish_governed_deploy_v1" as const;

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

function founderDuplicateRegressions(files: Array<{ path: string; content: string }>) {
  const cam = pageContent(files, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
  const camFail = /The sample treats CAM as tenant-paid on a net path[\s\S]{0,240}The sample treats CAM as tenant-paid on a net path/.test(
    cam,
  );
  const mistakeFail = /Using one CAM number for two buildings[\s\S]{0,240}Using one CAM number for two buildings/.test(cam);
  return { camFail, mistakeFail, pass: !camFail && !mistakeFail };
}

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_MISSION_ID,
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

export async function executeAuthorityFinalPolishSuccessorAuthorizedDeploy() {
  loadEnvLocal();
  preserveClock();
  persistAuthorityFinalPolishFounderAuthorization();
  const reconstructed = await reconstructCreAuthorityFinalPolishSuccessor();
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  const files = reconstructed.files;
  const identity = artifactId === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL";
  const digestLock = digest === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL";
  const manifest = authorityExpansionRouteManifest();
  const compatibility = standardCompatibility(files);
  const graphCounts = clarifyAuthorityGraphCounts(files);
  const founderDupes = founderDuplicateRegressions(files);
  const founder = evaluateAuthorityFinalPolishFounderAuthorization();
  const blocked = (stopReason: string, extra: Record<string, unknown> = {}) => ({
    artifactIdentity: identity,
    digestLock,
    actualDigest: digest,
    routes: manifest.intendedCount,
    routeManifest: manifest,
    ready: compatibility.ready,
    founderVisualReviewReady: reconstructed.founderVisualReviewReady,
    compatibility,
    graphCounts,
    founderDuplicateRegressions: founderDupes,
    redundancy: reconstructed.redundancy,
    highlights: reconstructed.highlights,
    navigation: {
      blocks: reconstructed.navigation.blocks,
      cards: reconstructed.navigation.cards,
      uniqueDestinations: reconstructed.navigation.uniqueDestinations,
      duplicateDestinationProblems: reconstructed.navigation.duplicateDestinationProblems,
    },
    executed: false,
    attempted: false,
    authorizationConsumed: false,
    project: ISOLATED_PROJECT,
    deploymentId: null as string | null,
    publicUrl: null as string | null,
    providerFinalState: "NOT_DEPLOYED" as const,
    providerError: null as string | null,
    live: null as Awaited<ReturnType<typeof verifyAuthorityFinalPolishLivePublic>> | null,
    activated: false,
    activationCount: 0,
    activeArtifact: getActivePublicValidationArtifactId(),
    activeDeployment: getActivePublicValidationDeploymentId(),
    activeUrl: getActivePublicValidationUrl(),
    canonicalReadback: getCanonicalActivePublicValidationState(),
    predecessorArtifact: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
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
    systemsArchitectDuring: "PRESENT_IDLE",
    growthNexusDuring: "PRESENT_IDLE",
    latestCompleted: GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1,
    publiclyLaunched: false,
    ...extra,
  });

  if (identity === "FAIL" || digestLock === "FAIL") {
    return blocked(AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH);
  }
  if (graphCounts.orphans > 0 || graphCounts.deadEnds > 0 || graphCounts.overall !== "PASS") {
    return blocked("AUTHORITY_GRAPH_ORPHAN_OR_DEAD_END");
  }
  if (!founderDupes.pass) {
    return blocked("FOUNDER_DUPLICATE_REGRESSION");
  }
  if (
    compatibility.expanded !== "PASS" ||
    compatibility.global !== "PASS" ||
    compatibility.reference !== "PASS" ||
    compatibility.ready !== PREMIUM_AUTHORITY_VALIDATION_READY ||
    reconstructed.founderVisualReviewReady !== "FOUNDER_VISUAL_REVIEW_READY" ||
    manifest.intendedCount !== 57
  ) {
    return blocked("PREDEPLOY_QUALITY_FAILED");
  }
  if (
    reconstructed.footer.overall !== "PASS" ||
    reconstructed.tables.overall !== "PASS" ||
    reconstructed.composition.overall !== "PASS" ||
    reconstructed.footerAttribution.ok !== true
  ) {
    return blocked("PREDEPLOY_VISUAL_QC_FAILED");
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
    expectedArtifactId: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
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
      artifact_id: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
      source_digest: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID,
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
      missionId: GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_MISSION_ID,
      missionType: GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1,
      source: "governed_cre_final_authority_polish_deployment_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_AUTHORITY_FINAL_POLISH_DEPLOY",
      "QUALITY_REVIEW",
      "PREPARE_SOURCE_BUNDLE",
      "CREATE_DEPLOYMENT",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
      "ACTIVATE_PUBLIC_ARTIFACT",
    ],
    orchestrationStepType: "ORCHESTRATE_AUTHORITY_FINAL_POLISH_DEPLOY",
    onSnapshot: (view: CommandActivityView, phase: string) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Reconfirming exact final-authority-polish identity, digest, 57 routes, graph counts, and footer wording.",
        run: () => ({
          identity,
          digestLock,
          ready: compatibility.ready,
          routes: manifest.intendedCount,
          graphCounts,
          founderDuplicateRegressions: founderDupes,
        }),
      });
      await handle.step({
        stepType: "PREPARE_SOURCE_BUNDLE",
        engine: "launch_gateway",
        summary: "Handing the frozen final authority polish successor bundle to the adapter.",
        run: () => ({ files: files.length, digest, frozen: Boolean(getFrozenProviderEquivalentGate()?.frozen) }),
      });
      let result: Awaited<ReturnType<typeof vercelAdapter.execute>> | null = null;
      let providerError: string | null = null;
      try {
        result = await handle.step({
          stepType: "CREATE_DEPLOYMENT",
          engine: "launch_gateway",
          summary: "Publishing art_3b428a17dfca6e047550 to the isolated Vercel staging project.",
          run: async () => {
            const executed = await vercelAdapter.execute(ctx);
            consumeFounderAuthorizationDeployment();
            recordExternalActionAttemptConsumed({
              attemptId: AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID,
              scope: authorityFinalPolishFounderScope(),
              providerDeploymentCreated: Boolean(executed.externalIds.deployment_id),
              source: "vercel.com_v1 hosting.deploy_source_bundle execute",
            });
            return executed;
          },
        });
      } catch (error) {
        consumeFounderAuthorizationDeployment();
        recordExternalActionAttemptConsumed({
          attemptId: AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID,
          scope: authorityFinalPolishFounderScope(),
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
          founderAuthorizationId: AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID,
          deploymentCeilingUsd: AUTHORITY_FINAL_POLISH_DEPLOYMENT_CEILING_USD,
          runtimeCeilingUsd: AUTHORITY_FINAL_POLISH_RUNTIME_CEILING_USD,
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
        founderAuthorizationId: AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID,
        deploymentCeilingUsd: AUTHORITY_FINAL_POLISH_DEPLOYMENT_CEILING_USD,
        runtimeCeilingUsd: AUTHORITY_FINAL_POLISH_RUNTIME_CEILING_USD,
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
        summary: "Verifying live 57-route Infinity OS footer, semantic navigation, and provider-served polish composition.",
        run: async () =>
          verifyAuthorityFinalPolishLivePublic({
            url,
            artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          }),
      });
      preserveClock();
      let activated = false;
      if (authorityFinalPolishLiveVerificationPassed(live)) {
        await handle.step({
          stepType: "ACTIVATE_PUBLIC_ARTIFACT",
          engine: "launch_gateway",
          summary: "Binding the final authority polish successor as the active validation artifact. READY is not PUBLICLY_LAUNCHED.",
          run: () => {
            activateAuthorityFinalPolishSuccessorPublicArtifact({
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
  const qcPhase = midRun.find((item) => item.phase.includes("QUALITY_REVIEW") || item.phase.includes("PUBLIC_ARTIFACT_QUALITY_GATE"));
  preserveClock();
  void evaluateSecretSafety(files);
  return {
    artifactIdentity: identity,
    digestLock,
    actualDigest: digest,
    routes: manifest.intendedCount,
    routeManifest: manifest,
    ready: compatibility.ready,
    founderVisualReviewReady: reconstructed.founderVisualReviewReady,
    compatibility,
    graphCounts,
    founderDuplicateRegressions: founderDupes,
    redundancy: reconstructed.redundancy,
    highlights: reconstructed.highlights,
    navigation: {
      blocks: reconstructed.navigation.blocks,
      cards: reconstructed.navigation.cards,
      uniqueDestinations: reconstructed.navigation.uniqueDestinations,
      duplicateDestinationProblems: reconstructed.navigation.duplicateDestinationProblems,
    },
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
    predecessorArtifact: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
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
    systemsArchitectDuring: midRun.some((item) => item.rooms.includes("systems_architect")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    growthNexusDuring: midRun.some((item) => item.rooms.includes("growth_department")) ? "ACTIVE_WORK" : "PRESENT_IDLE",
    latestCompleted: GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1,
    publiclyLaunched: false,
    missionId: instrumented.view.latestCompleted?.missionId ?? GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_MISSION_ID,
  };
}
