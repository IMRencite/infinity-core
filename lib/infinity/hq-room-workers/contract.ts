export const HQ_ROOM_ASSIGNED_WORKER_VISIBILITY_CONTRACT = "HQRoomAssignedWorkerVisibilityContract" as const;
export const HQ_ROOM_ASSIGNED_WORKER_PRESENCE_GATE = "HQRoomAssignedWorkerPresenceGate" as const;
export const HQ_ROOM_WORKER_COUNT_CONSISTENCY_GATE = "HQRoomWorkerCountConsistencyGate" as const;
export const HQ_ROOM_WORKER_ORB_RENDERED_QUALITY_GATE = "HQRoomWorkerOrbRenderedQualityGate" as const;
export const HQ_WORKER_COMMAND_ACTIVITY_TRACEABILITY_GATE = "HQWorkerCommandActivityTraceabilityGate" as const;

export const HQ_ASSIGNED_WORKER_VISIBILITY_PRINCIPLE =
  "ASSIGNED HQ WORKERS REMAIN VISIBLY PRESENT IN THEIR FIRST-CLASS ROOM EVEN WHEN NOT ACTIVELY EXECUTING." as const;

export const HQ_NO_ACTIVE_WORK_IS_NOT_NO_AGENTS_PRINCIPLE =
  "NO ACTIVE WORK DOES NOT MEAN NO AGENTS PRESENT." as const;

export const HQ_WORKER_ORBS_ARE_OPERATING_STATE_PRINCIPLE =
  "WORKER ORBS ARE OPERATIONAL STATE, NOT DECORATION." as const;

export type NamedWorkerGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type HqRoomWorkerVisibilityRow = {
  room_id: string;
  assigned_count: number;
  rendered_count: number;
  overflow_count: number;
  overflow_ui: boolean;
  active_count: number;
  waiting_count: number;
  blocked_count: number;
  authorization_count: number;
  idle_count: number;
  false_active_glows: number;
  no_agents_present_copy: boolean;
};
