import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { runVentureAssemblyE2EValidation } from "@/lib/infinity/venture-assembly/validate-e2e";
import { ensureLiveLaunchPlanForAssembly } from "./live-launch-plan";
import { listLaunchPlanActions } from "./persistence";
import { evaluateAndApplyExternalAuthorization } from "./autonomous-authorization/apply";
import { simulateExternalActionViaGateway } from "./gateway";
import { LAUNCH_SIMULATE_ACTION_CAPABILITY } from "./constants";
import { upsertOrganizationAutonomyPolicyForDevelopment } from "./autonomous-authorization/organization-policy";
import { AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV } from "./autonomous-authorization/constants";
import { isExternalActionsLiveEnabled } from "./kill-switch";

export const AUTONOMOUS_AUTH_E2E_LABEL = "autonomous_external_authorization_e2e_v1";

export type AutonomousAuthorizationE2EReport = {
  pass: boolean;
  errors: string[];
  organizationId: string;
  missionId: string;
  ventureAssemblyId: string | null;
  launchPlanId: string | null;
  launchSimulationComplete: boolean;
  actionCount: number;
  authorizationSources: string[];
};

const PERMS = [
  "network.read",
  "network.write",
  "domain.register",
  "repository.create",
  "publish.website",
];

export async function runAutonomousExternalAuthorizationE2EValidation(
  admin: AdminSupabaseClient,
): Promise<AutonomousAuthorizationE2EReport> {
  registerRuntimeWorkers();
  const errors: string[] = [];

  const va = await runVentureAssemblyE2EValidation(admin);
  if (!va.pass || !va.ventureAssemblyId) {
    return {
      pass: false,
      errors: [...va.errors, "venture_assembly_prerequisite_failed"],
      organizationId: va.organizationId,
      missionId: va.missionId,
      ventureAssemblyId: va.ventureAssemblyId,
      launchPlanId: null,
      launchSimulationComplete: false,
      actionCount: 0,
      authorizationSources: [],
    };
  }

  process.env[AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV] = va.organizationId;
  await upsertOrganizationAutonomyPolicyForDevelopment(admin, va.organizationId);

  const { data: assemblyRow } = await admin
    .from("venture_assemblies")
    .select("production_artifact_id")
    .eq("id", va.ventureAssemblyId)
    .maybeSingle();

  if (!assemblyRow?.production_artifact_id) {
    errors.push("production_artifact_missing_on_assembly");
  }

  const ownerLogin = process.env.GITHUB_OWNER?.trim() || "infinity-live-test";
  const repoSlug = `autonomous-e2e-${va.ventureAssemblyId.slice(0, 8)}`;

  let launchPlanId: string | null = null;
  let actionIds: string[] = [];

  try {
    const live = await ensureLiveLaunchPlanForAssembly(admin, {
      organizationId: va.organizationId,
      missionId: va.missionId,
      ventureAssemblyId: va.ventureAssemblyId,
      ownerLogin,
      repoSlug,
    });
    launchPlanId = live.launchPlanId;
    actionIds = live.actionIds;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "live_launch_plan_failed");
  }

  const authorizationSources: string[] = [];

  if (launchPlanId) {
    const actions = await listLaunchPlanActions(admin, va.organizationId, launchPlanId);
    const ordered = [...actions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    for (const action of ordered) {
      const auth = await evaluateAndApplyExternalAuthorization(admin, {
        organizationId: va.organizationId,
        missionId: va.missionId,
        externalActionId: action.id,
        intent: "simulate",
        requestingCapabilityKey: "launch.evaluate_external_authorization",
        grantedExternalPermissions: PERMS,
      });

      if (auth.decision !== "AUTO_AUTHORIZE") {
        errors.push(`expected AUTO_AUTHORIZE for ${action.actionType}, got ${auth.decision}`);
      }

      const { data: approval } = await admin
        .from("external_action_approvals")
        .select("authorization_source")
        .eq("organization_id", va.organizationId)
        .eq("external_action_id", action.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      authorizationSources.push(String(approval?.authorization_source ?? "missing"));

      try {
        await simulateExternalActionViaGateway(admin, {
          organizationId: va.organizationId,
          missionId: va.missionId,
          externalActionId: action.id,
          requestingCapabilityKey: LAUNCH_SIMULATE_ACTION_CAPABILITY,
          grantedExternalPermissions: PERMS,
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `simulate_failed:${action.actionType}`);
      }
    }
  }

  const { data: planFinal } = launchPlanId
    ? await admin.from("launch_plans").select("*").eq("id", launchPlanId).maybeSingle()
    : { data: null };

  const launchSimulationComplete =
    planFinal?.status === "simulation_complete" &&
    planFinal?.launch_readiness === "launch_simulation_complete";

  if (!launchSimulationComplete) {
    errors.push("launch_simulation_not_complete");
  }

  if (authorizationSources.some((s) => s !== "autonomous_policy")) {
    errors.push("not_all_authorizations_autonomous_policy");
  }

  if (isExternalActionsLiveEnabled()) {
    errors.push("live_must_be_disabled_for_e2e");
  }

  return {
    pass: errors.length === 0,
    errors,
    organizationId: va.organizationId,
    missionId: va.missionId,
    ventureAssemblyId: va.ventureAssemblyId,
    launchPlanId,
    launchSimulationComplete,
    actionCount: actionIds.length,
    authorizationSources,
  };
}
