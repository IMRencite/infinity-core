import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LAUNCH_GATEWAY_SIMULATION_LABEL } from "@/lib/infinity/launch-gateway/constants";
import { isExternalActionsLiveEnabled } from "@/lib/infinity/launch-gateway/kill-switch";
import {
  isGithubLiveEnabled,
  isVercelLiveEnabled,
  isLiveProviderTestMode,
} from "@/lib/infinity/launch-gateway/provider-config";

type InfinitySupabase = SupabaseClient<Database>;

export async function loadLaunchControlDiagnostics(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 30,
) {
  const liveGlobal = isExternalActionsLiveEnabled();
  const { data: plans } = await supabase
    .from("launch_plans")
    .select("id, mission_id, status, launch_readiness, estimated_total_cost, simulation_completed_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: actions } = await supabase
    .from("external_actions")
    .select(
      "id, launch_plan_id, action_type, target, execution_status, execution_mode, risk_class, estimated_cost, approval_status, verification_status, provider_execution_mode, production_artifact_id, launch_stage, provider_lifecycle_state, http_verification_status, verified_url, authorization_source, active_authorization_id, approved_payload_hash",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: authorizations } = await supabase
    .from("external_action_approvals")
    .select(
      "id, external_action_id, approval_kind, status, authorization_source, policy_key, policy_version, policy_decision, risk_class, payload_hash, max_authorized_cost, authorized_at, decision_reason",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: autonomyPolicy } = await supabase
    .from("organization_external_autonomy_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { data: handoffLinks } = await supabase
    .from("launch_handoff_links")
    .select(
      "id, venture_assembly_id, production_artifact_id, link_type, provider, repository_full_name, commit_sha, vercel_project_id, deployment_id, deployment_url, artifact_hash, metadata, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: artifacts } = await supabase
    .from("production_artifacts")
    .select("id, mission_id, venture_assembly_id, build_snapshot_id, content_hash, file_count, framework, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: resources } = await supabase
    .from("external_resources")
    .select(
      "id, resource_type, provider, canonical_name, external_url, execution_mode, status, reconciliation_state, verified_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  const mode =
    liveGlobal && (isGithubLiveEnabled() || isVercelLiveEnabled())
      ? isLiveProviderTestMode()
        ? "LIVE_TEST_MODE"
        : "LIVE_CONFIGURED"
      : "SIMULATION";

  return {
    label: LAUNCH_GATEWAY_SIMULATION_LABEL,
    mode,
    liveExecutionEnabled: liveGlobal,
    providerFlags: {
      github: isGithubLiveEnabled(),
      vercel: isVercelLiveEnabled(),
      testMode: isLiveProviderTestMode(),
    },
    launchPlans: plans ?? [],
    externalActions: actions ?? [],
    externalAuthorizations: authorizations ?? [],
    organizationAutonomyPolicy: autonomyPolicy ?? null,
    externalResources: resources ?? [],
    productionArtifacts: artifacts ?? [],
    launchHandoffLinks: handoffLinks ?? [],
  };
}
