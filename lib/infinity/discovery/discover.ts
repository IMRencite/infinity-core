import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import { registerOpportunity } from "../opportunities";
import {
  DETERMINISTIC_DISCOVERY_PROVIDER_KEY,
  DISCOVERY_SCORING_VERSION,
} from "./constants";
import { recordOpportunityDecision } from "./decisions";
import { resolveDiscoveryProvider } from "./registry";
import { recordOpportunityReview } from "./reviews";
import { recordOpportunityScore } from "./score";
import { recordDiscoverySignal } from "./signals";
import type { DeterministicDiscoveryResult, DiscoveryContext } from "./types";

const FOUNDATION_OPPORTUNITY_KEY = "deterministic-foundation-v1";

function buildDedupKeys(scanId: string) {
  return {
    signalHash: `signal:${scanId}:${FOUNDATION_OPPORTUNITY_KEY}`,
    externalSignalId: `${FOUNDATION_OPPORTUNITY_KEY}:${scanId}`,
    opportunityDedupKey: `opportunity:${scanId}:${FOUNDATION_OPPORTUNITY_KEY}`,
    evidenceDedupKey: `evidence:${scanId}:${FOUNDATION_OPPORTUNITY_KEY}`,
    decisionDedupKey: `decision:${scanId}:${FOUNDATION_OPPORTUNITY_KEY}`,
  };
}

async function recordOpportunityEvidence(
  admin: AdminSupabaseClient,
  input: DiscoveryContext & {
    opportunityId: string;
    evidenceDedupKey: string;
    signalId: string;
  },
) {
  const { data: existing, error: existingError } = await admin
    .from("opportunity_evidence")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .contains("metadata", { dedup_key: input.evidenceDedupKey })
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check opportunity evidence: ${existingError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  const { data: evidence, error } = await admin
    .from("opportunity_evidence")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      evidence_type: "other",
      title: "Deterministic discovery foundation validation evidence",
      summary:
        "System-generated evidence for Opportunity Discovery Foundation v1. Not real market intelligence.",
      extracted_data: {
        validation_scope: "discovery_foundation_v1",
        not_market_evidence: true,
        signal_id: input.signalId,
        dedup_key: input.evidenceDedupKey,
      } as Json,
      relevance_score: 100,
      credibility_score: 100,
      supports_opportunity: true,
      metadata: {
        dedup_key: input.evidenceDedupKey,
        validation_scope: "discovery_foundation_v1",
        not_market_evidence: true,
      } as Json,
    })
    .select("id")
    .single();

  if (error || !evidence) {
    throw new Error(
      `Failed to record opportunity evidence: ${error?.message ?? "unknown error"}`,
    );
  }

  return evidence.id;
}

export async function runDeterministicDiscoveryFoundation(
  admin: AdminSupabaseClient,
  input: DiscoveryContext,
): Promise<DeterministicDiscoveryResult> {
  const provider = await resolveDiscoveryProvider(
    admin,
    input.organizationId,
    DETERMINISTIC_DISCOVERY_PROVIDER_KEY,
  );

  const dedup = buildDedupKeys(input.scanId);

  const { data: existingOpportunity } = await admin
    .from("opportunities")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("discovery_dedup_key", dedup.opportunityDedupKey)
    .maybeSingle();

  if (existingOpportunity) {
    const { data: signal } = await admin
      .from("discovery_signals")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("signal_hash", dedup.signalHash)
      .maybeSingle();

    const { data: score } = await admin
      .from("opportunity_scores")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("opportunity_id", existingOpportunity.id)
      .eq("scoring_version", DISCOVERY_SCORING_VERSION)
      .maybeSingle();

    const { data: review } = await admin
      .from("opportunity_reviews")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("opportunity_id", existingOpportunity.id)
      .eq("review_type", "automated")
      .eq("reviewer_type", "worker")
      .maybeSingle();

    const { data: decision } = await admin
      .from("opportunity_decisions")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("dedup_key", dedup.decisionDedupKey)
      .maybeSingle();

    const { data: evidenceRows } = await admin
      .from("opportunity_evidence")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("opportunity_id", existingOpportunity.id)
      .contains("metadata", { dedup_key: dedup.evidenceDedupKey })
      .limit(1);

    return {
      alreadyRecorded: true,
      providerId: provider.id,
      signalId: signal?.id ?? "",
      opportunityId: existingOpportunity.id,
      evidenceId: evidenceRows?.[0]?.id ?? "",
      scoreId: score?.id ?? "",
      reviewId: review?.id ?? "",
      decisionId: decision?.id ?? "",
      opportunitiesDiscovered: 1,
    };
  }

  const context: DiscoveryContext = {
    ...input,
    providerId: provider.id,
    metadata: {
      validation_scope: "discovery_foundation_v1",
      not_market_opportunity: true,
      provider_key: provider.provider_key,
      creates_ventures: false,
      ...(input.metadata ?? {}),
    },
  };

  const signal = await recordDiscoverySignal(admin, {
    ...context,
    signalType: "operational",
    title: "Deterministic discovery foundation signal",
    summary:
      "Foundation validation signal emitted by the deterministic discovery provider. Not a real market signal.",
    externalSignalId: dedup.externalSignalId,
    signalHash: dedup.signalHash,
    rawData: {
      validation_scope: "discovery_foundation_v1",
      not_market_signal: true,
      scan_id: input.scanId,
    },
    relevanceScore: 100,
  });

  const opportunity = await registerOpportunity(admin, {
    organizationId: input.organizationId,
    scanId: input.scanId,
    discoveryDedupKey: dedup.opportunityDedupKey,
    name: "Deterministic Discovery Foundation Opportunity (Stub)",
    summary:
      "A labeled foundation stub opportunity created by the deterministic discovery provider. Not real market intelligence.",
    problem:
      "Validates the Opportunity Discovery Foundation pipeline without creating ventures or using external sources.",
    targetCustomer: "Internal validation only",
    industry: "system_validation",
    category: "foundation_stub",
    businessModel: "none",
    recommendedBuilder: "custom",
    status: "discovered",
    decision: "pending",
    sourceSnapshot: {
      validation_scope: "discovery_foundation_v1",
      not_market_opportunity: true,
      signal_id: signal.id,
      provider_id: provider.id,
      creates_ventures: false,
    },
    metadata: context.metadata,
    correlationId: input.correlationId,
    engineJobId: input.engineJobId,
    workerRunId: input.workerRunId,
  });

  const evidenceId = await recordOpportunityEvidence(admin, {
    ...context,
    opportunityId: opportunity.id,
    evidenceDedupKey: dedup.evidenceDedupKey,
    signalId: signal.id,
  });

  const score = await recordOpportunityScore(admin, {
    ...context,
    opportunityId: opportunity.id,
    demandScore: 50,
    competitionScore: 50,
    profitabilityScore: 50,
    startupCostScore: 80,
    timeToRevenueScore: 50,
    automationScore: 90,
    overallScore: 62,
    confidenceScore: 100,
    reasoning:
      "Deterministic foundation score for pipeline validation. Not derived from real market data.",
    weightedBreakdown: {
      validation_scope: "discovery_foundation_v1",
      not_market_score: true,
    },
  });

  const review = await recordOpportunityReview(admin, {
    ...context,
    opportunityId: opportunity.id,
    reviewType: "automated",
    reviewerType: "worker",
    verdict: "pass",
    notes:
      "Automated foundation review confirms deterministic discovery pipeline execution. No venture created.",
    confidenceScore: 100,
  });

  const decision = await recordOpportunityDecision(admin, {
    ...context,
    opportunityId: opportunity.id,
    decision: "validate",
    previousDecision: "pending",
    reasoning:
      "Foundation stub recommends validation-only next step. Build Factory and venture creation remain disabled.",
    decidedByType: "worker",
    dedupKey: dedup.decisionDedupKey,
  });

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: "discovery.foundation_completed",
    entityType: "opportunity_scan",
    entityId: input.scanId,
    message: "Deterministic discovery foundation completed with one labeled stub opportunity",
    correlationId: input.correlationId ?? undefined,
    payload: {
      scan_id: input.scanId,
      provider_id: provider.id,
      opportunity_id: opportunity.id,
      opportunities_discovered: 1,
      validation_scope: "discovery_foundation_v1",
      creates_ventures: false,
    },
  });

  return {
    alreadyRecorded: false,
    providerId: provider.id,
    signalId: signal.id,
    opportunityId: opportunity.id,
    evidenceId,
    scoreId: score.id,
    reviewId: review.id,
    decisionId: decision.id,
    opportunitiesDiscovered: 1,
  };
}
