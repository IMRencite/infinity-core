export const MISSION_RUNTIME_VERSION_V1 = "mission_runtime_v1";
export const MISSION_RUNTIME_VERSION_V2 = "mission_runtime_v2";

/** New mission runtimes use canonical governed lifecycle v2. */
export const MISSION_RUNTIME_VERSION = MISSION_RUNTIME_VERSION_V2;

export const MISSION_RUNTIME_STATUSES = [
  "draft",
  "ready",
  "running",
  "waiting",
  "blocked",
  "paused",
  "completed",
  "failed",
  "cancelled",
  "archived",
] as const;

export type MissionRuntimeStatus = (typeof MISSION_RUNTIME_STATUSES)[number];

/** Canonical governed lifecycle (v2). */
export const MISSION_RUNTIME_STAGES_V2 = [
  "command",
  "discovery",
  "evaluation",
  "validation",
  "reasoning",
  "executive",
  "planning",
  "allocation",
  "scheduling",
  "execution",
  "review",
  "completed",
] as const;

/** Legacy development lifecycle (v1) — allocation before validation. */
export const MISSION_RUNTIME_STAGES_V1 = [
  "command",
  "discovery",
  "evaluation",
  "allocation",
  "validation",
  "reasoning",
  "executive",
  "planning",
  "scheduling",
  "execution",
  "review",
  "completed",
] as const;

export const MISSION_RUNTIME_STAGES = MISSION_RUNTIME_STAGES_V2;

export type MissionRuntimeStage = (typeof MISSION_RUNTIME_STAGES)[number];

export const TERMINAL_RUNTIME_STATUSES: MissionRuntimeStatus[] = [
  "completed",
  "failed",
  "cancelled",
  "archived",
];

export const NON_ADVANCING_RUNTIME_STATUSES: MissionRuntimeStatus[] = [
  "paused",
  "cancelled",
  "completed",
  "failed",
  "archived",
];

export const DEFAULT_TICK_LIMIT = 10;
export const DEFAULT_LEASE_SECONDS = 120;

export const MISSION_RUNTIME_ENGINE_NAME = "mission_runtime";

export const BUILD_FACTORY_CAPABILITY_PREFIX = "build.";
