import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isLegitimateFavc1CycleKey, isVerificationVentureName } from "./exclude-fixtures";
import {
  buildFavc1IdempotencyKey,
  FAVC1_IDEMPOTENCY_PREFIX,
  parseFavc1IdempotencyKey,
  type Favc1CycleStage,
  type Favc1CycleTerminalOutcome,
  type Favc1StageRunRef,
  type ResolvedFavc1Cycle,
} from "./types";

type DiscoveryRow = {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_cost_usd: number | null;
  failure_classification: string | null;
  error_message: string | null;
  idempotency_key: string;
  created_at: string;
  candidates_persisted: number;
};

type GenericRunRow = {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_cost_usd: number | null;
  failure_classification: string | null;
  error_message: string | null;
  created_at: string;
  candidates_analyzed?: number;
  engine_report?: { handoff?: { monetizedCandidateIds?: string[] } } | null;
};

function toStageRef(row: GenericRunRow | DiscoveryRow): Favc1StageRunRef {
  return {
    runId: row.id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    estimatedCostUsd: row.estimated_cost_usd,
    failureClassification: row.failure_classification,
    errorMessage: row.error_message,
  };
}

function isRunActive(status: string): boolean {
  const normalized = status.toLowerCase();
  return !["completed", "failed", "policy_blocked", "cancelled", "canceled"].includes(normalized);
}

async function loadStageRun<T extends GenericRunRow>(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
  table: "monetization_runs" | "venture_selection_runs",
): Promise<T | null> {
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return (data as T | null) ?? null;
}

async function findVentureAssemblyForCycle(
  admin: AdminSupabaseClient,
  organizationId: string,
  cycleKey: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("venture_assemblies")
    .select("id, manifest, identity_package, idempotency_key, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;

  for (const row of data ?? []) {
    const manifest = JSON.stringify(row.manifest ?? {});
    const identity = JSON.stringify(row.identity_package ?? {});
    const idempotency = row.idempotency_key ?? "";
    if (
      manifest.includes(cycleKey) ||
      identity.includes(cycleKey) ||
      idempotency.includes(cycleKey) ||
      idempotency.includes(`first-autonomous-venture-v1:${organizationId}:${cycleKey}`)
    ) {
      return row.id;
    }
  }

  const { data: missions } = await admin
    .from("missions")
    .select("id, constraints, objectives, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);
  for (const mission of missions ?? []) {
    const payload = JSON.stringify({ constraints: mission.constraints, objectives: mission.objectives });
    if (!payload.includes("first_autonomous_venture_cycle_v1") || !payload.includes(cycleKey)) continue;
    const { data: assembly } = await admin
      .from("venture_assemblies")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("mission_id", mission.id)
      .maybeSingle();
    if (assembly?.id) return assembly.id;
  }

  return null;
}

function inferTerminalOutcome(input: {
  discovery: Favc1StageRunRef | null;
  monetization: Favc1StageRunRef | null;
  selection: Favc1StageRunRef | null;
  ventureAssemblyId: string | null;
}): {
  terminalOutcome: Favc1CycleTerminalOutcome;
  isActive: boolean;
  isTerminal: boolean;
  failureStage: Favc1CycleStage | null;
  failureMessage: string | null;
} {
  const stages: Array<{ stage: Favc1CycleStage; ref: Favc1StageRunRef | null }> = [
    { stage: "discovery", ref: input.discovery },
    { stage: "monetization", ref: input.monetization },
    { stage: "venture_selection", ref: input.selection },
  ];

  for (const { stage, ref } of stages) {
    if (!ref) continue;
    const status = ref.status.toLowerCase();
    if (status === "failed" || status === "policy_blocked") {
      return {
        terminalOutcome: status === "policy_blocked" ? "INFRASTRUCTURE_BLOCKED" : "SYSTEM_FAILURE",
        isActive: false,
        isTerminal: true,
        failureStage: stage,
        failureMessage: ref.errorMessage ?? ref.failureClassification,
      };
    }
  }

  const anyActive = stages.some(({ ref }) => ref && isRunActive(ref.status));
  if (anyActive) {
    return {
      terminalOutcome: "RUNNING",
      isActive: true,
      isTerminal: false,
      failureStage: null,
      failureMessage: null,
    };
  }

  if (input.ventureAssemblyId) {
    return {
      terminalOutcome: "LEVEL_4",
      isActive: false,
      isTerminal: true,
      failureStage: null,
      failureMessage: null,
    };
  }

  const discoveryDone = input.discovery?.status.toLowerCase() === "completed";
  const monetizationDone = input.monetization?.status.toLowerCase() === "completed";
  const selectionDone = input.selection?.status.toLowerCase() === "completed";

  if (discoveryDone && monetizationDone && !input.selection) {
    return {
      terminalOutcome: "SYSTEM_FAILURE",
      isActive: false,
      isTerminal: true,
      failureStage: "venture_selection",
      failureMessage: "Venture selection did not start after monetization completed",
    };
  }

  if (selectionDone) {
    const report = (input.selection as Favc1StageRunRef & { selectionReport?: { buildCount?: number } }) ?? null;
    void report;
    return {
      terminalOutcome: "BUSINESS_NO_GO",
      isActive: false,
      isTerminal: true,
      failureStage: null,
      failureMessage: null,
    };
  }

  if (discoveryDone && !input.monetization) {
    return {
      terminalOutcome: "SYSTEM_FAILURE",
      isActive: false,
      isTerminal: true,
      failureStage: "monetization",
      failureMessage: "Monetization did not start after discovery completed",
    };
  }

  return {
    terminalOutcome: discoveryDone && monetizationDone ? "NO_GO_MARKET_DECISION" : "RUNNING",
    isActive: !discoveryDone || !monetizationDone,
    isTerminal: discoveryDone && monetizationDone && !input.selection,
    failureStage: null,
    failureMessage: null,
  };
}

export async function resolveLatestFavc1Cycle(
  admin: AdminSupabaseClient,
  organizationId: string,
  cycleKeyHint?: string | null,
): Promise<ResolvedFavc1Cycle | null> {
  let discovery: DiscoveryRow | null = null;

  if (cycleKeyHint && isLegitimateFavc1CycleKey(cycleKeyHint)) {
    const { data } = await admin
      .from("opportunity_discovery_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", buildFavc1IdempotencyKey(organizationId, cycleKeyHint, "discovery"))
      .maybeSingle();
    discovery = (data as DiscoveryRow | null) ?? null;
  }

  if (!discovery) {
    const { data, error } = await admin
      .from("opportunity_discovery_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .like("idempotency_key", `${FAVC1_IDEMPOTENCY_PREFIX}:${organizationId}:%`)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    discovery =
      ((data as DiscoveryRow[] | null) ?? []).find((row) => {
        const parsed = parseFavc1IdempotencyKey(row.idempotency_key);
        return parsed?.stage === "discovery" && isLegitimateFavc1CycleKey(parsed.cycleKey);
      }) ?? null;
  }

  if (!discovery) return null;

  const parsed = parseFavc1IdempotencyKey(discovery.idempotency_key);
  if (!parsed || !isLegitimateFavc1CycleKey(parsed.cycleKey)) return null;

  const cycleKey = parsed.cycleKey;
  const monetizationRow = await loadStageRun<GenericRunRow>(
    admin,
    organizationId,
    buildFavc1IdempotencyKey(organizationId, cycleKey, "monetization"),
    "monetization_runs",
  );
  const selectionRow = await loadStageRun<GenericRunRow>(
    admin,
    organizationId,
    buildFavc1IdempotencyKey(organizationId, cycleKey, "venture_selection"),
    "venture_selection_runs",
  );

  const ventureAssemblyId = await findVentureAssemblyForCycle(admin, organizationId, cycleKey);

  const discoveryRef = toStageRef(discovery);
  const monetizationRef = monetizationRow ? toStageRef(monetizationRow) : null;
  const selectionRef = selectionRow ? toStageRef(selectionRow) : null;

  const terminal = inferTerminalOutcome({
    discovery: discoveryRef,
    monetization: monetizationRef,
    selection: selectionRef,
    ventureAssemblyId,
  });

  const costs = [discoveryRef, monetizationRef, selectionRef]
    .filter(Boolean)
    .map((ref) => ref!.estimatedCostUsd);
  const knownCosts = costs.filter((value): value is number => value != null && Number.isFinite(value));
  const knownCycleCostUsd = knownCosts.length > 0 ? knownCosts.reduce((sum, value) => sum + value, 0) : null;

  const latestActivityAt =
    [selectionRow?.created_at, monetizationRow?.created_at, discovery.completed_at, discovery.created_at]
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? discovery.created_at;

  return {
    cycleKey,
    organizationId,
    discoveryRunId: discovery.id,
    monetizationRunId: monetizationRow?.id ?? null,
    selectionRunId: selectionRow?.id ?? null,
    ventureAssemblyId,
    discovery: discoveryRef,
    monetization: monetizationRef,
    selection: selectionRef,
    terminalOutcome: terminal.terminalOutcome,
    isActive: terminal.isActive,
    isTerminal: terminal.isTerminal,
    latestActivityAt,
    candidateCount: discovery.candidates_persisted ?? null,
    monetizedCandidateCount:
      monetizationRow?.candidates_analyzed ??
      monetizationRow?.engine_report?.handoff?.monetizedCandidateIds?.length ??
      null,
    knownCycleCostUsd,
    knownCycleCostComplete: costs.every((value) => value != null),
    failureStage: terminal.failureStage,
    failureMessage: terminal.failureMessage,
  };
}

export function shouldPreferFavc1CycleForHq(input: {
  cycle: ResolvedFavc1Cycle;
  defaultVentureName: string | null;
  defaultVentureLatestActivityAt: string | null;
}): boolean {
  if (input.cycle.isActive) return true;
  if (input.defaultVentureName && isVerificationVentureName(input.defaultVentureName)) return true;
  if (!input.defaultVentureLatestActivityAt) return true;
  return input.cycle.latestActivityAt.localeCompare(input.defaultVentureLatestActivityAt) > 0;
}
