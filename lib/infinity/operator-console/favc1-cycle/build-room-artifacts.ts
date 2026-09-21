import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { mapCompletedResearchRunToResult } from "@/lib/infinity/research/persistence";
import type { DepartmentId, DepartmentUiState } from "../types";
import { sanitizeArtifactMetadata } from "../artifacts/metadata-sanitize";
import { buildArtifactRenderId } from "../artifacts/artifact-identity";
import type { HqArtifactState, HqRoomArtifactMap, HqWorkArtifact } from "../artifacts/types";
import type { Favc1ValidationContext } from "./load-validation-context";
import type { ResolvedFavc1Cycle } from "./types";
import { mapPersistedRunStatusToUi } from "./map-run-status";
import {
  addResearchRunCandidateLinks,
  researchLineageMetadata,
  resolveResearchRunCandidateIds,
} from "../research-lineage";
import { loadCanonicalOpportunityUniverse } from "@/lib/infinity/opportunity-universe-hq/load";
import { buildLiveVentureRadarArtifacts } from "@/lib/infinity/opportunity-universe-hq/radar-artifacts";

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
  structured_result?: unknown;
};

type CandidateRow = {
  id: string;
  title: string | null;
  opportunity_score: number | null;
  created_at: string;
  research_run_ids?: unknown;
};

type MonetizationAnalysisRow = {
  id: string;
  opportunity_candidate_id: string;
  monetization_score: number | null;
  combined_decision_score: number | null;
  created_at: string;
  primary_plan_id: string | null;
  research_run_ids?: unknown;
};

type SelectionEvalRow = {
  id: string;
  opportunity_candidate_id: string;
  decision: string;
  selection_score: number | null;
  portfolio_adjusted_score: number | null;
  fatal_assumption_risk_score: number | null;
  expected_roi: number | null;
  blocking_assumptions: unknown;
  queue_rank: number | null;
  created_at: string;
};

type MonetizationPlanRow = {
  id: string;
  opportunity_candidate_id: string;
  model_type: string | null;
  model_name: string | null;
  monetization_score: number | null;
  estimated_price_base: number | null;
  ltv_cac_ratio: number | null;
  research_run_ids?: unknown;
};

function artifactStateFromRunStatus(status: string, deptState: DepartmentUiState): HqArtifactState {
  const ui = mapPersistedRunStatusToUi(status);
  if (ui === "RUNNING") return "CREATING";
  if (ui === "FAILED") return "FAILED";
  if (deptState === "RUNNING") return "CREATING";
  return "READY";
}

function push(map: HqRoomArtifactMap, roomId: DepartmentId, artifact: HqWorkArtifact): void {
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

export async function buildFavc1RoomArtifacts(
  admin: AdminSupabaseClient,
  cycle: ResolvedFavc1Cycle,
  input: {
    discoveryState: DepartmentUiState;
    monetizationState: DepartmentUiState;
    selectionState: DepartmentUiState;
    validationState: DepartmentUiState;
    validationContext: Favc1ValidationContext;
    allResearch: ResearchRunRow[];
    validationStationActive: boolean;
    validationStationProviderActive: boolean;
  },
): Promise<HqRoomArtifactMap> {
  const map: HqRoomArtifactMap = {};
  const candidateTitleById = new Map<string, string>();
  const runIdToCandidateIds = new Map<string, string[]>();
  const isTerminal = cycle.isTerminal && !cycle.isActive;

  const universe = await loadCanonicalOpportunityUniverse(admin, cycle.organizationId);
  for (const row of universe.real) {
    candidateTitleById.set(row.candidateId, row.name);
  }
  for (const artifact of buildLiveVentureRadarArtifacts({
    organizationId: cycle.organizationId,
    createdAt: cycle.discovery?.completedAt ?? null,
    discoveryState: input.discoveryState,
    universeCount: universe.counts.total,
    liveTop10: universe.liveRanking.top10,
  })) {
    push(map, "opportunity_lab", artifact);
  }

  if (cycle.discoveryRunId) {
    const { data: cycleCandidates } = await admin
      .from("opportunity_candidates")
      .select("id, title, opportunity_score, created_at, research_run_ids")
      .eq("discovery_run_id", cycle.discoveryRunId)
      .order("opportunity_score", { ascending: false, nullsFirst: false });
    (cycleCandidates as CandidateRow[] | null)?.forEach((row) => {
      candidateTitleById.set(row.id, row.title ?? "Untitled opportunity");
      addResearchRunCandidateLinks(runIdToCandidateIds, row.research_run_ids, row.id);
    });
  }

  if (cycle.monetizationRunId) {
    const { data: analysisLinks } = await admin
      .from("monetization_candidate_analyses")
      .select("opportunity_candidate_id, research_run_ids")
      .eq("monetization_run_id", cycle.monetizationRunId);
    for (const row of (analysisLinks as Array<{
      opportunity_candidate_id: string;
      research_run_ids?: unknown;
    }> | null) ?? []) {
      addResearchRunCandidateLinks(runIdToCandidateIds, row.research_run_ids, row.opportunity_candidate_id);
    }
    const { data: planLinks } = await admin
      .from("monetization_plans")
      .select("opportunity_candidate_id, research_run_ids")
      .eq("monetization_run_id", cycle.monetizationRunId);
    for (const row of (planLinks as Array<{
      opportunity_candidate_id: string;
      research_run_ids?: unknown;
    }> | null) ?? []) {
      addResearchRunCandidateLinks(runIdToCandidateIds, row.research_run_ids, row.opportunity_candidate_id);
    }
  }

  for (const run of input.allResearch) {
    const isValidationRun = run.idempotency_key.includes("favc1-validation-acquisition");
    const roomId: DepartmentId = isValidationRun ? "quality_control" : "research_department";
    const deptState = isValidationRun ? input.validationState : input.discoveryState;

    let sourceCount = 0;
    let grounded = false;
    let structuredResult: unknown = run.structured_result;
    if (run.status?.toLowerCase() === "completed" && run.structured_result) {
      try {
        const result = mapCompletedResearchRunToResult(run as Parameters<typeof mapCompletedResearchRunToResult>[0]);
        sourceCount = result.sources?.length ?? 0;
        grounded = (result.evidence?.length ?? 0) > 0 && sourceCount > 0;
        structuredResult = result;
      } catch {
        // omit counts when structured result unavailable
      }
    }

    const strategy = isValidationRun
      ? "validation acquisition"
      : run.idempotency_key.includes(":monetization:")
        ? "monetization research"
        : "discovery research";

    const candidateIds = resolveResearchRunCandidateIds({
      researchRunId: run.id,
      structuredResult,
      runIdToCandidateIds,
      validationCandidateId: input.validationContext.selectedValidationCandidateId,
      isValidationRun,
    });
    const lineage = researchLineageMetadata(candidateIds);
    const uniqueCandidateId = candidateIds.length === 1 ? candidateIds[0] : undefined;

    push(map, roomId, {
      id: `research:${run.id}`,
      roomId,
      artifactType: "research_packet",
      title: isValidationRun ? "Validation evidence packet" : "Research evidence packet",
      subtitle: `${run.provider}${sourceCount > 0 ? ` · ${sourceCount} sources` : ""}`,
      state: artifactStateFromRunStatus(run.status, deptState),
      createdAt: run.completed_at ?? run.created_at,
      sourceRecordType: "research_run",
      sourceRecordId: run.id,
      lineageId: uniqueCandidateId ?? null,
      lineageType: uniqueCandidateId ? "candidate" : null,
      metadata: sanitizeArtifactMetadata({
        provider: run.provider,
        strategy,
        sourceCount,
        grounded,
        researchRunId: run.id,
        synthesisOnly: isValidationRun ? false : undefined,
        ...lineage,
      }),
    });

    if (sourceCount > 0 && roomId === "research_department") {
      push(map, roomId, {
        id: `sources:${run.id}`,
        roomId,
        artifactType: "source_cluster",
        title: `${sourceCount} grounded sources`,
        subtitle: run.provider,
        state: artifactStateFromRunStatus(run.status, deptState),
        createdAt: run.completed_at ?? run.created_at,
        sourceRecordType: "research_run",
        sourceRecordId: run.id,
        lineageId: uniqueCandidateId ?? null,
        lineageType: uniqueCandidateId ? "candidate" : null,
        metadata: sanitizeArtifactMetadata({
          sourceCount,
          grounded: true,
          researchRunId: run.id,
          ...lineage,
        }),
      });
    }
  }

  if (cycle.monetizationRunId) {
    const { data: analyses } = await admin
      .from("monetization_candidate_analyses")
      .select("id, opportunity_candidate_id, monetization_score, combined_decision_score, created_at, primary_plan_id")
      .eq("monetization_run_id", cycle.monetizationRunId)
      .order("monetization_score", { ascending: false, nullsFirst: false });

    const candidateIds = (analyses as MonetizationAnalysisRow[] | null)?.map((a) => a.opportunity_candidate_id) ?? [];
    const planByCandidate = new Map<string, MonetizationPlanRow>();

    if (candidateIds.length > 0) {
      const { data: plans } = await admin
        .from("monetization_plans")
        .select("id, opportunity_candidate_id, model_type, model_name, monetization_score, estimated_price_base, ltv_cac_ratio")
        .eq("monetization_run_id", cycle.monetizationRunId)
        .in("opportunity_candidate_id", candidateIds);

      for (const plan of (plans as MonetizationPlanRow[] | null) ?? []) {
        planByCandidate.set(plan.opportunity_candidate_id, plan);
      }
    }

    for (const analysis of (analyses as MonetizationAnalysisRow[] | null) ?? []) {
      const plan = planByCandidate.get(analysis.opportunity_candidate_id);
      const candidateTitle = candidateTitleById.get(analysis.opportunity_candidate_id);
      const title = plan?.model_name ?? candidateTitle ?? "Monetization analysis";
      const priceSubtitle =
        plan?.estimated_price_base != null
          ? `$${Number(plan.estimated_price_base).toFixed(0)}/mo`
          : plan?.model_type ?? "revenue model";
      push(map, "strategy_finance", {
        id: `mon:${analysis.id}`,
        roomId: "strategy_finance",
        artifactType: "monetization_plan",
        title: plan?.model_type ?? title,
        subtitle: priceSubtitle,
        state: input.monetizationState === "RUNNING" ? "CREATING" : "READY",
        createdAt: analysis.created_at,
        sourceRecordType: "monetization_candidate_analysis",
        sourceRecordId: analysis.id,
        metadata: sanitizeArtifactMetadata({
          modelType: plan?.model_type,
          monetizationScore: analysis.monetization_score ?? plan?.monetization_score,
          ltvCacRatio: plan?.ltv_cac_ratio,
          expectedRoi: null,
          candidateId: analysis.opportunity_candidate_id,
        }),
      });

      if (plan?.estimated_price_base != null || plan?.ltv_cac_ratio != null) {
        push(map, "strategy_finance", {
          id: `econ:${plan.id}`,
          roomId: "strategy_finance",
          artifactType: "unit_economics",
          title: "Unit economics",
          subtitle:
            plan.estimated_price_base != null
              ? `$${Number(plan.estimated_price_base).toFixed(0)}/mo`
              : plan.ltv_cac_ratio != null
                ? `LTV:CAC ${Number(plan.ltv_cac_ratio).toFixed(2)}`
                : null,
          state: input.monetizationState === "RUNNING" ? "CREATING" : "READY",
          createdAt: analysis.created_at,
          sourceRecordType: "monetization_plan",
          sourceRecordId: plan.id,
          metadata: sanitizeArtifactMetadata({
            expectedRoi: null,
            ltvCacRatio: plan.ltv_cac_ratio,
            monetizationScore: plan.monetization_score,
            candidateId: analysis.opportunity_candidate_id,
          }),
        });
      }
    }
  }

  if (cycle.selectionRunId) {
    const { data: evaluations } = await admin
      .from("candidate_selection_evaluations")
      .select(
        "id, opportunity_candidate_id, decision, selection_score, portfolio_adjusted_score, fatal_assumption_risk_score, expected_roi, blocking_assumptions, queue_rank, created_at",
      )
      .eq("venture_selection_run_id", cycle.selectionRunId)
      .order("queue_rank", { ascending: true, nullsFirst: false });

    const selectedId =
      input.validationContext.selectedValidationCandidateId ??
      (evaluations as SelectionEvalRow[] | null)?.find((row) => row.decision === "VALIDATE")?.opportunity_candidate_id ??
      null;

    for (const evaluation of (evaluations as SelectionEvalRow[] | null) ?? []) {
      const isSelected = evaluation.opportunity_candidate_id === selectedId;
      const decision = evaluation.decision;
      let artifactState: HqArtifactState = input.selectionState === "RUNNING" ? "CREATING" : "READY";
      if (decision === "REJECT") artifactState = "REJECTED";
      if (isSelected && decision === "VALIDATE") artifactState = "SELECTED";

      push(map, "company_operations", {
        id: buildArtifactRenderId({
          artifactType: "selection_blueprint",
          sourceRecordType: "candidate_selection_evaluation",
          sourceRecordId: evaluation.id,
          artifactRole: "blueprint",
        }),
        roomId: "company_operations",
        artifactType: "selection_blueprint",
        title: candidateTitleById.get(evaluation.opportunity_candidate_id) ?? `Candidate ${evaluation.queue_rank ?? "—"}`,
        subtitle: `${decision} · score ${Number(evaluation.selection_score ?? 0).toFixed(1)}`,
        state: artifactState,
        createdAt: evaluation.created_at,
        sourceRecordType: "candidate_selection_evaluation",
        sourceRecordId: evaluation.id,
        metadata: sanitizeArtifactMetadata({
          decision,
          score: evaluation.selection_score,
          rank: evaluation.queue_rank,
          candidateId: evaluation.opportunity_candidate_id,
          selected: isSelected,
          highlighted: isSelected,
          fatalRiskBefore: evaluation.fatal_assumption_risk_score,
          expectedRoi: evaluation.expected_roi,
          artifactRole: "blueprint",
        }),
      });

      push(map, "company_operations", {
        id: buildArtifactRenderId({
          artifactType: "decision",
          sourceRecordType: "candidate_selection_evaluation",
          sourceRecordId: evaluation.id,
          artifactRole: "selection",
        }),
        roomId: "company_operations",
        artifactType: "decision",
        title: decision,
        subtitle: isSelected ? "Selected for validation" : null,
        state: artifactState,
        createdAt: evaluation.created_at,
        sourceRecordType: "candidate_selection_evaluation",
        sourceRecordId: evaluation.id,
        metadata: sanitizeArtifactMetadata({
          decision,
          selected: isSelected,
          candidateId: evaluation.opportunity_candidate_id,
          artifactRole: "selection",
        }),
      });

      const blocking = Array.isArray(evaluation.blocking_assumptions)
        ? (evaluation.blocking_assumptions as string[])
        : [];
      for (const [idx, assumption] of blocking.entries()) {
        push(map, "quality_control", {
          id: `assume:${evaluation.id}:${idx}`,
          roomId: "quality_control",
          artifactType: "assumption",
          title: assumption,
          subtitle: "Blocking assumption",
          state: isSelected ? "SELECTED" : "READY",
          createdAt: evaluation.created_at,
          sourceRecordType: "candidate_selection_evaluation",
          sourceRecordId: evaluation.id,
          metadata: sanitizeArtifactMetadata({
            candidateId: evaluation.opportunity_candidate_id,
            fatalRiskBefore: evaluation.fatal_assumption_risk_score,
            selected: isSelected,
          }),
        });
      }
    }
  }

  if (input.validationContext.acquisitionResearchRunId) {
    const selectedCandidateId = input.validationContext.selectedValidationCandidateId;
    const acquisitionRun = input.allResearch.find(
      (run) => run.id === input.validationContext.acquisitionResearchRunId,
    );
    if (acquisitionRun?.structured_result) {
      try {
        const result = mapCompletedResearchRunToResult(
          acquisitionRun as Parameters<typeof mapCompletedResearchRunToResult>[0],
        );
        const uniqueSources = new Set(result.sources?.map((s) => s.sourceId || s.url) ?? []);
        push(map, "quality_control", {
          id: `val-evidence:${acquisitionRun.id}`,
          roomId: "quality_control",
          artifactType: "validation_evidence",
          title: "Provider acquisition evidence",
          subtitle: `DIRECT/SUPPORTED · ${uniqueSources.size} sources`,
          state: input.validationStationProviderActive ? "CREATING" : "READY",
          createdAt: acquisitionRun.completed_at ?? acquisitionRun.created_at,
          sourceRecordType: "research_run",
          sourceRecordId: acquisitionRun.id,
          metadata: sanitizeArtifactMetadata({
            relevance: "DIRECT",
            validationResult: "SUPPORTED",
            newSourceCount: uniqueSources.size,
            provider: acquisitionRun.provider,
            researchRunId: acquisitionRun.id,
            synthesisOnly: false,
            candidateId: selectedCandidateId ?? undefined,
            selected: Boolean(selectedCandidateId),
          }),
        });
      } catch {
        // skip when structured result invalid
      }
    }
  }

  if (input.validationStationActive && input.validationContext.synthesisOnly) {
    push(map, "quality_control", {
      id: `val-synth:${cycle.cycleKey}`,
      roomId: "quality_control",
      artifactType: "validation_experiment",
      title: "Evidence synthesis",
      subtitle: "Reviewing existing evidence",
      state: "CREATING",
      createdAt: null,
      sourceRecordType: "bounded_validation",
      sourceRecordId: cycle.cycleKey,
      metadata: sanitizeArtifactMetadata({ synthesisOnly: true, provider: "internal" }),
    });
  } else if (isTerminal && input.validationContext.validationOutcome) {
    push(map, "quality_control", {
      id: `val-synth:${cycle.cycleKey}`,
      roomId: "quality_control",
      artifactType: "validation_experiment",
      title: "Bounded validation round",
      subtitle: input.validationContext.synthesisOnly ? "Synthesis only" : "Synthesis + acquisition",
      state: "READY",
      createdAt: cycle.selection?.completedAt ?? null,
      sourceRecordType: "bounded_validation",
      sourceRecordId: cycle.cycleKey,
      metadata: sanitizeArtifactMetadata({
        synthesisOnly: input.validationContext.synthesisOnly,
        validationResult: input.validationContext.validationOutcome,
        candidateId: input.validationContext.selectedValidationCandidateId ?? undefined,
        selected: Boolean(input.validationContext.selectedValidationCandidateId),
      }),
    });
  }

  if (input.validationContext.validationOutcome) {
    push(map, "quality_control", {
      id: `val-decision:${cycle.cycleKey}`,
      roomId: "quality_control",
      artifactType: "decision",
      title: input.validationContext.validationOutcome,
      subtitle: "Post-validation decision",
      state: "READY",
      createdAt: cycle.selection?.completedAt ?? null,
      sourceRecordType: "bounded_validation",
      sourceRecordId: cycle.cycleKey,
      metadata: sanitizeArtifactMetadata({
        decision: input.validationContext.validationOutcome,
        candidateId: input.validationContext.selectedValidationCandidateId ?? undefined,
        selected: Boolean(input.validationContext.selectedValidationCandidateId),
      }),
    });

    push(map, "executive_office", {
      id: `cmd-decision:${cycle.cycleKey}`,
      roomId: "executive_office",
      artifactType: "decision",
      title: input.validationContext.validationOutcome,
      subtitle: "Validation outcome",
      state: "READY",
      createdAt: cycle.selection?.completedAt ?? null,
      sourceRecordType: "bounded_validation",
      sourceRecordId: cycle.cycleKey,
      metadata: sanitizeArtifactMetadata({
        decision: input.validationContext.validationOutcome,
        candidateId: input.validationContext.selectedValidationCandidateId ?? undefined,
        selected: Boolean(input.validationContext.selectedValidationCandidateId),
      }),
    });
  }

  if (cycle.candidateCount && cycle.candidateCount > 0) {
    push(map, "executive_office", {
      id: `cmd-candidates:${cycle.cycleKey}`,
      roomId: "executive_office",
      artifactType: "mission",
      title: `${cycle.candidateCount} candidates`,
      subtitle: "Discovery summary",
      state: input.discoveryState === "COMPLETE" ? "READY" : "CREATING",
      createdAt: cycle.discovery?.completedAt ?? null,
      sourceRecordType: "opportunity_discovery_run",
      sourceRecordId: cycle.discoveryRunId ?? cycle.cycleKey,
      metadata: sanitizeArtifactMetadata({ score: cycle.candidateCount }),
    });
  }

  if (cycle.monetizedCandidateCount && cycle.monetizedCandidateCount > 0) {
    push(map, "executive_office", {
      id: `cmd-monetized:${cycle.cycleKey}`,
      roomId: "executive_office",
      artifactType: "mission",
      title: `${cycle.monetizedCandidateCount} monetized`,
      subtitle: "Profit Lab summary",
      state: input.monetizationState === "COMPLETE" ? "READY" : "CREATING",
      createdAt: cycle.monetization?.completedAt ?? null,
      sourceRecordType: "monetization_run",
      sourceRecordId: cycle.monetizationRunId ?? cycle.cycleKey,
      metadata: sanitizeArtifactMetadata({ score: cycle.monetizedCandidateCount }),
    });
  }

  if (isTerminal && cycle.selectionRunId && input.validationContext.selectedValidationCandidateId) {
    const selectedId = input.validationContext.selectedValidationCandidateId;
    const { data: selectedEval } = await admin
      .from("candidate_selection_evaluations")
      .select("*")
      .eq("venture_selection_run_id", cycle.selectionRunId)
      .eq("opportunity_candidate_id", selectedId)
      .maybeSingle();

    const preFatal = selectedEval?.fatal_assumption_risk_score;
    const valDecision = map.quality_control?.find((a) => a.id === `val-decision:${cycle.cycleKey}`);

    if (valDecision && preFatal != null && input.validationContext.acquisitionResearchRunId) {
      try {
        const { loadCandidateBundlesForSelection } = await import(
          "@/lib/infinity/venture-selection/load/load-candidates"
        );
        const { buildPersistedEvaluationDraft } = await import(
          "@/lib/infinity/venture-selection/replay/replay-from-persisted"
        );
        const { rescoreAfterValidation } = await import(
          "@/lib/infinity/first-autonomous-venture-cycle/bounded-validation/rescore"
        );
        const { executeAllowedValidationExperiments } = await import(
          "@/lib/infinity/first-autonomous-venture-cycle/bounded-validation/experiments"
        );
        const { buildAssumptionRegister } = await import(
          "@/lib/infinity/venture-selection/assumptions/register"
        );

        const bundle = (
          await loadCandidateBundlesForSelection(admin, cycle.organizationId, {
            candidateIds: [selectedId],
            monetizationRunId: cycle.monetizationRunId ?? undefined,
          })
        )[0];

        if (bundle && selectedEval) {
          const preEval = buildPersistedEvaluationDraft({
            candidateId: selectedId,
            title: bundle.title,
            oldDecision: selectedEval.decision as "VALIDATE" | "BUILD" | "HOLD" | "REJECT",
            selectionScore: Number(selectedEval.selection_score ?? 0),
            portfolioAdjustedScore: Number(selectedEval.portfolio_adjusted_score ?? 0),
            monetizationScore: Number(selectedEval.monetization_score ?? 0),
            validationScore: Number(selectedEval.validation_score ?? 0),
            buildabilityScore: Number(selectedEval.buildability_score ?? 0),
            confidence: Number(selectedEval.confidence ?? 0),
            fatalAssumptionRiskScore: Number(selectedEval.fatal_assumption_risk_score ?? 0),
            expectedRoi: Number(selectedEval.expected_roi ?? 0),
            blockingAssumptions: Array.isArray(selectedEval.blocking_assumptions)
              ? (selectedEval.blocking_assumptions as string[])
              : [],
            primaryPlan: {
              estimatedCapitalRequired: bundle.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
              platformDependencyRisk: bundle.monetization?.primaryPlan?.platformDependencyRisk ?? null,
              regulatoryRisk: bundle.monetization?.primaryPlan?.regulatoryRisk ?? null,
              ltvCacRatio: bundle.monetization?.primaryPlan?.ltvCacRatio ?? null,
            },
          });
          preEval.candidate = bundle;

          const assumptions = buildAssumptionRegister(bundle);
          const synthesis = executeAllowedValidationExperiments({
            candidate: bundle,
            assumptions,
            maxExperiments: 2,
            providerCalls: 0,
          });

          const acquisitionArtifact = map.quality_control?.find((a) =>
            a.id.startsWith("val-evidence:"),
          );
          const validationEvidence = [...synthesis.validationEvidence];
          if (acquisitionArtifact) {
            validationEvidence.push({
              assumptionCategory: "acquisition",
              assumptionId: "provider-acquisition",
              claim: acquisitionArtifact.title,
              sourceUrls: [],
              newSourceUrls: [],
              grounded: true,
              confidenceImpact: 0.05,
              assumptionImpact: 0.05,
              uncertaintyReduction: 0.05,
              experimentType: "comparable_benchmark_research",
              relevanceClass: "DIRECT",
              validationResult: "SUPPORTED",
              newEvidenceFound: true,
              newSourceCount: Number(acquisitionArtifact.metadata.newSourceCount ?? 0),
              reusedSourceCount: 0,
            });
          }

          const postEval = rescoreAfterValidation({ preValidationEvaluation: preEval, validationEvidence });
          valDecision.metadata = sanitizeArtifactMetadata({
            ...valDecision.metadata,
            fatalRiskBefore: Number(preFatal),
            fatalRiskAfter: postEval.fatalAssumptionRiskScore,
          });
        }
      } catch {
        // omit post fatal when replay unavailable
      }
    }
  }

  return map;
}
