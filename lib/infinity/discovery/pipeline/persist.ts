import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { registerOpportunity } from "@/lib/infinity/opportunities";
import { buildOpportunityDedupKey } from "../dedupe/dedupe";
import { recordDiscoverySignal } from "../signals";
import { recordOpportunityScore } from "../score";
import type { ScoredDiscoveredOpportunity } from "../types/opportunity";
import type { DiscoveryPipelineContext } from "../types/pipeline";
import { DISCOVERY_RULE_SCORING_VERSION } from "../constants";

export async function persistDiscoveredOpportunity(
  admin: AdminSupabaseClient,
  context: DiscoveryPipelineContext,
  opportunity: ScoredDiscoveredOpportunity,
): Promise<{ opportunityId: string; created: boolean; signalId: string; scoreId: string }> {
  const dedupKey = buildOpportunityDedupKey(context.organizationId, opportunity);

  const { data: existing } = await admin
    .from("opportunities")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("discovery_dedup_key", dedupKey)
    .maybeSingle();

  if (existing) {
    return {
      opportunityId: existing.id,
      created: false,
      signalId: "",
      scoreId: "",
    };
  }

  const signalHash = `signal:${dedupKey}`;
  const signal = await recordDiscoverySignal(admin, {
    organizationId: context.organizationId,
    scanId: context.scanId,
    signalType: "market_signal",
    title: opportunity.title,
    summary: opportunity.description.slice(0, 500),
    externalSignalId: opportunity.id,
    signalHash,
    rawData: opportunity.rawPayload,
    relevanceScore: opportunity.estimatedDemand,
    correlationId: context.correlationId,
    engineJobId: context.engineJobId,
    workerRunId: context.workerRunId,
  });

  const registered = await registerOpportunity(admin, {
    organizationId: context.organizationId,
    scanId: context.scanId,
    discoveryDedupKey: dedupKey,
    name: opportunity.title,
    summary: opportunity.description,
    problem: opportunity.description,
    industry: opportunity.market,
    category: opportunity.category,
    status: "discovered",
    decision: "pending",
    confidenceScore: opportunity.confidence,
    overallScore: opportunity.overallScore,
    sourceSnapshot: {
      discovery_engine_version: DISCOVERY_RULE_SCORING_VERSION,
      source: opportunity.source,
      url: opportunity.url,
      keywords: opportunity.keywords,
      estimated_demand: opportunity.estimatedDemand,
      estimated_competition: opportunity.estimatedCompetition,
      estimated_revenue_potential: opportunity.estimatedRevenuePotential,
      raw_payload: opportunity.rawPayload as Json,
      signal_id: signal.id,
    },
    metadata: {
      discovery_provider: opportunity.source,
      creates_ventures: false,
    },
    correlationId: context.correlationId,
    engineJobId: context.engineJobId,
    workerRunId: context.workerRunId,
  });

  const score = await recordOpportunityScore(admin, {
    organizationId: context.organizationId,
    scanId: context.scanId,
    opportunityId: registered.id,
    demandScore: opportunity.estimatedDemand,
    competitionScore: opportunity.estimatedCompetition,
    profitabilityScore: opportunity.estimatedRevenuePotential,
    startupCostScore: 50,
    timeToRevenueScore: 50,
    automationScore: 50,
    overallScore: opportunity.overallScore,
    confidenceScore: opportunity.confidence,
    reasoning: "Rule-based discovery scoring (deterministic, no LLM).",
    weightedBreakdown: opportunity.scoreBreakdown,
  });

  return {
    opportunityId: registered.id,
    created: true,
    signalId: signal.id,
    scoreId: score.id,
  };
}
