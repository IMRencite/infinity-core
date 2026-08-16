import { getDepartment } from "./department-registry";
import type { RawEngineData } from "./load-raw-data";
import { rowStatus, rowTimestamp } from "./load-raw-data";
import type { DepartmentId, OperatorActivityEvent } from "./types";

function pushEvent(
  events: OperatorActivityEvent[],
  input: Omit<OperatorActivityEvent, "departmentLabel"> & { departmentId: DepartmentId },
): void {
  const dept = getDepartment(input.departmentId);
  events.push({ ...input, departmentLabel: dept.label });
}

function dedupeKey(e: OperatorActivityEvent): string {
  return `${e.timestamp}|${e.departmentId}|${e.eventType}|${e.summary}|${e.relatedIds.id ?? ""}`;
}

export function buildActivityFeed(raw: RawEngineData, limit = 100): OperatorActivityEvent[] {
  const events: OperatorActivityEvent[] = [];

  if (raw.opportunity) {
    pushEvent(events, {
      id: `opp-${raw.opportunity.id}`,
      timestamp: rowTimestamp(raw.opportunity) ?? new Date().toISOString(),
      departmentId: "opportunity_lab",
      engine: "opportunity_discovery",
      eventType: "opportunity_record",
      summary: `Opportunity ${String(raw.opportunity.name ?? raw.opportunity.summary ?? raw.opportunity.id).slice(0, 80)}`,
      status: rowStatus(raw.opportunity),
      relatedIds: { id: String(raw.opportunity.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const c of raw.opportunityCandidates) {
    pushEvent(events, {
      id: `cand-${c.id}`,
      timestamp: rowTimestamp(c) ?? new Date().toISOString(),
      departmentId: "opportunity_lab",
      engine: "opportunity_scanner",
      eventType: "candidate_created",
      summary: `Opportunity candidate ${String(c.title ?? c.id).slice(0, 60)}`,
      status: rowStatus(c),
      relatedIds: { id: String(c.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const r of raw.researchRuns) {
    pushEvent(events, {
      id: `research-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "research_department",
      engine: "grounded_research",
      eventType: "research_run",
      summary: `Grounded research ${String(r.status ?? "run")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: typeof r.provider === "string" ? r.provider : null,
      model: typeof r.model === "string" ? r.model : null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const r of raw.aiBrainRuns) {
    pushEvent(events, {
      id: `brain-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "research_department",
      engine: "ai_brain",
      eventType: "reasoning_run",
      summary: `AI Brain reasoning ${String(r.status ?? "run")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: typeof r.provider === "string" ? r.provider : null,
      model: typeof r.model === "string" ? r.model : null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const r of raw.monetizationRuns) {
    pushEvent(events, {
      id: `mon-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "strategy_finance",
      engine: "monetization_engine",
      eventType: "monetization_run",
      summary: `Monetization run ${String(r.status ?? "")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const p of raw.monetizationPlans) {
    pushEvent(events, {
      id: `plan-${p.id}`,
      timestamp: rowTimestamp(p) ?? new Date().toISOString(),
      departmentId: "strategy_finance",
      engine: "monetization_engine",
      eventType: "monetization_plan",
      summary: `MonetizationPlan ${String(p.title ?? p.id).slice(0, 60)}`,
      status: rowStatus(p),
      relatedIds: { id: String(p.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const r of raw.ventureSelectionRuns) {
    pushEvent(events, {
      id: `vs-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "strategy_finance",
      engine: "venture_selection",
      eventType: "venture_selection",
      summary: `Venture selection ${String(r.status ?? "")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const r of raw.companyBuilderRuns) {
    pushEvent(events, {
      id: `cb-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "company_operations",
      engine: "company_builder",
      eventType: "company_builder_run",
      summary: `Company builder run ${String(r.status ?? "")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const pkg of raw.organicGrowthPackages.length ? raw.organicGrowthPackages : raw.organicGrowthRuns) {
    pushEvent(events, {
      id: `og-${pkg.id}`,
      timestamp: rowTimestamp(pkg) ?? new Date().toISOString(),
      departmentId: "growth_department",
      engine: "organic_growth",
      eventType: "organic_growth",
      summary: `Organic growth ${String(pkg.status ?? "activity")}`,
      status: rowStatus(pkg),
      relatedIds: { id: String(pkg.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const job of raw.creativeMediaJobs) {
    pushEvent(events, {
      id: `cmj-${job.id}`,
      timestamp: rowTimestamp(job) ?? new Date().toISOString(),
      departmentId: "creative_studio",
      engine: "creative_media",
      eventType: "media_job",
      summary: `Media job ${String(job.media_type ?? job.status ?? "")}`,
      status: rowStatus(job),
      relatedIds: { id: String(job.id ?? null) },
      provider: typeof job.provider === "string" ? job.provider : null,
      model: typeof job.model === "string" ? job.model : null,
      costUsd: typeof job.cost_usd === "number" ? job.cost_usd : null,
      costKnown: typeof job.cost_usd === "number",
    });
  }

  for (const r of raw.pabRuns) {
    const cost = typeof r.cumulative_cost_usd === "number" ? r.cumulative_cost_usd : null;
    pushEvent(events, {
      id: `pab-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "product_lab",
      engine: "product_asset_builder",
      eventType: "pab_run",
      summary: `PAB V2.1 run ${String(r.status ?? "")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: null,
      model: null,
      costUsd: cost,
      costKnown: cost != null,
    });
  }

  for (const cs of raw.pabChangeSets) {
    pushEvent(events, {
      id: `cs-${cs.id}`,
      timestamp: rowTimestamp(cs) ?? new Date().toISOString(),
      departmentId: "product_lab",
      engine: "product_asset_builder",
      eventType: "code_change_set",
      summary: `CodeChangeSet ${String(cs.status ?? "applied")}`,
      status: rowStatus(cs),
      relatedIds: { id: String(cs.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const review of raw.creativeMediaReviews) {
    pushEvent(events, {
      id: `qr-${review.id}`,
      timestamp: rowTimestamp(review) ?? new Date().toISOString(),
      departmentId: "quality_control",
      engine: "quality_control",
      eventType: "quality_review",
      summary: `Quality review ${String(review.outcome ?? review.status ?? "")}`,
      status: rowStatus(review),
      relatedIds: { id: String(review.id ?? null) },
      provider: typeof review.reviewer_provider === "string" ? review.reviewer_provider : null,
      model: typeof review.reviewer_model === "string" ? review.reviewer_model : null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const a of raw.externalActions) {
    pushEvent(events, {
      id: `ext-${a.id}`,
      timestamp: rowTimestamp(a) ?? new Date().toISOString(),
      departmentId: "launch_operations",
      engine: "external_action_gateway",
      eventType: "external_action",
      summary: `External action ${String(a.action_type ?? "")} ${String(a.execution_status ?? "")}`,
      status: rowStatus(a),
      relatedIds: { id: String(a.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const r of raw.performanceRuns) {
    pushEvent(events, {
      id: `pi-${r.id}`,
      timestamp: rowTimestamp(r) ?? new Date().toISOString(),
      departmentId: "intelligence_center",
      engine: "performance_intelligence",
      eventType: "performance_run",
      summary: `Performance intelligence ${String(r.status ?? "")}`,
      status: rowStatus(r),
      relatedIds: { id: String(r.id ?? null) },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  for (const d of raw.performanceDecisions) {
    const payload = d.decision_payload as Record<string, unknown> | null;
    pushEvent(events, {
      id: `ld-${d.id}`,
      timestamp: rowTimestamp(d) ?? new Date().toISOString(),
      departmentId: "executive_office",
      engine: "executive_decision",
      eventType: "learning_decision",
      summary: `LearningDecision: ${String(d.decision_type ?? payload?.decisionType ?? "decision")}`,
      status: String(d.status ?? payload?.status ?? null),
      relatedIds: {
        id: String(d.decision_id ?? d.id ?? null),
        missionId: d.mission_id ? String(d.mission_id) : null,
      },
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
    });
  }

  const seen = new Set<string>();
  return events
    .filter((e) => {
      const key = dedupeKey(e);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
