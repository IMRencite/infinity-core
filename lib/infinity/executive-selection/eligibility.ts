import { createHash } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { EXECUTIVE_SELECTION_PROFILE_KEY } from "./constants";
import type { EligibleOpportunityRow } from "./types";

export type EligibilityResult = {
  eligible: EligibleOpportunityRow[];
  excluded: Array<{ opportunityId: string; reason: string }>;
};

const DEV_STUB_PREFIX = "dev_stub_";

export function allowDevelopmentStubOpportunities(): boolean {
  return process.env.ALLOW_EXECUTIVE_DEV_STUB_OPPORTUNITIES === "true";
}

export async function loadEligibleOpportunitiesForMission(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<EligibilityResult> {
  const { data: validationRuns } = await admin
    .from("validation_runs")
    .select("id, opportunity_id, run_status, recommendation, summary")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("run_status", "completed");

  const validationByOpp = new Map(
    (validationRuns ?? []).map((v) => [v.opportunity_id, v]),
  );

  const missionOpportunityIds = [...validationByOpp.keys()];
  if (missionOpportunityIds.length === 0) {
    return { eligible: [], excluded: [] };
  }

  const { data: opportunities, error } = await admin
    .from("opportunities")
    .select(
      "id, name, status, decision, confidence_score, overall_score, estimated_startup_cost_min, estimated_startup_cost_max, assumptions, risks",
    )
    .eq("organization_id", organizationId)
    .in("id", missionOpportunityIds)
    .in("status", ["discovered", "scored", "validating", "recommended", "approved"]);

  if (error) {
    throw new Error(`Failed to load opportunities: ${error.message}`);
  }

  const { data: priorRejections } = await admin
    .from("executive_selection_decisions")
    .select("opportunity_id, decision, status")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("decision", "reject")
    .eq("status", "finalized");

  const finallyRejected = new Set(
    (priorRejections ?? []).map((r) => r.opportunity_id).filter(Boolean) as string[],
  );

  const { data: activePlanning } = await admin
    .from("executive_selection_decisions")
    .select("opportunity_id")
    .eq("organization_id", organizationId)
    .eq("decision", "select_for_planning")
    .eq("planning_eligible", true)
    .eq("status", "finalized");

  const activeSelected = new Set(
    (activePlanning ?? []).map((r) => r.opportunity_id).filter(Boolean) as string[],
  );

  const eligible: EligibleOpportunityRow[] = [];
  const excluded: Array<{ opportunityId: string; reason: string }> = [];

  for (const row of opportunities ?? []) {
    const opp: EligibleOpportunityRow = {
      ...row,
      assumptions: (row.assumptions ?? {}) as Record<string, unknown>,
      risks: (row.risks ?? []) as unknown[],
    };

    if (opp.status !== "approved" && opp.status !== "recommended" && opp.status !== "scored") {
      excluded.push({ opportunityId: opp.id, reason: "opportunity_not_active_or_evaluated" });
      continue;
    }

    if (opp.decision === "rejected") {
      excluded.push({ opportunityId: opp.id, reason: "opportunity_finally_rejected" });
      continue;
    }

    if (finallyRejected.has(opp.id)) {
      excluded.push({ opportunityId: opp.id, reason: "executive_selection_rejected" });
      continue;
    }

    const validation = validationByOpp.get(opp.id);
    if (!validation) {
      excluded.push({ opportunityId: opp.id, reason: "validation_not_completed_for_mission" });
      continue;
    }

    if (validation.recommendation !== "approved_for_planning") {
      excluded.push({ opportunityId: opp.id, reason: "validation_not_approved_for_planning" });
      continue;
    }

    const blockers = validation.summary as { critical?: unknown[] } | null;
    if (Array.isArray(blockers?.critical) && blockers.critical.length > 0) {
      excluded.push({ opportunityId: opp.id, reason: "unresolved_critical_blocker" });
      continue;
    }

    const slugHint = opp.name.toLowerCase().replace(/\s+/g, "_");
    if (slugHint.startsWith(DEV_STUB_PREFIX) && !allowDevelopmentStubOpportunities()) {
      excluded.push({ opportunityId: opp.id, reason: "development_stub_not_allowed" });
      continue;
    }

    if (activeSelected.has(opp.id)) {
      excluded.push({ opportunityId: opp.id, reason: "already_selected_active_planning" });
      continue;
    }

    const { count: evalCount } = await admin
      .from("opportunity_evaluations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opp.id)
      .eq("evaluation_status", "completed");

    if ((evalCount ?? 0) === 0) {
      excluded.push({ opportunityId: opp.id, reason: "evaluation_not_complete" });
      continue;
    }

    const { count: evidenceCount } = await admin
      .from("opportunity_evidence")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opp.id);

    if ((evidenceCount ?? 0) === 0) {
      excluded.push({ opportunityId: opp.id, reason: "required_evidence_missing" });
      continue;
    }

    eligible.push(opp);
  }

  return { eligible, excluded };
}

export function hashEligibleSet(input: {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  opportunityIds: string[];
  validationRunIds: string[];
  scoringModelVersion: string;
  policyVersion: string;
}): string {
  const payload = JSON.stringify({
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    opportunityIds: [...input.opportunityIds].sort(),
    validationRunIds: [...input.validationRunIds].sort(),
    scoringModelVersion: input.scoringModelVersion,
    policyVersion: input.policyVersion,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function readExecutiveProfile(opp: EligibleOpportunityRow): string | null {
  const assumptions = opp.assumptions ?? {};
  const fromAssumptions = assumptions[EXECUTIVE_SELECTION_PROFILE_KEY];
  if (typeof fromAssumptions === "string") return fromAssumptions;
  const meta = opp.metadata ?? {};
  const fromMeta = meta[EXECUTIVE_SELECTION_PROFILE_KEY];
  if (typeof fromMeta === "string") return fromMeta;
  return null;
}
