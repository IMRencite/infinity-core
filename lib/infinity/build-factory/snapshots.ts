import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { hashJson } from "./paths";
import type { PersistedBuild } from "./types";
import { openBuildWorkspace } from "./workspace";
import { emitBuildFactoryEvent } from "./events";

export async function createBuildSnapshot(
  admin: AdminSupabaseClient,
  build: PersistedBuild,
  workerResultId: string | null,
  correlationId: string,
): Promise<string> {
  const workspace = openBuildWorkspace(build);
  const files = await workspace.listWorkspaceFiles();

  const { data: latest } = await admin
    .from("build_snapshots")
    .select("snapshot_version, id")
    .eq("build_id", build.id)
    .order("snapshot_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshotVersion = (latest?.snapshot_version ?? 0) + 1;
  const rootHash = hashJson(files);

  const { data: snapshot, error } = await admin
    .from("build_snapshots")
    .insert({
      organization_id: build.organizationId,
      build_id: build.id,
      snapshot_version: snapshotVersion,
      file_manifest: files,
      total_files: files.length,
      total_bytes: files.reduce((s, f) => s + f.bytes, 0),
      root_hash: rootHash,
      previous_snapshot_id: latest?.id ?? null,
      created_by_worker_result_id: workerResultId,
    })
    .select("id")
    .single();

  if (error || !snapshot) {
    throw new Error(error?.message ?? "Failed to create build snapshot");
  }

  await admin
    .from("builds")
    .update({
      current_snapshot_id: snapshot.id,
      status: "review_pending",
    })
    .eq("id", build.id)
    .eq("organization_id", build.organizationId);

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "build.snapshot_created",
    message: "Workspace snapshot created",
    correlationId,
    buildId: build.id,
    payload: { snapshot_id: snapshot.id, root_hash: rootHash },
  });

  return snapshot.id;
}
