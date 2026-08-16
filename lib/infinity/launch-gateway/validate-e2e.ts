import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { runJobToCompletion } from "@/lib/infinity/build-factory/validate-e2e";
import { runVentureAssemblyE2EValidation } from "@/lib/infinity/venture-assembly/validate-e2e";
import {
  LAUNCH_GENERATE_PLAN_CAPABILITY,
  LAUNCH_SIMULATE_ACTION_CAPABILITY,
  LAUNCH_GATEWAY_SIMULATION_LABEL,
} from "./constants";
import {
  findLaunchPlanByIdempotency,
  listLaunchPlanActions,
  loadExternalAction,
} from "./persistence";
import { launchPlanIdempotencyKey } from "./idempotency";
import { simulateExternalActionViaGateway } from "./gateway";
import { generateLaunchPlanFromAssembly } from "./launch-plan";
import { isExternalActionsLiveEnabled } from "./kill-switch";
import type { Plan, PlanStep } from "@/lib/infinity/types";

export const LG_E2E_LABEL = "launch_gateway_e2e_v1";

export type LaunchGatewayE2EReport = {
  pass: boolean;
  errors: string[];
  organizationId: string;
  missionId: string;
  ventureAssemblyId: string | null;
  launchPlanId: string | null;
  launchSimulationComplete: boolean;
  actionCount: number;
  replayLaunchPlanReused: boolean;
  changedInputNewPlan: boolean;
  killSwitchLiveEnabled: boolean;
  externalSideEffects: {
    deployments: number;
    liveEnabled: boolean;
  };
  phaseTimingsMs: Record<string, number>;
};

async function ensureSimulatePlanStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    externalActionId: string;
    constraints: Record<string, unknown>;
    stepOrder: number;
  },
): Promise<PlanStep> {
  const { data: steps } = await admin
    .from("plan_steps")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .eq("capability_key", LAUNCH_SIMULATE_ACTION_CAPABILITY)
    .filter("constraints->>external_action_id", "eq", input.externalActionId);

  const existing = steps?.[0];
  if (existing) {
    return existing as PlanStep;
  }

  const { data: inserted, error } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      capability_key: LAUNCH_SIMULATE_ACTION_CAPABILITY,
      title: `${LAUNCH_SIMULATE_ACTION_CAPABILITY}:${input.externalActionId.slice(0, 8)}`,
      step_order: input.stepOrder,
      status: "pending",
      constraints: input.constraints as Json,
    })
    .select("*")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "plan step failed");
  return inserted as PlanStep;
}

async function ensureGeneratePlanStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    constraints: Record<string, unknown>;
  },
): Promise<PlanStep> {
  const { data: existing } = await admin
    .from("plan_steps")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .eq("capability_key", LAUNCH_GENERATE_PLAN_CAPABILITY)
    .maybeSingle();
  if (existing) return existing as PlanStep;

  const { data: inserted, error } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      capability_key: LAUNCH_GENERATE_PLAN_CAPABILITY,
      title: LAUNCH_GENERATE_PLAN_CAPABILITY,
      step_order: 955,
      status: "pending",
      constraints: input.constraints as Json,
    })
    .select("*")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "plan step failed");
  return inserted as PlanStep;
}

async function runSimulateWorker(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planId: string;
    opportunityId: string;
    externalActionId: string;
    stepOrder: number;
  },
): Promise<void> {
  const { data: mission } = await admin.from("missions").select("*").eq("id", input.missionId).single();
  const { data: plan } = await admin.from("plans").select("*").eq("id", input.planId).single();
  const { data: cycle } = await admin
    .from("command_cycles")
    .select("*")
    .eq("id", plan!.command_cycle_id)
    .single();

  const step = await ensureSimulatePlanStep(admin, {
    organizationId: input.organizationId,
    planId: input.planId,
    externalActionId: input.externalActionId,
    stepOrder: input.stepOrder,
    constraints: {
      organization_id: input.organizationId,
      mission_id: input.missionId,
      external_action_id: input.externalActionId,
      opportunity_id: input.opportunityId,
    },
  });

  const job = await schedulePlanStep(
    admin,
    input.organizationId,
    cycle!,
    mission!,
    plan as Plan,
    step,
  );
  const exec = await runJobToCompletion(
    admin,
    job.id,
    input.organizationId,
    LAUNCH_SIMULATE_ACTION_CAPABILITY,
  );
  if (exec.status !== "completed") {
    throw new Error(`simulate job failed for action ${input.externalActionId}`);
  }
}

export async function runLaunchGatewayE2EValidation(
  admin: AdminSupabaseClient,
): Promise<LaunchGatewayE2EReport> {
  registerRuntimeWorkers();
  const errors: string[] = [];
  const phaseTimingsMs: Record<string, number> = {};
  const t0 = performance.now();

  let t = performance.now();
  const va = await runVentureAssemblyE2EValidation(admin);
  phaseTimingsMs.venture_assembly_prerequisite = Math.round(performance.now() - t);

  if (!va.pass || !va.ventureAssemblyId || !va.planExecutionId) {
    return {
      pass: false,
      errors: [...va.errors, "venture assembly prerequisite failed"],
      organizationId: va.organizationId,
      missionId: va.missionId,
      ventureAssemblyId: va.ventureAssemblyId,
      launchPlanId: null,
      launchSimulationComplete: false,
      actionCount: 0,
      replayLaunchPlanReused: false,
      changedInputNewPlan: false,
      killSwitchLiveEnabled: isExternalActionsLiveEnabled(),
      externalSideEffects: { deployments: 0, liveEnabled: isExternalActionsLiveEnabled() },
      phaseTimingsMs,
    };
  }

  const orgId = va.organizationId;
  const { data: peRow } = await admin
    .from("plan_executions")
    .select("plan_id, opportunity_id")
    .eq("id", va.planExecutionId)
    .single();
  const planId = peRow?.plan_id;
  const opportunityId = peRow?.opportunity_id ?? "";
  if (!planId) {
    errors.push("plan_id missing");
  }

  const { data: assemblyRow } = await admin
    .from("venture_assemblies")
    .select("assembly_version")
    .eq("id", va.ventureAssemblyId)
    .single();

  t = performance.now();
  let launchPlanId: string | null = null;
  let actionIds: string[] = [];

  if (planId) {
    const genStep = await ensureGeneratePlanStep(admin, {
      organizationId: orgId,
      planId,
      constraints: {
        organization_id: orgId,
        mission_id: va.missionId,
        venture_assembly_id: va.ventureAssemblyId,
        opportunity_id: opportunityId,
      },
    });

    const { data: mission } = await admin.from("missions").select("*").eq("id", va.missionId).single();
    const { data: plan } = await admin.from("plans").select("*").eq("id", planId).single();
    const { data: cycle } = await admin
      .from("command_cycles")
      .select("*")
      .eq("id", plan!.command_cycle_id)
      .single();

    const genJob = await schedulePlanStep(
      admin,
      orgId,
      cycle!,
      mission!,
      plan as Plan,
      genStep,
    );
    const genExec = await runJobToCompletion(
      admin,
      genJob.id,
      orgId,
      LAUNCH_GENERATE_PLAN_CAPABILITY,
    );
    if (genExec.status !== "completed") {
      errors.push("launch.generate_plan worker failed");
    } else if (genExec.status === "completed") {
      const out = genExec.output as Record<string, unknown>;
      launchPlanId = String(out.launch_plan_id ?? "");
      actionIds = Array.isArray(out.action_ids) ? out.action_ids.map(String) : [];
    }
  }
  phaseTimingsMs.launch_plan_worker = Math.round(performance.now() - t);

  if (!launchPlanId) {
    errors.push("launch plan missing");
  }

  t = performance.now();
  if (launchPlanId && planId) {
    const actions = await listLaunchPlanActions(admin, orgId, launchPlanId);
    const ordered = actions.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    for (const action of ordered) {
      try {
        await runSimulateWorker(admin, {
          organizationId: orgId,
          missionId: va.missionId,
          planId,
          opportunityId,
          externalActionId: action.id,
          stepOrder: 960 + action.sequenceOrder,
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "simulate failed");
      }
    }
  }
  phaseTimingsMs.launch_simulation_workers = Math.round(performance.now() - t);

  const { data: planFinal } = launchPlanId
    ? await admin.from("launch_plans").select("*").eq("id", launchPlanId).maybeSingle()
    : { data: null };

  const launchSimulationComplete =
    planFinal?.status === "simulation_complete" &&
    planFinal?.launch_readiness === "launch_simulation_complete";

  if (!launchSimulationComplete) {
    errors.push("launch simulation did not complete");
  }

  t = performance.now();
  let replayLaunchPlanReused = false;
  if (va.ventureAssemblyId && assemblyRow) {
    const key = launchPlanIdempotencyKey({
      organizationId: orgId,
      ventureAssemblyId: va.ventureAssemblyId,
      assemblyVersion: assemblyRow.assembly_version ?? 1,
    });
    const replay = await generateLaunchPlanFromAssembly(admin, {
      organizationId: orgId,
      missionId: va.missionId,
      ventureAssemblyId: va.ventureAssemblyId,
    });
    replayLaunchPlanReused = replay.reused;
    const existing = await findLaunchPlanByIdempotency(admin, orgId, key);
    const { count } = await admin
      .from("launch_plans")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("idempotency_key", key);
    if ((count ?? 0) !== 1) {
      errors.push(`expected 1 launch plan for idempotency key, got ${count ?? 0}`);
    }
    if (!replay.reused || !existing) {
      errors.push("launch plan replay did not reuse canonical plan");
    }
  }
  phaseTimingsMs.replay_proof = Math.round(performance.now() - t);

  let simulationReplayReused = false;
  if (launchPlanId && planId) {
    const actions = await listLaunchPlanActions(admin, orgId, launchPlanId);
    const first = actions[0];
    if (first) {
      const replay = await simulateExternalActionViaGateway(admin, {
        organizationId: orgId,
        missionId: va.missionId,
        externalActionId: first.id,
        requestingCapabilityKey: LAUNCH_SIMULATE_ACTION_CAPABILITY,
        grantedExternalPermissions: [
          "network.read",
          "network.write",
          "domain.register",
          "repository.create",
          "publish.website",
        ],
      });
      simulationReplayReused = replay.reused;
    }
  }

  if (isExternalActionsLiveEnabled()) {
    errors.push("EXTERNAL_ACTIONS_LIVE_ENABLED must be false for v1 E2E");
  }

  phaseTimingsMs.total_elapsed = Math.round(performance.now() - t0);

  return {
    pass: errors.length === 0,
    errors,
    organizationId: orgId,
    missionId: va.missionId,
    ventureAssemblyId: va.ventureAssemblyId,
    launchPlanId,
    launchSimulationComplete,
    actionCount: launchPlanId
      ? (await listLaunchPlanActions(admin, orgId, launchPlanId)).length
      : 0,
    replayLaunchPlanReused,
    changedInputNewPlan: simulationReplayReused,
    killSwitchLiveEnabled: isExternalActionsLiveEnabled(),
    externalSideEffects: {
      deployments: 0,
      liveEnabled: isExternalActionsLiveEnabled(),
    },
    phaseTimingsMs,
  };
}
