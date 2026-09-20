import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION,
  CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION_ID,
  CRE_INBOUND_OBSERVATION_ACTIVATION_SOURCE,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
} from "./constants";
import { runCreInboundObservationCycle } from "./cre-inbound-observer";
import { startCreInboundObserverLoop } from "./cre-inbound-observer-loop";

export const CRE_INBOUND_OBSERVATION_ACTIVATION_STEPS = [
  "ORCHESTRATE_CRE_INBOUND_OBSERVATION",
  "ACTIVATE_OBSERVER",
  "INITIALIZE_HISTORY_CHECKPOINT",
  "TRACKED_THREAD_OBSERVATION",
  "PROCESS_NEW_INBOUND",
  "OBSERVER_HEALTH_READBACK",
] as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeGovernedCreInboundObservationActivationMission(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
  phaseMs?: number;
} = {}) {
  const phaseMs = input.phaseMs ?? 0;
  const mid: Array<{ phase: string; rooms: Record<string, string> }> = [];
  const instrumented = await runInstrumentedMission<Awaited<ReturnType<typeof runCreInboundObservationCycle>>>({
    emit: {
      organizationId: LOCKED_ORG,
      ventureId: LOCKED_VENTURE,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_EXPERIMENT,
      missionId: CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION_ID,
      missionType: CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION,
      source: CRE_INBOUND_OBSERVATION_ACTIVATION_SOURCE,
      technicalDetail: "simulation:FALSE;ben:0;stephanie:0;followUps:0;localRuntime:TRUE",
      executionClass: "VENTURE_EXECUTION" as const,
    },
    knownSteps: [...CRE_INBOUND_OBSERVATION_ACTIVATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_INBOUND_OBSERVATION",
    onSnapshot: (view, phase) => {
      mid.push({
        phase,
        rooms: Object.fromEntries(Object.entries(view.rooms).map(([room, slice]) => [room, slice.status])),
      });
    },
    run: async (handle) => {
      const observation = await handle.step({
        stepType: "ACTIVATE_OBSERVER",
        engine: "market_validation",
        summary: "Activating the governed CRE inbound observer for Caleb and Michael only.",
        run: async () => {
          const result = await runCreInboundObservationCycle({
            fetchImpl: input.fetchImpl,
            now: input.now,
            activate: true,
          });
          startCreInboundObserverLoop({ fetchImpl: input.fetchImpl });
          if (phaseMs > 0) await wait(phaseMs);
          return result;
        },
      });
      await handle.step({
        stepType: "INITIALIZE_HISTORY_CHECKPOINT",
        engine: "performance_intelligence",
        summary: "Persisting the Gmail history checkpoint without replaying the mailbox.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { checkpoint: observation.observer.historyCheckpointId, initialized: observation.checkpointInitialized };
        },
      });
      await handle.step({
        stepType: "TRACKED_THREAD_OBSERVATION",
        engine: "performance_intelligence",
        summary: "Reading only the two live CRE Wave 1 threads.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { caleb: observation.caleb.observation, michael: observation.michael.observation };
        },
      });
      if (observation.processing.newInboundProcessed > 0) {
        await handle.step({
          stepType: "PROCESS_NEW_INBOUND",
          engine: "organic_growth",
          summary: "Processing real tracked inbound through AutonomousCommunicationPolicy.",
          run: async () => {
            if (phaseMs > 0) await wait(phaseMs);
            return observation.processing;
          },
        });
      }
      await handle.step({
        stepType: "OBSERVER_HEALTH_READBACK",
        engine: "market_validation",
        summary: "Reading observer health without keeping HQ permanently active.",
        run: async () => {
          if (phaseMs > 0) await wait(phaseMs);
          return { status: observation.observer.status, durability: observation.observer.runtimeDurability };
        },
      });
      return observation;
    },
  });
  const roomsAt = (phase: string) => mid.find((item) => item.phase === phase);
  const activate = roomsAt("ACTIVATE_OBSERVER:STARTED");
  const observe = roomsAt("TRACKED_THREAD_OBSERVATION:STARTED");
  const process = roomsAt("PROCESS_NEW_INBOUND:STARTED");
  const depotActive = mid.some((item) => item.rooms.launch_operations === "ACTIVE_WORK");
  return {
    mission: CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION,
    missionId: CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION_ID,
    observation: instrumented.result,
    hq: {
      activationProjected: activate?.rooms.executive_office === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      signalIntelligence: observe?.rooms.intelligence_center === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      validationStation: activate?.rooms.quality_control === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      growthNexus: instrumented.result.processing.newInboundProcessed > 0
        ? process?.rooms.growth_department === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const)
        : ("PASS" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      completion: instrumented.view.counts.activeMissions === 0 ? ("PASS" as const) : ("FAIL" as const),
      latestCompleted:
        instrumented.view.latestCompleted?.missionType === CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION
          ? ("PASS" as const)
          : ("FAIL" as const),
      inboundProcessingCreatesMission: instrumented.result.processing.newInboundProcessed > 0
        ? process
          ? ("PASS" as const)
          : ("FAIL" as const)
        : ("PASS" as const),
    },
    view: instrumented.view,
  };
}

