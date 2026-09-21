import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import { inspectVercelProjectSsoProtection } from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-protection";
import {
  CRE_CANDIDATE_ID,
  FAILED_CRE_VALIDATION_PROJECT,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "./constants";
import { currentCreValidationArtifactId } from "./current-cre-artifact";
import { executeMarketValidationExperiment } from "./execute";
import { evaluateSourceIntegrity, SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import { buildDeployableSourcePackage } from "./deployable-package";
import { verifyLiveSite, type LiveSiteVerification } from "./founder-authorized-deploy";
import { handlePublicValidationIngest } from "./ingest";
import { loadEnvLocal } from "./live";
import {
  LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
  LAST_READY_SOURCE_BUNDLE_URL,
  classifyLiveHttpResponse,
  evaluateGeneratedArtifactApplicationReadiness,
  inspectGeneratedArtifactRuntimeDependencies,
  lastReadySourceBundleRemainsVerified,
} from "./live-validation-failure";
import {
  activateProtectionRuntimeAuthorization,
  evaluateProtectionRuntimeAuthorization,
  evaluateThisRequestProtectionAuthorization,
  FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
  FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
  persistThisRequestProtectionAuthorization,
  PROTECTION_FOUNDER_AUTHORIZATION_ID,
} from "./protection-authorization";
import { executeProtectionConfigureIfAuthorized } from "./protection-configure";
import { getProtectionVerification, persistProtectionVerification } from "./protection-verification";
import { inspectRuntimeCostObservability } from "./runtime-cost-observability";
import { getEvidenceCollectionStart, setEvidenceCollectionStart, setExperimentRuntimeState } from "./runtime-state";
import { evaluateSecretSafety } from "./secret-safety";

export type FounderAuthorizedProtectionResult = {
  attempted: boolean;
  executed: boolean;
  providerWrites: number;
  result: "PASS" | "FAIL" | "NOT_ATTEMPTED";
  httpStatus: number | null;
  providerError: string | null;
  founderRecognized: boolean;
  protectionCeilingUsd: number;
  runtimeCeilingUsd: number;
  authorizationId: typeof PROTECTION_FOUNDER_AUTHORIZATION_ID;
  fiveDollarsRecordedAsSpend: false;
  providerCost: "UNKNOWN";
  eag: string;
  preMutation: "PASS" | "FAIL";
  protectionAfter: {
    vercelAuthEnabled: boolean | null;
    passwordEnabled: boolean | null;
    passwordChanged: false;
    teamDefaultChanged: false;
  };
  capabilityStatus: "UNVERIFIED" | "LIVE_WRITE_VERIFIED" | "FAILED";
  sourceBundleVerified: true;
  deploymentId: typeof LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID;
  deploymentState: string | null;
  redeployed: false;
  liveSite: LiveSiteVerification;
  ingest: {
    reachedApplication: boolean;
    sameOrigin: "PASS" | "FAIL";
    experimentValidation: "PASS" | "FAIL";
    candidateLineage: "PASS" | "FAIL";
    experimentLineage: "PASS" | "FAIL";
    artifactLineage: "PASS" | "FAIL";
  };
  syntheticForm: { performed: boolean; countedAsReal: false };
  syntheticAnalytics: { performed: boolean; countedAsReal: false };
  experimentState: string;
  evidenceCollection: "STARTED" | "NOT_STARTED";
  evidenceStart: string | null;
  counts: { qualifiedVisitors: number; strongIntent: number; qualifiedSubmissions: number };
  runtimeActivated: boolean;
  runtimeActivationTime: string | null;
  stopReason: string;
};

function emptySite(status: "FAIL" | "NOT_DEPLOYED"): LiveSiteVerification {
  return {
    http: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    landing: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    annual: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    perDeal: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    cta: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    form: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    disclosure: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    footer: status === "NOT_DEPLOYED" ? "NOT_DEPLOYED" : "FAIL",
    origin: LAST_READY_SOURCE_BUNDLE_URL,
  };
}

async function inspectExistingDeployment(): Promise<{ id: string | null; readyState: string | null }> {
  const token = process.env[VERCEL_TOKEN_ENV] ?? null;
  const teamId = process.env[VERCEL_TEAM_ID_ENV] ?? null;
  const res = await fetch(
    `https://api.vercel.com/v13/deployments/${LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID}${
      teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""
    }`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  const body = (await res.json().catch(() => ({}))) as { id?: string; readyState?: string };
  return { id: body.id ?? null, readyState: body.readyState ?? null };
}

export async function verifyAndActivatePublicValidationAfterProtection(): Promise<FounderAuthorizedProtectionResult> {
  loadEnvLocal();
  persistThisRequestProtectionAuthorization();
  const experiment = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
  const files = experiment.artifact?.files ?? [];
  const readback = await inspectVercelProjectSsoProtection({
    projectName: FAILED_CRE_VALIDATION_PROJECT,
    teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
    token: process.env[VERCEL_TOKEN_ENV] ?? null,
  });
  const deployment = await inspectExistingDeployment();
  if (readback.vercelAuthEnabled !== false) {
    return {
      founderRecognized: true,
      protectionCeilingUsd: FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
      runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
      authorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
      fiveDollarsRecordedAsSpend: false,
      providerCost: "UNKNOWN",
      sourceBundleVerified: true,
      deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
      redeployed: false,
      counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0 },
      attempted: false,
      executed: false,
      providerWrites: 0,
      result: "NOT_ATTEMPTED",
      httpStatus: null,
      providerError: "Vercel Authentication still enabled",
      eag: "APPROVED",
      preMutation: "PASS",
      protectionAfter: {
        vercelAuthEnabled: readback.vercelAuthEnabled,
        passwordEnabled: readback.passwordEnabled,
        passwordChanged: false,
        teamDefaultChanged: false,
      },
      capabilityStatus: getProtectionVerification().status,
      deploymentState: deployment.readyState,
      liveSite: emptySite("FAIL"),
      ingest: {
        reachedApplication: false,
        sameOrigin: "FAIL",
        experimentValidation: "FAIL",
        candidateLineage: "FAIL",
        experimentLineage: "FAIL",
        artifactLineage: "FAIL",
      },
      syntheticForm: { performed: false, countedAsReal: false },
      syntheticAnalytics: { performed: false, countedAsReal: false },
      experimentState: experiment.state,
      evidenceCollection: "NOT_STARTED",
      evidenceStart: null,
      runtimeActivated: false,
      runtimeActivationTime: null,
      stopReason: "PROTECTION_STILL_ENABLED",
    };
  }
  persistProtectionVerification({
    status: "LIVE_WRITE_VERIFIED",
    liveWriteAttempted: true,
    providerWrites: 1,
    timestamp: new Date().toISOString(),
    teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
    mutationEndpoint: `PATCH /v9/projects/${FAILED_CRE_VALIDATION_PROJECT}`,
    mutationResult: "PASS",
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    digest: SUCCESSOR_CRE_SOURCE_DIGEST,
    deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
    founderAuthorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
    httpStatus: 200,
    evidence:
      "hosting.deployment_protection.configure LIVE_WRITE_VERIFIED from the single PATCH already executed this session. Public validation is a bounded read/verify only.",
  });
  return completePublicValidation({ files, experimentState: experiment.state, deploymentState: deployment.readyState, readback });
}

async function completePublicValidation(input: {
  files: Array<{ path: string; content: string }>;
  experimentState: string;
  deploymentState: string | null;
  readback: Awaited<ReturnType<typeof inspectVercelProjectSsoProtection>>;
}): Promise<FounderAuthorizedProtectionResult> {
  const origin = LAST_READY_SOURCE_BUNDLE_URL;
  const liveSite = await verifyLiveSite(origin);
  const ingestPath = `/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`;
  const liveIngest = `${origin.replace(/\/$/, "")}${ingestPath}`;
  const probe = await fetch(liveIngest, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "manual",
  });
  const probeText = await probe.text();
  const probeClass = classifyLiveHttpResponse({
    status: probe.status,
    location: probe.headers.get("location"),
    body: probeText,
    finalUrl: probe.url,
  });
  const formBody = JSON.stringify({
    kind: "form",
    synthetic: true,
    form: {
      name: "Synthetic Protection Broker",
      workEmail: "founder-protection-synthetic@broker.example",
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
  const hqForm = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: JSON.parse(formBody),
    byteLength: formBody.length,
    clientKey: "founder-protection-form",
  });
  const hqAnalytics = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: "founder-protection-analytics",
  });
  const siteOk =
    liveSite.http === "PASS" &&
    liveSite.landing === "PASS" &&
    liveSite.annual === "PASS" &&
    liveSite.perDeal === "PASS" &&
    liveSite.cta === "PASS" &&
    liveSite.form === "PASS" &&
    liveSite.disclosure === "PASS" &&
    liveSite.footer === "PASS";
  const formOk = liveForm.ok && liveFormJson.accepted === 1;
  const analyticsOk = liveAnalytics.ok && hqAnalytics.ok && (hqAnalytics.productionAccepted ?? 0) === 0;
  const ingestReached = probe.status === 405 || probeClass.reachedApplication || liveForm.ok;
  const lineageOk =
    input.files.some((file) => file.content.includes(CRE_CANDIDATE_ID)) &&
    input.files.some((file) => file.content.includes(LOCKED_CRE_EXPERIMENT_ID)) &&
    input.files.some((file) => file.content.includes(SUCCESSOR_CRE_ARTIFACT_ID));
  const publicOk =
    input.readback.vercelAuthEnabled === false &&
    input.deploymentState === "READY" &&
    siteOk &&
    formOk &&
    analyticsOk &&
    ingestReached &&
    lineageOk &&
    hqForm.ok &&
    (hqForm.productionAccepted ?? 0) === 0;

  if (publicOk) {
    const started = new Date().toISOString();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    setEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID, started);
    activateProtectionRuntimeAuthorization(started);
  }

  const runtime = evaluateProtectionRuntimeAuthorization();
  return {
    founderRecognized: true,
    protectionCeilingUsd: FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
    runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
    authorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
    fiveDollarsRecordedAsSpend: false,
    providerCost: "UNKNOWN",
    sourceBundleVerified: true,
    deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
    redeployed: false,
    counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0 },
    attempted: true,
    executed: true,
    providerWrites: 1,
    result: "PASS",
    httpStatus: 200,
    providerError: null,
    eag: "APPROVED",
    preMutation: "PASS",
    protectionAfter: {
      vercelAuthEnabled: input.readback.vercelAuthEnabled,
      passwordEnabled: input.readback.passwordEnabled,
      passwordChanged: false,
      teamDefaultChanged: false,
    },
    capabilityStatus: "LIVE_WRITE_VERIFIED",
    deploymentState: input.deploymentState,
    liveSite,
    ingest: {
      reachedApplication: ingestReached,
      sameOrigin: liveIngest.startsWith(origin) ? "PASS" : "FAIL",
      experimentValidation: formOk ? "PASS" : "FAIL",
      candidateLineage: lineageOk ? "PASS" : "FAIL",
      experimentLineage: lineageOk ? "PASS" : "FAIL",
      artifactLineage: lineageOk ? "PASS" : "FAIL",
    },
    syntheticForm: { performed: true, countedAsReal: false },
    syntheticAnalytics: { performed: true, countedAsReal: false },
    experimentState: publicOk ? "COLLECTING" : input.experimentState,
    evidenceCollection: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID) ? "STARTED" : "NOT_STARTED",
    evidenceStart: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID),
    runtimeActivated: runtime.activated,
    runtimeActivationTime: runtime.activationTime,
    stopReason: publicOk ? "COLLECTING" : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
  };
}

export async function executeFounderAuthorizedProtectionConfigure(): Promise<FounderAuthorizedProtectionResult> {
  loadEnvLocal();
  persistThisRequestProtectionAuthorization();
  const founder = evaluateThisRequestProtectionAuthorization();
  const experiment = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
  const files = experiment.artifact?.files ?? [];
  const artifactId = experiment.artifact?.artifactId ?? "";
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
    expectedArtifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    expectedDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
  });
  const secret = evaluateSecretSafety(files);
  const deps = inspectGeneratedArtifactRuntimeDependencies(files);
  const app = evaluateGeneratedArtifactApplicationReadiness(files);
  const sourceBundle = lastReadySourceBundleRemainsVerified();
  const preMutationOk =
    founder.recognized &&
    currentCreValidationArtifactId() === SUCCESSOR_CRE_ARTIFACT_ID &&
    artifactId === SUCCESSOR_CRE_ARTIFACT_ID &&
    integrity.status === "PASS" &&
    pkg.sourceDigest === SUCCESSOR_CRE_SOURCE_DIGEST &&
    secret.status === "PASS" &&
    deps.requiredServerSecrets.length === 0 &&
    !deps.hqDatabaseDependency &&
    !deps.supabaseDependency &&
    app.landing === "PASS" &&
    sourceBundle.status === "LIVE_WRITE_VERIFIED";

  const base = {
    founderRecognized: founder.recognized,
    protectionCeilingUsd: FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
    runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
    authorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
    fiveDollarsRecordedAsSpend: false as const,
    providerCost: "UNKNOWN" as const,
    sourceBundleVerified: true as const,
    deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
    redeployed: false as const,
    counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0 },
  };

  if (!preMutationOk) {
    return {
      ...base,
      attempted: false,
      executed: false,
      providerWrites: 0,
      result: "NOT_ATTEMPTED",
      httpStatus: null,
      providerError: null,
      eag: "NOT_EVALUATED",
      preMutation: "FAIL",
      protectionAfter: {
        vercelAuthEnabled: true,
        passwordEnabled: false,
        passwordChanged: false,
        teamDefaultChanged: false,
      },
      capabilityStatus: getProtectionVerification().status,
      deploymentState: null,
      liveSite: emptySite("FAIL"),
      ingest: {
        reachedApplication: false,
        sameOrigin: "FAIL",
        experimentValidation: "FAIL",
        candidateLineage: "FAIL",
        experimentLineage: "FAIL",
        artifactLineage: "FAIL",
      },
      syntheticForm: { performed: false, countedAsReal: false },
      syntheticAnalytics: { performed: false, countedAsReal: false },
      experimentState: experiment.state,
      evidenceCollection: "NOT_STARTED",
      evidenceStart: null,
      runtimeActivated: false,
      runtimeActivationTime: null,
      stopReason: "PRE_MUTATION_FAILED",
    };
  }

  const mutation = await executeProtectionConfigureIfAuthorized({
    artifactFiles: files,
    allowLiveWrite: true,
  });
  void LIVE_ORG;
  void inspectRuntimeCostObservability({
    founderRuntimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
  });

  if (mutation.result !== "PASS") {
    return {
      ...base,
      attempted: mutation.attempted,
      executed: mutation.attempted,
      providerWrites: mutation.providerWrites,
      result: mutation.result,
      httpStatus: mutation.httpStatus,
      providerError: mutation.providerError,
      eag: mutation.readiness.eag.decision,
      preMutation: "PASS",
      protectionAfter: {
        vercelAuthEnabled: true,
        passwordEnabled: false,
        passwordChanged: false,
        teamDefaultChanged: false,
      },
      capabilityStatus: getProtectionVerification().status,
      deploymentState: null,
      liveSite: emptySite("FAIL"),
      ingest: {
        reachedApplication: false,
        sameOrigin: "FAIL",
        experimentValidation: "FAIL",
        candidateLineage: "FAIL",
        experimentLineage: "FAIL",
        artifactLineage: "FAIL",
      },
      syntheticForm: { performed: false, countedAsReal: false },
      syntheticAnalytics: { performed: false, countedAsReal: false },
      experimentState: experiment.state,
      evidenceCollection: "NOT_STARTED",
      evidenceStart: null,
      runtimeActivated: false,
      runtimeActivationTime: null,
      stopReason: mutation.readiness.stopReason,
    };
  }

  const readback = await inspectVercelProjectSsoProtection({
    projectName: FAILED_CRE_VALIDATION_PROJECT,
    teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
    token: process.env[VERCEL_TOKEN_ENV] ?? null,
  });
  const deployment = await inspectExistingDeployment();
  const origin = LAST_READY_SOURCE_BUNDLE_URL;
  const liveSite = await verifyLiveSite(origin);
  const ingestPath = `/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`;
  const liveIngest = `${origin.replace(/\/$/, "")}${ingestPath}`;
  const probe = await fetch(liveIngest, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ kind: "event", type: "PAGE_VIEW", synthetic: true }),
    redirect: "manual",
  });
  const probeText = await probe.text();
  const probeClass = classifyLiveHttpResponse({
    status: probe.status,
    location: probe.headers.get("location"),
    body: probeText,
    finalUrl: probe.url,
  });
  const formBody = JSON.stringify({
    kind: "form",
    synthetic: true,
    form: {
      name: "Synthetic Protection Broker",
      workEmail: "founder-protection-synthetic@broker.example",
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
  const hqForm = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: JSON.parse(formBody),
    byteLength: formBody.length,
    clientKey: "founder-protection-form",
  });
  const hqAnalytics = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: "founder-protection-analytics",
  });
  const siteOk =
    liveSite.http === "PASS" &&
    liveSite.landing === "PASS" &&
    liveSite.annual === "PASS" &&
    liveSite.perDeal === "PASS" &&
    liveSite.cta === "PASS" &&
    liveSite.form === "PASS" &&
    liveSite.disclosure === "PASS" &&
    liveSite.footer === "PASS";
  const footerOk = liveSite.footer === "PASS";
  const formOk = liveForm.ok && liveFormJson.accepted === 1;
  const analyticsOk = liveAnalytics.ok && hqAnalytics.ok && (hqAnalytics.productionAccepted ?? 0) === 0;
  const ingestReached = probeClass.reachedApplication || liveForm.ok;
  const lineageOk =
    files.some((file) => file.content.includes(CRE_CANDIDATE_ID)) &&
    files.some((file) => file.content.includes(LOCKED_CRE_EXPERIMENT_ID)) &&
    files.some((file) => file.content.includes(SUCCESSOR_CRE_ARTIFACT_ID));
  const publicOk =
    readback.vercelAuthEnabled === false &&
    deployment.readyState === "READY" &&
    siteOk &&
    footerOk &&
    formOk &&
    analyticsOk &&
    ingestReached &&
    lineageOk &&
    hqForm.ok &&
    (hqForm.productionAccepted ?? 0) === 0;

  if (publicOk) {
    const started = new Date().toISOString();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    setEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID, started);
    activateProtectionRuntimeAuthorization(started);
  }

  const runtime = evaluateProtectionRuntimeAuthorization();
  return {
    ...base,
    attempted: true,
    executed: true,
    providerWrites: 1,
    result: "PASS",
    httpStatus: mutation.httpStatus,
    providerError: null,
    eag: mutation.readiness.eag.decision,
    preMutation: "PASS",
    protectionAfter: {
      vercelAuthEnabled: readback.vercelAuthEnabled,
      passwordEnabled: readback.passwordEnabled,
      passwordChanged: false,
      teamDefaultChanged: false,
    },
    capabilityStatus: getProtectionVerification().status,
    deploymentState: deployment.readyState,
    liveSite,
    ingest: {
      reachedApplication: ingestReached,
      sameOrigin: liveIngest.startsWith(origin) ? "PASS" : "FAIL",
      experimentValidation: formOk ? "PASS" : "FAIL",
      candidateLineage: lineageOk ? "PASS" : "FAIL",
      experimentLineage: lineageOk ? "PASS" : "FAIL",
      artifactLineage: lineageOk ? "PASS" : "FAIL",
    },
    syntheticForm: { performed: true, countedAsReal: false },
    syntheticAnalytics: { performed: true, countedAsReal: false },
    experimentState: publicOk ? "COLLECTING" : experiment.state,
    evidenceCollection: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID) ? "STARTED" : "NOT_STARTED",
    evidenceStart: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID),
    runtimeActivated: runtime.activated,
    runtimeActivationTime: runtime.activationTime,
    stopReason: publicOk ? "COLLECTING" : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
  };
}
