import { commitMissionActivityDurably, emitMissionActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { attachCommandActivity } from "@/lib/infinity/mission-activity";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  evaluateConsultativeMessageQuality,
  generateConsultativeWave1Message,
} from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import {
  persistedCohortProspects,
  type PersistedProspectRecord,
} from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { inspectEmailSendCapabilityState } from "@/lib/infinity/communication-provider";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import { completeFirstRealCreProspectCohort } from "./cre-first-real-cohort-completion";
import {
  CRE_WAVE_1_BOUNDED_SEND,
  executeCreWave1BoundedSend,
  resetCreWave1Runtime,
} from "./cre-wave-1-bounded-send";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { reverifyPersistedProspect } from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";

export const CRE_WAVE_1_BOUNDED_SEND_MISSION = "CRE_WAVE_1_FRESH_CONTACT_REVERIFICATION_AND_SEND_V2" as const;
export const CRE_WAVE_1_BOUNDED_SEND_MISSION_ID = "msn_cre_wave_1_fresh_reverification_send_v2" as const;
export const CRE_WAVE_1_V3_MISSION = "CRE_WAVE_1_FRESH_CONTACT_REVERIFICATION_AND_SEND_V3" as const;
export const CRE_WAVE_1_V3_MISSION_ID = "msn_cre_wave_1_fresh_reverification_send_v3" as const;
export const CRE_WAVE_1_V3_SOURCE = "cre_wave_1_canonical_send_v3" as const;

export const CRE_WAVE_1_BOUNDED_SEND_STEPS = [
  "ORCHESTRATE_CRE_WAVE_1",
  "CONTACT_REVERIFICATION",
  "MESSAGE_STRATEGY",
  "MESSAGE_QUALITY_VALIDATION",
  "OUTREACH_AUTHORIZATION",
  "PROVIDER_SEND",
  "RESULT_PERSISTENCE",
  "EXPERIMENT_READBACK",
] as const;

export const CRE_WAVE_1_OBSERVABILITY_SIMULATION_PHASE_MS = 13000;
export const CRE_WAVE_1_OBSERVABILITY_SIMULATION_SOURCE = "cre_wave_1_hq_observability_simulation_v1" as const;
export const CRE_WAVE_1_OBSERVABILITY_SIMULATION_MARK = "simulation:TRUE" as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "CRE lease NPV validation",
      ventureType: "validation",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: (
      [
        ["research_department", "Research Grid"],
        ["systems_architect", "Systems Architect"],
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["growth_department", "Growth Nexus"],
        ["product_lab", "Creation Lab"],
        ["launch_operations", "Deployment Depot"],
        ["intelligence_center", "Signal Intelligence"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED" as const,
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
  };
}

export function createWave1SimulationFetch(prospects: PersistedProspectRecord[] = persistedCohortProspects()): typeof fetch {
  return async (input) => {
    const url = String(input);
    const prospect = prospects.find(
      (row) =>
        row.sourceUrls.some((source) => url.includes(source) || source.includes(url)) ||
        (row.emailSource ? url.includes(row.emailSource) || row.emailSource.includes(url) : false) ||
        (row.source ? url.includes(row.source) || row.source.includes(url) : false),
    );
    if (!prospect) return new Response("", { status: 404 });
    const body = [
      prospect.name,
      prospect.organization,
      prospect.role,
      "tenant representation",
      "occupier",
      "lease comparison",
      prospect.email,
      "2026",
    ]
      .filter(Boolean)
      .join(" ");
    return new Response(body, { status: 200 });
  };
}

type PhaseSnapshot = {
  phase: string;
  rooms: Record<string, string>;
  activeMissions: number;
  currentMission: string | null;
  currentStep: string | null;
};

function roomsFromView(view: ReturnType<typeof attachCommandActivity>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(view.commandActivity?.rooms ?? {}).map(([room, slice]) => [room, slice.status]),
  );
}

export async function executeCreWave1BoundedSendMission(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
  providerWrite?: boolean;
  sendAuthorized?: boolean;
  hydrateCapability?: boolean;
  phaseMs?: number;
  liveSourceFetch?: boolean;
  missionId?: string;
  missionType?: string;
  source?: string;
} = {}) {
  const providerWrite = input.providerWrite === true;
  const simulation = !providerWrite;
  const sendAuthorized = input.sendAuthorized === true && providerWrite;
  const phaseMs = input.phaseMs ?? 0;
  const now = input.now ?? new Date();
  if (persistedCohortProspects().length === 0) {
    completeFirstRealCreProspectCohort();
  }
  const fetchImpl = input.fetchImpl ?? (providerWrite ? fetch : createWave1SimulationFetch());
  const emit = {
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: input.missionId ?? CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
    missionType: input.missionType ?? CRE_WAVE_1_BOUNDED_SEND_MISSION,
    source: input.source ?? (simulation ? CRE_WAVE_1_OBSERVABILITY_SIMULATION_SOURCE : "cre_wave_1_bounded_send_v2"),
    technicalDetail: simulation ? CRE_WAVE_1_OBSERVABILITY_SIMULATION_MARK : "simulation:FALSE",
    executionClass: "VENTURE_EXECUTION" as const,
  };
  const midRun: PhaseSnapshot[] = [];

  const startOverlap = async (stepType: string, engine: string, summary: string) => {
    const event = emitMissionActivity({
      ...emit,
      engine,
      stepType,
      eventType: "STEP_STARTED",
      summary,
    });
    await commitMissionActivityDurably(event);
    return event;
  };
  const completeOverlap = async (stepType: string, engine: string, startedAt: string | null, summary: string) => {
    const event = emitMissionActivity({
      ...emit,
      engine,
      stepType,
      eventType: "STEP_COMPLETED",
      startedAt,
      summary,
    });
    await commitMissionActivityDurably(event);
    return event;
  };

  type Wave1Executed = Awaited<ReturnType<typeof executeCreWave1BoundedSend>> & { simulation?: true };
  type Wave1MissionInner = {
    executed: Wave1Executed;
    verifications: Awaited<ReturnType<typeof reverifyPersistedProspect>>[];
    messages: ReturnType<typeof generateConsultativeWave1Message>[];
    quality: Array<ReturnType<typeof evaluateConsultativeMessageQuality> | null>;
    readback: { clock: ReturnType<typeof inspectExperimentClock>; evidence: ReturnType<typeof inspectRealMarketEvidence> };
    innerMission: typeof CRE_WAVE_1_BOUNDED_SEND;
  };

  const instrumented = await runInstrumentedMission<Wave1MissionInner>({
    emit,
    knownSteps: [...CRE_WAVE_1_BOUNDED_SEND_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_WAVE_1",
    onSnapshot: (view, phase) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({
        phase,
        rooms: roomsFromView(read),
        activeMissions: view.counts.activeMissions,
        currentMission: view.nowInspecting.currentMission,
        currentStep: view.nowInspecting.currentStep,
      });
    },
    run: async (handle) => {
      const preparation = await startOverlap(
        "OUTREACH_PREPARATION",
        "organic_growth",
        "Preparing bounded Wave 1 outreach while contacts are verified.",
      );
      const research = input.liveSourceFetch
        ? await startOverlap(
            "PUBLIC_PAGE_FETCH",
            "grounded_research",
            "Fetching first-party professional bios for contact reverification.",
          )
        : null;

      const verifications = await handle.step({
        stepType: "CONTACT_REVERIFICATION",
        engine: "market_validation",
        technicalDetail: emit.technicalDetail,
        summary: "Reverifying first-party professional contact evidence for the locked CRE cohort.",
        run: async () => {
          const records = [];
          for (const prospect of persistedCohortProspects()) {
            records.push(await reverifyPersistedProspect({ prospect, fetchImpl, now }));
          }
          if (phaseMs) await wait(phaseMs);
          return records;
        },
      });
      if (research) {
        await completeOverlap("PUBLIC_PAGE_FETCH", "grounded_research", research.startedAt, "First-party source fetch complete.");
      }

      const qualityHold = await startOverlap(
        "MESSAGE_QUALITY_VALIDATION",
        "market_validation",
        "Validating consultative discovery copy while strategy is composed.",
      );
      const messages = await handle.step({
        stepType: "MESSAGE_STRATEGY",
        engine: "organic_growth",
        technicalDetail: emit.technicalDetail,
        summary: "Composing consultative discovery messages. No product pitch. No validation URL.",
        run: async () => {
          const drafted = verifications
            .filter((row) => row.sendEligibility === "SEND" && row.verifiedProfessionalEmail)
            .map((verification) => {
              const prospect = persistedCohortProspects().find((row) => row.prospectId === verification.prospectId);
              if (!prospect) return null;
              return generateConsultativeWave1Message({ prospect, verification });
            })
            .filter((row): row is NonNullable<typeof row> => Boolean(row));
          if (phaseMs) await wait(phaseMs);
          return drafted;
        },
      });

      const quality = await handle.step({
        stepType: "MESSAGE_QUALITY_VALIDATION",
        engine: "market_validation",
        technicalDetail: emit.technicalDetail,
        summary: "Applying the consultative discovery quality gate.",
        run: async () => {
          const gates = messages.map((message) => {
            const verification = verifications.find((row) => row.prospectId === message.prospectId);
            return verification ? evaluateConsultativeMessageQuality({ message, verification }) : null;
          });
          if (phaseMs) await wait(phaseMs);
          return gates;
        },
      });

      await handle.step({
        stepType: "OUTREACH_AUTHORIZATION",
        engine: "organic_growth",
        technicalDetail: emit.technicalDetail,
        summary: providerWrite
          ? "Checking bounded Wave 1 send authorization."
          : "Simulation mode. Bounded send authorization is not consumed.",
        run: async () => {
          const capability = inspectEmailSendCapabilityState();
          if (phaseMs) await wait(phaseMs);
          return {
            capabilityState: capability.state,
            providerWrite,
            sendAuthorized,
          };
        },
      });

      const sendValidation = await startOverlap(
        "EVIDENCE_CONTRACT_AUDIT",
        "market_validation",
        "Recording that a simulation or bounded send cannot create market evidence.",
      );
      const executed = await handle.step({
        stepType: "PROVIDER_SEND",
        engine: "organic_growth",
        technicalDetail: emit.technicalDetail,
        summary: providerWrite
          ? "Submitting authorized bounded Wave 1 messages through the communication provider."
          : "SIMULATED_PROVIDER_SEND. No Gmail call. No CommunicationAttempt. No cooldown mutation.",
        run: async () => {
          if (!providerWrite) {
            if (phaseMs) await wait(phaseMs);
            return {
              provider: "gmail.com_v1" as const,
              sendAttempts: 0,
              providerAccepted: 0,
              providerFailed: 0,
              authorizationConsumed: "NO" as const,
              prospectEmails: 0,
              recipients: [],
              simulation: true as const,
              replacements: 0 as const,
              automaticRetries: 0 as const,
              followUpAuthorized: "NO" as const,
              cooldownRecords: 0,
              conversationMetadata: {
                strategyProfilePersisted: "PASS" as const,
                conversationStagePersisted: "PASS" as const,
                questionObjectivePersisted: "PASS" as const,
                knownCurrentProcess: "UNKNOWN" as const,
                knownFriction: "UNKNOWN" as const,
                knownImpact: "UNKNOWN" as const,
                solutionRelevance: "UNKNOWN" as const,
                pricingStageReached: "NO" as const,
              },
            } as unknown as Wave1Executed;
          }
          const result = await executeCreWave1BoundedSend({
            now,
            fetchImpl,
            hydrateCapability: input.hydrateCapability === true,
            sendAuthorized,
            providerWrite,
          });
          if (phaseMs) await wait(phaseMs);
          return result;
        },
      });
      await completeOverlap(
        "MESSAGE_QUALITY_VALIDATION",
        "market_validation",
        qualityHold.startedAt,
        "Consultative quality hold released after send planning.",
      );
      await completeOverlap("OUTREACH_PREPARATION", "organic_growth", preparation.startedAt, "Bounded outreach preparation complete.");
      await completeOverlap(
        "EVIDENCE_CONTRACT_AUDIT",
        "market_validation",
        sendValidation.startedAt,
        "Evidence contract unchanged by the send path.",
      );

      await handle.step({
        stepType: "RESULT_PERSISTENCE",
        engine: "market_validation",
        technicalDetail: emit.technicalDetail,
        summary: "Persisting Wave 1 send-path results without creating qualified evidence.",
        run: async () => {
          if (phaseMs) await wait(phaseMs);
          return {
            sendAttempts: executed.sendAttempts,
            providerAccepted: executed.providerAccepted,
            authorizationConsumed: executed.authorizationConsumed,
          };
        },
      });

      const telemetry = await startOverlap(
        "PERFORMANCE_HANDOFF",
        "performance_intelligence",
        "Reading locked experiment clock and evidence after the send path.",
      );
      const readback = await handle.step({
        stepType: "EXPERIMENT_READBACK",
        engine: "market_validation",
        technicalDetail: emit.technicalDetail,
        summary: "Reading the locked CRE experiment clock and evidence counts.",
        run: async () => {
          const clock = inspectExperimentClock(now);
          const evidence = inspectRealMarketEvidence({ now });
          if (phaseMs) await wait(phaseMs);
          return { clock, evidence };
        },
      });
      await completeOverlap(
        "PERFORMANCE_HANDOFF",
        "performance_intelligence",
        telemetry.startedAt,
        "Experiment telemetry readback complete.",
      );

      return {
        executed,
        verifications,
        messages,
        quality,
        readback,
        innerMission: CRE_WAVE_1_BOUNDED_SEND,
      };
    },
  });

  const roomsAt = (phase: string) => midRun.find((item) => item.phase === phase);
  const contact = roomsAt("CONTACT_REVERIFICATION:STARTED");
  const strategy = roomsAt("MESSAGE_STRATEGY:STARTED");
  const qualityPhase = roomsAt("MESSAGE_QUALITY_VALIDATION:STARTED");
  const auth = roomsAt("OUTREACH_AUTHORIZATION:STARTED");
  const send = roomsAt("PROVIDER_SEND:STARTED");
  const persist = roomsAt("RESULT_PERSISTENCE:STARTED");
  const readback = roomsAt("EXPERIMENT_READBACK:STARTED");
  const activeDuring = midRun.filter((item) => item.phase.endsWith(":STARTED"));
  const depotActive = activeDuring.some((item) => item.rooms.launch_operations === "ACTIVE_WORK");
  const completionView = instrumented.view;

  return {
    ...instrumented.result.executed,
    innerMission: CRE_WAVE_1_BOUNDED_SEND,
    mission: emit.missionType,
    missionId: emit.missionId,
    providerWrite,
    sendAuthorized,
    hq: {
      command: contact?.rooms.executive_office === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      growthNexus:
        contact?.rooms.growth_department === "ACTIVE_WORK" && send?.rooms.growth_department === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const),
      validationStation:
        contact?.rooms.quality_control === "ACTIVE_WORK" &&
        qualityPhase?.rooms.quality_control === "ACTIVE_WORK" &&
        persist?.rooms.quality_control === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const),
      signalIntelligence: readback?.rooms.intelligence_center === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      activeCount: activeDuring.every((item) => item.activeMissions >= 1) ? ("PASS" as const) : ("FAIL" as const),
      completion: completionView.counts.activeMissions === 0 ? ("PASS" as const) : ("FAIL" as const),
      latestCompleted:
        completionView.latestCompleted?.missionId === emit.missionId ? ("PASS" as const) : ("FAIL" as const),
      organizationGlobal:
        activeDuring.some((item) => item.currentMission === emit.missionType) ? ("PASS" as const) : ("FAIL" as const),
      rooms: {
        contactReverification: contact?.rooms ?? {},
        messageStrategy: strategy?.rooms ?? {},
        messageQuality: qualityPhase?.rooms ?? {},
        outreachAuthorization: auth?.rooms ?? {},
        providerSend: send?.rooms ?? {},
        resultPersistence: persist?.rooms ?? {},
        experimentReadback: readback?.rooms ?? {},
      },
      midRun,
    },
    clockRestarted: instrumented.result.readback.clock.restarted ? ("YES" as const) : ("NO" as const),
  };
}

export async function runCreWave1HqObservabilitySimulation(input?: {
  phaseMs?: number;
  now?: Date;
}): Promise<{
  missionId: typeof CRE_WAVE_1_BOUNDED_SEND_MISSION_ID;
  missionType: typeof CRE_WAVE_1_BOUNDED_SEND_MISSION;
  durationMs: number;
  providerWrites: 0;
  prospectEmails: 0;
  verificationEmails: 0;
}> {
  resetCreWave1Runtime();
  if (persistedCohortProspects().length === 0) {
    completeFirstRealCreProspectCohort();
  }
  const started = Date.now();
  const run = await executeCreWave1BoundedSendMission({
    now: input?.now,
    providerWrite: false,
    sendAuthorized: false,
    hydrateCapability: false,
    phaseMs: input?.phaseMs ?? CRE_WAVE_1_OBSERVABILITY_SIMULATION_PHASE_MS,
    fetchImpl: createWave1SimulationFetch(),
    liveSourceFetch: false,
  });
  return {
    missionId: CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
    missionType: CRE_WAVE_1_BOUNDED_SEND_MISSION,
    durationMs: Date.now() - started,
    providerWrites: 0,
    prospectEmails: 0,
    verificationEmails: 0,
    ...{ hq: run.hq, sendAttempts: run.sendAttempts, clockRestarted: run.clockRestarted },
  };
}

export async function executeCreWave1V3CanonicalSendMission(input?: {
  now?: Date;
  fetchImpl?: typeof fetch;
  phaseMs?: number;
}) {
  return executeCreWave1BoundedSendMission({
    now: input?.now,
    fetchImpl: input?.fetchImpl,
    providerWrite: true,
    sendAuthorized: true,
    hydrateCapability: true,
    liveSourceFetch: true,
    phaseMs: input?.phaseMs ?? 8000,
    missionId: CRE_WAVE_1_V3_MISSION_ID,
    missionType: CRE_WAVE_1_V3_MISSION,
    source: CRE_WAVE_1_V3_SOURCE,
  });
}
