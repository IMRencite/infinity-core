import { createHash } from "node:crypto";
import { MISSION_ACTIVITY_MODEL } from "./constants";
import { narrateActivity } from "./narrate";
import { roomForStep } from "./rooms";
import { persistMissionActivityEventBestEffort } from "./persist-engine";
import { missionActivityStoreSize, recordMissionActivityEvent } from "./store";
import { groundedPercent, statusFromEventType } from "./status";
import type { EmitMissionActivityInput, GroundedProgress, MissionActivityEvent } from "./types";

function eventIdFor(input: EmitMissionActivityInput, observedAt: string): string {
  const seed = [
    input.missionId,
    input.eventType,
    input.stepType,
    input.stepId ?? "",
    observedAt,
    input.traceability?.correlationId ?? "",
    input.progress && "completedSteps" in input.progress ? String(input.progress.completedSteps) : "",
    input.summary ?? "",
    String(missionActivityStoreSize()),
  ].join("|");
  return `mae_${createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
}

function normalizeProgress(
  progress: EmitMissionActivityInput["progress"],
): GroundedProgress | null {
  if (!progress) return null;
  const completed = progress.completedSteps;
  const total = progress.totalKnownSteps;
  const percent = "percent" in progress && progress.percent != null
    ? progress.percent
    : groundedPercent(completed, total);
  if (total <= 0) {
    return { completedSteps: completed, totalKnownSteps: 0, percent: null, source: progress.source };
  }
  return { completedSteps: completed, totalKnownSteps: total, percent, source: progress.source };
}

export function emitMissionActivity(input: EmitMissionActivityInput): MissionActivityEvent {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const room = input.room ?? roomForStep(input.stepType, input.engine);
  const status = input.status ?? statusFromEventType(input.eventType);
  const event: MissionActivityEvent = {
    schema: MISSION_ACTIVITY_MODEL,
    eventId: eventIdFor(input, observedAt),
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    candidateId: input.candidateId ?? null,
    experimentId: input.experimentId ?? null,
    missionId: input.missionId,
    missionType: input.missionType,
    engine: input.engine,
    room,
    stepId: input.stepId ?? null,
    stepType: input.stepType,
    eventType: input.eventType,
    status,
    summary: input.summary ?? narrateActivity({
      eventType: input.eventType,
      stepType: input.stepType,
      room,
      missionType: input.missionType,
    }),
    technicalDetail: input.technicalDetail ?? null,
    progress: normalizeProgress(input.progress ?? null),
    startedAt: input.startedAt ?? (input.eventType.endsWith("_STARTED") ? observedAt : null),
    completedAt: input.completedAt ?? (input.eventType.endsWith("_COMPLETED") || input.eventType.endsWith("_FAILED") ? observedAt : null),
    observedAt,
    source: input.source ?? "mission_activity",
    traceability: {
      missionId: input.missionId,
      runtimeInstanceId: input.traceability?.runtimeInstanceId ?? null,
      artifactId: input.traceability?.artifactId ?? null,
      deploymentId: input.traceability?.deploymentId ?? null,
      experimentId: input.experimentId ?? input.traceability?.experimentId ?? null,
      candidateId: input.candidateId ?? input.traceability?.candidateId ?? null,
      workerId: input.traceability?.workerId ?? null,
      provider: input.traceability?.provider ?? null,
      correlationId: input.traceability?.correlationId ?? null,
      traceId: input.traceability?.traceId ?? null,
    },
    synthetic: Boolean(input.synthetic),
    executionClass: input.executionClass ?? "VENTURE_EXECUTION",
    blocker: input.blocker ?? null,
    authorizationRequired: input.authorizationRequired ?? null,
    costState: input.costState ?? null,
    failureCode: input.failureCode ?? null,
  };
  const recorded = recordMissionActivityEvent(event);
  void persistMissionActivityEventBestEffort(recorded);
  void import("@/lib/infinity/operator-console/hq-live-events")
    .then((mod) => {
      mod.publishHqRuntimeEventFromMission({
        eventType: recorded.eventType,
        ventureId: recorded.ventureId,
        missionId: recorded.missionId,
        room: recorded.room,
        observedAt: recorded.observedAt,
      });
    })
    .catch(() => {
      // HQ observers are optional. Runtime must continue if HQ transport is absent.
    });
  return recorded;
}
