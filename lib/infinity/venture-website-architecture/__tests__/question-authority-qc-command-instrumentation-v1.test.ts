import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore, runInstrumentedMission, projectCommandActivity } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { activatePremiumAuthoritySuccessorPublicArtifact } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { inspectCollectingHqPresence } from "@/lib/infinity/market-validation-experiment/collecting-hq";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { buildFounderMoneyView } from "@/lib/infinity/founder-idea-lab/explainability/money-view";
import {
  COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE,
  QUESTION_AUTHORITY_QC_MISSION,
  QUESTION_AUTHORITY_QC_MISSION_ID,
  instrumentedRuntimeRegistry,
  runQuestionAuthorityQcMission,
} from "../index";

const ROOT = join(process.cwd());

describe("QUESTION AUTHORITY QC COMMAND LIVE INSTRUMENTATION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetCurrentCreValidationArtifactIdCache();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("exposes a canonical instrumented mission wrapper for future runtimes", async () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.wrapper).toBe("runInstrumentedMission");
    expect(registry.stepWrapper).toBe("runInstrumentedStep");
    expect(registry.schema).toBe("MISSION_ACTIVITY_EVENT_V1");
    expect(registry.anotherTelemetryModel).toBe(false);
    expect(registry.runtimes.QuestionKnowledgeGraphQcRuntime.usesMissionWrapper).toBe(true);
    expect(registry.runtimes.MarketValidationAcquisitionRuntime.usesStepWrapper).toBe(true);
    expect(registry.runtimes.PublicWebResearchRuntime.consumedByQuestionDiscovery).toBe(true);
    expect(registry.runtimes.futureSiteRepairRuntime.usesMissionWrapper).toBe(true);
    const local = await runInstrumentedMission({
      emit: {
        organizationId: "org_wrapper",
        ventureId: "ven_wrapper",
        missionId: "msn_wrapper",
        missionType: "WRAPPER_SMOKE",
        source: "test",
        executionClass: "VENTURE_EXECUTION",
      },
      knownSteps: ["ORCHESTRATE_QUESTION_AUTHORITY_QC", "DISCOVER_QUESTION_UNIVERSE"],
      run: async (handle) => {
        await handle.step({
          stepType: "DISCOVER_QUESTION_UNIVERSE",
          engine: "grounded_research",
          run: () => "ok",
        });
        return "done";
      },
    });
    expect(local.result).toBe("done");
    expect(local.snapshots.some((item) => item.view.counts.activeMissions >= 1)).toBe(true);
    expect(local.view.counts.activeMissions).toBe(0);
    expect(local.view.latestCompleted).toBeTruthy();
    expect(local.events.every((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1")).toBe(true);
    expect(local.instrumentationIncomplete).toBe(false);
  });

  it("executes the real QC audit through Command and proves live room states", async () => {
    const result = await runQuestionAuthorityQcMission({ organizationId: LIVE_ORG });
    expect(result.failCode).not.toBe(COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE);
    expect(result.finalResult).toBe("PASS");
    expect(result.commandLiveProof.missionId).toBe(QUESTION_AUTHORITY_QC_MISSION_ID);
    expect(result.commandLiveProof.missionType).toBe(QUESTION_AUTHORITY_QC_MISSION);
    expect(result.commandLiveProof.eventsEmitted).toBeGreaterThan(10);
    expect(result.commandLiveProof.activeMissionCountDuringExecution).toBeGreaterThanOrEqual(1);
    expect(result.commandLiveProof.researchGridDuringResearch).toBe("ACTIVE_WORK");
    expect(result.commandLiveProof.systemsArchitectDuringMapping).toBe("ACTIVE_WORK");
    expect(result.commandLiveProof.validationStationDuringQc).toBe("ACTIVE_WORK");
    expect(result.commandLiveProof.commandDuringOrchestration).toBe("ACTIVE_WORK");
    expect(result.commandLiveProof.creationLabDuringAudit).toBe("PRESENT_IDLE");
    expect(result.commandLiveProof.designCoreDuringAudit).toBe("PRESENT_IDLE");
    expect(result.commandLiveProof.latestActivityPopulated).toBe(true);
    expect(result.commandLiveProof.latestCompletedAfterFinish).toBe(true);
    expect(result.commandLiveProof.dashboardReadModelObservedActiveExecution).toBe(true);
    expect(result.commandLiveProof.activeAfter).toBe(0);
    expect(result.commandLiveProof.roomsAfter.creation).toBe("PRESENT_IDLE");
    expect(result.commandLiveProof.roomsAfter.design).toBe("PRESENT_IDLE");
    expect(result.commandLiveProof.fakeMotion).toBe(false);
    expect(result.view.latestCompleted?.missionType).toBe(QUESTION_AUTHORITY_QC_MISSION);
    expect(result.events.some((event) => event.eventType === "MISSION_STARTED")).toBe(true);
    expect(result.events.some((event) => event.eventType === "STEP_PROGRESS")).toBe(true);
    expect(result.events.some((event) => event.eventType === "MISSION_COMPLETED")).toBe(true);
    expect(result.deployed).toBe(false);
    expect(result.liveArtifactMutated).toBe(false);
    const after = projectCommandActivity({ organizationId: LIVE_ORG, ventureId: `candidate:7e7e924e-0741-4155-a729-8d529da77ea9` });
    expect(after.counts.activeMissions).toBe(0);
    expect(after.latestCompleted?.missionType).toBe(QUESTION_AUTHORITY_QC_MISSION);
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T04:04:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.restarted).toBe(false);
    expect(inspectCollectingHqPresence({ experimentState: "COLLECTING" }).creationLab).toBe("PRESENT_IDLE");
    expect(buildFounderMoneyView(null).pricing.length).toBeGreaterThan(0);
    expect(readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8")).toContain("InfinityHqExperience");
  }, 180_000);
});
