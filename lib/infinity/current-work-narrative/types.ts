import type { CurrentWorkSourceType } from "./contract";

export type CurrentWorkNarrative = {
  ventureId: string | null;
  missionId: string | null;
  departmentId: string;
  roomId: string;
  state: string;
  action: string;
  object: string;
  purpose: string;
  displayText: string;
  nextExpectedAction: string;
  sourceType: CurrentWorkSourceType;
  sourceId: string;
  startedAt: string | null;
  lastChangedAt: string;
  lastVerifiedAt: string;
  workerLabel: string | null;
  workerState: string | null;
};

export type CurrentWorkHierarchy = {
  mission: string;
  floorContribution: string;
  roomContribution: string;
  currentActionableWork: string;
  agentTask: string | null;
};

export type NamedWorkGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };
