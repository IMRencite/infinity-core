import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { mapCompletedResearchRunToResult } from "@/lib/infinity/research/persistence";
import type { HqWorkArtifact } from "./types";
import type { ArtifactDetailPayload } from "./build-inspector-model";
import { loadExtendedArtifactDetail } from "./load-extended-artifact-detail";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.slice(0, 240);
      if (item && typeof item === "object" && "summary" in item) return String((item as { summary: unknown }).summary).slice(0, 240);
      if (item && typeof item === "object" && "claim" in item) return String((item as { claim: unknown }).claim).slice(0, 240);
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

export async function loadArtifactDetailPayload(
  admin: AdminSupabaseClient,
  organizationId: string,
  artifact: HqWorkArtifact,
): Promise<ArtifactDetailPayload> {
  const payload: ArtifactDetailPayload = {};

  if (artifact.artifactType === "opportunity_candidate") {
    const { data } = await admin
      .from("opportunity_candidates")
      .select("*")
      .eq("id", artifact.sourceRecordId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (data) {
      payload.candidate = {
        title: data.title,
        summary: data.summary ?? null,
        targetCustomer: data.target_customer,
        problem: data.problem,
        market: data.market,
        opportunityScore: data.opportunity_score,
        discoveryStrategies: asStringArray(data.discovery_strategies),
        demandEvidence: asStringArray(data.demand_evidence),
        marketEvidence: asStringArray(data.market_evidence),
        monetizationEvidence: asStringArray(data.monetization_evidence),
        competitionEvidence: asStringArray(data.competition_evidence),
        risks: asStringArray(data.risks),
        unknowns: asStringArray(data.unknowns),
      };
    }

    const candidateId = artifact.sourceRecordId;
    const { data: selection } = await admin
      .from("candidate_selection_evaluations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_candidate_id", candidateId)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selection) {
      payload.selection = mapSelectionRow(selection);
    }
  }

  const candidateId =
    artifact.artifactType === "opportunity_candidate"
      ? artifact.sourceRecordId
      : typeof artifact.metadata.candidateId === "string"
        ? artifact.metadata.candidateId
        : null;

  if (
    candidateId &&
    ["monetization_plan", "unit_economics", "selection_blueprint", "decision", "assumption"].includes(
      artifact.artifactType,
    )
  ) {
    if (!payload.selection && artifact.sourceRecordType === "candidate_selection_evaluation") {
      const { data: selection } = await admin
        .from("candidate_selection_evaluations")
        .select("*")
        .eq("id", artifact.sourceRecordId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (selection) payload.selection = mapSelectionRow(selection);
    } else if (!payload.selection) {
      const { data: selection } = await admin
        .from("candidate_selection_evaluations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("opportunity_candidate_id", candidateId)
        .order("evaluated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selection) payload.selection = mapSelectionRow(selection);
    }

    if (["monetization_plan", "unit_economics"].includes(artifact.artifactType)) {
      const { data: plan } = await admin
        .from("monetization_plans")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", artifact.sourceRecordType === "monetization_plan" ? artifact.sourceRecordId : artifact.sourceRecordId)
        .maybeSingle();

      if (plan) {
        payload.monetization = {
          modelType: plan.model_type,
          modelName: plan.model_name,
          price: plan.estimated_price_base != null ? `$${Number(plan.estimated_price_base).toFixed(0)}/mo` : null,
          monetizationScore: plan.monetization_score,
          ltvCacRatio: plan.ltv_cac_ratio,
          expectedRoi: null,
          rationale: typeof plan.metadata === "object" && plan.metadata && "rationale" in plan.metadata
            ? String((plan.metadata as { rationale: unknown }).rationale).slice(0, 500)
            : null,
        };
      }
    }
  }

  if (artifact.artifactType === "research_packet" || artifact.artifactType === "source_cluster") {
    const runId = String(artifact.metadata.researchRunId ?? artifact.sourceRecordId);
    const { data: run } = await admin
      .from("research_runs")
      .select("*")
      .eq("id", runId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (run) {
      let sourceCount = Number(artifact.metadata.sourceCount ?? 0);
      let grounded = Boolean(artifact.metadata.grounded);
      let summary: string | null = run.research_objective ?? null;
      let keyFindings: string[] = [];
      let sourceLabels: string[] = [];

      if (run.status?.toLowerCase() === "completed" && run.structured_result) {
        try {
          const result = mapCompletedResearchRunToResult(run as Parameters<typeof mapCompletedResearchRunToResult>[0]);
          sourceCount = result.sources?.length ?? sourceCount;
          grounded = (result.evidence?.length ?? 0) > 0 && sourceCount > 0;
          summary = result.summary ?? summary;
          keyFindings = (result.evidence ?? []).slice(0, 6).map((e) => e.claim?.slice(0, 200) ?? "").filter(Boolean);
          sourceLabels = (result.sources ?? []).slice(0, 8).map((s) => s.title ?? s.url ?? s.sourceId ?? "source").filter(Boolean);
        } catch {
          // keep artifact-level counts
        }
      }

      payload.research = {
        objective: run.research_objective,
        provider: run.provider,
        model: run.model,
        strategy: String(artifact.metadata.strategy ?? ""),
        grounded,
        sourceCount,
        summary,
        keyFindings,
        sourceLabels,
      };
    }
  }

  return loadExtendedArtifactDetail(admin, organizationId, artifact, payload);
}

function mapSelectionRow(row: Record<string, unknown>): NonNullable<ArtifactDetailPayload["selection"]> {
  return {
    decision: String(row.decision ?? ""),
    selectionScore: num(row.selection_score),
    monetizationScore: num(row.monetization_score),
    validationScore: num(row.validation_score),
    buildabilityScore: num(row.buildability_score),
    confidence: num(row.confidence),
    fatalAssumptionRisk: num(row.fatal_assumption_risk_score),
    expectedRoi: num(row.expected_roi),
    ltvCacRatio: null,
    estimatedCapitalRequired: num(row.estimated_capital_required),
    platformDependencyRisk: null,
    regulatoryRisk: null,
    blockingAssumptions: asStringArray(row.blocking_assumptions),
    queueReason: row.queue_reason != null ? String(row.queue_reason) : null,
    recommendedNextAction: row.recommended_next_action != null ? String(row.recommended_next_action) : null,
  };
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
