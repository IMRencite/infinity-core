import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  EXECUTIVE_SELECTION_MODEL_VERSION,
  EXECUTIVE_SELECTION_POLICY_VERSION,
} from "./constants";
import { defaultSelectionThresholds } from "./scoring";
import { hashEligibleSet, loadEligibleOpportunitiesForMission } from "./eligibility";
import { scoreEligibleSet } from "./scoring";
import type { ExecutiveContextManifest } from "./types";
export async function buildExecutiveSelectionContext(input: {
  admin: AdminSupabaseClient;
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  correlationId: string | null;
}): Promise<{
  contextHash: string;
  opportunityIds: string[];
  manifest: ExecutiveContextManifest;
  objective: string;
  portfolioStrategy: string;
  validationRunIds: string[];
}> {
  const { eligible, excluded } = await loadEligibleOpportunitiesForMission(
    input.admin,
    input.organizationId,
    input.missionId,
  );

  const opportunityIds = eligible.map((o) => o.id);

  const { data: validationRuns } = await input.admin
    .from("validation_runs")
    .select("id, opportunity_id, recommendation, completed_at")
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .in("opportunity_id", opportunityIds.length > 0 ? opportunityIds : ["00000000-0000-0000-0000-000000000000"]);

  const validationRunIds = (validationRuns ?? []).map((v) => v.id);

  const contextHash = hashEligibleSet({
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    opportunityIds,
    validationRunIds,
    scoringModelVersion: EXECUTIVE_SELECTION_MODEL_VERSION,
    policyVersion: EXECUTIVE_SELECTION_POLICY_VERSION,
  });

  const thresholds = defaultSelectionThresholds();

  const opportunitySummaries: Record<string, unknown> = {};
  const validationSummaries: Record<string, unknown> = {};
  const evidenceQuality: Record<string, number> = {};
  const confidenceProfile: Record<string, number> = {};

  for (const opp of eligible) {
    opportunitySummaries[opp.id] = {
      id: opp.id,
      name: opp.name,
      status: opp.status,
      overall_score: opp.overall_score,
      confidence_score: opp.confidence_score,
    };
    const vr = (validationRuns ?? []).find((v) => v.opportunity_id === opp.id);
    validationSummaries[opp.id] = vr
      ? { validation_run_id: vr.id, recommendation: vr.recommendation }
      : { missing: true };
    evidenceQuality[opp.id] = (opp.confidence_score ?? 50) / 100;
    confidenceProfile[opp.id] = (opp.confidence_score ?? 50) / 100;
  }

  const manifest: ExecutiveContextManifest = {
    opportunitySummaries,
    validationSummaries,
    reasoningSummaries: {},
    deterministicScores: {},
    aiAdvisorySummaries: {},
    evidenceQuality,
    confidenceProfile,
    estimatedCostProfile: Object.fromEntries(
      eligible.map((o) => [
        o.id,
        {
          min: Number(o.estimated_startup_cost_min ?? 0),
          max: Number(o.estimated_startup_cost_max ?? 0),
          currency: "USD",
        },
      ]),
    ),
    estimatedTimeProfile: {},
    revenuePotentialProfile: {},
    competitionProfile: {},
    operationalComplexityProfile: {},
    maintenanceBurdenProfile: {},
    strategicFitProfile: {},
    portfolioSynergyProfile: {},
    allocationConstraints: {},
    policyConstraints: {},
    prohibitedActions: ["create_plan", "allocate_capital", "create_venture", "start_build", "write_files"],
    escalationThresholds: {
      autonomous_cost_ceiling_usd: thresholds.autonomousCostCeilingUsd,
    },
    decisionThresholds: thresholds,
    excludedOpportunities: excluded,
  };

  return {
    contextHash,
    opportunityIds,
    manifest,
    objective: "Autonomous portfolio selection for mission",
    portfolioStrategy: "select_strongest_in_policy_candidate",
    validationRunIds,
  };
}

export function attachScoresToManifest(
  manifest: ExecutiveContextManifest,
  scores: ReturnType<typeof scoreEligibleSet>,
): ExecutiveContextManifest {
  const deterministicScores: ExecutiveContextManifest["deterministicScores"] = {};
  for (const score of scores) {
    deterministicScores[score.opportunityId] = score;
  }
  const rankedOpportunityIds = [...scores]
    .sort((a, b) => b.aggregateScore - a.aggregateScore)
    .map((s) => s.opportunityId);

  return {
    ...manifest,
    deterministicScores,
    rankedOpportunityIds,
  };
}
