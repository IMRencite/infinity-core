import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  INBOUND_COMMUNICATION_PROCESSING_MISSION,
  INBOUND_COMMUNICATION_PROCESSING_MISSION_ID,
  INBOUND_COMMUNICATION_PROCESSING_SOURCE,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
} from "./constants";
import { runCreInboundObservationCycle } from "./cre-inbound-observer";

export const INBOUND_COMMUNICATION_PROCESSING_STEPS = [
  "ORCHESTRATE_INBOUND_PROCESSING",
  "INGEST_TRACKED_INBOUND",
  "CLASSIFY_AND_POLICY",
  "GROUNDED_REPLY_SEND",
  "EVIDENCE_CONTRACT_AUDIT",
] as const;

export async function executeInboundCommunicationProcessingMission(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
  observation?: Awaited<ReturnType<typeof runCreInboundObservationCycle>>;
} = {}) {
  return runInstrumentedMission<Awaited<ReturnType<typeof runCreInboundObservationCycle>>>({
    emit: {
      organizationId: LOCKED_ORG,
      ventureId: LOCKED_VENTURE,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_EXPERIMENT,
      missionId: INBOUND_COMMUNICATION_PROCESSING_MISSION_ID,
      missionType: INBOUND_COMMUNICATION_PROCESSING_MISSION,
      source: INBOUND_COMMUNICATION_PROCESSING_SOURCE,
      technicalDetail: "simulation:FALSE;trackedOnly:TRUE",
      executionClass: "VENTURE_EXECUTION" as const,
    },
    knownSteps: [...INBOUND_COMMUNICATION_PROCESSING_STEPS],
    orchestrationStepType: "ORCHESTRATE_INBOUND_PROCESSING",
    run: async (handle) => {
      const observation =
        input.observation ??
        (await handle.step({
          stepType: "INGEST_TRACKED_INBOUND",
          engine: "organic_growth",
          summary: "Ingesting new tracked inbound for Caleb and Michael.",
          run: async () => runCreInboundObservationCycle({ fetchImpl: input.fetchImpl, now: input.now }),
        }));
      if (input.observation) {
        await handle.step({
          stepType: "INGEST_TRACKED_INBOUND",
          engine: "organic_growth",
          summary: "Recording already-ingested tracked inbound for Caleb and Michael.",
          run: async () => observation.processing,
        });
      }
      await handle.step({
        stepType: "CLASSIFY_AND_POLICY",
        engine: "market_validation",
        summary: "Classifying inbound and applying autonomous policy.",
        run: async () => observation.processing,
      });
      if (observation.processing.autoExecute > 0) {
        await handle.step({
          stepType: "GROUNDED_REPLY_SEND",
          engine: "organic_growth",
          summary: "Sending at most one in-thread autonomous reply per inbound when AUTO_EXECUTE.",
          run: async () => ({ sent: observation.processing.autonomousRepliesSent }),
        });
      }
      await handle.step({
        stepType: "EVIDENCE_CONTRACT_AUDIT",
        engine: "market_validation",
        summary: "Confirming inbound replies do not automatically become experiment evidence.",
        run: async () => observation.evidence,
      });
      return observation;
    },
  });
}
