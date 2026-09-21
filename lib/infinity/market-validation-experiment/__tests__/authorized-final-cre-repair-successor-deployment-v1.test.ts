import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  parseFounderCeilingAmount,
  resetFounderAuthorization,
} from "../founder-authorization";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
  WRITE_BOUNDARY,
} from "../constants";
import { isCreValidationArtifactId, resetCurrentCreValidationArtifactIdCache } from "../current-cre-artifact";
import { resetExperimentRuntime } from "../execute";
import {
  FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  evaluateFinalRepairSuccessorDeployPreflight,
  evaluateFinalRepairSuccessorFounderAuthorization,
  priorFinalRepairDeploymentAuthorizationsAreNotReusable,
  finalRepairSuccessorFounderScope,
} from "../cre-final-repair-successor-authorization";
import { DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "../cre-dr-successor-authorization";
import { PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "../premium-authority-successor-authorization";
import {
  activateFinalRepairSuccessorPublicArtifact,
  activatePremiumAuthoritySuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
  getActivePublicValidationDigest,
} from "../active-public-artifact";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { persistEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import { CANONICAL_EVIDENCE_START } from "../experiment-clock";

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

describe("AUTHORIZED FINAL CRE REPAIR SUCCESSOR DEPLOYMENT V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetCurrentCreValidationArtifactIdCache();
    activatePremiumAuthoritySuccessorPublicArtifact();
    persistPro();
  });

  it("creates a new single-use founder authorization and does not treat $5 as spend", () => {
    expect(parseFounderCeilingAmount("[INSERT_EXPLICIT_FOUNDER_AMOUNT]").ok).toBe(false);
    expect(FINAL_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD).toBe(5);
    const founder = evaluateFinalRepairSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.deploymentCeilingUsd).toBe(5);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    const reuse = priorFinalRepairDeploymentAuthorizationsAreNotReusable();
    expect(reuse.reusedPriorId).toBe(false);
    expect(reuse.priorIds).toContain(DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.priorIds).toContain(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    const scope = finalRepairSuccessorFounderScope();
    expect(scope.artifactId).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(scope.artifactDigest).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(scope.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(scope.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(scope.provider).toBe("vercel.com_v1");
    expect(scope.capability).toBe("hosting.deploy_source_bundle");
    expect(WRITE_BOUNDARY.validationDeploymentsMax).toBe(1);
  });

  it("locks successor identity and passes pre-live gates without a provider write", async () => {
    expect(isCreValidationArtifactId(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const preflight = await evaluateFinalRepairSuccessorDeployPreflight();
    expect(preflight.artifactId).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(preflight.digest).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(preflight.artifactIdentity).toBe("PASS");
    expect(preflight.digestLock).toBe("PASS");
    expect(preflight.predecessorMutated).toBe(false);
    expect(preflight.predecessorIdentity).toBe("PASS");
    expect(preflight.renderedLayout).toBe("PASS");
    expect(preflight.candidateLineage).toBe("PASS");
    expect(preflight.experimentLineage).toBe("PASS");
    expect(preflight.questionIdentity).toBe("PASS");
    expect(preflight.questionCoverage).toBe("PASS");
    expect(preflight.answerAuthority).toBe("PASS");
    expect(preflight.citationReadiness).toBe("PASS");
    expect(preflight.directResponse).toBe("PASS");
    expect(preflight.geoseo).toBe("PASS");
    expect(preflight.schema).toBe("PASS");
    expect(preflight.metadata).toBe("PASS");
    expect(preflight.internalLinks).toBe("PASS");
    expect(preflight.secretScan).toBe("PASS");
    expect(preflight.founderAuthorization).toBe("PASS");
    expect(preflight.economicAuthorization).toBe("PASS");
    expect(preflight.eag).toBe("PASS");
    expect(preflight.eagPurpose).toBe(PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE);
    expect(preflight.overall).toBe("PASS");
    expect(preflight.workflowAttempted).toBe(false);
    expect(preflight.sourceBundleWorkflows).toBe(0);
    expect(preflight.deployments).toBe(0);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const clock = inspectExperimentClock();
    expect(clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(clock.restarted).toBe(false);
  }, 180000);

  it("activates the successor only through the explicit helper and keeps art_d20 until then", () => {
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const activated = activateFinalRepairSuccessorPublicArtifact();
    expect(activated.activeArtifact).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessor).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessorLineage).toBe("PASS");
    expect(getActivePublicValidationDigest()).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID).toBe("art_2b7308e842681634e8c8");
    const evidence = inspectRealMarketEvidence();
    expect(evidence.experiment.artifactId).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.counts.qualifiedVisitors).toBe(0);
  });
});
