import { DEPARTMENTS, getDepartmentForMissionTargetEngine } from "./department-registry";
import {
  computeFurthestLifecycleIndex,
  deriveDepartmentStateWithSemantics,
  deriveUiStateFromEngineStatus,
} from "./status-derivation";
import type { RawEngineData } from "./load-raw-data";
import { parseCostUsd, rowStatus, rowTimestamp } from "./load-raw-data";
import type {
  DepartmentId,
  OperatorCostSummary,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorLineageNode,
  OperatorProviderSession,
} from "./types";
import { filterSafeFilePaths } from "./sanitize";

function latestRow(rows: Record<string, unknown>[]): Record<string, unknown> | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const ta = rowTimestamp(a) ?? "";
    const tb = rowTimestamp(b) ?? "";
    return tb.localeCompare(ta);
  })[0] ?? null;
}

function rowsToTimeline(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    status: rowStatus(row) ?? "unknown",
    timestamp: rowTimestamp(row),
  }));
}

function runningRow(rows: Record<string, unknown>[]): Record<string, unknown> | null {
  return rows.find((r) => deriveUiStateFromEngineStatus(rowStatus(r)) === "RUNNING") ?? null;
}

export function buildDepartments(
  raw: RawEngineData,
  nextMissionTargetDept: DepartmentId | null,
): OperatorDepartmentSnapshot[] {
  type DeptPartial = {
    def: (typeof DEPARTMENTS)[number];
    timeline: ReturnType<typeof rowsToTimeline>;
    hasRecords: boolean;
    detail: Record<string, unknown>;
    summary: string | null;
    currentTask: string | null;
    provider: string | null;
    model: string | null;
    costUsd: number | null;
    costKnown: boolean;
    startedAt: string | null;
    lastActivityAt: string | null;
    recordCount: number;
    runStatuses: string[];
  };

  const partials: DeptPartial[] = DEPARTMENTS.map((def) => {
    let timeline: ReturnType<typeof rowsToTimeline> = [];
    let runStatuses: string[] = [];
    let hasRecords = false;
    let detail: Record<string, unknown> = {};
    let summary: string | null = null;
    let currentTask: string | null = null;
    let provider: string | null = null;
    let model: string | null = null;
    let costUsd: number | null = null;
    let costKnown = false;
    let startedAt: string | null = null;
    let lastActivityAt: string | null = null;
    let recordCount = 0;

    switch (def.id) {
      case "opportunity_lab": {
        const rows = [...(raw.opportunity ? [raw.opportunity] : []), ...raw.opportunityCandidates];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        summary = raw.opportunity ? String(raw.opportunity.name ?? raw.opportunity.summary ?? "Opportunity tracked") : null;
        detail = { opportunity: raw.opportunity, candidates: raw.opportunityCandidates };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "research_department": {
        const rows = [...raw.researchRuns, ...raw.aiBrainRuns];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        const active = runningRow(rows) ?? latestRow(rows);
        if (active) {
          provider = typeof active.provider === "string" ? active.provider : null;
          model = typeof active.model === "string" ? active.model : null;
          startedAt = rowTimestamp(active);
        }
        detail = { researchRuns: raw.researchRuns, aiBrainRuns: raw.aiBrainRuns };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "strategy_finance": {
        const rows = [...raw.monetizationRuns, ...raw.monetizationPlans, ...raw.ventureSelectionRuns];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        summary = raw.monetizationPlans[0] ? String(raw.monetizationPlans[0].title ?? "Monetization plan") : null;
        detail = { monetizationRuns: raw.monetizationRuns, plans: raw.monetizationPlans, ventureSelection: raw.ventureSelectionRuns };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "company_operations": {
        const rows = [...raw.companyBuilderRuns, ...raw.companyBuilderBlueprints];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        detail = { runs: raw.companyBuilderRuns, blueprints: raw.companyBuilderBlueprints };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "growth_department": {
        const rows = [...raw.organicGrowthRuns, ...raw.organicGrowthPackages];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        detail = { runs: raw.organicGrowthRuns, packages: raw.organicGrowthPackages };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "creative_studio": {
        const rows = [...raw.creativeMediaRuns, ...raw.creativeMediaPackages, ...raw.creativeMediaJobs, ...raw.creativeMediaAssets];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        const activeJob = runningRow(raw.creativeMediaJobs) ?? latestRow(raw.creativeMediaJobs);
        if (activeJob) {
          provider = typeof activeJob.provider === "string" ? activeJob.provider : null;
          model = typeof activeJob.model === "string" ? activeJob.model : null;
          currentTask = typeof activeJob.media_type === "string" ? `Generate ${activeJob.media_type}` : null;
          const c = parseCostUsd(activeJob);
          costUsd = c.amount;
          costKnown = c.known;
          startedAt = rowTimestamp(activeJob);
        }
        detail = {
          runs: raw.creativeMediaRuns,
          packages: raw.creativeMediaPackages,
          jobs: raw.creativeMediaJobs,
          assets: raw.creativeMediaAssets,
        };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "product_lab": {
        const rows = [...raw.pabRuns, ...raw.pabTasks, ...raw.pabChangeSets, ...raw.pabProductionArtifacts];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        const activeRun = runningRow(raw.pabRuns) ?? latestRow(raw.pabRuns);
        if (activeRun) {
          currentTask = "PAB V2.1 build task";
          const c = parseCostUsd(activeRun);
          costUsd = c.amount;
          costKnown = c.known;
          startedAt = rowTimestamp(activeRun);
        }
        const activeCall = latestRow(raw.pabProviderCalls);
        if (activeCall) {
          provider = typeof activeCall.provider === "string" ? activeCall.provider : null;
          model = typeof activeCall.model === "string" ? activeCall.model : null;
        }
        detail = {
          runs: raw.pabRuns,
          tasks: raw.pabTasks,
          providerCalls: raw.pabProviderCalls,
          changeSets: raw.pabChangeSets,
          productionArtifacts: raw.pabProductionArtifacts,
        };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "quality_control": {
        const rows = [...raw.creativeMediaReviews, ...raw.pabProductionArtifacts.filter((a) => a.quality_outcome)];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? String(r.quality_outcome ?? "unknown"));
        timeline = rowsToTimeline(rows);
        detail = { reviews: raw.creativeMediaReviews, artifacts: raw.pabProductionArtifacts, productionArtifacts: raw.productionArtifacts };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "launch_operations": {
        const rows = [...raw.externalActions, ...raw.launchPlans];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        detail = { externalActions: raw.externalActions, launchPlans: raw.launchPlans };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "intelligence_center": {
        const rows = [...raw.performanceRuns, ...raw.performancePackages, ...raw.performanceAggregates];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        const execRate = raw.performanceAggregates.find((a) => a.metric === "execution_success_rate");
        if (execRate) summary = `execution_success_rate: ${execRate.value}`;
        detail = {
          runs: raw.performanceRuns,
          packages: raw.performancePackages,
          aggregates: raw.performanceAggregates,
        };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
      case "executive_office": {
        const rows = [...raw.performanceDecisions, ...raw.missions];
        recordCount = rows.length;
        hasRecords = recordCount > 0;
        runStatuses = rows.map((r) => rowStatus(r) ?? "unknown");
        timeline = rowsToTimeline(rows);
        const latestDecision = latestRow(raw.performanceDecisions);
        if (latestDecision) {
          summary = String(latestDecision.decision_type ?? "Learning decision");
          currentTask = String(latestDecision.status ?? null);
        }
        detail = { learningDecisions: raw.performanceDecisions, missions: raw.missions };
        lastActivityAt = latestRow(rows) ? rowTimestamp(latestRow(rows)!) : null;
        break;
      }
    }

    return {
      def,
      timeline,
      hasRecords,
      detail,
      summary,
      currentTask,
      provider,
      model,
      costUsd,
      costKnown,
      startedAt,
      lastActivityAt,
      recordCount,
      runStatuses,
    };
  });

  const preliminary = partials.map((partial) => {
    const derived = deriveDepartmentStateWithSemantics({
      timeline: partial.timeline,
      runStatuses: partial.runStatuses,
      hasRecords: partial.hasRecords,
      departmentLifecycleOrder: partial.def.lifecycleOrder,
    });
    return {
      lifecycleOrder: partial.def.lifecycleOrder,
      state: derived.state,
      recordCount: partial.recordCount,
    };
  });

  const furthestLifecycleIndex = computeFurthestLifecycleIndex(preliminary);

  return partials.map((partial) => {
    const derived = deriveDepartmentStateWithSemantics({
      timeline: partial.timeline,
      runStatuses: partial.runStatuses,
      hasRecords: partial.hasRecords,
      departmentLifecycleOrder: partial.def.lifecycleOrder,
      furthestVentureLifecycleIndex: furthestLifecycleIndex,
    });
    const state = derived.state;
    return {
      id: partial.def.id,
      label: partial.def.label,
      state,
      engines: partial.def.engines,
      summary: partial.summary,
      currentTask: partial.currentTask,
      provider: partial.provider,
      model: partial.model,
      costUsd: partial.costUsd,
      costKnown: partial.costKnown,
      startedAt: partial.startedAt,
      lastActivityAt: partial.lastActivityAt,
      recordCount: partial.recordCount,
      detail: partial.detail,
      isActive: state === "RUNNING",
      isNextMissionTarget: nextMissionTargetDept === partial.def.id,
      failureSemantics: derived.failureSemantics,
      latestRawStatus: derived.latestRawStatus,
    };
  });
}

export function buildCurrentActivity(
  departments: OperatorDepartmentSnapshot[],
  feed: Array<{ summary: string; timestamp: string }>,
): OperatorCurrentActivity {
  const active = departments.filter((d) => d.isActive);
  if (active.length === 1) {
    const d = active[0]!;
    const started = d.startedAt ? new Date(d.startedAt).getTime() : null;
    return {
      active: true,
      departmentId: d.id,
      departmentLabel: d.label,
      engine: d.engines[0] ?? null,
      task: d.currentTask,
      provider: d.provider,
      model: d.model,
      status: d.state,
      startedAt: d.startedAt,
      elapsedSeconds: started ? Math.floor((Date.now() - started) / 1000) : null,
      attempt: null,
      costUsd: d.costUsd,
      costKnown: d.costKnown,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    };
  }
  if (active.length > 1) {
    return {
      active: true,
      departmentId: null,
      departmentLabel: active.map((d) => d.label).join(", "),
      engine: null,
      task: "Multiple departments active",
      provider: null,
      model: null,
      status: "RUNNING",
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    };
  }

  const latest = feed[0];
  const latestCompleted = departments
    .filter((d) => d.state === "COMPLETE" && d.lastActivityAt)
    .sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""))[0];

  return {
    active: false,
    departmentId: latestCompleted?.id ?? null,
    departmentLabel: latestCompleted?.label ?? null,
    engine: null,
    task: null,
    provider: null,
    model: null,
    status: null,
    startedAt: null,
    elapsedSeconds: null,
    attempt: null,
    costUsd: null,
    costKnown: false,
    artifactStatus: null,
    latestActivitySummary: latest?.summary ?? (latestCompleted ? `${latestCompleted.label} completed` : "No activity recorded"),
    latestActivityAt: latest?.timestamp ?? latestCompleted?.lastActivityAt ?? null,
  };
}

export function buildCostSummary(raw: RawEngineData): OperatorCostSummary {
  const breakdown: OperatorCostSummary["breakdown"] = [];
  let knownSpendUsd = 0;
  let unpricedProviderCalls = 0;

  for (const r of raw.pabRuns) {
    const c = parseCostUsd(r);
    if (c.known && c.amount != null) {
      knownSpendUsd += c.amount;
      breakdown.push({ label: "Product Lab (PAB)", amountUsd: c.amount, known: true });
    }
  }

  for (const call of raw.pabProviderCalls) {
    const c = parseCostUsd(call);
    if (c.known && c.amount != null) knownSpendUsd += c.amount;
    else unpricedProviderCalls += 1;
  }

  for (const job of raw.creativeMediaJobs) {
    const c = parseCostUsd(job);
    if (c.known && c.amount != null) {
      knownSpendUsd += c.amount;
      breakdown.push({ label: "Creative Studio", amountUsd: c.amount, known: true });
    }
  }

  return { knownSpendUsd, unpricedProviderCalls, breakdown };
}

export function buildProviderSessions(raw: RawEngineData): OperatorProviderSession[] {
  const sessions: OperatorProviderSession[] = [];

  for (const call of raw.pabProviderCalls.slice(0, 20)) {
    const files = filterSafeFilePaths(
      Array.isArray(call.files_changed)
        ? (call.files_changed as string[])
        : [],
    );
    const c = parseCostUsd(call);
    sessions.push({
      sessionId: String(call.id),
      departmentId: "product_lab",
      engine: "product_asset_builder",
      role: String(call.call_role ?? "IMPLEMENTER").toUpperCase().includes("REVIEW") ? "REVIEWER" : "IMPLEMENTER",
      provider: typeof call.provider === "string" ? call.provider : null,
      model: typeof call.model === "string" ? call.model : null,
      status: String(call.status ?? "unknown"),
      task: typeof call.task_name === "string" ? call.task_name : null,
      costUsd: c.amount,
      costKnown: c.known,
      startedAt: rowTimestamp(call),
      filesChanged: files,
    });
  }

  for (const job of raw.creativeMediaJobs.slice(0, 10)) {
    const c = parseCostUsd(job);
    sessions.push({
      sessionId: String(job.id),
      departmentId: "creative_studio",
      engine: "creative_media",
      role: "MEDIA_PROVIDER",
      provider: typeof job.provider === "string" ? job.provider : null,
      model: typeof job.model === "string" ? job.model : null,
      status: String(job.status ?? "unknown"),
      task: typeof job.media_type === "string" ? job.media_type : null,
      costUsd: c.amount,
      costKnown: c.known,
      startedAt: rowTimestamp(job),
      filesChanged: [],
    });
  }

  for (const r of raw.researchRuns.slice(0, 10)) {
    sessions.push({
      sessionId: String(r.id),
      departmentId: "research_department",
      engine: "grounded_research",
      role: "RESEARCH_PROVIDER",
      provider: typeof r.provider === "string" ? r.provider : null,
      model: typeof r.model === "string" ? r.model : null,
      status: String(r.status ?? "unknown"),
      task: "Grounded research",
      costUsd: null,
      costKnown: false,
      startedAt: rowTimestamp(r),
      filesChanged: [],
    });
  }

  return sessions;
}

export function buildLineage(raw: RawEngineData): OperatorLineageNode[] {
  const root: OperatorLineageNode = {
    id: "lineage-root",
    type: "venture",
    label: "Venture lineage",
    status: null,
    timestamp: null,
    children: [],
  };

  if (raw.opportunity) {
    root.children.push({
      id: String(raw.opportunity.id),
      type: "Opportunity",
      label: String(raw.opportunity.name ?? raw.opportunity.summary ?? raw.opportunity.id),
      status: rowStatus(raw.opportunity),
      timestamp: rowTimestamp(raw.opportunity),
      children: raw.opportunityCandidates.map((c) => ({
        id: String(c.id),
        type: "OpportunityCandidate",
        label: String(c.title ?? c.id),
        status: rowStatus(c),
        timestamp: rowTimestamp(c),
        children: [],
      })),
    });
  }

  for (const p of raw.monetizationPlans.slice(0, 3)) {
    root.children.push({
      id: String(p.id),
      type: "MonetizationPlan",
      label: String(p.title ?? p.id),
      status: rowStatus(p),
      timestamp: rowTimestamp(p),
      children: [],
    });
  }

  for (const pkg of raw.organicGrowthPackages.slice(0, 3)) {
    root.children.push({
      id: String(pkg.id),
      type: "OrganicGrowthPackage",
      label: String(pkg.venture_id ?? pkg.id),
      status: rowStatus(pkg),
      timestamp: rowTimestamp(pkg),
      children: [],
    });
  }

  for (const art of [...raw.pabProductionArtifacts, ...raw.productionArtifacts].slice(0, 5)) {
    root.children.push({
      id: String(art.id ?? art.artifact_id),
      type: "ProductionArtifact",
      label: String(art.artifact_id ?? art.id),
      status: rowStatus(art),
      timestamp: rowTimestamp(art),
      children: [],
    });
  }

  for (const a of raw.externalActions.slice(0, 5)) {
    root.children.push({
      id: String(a.id),
      type: "ExternalAction",
      label: String(a.action_type ?? a.id),
      status: rowStatus(a),
      timestamp: rowTimestamp(a),
      children: [],
    });
  }

  for (const d of raw.performanceDecisions.slice(0, 3)) {
    root.children.push({
      id: String(d.decision_id ?? d.id),
      type: "LearningDecision",
      label: String(d.decision_type ?? d.id),
      status: String(d.status ?? null),
      timestamp: rowTimestamp(d),
      children: d.mission_id
        ? [{
            id: String(d.mission_id),
            type: "Mission",
            label: String(d.mission_id),
            status: null,
            timestamp: null,
            children: [],
          }]
        : [],
    });
  }

  return [root];
}

export function resolveNextMissionTarget(raw: RawEngineData): DepartmentId | null {
  const latest = latestRow(raw.performanceDecisions);
  if (!latest) return null;
  const payload = latest.decision_payload as Record<string, unknown> | null;
  const target =
    (typeof payload?.missionTargetEngine === "string" ? payload.missionTargetEngine : null) ??
    (typeof latest.mission_target_engine === "string" ? latest.mission_target_engine : null);
  if (!target) return null;
  return getDepartmentForMissionTargetEngine(target);
}
