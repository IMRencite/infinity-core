import { loadHqCanonicalLiveState } from "../lib/infinity/operator-console/hq-canonical-live-state";
import {
  completeObservedImplementationWork,
  pulseCurrentImplementationWork,
} from "../lib/infinity/canonical-work/implementation-observe";
import { resolveCurrentCanonicalWork } from "../lib/infinity/canonical-work/resolver";
import { liveCodingFromCurrent } from "../lib/infinity/canonical-work/mission-completion-gates";

const active = pulseCurrentImplementationWork({
  title: "INFINITY — CANONICAL MISSION COMPLETION + IDLE PROPAGATION V1",
  file: "lib/infinity/canonical-work/mission-completion.ts",
});
const during = loadHqCanonicalLiveState("org_hq_live");
const duringCurrent = resolveCurrentCanonicalWork();
const duringCoding = liveCodingFromCurrent();
completeObservedImplementationWork("Canonical mission completion live read · IDLE");
const after = loadHqCanonicalLiveState("org_hq_live");
const afterCurrent = resolveCurrentCanonicalWork();
const afterCoding = liveCodingFromCurrent();

process.stdout.write(
  `${JSON.stringify(
    {
      during: {
        work_id: duringCurrent.work_id,
        status: duringCurrent.status,
        command: during.commandActivity.nowInspecting.status,
        mission: during.commandActivity.nowInspecting.currentMission,
        cursor: duringCoding.agent_status,
        runs: duringCoding.active_runs,
        rooms: {
          systems_architect: during.commandActivity.rooms.systems_architect?.status,
          quality_control: during.commandActivity.rooms.quality_control?.status,
        },
      },
      after: {
        work_id: afterCurrent.work_id,
        status: afterCurrent.status,
        command: after.commandActivity.nowInspecting.status,
        mission: after.commandActivity.nowInspecting.currentMission,
        cursor: afterCoding.agent_status,
        runs: afterCoding.active_runs,
        latestVenture: after.commandActivity.latestVentureWork?.title ?? after.commandActivity.latestVentureWork?.mission_title ?? null,
        latestVentureStatus: after.commandActivity.latestVentureWork?.status ?? null,
      },
      pulsed: active?.work_id ?? null,
    },
    null,
    2,
  )}\n`,
);
