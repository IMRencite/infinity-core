"use client";

import { useMemo, useState } from "react";
import { DepartmentRoom } from "./department-room";
import { CommandChamber } from "./command-chamber";
import type {
  DepartmentId,
  DepartmentUiState,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorWorkerNode,
} from "@/lib/infinity/operator-console/types";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";

type HarnessMode =
  | "NOT_STARTED"
  | "ACTIVE_SYNTHESIS"
  | "ACTIVE_PROVIDER"
  | "COMPLETE"
  | "BLOCKED"
  | "FAILED";

function buildHarnessSnapshot(mode: HarnessMode): {
  departments: OperatorDepartmentSnapshot[];
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
} {
  const validationState: DepartmentUiState =
    mode === "NOT_STARTED"
      ? "NOT_STARTED"
      : mode === "COMPLETE"
        ? "COMPLETE"
        : mode === "BLOCKED"
          ? "BLOCKED"
          : mode === "FAILED"
            ? "FAILED"
            : "RUNNING";

  const commandState: DepartmentUiState =
    mode === "COMPLETE" ? "COMPLETE" : mode === "FAILED" ? "FAILED" : mode === "NOT_STARTED" ? "NOT_STARTED" : "RUNNING";

  const validationTask =
    mode === "ACTIVE_SYNTHESIS"
      ? "Reviewing existing evidence — no new provider research"
      : mode === "ACTIVE_PROVIDER"
        ? "Researching new evidence for customer acquisition cost"
        : null;

  const validationDept: OperatorDepartmentSnapshot = {
    id: "quality_control",
    label: "Quality Control",
    state: validationState,
    engines: ["quality_control"],
    summary: validationTask,
    currentTask: validationTask,
    provider: mode === "ACTIVE_PROVIDER" ? "gemini" : null,
    model: mode === "ACTIVE_PROVIDER" ? "gemini-3" : null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: mode === "ACTIVE_PROVIDER" ? 1 : 0,
    detail: { showWorkers: mode === "ACTIVE_PROVIDER", validationStation: true },
    isActive: mode === "ACTIVE_SYNTHESIS" || mode === "ACTIVE_PROVIDER",
    isNextMissionTarget: false,
  };

  const commandDept: OperatorDepartmentSnapshot = {
    id: "executive_office",
    label: "Executive Office",
    state: commandState,
    engines: ["executive_decision"],
    summary: mode === "COMPLETE" ? "Mission Completed — Candidate Still Requires Validation" : "Harness preview",
    currentTask: commandState === "RUNNING" ? "Running first autonomous venture cycle" : null,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: 1,
    detail: {},
    isActive: commandState === "RUNNING",
    isNextMissionTarget: false,
  };

  const workerNodes: OperatorWorkerNode[] =
    mode === "ACTIVE_PROVIDER"
      ? [
          {
            nodeId: "harness-validation-worker",
            departmentId: "quality_control",
            role: "RESEARCH_PROVIDER",
            displayRole: "Research",
            status: "RUNNING",
            task: validationTask,
            displayTask: validationTask,
            provider: "gemini",
            model: "gemini-3",
            isActive: true,
            isDormant: false,
            motionActive: true,
          },
        ]
      : [];

  const currentActivity: OperatorCurrentActivity = {
    active: commandDept.isActive || validationDept.isActive,
    departmentId: validationDept.isActive ? "quality_control" : "executive_office",
    departmentLabel: validationDept.isActive ? "Validation Station" : "Command",
    engine: "quality_control",
    task: validationTask ?? commandDept.currentTask,
    provider: validationDept.provider,
    model: validationDept.model,
    status: validationDept.isActive ? "RUNNING" : commandState,
    startedAt: null,
    elapsedSeconds: null,
    attempt: null,
    costUsd: null,
    costKnown: false,
    artifactStatus: null,
    latestActivitySummary: validationTask,
    latestActivityAt: null,
    displayNarration: validationTask ?? commandDept.summary,
    departmentDisplayName: validationDept.isActive ? "Validation Station" : "Command",
  };

  return { departments: [commandDept, validationDept], workerNodes, currentActivity };
}

const MODES: HarnessMode[] = [
  "NOT_STARTED",
  "ACTIVE_SYNTHESIS",
  "ACTIVE_PROVIDER",
  "COMPLETE",
  "BLOCKED",
  "FAILED",
];

export function HqMotionHarness() {
  const [mode, setMode] = useState<HarnessMode>("ACTIVE_SYNTHESIS");
  const snapshot = useMemo(() => buildHarnessSnapshot(mode), [mode]);
  const validationDept = snapshot.departments.find((dept) => dept.id === "quality_control")!;
  const commandDept = snapshot.departments.find((dept) => dept.id === "executive_office")!;
  const names = getRoomDisplayNames("quality_control");

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Dev only — HQ motion harness</p>
        <p className="mt-1 text-sm text-zinc-300">Preview room motion without database-backed activity.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-md px-2 py-1 text-xs ${mode === item ? "bg-sky-500/20 text-sky-200" : "bg-zinc-900 text-zinc-400"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-h-[160px] rounded-lg border border-zinc-800 bg-[#070709]">
          <CommandChamber
            snapshot={commandDept}
            workerNodes={[]}
            currentActivity={snapshot.currentActivity}
            closedLoopRoute={{ active: commandDept.isActive, toDepartmentId: null, decisionType: null, missionStatus: null }}
            isSelected={false}
            onSelect={() => undefined}
          />
        </div>
        <div className="min-h-[160px] rounded-lg border border-zinc-800 bg-[#070709]">
          <DepartmentRoom
            departmentId="quality_control"
            displayName={names.displayName}
            supportingLabel={names.supportingLabel}
            snapshot={validationDept}
            workerNodes={snapshot.workerNodes}
            isSelected={false}
            isActive={validationDept.isActive}
            isNextMissionTarget={false}
            isOnActivePath={validationDept.isActive}
            closedLoopTarget={false}
            onSelect={() => undefined}
          />
        </div>
      </div>
    </div>
  );
}
