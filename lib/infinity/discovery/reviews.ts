import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import {
  isOpportunityReviewerType,
  isOpportunityReviewType,
  isOpportunityReviewVerdict,
} from "./constants";
import type { DiscoveryContext, OpportunityReview } from "./types";

export type RecordOpportunityReviewInput = DiscoveryContext & {
  opportunityId: string;
  reviewType: string;
  reviewerType: string;
  verdict: string;
  notes?: string | null;
  confidenceScore?: number | null;
};

export async function recordOpportunityReview(
  admin: AdminSupabaseClient,
  input: RecordOpportunityReviewInput,
): Promise<OpportunityReview> {
  if (!isOpportunityReviewType(input.reviewType)) {
    throw new Error(`Invalid opportunity review type: ${input.reviewType}`);
  }

  if (!isOpportunityReviewerType(input.reviewerType)) {
    throw new Error(`Invalid opportunity reviewer type: ${input.reviewerType}`);
  }

  if (!isOpportunityReviewVerdict(input.verdict)) {
    throw new Error(`Invalid opportunity review verdict: ${input.verdict}`);
  }

  const { data: existing, error: existingError } = await admin
    .from("opportunity_reviews")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .eq("review_type", input.reviewType)
    .eq("reviewer_type", input.reviewerType)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check opportunity review: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: review, error } = await admin
    .from("opportunity_reviews")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      review_type: input.reviewType,
      reviewer_type: input.reviewerType,
      verdict: input.verdict,
      notes: input.notes ?? null,
      confidence_score: input.confidenceScore ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select("*")
    .single();

  if (error || !review) {
    throw new Error(
      `Failed to record opportunity review: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: "discovery.opportunity_reviewed",
    entityType: "opportunity_review",
    entityId: review.id,
    message: `Opportunity reviewed: ${input.reviewType}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      review_id: review.id,
      review_type: input.reviewType,
      verdict: input.verdict,
    },
  });

  return review;
}
