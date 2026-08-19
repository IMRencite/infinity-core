export const FAVC1_IDEMPOTENCY_PREFIX = "first-autonomous-venture-v1";

export type Favc1CycleStage =
  | "discovery"
  | "monetization"
  | "venture_selection"
  | "company_builder"
  | "organic_growth"
  | "performance_intelligence";

export type Favc1CycleTerminalOutcome =
  | "RUNNING"
  | "SYSTEM_FAILURE"
  | "BUSINESS_NO_GO"
  | "NO_GO_MARKET_DECISION"
  | "LEVEL_4"
  | "INFRASTRUCTURE_BLOCKED";

export type Favc1StageRunRef = {
  runId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedCostUsd: number | null;
  failureClassification: string | null;
  errorMessage: string | null;
};

export type ResolvedFavc1Cycle = {
  cycleKey: string;
  organizationId: string;
  discoveryRunId: string | null;
  monetizationRunId: string | null;
  selectionRunId: string | null;
  ventureAssemblyId: string | null;
  discovery: Favc1StageRunRef | null;
  monetization: Favc1StageRunRef | null;
  selection: Favc1StageRunRef | null;
  terminalOutcome: Favc1CycleTerminalOutcome;
  isActive: boolean;
  isTerminal: boolean;
  latestActivityAt: string;
  candidateCount: number | null;
  monetizedCandidateCount: number | null;
  knownCycleCostUsd: number | null;
  knownCycleCostComplete: boolean;
  failureStage: Favc1CycleStage | null;
  failureMessage: string | null;
};

export type Favc1TerminalDisplay = {
  headline: string;
  decision: string;
  systemDetail: string;
};

export type Favc1CycleSnapshotMeta = {
  cycleKey: string;
  mode: "pre_venture" | "venture_linked";
  terminalOutcome: Favc1CycleTerminalOutcome;
  discoveryRunId: string | null;
  monetizationRunId: string | null;
  selectionRunId: string | null;
  ventureAssemblyId: string | null;
  candidateCount: number | null;
  monetizedCandidateCount: number | null;
  researchSessionCount: number;
  activeResearchSessionCount: number;
  knownCycleCostUsd: number | null;
  knownCycleCostComplete: boolean;
  currentStageLabel: string;
  failureStage: Favc1CycleStage | null;
  failureMessage: string | null;
  selectionStopReasonPath?: string | null;
  validationOutcome?: string | null;
  terminalDisplay?: Favc1TerminalDisplay | null;
};

export function favc1CycleVentureId(cycleKey: string): string {
  return `favc1-cycle:${cycleKey}`;
}

export function isFavc1CycleVentureId(ventureAssemblyId: string): boolean {
  return ventureAssemblyId.startsWith("favc1-cycle:");
}

export function parseFavc1CycleVentureId(ventureAssemblyId: string): string | null {
  if (!isFavc1CycleVentureId(ventureAssemblyId)) return null;
  return ventureAssemblyId.slice("favc1-cycle:".length) || null;
}

export function buildFavc1IdempotencyKey(
  organizationId: string,
  cycleKey: string,
  stage: Favc1CycleStage | "discovery" | "monetization" | "venture_selection",
): string {
  return `${FAVC1_IDEMPOTENCY_PREFIX}:${organizationId}:${cycleKey}:${stage}`;
}

export function parseFavc1IdempotencyKey(
  idempotencyKey: string,
): { organizationId: string; cycleKey: string; stage: string } | null {
  const prefix = `${FAVC1_IDEMPOTENCY_PREFIX}:`;
  if (!idempotencyKey.startsWith(prefix)) return null;
  const segments = idempotencyKey.slice(prefix.length).split(":");
  if (segments.length < 3) return null;
  const stage = segments[segments.length - 1]!;
  const cycleKey = segments[segments.length - 2]!;
  const organizationId = segments.slice(0, -2).join(":");
  if (!organizationId || !cycleKey || !stage) return null;
  return { organizationId, cycleKey, stage };
}
