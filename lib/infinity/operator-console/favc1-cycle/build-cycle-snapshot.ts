import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { prepareHqMissionActivityProjection } from "@/lib/infinity/mission-activity/hq-live-projection";
import { DEPARTMENTS } from "../department-registry";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import type {
  DepartmentId,
  DepartmentUiState,
  OperatorActivityEvent,
  OperatorCostSummary,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorVentureSnapshot,
  OperatorWorkerNode,
} from "../types";
import {
  currentStageLabel,
  deriveDownstreamRoomState,
  mapPersistedRunStatusToUi,
} from "./map-run-status";
import type { Favc1CycleSnapshotMeta, ResolvedFavc1Cycle } from "./types";
import { favc1CycleVentureId } from "./types";
import { buildValidationStationState } from "./validation-station";
import { loadFavc1ValidationContext } from "./load-validation-context";
import { buildFavc1TerminalDisplay } from "./terminal-messaging";
import { buildFavc1RoomArtifacts } from "./build-room-artifacts";
import {
  applyLineageToRoomArtifacts,
  buildCandidateRankMap,
  resolveHandoffLineageColorKey,
} from "../artifacts/resolve-artifact-lineage";
import {
  assertUniqueHqArtifactIds,
  dedupeRoomArtifactsByRenderId,
} from "../artifacts/artifact-identity";

type ResearchRunRow = {
  id: string;
  status: string;
  provider: string;
  model: string;
  research_objective: string;
  estimated_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  idempotency_key: string;
};

function humanizeResearchTask(objective: string, stage: "discovery" | "monetization"): string {
  if (stage === "discovery") {
    return "Researching recurring problems in small service businesses";
  }
  if (/monetization|revenue|pricing/i.test(objective)) {
    return "Evaluating monetization options for qualified opportunities";
  }
  return "Validating market sources and evidence";
}

function buildDepartmentSnapshot(input: {
  id: DepartmentId;
  state: DepartmentUiState;
  summary: string | null;
  currentTask: string | null;
  provider: string | null;
  model: string | null;
  costUsd: number | null;
  costKnown: boolean;
  startedAt: string | null;
  lastActivityAt: string | null;
  recordCount: number;
  detail: Record<string, unknown>;
}): OperatorDepartmentSnapshot {
  const dept = DEPARTMENTS.find((item) => item.id === input.id)!;
  return {
    id: input.id,
    label: dept.label,
    state: input.state,
    engines: dept.engines,
    summary: input.summary,
    currentTask: input.currentTask,
    provider: input.provider,
    model: input.model,
    costUsd: input.costUsd,
    costKnown: input.costKnown,
    startedAt: input.startedAt,
    lastActivityAt: input.lastActivityAt,
    recordCount: input.recordCount,
    detail: input.detail,
    isActive: input.state === "RUNNING",
    isNextMissionTarget: false,
  };
}

function buildProvidersFromResearch(
  researchRuns: ResearchRunRow[],
  departmentId: DepartmentId,
  stage: "discovery" | "monetization",
): OperatorProviderSession[] {
  return researchRuns.map((run) => ({
    sessionId: run.id,
    departmentId,
    engine: stage === "discovery" ? "grounded_research" : "monetization_engine",
    role: "RESEARCH_PROVIDER" as const,
    provider: run.provider,
    model: run.model,
    status: run.status,
    task: humanizeResearchTask(run.research_objective, stage),
    costUsd: run.estimated_cost,
    costKnown: run.estimated_cost != null,
    startedAt: run.started_at ?? run.created_at,
    filesChanged: [],
  }));
}

function buildWorkerNodesFromProviders(
  providers: OperatorProviderSession[],
  departments: OperatorDepartmentSnapshot[],
): OperatorWorkerNode[] {
  const nodes: OperatorWorkerNode[] = [];
  for (const session of providers) {
    const dept = departments.find((item) => item.id === session.departmentId);
    if (!dept) continue;
    nodes.push({
      nodeId: `worker-${session.sessionId}`,
      departmentId: session.departmentId,
      role: session.role,
      displayRole: session.provider ?? "Research",
      status: mapPersistedRunStatusToUi(session.status),
      task: session.task,
      displayTask: session.task,
      provider: session.provider,
      model: session.model,
      isActive: mapPersistedRunStatusToUi(session.status) === "RUNNING",
      isDormant: false,
      motionActive: mapPersistedRunStatusToUi(session.status) === "RUNNING",
    });
    if (nodes.length >= 9) break;
  }
  return nodes;
}

function commandStateForCycle(cycle: ResolvedFavc1Cycle): DepartmentUiState {
  if (cycle.isActive) return "RUNNING";
  if (cycle.terminalOutcome === "SYSTEM_FAILURE" || cycle.terminalOutcome === "INFRASTRUCTURE_BLOCKED") {
    return "FAILED";
  }
  if (
    cycle.terminalOutcome === "BUSINESS_NO_GO" ||
    cycle.terminalOutcome === "NO_GO_MARKET_DECISION" ||
    cycle.terminalOutcome === "LEVEL_4"
  ) {
    return "COMPLETE";
  }
  return cycle.isTerminal ? "COMPLETE" : "RUNNING";
}

function commandSummary(
  cycle: ResolvedFavc1Cycle,
  terminalDisplay: ReturnType<typeof buildFavc1TerminalDisplay> | null,
): string {
  if (cycle.isActive) return "Running first autonomous venture cycle";
  if (terminalDisplay) return terminalDisplay.decision;
  switch (cycle.terminalOutcome) {
    case "LEVEL_4":
      return "First autonomous venture cycle completed";
    case "BUSINESS_NO_GO":
    case "NO_GO_MARKET_DECISION":
      return "Mission completed with no venture selected";
    case "SYSTEM_FAILURE":
      return "Mission interrupted";
    case "INFRASTRUCTURE_BLOCKED":
      return "Mission blocked";
    default:
      return "Autonomous venture cycle";
  }
}

export async function buildFavc1CycleSnapshot(
  admin: AdminSupabaseClient,
  cycle: ResolvedFavc1Cycle,
): Promise<{ snapshot: OperatorVentureSnapshot; meta: Favc1CycleSnapshotMeta }> {
  await prepareHqMissionActivityProjection(admin, cycle.organizationId);
  const prefix = `first-autonomous-venture-v1:${cycle.organizationId}:${cycle.cycleKey}`;

  const discoveryResearchIds = cycle.discoveryRunId
    ? (
        await admin
          .from("opportunity_discovery_runs")
          .select("research_run_ids")
          .eq("id", cycle.discoveryRunId)
          .maybeSingle()
      ).data?.research_run_ids
    : [];

  const researchIdSet = new Set<string>(
    Array.isArray(discoveryResearchIds) ? (discoveryResearchIds as string[]) : [],
  );

  const { data: researchByPrefix } = await admin
    .from("research_runs")
    .select("*")
    .eq("organization_id", cycle.organizationId)
    .like("idempotency_key", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(40);

  const researchRuns = (researchByPrefix ?? []) as ResearchRunRow[];
  for (const run of researchRuns) researchIdSet.add(run.id);

  const linkedResearch =
    researchIdSet.size > 0
      ? ((
          await admin
            .from("research_runs")
            .select("*")
            .eq("organization_id", cycle.organizationId)
            .in("id", [...researchIdSet])
        ).data ?? [])
      : [];

  const allResearch = [...linkedResearch, ...researchRuns].filter(
    (run, index, arr) => arr.findIndex((item) => item.id === run.id) === index,
  ) as ResearchRunRow[];

  const discoveryResearch = allResearch.filter((run) => run.idempotency_key.includes(":discovery:"));
  const monetizationResearch = allResearch.filter((run) => run.idempotency_key.includes(":monetization:"));

  const discoveryState = mapPersistedRunStatusToUi(cycle.discovery?.status);
  const monetizationState = mapPersistedRunStatusToUi(cycle.monetization?.status);
  const selectionState = mapPersistedRunStatusToUi(cycle.selection?.status);

  const discoveryFailed = discoveryState === "FAILED";
  const monetizationFailed = monetizationState === "FAILED";
  const orchestratorFailed =
    cycle.terminalOutcome === "SYSTEM_FAILURE" &&
    cycle.failureStage === "venture_selection" &&
    !cycle.selection;

  const researchActiveCount = allResearch.filter(
    (run) => mapPersistedRunStatusToUi(run.status) === "RUNNING",
  ).length;
  const researchCompleteCount = allResearch.filter(
    (run) => mapPersistedRunStatusToUi(run.status) === "COMPLETE",
  ).length;

  const researchGridState: DepartmentUiState =
    allResearch.length === 0
      ? discoveryState === "RUNNING"
        ? "NOT_STARTED"
        : discoveryState === "COMPLETE"
          ? "COMPLETE"
          : "NOT_STARTED"
      : researchActiveCount > 0
        ? "RUNNING"
        : researchCompleteCount > 0
          ? "COMPLETE"
          : mapPersistedRunStatusToUi(allResearch[0]?.status);

  const blueprintState = orchestratorFailed
    ? "BLOCKED"
    : cycle.selection
      ? selectionState
      : deriveDownstreamRoomState({
          upstreamState: monetizationState,
          upstreamFailed: monetizationFailed || orchestratorFailed,
          ownState: "NOT_STARTED",
          hasOwnRecords: false,
        });

  const downstreamBlocked = (upstream: DepartmentUiState, failed: boolean) =>
    deriveDownstreamRoomState({
      upstreamState: upstream,
      upstreamFailed: failed,
      ownState: "NOT_STARTED",
      hasOwnRecords: false,
    });

  const validationContext = await loadFavc1ValidationContext(admin, {
    organizationId: cycle.organizationId,
    cycleKey: cycle.cycleKey,
    selectionRunId: cycle.selectionRunId,
  });

  const terminalDisplay = cycle.isTerminal
    ? buildFavc1TerminalDisplay({
        terminalOutcome: cycle.terminalOutcome,
        selectionStopReasonPath: validationContext.selectionStopReasonPath,
        validationOutcome: validationContext.validationOutcome,
        failureMessage: cycle.failureMessage,
      })
    : null;

  const validationStation = buildValidationStationState({
    validationActive:
      cycle.isActive && selectionState === "COMPLETE" && !cycle.ventureAssemblyId && cycle.isTerminal === false,
    validationCompleted:
      cycle.isTerminal &&
      selectionState === "COMPLETE" &&
      !cycle.ventureAssemblyId &&
      (cycle.terminalOutcome === "BUSINESS_NO_GO" || cycle.terminalOutcome === "NO_GO_MARKET_DECISION"),
    providerCalls: cycle.isActive ? validationContext.providerCalls : validationContext.providerCalls,
    synthesisOnly: validationContext.synthesisOnly,
    humanizedBlocker: validationContext.humanizedBlocker,
    costUsd: validationContext.validationCostUsd,
    costKnown: validationContext.validationCostKnown,
    currentTask:
      cycle.isActive && selectionState === "COMPLETE"
        ? validationContext.providerCalls > 0
          ? `Researching new evidence for ${validationContext.humanizedBlocker ?? "blocking assumption"}`
          : "Reviewing existing evidence — no new provider research"
        : null,
  });

  const departments: OperatorDepartmentSnapshot[] = [
    buildDepartmentSnapshot({
      id: "executive_office",
      state: commandStateForCycle(cycle),
      summary: terminalDisplay?.headline ?? commandSummary(cycle, terminalDisplay),
      currentTask: cycle.isActive ? "Running first autonomous venture cycle" : commandSummary(cycle, terminalDisplay),
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: cycle.discovery?.startedAt ?? null,
      lastActivityAt: cycle.latestActivityAt,
      recordCount: 1,
      detail: {
        favc1Cycle: true,
        terminalOutcome: cycle.terminalOutcome,
        terminalDisplay,
        selectionStopReasonPath: validationContext.selectionStopReasonPath,
        validationOutcome: validationContext.validationOutcome,
      },
    }),
    buildDepartmentSnapshot({
      id: "opportunity_lab",
      state: discoveryState,
      summary:
        discoveryState === "RUNNING"
          ? "Venture Radar is researching market pain."
          : discoveryState === "COMPLETE"
            ? `${cycle.candidateCount ?? 0} this cycle — open Opportunities for the full universe`
            : null,
      currentTask:
        discoveryState === "RUNNING" ? "Venture Radar is researching market pain." : null,
      provider: discoveryResearch[0]?.provider ?? null,
      model: discoveryResearch[0]?.model ?? null,
      costUsd: cycle.discovery?.estimatedCostUsd ?? null,
      costKnown: cycle.discovery?.estimatedCostUsd != null,
      startedAt: cycle.discovery?.startedAt ?? null,
      lastActivityAt: cycle.discovery?.completedAt ?? cycle.latestActivityAt,
      recordCount: cycle.candidateCount ?? 0,
      detail: {
        discoveryRunId: cycle.discoveryRunId,
        candidates: Array.from({ length: cycle.candidateCount ?? 0 }),
      },
    }),
    buildDepartmentSnapshot({
      id: "research_department",
      state: researchGridState,
      summary:
        researchGridState === "RUNNING"
          ? "Research Grid is validating sources."
          : researchCompleteCount > 0
            ? `${researchCompleteCount} research sessions complete`
            : null,
      currentTask:
        researchGridState === "RUNNING" ? "Research Grid is validating sources." : null,
      provider: allResearch[0]?.provider ?? null,
      model: allResearch[0]?.model ?? null,
      costUsd: null,
      costKnown: false,
      startedAt: allResearch[0]?.started_at ?? null,
      lastActivityAt: allResearch[0]?.completed_at ?? allResearch[0]?.created_at ?? null,
      recordCount: allResearch.length,
      detail: { researchRuns: allResearch },
    }),
    buildDepartmentSnapshot({
      id: "strategy_finance",
      state: monetizationState,
      summary:
        monetizationState === "RUNNING"
          ? `Profit Lab is evaluating revenue models for ${cycle.monetizedCandidateCount ?? "qualified"} opportunities.`
          : monetizationState === "COMPLETE"
            ? `Profit Lab analyzed ${cycle.monetizedCandidateCount ?? 0} opportunities`
            : null,
      currentTask:
        monetizationState === "RUNNING"
          ? `Profit Lab is evaluating revenue models for ${cycle.monetizedCandidateCount ?? "qualified"} opportunities.`
          : null,
      provider: monetizationResearch[0]?.provider ?? null,
      model: monetizationResearch[0]?.model ?? null,
      costUsd: cycle.monetization?.estimatedCostUsd ?? null,
      costKnown: cycle.monetization?.estimatedCostUsd != null,
      startedAt: cycle.monetization?.startedAt ?? null,
      lastActivityAt: cycle.monetization?.completedAt ?? null,
      recordCount: cycle.monetizedCandidateCount ?? 0,
      detail: { monetizationRunId: cycle.monetizationRunId },
    }),
    buildDepartmentSnapshot({
      id: "company_operations",
      state: blueprintState,
      summary:
        blueprintState === "RUNNING"
          ? `Blueprint Lab is comparing ${cycle.monetizedCandidateCount ?? 0} qualified venture candidates.`
          : orchestratorFailed
            ? "Blueprint Lab blocked by cycle handoff failure"
            : null,
      currentTask:
        blueprintState === "RUNNING"
          ? `Blueprint Lab is comparing ${cycle.monetizedCandidateCount ?? 0} qualified venture candidates.`
          : null,
      provider: null,
      model: null,
      costUsd: cycle.selection?.estimatedCostUsd ?? null,
      costKnown: cycle.selection?.estimatedCostUsd != null,
      startedAt: cycle.selection?.startedAt ?? null,
      lastActivityAt: cycle.selection?.completedAt ?? null,
      recordCount: cycle.selection ? 1 : 0,
      detail: { selectionRunId: cycle.selectionRunId },
    }),
    buildDepartmentSnapshot({
      id: "systems_architect",
      state: downstreamBlocked(blueprintState, blueprintState === "FAILED"),
      summary: blueprintState === "COMPLETE" ? "Operating systems mapped from the current venture evidence." : null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
    }),
    buildDepartmentSnapshot({
      id: "growth_department",
      state: downstreamBlocked(blueprintState, blueprintState === "FAILED"),
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
    }),
    buildDepartmentSnapshot({
      id: "creative_studio",
      state: downstreamBlocked(blueprintState, blueprintState === "FAILED"),
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
    }),
    buildDepartmentSnapshot({
      id: "product_lab",
      state: downstreamBlocked(blueprintState, blueprintState === "FAILED"),
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
    }),
    buildDepartmentSnapshot({
      id: "quality_control",
      state: validationStation.state,
      summary: validationStation.summary,
      currentTask: validationStation.currentTask,
      provider: null,
      model: null,
      costUsd: validationStation.costUsd,
      costKnown: validationStation.costKnown,
      startedAt: cycle.selection?.startedAt ?? null,
      lastActivityAt: cycle.selection?.completedAt ?? null,
      recordCount: validationStation.recordCount,
      detail: { validationStation: true, showWorkers: validationStation.showWorkers },
    }),
    buildDepartmentSnapshot({
      id: "launch_operations",
      state: downstreamBlocked(blueprintState, blueprintState === "FAILED"),
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
    }),
    buildDepartmentSnapshot({
      id: "intelligence_center",
      state: downstreamBlocked(blueprintState, blueprintState === "FAILED"),
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
    }),
  ];

  const acquisitionResearchRunId = validationContext.acquisitionResearchRunId;
  if (acquisitionResearchRunId && !allResearch.some((run) => run.id === acquisitionResearchRunId)) {
    const { data: acquisitionRun } = await admin
      .from("research_runs")
      .select("*")
      .eq("id", acquisitionResearchRunId)
      .maybeSingle();
    if (acquisitionRun) allResearch.push(acquisitionRun as ResearchRunRow);
  }

  const roomArtifacts = await buildFavc1RoomArtifacts(admin, cycle, {
    discoveryState,
    monetizationState,
    selectionState,
    validationState: validationStation.state,
    validationContext,
    allResearch,
    validationStationActive: validationStation.state === "RUNNING",
    validationStationProviderActive:
      cycle.isActive && validationContext.providerCalls > 0 && validationStation.showWorkers,
  });

  let handoffStage: OperatorVentureSnapshot["handoffStage"] = null;
  if (discoveryState === "COMPLETE" && monetizationState === "RUNNING") {
    handoffStage = "discovery_to_monetization";
  } else if (monetizationState === "COMPLETE" && selectionState === "RUNNING") {
    handoffStage = "monetization_to_selection";
  } else if (selectionState === "COMPLETE" && validationStation.state === "RUNNING") {
    handoffStage = "selection_to_validation";
  }

  const allRoomArtifacts = Object.values(roomArtifacts).flat();
  const candidateRankById = buildCandidateRankMap(allRoomArtifacts);
  const candidateTitleById = new Map<string, string>();
  for (const artifact of allRoomArtifacts) {
    if (artifact.artifactType === "opportunity_candidate") {
      candidateTitleById.set(artifact.sourceRecordId, artifact.title);
    }
  }
  const lineageContext = {
    candidateRankById,
    candidateTitleById,
    selectedCandidateId: validationContext.selectedValidationCandidateId ?? null,
  };
  const lineageApplied = applyLineageToRoomArtifacts(roomArtifacts, lineageContext);
  let roomArtifactsWithLineage = lineageApplied;
  if (process.env.NODE_ENV !== "production") {
    assertUniqueHqArtifactIds(lineageApplied);
  } else {
    roomArtifactsWithLineage = dedupeRoomArtifactsByRenderId(
      lineageApplied as import("../artifacts/types").HqRoomArtifactMap,
    );
  }
  const handoffLineageColorKey = resolveHandoffLineageColorKey(handoffStage, lineageContext);

  const departmentsWithArtifacts = departments.map((dept) => ({
    ...dept,
    workArtifacts: roomArtifactsWithLineage[dept.id] ?? [],
  }));

  const validationProviders =
    validationContext.acquisitionResearchRunId && cycle.isActive && validationContext.providerCalls > 0
      ? [
          {
            sessionId: validationContext.acquisitionResearchRunId,
            departmentId: "quality_control" as DepartmentId,
            engine: "bounded_validation",
            role: "RESEARCH_PROVIDER" as const,
            provider: allResearch.find((run) => run.id === validationContext.acquisitionResearchRunId)?.provider ?? "gemini",
            model: allResearch.find((run) => run.id === validationContext.acquisitionResearchRunId)?.model ?? "gemini",
            status: "running",
            task: validationStation.currentTask ?? "Researching validation evidence",
            costUsd: validationContext.validationCostUsd,
            costKnown: validationContext.validationCostKnown,
            startedAt: cycle.selection?.startedAt ?? null,
            filesChanged: [],
          },
        ]
      : [];

  const discoveryProviders = buildProvidersFromResearch(
    discoveryResearch.length > 0 ? discoveryResearch : allResearch.slice(0, 3),
    "opportunity_lab",
    "discovery",
  );
  const monetizationProviders = buildProvidersFromResearch(
    monetizationResearch,
    "strategy_finance",
    "monetization",
  );
  const providers = [...discoveryProviders, ...monetizationProviders, ...validationProviders];

  const activeDepartment = departments.find((dept) => dept.isActive) ?? null;
  const currentActivity: OperatorCurrentActivity = {
    active: cycle.isActive || Boolean(activeDepartment),
    departmentId: activeDepartment?.id ?? "executive_office",
    departmentLabel: activeDepartment?.label ?? "Executive Office",
    engine: activeDepartment?.engines[0] ?? "executive_decision",
    task: activeDepartment?.currentTask ?? commandSummary(cycle, terminalDisplay),
    provider: activeDepartment?.provider ?? null,
    model: activeDepartment?.model ?? null,
    status: activeDepartment?.state ?? commandStateForCycle(cycle),
    startedAt: activeDepartment?.startedAt ?? cycle.discovery?.startedAt ?? null,
    elapsedSeconds: null,
    attempt: null,
    costUsd: cycle.knownCycleCostUsd,
    costKnown: cycle.knownCycleCostComplete,
    artifactStatus: null,
    latestActivitySummary: activeDepartment?.summary ?? commandSummary(cycle, terminalDisplay),
    latestActivityAt: cycle.latestActivityAt,
    displayNarration:
      activeDepartment?.currentTask ??
      activeDepartment?.summary ??
      commandSummary(cycle, terminalDisplay),
    departmentDisplayName: activeDepartment?.label ?? "Command",
  };

  const activityFeed: OperatorActivityEvent[] = [];
  if (cycle.discovery) {
    activityFeed.push({
      id: `discovery-${cycle.discoveryRunId}`,
      timestamp: cycle.discovery.completedAt ?? cycle.latestActivityAt,
      departmentId: "opportunity_lab",
      departmentLabel: "Opportunity Lab",
      engine: "opportunity_scanner",
      eventType: "discovery_run",
      summary: `Venture Radar ${cycle.discovery.status}`,
      status: cycle.discovery.status,
      relatedIds: { discoveryRunId: cycle.discoveryRunId },
      provider: discoveryResearch[0]?.provider ?? null,
      model: discoveryResearch[0]?.model ?? null,
      costUsd: cycle.discovery.estimatedCostUsd,
      costKnown: cycle.discovery.estimatedCostUsd != null,
    });
  }
  if (cycle.monetization) {
    activityFeed.push({
      id: `monetization-${cycle.monetizationRunId}`,
      timestamp: cycle.monetization.completedAt ?? cycle.latestActivityAt,
      departmentId: "strategy_finance",
      departmentLabel: "Strategy & Finance",
      engine: "monetization_engine",
      eventType: "monetization_run",
      summary: `Profit Lab ${cycle.monetization.status}`,
      status: cycle.monetization.status,
      relatedIds: { monetizationRunId: cycle.monetizationRunId },
      provider: monetizationResearch[0]?.provider ?? null,
      model: monetizationResearch[0]?.model ?? null,
      costUsd: cycle.monetization.estimatedCostUsd,
      costKnown: cycle.monetization.estimatedCostUsd != null,
    });
  }

  const costs: OperatorCostSummary = {
    knownSpendUsd: cycle.knownCycleCostUsd ?? 0,
    unpricedProviderCalls: cycle.knownCycleCostComplete
      ? 0
      : allResearch.filter((run) => run.estimated_cost == null).length +
        (cycle.selection?.estimatedCostUsd == null && cycle.selection ? 1 : 0),
    breakdown: [
      {
        label: "Venture Radar",
        amountUsd: cycle.discovery?.estimatedCostUsd ?? null,
        known: cycle.discovery?.estimatedCostUsd != null,
      },
      {
        label: "Profit Lab",
        amountUsd: cycle.monetization?.estimatedCostUsd ?? null,
        known: cycle.monetization?.estimatedCostUsd != null,
      },
      {
        label: "Validation",
        amountUsd: validationContext.validationCostUsd,
        known: validationContext.validationCostKnown,
      },
      {
        label: "Blueprint Lab",
        amountUsd: cycle.selection?.estimatedCostUsd ?? null,
        known: cycle.selection?.estimatedCostUsd != null,
      },
    ],
  };

  const meta: Favc1CycleSnapshotMeta = {
    cycleKey: cycle.cycleKey,
    mode: cycle.ventureAssemblyId ? "venture_linked" : "pre_venture",
    terminalOutcome: cycle.terminalOutcome,
    discoveryRunId: cycle.discoveryRunId,
    monetizationRunId: cycle.monetizationRunId,
    selectionRunId: cycle.selectionRunId,
    ventureAssemblyId: cycle.ventureAssemblyId,
    candidateCount: cycle.candidateCount,
    monetizedCandidateCount: cycle.monetizedCandidateCount,
    researchSessionCount: allResearch.length,
    activeResearchSessionCount: researchActiveCount,
    knownCycleCostUsd: cycle.knownCycleCostUsd,
    knownCycleCostComplete: cycle.knownCycleCostComplete,
    currentStageLabel: currentStageLabel({
      discoveryState,
      monetizationState,
      selectionState,
      terminalOutcome: cycle.terminalOutcome,
    }),
    failureStage: cycle.failureStage,
    failureMessage: cycle.failureMessage,
    selectionStopReasonPath: validationContext.selectionStopReasonPath,
    validationOutcome: validationContext.validationOutcome,
    terminalDisplay,
  };

  const baseSnapshot: OperatorVentureSnapshot = {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: favc1CycleVentureId(cycle.cycleKey),
      organizationId: cycle.organizationId,
      missionId: "favc1-cycle",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Autonomous Venture Cycle",
      ventureType: "first_autonomous_venture_v1",
      assemblyStatus: cycle.isActive ? "running" : cycle.terminalOutcome.toLowerCase(),
      readinessStatus: null,
      launchStage: null,
      correlationIds: [cycle.discoveryRunId, cycle.monetizationRunId, cycle.selectionRunId].filter(
        Boolean,
      ) as string[],
    },
    overallStatus: commandStateForCycle(cycle),
    currentDepartments: departments.filter((dept) => dept.isActive).map((dept) => dept.id),
    currentActivity,
    departments: departmentsWithArtifacts,
    pipeline: {
      stagesCompleted: departments.filter((dept) => dept.state === "COMPLETE").length,
      stagesTotal: departments.length,
      stageLabels: departments.map((dept) => dept.label),
    },
    activityFeed,
    providers,
    costs,
    lineage: [],
    closedLoopRoute: {
      active: cycle.isActive,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: "first_autonomous_venture_v1",
      missionId: null,
      missionStatus: cycle.isActive ? "RUNNING" : cycle.terminalOutcome,
    },
    system: {
      engineRuns: {
        favc1Cycle: [meta],
        discovery: cycle.discovery ? [cycle.discovery] : [],
        monetization: cycle.monetization ? [cycle.monetization] : [],
        selection: cycle.selection ? [cycle.selection] : [],
        researchRuns: allResearch,
      },
      artifacts: {},
      performance: {},
      learning: {},
    },
    workerNodes: buildWorkerNodesFromProviders(providers, departmentsWithArtifacts),
    favc1Cycle: meta,
    roomArtifacts: roomArtifactsWithLineage,
    handoffStage,
    handoffLineageColorKey,
  };

  return { snapshot: enrichOperatorSnapshot(baseSnapshot), meta };
}
