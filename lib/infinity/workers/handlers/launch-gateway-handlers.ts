import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";
import { generateLaunchPlanFromAssembly } from "@/lib/infinity/launch-gateway/launch-plan";
import { simulateExternalActionViaGateway } from "@/lib/infinity/launch-gateway/gateway";
import { executeExternalActionViaGateway } from "@/lib/infinity/launch-gateway/execute-live";
import {
  LAUNCH_GENERATE_PLAN_CAPABILITY,
  LAUNCH_SIMULATE_ACTION_CAPABILITY,
  LAUNCH_EXECUTE_ACTION_CAPABILITY,
  LAUNCH_EVALUATE_AUTHORIZATION_CAPABILITY,
} from "@/lib/infinity/launch-gateway/constants";
import { evaluateAndApplyExternalAuthorization } from "@/lib/infinity/launch-gateway/autonomous-authorization/apply";

const SIMULATION_EXTERNAL_PERMISSIONS = [
  "network.read",
  "network.write",
  "domain.register",
  "repository.create",
  "publish.website",
];

export async function runLaunchGeneratePlan(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const ventureAssemblyId = requireStringField(input, "venture_assembly_id");
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const result = await generateLaunchPlanFromAssembly(admin, {
    organizationId: context.organizationId,
    missionId,
    ventureAssemblyId,
    correlationId: context.correlationId,
    domainCandidate:
      typeof input.domain_candidate === "string" ? input.domain_candidate : undefined,
  });

  return {
    structuredOutput: {
      launch_plan_id: result.launchPlanId,
      reused: result.reused,
      action_ids: result.actionIds,
    },
    artifactType: "qa_report",
    artifactPayload: { launch_plan_id: result.launchPlanId, layer: "launch_plan" },
  };
}

export async function runLaunchSimulateExternalAction(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const externalActionId = requireStringField(input, "external_action_id");
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const result = await simulateExternalActionViaGateway(admin, {
    organizationId: context.organizationId,
    missionId,
    externalActionId,
    requestingCapabilityKey: context.capabilityKey,
    grantedExternalPermissions: [...SIMULATION_EXTERNAL_PERMISSIONS],
    workerResultId: context.workerRunId,
    correlationId: context.correlationId,
  });

  return {
    structuredOutput: {
      external_action_id: result.externalActionId,
      execution_status: result.executionStatus,
      simulation: true,
      verified: result.verified,
      reused: result.reused,
    },
    artifactType: "qa_report",
    artifactPayload: {
      external_action_id: result.externalActionId,
      simulation: true,
      layer: "launch_gateway_simulation",
    },
  };
}

const LIVE_EXTERNAL_PERMISSIONS = [
  "network.read",
  "network.write",
  "repository.create",
  "publish.website",
];

const AUTHORIZATION_EXTERNAL_PERMISSIONS = [
  "network.read",
  "network.write",
  "domain.register",
  "repository.create",
  "publish.website",
];

export async function runLaunchEvaluateExternalAuthorization(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const externalActionId = requireStringField(input, "external_action_id");
  const intent = input.intent === "execute" ? "execute" : "simulate";
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const result = await evaluateAndApplyExternalAuthorization(admin, {
    organizationId: context.organizationId,
    missionId,
    externalActionId,
    intent,
    requestingCapabilityKey: context.capabilityKey,
    grantedExternalPermissions: [...AUTHORIZATION_EXTERNAL_PERMISSIONS],
    correlationId: context.correlationId,
  });

  return {
    structuredOutput: result,
    artifactType: "qa_report",
    artifactPayload: { layer: "external_authorization", ...result },
  };
}

export async function runLaunchExecuteExternalAction(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const externalActionId = requireStringField(input, "external_action_id");
  const liveApprovalId =
    typeof input.live_approval_id === "string" ? input.live_approval_id : undefined;
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const result = await executeExternalActionViaGateway(admin, {
    organizationId: context.organizationId,
    missionId,
    externalActionId,
    liveApprovalId,
    requestingCapabilityKey: context.capabilityKey,
    grantedExternalPermissions: [...LIVE_EXTERNAL_PERMISSIONS],
    workerResultId: context.workerRunId,
    correlationId: context.correlationId,
  });

  return {
    structuredOutput: {
      external_action_id: result.externalActionId,
      execution_status: result.executionStatus,
      execution_mode: result.executionMode,
      verified: result.verified,
      blocked: result.blocked,
      reasons: result.reasons,
    },
    artifactType: "qa_report",
    artifactPayload: {
      external_action_id: result.externalActionId,
      execution_mode: "live",
      layer: "launch_gateway_live",
    },
  };
}

export async function dispatchLaunchGatewayWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  if (context.capabilityKey === LAUNCH_GENERATE_PLAN_CAPABILITY) {
    return runLaunchGeneratePlan(admin, context);
  }
  if (context.capabilityKey === LAUNCH_SIMULATE_ACTION_CAPABILITY) {
    return runLaunchSimulateExternalAction(admin, context);
  }
  if (context.capabilityKey === LAUNCH_EVALUATE_AUTHORIZATION_CAPABILITY) {
    return runLaunchEvaluateExternalAuthorization(admin, context);
  }
  if (context.capabilityKey === LAUNCH_EXECUTE_ACTION_CAPABILITY) {
    return runLaunchExecuteExternalAction(admin, context);
  }
  return null;
}
