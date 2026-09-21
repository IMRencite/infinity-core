import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { activatePremiumAuthoritySuccessorPublicArtifact } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID, PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/constants";
import { PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD } from "../constants";
import { runQuestionAuthorityQcMission } from "../index";

describe("CURRENT CRE AUTHORITY QC EXECUTION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetCurrentCreValidationArtifactIdCache();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("executes new QC against the current live artifact and records a concrete repair plan", async () => {
    const mission = await runQuestionAuthorityQcMission();
    const audit = mission.result.audit;
    expect(audit.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(audit.digest).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST);
    expect(audit.executedFresh).toBe(true);
    expect(audit.cachedOldClassificationReused).toBe(false);
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD);
    expect(audit.homepage.overall).toBe("FAIL");
    expect(audit.npv.overall).toBe("FAIL");
    expect(audit.hub.overall).toBe("FAIL");
    expect(audit.concreteRepair.successorRequired).toBe(true);
    expect(audit.concreteRepair.opportunities.length).toBeGreaterThanOrEqual(3);
    expect(audit.concreteRepair.routes).toHaveLength(10);
    expect(mission.finalResult).toBe("PASS");
    expect(mission.commandLiveProof.creationLabDuringAudit).toBe("PRESENT_IDLE");
    expect(mission.deployed).toBe(false);
    expect(mission.liveArtifactMutated).toBe(false);
    expect(audit.coverage.coverageClaim).toBe("KNOWN_HIGH_CONFIDENCE_QUESTION_COVERAGE");
    expect(audit.coverage.completeUniverseClaimed).toBe(false);
  }, 180_000);
});
