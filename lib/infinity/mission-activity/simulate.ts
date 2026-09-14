import { emitMissionActivity } from "./emit";
import { runInstrumentedStep } from "./instrument";
import { projectCommandActivity } from "./project";
import type { CanonicalActivityStatus } from "./constants";
import type { CommandActivityView, MissionActivityEvent } from "./types";

export const SIMULATED_PUBLIC_ARTIFACT_REPAIR_MISSION = "MARKET_VALIDATION_PUBLIC_ARTIFACT_REPAIR" as const;

const STEPS = [
  "GENERATE_VALIDATION_ARTIFACT",
  "GENERATE_LEGAL_ROUTES",
  "ISOLATED_INSTALL",
  "PRODUCTION_BUILD",
  "PUBLIC_ARTIFACT_QUALITY_GATE",
] as const;

export async function simulatePublicArtifactRepairMission(input?: {
  organizationId?: string;
  ventureId?: string | null;
  now?: string;
}): Promise<{
  missionId: string;
  events: MissionActivityEvent[];
  view: CommandActivityView;
  stateSequence: CanonicalActivityStatus[];
  roomSequence: string[];
}> {
  const organizationId = input?.organizationId ?? "org_sim_command_activity";
  const ventureId = input?.ventureId ?? "venture_sim_command_activity";
  const missionId = "msn_sim_public_artifact_repair";
  const base = {
    organizationId,
    ventureId,
    missionId,
    missionType: SIMULATED_PUBLIC_ARTIFACT_REPAIR_MISSION,
    engine: "venture_build_orchestration",
    source: "simulation",
    synthetic: true,
    executionClass: "VENTURE_EXECUTION" as const,
    candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9",
    experimentId: "exp_e72beb7b6d35e7b20acf",
    traceability: { artifactId: "art_5a5e3b166a2f9ee03f1f", missionId },
  };
  const stateSequence: CanonicalActivityStatus[] = ["EMPTY"];
  const roomSequence: string[] = [];
  const snapshot = (label: CanonicalActivityStatus) => {
    stateSequence.push(label);
    const view = projectCommandActivity({ organizationId, ventureId, includeSynthetic: true, knownSteps: [...STEPS] });
    const activeRoom = Object.values(view.rooms).find((room) => room.status === "ACTIVE_WORK" || room.status === "READY_BLOCKED");
    if (activeRoom) roomSequence.push(activeRoom.roomLabel);
  };

  emitMissionActivity({
    ...base,
    stepType: "MISSION",
    eventType: "MISSION_CREATED",
    engine: "mission_runtime",
    room: "executive_office",
  });
  emitMissionActivity({
    ...base,
    stepType: "MISSION",
    eventType: "MISSION_STARTED",
    engine: "mission_runtime",
    room: "executive_office",
  });
  snapshot("ACTIVE_WORK");

  for (const [index, stepType] of STEPS.entries()) {
    if (stepType === "ISOLATED_INSTALL") {
      emitMissionActivity({
        ...base,
        stepType: "FOUNDER_AUTHORIZATION",
        eventType: "MISSION_BLOCKED",
        engine: "mission_runtime",
        room: "executive_office",
        blocker: "FOUNDER_AUTHORIZATION_REQUIRED",
        authorizationRequired: "FOUNDER_AUTHORIZATION_REQUIRED",
        summary: "Waiting for founder authorization before the isolated install",
      });
      snapshot("READY_BLOCKED");
      emitMissionActivity({
        ...base,
        stepType: "MISSION",
        eventType: "MISSION_STARTED",
        engine: "mission_runtime",
        room: "executive_office",
        summary: "Authorization received; resuming the validation-site build",
      });
    }
    await runInstrumentedStep({
      emit: {
        ...base,
        stepType,
        stepId: `step_${index + 1}`,
        technicalDetail: `step=${stepType}`,
      },
      totalKnownSteps: STEPS.length,
      completedBefore: index,
      run: () => true,
    });
    snapshot("ACTIVE_WORK");
  }

  emitMissionActivity({
    ...base,
    stepType: "MISSION",
    eventType: "MISSION_COMPLETED",
    engine: "mission_runtime",
    room: "executive_office",
    summary: "Validation-grade public artifact repair completed",
  });
  snapshot("PRESENT_IDLE");

  const view = projectCommandActivity({
    organizationId,
    ventureId,
    includeSynthetic: true,
    knownSteps: [...STEPS],
  });
  return {
    missionId,
    events: view.recentEvents.filter((event) => event.missionId === missionId),
    view,
    stateSequence,
    roomSequence,
  };
}
