import {
  evaluateBuildAuthorization,
  evaluateValidationArtifactAuthorization,
  executeGovernedVentureBuild,
} from "@/lib/infinity/venture-build-orchestration";
import { analyzeExperiment, assertCriteriaLocked } from "./analyze";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import { compileCreValidationArtifactInput, compileMarketValidationExperiment, experimentIdempotencyKey } from "./compile";
import {
  CRE_CANDIDATE_ID,
  EXPERIMENT_VERSION,
  MARKET_VALIDATION_PURPOSE,
  WRITE_BOUNDARY,
} from "./constants";
import { evaluateExperimentPreDeployGate } from "./deploy";
import { countProductionEvidence, ingestExperimentEvents } from "./events";
import { inspectHostingProviderCapability } from "./provider-capability";
import { experimentRoomPresence } from "./rooms";
import { resetExperimentRuntimeStates, setExperimentRuntimeState } from "./runtime-state";
import { getSourceBundleVerification, persistSourceBundleVerification, resetSourceBundleVerification } from "./source-bundle-verification";
import { resetEconomicReadVerification } from "./economic-read-verification";
import { getFounderAuthorization, resetFounderAuthorization } from "./founder-authorization";
import { resetActivePublicValidationArtifact } from "./active-public-artifact";
import { resetIsolatedArtifactVerification } from "./isolated-artifact-verification";
import type {
  ExperimentEventRecord,
  ExperimentExecutionResult,
  MarketValidationExperiment,
  ValidationArtifactDeploymentAuthorization,
} from "./types";

type RecordedDeployment = {
  provider: "vercel";
  project: string;
  deploymentId: string;
  url: string;
  artifactId: string;
  experimentId: string;
};

const compiled = new Map<string, MarketValidationExperiment>();
const active = new Map<string, string>();
const deployments = new Map<string, RecordedDeployment>();

function deploymentKey(experimentId: string, artifactId: string, purpose: string): string {
  return [experimentId, artifactId, purpose].join(":");
}

export function rememberValidationDeployment(row: RecordedDeployment): RecordedDeployment {
  const key = deploymentKey(row.experimentId, row.artifactId, MARKET_VALIDATION_PURPOSE);
  const existing = deployments.get(key);
  if (existing) return existing;
  deployments.set(key, row);
  return row;
}

export function resetExperimentRuntime(): void {
  compiled.clear();
  active.clear();
  deployments.clear();
  resetExperimentRuntimeStates();
  resetSourceBundleVerification();
  resetEconomicReadVerification();
  resetFounderAuthorization();
  resetIsolatedArtifactVerification();
  resetActivePublicValidationArtifact();
}

export function compileIdempotentExperiment(candidateId = CRE_CANDIDATE_ID): MarketValidationExperiment {
  const key = experimentIdempotencyKey(candidateId, EXPERIMENT_VERSION);
  const existing = compiled.get(key);
  if (existing) return existing;
  const experiment = compileMarketValidationExperiment({ candidateId });
  compiled.set(key, experiment);
  return experiment;
}

function authorize(input: {
  candidateId: string;
  experimentId: string;
  artifactId: string;
  artifactValid: boolean;
  fullProduct: boolean;
  files?: Array<{ path: string; content: string }>;
}): ValidationArtifactDeploymentAuthorization {
  return evaluateValidationArtifactDeploymentAuthorization({
    candidateId: input.candidateId,
    experimentId: input.experimentId,
    artifactId: input.artifactId,
    artifactValid: input.artifactValid,
    validationPassed: input.artifactValid,
    fullProduct: input.fullProduct,
    purpose: MARKET_VALIDATION_PURPOSE,
    requiredCapability: "hosting.deploy_source_bundle",
    artifactFiles: input.files,
    existingDeploymentCount: deployments.get(deploymentKey(input.experimentId, input.artifactId, MARKET_VALIDATION_PURPOSE))
      ? 1
      : 0,
    providerCapability: inspectHostingProviderCapability(),
    founderAuthorization: getFounderAuthorization(),
  });
}

export async function executeMarketValidationExperiment(input: {
  candidateId?: string;
  events?: ExperimentEventRecord[];
  persist?: boolean;
} = {}): Promise<ExperimentExecutionResult> {
  const candidateId = input.candidateId ?? CRE_CANDIDATE_ID;
  const lockKey = experimentIdempotencyKey(candidateId, EXPERIMENT_VERSION);
  if (active.has(lockKey)) {
    const experiment = compileIdempotentExperiment(candidateId);
    return emptyBlockedResult(experiment, "ALREADY_BUILDING");
  }

  active.set(lockKey, lockKey);
  try {
    const experiment = compileIdempotentExperiment(candidateId);
    if (!assertCriteriaLocked(experiment.minimumEvidence)) {
      throw new Error("success_criteria_mutated");
    }

    const compile = compileCreValidationArtifactInput({
      candidateId,
      ventureId: experiment.ventureId,
    });
    const fullProduct = evaluateBuildAuthorization(compile);
    const artifactAuth = evaluateValidationArtifactAuthorization(compile);
    const artifactResult = await executeGovernedVentureBuild({ compile });
    const artifactValid = Boolean(artifactResult.validation?.passed && artifactResult.artifact);
    const artifactId = artifactResult.artifact?.artifactId ?? "";
    const replay = deployments.get(deploymentKey(experiment.experimentId, artifactId, MARKET_VALIDATION_PURPOSE));
    const ingested = ingestExperimentEvents({ events: input.events ?? [] });
    const counts = countProductionEvidence(ingested.productionEvents);
    const authorization = authorize({
      candidateId,
      experimentId: experiment.experimentId,
      artifactId,
      artifactValid,
      fullProduct: fullProduct.result === "AUTHORIZED_BUILD",
      files: artifactResult.artifact?.files,
    });
    const existingVerification = getSourceBundleVerification();
    if (!existingVerification.liveWriteAttempted && existingVerification.status !== "LIVE_WRITE_VERIFIED") {
      persistSourceBundleVerification({
        status: "UNVERIFIED",
        timestamp: null,
        liveWriteAttempted: false,
        providerCalls: 0,
        accountTeamConfigured: Boolean(inspectHostingProviderCapability().accountScope.teamConfigured),
        evidence:
          "Adapter implements hosting.deploy_source_bundle. Live write was not attempted because cost remains UNKNOWN and EAG did not approve.",
        costEvidence: authorization.costClassification,
        sourceDigest: null,
      });
    }
    const gate = evaluateExperimentPreDeployGate({
      candidateDecision: "VALIDATE",
      validationArtifactAuthorized: artifactAuth.result === "AUTHORIZED_VALIDATION_ARTIFACT",
      fullProductAuthorized: fullProduct.result === "AUTHORIZED_BUILD",
      artifactValid,
      artifactId,
      candidateId,
      experimentId: experiment.experimentId,
      artifactFiles: artifactResult.artifact?.files,
      existingDeploymentCount: replay ? 1 : 0,
    });

    const deployed = Boolean(replay);
    const analysis = analyzeExperiment({
      counts,
      criteria: experiment.minimumEvidence,
      startedAt: new Date().toISOString(),
      now: new Date().toISOString(),
      deployed,
    });

    const state = !artifactValid
      ? "FAILED"
      : deployed
        ? "COLLECTING"
        : authorization.approved && gate.ok
          ? "READY_FOR_EXTERNAL_AUTHORIZATION"
          : "EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED";

    const next: MarketValidationExperiment = {
      ...experiment,
      runtimeState: state,
      completionState: state,
      result: analysis.outcome,
      confidence: analysis.confidence,
      wtpEvidence: analysis.wtp,
      traceability: {
        ...experiment.traceability,
        artifactId: artifactId || null,
        planId: artifactResult.plan.planId,
      },
      externalActions: {
        ...experiment.externalActions,
        validationDeployments: replay ? 1 : 0,
      },
    };
    compiled.set(lockKey, next);
    setExperimentRuntimeState(experiment.experimentId, state);

    return {
      experiment: next,
      fullProductAuthorization: fullProduct.result,
      validationArtifactAuthorization: artifactAuth.result,
      buildReady: false,
      decision: "VALIDATE",
      artifactResult,
      artifact: artifactResult.artifact,
      artifactValidation: artifactResult.validation,
      handoff: artifactResult.handoff,
      deploymentReadiness: artifactResult.deploymentReadiness,
      preDeployGate: gate,
      deployed,
      provider: replay?.provider ?? null,
      project: replay?.project ?? null,
      deploymentId: replay?.deploymentId ?? null,
      url: replay?.url ?? null,
      customDomain: false,
      state,
      evidenceCollection: deployed ? "STARTED" : "NOT_STARTED",
      counts,
      outcome: analysis.outcome,
      wtpEvidence: analysis.wtp,
      observedPayment: false,
      fakeRevenue: false,
      fakeCustomer: false,
      fakePayment: false,
      readyForFirstRealAutonomousBuild: false,
      fullProductBuildExecuted: false,
      rooms: experimentRoomPresence(artifactResult.tasks),
      trafficPlanCompiled: true,
      trafficPlanExecuted: false,
      writeBoundary: WRITE_BOUNDARY,
      authorization,
      deploymentCount: replay ? 1 : 0,
      blocker: authorization.blocker,
    };
  } finally {
    active.delete(lockKey);
  }
}

function emptyBlockedResult(
  experiment: MarketValidationExperiment,
  reason: string,
): ExperimentExecutionResult {
  void reason;
  const authorization = authorize({
    candidateId: experiment.candidateId,
    experimentId: experiment.experimentId,
    artifactId: experiment.traceability.artifactId ?? "",
    artifactValid: false,
    fullProduct: false,
  });
  setExperimentRuntimeState(experiment.experimentId, "BLOCKED");
  return {
    experiment: { ...experiment, runtimeState: "BLOCKED", completionState: "BLOCKED" },
    fullProductAuthorization: "VALIDATION_REQUIRED",
    validationArtifactAuthorization: "ALREADY_BUILDING",
    buildReady: false,
    decision: "VALIDATE",
    artifactResult: null,
    artifact: null,
    artifactValidation: null,
    handoff: null,
    deploymentReadiness: null,
    preDeployGate: evaluateExperimentPreDeployGate({
      candidateDecision: "VALIDATE",
      validationArtifactAuthorized: false,
      fullProductAuthorized: false,
      artifactValid: false,
      candidateId: experiment.candidateId,
      experimentId: experiment.experimentId,
      artifactId: experiment.traceability.artifactId,
    }),
    deployed: false,
    provider: null,
    project: null,
    deploymentId: null,
    url: null,
    customDomain: false,
    state: "BLOCKED",
    evidenceCollection: "NOT_STARTED",
    counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0, pricingSelections: 0, pageViews: 0 },
    outcome: "INCONCLUSIVE",
    wtpEvidence: "NONE",
    observedPayment: false,
    fakeRevenue: false,
    fakeCustomer: false,
    fakePayment: false,
    readyForFirstRealAutonomousBuild: false,
    fullProductBuildExecuted: false,
    rooms: [],
    trafficPlanCompiled: true,
    trafficPlanExecuted: false,
    writeBoundary: WRITE_BOUNDARY,
    authorization,
    deploymentCount: 0,
    blocker: authorization.blocker,
  };
}
