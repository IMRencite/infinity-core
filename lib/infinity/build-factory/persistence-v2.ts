import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";
import {
  type GenericBuildJob,
  buildJobIdempotencyKey,
  mapBuildJobRow,
  type BuildJobStatus,
} from "./build-job";

export async function findBuildJobByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<GenericBuildJob | null> {
  const { data } = await admin
    .from("build_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  return data ? mapBuildJobRow(data as Record<string, unknown>) : null;
}

export async function insertBuildJob(
  admin: AdminSupabaseClient,
  row: Record<string, unknown>,
): Promise<GenericBuildJob> {
  const { data, error } = await admin
    .from("build_jobs")
    .insert(row as Database["public"]["Tables"]["build_jobs"]["Insert"])
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to insert build job");
  }
  return mapBuildJobRow(data as Record<string, unknown>);
}

export async function updateBuildJobStatus(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildJobId: string,
  status: BuildJobStatus,
  patch?: Record<string, unknown>,
): Promise<void> {
  await admin
    .from("build_jobs")
    .update({ status, ...patch })
    .eq("id", buildJobId)
    .eq("organization_id", organizationId);
}

export async function loadBuildJobByBuildId(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<GenericBuildJob | null> {
  const { data } = await admin
    .from("build_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("build_id", buildId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapBuildJobRow(data as Record<string, unknown>) : null;
}

export function buildJobInsertPayload(input: {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  ventureBlueprintId: string;
  executiveDecisionId: string;
  planId: string;
  allocationProposalId: string | null;
  buildId: string;
  builderKey: string;
  builderVersion: string;
  projectType: string;
  specificationHash: string;
  manifestHash: string;
  workspaceReference: string;
  idempotencyKey: string;
  correlationId: string;
  approvedCapabilities: string[];
}): Record<string, unknown> {
  return {
    organization_id: input.organizationId,
    mission_id: input.missionId,
    runtime_instance_id: input.runtimeInstanceId,
    opportunity_id: input.opportunityId,
    venture_blueprint_id: input.ventureBlueprintId,
    executive_decision_id: input.executiveDecisionId,
    plan_id: input.planId,
    allocation_proposal_id: input.allocationProposalId,
    build_id: input.buildId,
    build_version: "1",
    builder_key: input.builderKey,
    builder_version: input.builderVersion,
    project_type: input.projectType,
    build_specification_id: input.specificationHash,
    build_manifest_id: input.manifestHash,
    workspace_id: input.workspaceReference,
    input_manifest: { schema: "build_job_input_v2" } as Json,
    policy_manifest: { zero_cost: true, internal_only: true } as Json,
    approved_capabilities: input.approvedCapabilities as Json,
    prohibited_capabilities: ["shell.execute", "network.access", "package.install"] as Json,
    resource_budget: { max_cost: 0 } as Json,
    runtime_budget: { max_runtime_ms: 600_000 } as Json,
    output_contracts: { internal_package: true } as Json,
    required_reviews: ["qa.verify_internal_website", "qa.verify_generic_internal_build"] as Json,
    idempotency_key: input.idempotencyKey,
    correlation_id: input.correlationId,
    status: "builder_resolved",
    lifecycle_stage: "builder_resolved",
    started_at: new Date().toISOString(),
  };
}

export { buildJobIdempotencyKey };
