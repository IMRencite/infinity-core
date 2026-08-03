import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { createLocalSandboxAdapter } from "./sandbox";
import { buildWorkspaceReference, parseWorkspaceReference, resolveRepoRoot } from "./paths";
import type { PersistedBuild, WorkspaceAdapter } from "./types";

export function openBuildWorkspace(build: PersistedBuild): WorkspaceAdapter {
  const parsed = parseWorkspaceReference(build.workspaceReference);
  if (!parsed) {
    throw new Error("Invalid workspace reference on build record");
  }
  if (
    parsed.organizationId !== build.organizationId ||
    parsed.missionId !== build.missionId ||
    parsed.buildId !== build.id
  ) {
    throw new Error("Workspace reference does not match build identity");
  }
  return createLocalSandboxAdapter({
    organizationId: build.organizationId,
    missionId: build.missionId,
    buildId: build.id,
    repoRoot: resolveRepoRoot(),
  });
}

export function deriveWorkspaceReferenceForBuild(
  organizationId: string,
  missionId: string,
  buildId: string,
): string {
  return buildWorkspaceReference(organizationId, missionId, buildId);
}

export async function loadBuildById(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<PersistedBuild | null> {
  const { data, error } = await admin
    .from("builds")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", buildId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBuildRow(data as Record<string, unknown>);
}

export function mapBuildRow(row: Record<string, unknown>): PersistedBuild {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    runtimeInstanceId: row.runtime_instance_id ? String(row.runtime_instance_id) : null,
    opportunityId: String(row.opportunity_id),
    ventureBlueprintId: String(row.venture_blueprint_id),
    planId: row.plan_id ? String(row.plan_id) : null,
    allocationProposalId: row.allocation_proposal_id
      ? String(row.allocation_proposal_id)
      : null,
    projectType: String(row.project_type) as PersistedBuild["projectType"],
    templateKey: String(row.template_key),
    templateVersion: String(row.template_version),
    buildVersion: String(row.build_version),
    specificationVersion: String(row.specification_version),
    status: String(row.status) as PersistedBuild["status"],
    specification: row.specification as PersistedBuild["specification"],
    specificationHash: String(row.specification_hash),
    manifest: row.manifest as PersistedBuild["manifest"],
    manifestHash: String(row.manifest_hash),
    workspaceReference: String(row.workspace_reference),
    currentSnapshotId: row.current_snapshot_id ? String(row.current_snapshot_id) : null,
    reviewStatus: String(row.review_status),
    idempotencyKey: String(row.idempotency_key),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
