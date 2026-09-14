import { commitMissionActivityDurably } from "./commit";
import { emitMissionActivity } from "./emit";
import { projectCommandActivity } from "./project";
import { listMissionActivityEvents } from "./store";
import type { CommandActivityView, EmitMissionActivityInput, MissionActivityEvent } from "./types";

async function emitCommitted(input: EmitMissionActivityInput): Promise<MissionActivityEvent> {
  const event = emitMissionActivity(input);
  await commitMissionActivityDurably(event);
  return event;
}

function latestMissionEvent(organizationId: string, missionId: string): MissionActivityEvent | null {
  const existing = listMissionActivityEvents({ organizationId, missionId });
  return existing[existing.length - 1] ?? null;
}

function missionIsOpen(organizationId: string, missionId: string): boolean {
  const latest = latestMissionEvent(organizationId, missionId);
  if (!latest) return false;
  return latest.eventType !== "MISSION_COMPLETED" && latest.eventType !== "MISSION_FAILED";
}

export type InstrumentedStepEmit = Omit<EmitMissionActivityInput, "eventType" | "status">;

export async function runInstrumentedStep<T>(input: {
  emit: InstrumentedStepEmit;
  totalKnownSteps?: number;
  completedBefore?: number;
  emitGroundedProgress?: boolean;
  onStarted?: (started: MissionActivityEvent, view: CommandActivityView) => void;
  run: () => Promise<T> | T;
}): Promise<{ result: T; started: MissionActivityEvent; completed: MissionActivityEvent }> {
  const completedBefore = input.completedBefore ?? 0;
  const total = input.totalKnownSteps ?? 0;
  const started = await emitCommitted({
    ...input.emit,
    eventType: "STEP_STARTED",
    progress: total > 0 ? { completedSteps: completedBefore, totalKnownSteps: total, source: "completed_over_known" } : null,
  });
  if (input.emitGroundedProgress && total > 0) {
    await emitCommitted({
      ...input.emit,
      eventType: "STEP_PROGRESS",
      startedAt: started.startedAt,
      progress: { completedSteps: completedBefore, totalKnownSteps: total, source: "completed_over_known" },
    });
  }
  input.onStarted?.(
    started,
    projectCommandActivity({
      organizationId: input.emit.organizationId,
      ventureId: input.emit.ventureId,
    }),
  );
  try {
    const result = await input.run();
    const completed = await emitCommitted({
      ...input.emit,
      eventType: "STEP_COMPLETED",
      startedAt: started.startedAt,
      progress: total > 0 ? { completedSteps: completedBefore + 1, totalKnownSteps: total, source: "completed_over_known" } : null,
    });
    return { result, started, completed };
  } catch (error) {
    await emitCommitted({
      ...input.emit,
      eventType: "STEP_FAILED",
      startedAt: started.startedAt,
      failureCode: error instanceof Error ? error.name : "STEP_FAILED",
      technicalDetail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export type InstrumentedMissionEmit = Omit<EmitMissionActivityInput, "eventType" | "status" | "engine" | "stepType">;

export type InstrumentedMissionHandle = {
  step: <R>(input: {
    stepType: string;
    engine: string;
    summary?: string;
    technicalDetail?: string | null;
    emitGroundedProgress?: boolean;
    run: () => Promise<R> | R;
  }) => Promise<R>;
  progress: (input: { stepType: string; engine: string; completedSteps: number; summary?: string }) => MissionActivityEvent;
  waiting: (input: { stepType: string; engine?: string; summary: string; technicalDetail?: string }) => MissionActivityEvent;
  blocked: (input: { stepType?: string; blocker: string; authorizationRequired?: string | null; summary?: string }) => MissionActivityEvent;
  project: () => CommandActivityView;
};

export async function runInstrumentedMission<T>(input: {
  emit: InstrumentedMissionEmit;
  knownSteps: string[];
  orchestrationStepType?: string;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
  run: (handle: InstrumentedMissionHandle) => Promise<T>;
}): Promise<{
  result: T;
  view: CommandActivityView;
  snapshots: Array<{ phase: string; view: CommandActivityView }>;
  events: MissionActivityEvent[];
  instrumentationIncomplete: false | "COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE";
}> {
  const snapshots: Array<{ phase: string; view: CommandActivityView }> = [];
  const emitBase = {
    ...input.emit,
    engine: "mission_runtime",
    stepType: input.orchestrationStepType ?? "ORCHESTRATE_MISSION",
  };
  const project = () =>
    projectCommandActivity({
      organizationId: input.emit.organizationId,
      ventureId: input.emit.ventureId,
      knownSteps: input.knownSteps,
    });
  const capture = (phase: string) => {
    const view = project();
    snapshots.push({ phase, view });
    input.onSnapshot?.(view, phase);
    return view;
  };

  if (!missionIsOpen(input.emit.organizationId, input.emit.missionId)) {
    await emitCommitted({
      ...emitBase,
      eventType: "MISSION_STARTED",
      summary: input.emit.summary ?? "Started a coordinated mission",
    });
  }
  capture("MISSION_STARTED");

  let completedBefore = 0;
  let endedAs: "completed" | "blocked" | "failed" = "completed";
  const handle: InstrumentedMissionHandle = {
    step: async (stepInput) => {
      const executed = await runInstrumentedStep({
        emit: {
          ...input.emit,
          engine: stepInput.engine,
          stepType: stepInput.stepType,
          summary: stepInput.summary,
          technicalDetail: stepInput.technicalDetail ?? null,
        },
        totalKnownSteps: input.knownSteps.length,
        completedBefore,
        emitGroundedProgress: stepInput.emitGroundedProgress ?? true,
        onStarted: (_started, view) => {
          snapshots.push({ phase: `${stepInput.stepType}:STARTED`, view });
          input.onSnapshot?.(view, `${stepInput.stepType}:STARTED`);
        },
        run: stepInput.run,
      });
      completedBefore += 1;
      capture(`${stepInput.stepType}:COMPLETED`);
      return executed.result;
    },
    progress: (progressInput) => {
      const event = emitMissionActivity({
        ...input.emit,
        engine: progressInput.engine,
        stepType: progressInput.stepType,
        eventType: "STEP_PROGRESS",
        summary: progressInput.summary,
        progress: {
          completedSteps: progressInput.completedSteps,
          totalKnownSteps: input.knownSteps.length,
          source: "completed_over_known",
        },
      });
      void commitMissionActivityDurably(event);
      return event;
    },
    waiting: (waitingInput) => {
      const event = emitMissionActivity({
        ...input.emit,
        engine: waitingInput.engine ?? "mission_runtime",
        stepType: waitingInput.stepType,
        eventType: "MISSION_WAITING",
        summary: waitingInput.summary,
        technicalDetail: waitingInput.technicalDetail ?? null,
      });
      void commitMissionActivityDurably(event);
      return event;
    },
    blocked: (blockedInput) => {
      endedAs = "blocked";
      const event = emitMissionActivity({
        ...emitBase,
        stepType: blockedInput.stepType ?? emitBase.stepType,
        eventType: "MISSION_BLOCKED",
        blocker: blockedInput.blocker,
        authorizationRequired: blockedInput.authorizationRequired ?? null,
        summary: blockedInput.summary,
      });
      void commitMissionActivityDurably(event);
      return event;
    },
    project,
  };

  try {
    const result = await input.run(handle);
    if (endedAs === "completed") {
      await emitCommitted({
        ...emitBase,
        eventType: "MISSION_COMPLETED",
        summary: "Finished the current mission",
        progress: { completedSteps: completedBefore, totalKnownSteps: input.knownSteps.length, source: "completed_over_known" },
      });
    }
    const view = capture("MISSION_COMPLETED");
    const sawActive = snapshots.some((item) => item.view.counts.activeMissions >= 1);
    return {
      result,
      view,
      snapshots,
      events: listMissionActivityEvents({ organizationId: input.emit.organizationId, missionId: input.emit.missionId }),
      instrumentationIncomplete: sawActive ? false : "COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE",
    };
  } catch (error) {
    await emitCommitted({
      ...emitBase,
      eventType: "MISSION_FAILED",
      failureCode: error instanceof Error ? error.name : "MISSION_FAILED",
      technicalDetail: error instanceof Error ? error.message : String(error),
    });
    capture("MISSION_FAILED");
    throw error;
  }
}

export function ingestMissionRuntimeEvent(input: {
  eventType: string;
  message: string;
  organizationId?: string;
  missionId?: string;
  runtimeInstanceId?: string | null;
  correlationId?: string | null;
  occurredAt?: string;
}): MissionActivityEvent | null {
  if (!input.missionId || !input.organizationId) return null;
  const mapped =
    input.eventType === "mission.runtime_started"
      ? "MISSION_STARTED"
      : input.eventType === "mission.runtime_blocked"
        ? "MISSION_BLOCKED"
        : input.eventType === "mission.runtime_waiting" || input.eventType === "mission.stage_waiting"
          ? "MISSION_WAITING"
          : input.eventType === "mission.runtime_completed"
            ? "MISSION_COMPLETED"
            : input.eventType === "mission.runtime_failed"
              ? "MISSION_FAILED"
              : input.eventType === "mission.stage_started"
                ? "STEP_STARTED"
                : input.eventType === "mission.stage_completed"
                  ? "STEP_COMPLETED"
                  : input.eventType === "mission.stage_blocked"
                    ? "MISSION_BLOCKED"
                    : null;
  if (!mapped) return null;
  return emitMissionActivity({
    organizationId: input.organizationId,
    missionId: input.missionId,
    missionType: "MISSION_RUNTIME",
    engine: "mission_runtime",
    stepType: input.eventType.replace("mission.", ""),
    eventType: mapped,
    summary: input.message,
    source: "mission_runtime",
    observedAt: input.occurredAt,
    traceability: {
      missionId: input.missionId,
      runtimeInstanceId: input.runtimeInstanceId ?? null,
      correlationId: input.correlationId ?? null,
    },
    executionClass: "VENTURE_EXECUTION",
  });
}
