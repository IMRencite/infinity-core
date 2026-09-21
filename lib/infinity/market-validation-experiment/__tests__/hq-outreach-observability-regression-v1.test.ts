import { beforeEach, describe, expect, it } from "vitest";
import {
  listCommunicationAttempts,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime";
import { deriveCommandSystemReadiness } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import {
  acceptHqPollSnapshot,
  hqPollFreshnessFromSnapshot,
  shouldApplyInitialHqSnapshot,
} from "@/lib/infinity/operator-console/hq-poll-generation";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  attachCommandActivity,
  emitMissionActivity,
  instrumentedRuntimeRegistry,
  listMissionActivityEvents,
  projectCommandActivity,
  resetMissionActivityStore,
  selectCurrentExecutionMission,
  rankMissionsFromGroups,
} from "@/lib/infinity/mission-activity";
import { missionOpenStatus } from "@/lib/infinity/mission-activity/project";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import { completeFirstRealCreProspectCohort } from "../cre-first-real-cohort-completion";
import {
  CRE_WAVE_1_BOUNDED_SEND,
  executeCreWave1BoundedSend,
  resetCreWave1Runtime,
} from "../cre-wave-1-bounded-send";
import {
  CRE_WAVE_1_BOUNDED_SEND_MISSION,
  CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
  createWave1SimulationFetch,
  executeCreWave1BoundedSendMission,
} from "../cre-wave-1-bounded-send-mission";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";

const NOW = new Date("2026-09-02T16:20:00.000Z");
const COMPILE_REPAIR = "CRE_GOVERNED_COMPILE_REPAIR_SUCCESSOR_DEPLOY";
const COMPILE_REPAIR_ID = "msn_cre_compile_repair_successor_deploy_v1";

function seedCompileRepairCompleted(): void {
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: COMPILE_REPAIR_ID,
    missionType: COMPILE_REPAIR,
    engine: "launch_gateway",
    stepType: "CREATE_DEPLOYMENT",
    eventType: "MISSION_STARTED",
    observedAt: "2026-09-01T12:00:00.000Z",
    startedAt: "2026-09-01T12:00:00.000Z",
    executionClass: "VENTURE_EXECUTION",
    summary: "Compile repair successor deploy",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: COMPILE_REPAIR_ID,
    missionType: COMPILE_REPAIR,
    engine: "launch_gateway",
    stepType: "CREATE_DEPLOYMENT",
    eventType: "MISSION_COMPLETED",
    observedAt: "2026-09-01T12:08:00.000Z",
    completedAt: "2026-09-01T12:08:00.000Z",
    executionClass: "VENTURE_EXECUTION",
    summary: "Finished the current mission",
  });
}

function favc1InspectionSnapshot(activity = projectCommandActivity({ organizationId: LIVE_ORG })): OperatorVentureSnapshot {
  return attachCommandActivity(
    {
      generatedAt: "2026-08-30T18:00:00.000Z",
      venture: {
        ventureAssemblyId: "favc1-cycle:cycle-1786949554348",
        organizationId: LIVE_ORG,
        missionId: "favc1-cycle",
        opportunityId: null,
        companyId: null,
        ventureBlueprintId: null,
        buildId: null,
        productionArtifactId: null,
        ventureName: "Autonomous Venture Cycle",
        ventureType: "first_autonomous_venture_v1",
        assemblyStatus: "business_no_go",
        readinessStatus: null,
        launchStage: null,
        correlationIds: [],
      },
      overallStatus: "COMPLETE",
      currentDepartments: ["quality_control"],
      currentActivity: {
        active: false,
        departmentId: "quality_control",
        departmentLabel: "Validation Station",
        engine: null,
        task: "Recording a targeted authority repair plan",
        provider: null,
        model: null,
        status: "PRESENT_IDLE",
        startedAt: null,
        elapsedSeconds: null,
        attempt: null,
        costUsd: null,
        costKnown: false,
        artifactStatus: null,
        latestActivitySummary: "Recording a targeted authority repair plan",
        latestActivityAt: "2026-08-30T18:33:12.828Z",
      },
      departments: (
        [
          ["executive_office", "Command"],
          ["growth_department", "Growth Nexus"],
          ["quality_control", "Validation Station"],
          ["launch_operations", "Deployment Depot"],
        ] as const
      ).map(([id, label]) => ({
        id,
        label,
        state: "COMPLETE" as const,
        engines: [],
        summary: null,
        currentTask: null,
        provider: null,
        model: null,
        costUsd: null,
        costKnown: false,
        startedAt: null,
        lastActivityAt: null,
        recordCount: 0,
        detail: {},
        isActive: false,
        isNextMissionTarget: false,
      })),
      pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
      activityFeed: [],
      providers: [],
      costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
      lineage: [],
      closedLoopRoute: {
        active: false,
        fromDepartmentId: null,
        viaDepartmentId: null,
        toDepartmentId: null,
        decisionType: null,
        missionId: null,
        missionStatus: null,
      },
      system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
      workerNodes: [],
      favc1Cycle: {
        cycleKey: "cycle-1786949554348",
        mode: "pre_venture",
        terminalOutcome: "BUSINESS_NO_GO",
        discoveryRunId: null,
        monetizationRunId: null,
        selectionRunId: null,
        ventureAssemblyId: null,
        candidateCount: 0,
        monetizedCandidateCount: 0,
        researchSessionCount: 0,
        activeResearchSessionCount: 0,
        knownCycleCostUsd: null,
        knownCycleCostComplete: true,
        currentStageLabel: "Command",
        failureStage: null,
        failureMessage: null,
        validationOutcome: "validation_required",
        terminalDisplay: {
          headline: "Mission Completed — Candidate Still Requires Validation",
          decision: "BUSINESS_NO_GO",
          systemDetail: "validation_required",
        },
      },
    } as OperatorVentureSnapshot,
    activity,
  );
}

describe("HQ LIVE OUTREACH OBSERVABILITY REGRESSION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    resetCreWave1Runtime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    completeFirstRealCreProspectCohort();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
  });

  it("registers the bounded outreach path on the canonical mission wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.wrapper).toBe("runInstrumentedMission");
    expect(registry.runtimes.CreBoundedOutreachRuntime.usesMissionWrapper).toBe(true);
    expect(registry.runtimes.CreBoundedOutreachRuntime.adoption).toBe("USES_CANONICAL_MISSION_WRAPPER");
    expect(registry.contracts.CreBoundedOutreachRuntime.missionType).toBe("CRE_WAVE_1_FRESH_CONTACT_REVERIFICATION_AND_SEND_V3");
    expect(roomForStep("CONTACT_REVERIFICATION", "market_validation")).toBe("quality_control");
    expect(roomForStep("MESSAGE_STRATEGY", "organic_growth")).toBe("growth_department");
    expect(roomForStep("PROVIDER_SEND", "organic_growth")).toBe("growth_department");
    expect(roomForStep("RESULT_PERSISTENCE", "market_validation")).toBe("quality_control");
  });

  it("does not project Wave 1 when the send path runs outside Mission Runtime", async () => {
    seedCompileRepairCompleted();
    const before = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(before.latestCompleted?.missionType).toBe(COMPILE_REPAIR);
    expect(before.counts.activeMissions).toBe(0);
    await executeCreWave1BoundedSend({
      now: NOW,
      fetchImpl: createWave1SimulationFetch(),
      sendAuthorized: false,
      providerWrite: false,
      hydrateCapability: false,
    });
    const after = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(after.nowInspecting.currentMission).not.toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION);
    expect(after.latestCompleted?.missionType).toBe(COMPILE_REPAIR);
    expect(listMissionActivityEvents({ missionId: CRE_WAVE_1_BOUNDED_SEND_MISSION_ID })).toHaveLength(0);
  });

  it("enters Mission Runtime and becomes org-global current execution with truthful rooms", async () => {
    seedCompileRepairCompleted();
    const attemptsBefore = listCommunicationAttempts().length;
    const evidenceBefore = inspectRealMarketEvidence({ now: NOW }).counts;
    const clockBefore = inspectExperimentClock(NOW);

    const run = await executeCreWave1BoundedSendMission({
      now: NOW,
      providerWrite: false,
      sendAuthorized: false,
      hydrateCapability: false,
      phaseMs: 0,
      fetchImpl: createWave1SimulationFetch(),
    });

    expect(run.mission).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION);
    expect(run.missionId).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION_ID);
    expect(run.innerMission).toBe(CRE_WAVE_1_BOUNDED_SEND);
    expect(run.providerWrite).toBe(false);
    expect(run.sendAttempts).toBe(0);
    expect(run.providerAccepted).toBe(0);
    expect(run.authorizationConsumed).toBe("NO");
    expect(run.clockRestarted).toBe("NO");
    expect(inspectExperimentClock(NOW).evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectExperimentClock(NOW).restarted).toBe(false);
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(evidenceBefore);
    expect(listCommunicationAttempts()).toHaveLength(attemptsBefore);

    const events = listMissionActivityEvents({ organizationId: LIVE_ORG, missionId: CRE_WAVE_1_BOUNDED_SEND_MISSION_ID });
    expect(events.some((event) => event.eventType === "MISSION_STARTED")).toBe(true);
    expect(events.every((event) => event.source === "cre_wave_1_hq_observability_simulation_v1")).toBe(true);
    expect(events.every((event) => event.technicalDetail === "simulation:TRUE" || event.eventType === "STEP_PROGRESS")).toBe(true);
    expect(events.every((event) => event.synthetic === false)).toBe(true);
    for (const step of [
      "CONTACT_REVERIFICATION",
      "MESSAGE_STRATEGY",
      "MESSAGE_QUALITY_VALIDATION",
      "OUTREACH_AUTHORIZATION",
      "PROVIDER_SEND",
      "RESULT_PERSISTENCE",
      "EXPERIMENT_READBACK",
    ]) {
      expect(events.some((event) => event.stepType === step && event.eventType === "STEP_STARTED")).toBe(true);
    }

    expect(run.hq.organizationGlobal).toBe("PASS");
    expect(run.hq.activeCount).toBe("PASS");
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.signalIntelligence).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.hq.latestCompleted).toBe("PASS");

    expect(run.hq.rooms.contactReverification.executive_office).toBe("ACTIVE_WORK");
    expect(run.hq.rooms.contactReverification.growth_department).toBe("ACTIVE_WORK");
    expect(run.hq.rooms.contactReverification.quality_control).toBe("ACTIVE_WORK");
    expect(run.hq.rooms.contactReverification.launch_operations).not.toBe("ACTIVE_WORK");
    expect(run.hq.rooms.providerSend.executive_office).toBe("ACTIVE_WORK");
    expect(run.hq.rooms.providerSend.growth_department).toBe("ACTIVE_WORK");
    expect(run.hq.rooms.providerSend.quality_control).toBe("ACTIVE_WORK");
    expect(run.hq.rooms.experimentReadback.intelligence_center).toBe("ACTIVE_WORK");

    const started = run.hq.midRun.find((item: { phase: string; currentMission: string | null; activeMissions: number }) => item.phase === "CONTACT_REVERIFICATION:STARTED");
    expect(started?.currentMission).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION);
    expect(started?.activeMissions).toBeGreaterThanOrEqual(1);

    const grouped = new Map<string, typeof events>();
    for (const event of listMissionActivityEvents({ organizationId: LIVE_ORG })) {
      const list = grouped.get(event.missionId) ?? [];
      list.push(event);
      grouped.set(event.missionId, list);
    }
    const current = selectCurrentExecutionMission(rankMissionsFromGroups(grouped, missionOpenStatus));
    expect(current).toBeNull();

    const completed = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(completed.counts.activeMissions).toBe(0);
    expect(completed.latestCompleted?.missionType).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION);
    expect(completed.latestCompleted?.missionId).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION_ID);
    expect(completed.rooms.executive_office.status).not.toBe("ACTIVE_WORK");
    expect(completed.rooms.growth_department.status).not.toBe("ACTIVE_WORK");
    expect(completed.rooms.quality_control.status).not.toBe("ACTIVE_WORK");
    expect(completed.rooms.launch_operations.status).not.toBe("ACTIVE_WORK");
  });

  it("keeps capability mutation lock from hiding the bounded mission", async () => {
    const runPromise = executeCreWave1BoundedSendMission({
      now: NOW,
      providerWrite: false,
      sendAuthorized: false,
      hydrateCapability: false,
      phaseMs: 40,
      fetchImpl: createWave1SimulationFetch(),
    });
    const mid = await new Promise<ReturnType<typeof projectCommandActivity>>((resolve, reject) => {
      let captured = false;
      const timer = setInterval(() => {
        const view = projectCommandActivity({ organizationId: LIVE_ORG });
        if (view.nowInspecting.currentMission === CRE_WAVE_1_BOUNDED_SEND_MISSION && view.counts.activeMissions >= 1) {
          captured = true;
          clearInterval(timer);
          resolve(view);
        }
      }, 5);
      void runPromise.then(() => {
        if (!captured) {
          clearInterval(timer);
          reject(new Error("mission completed before a live HQ snapshot was captured"));
        }
      });
    });
    const attached = attachCommandActivity(favc1InspectionSnapshot(mid), mid);
    const indicators = deriveCommandSystemReadiness({ snapshot: attached });
    expect(indicators.find((item) => item.id === "commercialization")?.status).toBe("ENGINE VERIFIED · MUTATIONS LOCKED");
    expect(attached.commandActivity?.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(attached.commandActivity?.nowInspecting.currentMission).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION);
    expect(attached.currentActivity.active).toBe(true);
    await runPromise;
  });

  it("does not let historical inspection, stale SSR, or out-of-order polls hide live Wave 1", async () => {
    const runPromise = executeCreWave1BoundedSendMission({
      now: NOW,
      providerWrite: false,
      sendAuthorized: false,
      hydrateCapability: false,
      phaseMs: 40,
      fetchImpl: createWave1SimulationFetch(),
    });
    const liveView = await new Promise<ReturnType<typeof projectCommandActivity>>((resolve, reject) => {
      let captured = false;
      const timer = setInterval(() => {
        const view = projectCommandActivity({ organizationId: LIVE_ORG });
        if (view.counts.activeMissions >= 1 && view.nowInspecting.currentMission === CRE_WAVE_1_BOUNDED_SEND_MISSION) {
          captured = true;
          clearInterval(timer);
          resolve(view);
        }
      }, 5);
      void runPromise.then(() => {
        if (!captured) {
          clearInterval(timer);
          reject(new Error("mission completed before a live HQ snapshot was captured"));
        }
      });
    });
    const live = favc1InspectionSnapshot(liveView);
    expect(live.inspectionContext?.cycleKey).toBe("cycle-1786949554348");
    expect(live.currentExecution?.currentMission).toBe(CRE_WAVE_1_BOUNDED_SEND_MISSION);
    expect(live.currentActivity.active).toBe(true);

    const idleView = projectCommandActivity({ organizationId: "org_unrelated_idle" });
    const idle = attachCommandActivity(favc1InspectionSnapshot(idleView), idleView);
    const liveFresh = hqPollFreshnessFromSnapshot(live);
    const idleFresh = hqPollFreshnessFromSnapshot({
      ...idle,
      generatedAt: "2026-08-30T18:00:00.000Z",
      commandActivity: {
        ...idle.commandActivity!,
        generatedAt: "2026-08-30T18:00:00.000Z",
        counts: { ...idle.commandActivity!.counts, activeMissions: 0 },
        nowInspecting: { ...idle.commandActivity!.nowInspecting, currentMission: null, status: "PRESENT_IDLE" },
      },
    });
    expect(acceptHqPollSnapshot(liveFresh, idleFresh)).toBe(false);
    expect(shouldApplyInitialHqSnapshot(liveFresh, idleFresh)).toBe(false);
    expect(acceptHqPollSnapshot(idleFresh, liveFresh)).toBe(true);
    await runPromise;
  });

  it("does not duplicate provider sends or communication attempts on a second simulation", async () => {
    const first = await executeCreWave1BoundedSendMission({
      now: NOW,
      providerWrite: false,
      sendAuthorized: false,
      hydrateCapability: false,
      phaseMs: 0,
      fetchImpl: createWave1SimulationFetch(),
    });
    const attemptsAfterFirst = listCommunicationAttempts().length;
    const second = await executeCreWave1BoundedSendMission({
      now: NOW,
      providerWrite: false,
      sendAuthorized: false,
      hydrateCapability: false,
      phaseMs: 0,
      fetchImpl: createWave1SimulationFetch(),
    });
    expect(first.sendAttempts).toBe(0);
    expect(second.sendAttempts).toBe(0);
    expect(listCommunicationAttempts()).toHaveLength(attemptsAfterFirst);
    expect(second.authorizationConsumed).toBe("NO");
  });
});
