import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  currentCreFounderScope,
  evaluateFounderAuthorization,
  lastConsumedSuccessorFounderAuthorization,
  persistFounderAuthorization,
  predecessorConsumedFounderAuthorization,
  resetFounderAuthorization,
} from "../founder-authorization";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import { VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "../source-bundle-request";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { currentCreValidationArtifactId, resetCurrentCreValidationArtifactIdCache } from "../current-cre-artifact";
import {
  THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS,
  VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD,
  digestOfFiles,
  evaluateValidationGradeSuccessorCeilings,
  evaluateValidationGradeSuccessorDeployPreflight,
  evaluateValidationGradeSuccessorFounderAuthorization,
  inspectValidationGradeSuccessorDeployStop,
  priorDeploymentAuthorizationsAreNotReusable,
  validationGradeSuccessorFounderScope,
} from "../validation-grade-successor-authorization";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { inspectCollectingHqPresence } from "../collecting-hq";
import { getActivePublicValidationArtifactId } from "../active-public-artifact";
import { persistEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { validationProjectName } from "../constants";

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

describe("VALIDATION GRADE SUCCESSOR DEPLOYMENT AUTHORIZATION V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetCurrentCreValidationArtifactIdCache();
    persistPro();
  });

  it("recognizes explicit $5 deployment and $10 remaining runtime ceilings", () => {
    expect(THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.deploymentCeilingUsd).toBe(5);
    expect(THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.runtimeCeilingUsd).toBe(10);
    expect(VALIDATION_GRADE_SUCCESSOR_DEPLOYMENT_CEILING_USD).toBe(5);
    expect(VALIDATION_GRADE_SUCCESSOR_RUNTIME_CEILING_USD).toBe(10);
    const ceilings = evaluateValidationGradeSuccessorCeilings();
    expect(ceilings.explicitFounderAuthorization).toBe(true);
    expect(ceilings.deploymentCeiling).toBe("5");
    expect(ceilings.runtimeCeiling).toBe("10");
    const founder = evaluateValidationGradeSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.deploymentCeilingUsd).toBe(5);
    expect(founder.authorization?.runtimeCeilingUsd).toBe(10);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
  });

  it("does not reuse any prior deployment or protection authorization", () => {
    const reuse = priorDeploymentAuthorizationsAreNotReusable();
    expect(reuse.newAuthorizationId).toBe(VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.newAuthorizationId).not.toBe(FOUNDER_AUTHORIZATION_ID);
    expect(reuse.newAuthorizationId).not.toBe(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.newAuthorizationId).not.toBe(CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.reusedPriorId).toBe(false);
    persistFounderAuthorization(predecessorConsumedFounderAuthorization());
    const againstNew = evaluateFounderAuthorization({
      authorization: lastConsumedSuccessorFounderAuthorization(),
      requestedScope: validationGradeSuccessorFounderScope(),
    });
    expect(againstNew.recognized).toBe(false);
    expect(validationGradeSuccessorFounderScope().artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(validationGradeSuccessorFounderScope().artifactDigest).toBe(VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST);
    expect(currentCreFounderScope().artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
  });

  it("locks successor identity and passes pre-live gates without a provider write", async () => {
    const preflight = await evaluateValidationGradeSuccessorDeployPreflight();
    expect(currentCreValidationArtifactId()).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(preflight.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(preflight.digest).toBe(VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST);
    expect(preflight.artifactIdentity).toBe("PASS");
    expect(preflight.digestLock).toBe("PASS");
    expect(preflight.predecessorMutated).toBe(false);
    expect(preflight.isolatedBuild).toBe("PASS");
    expect(preflight.secretScan).toBe("PASS");
    expect(preflight.validationGradeQuality).toBe("PASS");
    expect(preflight.footer).toBe("PASS");
    expect(preflight.privacy).toBe("PASS");
    expect(preflight.terms).toBe("PASS");
    expect(preflight.sitemap).toBe("PASS");
    expect(preflight.deployablePackage).toBe("PASS");
    expect(preflight.candidateLineage).toBe("PASS");
    expect(preflight.experimentLineage).toBe("PASS");
    expect(preflight.founderAuthorization).toBe("PASS");
    expect(preflight.economicAuthorization).toBe("PASS");
    expect(preflight.eag).toBe("PASS");
    expect(preflight.overall).toBe("PASS");
    expect(preflight.workflowAttempted).toBe(false);
    expect(preflight.sourceBundleWorkflows).toBe(0);
    expect(preflight.deployments).toBe(0);
    expect(preflight.protectionMutations).toBe(0);
    expect(preflight.eagDecision).toBe("APPROVED");
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.artifact!.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(digestOfFiles(result.artifact!.files)).toBe(VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST);
    expect(result.artifact!.lineage?.predecessorArtifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const body = buildVercelSourceBundleDeploymentBody({
      projectName: validationProjectName(LOCKED_CRE_EXPERIMENT_ID),
      files: result.artifact!.files,
    });
    expect(body.target).toBe("staging");
    expect(evaluateVercelSourceBundleDeploymentBody(body).valid).toBe(true);
  }, 180_000);

  it("preserves the live experiment clock, real counts, and HQ rooms without fake ACTIVE_WORK", () => {
    const stop = inspectValidationGradeSuccessorDeployStop();
    const clock = inspectExperimentClock(new Date("2026-08-29T16:00:00.000Z"));
    const evidence = inspectRealMarketEvidence();
    const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
    expect(stop.experiment.state).toBe("COLLECTING");
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(evidence.counts.strongIntent).toBe(0);
    expect(evidence.counts.pricingSelections).toBe(0);
    expect(evidence.counts.qualifiedSubmissions).toBe(0);
    expect(getActivePublicValidationArtifactId()).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(stop.activeArtifact).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(stop.messagesSent).toBe(0);
    expect(stop.prospects.count).toBe(0);
    expect(stop.providerCost).toBe("UNKNOWN");
    expect(stop.founderCeilingTreatedAsSpend).toBe(false);
    expect(stop.mission.missionState).toBe("READY_BLOCKED");
    expect(stop.mission.activeWorkTruthful).toBe(true);
    expect(hq.validationStation).toBe("COLLECTING");
    expect(hq.signalIntelligence).toBe("COLLECTING");
    expect(hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(hq.creationLab).toBe("PRESENT_IDLE");
    expect(hq.fakeActiveWork).toBe(false);
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
  });
});
