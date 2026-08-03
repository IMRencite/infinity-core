import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { HQ_ROUTES, OPPORTUNITY_PIPELINE_STAGES } from "./constants";
import { ageFromIso } from "./formatters";
import type { HqPipelineStage } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

const STAGE_LABELS: Record<(typeof OPPORTUNITY_PIPELINE_STAGES)[number], string> = {
  discovered: "Discovered",
  evaluating: "Evaluating",
  validating: "Validating",
  reasoning: "Reasoning",
  executive_review: "Executive Review",
  planning_eligible: "Planning Eligible",
  blueprint_created: "Blueprint Created",
};

export async function loadOpportunityPipeline(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<HqPipelineStage[]> {
  const { data: opportunities, error: oppError } = await supabase
    .from("opportunities")
    .select("id, status, decision, discovered_at, updated_at")
    .eq("organization_id", organizationId);

  if (oppError) {
    return OPPORTUNITY_PIPELINE_STAGES.map((id) => ({
      id,
      label: STAGE_LABELS[id],
      count: null,
      blockedCount: null,
      oldestItemAge: null,
      latestItemAt: null,
      href: HQ_ROUTES.opportunities,
    }));
  }

  const oppIds = (opportunities ?? []).map((o) => o.id);

  const [{ data: validations }, { data: sessions }, { data: executives }, { data: blueprints }] =
    await Promise.all([
      oppIds.length
        ? supabase
            .from("validation_runs")
            .select("opportunity_id, run_status, recommendation, created_at")
            .eq("organization_id", organizationId)
        : Promise.resolve({ data: [] as { opportunity_id: string; run_status: string; recommendation: string; created_at: string }[] }),
      oppIds.length
        ? supabase
            .from("reasoning_sessions")
            .select("opportunity_id, status, created_at")
            .eq("organization_id", organizationId)
        : Promise.resolve({ data: [] as { opportunity_id: string | null; status: string; created_at: string }[] }),
      oppIds.length
        ? supabase
            .from("executive_decisions")
            .select("opportunity_id, decision, planning_eligible, created_at")
            .eq("organization_id", organizationId)
        : Promise.resolve({ data: [] as { opportunity_id: string; decision: string; planning_eligible: boolean | null; created_at: string }[] }),
      supabase
        .from("venture_blueprints")
        .select("opportunity_id, created_at")
        .eq("organization_id", organizationId),
    ]);

  const latestValidation = new Map<string, { run_status: string; recommendation: string; created_at: string }>();
  for (const row of validations ?? []) {
    const prev = latestValidation.get(row.opportunity_id);
    if (!prev || row.created_at > prev.created_at) {
      latestValidation.set(row.opportunity_id, row);
    }
  }

  const buckets: Record<(typeof OPPORTUNITY_PIPELINE_STAGES)[number], string[]> = {
    discovered: [],
    evaluating: [],
    validating: [],
    reasoning: [],
    executive_review: [],
    planning_eligible: [],
    blueprint_created: [],
  };

  const blueprintOpp = new Set((blueprints ?? []).map((b) => b.opportunity_id));

  for (const opp of opportunities ?? []) {
    if (blueprintOpp.has(opp.id)) {
      buckets.blueprint_created.push(opp.id);
      continue;
    }

    const validation = latestValidation.get(opp.id);
    const exec = (executives ?? []).filter((e) => e.opportunity_id === opp.id).sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    )[0];
    const reasoning = (sessions ?? []).filter((s) => s.opportunity_id === opp.id).sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    )[0];

    if (validation?.recommendation === "approved_for_planning" && exec?.planning_eligible) {
      buckets.planning_eligible.push(opp.id);
      continue;
    }

    if (exec && ["queue", "defer", "research", "approve"].includes(exec.decision)) {
      buckets.executive_review.push(opp.id);
      continue;
    }

    if (reasoning && !["completed", "failed"].includes(reasoning.status)) {
      buckets.reasoning.push(opp.id);
      continue;
    }

    if (validation && ["pending", "running"].includes(validation.run_status)) {
      buckets.validating.push(opp.id);
      continue;
    }

    if (opp.status === "researching" || opp.decision === "validate") {
      buckets.evaluating.push(opp.id);
      continue;
    }

    buckets.discovered.push(opp.id);
  }

  return OPPORTUNITY_PIPELINE_STAGES.map((id) => {
    const ids = buckets[id];
    const timestamps = ids
      .map((oid) => opportunities?.find((o) => o.id === oid)?.discovered_at)
      .filter((t): t is string => Boolean(t));
    const latest = timestamps.sort().at(-1) ?? null;
    const oldest = timestamps.sort()[0] ?? null;

    return {
      id,
      label: STAGE_LABELS[id],
      count: ids.length,
      blockedCount: id === "validating" ? null : 0,
      oldestItemAge: ageFromIso(oldest),
      latestItemAt: latest,
      href: HQ_ROUTES.opportunities,
    };
  });
}
