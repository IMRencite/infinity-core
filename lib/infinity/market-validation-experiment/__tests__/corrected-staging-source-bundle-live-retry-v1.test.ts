import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { evaluateVercelDeploymentTarget } from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-target";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "../constants";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import { resetExperimentRuntime } from "../execute";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
  FOUNDER_APPROVED_RUNTIME_CEILING_USD,
  FOUNDER_AUTHORIZATION_ID,
  currentCreFounderScope,
  evaluateFounderAuthorization,
  evaluateThisRequestFounderAuthorization,
  lastConsumedSuccessorFounderAuthorization,
  persistFounderAuthorization,
  predecessorConsumedFounderAuthorization,
  resetFounderAuthorization,
} from "../founder-authorization";
import {
  persistThisRequestFounderAuthorization,
  evaluateThisRequestFounderAuthorizedDeploy,
} from "../founder-authorized-deploy";
import { persistEconomicReadVerification, resetEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import {
  getLastSuccessorAttemptGovernance,
  inspectFinancialUtilization,
  successfulActionDoesNotProveSpend,
} from "../attempt-financial-exposure";
import { evaluateRuntimeAuthorizationState } from "../runtime-authorization-state";
import { inspectEagEconomicPolicy } from "../eag-economics";
import { inspectRuntimeCostObservability } from "../runtime-cost-observability";
import { classifyValidationDeploymentCost } from "../cost";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { evaluateSuccessorIsolatedBuildReadiness } from "../successor-isolated-evidence";
import { persistSourceBundleVerification, resetSourceBundleVerification, getSourceBundleVerification } from "../source-bundle-verification";

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

describe("CORRECTED STAGING SOURCE-BUNDLE LIVE RETRY V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetEconomicReadVerification();
    resetSourceBundleVerification();
  });

  it("accepts a new $5/$10 single-use authorization and does not reuse prior IDs", () => {
    const founder = evaluateThisRequestFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(FOUNDER_AUTHORIZATION_ID);
    expect(FOUNDER_AUTHORIZATION_ID).toBe("founder_ceiling_cre_val_5_10_successor_staging_v1");
    expect(founder.authorization?.authorizationId).not.toBe(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.deploymentCeilingUsd).toBe(5);
    expect(founder.authorization?.runtimeCeilingUsd).toBe(10);
    expect(FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD).toBe(5);
    expect(FOUNDER_APPROVED_RUNTIME_CEILING_USD).toBe(10);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.executionsConsumed).toBe(0);
    expect(founder.authorization?.scope).toEqual(currentCreFounderScope());
    expect(founder.authorization?.scope.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(founder.authorization?.scope.artifactDigest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(founder.authorization?.scope.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(founder.authorization?.scope.deploymentPurpose).toBe(MARKET_VALIDATION_PURPOSE);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    const persisted = persistThisRequestFounderAuthorization();
    expect(persisted?.authorizationId).toBe(FOUNDER_AUTHORIZATION_ID);
    expect(evaluateFounderAuthorization({
      authorization: lastConsumedSuccessorFounderAuthorization(),
      requestedScope: currentCreFounderScope(),
    }).recognized).toBe(false);
    expect(evaluateFounderAuthorization({
      authorization: predecessorConsumedFounderAuthorization(),
      requestedScope: currentCreFounderScope(),
    }).recognized).toBe(false);
    persistFounderAuthorization(lastConsumedSuccessorFounderAuthorization());
    const replaced = persistThisRequestFounderAuthorization();
    expect(replaced?.authorizationId).toBe(FOUNDER_AUTHORIZATION_ID);
    expect(replaced?.executionsConsumed).toBe(0);
  });

  it("keeps attempt/spend separate and does not weaken UNKNOWN-cost policy", () => {
    const last = getLastSuccessorAttemptGovernance();
    expect(last.attempt.state).toBe("CONSUMED");
    expect(last.attempt.attemptId).toBe(CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID);
    expect(inspectFinancialUtilization().observedSpend).toBe("UNKNOWN");
    expect(last.fiveDollarsRecordedAsActualSpend).toBe(false);
    expect(evaluateRuntimeAuthorizationState().activated).toBe(false);
    expect(last.runtimeActivated).toBe(false);
    expect(classifyValidationDeploymentCost().finalClassification).toBe("UNKNOWN");
    expect(successfulActionDoesNotProveSpend({ deploymentReady: true, observedAmount: null }).classification).toBe("UNKNOWN");
    const policy = inspectEagEconomicPolicy();
    expect(policy.unknownAllowed).toBe(false);
    expect(policy.policyChanged).toBe(false);
    expect(policy.unknownCostWithExplicitHumanCeiling).toBe(true);
    const runtime = inspectRuntimeCostObservability({ founderRuntimeCeilingUsd: 10 });
    expect(runtime.runtimeCostObservabilityLimited).toBe(true);
    expect(runtime.automaticDollarThresholdEnforcementPossible).toBe(false);
    expect(runtime.providerNativeCostTelemetryAvailable).toBe(false);
  });

  it("locks the successor artifact, staging target, and isolated-build evidence", async () => {
    persistPro();
    expect(currentCreValidationArtifactId()).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const isolated = evaluateSuccessorIsolatedBuildReadiness();
    expect(isolated.status).toBe("PASS");
    expect(isolated.digestUnchanged).toBe(true);
    const body = buildVercelSourceBundleDeploymentBody({
      projectName: "infinity-validation-cre-lease-npv-e72beb7b",
      files: [{ path: "app/page.tsx", content: "ok" }],
    });
    expect(body.target).toBe("staging");
    expect(evaluateVercelSourceBundleDeploymentBody(body).valid).toBe(true);
    expect(evaluateVercelDeploymentTarget("preview").valid).toBe(false);
    expect(evaluateVercelSourceBundleDeploymentBody({ ...body, target: "preview" }).valid).toBe(false);
    const dry = await vercelAdapter.validate({
      organizationId: "org",
      actionType: SOURCE_BUNDLE_CAPABILITY,
      target: "infinity-validation-cre-lease-npv-e72beb7b",
      payload: {
        production_artifact_id: SUCCESSOR_CRE_ARTIFACT_ID,
        source_digest: SUCCESSOR_CRE_SOURCE_DIGEST,
        source_type: "GENERATED_FILE_TREE",
        files: [{ path: "app/page.tsx", content: "ok" }],
        target: "staging",
      },
      correlationId: null,
    });
    expect(dry.valid).toBe(true);
    const preview = await vercelAdapter.validate({
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
    expect(preview.valid).toBe(false);
    persistThisRequestFounderAuthorization();
    const preflight = evaluateThisRequestFounderAuthorizedDeploy();
    expect(preflight.founder.recognized).toBe(true);
    expect(preflight.eagDecision).toBe("APPROVED");
    expect(preflight.preLive.readyForLiveProviderCall).toBe(true);
    expect(preflight.liveWrite.allowed).toBe(true);
    expect(preflight.attempted).toBe(false);
    expect(preflight.sourceBundleWrites).toBe(0);
    expect(preflight.providerCostClassification).toBe("UNKNOWN");
    expect(preflight.unknownCostGlobalPolicyWeakened).toBe(false);
    persistSourceBundleVerification({
      status: "FAILED",
      liveWriteAttempted: true,
      founderAuthorizationId: CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    });
    expect(getSourceBundleVerification().founderAuthorizationId).not.toBe(FOUNDER_AUTHORIZATION_ID);
  });

  it("does not regress HQ performance, Money, or Command Deck surfaces", () => {
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
    expect(money).toContain('money: "Money"');
    expect(load).not.toContain("SNAPSHOT_PREFETCH_LIMIT");
    expect(load).toContain("loadOperatorVentureSnapshot(admin, organizationId, resolvedId)");
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(CRE_CANDIDATE_ID).toBe("7e7e924e-0741-4155-a729-8d529da77ea9");
  });
});
