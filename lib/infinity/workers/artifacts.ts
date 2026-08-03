import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { InternalArtifactType } from "./constants";

export async function persistInternalWorkerArtifact(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string | null;
    workerResultId: string;
    artifactType: InternalArtifactType;
    schemaVersion: string;
    capabilityKey: string;
    capabilityVersion: string;
    payload: Record<string, unknown>;
    provenance: Record<string, unknown>;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("worker_artifacts")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      worker_result_id: input.workerResultId,
      artifact_type: input.artifactType,
      schema_version: input.schemaVersion,
      capability_key: input.capabilityKey,
      capability_version: input.capabilityVersion,
      payload: input.payload as Json,
      provenance: input.provenance as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist worker artifact: ${error?.message ?? "unknown"}`);
  }

  return data.id;
}
