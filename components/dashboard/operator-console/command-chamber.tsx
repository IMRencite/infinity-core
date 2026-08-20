"use client";

import type { DepartmentId, OperatorCurrentActivity, OperatorDepartmentSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import type { Favc1CycleSnapshotMeta } from "@/lib/infinity/operator-console/favc1-cycle/types";
import type { CommandSystemIndicator } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
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
  });
  const terminal = cycleTerminal(cycleMeta);
  const missionHeadline = currentActivity.active
    ? (currentActivity.displayTask ?? snapshot?.displayHeadline ?? "Executing current mission")
    : terminal?.headline ?? currentActivity.displayTask ?? snapshot?.displayHeadline ?? "Standing by for the next mission";
  const decisionText =
    terminal?.decision ??
    snapshot?.displaySummary ??
    (closedLoopRoute.decisionType ? closedLoopRoute.decisionType.replace(/_/g, " ") : null);
  const nextRoute =
    closedLoopRoute.active && closedLoopRoute.toDepartmentId
      ? closedLoopTargetLabel(closedLoopRoute.toDepartmentId)
      : snapshot?.isNextMissionTarget
        ? "Routing next mission"
        : null;

  const { primary: primaryNode, satellites: satelliteNodes } = partitionCommandDecisionOrbs(workerNodes);
  const isActive = snapshot?.isActive ?? closedLoopRoute.active ?? currentActivity.active;
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
      ariaLabel={`Command. ${names.shortDescription}`}
      onActivate={onSelect}
      header={
        <div className="flex items-start gap-3 md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300/90">{names.displayName}</p>
            <p className="hq-room-job mt-1">{names.shortDescription}</p>
            <RoomCurrentActivity explanation={activity} className="mt-2" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500" data-hq-room-presence={activity.presence}>
              {activity.presence}
            </p>

            <div className="mt-1.5 grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
              <div className="min-w-0 space-y-1.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {currentActivity.active ? "Current task" : terminal ? "Mission complete" : "Current mission"}
                  </p>
                  <p className="line-clamp-2 text-base font-semibold leading-snug text-zinc-50 md:text-lg">{missionHeadline}</p>
                </div>

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
                    <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      {systemReadiness.map((item) => (
                        <li key={item.id} className="flex items-baseline justify-between gap-2">
                          <span className="text-zinc-500">{item.label}</span>
                          <span className="font-medium uppercase tracking-wide text-zinc-200">{item.status}</span>
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

          <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
            {primaryNode || satelliteNodes.length > 0 ? (
              <div className="flex items-end justify-center gap-2" aria-label="Command decision sessions">
                {primaryNode ? (
                  <WorkerNode node={primaryNode} prominent={primaryNode.motionActive || Boolean(isActive)} />
                ) : null}
                {satelliteNodes.map((node) => (
                  <WorkerNode key={node.nodeId} node={node} compact prominent={node.motionActive} />
                ))}
              </div>
            ) : (
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/50 bg-violet-950/50 shadow-[0_0_22px_rgba(167,139,250,0.35)] ${isActive ? "hq-command-ring" : ""}`}
              >
                <span
                  className={`h-3 w-3 rounded-full ${isActive ? "bg-violet-200 shadow-[0_0_14px_rgba(167,139,250,0.9)]" : "bg-violet-400/80"}`}
                  aria-hidden
                />
              </div>
            )}
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
