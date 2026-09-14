import { activeRoomLabelsFromView } from "@/lib/infinity/mission-activity/active-rooms";
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";

type Props = {
  activity?: CommandActivityView | null;
};

export function CommandActivityStrip({ activity }: Props) {
  const counts = activity?.counts ?? {
    activeMissions: 0,
    blockedMissions: 0,
    waitingMissions: 0,
    authorizationRequired: 0,
  };
  const live = activity?.nowInspecting.status === "ACTIVE_WORK";
  const venture = activity?.latestVentureWork;
  const system = activity?.latestSystemActivity;
  const ventureLabel = activity?.latestVentureWorkLabel
    ?? (activity?.latestVentureWorkScope === "PORTFOLIO" ? "Latest portfolio venture work" : "Latest venture work");
  const latestVenture = venture
    ? `${venture.title}${venture.status ? ` · ${venture.status}` : ""}`
    : "None recorded";
  const latestSystem = system
    ? `${system.title}${system.status ? ` · ${system.status}` : ""}`
    : activity?.latestCompleted
      ? `${activity.latestCompleted.missionType}: ${activity.latestCompleted.summary}`
      : "None recorded";
  const activeRooms = activeRoomLabelsFromView(activity);
  return (
    <section className="hq-command-activity" data-hq-command-activity="true" aria-label="Command mission activity">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Live execution</p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-300 sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Active</dt>
          <dd data-hq-activity-active={counts.activeMissions}>{counts.activeMissions}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Blocked</dt>
          <dd data-hq-activity-blocked={counts.blockedMissions}>{counts.blockedMissions}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Waiting</dt>
          <dd data-hq-activity-waiting={counts.waitingMissions}>{counts.waitingMissions}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Authorization</dt>
          <dd data-hq-activity-auth={counts.authorizationRequired}>{counts.authorizationRequired}</dd>
        </div>
      </dl>
      {live && (activity?.nowInspecting.currentMission || activity?.nowInspecting.currentStep) ? (
        <dl className="mt-2 grid gap-1 text-[11px] text-zinc-300">
          {activity.nowInspecting.currentMission ? (
            <div>
              <dt className="uppercase tracking-wider text-zinc-600">Mission</dt>
              <dd data-hq-activity-mission>{activity.nowInspecting.currentMission}</dd>
            </div>
          ) : null}
          {activity.nowInspecting.currentPhase ? (
            <div>
              <dt className="uppercase tracking-wider text-zinc-600">Phase</dt>
              <dd data-hq-activity-phase>{activity.nowInspecting.currentPhase}</dd>
            </div>
          ) : null}
          {activity.nowInspecting.currentStep ? (
            <div>
              <dt className="uppercase tracking-wider text-zinc-600">Step</dt>
              <dd data-hq-activity-step>{activity.nowInspecting.currentStep}</dd>
            </div>
          ) : null}
          {activity.nowInspecting.currentTask ? (
            <div>
              <dt className="uppercase tracking-wider text-zinc-600">Task</dt>
              <dd data-hq-activity-task>{activity.nowInspecting.currentTask}</dd>
            </div>
          ) : null}
          {activeRooms.length > 0 ? (
            <div>
              <dt className="uppercase tracking-wider text-zinc-600">Active rooms</dt>
              <dd data-hq-activity-active-rooms={activeRooms.join(" · ")}>
                {activeRooms.join(" · ")}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="mt-1 text-[11px] text-zinc-500">
        <span className="uppercase tracking-wider text-zinc-600">
          {ventureLabel}{" "}
        </span>
        <span data-hq-activity-latest-venture>{latestVenture}</span>
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        <span className="uppercase tracking-wider text-zinc-600">Latest system activity </span>
        <span data-hq-activity-completed data-hq-activity-latest-system>{latestSystem}</span>
      </p>
      {activity?.executionClass === "SYSTEM_DEVELOPMENT" ? (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/80" data-hq-activity-class="SYSTEM_DEVELOPMENT">
          System development — not autonomous venture execution
        </p>
      ) : null}
    </section>
  );
}
