export {
  MISSION_RUNTIME_VERSION,
  MISSION_RUNTIME_VERSION_V1,
  MISSION_RUNTIME_VERSION_V2,
  MISSION_RUNTIME_STAGES,
  MISSION_RUNTIME_STAGES_V2,
  MISSION_RUNTIME_STATUSES,
  DEFAULT_TICK_LIMIT,
} from "./constants";

export type {
  MissionRuntimeInstance,
  MissionRuntimeTransition,
  MissionRuntimeCheckpoint,
  StageInspectionSnapshot,
  AdvanceMissionRuntimeResult,
  MissionRuntimeTickResult,
} from "./types";

export {
  assertStageTransitionAllowed,
  assertStatusTransitionAllowed,
  canAdvanceRuntime,
  MissionRuntimeStateError,
} from "./state-machine";

export {
  startMissionRuntime,
  pauseMissionRuntime,
  resumeMissionRuntime,
  cancelMissionRuntime,
  advanceMissionRuntime,
  recoverMissionRuntime,
  checkpointMissionRuntime,
  getMissionRuntimeState,
  runMissionRuntimeTick,
} from "./lifecycle";

export { buildMissionRuntimeDiagnostics } from "./diagnostics";
export { evaluateStage } from "./stage-handlers";
export {
  createInMemoryMissionRuntimeStore,
  clearInMemoryMissionRuntimeStore,
  listInMemoryMissionRuntimeTransitions,
  listInMemoryMissionRuntimeCheckpoints,
} from "./memory-store";
export {
  getMissionRuntimeStore,
  resetMissionRuntimeStoreForTests,
} from "./persistence";
export { EMPTY_STAGE_INSPECTION } from "./stage-inspection";
export { CANONICAL_V2_TRANSITIONS, LEGACY_V1_TRANSITIONS } from "./transition-graph";
export { computeEarliestUnmetStageV2, planLegacyRuntimeRecovery } from "./recovery";
