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
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  WRITE_BOUNDARY,
} from "../constants";
import { isCreValidationArtifactId, resetCurrentCreValidationArtifactIdCache } from "../current-cre-artifact";
import { resetExperimentRuntime } from "../execute";
import {
  DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  DIRECT_RESPONSE_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  evaluateDirectResponseSuccessorDeployPreflight,
  evaluateDirectResponseSuccessorFounderAuthorization,
  priorDirectResponseDeploymentAuthorizationsAreNotReusable,
  directResponseSuccessorFounderScope,
} from "../cre-dr-successor-authorization";
import { PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "../premium-authority-successor-authorization";
import {
  activateDirectResponseSuccessorPublicArtifact,
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

describe("AUTHORIZED CRE DIRECT-RESPONSE ANSWER-AUTHORITY SUCCESSOR DEPLOYMENT V1", () => {
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
    expect(DIRECT_RESPONSE_SUCCESSOR_DEPLOYMENT_CEILING_USD).toBe(5);
    const founder = evaluateDirectResponseSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.deploymentCeilingUsd).toBe(5);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    const reuse = priorDirectResponseDeploymentAuthorizationsAreNotReusable();
    expect(reuse.reusedPriorId).toBe(false);
    expect(reuse.priorIds).toContain(PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(reuse.priorIds).toContain(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    const scope = directResponseSuccessorFounderScope();
    expect(scope.artifactId).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(scope.artifactDigest).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST);
    expect(scope.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(scope.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(scope.provider).toBe("vercel.com_v1");
    expect(scope.capability).toBe("hosting.deploy_source_bundle");
    expect(WRITE_BOUNDARY.validationDeploymentsMax).toBe(1);
  });

  it("locks successor identity and passes pre-live gates without a provider write", async () => {
    expect(isCreValidationArtifactId(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const preflight = await evaluateDirectResponseSuccessorDeployPreflight();
    expect(preflight.artifactId).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(preflight.digest).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST);
    expect(preflight.artifactIdentity).toBe("PASS");
    expect(preflight.digestLock).toBe("PASS");
    expect(preflight.predecessorMutated).toBe(false);
    expect(preflight.predecessorIdentity).toBe("PASS");
    expect(preflight.questionCoverage).toBe("PASS");
    expect(preflight.answerAuthority).toBe("PASS");
    expect(preflight.citationReadiness).toBe("PASS");
    expect(preflight.directResponse).toBe("PASS");
    expect(preflight.visualQc).toBe("PASS");
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

  it("activates the successor only through the explicit helper and preserves predecessor lineage", () => {
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const activated = activateDirectResponseSuccessorPublicArtifact();
    expect(activated.activeArtifact).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessor).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessorLineage).toBe("PASS");
    expect(getActivePublicValidationDigest()).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST);
    const evidence = inspectRealMarketEvidence();
    expect(evidence.experiment.artifactId).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST).toBe(
      "f99bfe5f1342fcff3d16ea7417d60a9a1005651adc29a1a67cb3b9037329c895",
    );
  });
});
