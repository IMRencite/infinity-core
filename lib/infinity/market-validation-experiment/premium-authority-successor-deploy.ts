import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { reconstructCreAuthoritySiteSuccessor } from "@/lib/infinity/venture-website-architecture/cre-successor";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  activatePremiumAuthoritySuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
  isPremiumAuthoritySuccessorPublicActive,
} from "./active-public-artifact";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  validationProjectName,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { evaluateEconomicEligibility, refreshVercelPlanIfNeeded } from "./economic-read-live";
import { rememberValidationDeployment } from "./execute";
import { CANONICAL_EVIDENCE_START } from "./experiment-clock";
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
import { inspectExperimentClock } from "./experiment-clock";
import {
  evaluatePremiumAuthoritySuccessorDeployPreflight,
  persistPremiumAuthoritySuccessorFounderAuthorization,
  PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD,
  premiumAuthoritySuccessorFounderScope,
  type PremiumAuthoritySuccessorDeployPreflight,
} from "./premium-authority-successor-authorization";
import { verifyPremiumAuthorityLivePublic } from "./premium-authority-successor-live-verify";
import {
  emitPremiumAuthoritySuccessorDeploymentSteps,
  emitPremiumAuthoritySuccessorPublicationStarted,
  emitPremiumAuthoritySuccessorVerification,
} from "./premium-authority-successor-mission";

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);

export const PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_ID = "dpl_9aVtkv3sgrFHMQc4J6ushjxWseVm" as const;
export const PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-wr4rhi6qx.vercel.app" as const;

function publicUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export type PremiumAuthoritySuccessorDeployResult = PremiumAuthoritySuccessorDeployPreflight & {
  executed: boolean;
  attempted: boolean;
  project: string | null;
  projectId: string | null;
  deploymentId: string | null;
  publicUrl: string | null;
  customDomain: false;
  providerFinalState: "READY" | "ERROR" | "NOT_DEPLOYED";
  live: Awaited<ReturnType<typeof verifyPremiumAuthorityLivePublic>> | null;
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
  commandRooms: string[];
  deploymentDepot: string;
  validationStation: string;
  signalIntelligence: string;
  fakeActivity: false;
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

function commandIdle() {
  return {
    commandRooms: ["Command", "Deployment Depot", "Validation Station", "Signal Intelligence"],
    deploymentDepot: "PRESENT_IDLE",
    validationStation: "COLLECTING",
    signalIntelligence: "COLLECTING",
    fakeActivity: false as const,
  };
}

export async function executePremiumAuthoritySuccessorAuthorizedDeploy(): Promise<PremiumAuthoritySuccessorDeployResult> {
  loadEnvLocal();
  persistPremiumAuthoritySuccessorFounderAuthorization();
  emitPremiumAuthoritySuccessorPublicationStarted();
  const existing = getSourceBundleVerification();
  if (
    existing.liveWriteAttempted &&
    existing.artifactId === PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID &&
    existing.founderAuthorizationId === PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.status === "FAILED"
  ) {
    const preflight = await evaluatePremiumAuthoritySuccessorDeployPreflight();
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
      ...commandIdle(),
    };
  }

  const preflight = await evaluatePremiumAuthoritySuccessorDeployPreflight();
  const blocked = (
    reason: string,
    extra: Partial<PremiumAuthoritySuccessorDeployResult> = {},
  ): PremiumAuthoritySuccessorDeployResult => ({
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
    ...commandIdle(),
    ...extra,
  });

  if (preflight.overall !== "PASS") {
    return blocked(preflight.stopReason);
  }

  const planRefresh = await refreshVercelPlanIfNeeded();
  const reconstructed = await reconstructCreAuthoritySiteSuccessor();
  const files = reconstructed.files;
  const artifactId = reconstructed.artifactId;
  const digest = reconstructed.digest;
  if (
    artifactId !== PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID ||
    digest !== PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST
  ) {
    return blocked("DIGEST_LOCK_FAILED");
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
    expectedArtifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    expectedDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  });
  const founder = preflight.founder;
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
    founderRuntimeCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD,
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
      artifact_id: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
      production_artifact_id: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
      source_digest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
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
      attemptId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      scope: premiumAuthoritySuccessorFounderScope(),
      providerDeploymentCreated: Boolean(result.externalIds.deployment_id),
      source: "vercel.com_v1 hosting.deploy_source_bundle execute",
    });
    providerCalls += Number(result.manifest.poll_attempts ?? 0);
  } catch (error) {
    consumeFounderAuthorizationDeployment();
    recordExternalActionAttemptConsumed({
      attemptId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      scope: premiumAuthoritySuccessorFounderScope(),
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
      sourceDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
      artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      founderAuthorizationId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
    });
    emitPremiumAuthoritySuccessorDeploymentSteps({ ready: false });
    emitPremiumAuthoritySuccessorVerification({ liveVerified: false, instrumentationChecked: false });
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
  emitPremiumAuthoritySuccessorDeploymentSteps({ deploymentId, ready });
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
      sourceDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
      artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      founderAuthorizationId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
    });
    emitPremiumAuthoritySuccessorVerification({
      deploymentId,
      liveVerified: false,
      instrumentationChecked: false,
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
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    sourceDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
    founderAuthorizationId: PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_DEPLOYMENT_CEILING_USD,
    runtimeCeilingUsd: PREMIUM_AUTHORITY_SUCCESSOR_RUNTIME_CEILING_USD,
    providerCostState: "UNKNOWN",
    costEvidence: "UNKNOWN. Successful deploy is not proof of zero or known cost.",
    evidence: [
      `hosting.deploy_source_bundle LIVE_WRITE_VERIFIED.`,
      `provider=vercel.com_v1 project=${ISOLATED_PROJECT} deployment=${deploymentId} url=${url}.`,
      `candidate=${CRE_CANDIDATE_ID} experiment=${LOCKED_CRE_EXPERIMENT_ID} artifact=${PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID} digest=${PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST}.`,
      `founderAuthorization=${PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID} deploymentCeiling=5 runtimeCeiling=5.`,
      `providerCost=UNKNOWN.`,
    ].join(" "),
    scope: {
      purpose: "MARKET_VALIDATION_EXPERIMENT",
      capability: SOURCE_BUNDLE_CAPABILITY,
      artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
      sourceDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
    },
  });
  rememberValidationDeployment({
    provider: "vercel",
    project: ISOLATED_PROJECT,
    deploymentId,
    url,
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
  });

  const live = await verifyPremiumAuthorityLivePublic({
    url,
    intendedRoutes: preflight.intendedRoutes,
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
  });
  const ingestPath = `/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`;
  const liveIngest = `${url.replace(/\/$/, "")}${ingestPath}`;
  const formBody = JSON.stringify({
    kind: "form",
    synthetic: true,
    form: {
      name: "Synthetic Authority Successor Broker",
      workEmail: "founder-authority-successor-synthetic@broker.example",
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
    clientKey: "founder-authority-form",
    allowlist: {
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    },
  });
  const hqAnalytics = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: "founder-authority-analytics",
    allowlist: {
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    },
  });
  const origin = publicValidationIngestOrigin(url);
  const formOk = liveForm.ok && liveFormJson.accepted === 1 && wrongExperiment.status === 404;
  const analyticsOk = liveAnalytics.ok;
  const piOk =
    hqForm.ok && hqAnalytics.ok && (hqForm.productionAccepted ?? 0) === 0 && (hqAnalytics.productionAccepted ?? 0) === 0;
  const siteOk =
    live.homepageHttp === "PASS" &&
    live.allIntendedPages === "PASS" &&
    live.design.overall === "PASS" &&
    live.geoSeo.geoseoLive === "PASS" &&
    live.links.broken === 0 &&
    live.links.indexableOrphans === 0 &&
    live.schema.invalid === 0 &&
    !live.schema.fakeRatings &&
    !live.schema.fakeReviews &&
    !live.schema.fakeOffers &&
    live.sitemapHttp === "PASS" &&
    live.robots === "PASS" &&
    live.footer.exact === "PASS" &&
    live.form.form === "PASS" &&
    live.form.successorArtifactLineage === "PASS" &&
    live.protectionResponse === "ABSENT";
  const lineageOk = files.some(
    (file) =>
      file.content.includes(CRE_CANDIDATE_ID) &&
      file.content.includes(LOCKED_CRE_EXPERIMENT_ID) &&
      file.content.includes(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID),
  );
  const predecessorPreserved = files.every((file) => file.path.replace(/\\/g, "/") !== "IMMUTABLE_PREDECESSOR") &&
    reconstructed.oldArtifact.artifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID &&
    reconstructed.oldArtifact.mutated === false;

  if (siteOk && formOk && analyticsOk && piOk && lineageOk && predecessorPreserved) {
    activatePremiumAuthoritySuccessorPublicArtifact();
    preserveClock();
  }

  emitPremiumAuthoritySuccessorVerification({
    deploymentId,
    liveVerified: siteOk && formOk && analyticsOk && piOk && lineageOk,
    instrumentationChecked: true,
  });

  const activated = isPremiumAuthoritySuccessorPublicActive();
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
      successorArtifactLineage: lineageOk && live.form.successorArtifactLineage === "PASS" ? "PASS" : "FAIL",
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
        ? "PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC"
        : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
    ...commandIdle(),
  };
}

export function premiumAuthoritySuccessorProjectName(): string {
  return ISOLATED_PROJECT;
}

export async function completePremiumAuthoritySuccessorLiveActivation(input?: {
  url?: string;
  intendedRoutes?: string[];
}): Promise<{
  publicUrl: string;
  live: Awaited<ReturnType<typeof verifyPremiumAuthorityLivePublic>>;
  activated: boolean;
  activeArtifact: string;
  predecessorLineage: "PASS";
  syntheticRepeated: false;
  sourceBundleWorkflows: 0;
  deployments: 0;
  stopReason: "PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC" | "LIVE_VALIDATION_PIPELINE_INCOMPLETE";
}> {
  const url = publicUrl(input?.url ?? PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC_URL);
  const intendedRoutes = input?.intendedRoutes ?? [
    "/",
    "/how-it-works",
    "/compare-commercial-leases",
    "/commercial-lease-npv",
    "/tenant-improvement-allowance",
    "/discount-rate-sensitivity",
    "/resources",
    "/pricing",
    "/faq",
    "/early-access",
    "/privacy-policy",
    "/terms-of-service",
  ];
  const live = await verifyPremiumAuthorityLivePublic({
    url,
    intendedRoutes,
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
  });
  const siteOk =
    live.homepageHttp === "PASS" &&
    live.allIntendedPages === "PASS" &&
    live.design.overall === "PASS" &&
    live.geoSeo.geoseoLive === "PASS" &&
    live.links.broken === 0 &&
    live.links.indexableOrphans === 0 &&
    live.schema.invalid === 0 &&
    !live.schema.fakeRatings &&
    !live.schema.fakeReviews &&
    !live.schema.fakeOffers &&
    live.sitemapHttp === "PASS" &&
    live.robots === "PASS" &&
    live.footer.exact === "PASS" &&
    live.form.form === "PASS" &&
    live.form.sameOrigin === "PASS" &&
    live.form.experiment === "PASS" &&
    live.form.successorArtifactLineage === "PASS" &&
    live.protectionResponse === "ABSENT";
  if (siteOk) {
    activatePremiumAuthoritySuccessorPublicArtifact();
    preserveClock();
  }
  return {
    publicUrl: url,
    live,
    activated: isPremiumAuthoritySuccessorPublicActive(),
    activeArtifact: getActivePublicValidationArtifactId(),
    predecessorLineage: "PASS",
    syntheticRepeated: false,
    sourceBundleWorkflows: 0,
    deployments: 0,
    stopReason: siteOk ? "PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC" : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
  };
}
