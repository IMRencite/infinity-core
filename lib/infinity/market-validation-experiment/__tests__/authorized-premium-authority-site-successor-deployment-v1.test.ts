import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  parseFounderCeilingAmount,
  resetFounderAuthorization,
} from "../founder-authorization";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  WRITE_BOUNDARY,
} from "../constants";
import { currentCreValidationArtifactId, isCreValidationArtifactId, resetCurrentCreValidationArtifactIdCache } from "../current-cre-artifact";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import {
  PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS,
  evaluatePremiumAuthoritySuccessorCeilings,
  evaluatePremiumAuthoritySuccessorDeployPreflight,
  evaluatePremiumAuthoritySuccessorFounderAuthorization,
  priorPremiumAuthorityDeploymentAuthorizationsAreNotReusable,
  premiumAuthoritySuccessorFounderScope,
} from "../premium-authority-successor-authorization";
import { VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "../validation-grade-successor-authorization";
import {
  activatePremiumAuthoritySuccessorPublicArtifact,
  activateValidationGradeSuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
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

describe("AUTHORIZED CRE PREMIUM AUTHORITY SITE SUCCESSOR DEPLOYMENT V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetCurrentCreValidationArtifactIdCache();
    activateValidationGradeSuccessorPublicArtifact();
    persistPro();
  });

  it("creates a new single-use founder authorization and does not treat $5 as spend", () => {
    expect(parseFounderCeilingAmount("[INSERT_EXPLICIT_FOUNDER_AMOUNT]").ok).toBe(false);
    expect(THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS.deploymentCeilingUsd).toBe(5);
    expect(THIS_REQUEST_PREMIUM_AUTHORITY_SUCCESSOR_CEILINGS.runtimeCeilingUsd).toBe(5);
    const ceilings = evaluatePremiumAuthoritySuccessorCeilings();
    expect(ceilings.explicitFounderAuthorization).toBe(true);
    const founder = evaluatePremiumAuthoritySuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.deploymentCeilingUsd).toBe(5);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    const reuse = priorPremiumAuthorityDeploymentAuthorizationsAreNotReusable();
    expect(reuse.reusedPriorId).toBe(false);
    expect(reuse.priorIds).toContain(FOUNDER_AUTHORIZATION_ID);
    expect(reuse.priorIds).toContain(VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.priorIds).toContain(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.priorIds).toContain(CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID);
    const scope = premiumAuthoritySuccessorFounderScope();
    expect(scope.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(scope.artifactDigest).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST);
    expect(scope.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(scope.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(scope.provider).toBe("vercel.com_v1");
    expect(scope.capability).toBe("hosting.deploy_source_bundle");
    expect(WRITE_BOUNDARY.validationDeploymentsMax).toBe(1);
  });

  it("locks successor identity, keeps the VG contract current, and passes pre-live gates without a provider write", async () => {
    expect(currentCreValidationArtifactId()).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(isCreValidationArtifactId(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    const current = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(current.artifact?.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    const preflight = await evaluatePremiumAuthoritySuccessorDeployPreflight();
    expect(preflight.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(preflight.digest).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST);
    expect(preflight.artifactIdentity).toBe("PASS");
    expect(preflight.digestLock).toBe("PASS");
    expect(preflight.predecessorMutated).toBe(false);
    expect(preflight.premiumAuthority).toBe("PASS");
    expect(preflight.isolatedBuild).toBe("PASS");
    expect(preflight.secretScan).toBe("PASS");
    expect(preflight.routes).toBe("PASS");
    expect(preflight.links).toBe("PASS");
    expect(preflight.schema).toBe("PASS");
    expect(preflight.metadata).toBe("PASS");
    expect(preflight.sitemap).toBe("PASS");
    expect(preflight.robots).toBe("PASS");
    expect(preflight.geoseo).toBe("PASS");
    expect(preflight.design).toBe("PASS");
    expect(preflight.accessibility).toBe("PASS");
    expect(preflight.founderAuthorization).toBe("PASS");
    expect(preflight.economicAuthorization).toBe("PASS");
    expect(preflight.eag).toBe("PASS");
    expect(preflight.eagPurpose).toBe(PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE);
    expect(preflight.overall).toBe("PASS");
    expect(preflight.workflowAttempted).toBe(false);
    expect(preflight.sourceBundleWorkflows).toBe(0);
    expect(preflight.deployments).toBe(0);
    expect(currentCreValidationArtifactId()).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    const clock = inspectExperimentClock();
    expect(clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(clock.restarted).toBe(false);
    expect(getActivePublicValidationArtifactId()).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
  });

  it("activates the successor only through the explicit activation helper and preserves predecessor lineage", () => {
    expect(getActivePublicValidationArtifactId()).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    const activated = activatePremiumAuthoritySuccessorPublicArtifact();
    expect(activated.activeArtifact).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessor).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessorLineage).toBe("PASS");
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const evidence = inspectRealMarketEvidence();
    expect(evidence.experiment.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.counts.qualifiedVisitors).toBe(0);
  });
});
