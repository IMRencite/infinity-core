import type { DepartmentId, DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

export const HQ_WORKER_VISUAL_STATE_CONTRACT = "HQWorkerVisualStateContract" as const;
export const HQ_ACTIVE_WORKER_VISUAL_GATE = "HQActiveWorkerVisualGate" as const;
export const HQ_COMMAND_OVERSIGHT_CONTRACT = "HQCommandOversightContract" as const;
export const HQ_COMMAND_OVERSIGHT_VISUAL_GATE = "HQCommandOversightVisualGate" as const;
export const HQ_INFINITY_SYMBOL_ACTIVITY_GATE = "HQInfinitySymbolActivityGate" as const;
export const HQ_INFINITY_SYMBOL_VISIBILITY_GATE = "HQInfinitySymbolVisibilityGate" as const;

export const HQ_ACTIVE_GLOW_INVARIANT = "ACTIVE_GLOW = CANONICAL_WORKER_EXECUTING" as const;

export const HQ_WORKER_VISUAL_STATES = [
  "ACTIVE",
  "WAITING",
  "BLOCKED",
  "AUTHORIZATION_REQUIRED",
  "IDLE",
] as const;
export type HqWorkerVisualState = (typeof HQ_WORKER_VISUAL_STATES)[number];

export const HQ_ROOM_AGGREGATE_STATES = HQ_WORKER_VISUAL_STATES;
export type HqRoomAggregateState = HqWorkerVisualState;

export const HQ_COMMAND_OVERSIGHT_STATES = [
  "ACTIVE_OVERSIGHT",
  "WAITING",
  "WAITING_FOR_EVIDENCE",
  "BLOCKED",
  "AUTHORIZATION_REQUIRED",
  "IDLE",
] as const;
export type HqCommandOversightState = (typeof HQ_COMMAND_OVERSIGHT_STATES)[number];

export const HQ_INFINITY_SYMBOL_STATES = ["ACTIVE", "STANDBY", "BLOCKED", "AUTHORIZATION", "IDLE"] as const;
export type HqInfinitySymbolState = (typeof HQ_INFINITY_SYMBOL_STATES)[number];

export const HQ_ROOM_STATE_PRECEDENCE: HqRoomAggregateState[] = [
  "ACTIVE",
  "AUTHORIZATION_REQUIRED",
  "BLOCKED",
  "WAITING",
  "IDLE",
];

export type HQWorkerVisualStateRecord = {
  workerId: string;
  room: DepartmentId;
  canonicalState: DepartmentUiState;
  currentTask: string | null;
  visualState: HqWorkerVisualState;
  accessibleState: string;
  glow: boolean;
};

export type HqCommandOversightProjection = {
  commandState: HqCommandOversightState;
  infinityState: HqInfinitySymbolState;
  accessibleState: string;
  activeWorkerCount: number;
  waitingWorkerCount: number;
  blockedWorkerCount: number;
  authorizationWorkerCount: number;
};

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type WorkerVisualInput = Pick<
  OperatorWorkerNode,
  "nodeId" | "departmentId" | "status" | "task" | "displayTask" | "isActive" | "motionActive"
>;
