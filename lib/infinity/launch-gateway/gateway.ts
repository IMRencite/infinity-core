import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { resolveActionType, classifyRisk } from "./action-registry";
import { defaultCredentialResolver } from "./credentials";
import { evaluateActionCost, evaluateExternalActionPolicy } from "./policy";
import { assertLiveExecutionBlockedV1, isExternalActionsLiveEnabled } from "./kill-switch";
import {
  LAUNCH_GATEWAY_EVENTS,
  LAUNCH_GATEWAY_POLICY_VERSION,
  MOCK_PROVIDER_KEY,
} from "./constants";
import { resolveAdapter } from "./adapters/registry";
import {
  claimExternalAction,
  loadExternalAction,
  updateExternalAction,
  updateLaunchPlan,
  listLaunchPlanActions,
} from "./persistence";
import { emitLaunchGatewayEvent } from "./events";
import { resolveSimulationAuthorization } from "./autonomous-authorization/resolve-authorization";
import { enrichExternalActionPayloadFromDependencies } from "./payload-enrichment";

export type GatewaySimulateResult = {
  externalActionId: string;
  executionStatus: string;
  simulation: true;
  verified: boolean;
  reused: boolean;
};

const MAX_SIMULATION_BUDGET_USD = 50;

export async function simulateExternalActionViaGateway(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    externalActionId: string;
    requestingCapabilityKey: string;
    grantedExternalPermissions: string[];
    workerResultId?: string | null;
    correlationId?: string | null;
  },
): Promise<GatewaySimulateResult> {
  assertLiveExecutionBlockedV1();

  const action = await loadExternalAction(
    admin,
    input.organizationId,
    input.externalActionId,
  );
  if (!action) {
    throw new Error("External action not found");
  }
  if (action.missionId !== input.missionId) {
    throw new Error("Organization isolation: mission mismatch");
  }

  if (action.executionStatus === "simulated" && action.resultManifest) {
    return {
      externalActionId: action.id,
      executionStatus: action.executionStatus,
      simulation: true,
      verified: action.verificationStatus === "verified",
      reused: true,
    };
  }

  const { data: payloadRow } = await admin
    .from("external_actions")
    .select("payload_manifest, approval_policy")
    .eq("id", action.id)
    .maybeSingle();
  const payloadForAuth = (payloadRow?.payload_manifest ?? {}) as Record<string, unknown>;
  const simAuth = await resolveSimulationAuthorization(admin, {
    organizationId: input.organizationId,
    externalActionId: action.id,
    payloadManifest: payloadForAuth,
  });
  const requiresExplicitAuth = payloadRow?.approval_policy !== "simulation_auto";
  if (requiresExplicitAuth && action.executionStatus !== "simulation_ready") {
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "awaiting_approval",
      error: simAuth.reasons.join(";") || "simulation_authorization_required",
    });
    throw new Error("Simulation requires valid authorization");
  }

  if (action.dependsOnActionId) {
    const dep = await loadExternalAction(
      admin,
      input.organizationId,
      action.dependsOnActionId,
    );
    if (!dep || dep.executionStatus !== "simulated") {
      await updateExternalAction(admin, input.organizationId, action.id, {
        execution_status: "blocked",
        error: "dependency_not_simulated",
      });
      throw new Error("Dependency action not simulated");
    }
  }

  const claimed = await claimExternalAction(
    admin,
    input.organizationId,
    action.id,
    input.requestingCapabilityKey,
  );
  if (!claimed) {
    const refreshed = await loadExternalAction(
      admin,
      input.organizationId,
      action.id,
    );
    if (refreshed?.executionStatus === "simulated") {
      return {
        externalActionId: action.id,
        executionStatus: "simulated",
        simulation: true,
        verified: refreshed.verificationStatus === "verified",
        reused: true,
      };
    }
    throw new Error("Could not claim external action for simulation");
  }

  const def = resolveActionType(action.actionType);
  const assembly = action.ventureAssemblyId
    ? await loadVentureAssemblyById(admin, input.organizationId, action.ventureAssemblyId)
    : null;

  const permissionOk =
    !def?.requiredPermission ||
    input.grantedExternalPermissions.includes(def.requiredPermission);

  const costEval = evaluateActionCost({
    estimatedCost: null,
    registryDefault: def?.estimatedCostUsd ?? null,
    maxAuthorizedCost: MAX_SIMULATION_BUDGET_USD,
  });

  const policy = evaluateExternalActionPolicy({
    organizationId: input.organizationId,
    actionType: action.actionType,
    actionDef: def,
    sideEffectClass: def?.sideEffectClass ?? null,
    riskClass: def ? classifyRisk(def, costEval.estimatedCost) : null,
    estimatedCost: costEval.estimatedCost,
    maxAuthorizedCost: MAX_SIMULATION_BUDGET_USD,
    capabilityPermissionGranted: permissionOk,
    assemblyInternallyReady: assembly?.status === "internally_ready",
    intent: "simulate",
  });

  const auditSnapshot = {
    policy_version: LAUNCH_GATEWAY_POLICY_VERSION,
    policy_outcome: policy.outcome,
    policy_reasons: policy.reasons,
    cost: costEval,
    risk_class: def ? classifyRisk(def, costEval.estimatedCost) : null,
    side_effect_class: def?.sideEffectClass ?? null,
    capability: input.requestingCapabilityKey,
    permissions: input.grantedExternalPermissions,
    live_enabled: isExternalActionsLiveEnabled(),
    worker_result_id: input.workerResultId ?? null,
  };

  if (policy.outcome === "blocked" || costEval.gate === "blocked") {
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "blocked",
      error: [...policy.reasons, costEval.gate].join(";"),
      audit_snapshot: auditSnapshot as Json,
      claimed_by: null,
      claimed_at: null,
    });
    await emitLaunchGatewayEvent(admin, {
      organizationId: input.organizationId,
      eventType: LAUNCH_GATEWAY_EVENTS.externalActionBlocked,
      message: "External action blocked by policy",
      externalActionId: action.id,
      missionId: input.missionId,
    });
    throw new Error(`Gateway blocked: ${policy.reasons.join(",")}`);
  }

  const { data: fullRow } = await admin
    .from("external_actions")
    .select("target, payload_manifest, adapter_key")
    .eq("id", action.id)
    .single();

  const adapterKey = fullRow?.adapter_key ?? MOCK_PROVIDER_KEY;
  const adapter = resolveAdapter(String(adapterKey));

  const ctx = {
    organizationId: input.organizationId,
    actionType: action.actionType,
    target: fullRow?.target ?? action.target,
    payload: (fullRow?.payload_manifest as Record<string, unknown>) ?? {},
    correlationId: input.correlationId ?? null,
  };

  await enrichExternalActionPayloadFromDependencies(admin, input.organizationId, action, ctx.payload);

  const validation = await adapter.validate(ctx);
  if (!validation.valid) {
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "failed",
      error: validation.issues.join(";"),
      failed_at: new Date().toISOString(),
      audit_snapshot: auditSnapshot as Json,
    });
    throw new Error(`Adapter validation failed: ${validation.issues.join(",")}`);
  }

  const credReq = def?.credentialScope
    ? await defaultCredentialResolver.resolve(
        `mock://${def.credentialScope}/e2e`,
        input.organizationId,
      )
    : null;
  if (def?.credentialScope && credReq?.status !== "mock" && credReq?.status !== "valid") {
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "blocked",
      error: "credential_missing",
      audit_snapshot: auditSnapshot as Json,
    });
    throw new Error("Credential requirement not satisfied");
  }

  await updateExternalAction(admin, input.organizationId, action.id, {
    execution_status: "simulating",
    approval_status: "approved",
    approved_at: new Date().toISOString(),
  });

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: LAUNCH_GATEWAY_EVENTS.externalActionSimulationStarted,
    message: "Simulation started",
    externalActionId: action.id,
    missionId: input.missionId,
    correlationId: input.correlationId,
  });

  const simulation = await adapter.simulate(ctx);
  const verification = await adapter.verify(ctx, simulation);

  await updateExternalAction(admin, input.organizationId, action.id, {
    execution_status: verification.verified ? "simulated" : "failed",
    verification_status: verification.verified ? "verified" : "failed",
    result_manifest: {
      ...simulation.manifest,
      external_ids: simulation.externalIds,
    } as Json,
    executed_at: new Date().toISOString(),
    error: verification.verified ? null : verification.details.join(";"),
    audit_snapshot: {
      ...auditSnapshot,
      verification,
      simulation: true,
    } as Json,
    claimed_by: null,
    claimed_at: null,
  });

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: verification.verified
      ? LAUNCH_GATEWAY_EVENTS.externalActionSimulated
      : LAUNCH_GATEWAY_EVENTS.externalActionFailed,
    message: verification.verified ? "Simulation verified" : "Simulation verification failed",
    externalActionId: action.id,
    missionId: input.missionId,
  });

  if (action.launchPlanId && verification.verified) {
    const siblings = await listLaunchPlanActions(
      admin,
      input.organizationId,
      action.launchPlanId,
    );
    const allSimulated = siblings.every((s) => s.executionStatus === "simulated");
    if (allSimulated) {
      await updateLaunchPlan(admin, input.organizationId, action.launchPlanId, {
        status: "simulation_complete",
        launch_readiness: "launch_simulation_complete",
        simulation_completed_at: new Date().toISOString(),
      });
      await emitLaunchGatewayEvent(admin, {
        organizationId: input.organizationId,
        eventType: LAUNCH_GATEWAY_EVENTS.launchSimulationCompleted,
        message: "Launch simulation complete — not live",
        launchPlanId: action.launchPlanId,
        missionId: input.missionId,
      });
    }
  }

  return {
    externalActionId: action.id,
    executionStatus: verification.verified ? "simulated" : "failed",
    simulation: true,
    verified: verification.verified,
    reused: false,
  };
}
