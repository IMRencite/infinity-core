import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { inspectEmailSendCapabilityState } from "@/lib/infinity/communication-provider";
import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  INBOUND_MISSION,
  INBOUND_MISSION_ID,
  INBOUND_MISSION_STEPS,
  INBOUND_SOURCE,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
} from "./constants";
import { inspectGmailInboundScopes } from "./gmail-inbound-scopes";
import { prepareCreWave1TrackedConversations } from "./cre-tracked";
import { inspectInboundCapabilityStates } from "./capabilities";
import { inspectMailboxWatch } from "./mailbox-watch";
import { projectCommunicationIntelligence } from "./hq-intelligence";
import { applyInboundEvidenceToExperiment } from "./evidence-bridge";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import type { NormalizedInboundPayload } from "./inbound-event";
import { processInboundReply } from "./process-inbound";
import type { CapabilityReadModel, CommunicationIntelligenceProjection, GmailInboundScopeInspection } from "./types";
import type { MailboxWatchImplementation } from "./mailbox-watch";

type InboundMissionResult = {
  scopes: GmailInboundScopeInspection;
  prepared: ReturnType<typeof prepareCreWave1TrackedConversations>;
  ingested: ReturnType<typeof processInboundReply>[];
  evidence: ReturnType<typeof applyInboundEvidenceToExperiment>;
  hq: CommunicationIntelligenceProjection;
  capabilities: CapabilityReadModel;
  watch: MailboxWatchImplementation;
  sendCapability: ReturnType<typeof inspectEmailSendCapabilityState>["state"];
  clock: ReturnType<typeof inspectExperimentClock>;
};

export async function executeInboundCommunicationRuntimeMission(input: {
  now?: Date;
  simulatedInbound?: NormalizedInboundPayload[];
} = {}) {
  const emit = {
    organizationId: LOCKED_ORG,
    ventureId: LOCKED_VENTURE,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_EXPERIMENT,
    missionId: INBOUND_MISSION_ID,
    missionType: INBOUND_MISSION,
    source: INBOUND_SOURCE,
    technicalDetail: "simulation:FALSE;liveReply:FALSE;providerWrites:0",
    executionClass: "VENTURE_EXECUTION" as const,
  };
  const instrumented = await runInstrumentedMission<InboundMissionResult>({
    emit,
    knownSteps: [...INBOUND_MISSION_STEPS],
    orchestrationStepType: "ORCHESTRATE_INBOUND_COMMUNICATION",
    run: async (handle) => {
      const scopes = await handle.step({
        stepType: "INSPECT_INBOUND_SCOPES",
        engine: "market_validation",
        summary: "Inspecting Gmail scopes required for inbound read without changing send verification.",
        run: () => inspectGmailInboundScopes(),
      });
      const prepared = await handle.step({
        stepType: "PREPARE_TRACKED_CONVERSATIONS",
        engine: "organic_growth",
        summary: "Preparing Caleb and Michael tracked conversations. Ben and Stephanie remain unsent.",
        run: () => prepareCreWave1TrackedConversations(input.now),
      });
      const ingested = await handle.step({
        stepType: "INGEST_INBOUND_EVENTS",
        engine: "organic_growth",
        summary: "Ingesting only simulated or already-normalized tracked-thread events. No live mailbox read.",
        run: () => (input.simulatedInbound ?? []).map((payload) => processInboundReply(payload)),
      });
      await handle.step({
        stepType: "CLASSIFY_AND_POLICY",
        engine: "market_validation",
        summary: "Applying intent classification and autonomous communication policy.",
        run: () => ingested.map((row) => row.outcome),
      });
      await handle.step({
        stepType: "REPLY_PLANNING",
        engine: "organic_growth",
        summary: "Planning grounded replies only. Live reply send is disabled for this build milestone.",
        run: () => ({ liveReplyExecuted: false as const, providerWrites: 0 as const }),
      });
      const evidence = await handle.step({
        stepType: "EVIDENCE_CONTRACT_AUDIT",
        engine: "market_validation",
        summary: "Inbound processing does not create qualified, strong-intent, or pricing evidence by itself.",
        run: () => applyInboundEvidenceToExperiment(),
      });
      const hq = await handle.step({
        stepType: "HQ_INTELLIGENCE_PROJECTION",
        engine: "performance_intelligence",
        summary: "Projecting conversation intelligence for HQ.",
        run: () => projectCommunicationIntelligence(),
      });
      return {
        scopes,
        prepared,
        ingested,
        evidence,
        hq,
        capabilities: inspectInboundCapabilityStates(),
        watch: inspectMailboxWatch(),
        sendCapability: inspectEmailSendCapabilityState().state,
        clock: inspectExperimentClock(input.now),
      };
    },
  });
  const result = instrumented.result;
  return {
    mission: INBOUND_MISSION,
    missionId: INBOUND_MISSION_ID,
    scopes: result.scopes,
    prepared: result.prepared,
    ingested: result.ingested,
    evidence: result.evidence,
    hq: result.hq,
    capabilities: result.capabilities,
    watch: result.watch,
    sendCapability: result.sendCapability,
    clock: result.clock,
    view: instrumented.view,
    liveReplyExecuted: false as const,
    providerWrites: 0 as const,
  };
}
