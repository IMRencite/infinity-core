import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import { isOpportunityDecision, isOpportunityStatus } from "./constants";
import { buildUniqueOpportunitySlug } from "./slug";
import type { Opportunity, RegisterOpportunityInput } from "./types";

async function loadExistingSlugs(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("opportunities")
    .select("slug")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to load opportunity slugs: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.slug));
}

function buildSourceSnapshot(input: RegisterOpportunityInput): Json {
  return {
    ...(input.sourceSnapshot as Record<string, Json> | undefined),
    ...(input.metadata as Record<string, Json> | undefined),
    ...(input.workerRunId ? { worker_run_id: input.workerRunId } : {}),
    ...(input.engineJobId ? { engine_job_id: input.engineJobId } : {}),
  };
}

export async function registerOpportunity(
  admin: AdminSupabaseClient,
  input: RegisterOpportunityInput,
): Promise<Opportunity> {
  const status = input.status ?? "discovered";
  const decision = input.decision ?? "pending";

  if (!isOpportunityStatus(status)) {
    throw new Error(`Invalid opportunity status: ${status}`);
  }

  if (!isOpportunityDecision(decision)) {
    throw new Error(`Invalid opportunity decision: ${decision}`);
  }

  const { data: existing, error: existingError } = await admin
    .from("opportunities")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("discovery_dedup_key", input.discoveryDedupKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing opportunity: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const existingSlugs = await loadExistingSlugs(admin, input.organizationId);
  const slug = buildUniqueOpportunitySlug(existingSlugs, input.name);

  const { data: opportunity, error } = await admin
    .from("opportunities")
    .insert({
      organization_id: input.organizationId,
      scan_id: input.scanId,
      discovery_dedup_key: input.discoveryDedupKey,
      name: input.name,
      slug,
      summary: input.summary ?? null,
      problem: input.problem ?? null,
      target_customer: input.targetCustomer ?? null,
      industry: input.industry ?? null,
      category: input.category ?? null,
      business_model: input.businessModel ?? null,
      recommended_builder: input.recommendedBuilder ?? null,
      status,
      decision,
      confidence_score: input.confidenceScore ?? null,
      overall_score: input.overallScore ?? null,
      source_snapshot: buildSourceSnapshot(input),
      assumptions: {},
      risks: [],
      monetization_models: [],
    })
    .select("*")
    .single();

  if (error || !opportunity) {
    throw new Error(
      `Failed to register opportunity: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: "discovery.opportunity_discovered",
    entityType: "opportunity",
    entityId: opportunity.id,
    message: `Opportunity discovered: ${opportunity.name}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: opportunity.id,
      scan_id: input.scanId,
      discovery_dedup_key: input.discoveryDedupKey,
      status: opportunity.status,
      decision: opportunity.decision,
    },
  });

  return opportunity;
}
