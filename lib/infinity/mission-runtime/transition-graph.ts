import {
  MISSION_RUNTIME_STAGES_V1,
  MISSION_RUNTIME_STAGES_V2,
  MISSION_RUNTIME_VERSION_V1,
  MISSION_RUNTIME_VERSION_V2,
  type MissionRuntimeStage,
} from "./constants";
import { MissionRuntimeStateError } from "./errors";

export type MissionRuntimeLifecycleVersion =
  | typeof MISSION_RUNTIME_VERSION_V1
  | typeof MISSION_RUNTIME_VERSION_V2
  | string;

/** Stage order for transition checks (v1 legacy vs v2 canonical). */
export function stageListForLegacyVersion(
  runtimeVersion: string,
): readonly MissionRuntimeStage[] {
  if (runtimeVersion === MISSION_RUNTIME_VERSION_V1) {
    return MISSION_RUNTIME_STAGES_V1;
  }
  return MISSION_RUNTIME_STAGES_V2;
}

function buildIndex(stages: readonly MissionRuntimeStage[]): Map<MissionRuntimeStage, number> {
  return new Map(stages.map((stage, index) => [stage, index]));
}

const V2_INDEX = buildIndex(MISSION_RUNTIME_STAGES_V2);
const V1_INDEX = buildIndex(MISSION_RUNTIME_STAGES_V1);

export function stageIndexForVersion(
  stage: MissionRuntimeStage,
  runtimeVersion: string,
): number {
  const index =
    runtimeVersion === MISSION_RUNTIME_VERSION_V1
      ? V1_INDEX.get(stage)
      : V2_INDEX.get(stage);
  if (index === undefined) {
    throw new MissionRuntimeStateError(`Unknown stage ${stage}.`);
  }
  return index;
}

export function nextStageAfter(
  current: MissionRuntimeStage,
  runtimeVersion: string = MISSION_RUNTIME_VERSION_V2,
): MissionRuntimeStage | null {
  const stages = stageListForLegacyVersion(runtimeVersion);
  const index = stages.indexOf(current);
  if (index < 0 || index >= stages.length - 1) {
    return null;
  }
  return stages[index + 1] ?? null;
}

export function expectedNextStageV2(current: MissionRuntimeStage): MissionRuntimeStage | null {
  return nextStageAfter(current, MISSION_RUNTIME_VERSION_V2);
}

/** Explicit allowed edges for canonical v2 (governed lifecycle). */
export const CANONICAL_V2_TRANSITIONS: ReadonlyArray<
  readonly [MissionRuntimeStage, MissionRuntimeStage]
> = [
  ["command", "discovery"],
  ["discovery", "evaluation"],
  ["evaluation", "validation"],
  ["validation", "reasoning"],
  ["reasoning", "executive"],
  ["executive", "planning"],
  ["planning", "allocation"],
  ["allocation", "scheduling"],
  ["scheduling", "execution"],
  ["execution", "review"],
  ["review", "completed"],
] as const;

const V2_EDGE_SET = new Set(
  CANONICAL_V2_TRANSITIONS.map(([from, to]) => `${from}->${to}`),
);

/** Legacy v1 sequential edges (preserved for historical transition validation). */
export const LEGACY_V1_TRANSITIONS: ReadonlyArray<
  readonly [MissionRuntimeStage, MissionRuntimeStage]
> = MISSION_RUNTIME_STAGES_V1.slice(0, -1).map((stage, index) => {
  const next = MISSION_RUNTIME_STAGES_V1[index + 1];
  return [stage, next!] as const;
});

const V1_EDGE_SET = new Set(
  LEGACY_V1_TRANSITIONS.map(([from, to]) => `${from}->${to}`),
);

export function assertStageTransitionAllowed(
  from: MissionRuntimeStage,
  to: MissionRuntimeStage,
  runtimeVersion: string = MISSION_RUNTIME_VERSION_V2,
): void {
  if (from === to) {
    return;
  }

  if (to === "completed" && from === "review") {
    return;
  }

  const edge = `${from}->${to}`;

  if (runtimeVersion === MISSION_RUNTIME_VERSION_V1) {
    if (!V1_EDGE_SET.has(edge) && !(from === "review" && to === "completed")) {
      throw new MissionRuntimeStateError(
        `Invalid legacy v1 stage transition ${from} -> ${to}.`,
      );
    }
    return;
  }

  if (!V2_EDGE_SET.has(edge) && !(from === "review" && to === "completed")) {
    throw new MissionRuntimeStateError(
      `Invalid canonical stage transition ${from} -> ${to}. Governed lifecycle order must be followed.`,
    );
  }
}

export function isCanonicalV2StageOrder(): readonly MissionRuntimeStage[] {
  return MISSION_RUNTIME_STAGES_V2;
}
