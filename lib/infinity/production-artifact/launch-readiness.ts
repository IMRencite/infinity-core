import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import {
  reconstructProductionArtifact,
  verifyProductionArtifactIntegrity,
} from "./materialize";
import type { ProductionFileManifestEntry } from "./types";
import { isProhibitedProductionPath } from "./types";
import { validateFrameworkReadiness } from "./framework-validators";

export type ProductionArtifactLaunchReadiness = {
  ready: boolean;
  reasons: string[];
  productionArtifactId: string | null;
  contentHash: string | null;
};

export async function evaluateProductionArtifactLaunchReadiness(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    ventureAssemblyId: string;
    productionArtifactId: string | null;
    buildSnapshotId: string | null;
  },
): Promise<ProductionArtifactLaunchReadiness> {
  const reasons: string[] = [];
  if (!input.productionArtifactId) {
    return {
      ready: false,
      reasons: ["production_artifact_missing"],
      productionArtifactId: null,
      contentHash: null,
    };
  }

  const { data: row } = await admin
    .from("production_artifacts")
    .select("id, content_hash, build_snapshot_id, framework, file_manifest, file_count")
    .eq("organization_id", input.organizationId)
    .eq("id", input.productionArtifactId)
    .maybeSingle();

  if (!row) {
    return {
      ready: false,
      reasons: ["production_artifact_not_found"],
      productionArtifactId: input.productionArtifactId,
      contentHash: null,
    };
  }

  if (input.buildSnapshotId && row.build_snapshot_id !== input.buildSnapshotId) {
    reasons.push("artifact_snapshot_mismatch");
  }

  const manifest = (row.file_manifest ?? []) as ProductionFileManifestEntry[];
  for (const entry of manifest) {
    if (isProhibitedProductionPath(entry.relative_path)) {
      reasons.push(`prohibited_in_manifest:${entry.relative_path}`);
    }
  }

  const frameworkCheck = validateFrameworkReadiness(String(row.framework), manifest);
  if (!frameworkCheck.valid) {
    reasons.push(...frameworkCheck.issues.map((i) => `framework:${i}`));
  }

  const integrity = await verifyProductionArtifactIntegrity(admin, {
    organizationId: input.organizationId,
    productionArtifactId: input.productionArtifactId,
    expectedContentHash: String(row.content_hash),
  });
  if (!integrity.valid) {
    reasons.push(...integrity.reasons);
  }

  return {
    ready: reasons.length === 0,
    reasons,
    productionArtifactId: input.productionArtifactId,
    contentHash: String(row.content_hash),
  };
}

export async function prepareArtifactForExternalExecution(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productionArtifactId: string;
    approvedArtifactHash: string;
  },
): Promise<{ record: Awaited<ReturnType<typeof reconstructProductionArtifact>>["record"]; files: Awaited<ReturnType<typeof reconstructProductionArtifact>>["files"] }> {
  if (!input.approvedArtifactHash) {
    throw new Error("approved_artifact_hash_missing");
  }
  const { record, files } = await reconstructProductionArtifact(
    admin,
    input.organizationId,
    input.productionArtifactId,
  );
  if (record.contentHash !== input.approvedArtifactHash) {
    throw new Error("approval_artifact_hash_mismatch");
  }
  return { record, files };
}

export async function insertLaunchHandoffLink(
  admin: AdminSupabaseClient,
  row: {
    organizationId: string;
    ventureAssemblyId: string;
    productionArtifactId?: string | null;
    externalActionId?: string | null;
    linkType: string;
    provider?: string | null;
    providerResourceId?: string | null;
    repositoryFullName?: string | null;
    commitSha?: string | null;
    branchName?: string | null;
    vercelProjectId?: string | null;
    deploymentId?: string | null;
    deploymentUrl?: string | null;
    artifactHash?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await admin.from("launch_handoff_links").insert({
    organization_id: row.organizationId,
    venture_assembly_id: row.ventureAssemblyId,
    production_artifact_id: row.productionArtifactId ?? null,
    external_action_id: row.externalActionId ?? null,
    link_type: row.linkType,
    provider: row.provider ?? null,
    provider_resource_id: row.providerResourceId ?? null,
    repository_full_name: row.repositoryFullName ?? null,
    commit_sha: row.commitSha ?? null,
    branch_name: row.branchName ?? null,
    vercel_project_id: row.vercelProjectId ?? null,
    deployment_id: row.deploymentId ?? null,
    deployment_url: row.deploymentUrl ?? null,
    artifact_hash: row.artifactHash ?? null,
    metadata: (row.metadata ?? {}) as Json,
  });
}
