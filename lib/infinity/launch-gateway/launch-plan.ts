import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import {
  LAUNCH_GATEWAY_EVENTS,
  LAUNCH_PLAN_SCHEMA_VERSION,
  MOCK_PROVIDER_KEY,
} from "./constants";
import { resolveActionType } from "./action-registry";
import { classifyRisk } from "./action-registry";
import { credentialRequirementForScope } from "./credentials";
import {
  externalActionIdempotencyKey,
  launchPlanIdempotencyKey,
  stablePayloadHash,
} from "./idempotency";
import {
  findLaunchPlanByIdempotency,
  insertExternalAction,
  insertLaunchPlan,
  listLaunchPlanActions,
  findExternalActionByIdempotency,
} from "./persistence";
import { emitLaunchGatewayEvent } from "./events";

export type LaunchPlanStepSpec = {
  actionType: string;
  target: string;
  sequenceOrder: number;
  dependsOnSequence: number | null;
  payload: Record<string, unknown>;
};

export async function generateLaunchPlanFromAssembly(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    ventureAssemblyId: string;
    correlationId?: string | null;
    domainCandidate?: string;
  },
): Promise<{ launchPlanId: string; reused: boolean; actionIds: string[] }> {
  const assembly = await loadVentureAssemblyById(
    admin,
    input.organizationId,
    input.ventureAssemblyId,
  );
  if (!assembly) {
    throw new Error("Venture assembly not found");
  }
  if (assembly.missionId !== input.missionId) {
    throw new Error("Mission mismatch");
  }
  if (assembly.status !== "internally_ready") {
    throw new Error("Venture assembly must be internally_ready");
  }

  const idempotencyKey = launchPlanIdempotencyKey({
    organizationId: input.organizationId,
    ventureAssemblyId: input.ventureAssemblyId,
    assemblyVersion: assembly.assemblyVersion,
  });

  const existing = await findLaunchPlanByIdempotency(admin, input.organizationId, idempotencyKey);
  if (existing) {
    const actions = await listLaunchPlanActions(admin, input.organizationId, existing.id);
    return {
      launchPlanId: existing.id,
      reused: true,
      actionIds: actions.map((a) => a.id),
    };
  }

  const identity = assembly.identityPackage as Record<string, unknown>;
  const domains = (identity.candidateDomainNames as string[]) ?? ["venture.example"];
  const domainTarget = input.domainCandidate ?? domains[0] ?? "venture.example";

  const steps: LaunchPlanStepSpec[] = [
    {
      actionType: "domain.register",
      target: domainTarget,
      sequenceOrder: 1,
      dependsOnSequence: null,
      payload: { candidate: domainTarget },
    },
    {
      actionType: "hosting.create_project",
      target: `project-${domainTarget}`,
      sequenceOrder: 2,
      dependsOnSequence: 1,
      payload: { domain: domainTarget },
    },
    {
      actionType: "repository.create",
      target: `repo-${domainTarget}`,
      sequenceOrder: 3,
      dependsOnSequence: 2,
      payload: { domain: domainTarget },
    },
    {
      actionType: "hosting.deploy",
      target: domainTarget,
      sequenceOrder: 4,
      dependsOnSequence: 2,
      payload: { domain: domainTarget, build_id: assembly.buildId },
    },
    {
      actionType: "analytics.configure",
      target: domainTarget,
      sequenceOrder: 5,
      dependsOnSequence: 4,
      payload: { domain: domainTarget },
    },
  ];

  const plan = await insertLaunchPlan(admin, {
    organization_id: input.organizationId,
    mission_id: input.missionId,
    venture_assembly_id: input.ventureAssemblyId,
    company_id: assembly.companyId,
    plan_version: 1,
    assembly_version: assembly.assemblyVersion,
    schema_version: LAUNCH_PLAN_SCHEMA_VERSION,
    status: "ready",
    launch_readiness: "launch_plan_ready",
    estimated_total_cost: 12,
    idempotency_key: idempotencyKey,
    correlation_id: input.correlationId ?? null,
    dependency_graph: { steps: steps.length } as Json,
  });

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: LAUNCH_GATEWAY_EVENTS.launchPlanCreated,
    message: "Launch plan created",
    correlationId: input.correlationId,
    missionId: input.missionId,
    launchPlanId: plan.id,
  });

  const actionIds: string[] = [];
  const sequenceToId = new Map<number, string>();

  for (const step of steps) {
    const def = resolveActionType(step.actionType);
    if (!def) {
      throw new Error(`Unknown action type ${step.actionType}`);
    }
    const payloadHash = stablePayloadHash(step.payload);
    const actionKey = externalActionIdempotencyKey({
      organizationId: input.organizationId,
      ventureAssemblyId: input.ventureAssemblyId,
      assemblyVersion: assembly.assemblyVersion,
      launchPlanVersion: plan.planVersion,
      actionType: step.actionType,
      target: step.target,
      payloadHash,
    });

    const dup = await findExternalActionByIdempotency(
      admin,
      input.organizationId,
      actionKey,
    );
    if (dup) {
      actionIds.push(dup.id);
      sequenceToId.set(step.sequenceOrder, dup.id);
      continue;
    }

    const dependsOn =
      step.dependsOnSequence != null ? sequenceToId.get(step.dependsOnSequence) ?? null : null;

    const row = await insertExternalAction(admin, {
      organization_id: input.organizationId,
      mission_id: input.missionId,
      venture_id: assembly.companyId,
      venture_assembly_id: input.ventureAssemblyId,
      launch_plan_id: plan.id,
      plan_execution_id: assembly.planExecutionId,
      action_type: step.actionType,
      provider: MOCK_PROVIDER_KEY,
      adapter_key: MOCK_PROVIDER_KEY,
      target: step.target,
      payload_manifest: step.payload as Json,
      side_effect_class: def.sideEffectClass,
      risk_class: classifyRisk(def, def.estimatedCostUsd),
      estimated_cost: def.estimatedCostUsd ?? 0,
      credential_requirement: credentialRequirementForScope(def.credentialScope) as Json,
      credential_status: def.credentialScope ? "mock" : "not_required",
      execution_status: "simulation_ready",
      approval_status: "approved",
      approval_policy: "simulation_auto",
      idempotency_key: actionKey,
      correlation_id: input.correlationId ?? null,
      sequence_order: step.sequenceOrder,
      depends_on_action_id: dependsOn,
      rollback_supported: def.supportsRollback,
      policy_version: "launch_gateway_policy_v1",
    });

    actionIds.push(row.id);
    sequenceToId.set(step.sequenceOrder, row.id);

    await emitLaunchGatewayEvent(admin, {
      organizationId: input.organizationId,
      eventType: LAUNCH_GATEWAY_EVENTS.externalActionRequested,
      message: `External action requested: ${step.actionType}`,
      correlationId: input.correlationId,
      missionId: input.missionId,
      launchPlanId: plan.id,
      externalActionId: row.id,
    });
  }

  return { launchPlanId: plan.id, reused: false, actionIds };
}
