import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON, PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD } from "../constants";
import { PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { reconstructCreDirectResponseSuccessor } from "../cre-dr-successor";
import { auditSuccessorAuthorityArtifact } from "../answer-authority/successor-audit";
import { CRE_DR_SUCCESSOR_MISSION, CRE_DR_SUCCESSOR_MISSION_ID, runCreDirectResponseSuccessorMission } from "../answer-authority/successor-mission";

describe("CRE direct-response answer-authority successor v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
  });

  it("creates an immutable unpublished successor with a new artifact identity", async () => {
    const successor = await reconstructCreDirectResponseSuccessor();
    expect(successor.predecessorArtifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.repairReason).toBe(DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.artifactId).not.toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).not.toBe("f99bfe5f1342fcff3d16ea7417d60a9a1005651adc29a1a67cb3b9037329c895");
    expect(successor.files.some((file) => file.path === "app/resources/cam-costs/page.tsx")).toBe(true);
    expect(successor.files.some((file) => file.path === "app/for/tenant-rep-brokers/page.tsx")).toBe(true);
    const audit = await auditSuccessorAuthorityArtifact({
      files: successor.files,
      architecture: successor.architecture,
      graph: successor.graph,
      artifactId: successor.artifactId,
      digest: successor.digest,
    });
    expect(audit.liveArtifactMutated).toBe(false);
    expect(audit.deployed).toBe(false);
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD);
    expect(audit.hardFailPages).toBe(0);
    expect(audit.homepage.overall).toBe("PASS");
    expect(audit.npv.overall).toBe("PASS");
    expect(audit.hub.overall).toBe("PASS");
  }, 180000);

  it("runs the successor build through HQ Command with truthful venture rooms", async () => {
    const run = await runCreDirectResponseSuccessorMission();
    expect(run.commandLiveProof.missionId).toBe(CRE_DR_SUCCESSOR_MISSION_ID);
    expect(run.commandLiveProof.missionType).toBe(CRE_DR_SUCCESSOR_MISSION);
    expect(run.commandLiveProof.eventsEmitted).toBeGreaterThan(0);
    expect(run.commandLiveProof.activeMissionCountDuringExecution).toBeGreaterThanOrEqual(1);
    expect(run.commandLiveProof.commandDuringBuild).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.researchGrid).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.systemsArchitect).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.designCore).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.latestActivityPopulated).toBe(true);
    expect(run.commandLiveProof.latestCompletedAfterFinish).toBe(true);
    expect(run.commandLiveProof.activeAfter).toBe(0);
    expect(run.deployed).toBe(false);
    expect(run.liveArtifactMutated).toBe(false);
    const missionResult = run.result as { audit: { newClassification: string } };
    expect(missionResult.audit.newClassification).toBe(PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD);
  }, 180000);
});
