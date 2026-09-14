"use client";

import { activeRoomLabelsFromView } from "@/lib/infinity/mission-activity/active-rooms";
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import type { DepartmentId, OperatorCurrentActivity, OperatorDepartmentSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { CommandActivityStrip } from "./command-activity-strip";
import type { Favc1CycleSnapshotMeta } from "@/lib/infinity/operator-console/favc1-cycle/types";
import type { CommandSystemIndicator } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { projectCommandOversight } from "@/lib/infinity/hq-live-activity";
import { InfinityDecisionCore, infinitySymbolToDecisionCore } from "./infinity-decision-core";
import { WorkerNode } from "./worker-node";
import { closedLoopTargetLabel } from "./hq-flow-connectors";
import { partitionCommandDecisionOrbs } from "@/lib/infinity/operator-console/command-chamber-layout";
import { DecisionToken } from "./artifacts/primitives";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";
import { handleCardKeyboardInspect } from "./infinity-room/room-keyboard";
import { InfinityRoomShell } from "./infinity-room/infinity-room-shell";
import { buildFavc1TerminalDisplay } from "@/lib/infinity/operator-console/favc1-cycle/terminal-messaging";
import { buildRoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { RoomCurrentActivity } from "./room-current-activity";
import { roomPresenceFromActivityStatus } from "@/lib/infinity/operator-console/room-presence";

type Props = {
  snapshot?: OperatorDepartmentSnapshot;
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
  closedLoopRoute: {
    active: boolean;
    toDepartmentId: DepartmentId | null;
    decisionType: string | null;
    missionStatus: string | null;
  };
  isSelected: boolean;
  onSelect: () => void;
  cycleMeta?: Favc1CycleSnapshotMeta | null;
  systemReadiness?: CommandSystemIndicator[];
  ventureName?: string | null;
  commandActivity?: CommandActivityView | null;
  hqSystemState?: string | null;
  waitingWork?: boolean;
};

function formatCost(meta: Favc1CycleSnapshotMeta): string {
  if (meta.knownCycleCostUsd == null) return "Unknown";
  return `$${meta.knownCycleCostUsd.toFixed(4)}`;
}

function cycleTerminal(meta: Favc1CycleSnapshotMeta | null | undefined) {
  if (!meta || meta.terminalOutcome === "RUNNING") return null;
  return (
    meta.terminalDisplay ??
    buildFavc1TerminalDisplay({
      terminalOutcome: meta.terminalOutcome,
      selectionStopReasonPath: meta.selectionStopReasonPath,
      validationOutcome: meta.validationOutcome,
      failureMessage: meta.failureMessage,
    })
  );
}

export function CommandChamber({
  snapshot,
  workerNodes,
  currentActivity,
  closedLoopRoute,
  isSelected,
  onSelect,
  cycleMeta = null,
  systemReadiness = [],
  ventureName = null,
  commandActivity = null,
  hqSystemState = null,
  waitingWork = false,
}: Props) {
  const names = getRoomDisplayNames("executive_office");
  const commandNodes = workerNodes.filter((node) => node.departmentId === "executive_office");
  const activity = buildRoomActivityExplanation({
    departmentId: "executive_office",
    department: snapshot ?? null,
    workerNodes: commandNodes,
    currentActivity,
    closedLoopRoute,
    ventureName,
    commandRoomStatus: commandActivity?.rooms.executive_office?.status ?? null,
    commandRoomSummary: commandActivity?.rooms.executive_office?.summary ?? null,
    nowInspectingTask: commandActivity?.nowInspecting.currentTask ?? commandActivity?.nowInspecting.currentStep ?? null,
  });
  const terminal = cycleTerminal(cycleMeta);
  const inferredEvidenceWait = workerNodes.some((node) =>
    `${node.task ?? ""} ${node.displayTask ?? ""}`.toLowerCase().includes("waiting for evidence"),
  );
  const oversight = projectCommandOversight({
    workers: workerNodes,
    systemState: hqSystemState ?? (inferredEvidenceWait ? "WAITING_FOR_EVIDENCE" : null),
    waitingWork,
    canonicalActiveWork: commandActivity?.nowInspecting.status === "ACTIVE_WORK",
  });
  const inspecting = commandActivity?.nowInspecting;
  const activeRooms = activeRoomLabelsFromView(commandActivity);
  const openCommandWork = inspecting?.status === "ACTIVE_WORK";
  const liveExecution = oversight.commandState === "ACTIVE_OVERSIGHT" || inspecting?.status === "ACTIVE_WORK";
  const missionHeadline = openCommandWork
    ? (inspecting?.currentMission ??
      currentActivity.displayTask ??
      inspecting?.currentTask ??
      snapshot?.displayHeadline ??
      "Executing current mission")
    : "IDLE — no active canonical work";
  const decisionText = liveExecution
    ? snapshot?.displaySummary ??
      (closedLoopRoute.decisionType ? closedLoopRoute.decisionType.replace(/_/g, " ") : null)
    : null;
  const nextRoute =
    closedLoopRoute.active && closedLoopRoute.toDepartmentId
      ? closedLoopTargetLabel(closedLoopRoute.toDepartmentId)
      : snapshot?.isNextMissionTarget
        ? "Routing next mission"
        : null;

  const { satellites: satelliteNodes } = partitionCommandDecisionOrbs(workerNodes);
  const activityRoomStatus = commandActivity?.rooms.executive_office?.status;
  const commandPresence =
    roomPresenceFromActivityStatus(activityRoomStatus) ?? activity.presence;
  const isActive = oversight.commandState === "ACTIVE_OVERSIGHT";
  const commandArtifacts = snapshot?.workArtifacts ?? [];
  const groupedDecisions = commandArtifacts.filter((a) => a.artifactType === "decision" || a.artifactType === "mission").slice(0, 3);
  const commandState = snapshot?.state ?? (isActive ? "RUNNING" : "NOT_STARTED");
  const inspector = useOptionalHqArtifactInspector();
  const departmentLabel = currentActivity.departmentDisplayName ?? currentActivity.departmentLabel;
  const workerLabel = [currentActivity.provider, currentActivity.model].filter(Boolean).join(" · ");

  return (
    <InfinityRoomShell
      variant="command"
      size="hero"
      state={commandState}
      isSelected={isSelected}
      isActive={Boolean(isActive)}
      ariaLabel={`Command. ${names.shortDescription}. ${oversight.accessibleState}`}
      onActivate={onSelect}
      dataHq={{
        "data-hq-command-oversight": oversight.commandState,
        "data-hq-infinity-symbol": oversight.infinityState,
        "data-hq-active-worker-count": String(oversight.activeWorkerCount),
      }}
      header={
        <div className="flex items-center gap-4 md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300/90">{names.displayName}</p>
            <p className="hq-room-job mt-1">{names.shortDescription}</p>
            <RoomCurrentActivity explanation={activity} className="mt-2" />
            <CommandActivityStrip activity={commandActivity} />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500" data-hq-room-presence={commandPresence}>
              {commandPresence}
            </p>

            <div className="mt-1.5 grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
              <div className="min-w-0 space-y-1.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Current work
                  </p>
                  <p
                    className="line-clamp-2 text-base font-semibold leading-snug text-zinc-50 md:text-lg"
                    data-hq-current-execution={commandActivity?.nowInspecting.currentMission ?? ""}
                    data-hq-current-active={openCommandWork ? "ACTIVE" : "IDLE"}
                  >
                    {missionHeadline}
                  </p>
                  {(() => {
                    const venture = commandActivity?.latestVentureWork;
                    const system = commandActivity?.latestSystemActivity;
                    const ventureLabel = commandActivity?.latestVentureWorkLabel
                      ?? (commandActivity?.latestVentureWorkScope === "PORTFOLIO"
                        ? "Latest portfolio venture work"
                        : "Latest venture work");
                    return (
                      <div className="space-y-1">
                        {venture ? (
                          <p className="text-[11px] text-zinc-300" data-hq-latest-venture-work={venture.title} data-hq-latest-venture-work-id={venture.workId ?? ""}>
                            <span className="uppercase tracking-wider text-zinc-600">{ventureLabel} </span>
                            {venture.title}
                            <span className="block text-[10px] text-zinc-500">
                              {venture.status}
                              {venture.completedAt ? ` · ${venture.completedAt}` : ""}
                            </span>
                          </p>
                        ) : null}
                        {system ? (
                          <p className="text-[11px] text-zinc-400" data-hq-latest-system-activity={system.title}>
                            <span className="uppercase tracking-wider text-zinc-600">Latest system activity </span>
                            {system.title}
                            <span className="block text-[10px] text-zinc-500">
                              {system.status}
                              {system.completedAt ? ` · ${system.completedAt}` : ` · ${system.updatedAt}`}
                            </span>
                          </p>
                        ) : commandActivity?.latestCompleted ? (
                          <p className="text-[11px] text-zinc-400" data-hq-latest-completed={commandActivity.latestCompleted.missionType}>
                            <span className="uppercase tracking-wider text-zinc-600">Latest system activity </span>
                            {commandActivity.latestCompleted.missionType}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                {terminal ? (
                  <div className="rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-1.5" data-hq-inspection-context="true">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">Inspection</p>
                    <p className="text-[11px] text-zinc-400">{terminal.headline}</p>
                    {cycleMeta?.cycleKey ? (
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-600">cycleKey: {cycleMeta.cycleKey}</p>
                    ) : null}
                  </div>
                ) : null}

                {activeRooms.length > 0 ? (
                  <p className="text-xs text-zinc-300" data-hq-command-active-rooms={activeRooms.join(" · ")}>
                    <span className="uppercase tracking-wider text-zinc-600">Active rooms </span>
                    {activeRooms.join(" · ")}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                  {departmentLabel ? (
                    <span>
                      <span className="uppercase tracking-wider text-zinc-600">Department </span>
                      {departmentLabel}
                    </span>
                  ) : null}
                  {workerLabel ? (
                    <span>
                      <span className="uppercase tracking-wider text-zinc-600">Agent </span>
                      {workerLabel}
                      {currentActivity.active ? " · ACTIVE" : ""}
                    </span>
                  ) : null}
                  {cycleMeta?.currentStageLabel ? (
                    <span>
                      <span className="uppercase tracking-wider text-zinc-600">Stage </span>
                      {cycleMeta.currentStageLabel}
                    </span>
                  ) : null}
                  {cycleMeta?.failureMessage ? (
                    <span className="text-amber-200/90">
                      <span className="uppercase tracking-wider text-zinc-600">Blocker </span>
                      {cycleMeta.failureMessage}
                    </span>
                  ) : null}
                </div>

                {decisionText ? (
                  <p className="text-xs text-zinc-300">
                    <span className="uppercase tracking-wider text-zinc-600">Decision </span>
                    {decisionText}
                  </p>
                ) : null}

                {nextRoute ? <p className="text-xs text-violet-100">Next route {nextRoute}</p> : null}

                {groupedDecisions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {groupedDecisions.map((artifact) =>
                      artifact.artifactType === "decision" ? (
                        <DecisionToken key={artifact.id} artifact={artifact} large />
                      ) : (
                        <div
                          key={artifact.id}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            inspector?.openInspector(artifact);
                          }}
                          onKeyDown={(event) =>
                            handleCardKeyboardInspect(event, () => inspector?.openInspector(artifact))
                          }
                          className="cursor-pointer rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-50 transition hover:border-sky-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                        >
                          {artifact.title}
                        </div>
                      ),
                    )}
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 space-y-2">
                {cycleMeta ? (
                  <div className="grid grid-cols-4 gap-1.5 text-[10px] text-zinc-400">
                    <Metric label="Candidates" value={cycleMeta.candidateCount ?? "Unknown"} />
                    <Metric label="Monetized" value={cycleMeta.monetizedCandidateCount ?? "Unknown"} />
                    <Metric
                      label="Research"
                      value={`${cycleMeta.activeResearchSessionCount}/${cycleMeta.researchSessionCount}`}
                    />
                    <Metric label="Known cost" value={formatCost(cycleMeta)} />
                  </div>
                ) : null}

                {systemReadiness.length > 0 ? (
                  <div aria-label="Command system status">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Systems</p>
                    <ul className="mt-1 grid min-w-0 grid-cols-1 gap-x-3 gap-y-0.5 text-[10px] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {systemReadiness.map((item) => (
                        <li key={item.id} className="flex min-w-0 items-start justify-between gap-2">
                          <span className="shrink-0 text-zinc-500">{item.label}</span>
                          <span className="min-w-0 text-right font-medium uppercase tracking-wide text-zinc-200 [overflow-wrap:anywhere]">
                            {item.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {cycleMeta ? (
                  <p className="truncate font-mono text-[10px] text-zinc-600">cycleKey: {cycleMeta.cycleKey}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center gap-2 overflow-visible px-3 py-1">
            <div className="flex items-center justify-center gap-2 overflow-visible" aria-label="Command decision sessions">
              <InfinityDecisionCore
                state={infinitySymbolToDecisionCore(oversight.infinityState)}
                symbolState={oversight.infinityState}
              />
              {satelliteNodes.map((node) => (
                <WorkerNode key={node.nodeId} node={node} compact prominent={false} />
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-violet-300/70">Decision core</span>
          </div>
        </div>
      }
    >
      <span className="sr-only">Command chamber body</span>
    </InfinityRoomShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="text-zinc-200">{value}</p>
    </div>
  );
}
