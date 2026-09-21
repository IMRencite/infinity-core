import { beforeEach, describe, expect, it } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetFounderAuthorization } from "../founder-authorization";
import { resetExperimentRuntime } from "../execute";
import { resetCurrentCreValidationArtifactIdCache, isCreValidationArtifactId } from "../current-cre-artifact";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import { activatePremiumAuthoritySuccessorPublicArtifact, getActivePublicValidationArtifactId } from "../active-public-artifact";
import {
  COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
  compileRepairSuccessorFounderScope,
  evaluateCompileRepairSuccessorFounderAuthorization,
  priorCompileRepairDeploymentAuthorizationsAreNotReusable,
} from "../cre-compile-repair-successor-authorization";
import { FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "../cre-final-repair-successor-authorization";
import { persistEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
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

describe("AUTHORIZED COMPILE REPAIR SUCCESSOR DEPLOYMENT V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetCurrentCreValidationArtifactIdCache();
    activatePremiumAuthoritySuccessorPublicArtifact();
    persistPro();
  });

  it("creates a new single-use authorization for the compile-repair successor only", () => {
    expect(COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD).toBe(5);
    const founder = evaluateCompileRepairSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    const reuse = priorCompileRepairDeploymentAuthorizationsAreNotReusable();
    expect(reuse.reusedPriorId).toBe(false);
    expect(reuse.priorIds).toContain(FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    const scope = compileRepairSuccessorFounderScope();
    expect(scope.artifactId).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(scope.artifactDigest).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(scope.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(scope.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(scope.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(isCreValidationArtifactId(scope.artifactId)).toBe(true);
    expect(scope.artifactId).not.toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(getActivePublicValidationArtifactId()).not.toBe(scope.artifactId);
  });
});
