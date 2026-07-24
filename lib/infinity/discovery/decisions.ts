import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import { isOpportunityDecision } from "../opportunities/constants";
import { isOpportunityDecisionActorType } from "./constants";
import type { DiscoveryContext, OpportunityDecisionRecord } from "./types";

export type RecordOpportunityDecisionInput = DiscoveryContext & {
  opportunityId: string;
  decision: string;
  previousDecision?: string | null;
  reasoning?: string | null;
  decidedByType: string;
  dedupKey?: string | null;
};

export async function recordOpportunityDecision(
  admin: AdminSupabaseClient,
  input: RecordOpportunityDecisionInput,
): Promise<OpportunityDecisionRecord> {
  if (!isOpportunityDecision(input.decision)) {
    throw new Error(`Invalid opportunity decision: ${input.decision}`);
  }

  if (
    input.previousDecision &&
    !isOpportunityDecision(input.previousDecision)
  ) {
    throw new Error(`Invalid previous opportunity decision: ${input.previousDecision}`);
  }

  if (!isOpportunityDecisionActorType(input.decidedByType)) {
    throw new Error(`Invalid opportunity decision actor type: ${input.decidedByType}`);
  }

  if (input.dedupKey) {
    const { data: existing, error: existingError } = await admin
      .from("opportunity_decisions")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("dedup_key", input.dedupKey)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to check opportunity decision: ${existingError.message}`,
      );
    }

    if (existing) {
      return existing;
    }
  }

  const { data: decision, error } = await admin
    .from("opportunity_decisions")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      decision: input.decision,
      previous_decision: input.previousDecision ?? null,
      reasoning: input.reasoning ?? null,
      decided_by_type: input.decidedByType,
      dedup_key: input.dedupKey ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select("*")
    .single();

  if (error || !decision) {
    throw new Error(
      `Failed to record opportunity decision: ${error?.message ?? "unknown error"}`,
    );
  }

  await admin
    .from("opportunities")
    .update({
      decision: input.decision,
      status: input.decision === "validate" ? "recommended" : "scored",
    })
    .eq("id", input.opportunityId)
    .eq("organization_id", input.organizationId);

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: "discovery.opportunity_decided",
    entityType: "opportunity_decision",
    entityId: decision.id,
    message: `Opportunity decision recorded: ${input.decision}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      decision_id: decision.id,
      decision: input.decision,
      previous_decision: input.previousDecision ?? null,
    },
  });

  return decision;
}
