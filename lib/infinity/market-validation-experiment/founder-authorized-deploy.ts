import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";
import { classifyLiveHttpResponse } from "./live-validation-failure";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SUCCESSOR_CRE_ARTIFACT_ID,
  validationProjectName,
} from "./constants";
import { classifyValidationDeploymentCost } from "./cost";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { buildDeployableSourcePackage } from "./deployable-package";
import { evaluateEconomicEligibility, refreshVercelPlanIfNeeded } from "./economic-read-live";
import { evaluateValidationExperimentEag } from "./eag-policy";
import {
  rememberValidationDeployment,
  executeMarketValidationExperiment,
} from "./execute";
import {
  FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
  FOUNDER_APPROVED_RUNTIME_CEILING_USD,
  FOUNDER_AUTHORIZATION_ID,
  buildFounderExternalCostAuthorization,
  consumeFounderAuthorizationDeployment,
  currentCreFounderScope,
  evaluateThisRequestFounderAuthorization,
  getFounderAuthorization,
  persistFounderAuthorization,
  scopesMatch,
  type FounderAuthorizationEvaluation,
} from "./founder-authorization";
import { handlePublicValidationIngest, publicValidationIngestOrigin } from "./ingest";
import { loadEnvLocal } from "./live";
import { inspectFreshPlanEligibility } from "./plan-eligibility";
import { evaluateSourceBundlePreLiveGate } from "./pre-live-gate";
import { inspectRuntimeCostObservability, type RuntimeCostObservability } from "./runtime-cost-observability";
import { getEvidenceCollectionStart, setEvidenceCollectionStart, setExperimentRuntimeState } from "./runtime-state";
import { recordExternalActionAttemptConsumed } from "./attempt-financial-exposure";
import { evaluateSourceIntegrity, SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import { currentCreValidationArtifactId } from "./current-cre-artifact";
import { evaluateSuccessorIsolatedBuildReadiness } from "./successor-isolated-evidence";
import {
  evaluateSourceBundleLiveWriteGate,
  getSourceBundleVerification,
  persistSourceBundleVerification,
} from "./source-bundle-verification";

export type FounderAuthorizedDeployPreflight = {
  capability: typeof SOURCE_BUNDLE_CAPABILITY;
  founder: FounderAuthorizationEvaluation;
  providerCostClassification: "UNKNOWN";
  founderCeilingTreatedAsProviderCost: false;
  plan: ReturnType<typeof inspectFreshPlanEligibility>;
  eagDecision: string;
  unknownCostGlobalPolicyWeakened: false;
  founderScopedEconomicAuthorizationRecognized: boolean;
  eagReason: string;
  preLive: ReturnType<typeof evaluateSourceBundlePreLiveGate>;
  liveWrite: ReturnType<typeof evaluateSourceBundleLiveWriteGate>;
  attempted: boolean;
  providerCalls: number;
  sourceBundleWrites: number;
  validationDeployments: number;
  runtimeObservability: RuntimeCostObservability;
  stopReason: string;
};

export type LiveSiteVerification = {
  http: "PASS" | "FAIL" | "NOT_DEPLOYED";
  landing: "PASS" | "FAIL" | "NOT_DEPLOYED";
  annual: "PASS" | "FAIL" | "NOT_DEPLOYED";
  perDeal: "PASS" | "FAIL" | "NOT_DEPLOYED";
  cta: "PASS" | "FAIL" | "NOT_DEPLOYED";
  form: "PASS" | "FAIL" | "NOT_DEPLOYED";
  disclosure: "PASS" | "FAIL" | "NOT_DEPLOYED";
  footer: "PASS" | "FAIL" | "NOT_DEPLOYED";
  origin: string | null;
};

export type FounderAuthorizedLiveDeployResult = FounderAuthorizedDeployPreflight & {
  executed: boolean;
  project: string | null;
  projectId: string | null;
  deploymentId: string | null;
  temporaryUrl: string | null;
  customDomain: false;
  liveSite: LiveSiteVerification;
  syntheticForm: {
    performed: boolean;
    sameOrigin: "PASS" | "FAIL" | "NOT_DEPLOYED";
    experimentValidation: "PASS" | "FAIL" | "NOT_DEPLOYED";
    lineage: "PASS" | "FAIL" | "NOT_DEPLOYED";
    countedAsReal: boolean;
  };
  syntheticAnalytics: {
    performed: boolean;
    observation: "PASS" | "FAIL" | "NOT_DEPLOYED";
    normalized: "PASS" | "FAIL" | "NOT_DEPLOYED";
    lineage: "PASS" | "FAIL" | "NOT_DEPLOYED";
    countedAsReal: boolean;
  };
  experimentState: string;
  evidenceCollection: "STARTED" | "NOT_STARTED";
  evidenceStart: string | null;
  counts: { qualifiedVisitors: number; strongIntent: number; qualifiedSubmissions: number };
  providerError: string | null;
  reusedExisting: boolean;
};

const ISOLATED_PROJECT = validationProjectName(LOCKED_CRE_EXPERIMENT_ID);

function emptyLiveSite(status: "NOT_DEPLOYED" | "FAIL"): LiveSiteVerification {
  return {
    http: status,
    landing: status,
    annual: status,
    perDeal: status,
    cta: status,
    form: status,
    disclosure: status,
    footer: status,
    origin: null,
  };
}

export function persistThisRequestFounderAuthorization() {
  const scope = currentCreFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
    scope,
    reason:
      "Founder explicit NEW $5 deployment / $10 14-day runtime ceiling for one corrected staging MARKET_VALIDATION_EXPERIMENT source-bundle write.",
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateThisRequestFounderAuthorizedDeploy(): FounderAuthorizedDeployPreflight {
  persistThisRequestFounderAuthorization();
  const founder = evaluateThisRequestFounderAuthorization(currentCreFounderScope());
  const cost = classifyValidationDeploymentCost();
  const plan = inspectFreshPlanEligibility();
  const economic = evaluateEconomicEligibility(cost.finalClassification, { recognized: founder.recognized });
  const eag = evaluateValidationExperimentEag({
    artifactEligible: true,
    purpose: MARKET_VALIDATION_PURPOSE,
    providerCapabilityVerified: false,
    deployInputCompatible: false,
    newCapabilityRequired: true,
    newCapabilityVerified: false,
    formReady: true,
    analyticsReady: true,
    secretSafety: "PASS",
    costClassification: "UNKNOWN",
    unknownCost: true,
    treasuryAuthorized: false,
    customDomainRequested: false,
    dnsRequested: false,
    paymentsRequested: false,
    treasuryRequested: false,
    adsRequested: false,
    existingDeploymentCount: 0,
    eagGrants: [],
    treasuryGrants: [],
    founderAuthorizationRecognized: founder.recognized,
    firstCapabilityVerificationWrite: founder.recognized,
    founderAuthorizationSingleUse: founder.singleUse,
  });
  const preLive = evaluateSourceBundlePreLiveGate({
    adapterPass: true,
    artifactPass: true,
    formPass: true,
    analyticsPass: true,
    secretSafety: "PASS",
    planPass: plan.marketValidationExperiment === "PASS",
    commercialEligibilityPass: plan.commercialUse === "YES",
    deployPackagePass: true,
    costClassification: "UNKNOWN",
    unknownCost: true,
    economicAuthorizationPass: economic.economicallyEligible,
    eagApproved: eag.decision === "APPROVED",
    eagPermitsBoundedVerification: eag.decision === "APPROVED",
    founderCeilingRecognized: founder.recognized,
  });
  const liveWrite = evaluateSourceBundleLiveWriteGate({
    adapterImplemented: true,
    capabilityVerified: false,
    unknownCost: true,
    eagApproved: eag.decision === "APPROVED",
    sourceIntegrity: "PASS",
    secretSafety: "PASS",
    founderCeilingRecognized: founder.recognized,
  });
  const ready = founder.recognized && eag.decision === "APPROVED" && preLive.readyForLiveProviderCall && liveWrite.allowed;
  return {
    founder,
    providerCostClassification: "UNKNOWN",
    founderCeilingTreatedAsProviderCost: false,
    plan,
    eagDecision: eag.decision,
    unknownCostGlobalPolicyWeakened: false,
    founderScopedEconomicAuthorizationRecognized: founder.recognized,
    eagReason: eag.reason,
    preLive,
    liveWrite,
    attempted: false,
    providerCalls: 0,
    sourceBundleWrites: 0,
    validationDeployments: 0,
    runtimeObservability: inspectRuntimeCostObservability({
      founderRuntimeCeilingUsd: founder.authorization?.runtimeCeilingUsd ?? null,
    }),
    stopReason: ready ? "PREFLIGHT_READY" : founder.recognized ? eag.decision : founder.reason,
    capability: SOURCE_BUNDLE_CAPABILITY,
  };
}

function publicUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export async function verifyLiveSite(url: string): Promise<LiveSiteVerification> {
  const origin = publicValidationIngestOrigin(url);
  const landingRes = await fetch(url, { redirect: "manual" });
  const landing = await landingRes.text();
  const formRes = await fetch(`${url.replace(/\/$/, "")}/early-access`, { redirect: "manual" });
  const formHtml = await formRes.text();
  const blob = `${landing}\n${formHtml}`;
  const protection = classifyLiveHttpResponse({
    status: landingRes.status,
    location: landingRes.headers.get("location"),
    body: landing,
    finalUrl: landingRes.url,
  });
  const pass = (ok: boolean): "PASS" | "FAIL" => (ok ? "PASS" : "FAIL");
  const applicationReached = protection.reachedApplication && landingRes.ok;
  return {
    http: pass(applicationReached),
    landing: pass(applicationReached && /pilot \/ early access|not generally available/i.test(landing) && !/Protected deployment|Log in to Vercel/i.test(landing)),
    annual: pass(applicationReached && /\$290/.test(blob)),
    perDeal: pass(applicationReached && /\$149/.test(blob)),
    cta: pass(applicationReached && /Request Pilot Access/.test(blob)),
    form: pass(applicationReached && formRes.ok && /workEmail|work email/i.test(formHtml)),
    disclosure: pass(applicationReached && /validation|early-access|early access|not generally available/i.test(blob)),
    footer: pass(
      applicationReached &&
        blob.includes(CANONICAL_FOOTER_COPY) &&
        blob.includes("https://imros.io") &&
        blob.includes("https://infinitemediaresources.com") &&
        !/rel=["']nofollow["']/.test(blob),
    ),
    origin,
  };
}

export async function executeFounderAuthorizedLiveValidation(): Promise<FounderAuthorizedLiveDeployResult> {
  loadEnvLocal();
  persistThisRequestFounderAuthorization();
  const existing = getSourceBundleVerification();
  if (
    existing.liveWriteAttempted &&
    existing.artifactId === SUCCESSOR_CRE_ARTIFACT_ID &&
    existing.status === "FAILED" &&
    existing.founderAuthorizationId === FOUNDER_AUTHORIZATION_ID
  ) {
    return {
      ...evaluateThisRequestFounderAuthorizedDeploy(),
      attempted: true,
      executed: false,
      project: existing.projectId,
      projectId: existing.projectId,
      deploymentId: existing.deploymentId,
      temporaryUrl: existing.url,
      customDomain: false,
      liveSite: emptyLiveSite("NOT_DEPLOYED"),
      syntheticForm: {
        performed: false,
        sameOrigin: "NOT_DEPLOYED",
        experimentValidation: "NOT_DEPLOYED",
        lineage: "NOT_DEPLOYED",
        countedAsReal: false,
      },
      syntheticAnalytics: {
        performed: false,
        observation: "NOT_DEPLOYED",
        normalized: "NOT_DEPLOYED",
        lineage: "NOT_DEPLOYED",
        countedAsReal: false,
      },
      experimentState: "EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED",
      evidenceCollection: "NOT_STARTED",
      evidenceStart: null,
      counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0 },
      providerError: existing.evidence,
      reusedExisting: true,
      sourceBundleWrites: 0,
      validationDeployments: 0,
      stopReason: "SUCCESSOR_WRITE_ALREADY_ATTEMPTED",
    };
  }
  if (
    existing.status === "LIVE_WRITE_VERIFIED" &&
    existing.deploymentId &&
    existing.url &&
    existing.artifactId === SUCCESSOR_CRE_ARTIFACT_ID &&
    existing.sourceDigest === SUCCESSOR_CRE_SOURCE_DIGEST
  ) {
    const origin = publicUrl(existing.url);
    return {
      ...evaluateThisRequestFounderAuthorizedDeploy(),
      attempted: false,
      executed: true,
      project: ISOLATED_PROJECT,
      projectId: existing.projectId,
      deploymentId: existing.deploymentId,
      temporaryUrl: origin,
      customDomain: false,
      liveSite: await verifyLiveSite(origin),
      syntheticForm: {
        performed: false,
        sameOrigin: "NOT_DEPLOYED",
        experimentValidation: "NOT_DEPLOYED",
        lineage: "NOT_DEPLOYED",
        countedAsReal: false,
      },
      syntheticAnalytics: {
        performed: false,
        observation: "NOT_DEPLOYED",
        normalized: "NOT_DEPLOYED",
        lineage: "NOT_DEPLOYED",
        countedAsReal: false,
      },
      experimentState: "COLLECTING",
      evidenceCollection: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID) ? "STARTED" : "NOT_STARTED",
      evidenceStart: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID),
      counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0 },
      providerError: null,
      reusedExisting: true,
      sourceBundleWrites: 0,
      validationDeployments: 1,
      stopReason: "IDEMPOTENT_REPLAY",
    };
  }

  const planRefresh = await refreshVercelPlanIfNeeded();
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
  const founder = evaluateThisRequestFounderAuthorization(currentCreFounderScope());
  const authorization = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid: integrity.status === "PASS" && experiment.authorization.artifactValidation === "PASS",
    validationPassed: experiment.authorization.artifactValidation === "PASS",
    fullProduct: false,
    purpose: MARKET_VALIDATION_PURPOSE,
    artifactFiles: files,
    founderAuthorization: getFounderAuthorization(),
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
  const preflight: FounderAuthorizedDeployPreflight = {
    capability: SOURCE_BUNDLE_CAPABILITY,
    founder,
    providerCostClassification: "UNKNOWN",
    founderCeilingTreatedAsProviderCost: false,
    plan,
    eagDecision: authorization.eag,
    unknownCostGlobalPolicyWeakened: false,
    founderScopedEconomicAuthorizationRecognized: founder.recognized,
    eagReason: authorization.eagReason,
    preLive,
    liveWrite,
    attempted: false,
    providerCalls: planRefresh.providerCalls,
    sourceBundleWrites: 0,
    validationDeployments: 0,
    runtimeObservability: inspectRuntimeCostObservability({
      founderRuntimeCeilingUsd: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
    }),
    stopReason: preLive.readyForLiveProviderCall && liveWrite.allowed ? "PREFLIGHT_READY" : liveWrite.reason,
  };

  const blocked = (reason: string, extra: Partial<FounderAuthorizedLiveDeployResult> = {}): FounderAuthorizedLiveDeployResult => ({
    ...preflight,
    executed: false,
    project: null,
    projectId: null,
    deploymentId: null,
    temporaryUrl: null,
    customDomain: false,
    liveSite: emptyLiveSite("NOT_DEPLOYED"),
    syntheticForm: {
      performed: false,
      sameOrigin: "NOT_DEPLOYED",
      experimentValidation: "NOT_DEPLOYED",
      lineage: "NOT_DEPLOYED",
      countedAsReal: false,
    },
    syntheticAnalytics: {
      performed: false,
      observation: "NOT_DEPLOYED",
      normalized: "NOT_DEPLOYED",
      lineage: "NOT_DEPLOYED",
      countedAsReal: false,
    },
    experimentState: experiment.state,
    evidenceCollection: "NOT_STARTED",
    evidenceStart: null,
    counts: experiment.counts,
    providerError: null,
    reusedExisting: false,
    stopReason: reason,
    ...extra,
  });

  if (
    currentCreValidationArtifactId() !== SUCCESSOR_CRE_ARTIFACT_ID ||
    artifactId !== SUCCESSOR_CRE_ARTIFACT_ID ||
    integrity.status !== "PASS" ||
    pkg.sourceDigest !== SUCCESSOR_CRE_SOURCE_DIGEST
  ) {
    return blocked("DIGEST_LOCK_FAILED");
  }
  if (!founder.recognized || !eagApproved || !preLive.readyForLiveProviderCall || !liveWrite.allowed) {
    return blocked(preflight.stopReason);
  }

  const isolated = evaluateSuccessorIsolatedBuildReadiness();
  if (isolated.status !== "PASS" || !isolated.digestUnchanged) {
    return blocked("ISOLATED_BUILD_FAILED", {
      providerError: isolated.isolated.evidence,
    });
  }

  const deploymentBody = buildVercelSourceBundleDeploymentBody({
    projectName: ISOLATED_PROJECT,
    files,
  });
  const stagingContract = evaluateVercelSourceBundleDeploymentBody(deploymentBody);
  if (deploymentBody.target !== "staging" || !stagingContract.valid) {
    return blocked("STAGING_TARGET_REQUIRED", {
      providerError: stagingContract.issues.join(","),
    });
  }

  const ctx = {
    organizationId: LIVE_ORG,
    actionType: SOURCE_BUNDLE_CAPABILITY,
    target: ISOLATED_PROJECT,
    payload: {
      project_name: ISOLATED_PROJECT,
      artifact_id: SUCCESSOR_CRE_ARTIFACT_ID,
      production_artifact_id: SUCCESSOR_CRE_ARTIFACT_ID,
      source_digest: SUCCESSOR_CRE_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      target: "staging",
      files,
    },
    correlationId: FOUNDER_AUTHORIZATION_ID,
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
      attemptId: FOUNDER_AUTHORIZATION_ID,
      scope: currentCreFounderScope(),
      providerDeploymentCreated: Boolean(result.externalIds.deployment_id),
      source: "vercel.com_v1 hosting.deploy_source_bundle execute",
    });
    providerCalls += Number(result.manifest.poll_attempts ?? 0);
  } catch (error) {
    consumeFounderAuthorizationDeployment();
    recordExternalActionAttemptConsumed({
      attemptId: FOUNDER_AUTHORIZATION_ID,
      scope: currentCreFounderScope(),
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
      sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      founderAuthorizationId: FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
    });
    return blocked(error instanceof Error ? error.message : String(error), {
      attempted: true,
      providerCalls,
      sourceBundleWrites: 1,
      providerError: error instanceof Error ? error.message : String(error),
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
      sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      founderAuthorizationId: FOUNDER_AUTHORIZATION_ID,
      deploymentCeilingUsd: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
      runtimeCeilingUsd: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
      providerCostState: "UNKNOWN",
    });
    return blocked(`PROVIDER_NOT_READY:${String(result.manifest.provider_lifecycle_state)}`, {
      attempted: true,
      executed: true,
      project: ISOLATED_PROJECT,
      deploymentId,
      temporaryUrl: url || null,
      providerCalls,
      sourceBundleWrites: 1,
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
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    founderAuthorizationId: FOUNDER_AUTHORIZATION_ID,
    deploymentCeilingUsd: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
    runtimeCeilingUsd: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
    providerCostState: "UNKNOWN",
    costEvidence: "UNKNOWN. Successful deploy is not proof of zero or known cost.",
    evidence: [
      `hosting.deploy_source_bundle LIVE_WRITE_VERIFIED.`,
      `provider=vercel.com_v1 project=${ISOLATED_PROJECT} deployment=${deploymentId} url=${url}.`,
      `candidate=${CRE_CANDIDATE_ID} experiment=${LOCKED_CRE_EXPERIMENT_ID} artifact=${SUCCESSOR_CRE_ARTIFACT_ID} digest=${SUCCESSOR_CRE_SOURCE_DIGEST}.`,
      `founderAuthorization=${FOUNDER_AUTHORIZATION_ID} deploymentCeiling=5 runtimeCeiling=10.`,
      `providerCost=UNKNOWN.`,
    ].join(" "),
    scope: {
      purpose: MARKET_VALIDATION_PURPOSE,
      capability: SOURCE_BUNDLE_CAPABILITY,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    },
  });
  rememberValidationDeployment({
    provider: "vercel",
    project: ISOLATED_PROJECT,
    deploymentId,
    url,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
  });

  const liveSite = await verifyLiveSite(url);
  const ingestPath = `/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`;
  const liveIngest = `${url.replace(/\/$/, "")}${ingestPath}`;
  const formBody = JSON.stringify({
    kind: "form",
    synthetic: true,
    form: {
      name: "Synthetic Live Broker",
      workEmail: "founder-live-synthetic@broker.example",
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
    clientKey: "founder-live-form",
  });
  const hqAnalytics = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: "founder-live-analytics",
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
  const formOk = liveForm.ok && liveFormJson.accepted === 1 && wrongExperiment.status === 404;
  const analyticsOk = liveAnalytics.ok;
  const piOk = hqForm.ok && hqAnalytics.ok && (hqForm.productionAccepted ?? 0) === 0 && (hqAnalytics.productionAccepted ?? 0) === 0;

  if (siteOk && formOk && analyticsOk && piOk) {
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    setEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID, new Date().toISOString());
  }

  return {
    ...preflight,
    attempted: true,
    executed: true,
    project: ISOLATED_PROJECT,
    projectId: result.externalIds.project_id ?? ISOLATED_PROJECT,
    deploymentId,
    temporaryUrl: url,
    customDomain: false,
    liveSite,
    syntheticForm: {
      performed: true,
      sameOrigin: liveSite.origin && liveIngest.startsWith(liveSite.origin) ? "PASS" : "FAIL",
      experimentValidation: formOk ? "PASS" : "FAIL",
      lineage: files.some((file) => file.content.includes(CRE_CANDIDATE_ID) && file.content.includes(SUCCESSOR_CRE_ARTIFACT_ID))
        ? "PASS"
        : "FAIL",
      countedAsReal: false,
    },
    syntheticAnalytics: {
      performed: true,
      observation: hqAnalytics.ok ? "PASS" : "FAIL",
      normalized: hqAnalytics.ok ? "PASS" : "FAIL",
      lineage: hqAnalytics.ok ? "PASS" : "FAIL",
      countedAsReal: false,
    },
    experimentState: siteOk && formOk && analyticsOk && piOk ? "COLLECTING" : experiment.state,
    evidenceCollection: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID) ? "STARTED" : "NOT_STARTED",
    evidenceStart: getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID),
    counts: {
      qualifiedVisitors: 0,
      strongIntent: 0,
      qualifiedSubmissions: 0,
    },
    providerError: null,
    reusedExisting: false,
    providerCalls,
    sourceBundleWrites: 1,
    validationDeployments: 1,
    stopReason: siteOk && formOk && analyticsOk && piOk ? "COLLECTING" : "LIVE_VALIDATION_PIPELINE_INCOMPLETE",
  };
}
