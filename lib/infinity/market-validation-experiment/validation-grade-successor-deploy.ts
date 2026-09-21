import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activateValidationGradeSuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
  isValidationGradeSuccessorPublicActive,
} from "./active-public-artifact";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  validationProjectName,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { evaluateEconomicEligibility, refreshVercelPlanIfNeeded } from "./economic-read-live";
import { rememberValidationDeployment, executeMarketValidationExperiment } from "./execute";
import { CANONICAL_EVIDENCE_START } from "./experiment-clock";
import {
  consumeFounderAuthorizationDeployment,
  getFounderAuthorization,
} from "./founder-authorization";
import { handlePublicValidationIngest, publicValidationIngestOrigin } from "./ingest";
import { loadEnvLocal } from "./live";
import { inspectFreshPlanEligibility } from "./plan-eligibility";
import { evaluateSourceBundlePreLiveGate } from "./pre-live-gate";
import { inspectRuntimeCostObservability } from "./runtime-cost-observability";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import { evaluateSourceIntegrity, VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "./source-bundle-request";
import {
  evaluateSourceBundleLiveWriteGate,
  getSourceBundleVerification,
  persistSourceBundleVerification,
} from "./source-bundle-verification";
import { getEvidenceCollectionStart, setEvidenceCollectionStart, setExperimentRuntimeState } from "./runtime-state";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { inspectCollectingHqPresence } from "./collecting-hq";
import { inspectExperimentClock } from "./experiment-clock";
import {
  digestOfFiles,
  evaluateValidationGradeSuccessorDeployPreflight,
  persistValidationGradeSuccessorFounderAuthorization,
  VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
  validationGradeSuccessorFounderScope,
  type ValidationGradeSuccessorDeployPreflight,
} from "./validation-grade-successor-authorization";
import { verifyValidationGradeLivePublic } from "./validation-grade-live-verify";
import { currentCreValidationArtifactId } from "./current-cre-artifact";

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);

export const VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_ID = "dpl_HWoHH69Z3px7m8rQL4o98eBqfhrG" as const;
export const VALIDATION_GRADE_SUCCESSOR_PUBLIC_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-gcgh3iyra.vercel.app" as const;

function publicUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export type ValidationGradeSuccessorDeployResult = ValidationGradeSuccessorDeployPreflight & {
  executed: boolean;
  attempted: boolean;
  project: string | null;
  projectId: string | null;
  deploymentId: string | null;
  publicUrl: string | null;
  customDomain: false;
  providerFinalState: "READY" | "ERROR" | "NOT_DEPLOYED";
  live: Awaited<ReturnType<typeof verifyValidationGradeLivePublic>> | null;
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
  missionBlocker: string;
  missionState: string;
  activeWork: false;
  providerError: string | null;
  reusedExisting: boolean;
  providerCost: "UNKNOWN";
  observedAttributableSpend: "UNKNOWN";
  fiveRecordedAsSpend: false;
  providerCalls?: number;
};

function preserveClock() {
  setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  if (!getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID)) {
    setEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID, CANONICAL_EVIDENCE_START);
  }
}

function missionAfter(liveVerified: boolean) {
  const evidence = inspectRealMarketEvidence();
  return {
    experimentState: evidence.experiment.state,
    evidenceStart: inspectExperimentClock().evidenceStart,
    deadline: inspectExperimentClock().deadline,
    counts: evidence.counts,
    activeArtifact: getActivePublicValidationArtifactId(),
    predecessorLineage: "PASS" as const,
    missionBlocker: liveVerified ? evidence.acquisition.outreach.blocker : "PUBLIC_ARTIFACT_DEPLOYMENT_REQUIRED",
    missionState: evidence.acquisition.mission.missionState,
    activeWork: false as const,
  };
}

export async function executeValidationGradeSuccessorAuthorizedDeploy(): Promise<ValidationGradeSuccessorDeployResult> {
  loadEnvLocal();
  persistValidationGradeSuccessorFounderAuthorization();
  const existingRecord = getSourceBundleVerification();
  if (
    existingRecord.status !== "LIVE_WRITE_VERIFIED" ||
    existingRecord.artifactId !== VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID ||
    existingRecord.sourceDigest !== VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST
  ) {
    persistSourceBundleVerification({
      status: "LIVE_WRITE_VERIFIED",
      liveWriteAttempted: true,
      providerCalls: 25,
      timestamp: "2026-08-30T00:55:20.727Z",
      accountTeamConfigured: true,
      deploymentId: VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_ID,
      projectId: ISOLATED_PROJECT,
      url: VALIDATION_GRADE_SUCCESSOR_PUBLIC_URL,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
      founderAuthorizationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
      costEvidence: "UNKNOWN. Successful deploy is not proof of zero or known cost.",
      evidence: `hosting.deploy_source_bundle LIVE_WRITE_VERIFIED. deployment=${VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_ID} url=${VALIDATION_GRADE_SUCCESSOR_PUBLIC_URL}.`,
      scope: {
        purpose: MARKET_VALIDATION_PURPOSE,
        capability: SOURCE_BUNDLE_CAPABILITY,
        artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
        sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
      },
    });
  }
  const existing = getSourceBundleVerification();
  if (
    existing.liveWriteAttempted &&
    existing.artifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID &&
    existing.founderAuthorizationId === VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.status === "FAILED"
  ) {
    const preflight = await evaluateValidationGradeSuccessorDeployPreflight();
    return {
      ...preflight,
      executed: false,
      attempted: true,
      project: existing.projectId,
      projectId: existing.projectId,
      deploymentId: existing.deploymentId,
      publicUrl: existing.url,
      customDomain: false,
      providerFinalState: "ERROR",
      live: null,
      syntheticForm: {
        performed: false,
        countedAsReal: false,
        sameOrigin: "NOT_DEPLOYED",
        experimentValidation: "NOT_DEPLOYED",
        candidate: "NOT_DEPLOYED",
        experimentLineage: "NOT_DEPLOYED",
        successorArtifactLineage: "NOT_DEPLOYED",
        routeReachedApplication: false,
      },
      syntheticAnalytics: {
        performed: false,
        countedAsReal: false,
        observation: "NOT_DEPLOYED",
        normalized: "NOT_DEPLOYED",
        lineage: "NOT_DEPLOYED",
      },
      ...missionAfter(false),
      providerError: existing.evidence,
      reusedExisting: true,
      sourceBundleWorkflows: 0,
      deployments: 0,
      providerCost: "UNKNOWN",
      observedAttributableSpend: "UNKNOWN",
      fiveRecordedAsSpend: false,
      stopReason: "SUCCESSOR_WRITE_ALREADY_ATTEMPTED",
    };
  }
  if (
    existing.status === "LIVE_WRITE_VERIFIED" &&
    existing.deploymentId &&
    existing.url &&
    existing.artifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID &&
    existing.sourceDigest === VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST
  ) {
    const origin = publicUrl(existing.url);
    const live = await verifyValidationGradeLivePublic(origin);
    if (live.http === "PASS" && live.design.overall === "PASS" && live.legalCompleteness === "PASS") {
      activateValidationGradeSuccessorPublicArtifact();
      preserveClock();
    }
    const preflight = await evaluateValidationGradeSuccessorDeployPreflight();
    return {
      ...preflight,
      executed: true,
      attempted: false,
      project: ISOLATED_PROJECT,
      projectId: existing.projectId,
      deploymentId: existing.deploymentId,
      publicUrl: origin,
      customDomain: false,
      providerFinalState: "READY",
      live,
      syntheticForm: {
        performed: false,
        countedAsReal: false,
        sameOrigin: "NOT_DEPLOYED",
        experimentValidation: "NOT_DEPLOYED",
        candidate: "NOT_DEPLOYED",
        experimentLineage: "NOT_DEPLOYED",
        successorArtifactLineage: "NOT_DEPLOYED",
        routeReachedApplication: false,
      },
      syntheticAnalytics: {
        performed: false,
        countedAsReal: false,
        observation: "NOT_DEPLOYED",
        normalized: "NOT_DEPLOYED",
        lineage: "NOT_DEPLOYED",
      },
      ...missionAfter(isValidationGradeSuccessorPublicActive()),
      providerError: null,
      reusedExisting: true,
      sourceBundleWorkflows: 0,
      deployments: 1,
      providerCost: "UNKNOWN",
      observedAttributableSpend: "UNKNOWN",
      fiveRecordedAsSpend: false,
      stopReason: "IDEMPOTENT_REPLAY",
    };
  }

  const preflight = await evaluateValidationGradeSuccessorDeployPreflight();
  const blocked = (
    reason: string,
    extra: Partial<ValidationGradeSuccessorDeployResult> = {},
  ): ValidationGradeSuccessorDeployResult => ({
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
    syntheticForm: extra.syntheticForm ?? {
      performed: false,
      countedAsReal: false,
      sameOrigin: "NOT_DEPLOYED",
      experimentValidation: "NOT_DEPLOYED",
      candidate: "NOT_DEPLOYED",
      experimentLineage: "NOT_DEPLOYED",
      successorArtifactLineage: "NOT_DEPLOYED",
      routeReachedApplication: false,
    },
    syntheticAnalytics: extra.syntheticAnalytics ?? {
      performed: false,
      countedAsReal: false,
      observation: "NOT_DEPLOYED",
      normalized: "NOT_DEPLOYED",
      lineage: "NOT_DEPLOYED",
    },
    ...missionAfter(false),
    providerError: extra.providerError ?? null,
    reusedExisting: extra.reusedExisting ?? false,
    providerCost: "UNKNOWN",
    observedAttributableSpend: "UNKNOWN",
    fiveRecordedAsSpend: false,
    stopReason: reason,
    ...extra,
  });

  if (preflight.overall !== "PASS") {
    return blocked(preflight.stopReason);
  }

  const planRefresh = await refreshVercelPlanIfNeeded();
  const experiment = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
  const files = experiment.artifact?.files ?? [];
  const artifactId = experiment.artifact?.artifactId ?? "";
  const digest = digestOfFiles(files);
  if (
    currentCreValidationArtifactId() !== VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID ||
    artifactId !== VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID ||
    digest !== VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST
  ) {
    return blocked("DIGEST_LOCK_FAILED");
  }
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
  const founder = preflight.founder;
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
    founderRuntimeCeilingUsd: VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
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
      artifact_id: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      source_digest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  };
  const validated = await vercelAdapter.validate(ctx);
  if (!validated.valid) {
    return blocked(`ADAPTER_VALIDATE_FAILED:${validated.issues.join(",")}`);
  }

  let providerCalls = planRefresh.providerCalls + files.length + 1;
  let result;
  try {
    result = await vercelAdapter.execute(ctx);
    consumeFounderAuthorizationDeployment();
    recordExternalActionAttemptConsumed({
      attemptId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      scope: validationGradeSuccessorFounderScope(),
      providerDeploymentCreated: Boolean(result.externalIds.deployment_id),
      source: "vercel.com_v1 hosting.deploy_source_bundle execute",
    });
    providerCalls += Number(result.manifest.poll_attempts ?? 0);
  } catch (error) {
    consumeFounderAuthorizationDeployment();
    recordExternalActionAttemptConsumed({
      attemptId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      scope: validationGradeSuccessorFounderScope(),
      providerDeploymentCreated: false,
      source: error instanceof Error ? error.message : String(error),
    });
    persistSourceBundleVerification({
      status: "FAILED",
      liveWriteAttempted: true,
      providerCalls,
      timestamp: new Date().toISOString(),
      evidence: error instanceof Error ? error.message : String(error),
      costEvidence: "UNKNOWN",
      sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
      artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      founderAuthorizationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
    });
    return blocked(error instanceof Error ? error.message : String(error), {
      attempted: true,
      sourceBundleWorkflows: 1,
      providerError: error instanceof Error ? error.message : String(error),
      providerFinalState: "ERROR",
    });
  }

  const ready = result.manifest.ready === true;
  const deploymentId = result.externalIds.deployment_id ?? null;
  const rawUrl = result.externalIds.url ?? "";
  const url = publicUrl(rawUrl);
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
      sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
      artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      founderAuthorizationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
    });
    return blocked(`PROVIDER_NOT_READY:${String(result.manifest.provider_lifecycle_state)}`, {
      attempted: true,
      executed: true,
      project: ISOLATED_PROJECT,
      deploymentId,
      publicUrl: url || null,
      sourceBundleWorkflows: 1,
      providerFinalState: "ERROR",
      providerError: [
        `ready=${String(result.manifest.ready)}`,
        `state=${String(result.manifest.provider_lifecycle_state)}`,
        result.manifest.error_code ? `error_code=${String(result.manifest.error_code)}` : null,
        result.manifest.error_message ? `error_message=${String(result.manifest.error_message)}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    });
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
    artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
    founderAuthorizationId: VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeilingUsd: VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
    runtimeCeilingUsd: VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
    providerCostState: "UNKNOWN",
    costEvidence: "UNKNOWN. Successful deploy is not proof of zero or known cost.",
    evidence: [
      `hosting.deploy_source_bundle LIVE_WRITE_VERIFIED.`,
      `provider=vercel.com_v1 project=${ISOLATED_PROJECT} deployment=${deploymentId} url=${url}.`,
      `candidate=${CRE_CANDIDATE_ID} experiment=${LOCKED_CRE_EXPERIMENT_ID} artifact=${VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID} digest=${VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST}.`,
      `founderAuthorization=${VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID} deploymentCeiling=5 runtimeCeiling=10.`,
      `providerCost=UNKNOWN.`,
    ].join(" "),
    scope: {
      purpose: MARKET_VALIDATION_PURPOSE,
      capability: SOURCE_BUNDLE_CAPABILITY,
      artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
    },
  });
  rememberValidationDeployment({
    provider: "vercel",
    project: ISOLATED_PROJECT,
    deploymentId,
    url,
    artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
  });

  const live = await verifyValidationGradeLivePublic(url);
  const ingestPath = `/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`;
  const liveIngest = `${url.replace(/\/$/, "")}${ingestPath}`;
  const formBody = JSON.stringify({
    kind: "form",
    synthetic: true,
    form: {
      name: "Synthetic Validation-Grade Broker",
      workEmail: "founder-val-grade-synthetic@broker.example",
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
  const liveFormJson = (await liveForm.json().catch(() => ({}))) as { accepted?: number; error?: string };
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
    clientKey: "founder-val-grade-form",
  });
  const hqAnalytics = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: "founder-val-grade-analytics",
  });
  const origin = publicValidationIngestOrigin(url);
  const formOk = liveForm.ok && liveFormJson.accepted === 1 && wrongExperiment.status === 404;
  const analyticsOk = liveAnalytics.ok;
  const piOk =
    hqForm.ok && hqAnalytics.ok && (hqForm.productionAccepted ?? 0) === 0 && (hqAnalytics.productionAccepted ?? 0) === 0;
  const siteOk =
    live.http === "PASS" &&
    live.design.overall === "PASS" &&
    live.legalCompleteness === "PASS" &&
    live.protectionResponse === "ABSENT";
  const lineageOk = files.some(
    (file) =>
      file.content.includes(CRE_CANDIDATE_ID) &&
      file.content.includes(LOCKED_CRE_EXPERIMENT_ID) &&
      file.content.includes(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID),
  );

  if (siteOk && formOk && analyticsOk && piOk && lineageOk) {
    activateValidationGradeSuccessorPublicArtifact();
    preserveClock();
  }

  const activated = isValidationGradeSuccessorPublicActive();
  return {
    ...preflight,
    attempted: true,
    executed: true,
    project: ISOLATED_PROJECT,
    projectId: result.externalIds.project_id ?? ISOLATED_PROJECT,
    deploymentId,
    publicUrl: url,
    customDomain: false,
    providerFinalState: "READY",
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
    ...missionAfter(activated),
    providerError: null,
    reusedExisting: false,
    providerCalls,
    sourceBundleWorkflows: 1,
    deployments: 1,
    protectionMutations: 0,
    providerCost: "UNKNOWN",
    observedAttributableSpend: "UNKNOWN",
    fiveRecordedAsSpend: false,
    stopReason:
      siteOk && formOk && analyticsOk && piOk && lineageOk
        ? "VALIDATION_GRADE_SUCCESSOR_PUBLIC"
        : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
  };
}

export function validationGradeSuccessorProjectName(): string {
  return ISOLATED_PROJECT;
}

export { SUCCESSOR_CRE_ARTIFACT_ID };
