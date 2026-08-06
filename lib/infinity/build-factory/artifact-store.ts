import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { ARTIFACT_INTERNAL_PACKAGE_LABEL } from "./build-job";

export type BuildArtifactRecord = {
  id: string;
  organizationId: string;
  missionId: string | null;
  buildId: string | null;
  buildJobId: string | null;
  builderKey: string | null;
  artifactType: string;
  logicalName: string;
  contentHash: string | null;
  sizeBytes: number | null;
  status: string;
  immutable: boolean;
  createdAt: string;
  label: string;
};

export async function listBuildArtifactsForJob(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<BuildArtifactRecord[]> {
  const { data: results } = await admin
    .from("worker_results")
    .select("id, mission_id, capability_key, status, created_at")
    .eq("organization_id", organizationId)
    .like("capability_key", "build.%")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);

  const buildResults = (results ?? []).filter((row) => {
    return true;
  });

  const artifacts: BuildArtifactRecord[] = [];
  for (const result of buildResults.slice(0, 20)) {
    const { data: rows } = await admin
      .from("worker_artifacts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("worker_result_id", result.id);

    for (const row of rows ?? []) {
      artifacts.push({
        id: String(row.id),
        organizationId,
        missionId: result.mission_id ? String(result.mission_id) : null,
        buildId,
        buildJobId: null,
        builderKey: null,
        artifactType: String(row.artifact_type),
        logicalName: String(row.artifact_type),
        contentHash:
          typeof row.payload === "object" &&
          row.payload !== null &&
          !Array.isArray(row.payload) &&
          typeof (row.payload as Record<string, unknown>).content_hash === "string"
            ? String((row.payload as Record<string, unknown>).content_hash)
            : null,
        sizeBytes: null,
        status: "stored",
        immutable: true,
        createdAt: String(row.created_at),
        label: ARTIFACT_INTERNAL_PACKAGE_LABEL,
      });
    }
  }

  return artifacts;
}
