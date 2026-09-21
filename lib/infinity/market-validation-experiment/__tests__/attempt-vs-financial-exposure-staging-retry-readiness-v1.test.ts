import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { evaluateVercelDeploymentTarget } from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-target";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "../constants";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import { resetExperimentRuntime } from "../execute";
import { getFounderAuthorization, resetFounderAuthorization } from "../founder-authorization";
import { persistEconomicReadVerification, resetEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import {
  evaluateNewAttemptAuthorizationRequired,
  getLastSuccessorAttemptGovernance,
  inspectDeploymentFinancialExposure,
  inspectExternalActionAuthorization,
  inspectFinancialUtilization,
  inspectProviderCostObservation,
  inspectRuntimeFinancialExposure,
  resetAttemptFinancialExposureGovernance,
  successfulActionDoesNotProveSpend,
} from "../attempt-financial-exposure";
import { evaluateRuntimeAuthorizationState } from "../runtime-authorization-state";
import { evaluateSuccessorStagingRetryReadiness } from "../staging-retry-readiness";
import { evaluateSuccessorIsolatedBuildReadiness } from "../successor-isolated-evidence";
import { classifyValidationDeploymentCost } from "../cost";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";

function persistPro() {
  persistEconomicReadVerification({
    liveReadAttempted: true,
    planStatus: "READ_ONLY_VERIFIED",
    timestamp: new Date().toISOString(),
    snapshot: {
      ...getEconomicReadVerification().snapshot,
      plan: {
        teamId: "team_expected",
        teamSlug: "infinity-test",
        plan: "pro",
        billingPeriod: null,
        source: "GET /v2/teams/{teamId}",
      },
    },
  });
}

describe("ATTEMPT VS FINANCIAL EXPOSURE GOVERNANCE + STAGING RETRY READINESS V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetEconomicReadVerification();
    resetAttemptFinancialExposureGovernance();
  });

  it("keeps attempt, financial exposure, runtime, and observed cost as separate states", () => {
    const last = getLastSuccessorAttemptGovernance();
    expect(last.attempt.kind).toBe("EXTERNAL_ACTION_AUTHORIZATION");
    expect(inspectDeploymentFinancialExposure().kind).toBe("FINANCIAL_EXPOSURE_AUTHORIZATION");
    expect(inspectRuntimeFinancialExposure().kind).toBe("RUNTIME_EXPOSURE_AUTHORIZATION");
    expect(last.runtimeExposure.kind).toBe("RUNTIME_EXPOSURE_AUTHORIZATION");
    expect(inspectProviderCostObservation().kind).toBe("PROVIDER_COST_OBSERVATION");
    expect(last.attempt.kind).not.toBe(last.deploymentExposure.kind);
    expect(last.deploymentExposure.kind).not.toBe(last.runtimeExposure.kind);
    expect(last.runtimeExposure.kind).not.toBe(last.costObservation.kind);
  });

  it("records the last successor write as a consumed attempt with UNKNOWN spend", () => {
    const last = getLastSuccessorAttemptGovernance();
    expect(last.externalAttemptExecuted).toBe(true);
    expect(last.attempt.state).toBe("CONSUMED");
    expect(last.attempt.executionsConsumed).toBe(1);
    expect(last.providerDeploymentCreated).toBe(false);
    expect(last.utilization.authorizationCeiling).toBe(5);
    expect(last.utilization.observedSpend).toBe("UNKNOWN");
    expect(last.utilization.utilization).toBe("UNKNOWN");
    expect(last.fiveDollarsRecordedAsActualSpend).toBe(false);
    expect(inspectFinancialUtilization().ceilingRecordedAsActualSpend).toBe(false);
    expect(inspectExternalActionAuthorization().state).toBe("CONSUMED");
    expect(classifyValidationDeploymentCost().finalClassification).toBe("UNKNOWN");
    expect(inspectProviderCostObservation().classification).toBe("UNKNOWN");
    expect(inspectProviderCostObservation().observedAmount).toBeNull();
  });

  it("does not activate runtime exposure or treat a successful action as zero cost", () => {
    expect(inspectRuntimeFinancialExposure().activationState).toBe("NOT_ACTIVATED");
    expect(getLastSuccessorAttemptGovernance().runtimeActivated).toBe(false);
    expect(evaluateRuntimeAuthorizationState().activated).toBe(false);
    const afterSuccess = successfulActionDoesNotProveSpend({
      deploymentReady: true,
      observedAmount: null,
    });
    expect(afterSuccess.classification).toBe("UNKNOWN");
    expect(afterSuccess.successDoesNotProveZeroCost).toBe(true);
    expect(afterSuccess.successDoesNotConsumeCeiling).toBe(true);
  });

  it("requires a new explicit attempt and financial authorization for the staging retry", () => {
    const next = evaluateNewAttemptAuthorizationRequired();
    expect(next.newAttemptAuthorizationRequired).toBe(true);
    expect(next.newFinancialExposureAuthorizationRequired).toBe(true);
    expect(next.previousAttemptReusable).toBe(false);
    expect(next.previousFinancialApprovalInferred).toBe(false);
    expect(next.founderRecognized).toBe(false);
    expect(next.reason).toBe(NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED);
  });

  it("rejects preview and accepts staging before any provider write", async () => {
    expect(evaluateVercelDeploymentTarget("preview").valid).toBe(false);
    expect(evaluateVercelDeploymentTarget("preview").reason).toBe("VERCEL_TARGET_PREVIEW_FORBIDDEN");
    expect(evaluateVercelDeploymentTarget("staging").valid).toBe(true);
    expect(evaluateVercelDeploymentTarget("production").valid).toBe(true);
    const staging = buildVercelSourceBundleDeploymentBody({
      projectName: "infinity-validation-cre-lease-npv-e72beb7b",
      files: [{ path: "app/page.tsx", content: "ok" }],
    });
    expect(staging.target).toBe("staging");
    expect(evaluateVercelSourceBundleDeploymentBody(staging).valid).toBe(true);
    const previewBody = { ...staging, target: "preview" as "staging" };
    expect(evaluateVercelSourceBundleDeploymentBody(previewBody).valid).toBe(false);
    expect(evaluateVercelSourceBundleDeploymentBody(previewBody).issues).toContain("VERCEL_TARGET_PREVIEW_FORBIDDEN");
    const rejected = await vercelAdapter.validate({
      organizationId: "org",
      actionType: SOURCE_BUNDLE_CAPABILITY,
      target: "infinity-validation-cre-lease-npv-e72beb7b",
      payload: {
        production_artifact_id: SUCCESSOR_CRE_ARTIFACT_ID,
        source_digest: SUCCESSOR_CRE_SOURCE_DIGEST,
        source_type: "GENERATED_FILE_TREE",
        files: [{ path: "app/page.tsx", content: "ok" }],
        target: "preview",
      },
      correlationId: null,
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.issues).toContain("VERCEL_TARGET_PREVIEW_FORBIDDEN");
  });

  it("dry-verifies the successor staging request and blocks on new founder authorization", async () => {
    persistPro();
    expect(currentCreValidationArtifactId()).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const isolated = evaluateSuccessorIsolatedBuildReadiness();
    expect(isolated.status).toBe("PASS");
    expect(isolated.digestUnchanged).toBe(true);
    expect(isolated.reusedVerifiedEvidence).toBe(true);
    const ready = await evaluateSuccessorStagingRetryReadiness();
    expect(ready.artifact).toBe("FAIL");
    expect(ready.digest).toBe("FAIL");
    expect(ready.build).toBe("PASS");
    expect(ready.deployablePackage).toBe("FAIL");
    expect(ready.vercelTranslation).toBe("PASS");
    expect(ready.targetStaging).toBe("PASS");
    expect(ready.previewAccepted).toBe(false);
    expect(ready.plan).toBe("PASS");
    expect(ready.commercialEligibility).toBe("PASS");
    expect(ready.form).toBe("PASS");
    expect(ready.analytics).toBe("PASS");
    expect(ready.secretSafety).toBe("PASS");
    expect(ready.founderAuthorization).toBe("FAIL");
    expect(ready.eagBlocker).toBe(NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED);
    expect(ready.technicallyReady).toBe(false);
    expect(ready.providerWrites).toBe(0);
    expect(ready.artifactId).toBe(currentCreValidationArtifactId());
    expect(ready.digestValue).not.toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(ready.mutated).toBe(false);
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(CRE_CANDIDATE_ID).toBe("7e7e924e-0741-4155-a729-8d529da77ea9");
    expect(ready.experimentState).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(ready.evidenceCollection).toBe("NOT_STARTED");
    expect(ready.transport).toBe("PROVEN");
    expect(ready.endToEnd).toBe("NOT_YET_VERIFIED");
    expect(getFounderAuthorization()).toBeNull();
    expect(getLastSuccessorAttemptGovernance().sourceBundleTransport).toBe("PROVEN");
  });

  it("does not regress HQ performance or Money surfaces", () => {
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const consoleSource = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"),
      "utf8",
    );
    const money = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    const load = readFileSync(join(process.cwd(), "lib/infinity/operator-console/load-hq-dashboard.ts"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
    expect(consoleSource).toContain(">HQ Command<");
    expect(consoleSource).toContain("<VentureIntelligencePanel");
    expect(consoleSource).toContain("<CommandChamber");
    expect(consoleSource).toContain("useHqLiveProjection(refresh)");
    expect(money).toContain('money: "Money"');
    expect(load).not.toContain("SNAPSHOT_PREFETCH_LIMIT");
    expect(load).toContain("loadOperatorVentureSnapshot(admin, organizationId, resolvedId)");
  });
});
