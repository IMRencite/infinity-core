import type { CanonicalActivityStatus, HqActivityRoomId } from "./constants";
import { roomForStep } from "./rooms";

export const MISSION_ROOM_ACTIVITY_PROJECTION_GATE = "MissionRoomActivityProjectionGate" as const;

export type MissionRoomActivityProjectionInput = {
  openSteps: Array<{ stepType: string; engine?: string; room?: HqActivityRoomId }>;
  completedSteps?: string[];
  rooms: Partial<Record<HqActivityRoomId | "quality_control" | "launch_operations" | "executive_office" | "product_lab" | "systems_architect" | "growth_department" | "research_department", CanonicalActivityStatus | "ACTIVE_WORK" | "PRESENT_IDLE">>;
  command?: CanonicalActivityStatus | "ACTIVE_WORK" | "PRESENT_IDLE";
  deploymentWriteCompleted?: boolean;
  liveValidationOpen?: boolean;
  consumedDeploymentAuthorizationStillActive?: boolean;
  terminalOutcome?: string | null;
  newRepairBlocker?: string | null;
};

export type MissionRoomActivityProjectionResult = {
  gate: typeof MISSION_ROOM_ACTIVITY_PROJECTION_GATE;
  overall: "PASS" | "FAIL";
  issues: string[];
};

const VALIDATION_STEPS = new Set([
  "PUBLIC_ARTIFACT_QUALITY_GATE",
  "QUALITY_REVIEW",
  "PAGE_RENDER",
  "PAGE_VALIDATE",
  "PAGE_REPAIR_LOOP",
  "FULL_ROUTE_FROZEN_ARTIFACT_VALIDATION",
  "RENDERED_LINK_CONTRAST",
  "VALIDATE_TECHNICAL",
]);

export function evaluateMissionRoomActivityProjectionGate(
  input: MissionRoomActivityProjectionInput,
): MissionRoomActivityProjectionResult {
  const issues: string[] = [];
  const rooms = input.rooms;
  for (const step of input.openSteps) {
    const room = step.room ?? roomForStep(step.stepType, step.engine ?? "mission_runtime");
    if (rooms[room] !== "ACTIVE_WORK") {
      issues.push(`${step.stepType}_ROOM_IDLE:${room}`);
    }
    if (VALIDATION_STEPS.has(step.stepType) && rooms.quality_control !== "ACTIVE_WORK") {
      issues.push("VALIDATION_STATION_IDLE_DURING_LIVE_VALIDATION");
    }
    if (step.stepType === "CREATE_DEPLOYMENT" && rooms.launch_operations !== "ACTIVE_WORK") {
      issues.push("DEPLOYMENT_DEPOT_IDLE_DURING_PROVIDER_WRITE");
    }
    if (step.stepType === "ARTIFACT_GENERATION" && rooms.product_lab !== "ACTIVE_WORK") {
      issues.push("CREATION_LAB_IDLE_DURING_COMPOSITION");
    }
    if (step.stepType === "SITE_ARCHITECTURE" && rooms.systems_architect !== "ACTIVE_WORK") {
      issues.push("SYSTEMS_ARCHITECT_IDLE_DURING_SHARED_REPAIR");
    }
    if (/OUTREACH/.test(step.stepType) && rooms.growth_department !== "ACTIVE_WORK") {
      issues.push("GROWTH_NEXUS_IDLE_DURING_OUTREACH");
    }
    if (/RESEARCH/.test(step.stepType) && rooms.research_department !== "ACTIVE_WORK") {
      issues.push("RESEARCH_IDLE_DURING_RESEARCH");
    }
  }
  if (input.openSteps.length > 0 && (input.command ?? rooms.executive_office) !== "ACTIVE_WORK") {
    issues.push("COMMAND_IDLE_DURING_LIVE_WORK");
  }
  if (
    (input.deploymentWriteCompleted || input.completedSteps?.includes("CREATE_DEPLOYMENT")) &&
    (input.liveValidationOpen || input.openSteps.some((step) => VALIDATION_STEPS.has(step.stepType)))
  ) {
    if (rooms.quality_control !== "ACTIVE_WORK") issues.push("VALIDATION_STATION_IDLE_DURING_LIVE_VALIDATION");
    if (rooms.launch_operations !== "ACTIVE_WORK") issues.push("DEPLOYMENT_DEPOT_NOT_CONCURRENT_WITH_VALIDATION");
    if ((input.command ?? rooms.executive_office) !== "ACTIVE_WORK") issues.push("COMMAND_IDLE_DURING_LIVE_WORK");
  }
  if (input.consumedDeploymentAuthorizationStillActive) {
    issues.push("CONSUMED_DEPLOYMENT_AUTHORIZATION_STILL_ACTIVE");
  }
  if (
    input.deploymentWriteCompleted &&
    input.terminalOutcome != null &&
    input.terminalOutcome !== "DEPLOYED_NOT_ACTIVATED" &&
    input.liveValidationOpen === false &&
    input.newRepairBlocker
  ) {
    issues.push("DEPLOYED_NOT_ACTIVATED_TERMINAL_REQUIRED");
  }
  return {
    gate: MISSION_ROOM_ACTIVITY_PROJECTION_GATE,
    overall: issues.length === 0 ? "PASS" : "FAIL",
    issues,
  };
}
