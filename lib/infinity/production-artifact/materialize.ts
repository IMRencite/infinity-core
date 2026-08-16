import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { loadBuildById, openBuildWorkspace } from "@/lib/infinity/build-factory/workspace";
import {
  assertNoSecretsInContent,
  computeProductionContentHash,
  hashFileContent,
  isProhibitedProductionPath,
  normalizeRelativePath,
  type ProductionArtifactFile,
  type ProductionArtifactRecord,
  type ProductionFileManifestEntry,
} from "./types";
import { validateFrameworkReadiness, validatePackageJsonContent } from "./framework-validators";
import { buildDeploymentManifest, validateDeploymentManifest } from "./deployment-manifest";

export function productionArtifactIdempotencyKey(input: {
  organizationId: string;
  buildSnapshotId: string;
  artifactVersion: number;
}): string {
  return [
    "production_artifact",
    input.organizationId,
    input.buildSnapshotId,
    String(input.artifactVersion),
  ].join(":");
}

type SnapshotFileRow = { path: string; bytes: number; hash?: string };

export async function materializeProductionArtifact(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    buildId: string;
    buildSnapshotId: string;
    buildJobId?: string | null;
    ventureAssemblyId?: string | null;
    ventureAssemblyVersion?: number | null;
    framework?: string;
    artifactVersion?: number;
  },
): Promise<ProductionArtifactRecord> {
  const artifactVersion = input.artifactVersion ?? 1;
  const idempotencyKey = productionArtifactIdempotencyKey({
    organizationId: input.organizationId,
    buildSnapshotId: input.buildSnapshotId,
    artifactVersion,
  });

  const { data: existing } = await admin
    .from("production_artifacts")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return mapProductionArtifactRow(existing as Record<string, unknown>);
  }

  const build = await loadBuildById(admin, input.organizationId, input.buildId);
  if (!build) throw new Error("build_missing");

  const { data: snapshot } = await admin
    .from("build_snapshots")
    .select("file_manifest, root_hash")
    .eq("id", input.buildSnapshotId)
    .eq("build_id", input.buildId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!snapshot) throw new Error("snapshot_missing");

  const framework =
    input.framework ??
    (build.projectType === "nextjs_website" ? "nextjs" : "static_html");

  const manifestRows = (snapshot.file_manifest ?? []) as SnapshotFileRow[];
  const workspace = openBuildWorkspace(build);

  const files: ProductionArtifactFile[] = [];
  const manifest: ProductionFileManifestEntry[] = [];

  for (const row of manifestRows) {
    const relativePath = normalizeRelativePath(row.path);
    if (isProhibitedProductionPath(relativePath)) continue;

    let contentText: string;
    try {
      contentText = await workspace.readTextFile(relativePath);
    } catch {
      continue;
    }

    assertNoSecretsInContent(contentText, relativePath);
    const contentHash = hashFileContent(contentText);
    const byteSize = Buffer.byteLength(contentText, "utf8");
    const fileMode = "100644";

    files.push({
      relativePath,
      contentHash,
      byteSize,
      fileMode,
      contentText,
    });
    manifest.push({
      relative_path: relativePath,
      content_hash: contentHash,
      byte_size: byteSize,
      file_mode: fileMode,
    });
  }

  const pkgFile = files.find((f) => f.relativePath === "package.json");
  if (pkgFile) {
    const pkgCheck = validatePackageJsonContent(
      pkgFile.contentText,
      files.map((f) => f.relativePath),
      framework,
    );
    if (!pkgCheck.valid) {
      throw new Error(`package_json_invalid:${pkgCheck.issues.join(",")}`);
    }
  }

  const deploymentManifest = buildDeploymentManifest({
    record: {
      framework,
      rootDirectory: ".",
    },
    files,
  });
  const manifestCheck = validateDeploymentManifest(deploymentManifest);
  if (!manifestCheck.valid && framework === "nextjs") {
    throw new Error(`deployment_manifest_invalid:${manifestCheck.issues.join(",")}`);
  }

  const frameworkCheck = validateFrameworkReadiness(framework, manifest);
  if (!frameworkCheck.valid) {
    throw new Error(`framework_not_ready:${frameworkCheck.issues.join(",")}`);
  }

  const contentHash = computeProductionContentHash(manifest);
  const totalBytes = manifest.reduce((s, f) => s + f.byte_size, 0);

  const { data: inserted, error } = await admin
    .from("production_artifacts")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      venture_assembly_id: input.ventureAssemblyId ?? null,
      venture_assembly_version: input.ventureAssemblyVersion ?? null,
      build_job_id: input.buildJobId ?? null,
      build_snapshot_id: input.buildSnapshotId,
      build_id: input.buildId,
      artifact_version: artifactVersion,
      artifact_type: "website_application",
      framework,
      root_directory: ".",
      file_manifest: manifest as Json,
      file_count: manifest.length,
      total_bytes: totalBytes,
      content_hash: contentHash,
      idempotency_key: idempotencyKey,
      deployment_manifest: deploymentManifest as Json,
      package_manager: deploymentManifest.packageManager,
      vercel_readiness_status: "unknown",
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "production_artifact_insert_failed");
  }

  const artifactId = String(inserted.id);
  if (files.length > 0) {
    await admin.from("production_artifact_files").insert(
      files.map((f) => ({
        organization_id: input.organizationId,
        production_artifact_id: artifactId,
        relative_path: f.relativePath,
        content_hash: f.contentHash,
        byte_size: f.byteSize,
        file_mode: f.fileMode,
        content_text: f.contentText,
      })),
    );
  }

  return mapProductionArtifactRow(inserted as Record<string, unknown>);
}

export async function reconstructProductionArtifact(
  admin: AdminSupabaseClient,
  organizationId: string,
  productionArtifactId: string,
): Promise<{ record: ProductionArtifactRecord; files: ProductionArtifactFile[] }> {
  const { data: row } = await admin
    .from("production_artifacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", productionArtifactId)
    .maybeSingle();

  if (!row) throw new Error("production_artifact_missing");

  const { data: fileRows } = await admin
    .from("production_artifact_files")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("production_artifact_id", productionArtifactId);

  const files: ProductionArtifactFile[] = (fileRows ?? []).map((r) => ({
    relativePath: String(r.relative_path),
    contentHash: String(r.content_hash),
    byteSize: Number(r.byte_size),
    fileMode: String(r.file_mode),
    contentText: String(r.content_text ?? ""),
  }));

  const record = mapProductionArtifactRow(row as Record<string, unknown>);
  const recomputed = computeProductionContentHash(record.fileManifest);
  if (recomputed !== record.contentHash) {
    throw new Error("production_artifact_hash_mismatch");
  }

  for (const f of files) {
    if (hashFileContent(f.contentText) !== f.contentHash) {
      throw new Error(`production_artifact_file_tampered:${f.relativePath}`);
    }
    assertNoSecretsInContent(f.contentText, f.relativePath);
  }

  return { record, files };
}

export async function verifyProductionArtifactIntegrity(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productionArtifactId: string;
    expectedContentHash: string;
  },
): Promise<{ valid: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  try {
    const { record } = await reconstructProductionArtifact(
      admin,
      input.organizationId,
      input.productionArtifactId,
    );
    if (record.contentHash !== input.expectedContentHash) {
      reasons.push("content_hash_mismatch");
    }
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "reconstruction_failed");
  }
  return { valid: reasons.length === 0, reasons };
}

function mapProductionArtifactRow(row: Record<string, unknown>): ProductionArtifactRecord {
  return {
    artifactId: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    ventureAssemblyId: row.venture_assembly_id ? String(row.venture_assembly_id) : null,
    ventureAssemblyVersion:
      row.venture_assembly_version != null ? Number(row.venture_assembly_version) : null,
    buildJobId: row.build_job_id ? String(row.build_job_id) : null,
    buildSnapshotId: String(row.build_snapshot_id),
    buildId: String(row.build_id),
    artifactVersion: Number(row.artifact_version ?? 1),
    artifactType: String(row.artifact_type),
    framework: String(row.framework),
    rootDirectory: String(row.root_directory ?? "."),
    fileManifest: (row.file_manifest ?? []) as ProductionFileManifestEntry[],
    fileCount: Number(row.file_count ?? 0),
    totalBytes: Number(row.total_bytes ?? 0),
    contentHash: String(row.content_hash),
  };
}
