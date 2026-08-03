import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { BUILD_INTERNAL_LABEL } from "./constants";
import { verifyBuildReproducibility } from "./reproducibility";
import { mapBuildRow } from "./workspace";
import type { PersistedBuild } from "./types";

export type BuildFactoryDiagnosticsRow = {
  buildId: string;
  name: string;
  projectType: string;
  blueprintId: string;
  status: string;
  templateKey: string;
  templateVersion: string;
  specificationVersion: string;
  workspaceReference: string;
  taskProgress: string;
  validationStatus: string;
  reviewStatus: string;
  snapshotCount: number;
  reproducibilityStatus: string;
  blockingReason: string | null;
  latestError: string | null;
  label: string;
  createdAt: string;
  updatedAt: string;
};

export async function loadBuildFactoryDiagnostics(
  admin: AdminSupabaseClient,
  organizationId: string,
  limit = 20,
): Promise<BuildFactoryDiagnosticsRow[]> {
  const { data: rows } = await admin
    .from("builds")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) {
    return [];
  }

  const results: BuildFactoryDiagnosticsRow[] = [];
  for (const row of rows) {
    const build = mapBuildRow(row as Record<string, unknown>);
    const { count: snapshotCount } = await admin
      .from("build_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("build_id", build.id);

    let reproducibilityStatus = "unknown";
    try {
      const report = await verifyBuildReproducibility(build);
      reproducibilityStatus = report.status;
    } catch {
      reproducibilityStatus = "unsupported";
    }

    const spec = build.specification;
    const name = spec?.name ?? "Build";
    const errorObj = row.error as Record<string, unknown> | null;
    const latestError =
      errorObj && typeof errorObj.reason === "string" ? errorObj.reason : null;

    results.push({
      buildId: build.id,
      name,
      projectType: build.projectType,
      blueprintId: build.ventureBlueprintId,
      status: build.status,
      templateKey: build.templateKey,
      templateVersion: build.templateVersion,
      specificationVersion: build.specificationVersion,
      workspaceReference: build.workspaceReference,
      taskProgress: summarizeTaskProgress(build),
      validationStatus: build.status === "failed" ? "failed" : build.status === "validating" ? "running" : "idle",
      reviewStatus: build.reviewStatus,
      snapshotCount: snapshotCount ?? 0,
      reproducibilityStatus,
      blockingReason: build.status === "blocked" ? latestError : null,
      latestError,
      label: BUILD_INTERNAL_LABEL,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
    });
  }

  return results;
}

function summarizeTaskProgress(build: PersistedBuild): string {
  if (build.status === "internally_complete") {
    return "complete";
  }
  if (["review_pending", "validating", "scaffolding", "workspace_ready"].includes(build.status)) {
    return "in_progress";
  }
  return build.status;
}
