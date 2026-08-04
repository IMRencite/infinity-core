import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { WebsiteGenerationPlan, WebsiteGenerationPlanPayload } from "./types";

export async function findAiWebsitePlanByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data } = await admin
    .from("ai_website_generation_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data ? mapPlanRow(data as Record<string, unknown>) : null;
}

export async function insertAiWebsitePlanRequest(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string | null;
    opportunityId: string;
    ventureBlueprintId: string;
    buildId: string;
    buildSpecificationId: string;
    provider: string;
    model: string;
    mode: string;
    planVersion: string;
    promptVersion: string;
    schemaVersion: string;
    contextManifest: unknown;
    contextHash: string;
    correlationId: string | null;
    idempotencyKey: string;
    reasoningSessionId?: string | null;
  },
): Promise<WebsiteGenerationPlan> {
  const { data, error } = await admin
    .from("ai_website_generation_plans")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      opportunity_id: input.opportunityId,
      venture_blueprint_id: input.ventureBlueprintId,
      build_id: input.buildId,
      build_specification_id: input.buildSpecificationId,
      provider: input.provider,
      model: input.model,
      mode: input.mode,
      plan_version: input.planVersion,
      prompt_version: input.promptVersion,
      schema_version: input.schemaVersion,
      status: "requested",
      review_status: "pending",
      context_manifest: input.contextManifest as Json,
      context_hash: input.contextHash,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      reasoning_session_id: input.reasoningSessionId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert AI website plan: ${error?.message}`);
  }
  return mapPlanRow(data as Record<string, unknown>);
}

export async function updateAiWebsitePlan(
  admin: AdminSupabaseClient,
  organizationId: string,
  planId: string,
  patch: Record<string, Json | string | number | boolean | null>,
): Promise<void> {
  const { error } = await admin
    .from("ai_website_generation_plans")
    .update(patch as unknown as import("@/lib/supabase/database.types").Database["public"]["Tables"]["ai_website_generation_plans"]["Update"])
    .eq("organization_id", organizationId)
    .eq("id", planId);
  if (error) {
    throw new Error(`Failed to update AI website plan: ${error.message}`);
  }
}

export async function loadApprovedAiWebsitePlanForBuild(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<WebsiteGenerationPlan | null> {
  const { data } = await admin
    .from("ai_website_generation_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("build_id", buildId)
    .eq("review_status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapPlanRow(data as Record<string, unknown>) : null;
}

export async function loadAiWebsitePlanForBuild(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<WebsiteGenerationPlan | null> {
  const { data } = await admin
    .from("ai_website_generation_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("build_id", buildId)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapPlanRow(data as Record<string, unknown>) : null;
}

export function mapPlanRow(row: Record<string, unknown>): WebsiteGenerationPlan {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    runtimeInstanceId: row.runtime_instance_id ? String(row.runtime_instance_id) : null,
    opportunityId: String(row.opportunity_id),
    ventureBlueprintId: String(row.venture_blueprint_id),
    buildId: String(row.build_id),
    buildSpecificationId: String(row.build_specification_id),
    provider: String(row.provider),
    model: String(row.model),
    mode: String(row.mode),
    planVersion: String(row.plan_version),
    promptVersion: String(row.prompt_version) as WebsiteGenerationPlan["promptVersion"],
    schemaVersion: String(row.schema_version) as WebsiteGenerationPlan["schemaVersion"],
    status: String(row.status),
    reviewStatus: String(row.review_status),
    contextManifest: row.context_manifest,
    contextHash: String(row.context_hash),
    structuredPlan: row.structured_plan as WebsiteGenerationPlanPayload | null,
    outputHash: row.output_hash ? String(row.output_hash) : null,
    recommendation: row.recommendation ? String(row.recommendation) : null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    usage: row.usage as Record<string, unknown> | null,
    estimatedCost: Number(row.estimated_cost ?? 0),
    latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    reasoningSessionId: row.reasoning_session_id ? String(row.reasoning_session_id) : null,
    translationHash: row.translation_hash ? String(row.translation_hash) : null,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
  };
}

export async function loadAiWebsitePlanSummary(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
) {
  const plan = await loadAiWebsitePlanForBuild(admin, organizationId, buildId);
  if (!plan) return null;
  const pageCount = plan.structuredPlan?.pagePlans?.length ?? 0;
  const contentCount = plan.structuredPlan?.contentPlan?.length ?? 0;
  const markerCount = JSON.stringify(plan.structuredPlan ?? {}).split("[CONTENT REQUIRED]").length - 1;
  return { plan, pageCount, contentCount, markerCount };
}
