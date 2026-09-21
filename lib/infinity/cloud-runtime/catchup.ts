import { MAX_MISSED_TICKS_TO_REPLAY } from "./contract";
import type { CloudRuntimePersistedState } from "./types";

export function resolveCloudRuntimeCatchup(input: {
  state: CloudRuntimePersistedState;
  now: string;
  hourlyMs?: number;
}): {
  catchup: boolean;
  replay_missed_ticks: false;
  missed_ticks_replayed: typeof MAX_MISSED_TICKS_TO_REPLAY;
  reason: string | null;
  justified_action: "REEVALUATE_CURRENT_STATE";
} {
  const last = input.state.heartbeat.last_successful_iteration_at;
  if (!last) {
    return {
      catchup: false,
      replay_missed_ticks: false,
      missed_ticks_replayed: 0,
      reason: null,
      justified_action: "REEVALUATE_CURRENT_STATE",
    };
  }
  const elapsed = Date.parse(input.now) - Date.parse(last);
  const hourly = input.hourlyMs ?? 60 * 60 * 1000;
  if (elapsed <= hourly * 1.5) {
    return {
      catchup: false,
      replay_missed_ticks: false,
      missed_ticks_replayed: 0,
      reason: null,
      justified_action: "REEVALUATE_CURRENT_STATE",
    };
  }
  return {
    catchup: true,
    replay_missed_ticks: false,
    missed_ticks_replayed: 0,
    reason: "DOWNTIME_CATCHUP_CURRENT_STATE_ONLY",
    justified_action: "REEVALUATE_CURRENT_STATE",
  };
}
