import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadExternalAction } from "./persistence";

export async function enrichExternalActionPayloadFromDependencies(
  admin: AdminSupabaseClient,
  organizationId: string,
  action: {
    actionType: string;
    dependsOnActionId?: string | null;
  },
  payload: Record<string, unknown>,
): Promise<void> {
  if (!action.dependsOnActionId) return;

  let depId: string | null = action.dependsOnActionId;
  while (depId) {
    const dep = await loadExternalAction(admin, organizationId, depId);
    if (!dep) break;
    const depIds = (dep.resultManifest?.external_ids ?? dep.resultManifest ?? {}) as Record<
      string,
      string
    >;

    if (dep.executionStatus === "succeeded" || dep.executionStatus === "simulated") {
      if (dep.actionType === "repository.create" && depIds.repository_full_name) {
        payload.repository_full_name = depIds.repository_full_name;
      }
      if (dep.actionType === "repository.push" && depIds.commit_sha) {
        payload.commit_sha = depIds.commit_sha;
      }
      if (dep.actionType === "hosting.create_project" && depIds.project_id) {
        payload.project_id = depIds.project_id;
      }
      if (dep.actionType === "hosting.deploy") {
        if (depIds.deployment_id) payload.deployment_id = depIds.deployment_id;
        if (depIds.url) payload.url = depIds.url;
      }
    }

    depId = dep.dependsOnActionId;
  }

  if (
    (action.actionType === "hosting.deploy" || action.actionType === "hosting.verify_deployment") &&
    !payload.commit_sha
  ) {
    payload.commit_sha = String(payload.simulated_commit_sha ?? "simulated_commit_sha_v1");
  }
}
