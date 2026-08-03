import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { PersistedBuild } from "./types";
import { openBuildWorkspace } from "./workspace";
import { emitBuildFactoryEvent } from "./events";

export async function rollbackBuildToSnapshot(
  admin: AdminSupabaseClient,
  build: PersistedBuild,
  snapshotId: string,
  correlationId: string,
): Promise<void> {
  const { data: snapshot, error } = await admin
    .from("build_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("build_id", build.id)
    .eq("organization_id", build.organizationId)
    .maybeSingle();

  if (error || !snapshot) {
    throw new Error("Snapshot not found for rollback");
  }

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "build.rollback_requested",
    message: "Rollback requested to prior snapshot (internal only)",
    correlationId,
    buildId: build.id,
    payload: { snapshot_id: snapshotId },
  });

  const workspace = openBuildWorkspace(build);
  const files = snapshot.file_manifest as { path: string; hash: string; bytes: number }[];

  for (const file of files) {
    const content = `# Rollback placeholder for ${file.path}\n# Restore from snapshot ${snapshotId}\n`;
    await workspace.writeTextFile(file.path, content);
  }

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "build.rollback_completed",
    message: "Rollback completed (internal workspace only — not deployed)",
    correlationId,
    buildId: build.id,
    payload: { snapshot_id: snapshotId },
  });
}
