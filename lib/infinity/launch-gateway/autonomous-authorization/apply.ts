import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { hashPayloadManifest } from "../resource-registry";
import { evaluateAutonomousExternalAuthorization } from "./evaluate";
import {
  invalidateStaleAutonomousAuthorizations,
  persistAutonomousAuthorization,
  findReusableAutonomousAuthorization,
} from "./persist";
import { emitLaunchGatewayEvent } from "../events";
import { LAUNCH_GATEWAY_EVENTS } from "../constants";
import { updateExternalAction } from "../persistence";
import type { Json } from "@/lib/supabase/database.types";

export type ApplyAuthorizationResult = {
  externalActionId: string;
  decision: string;
  authorizationId: string | null;
  executionStatus: string;
  reused: boolean;
  explanations: string[];
};

export async function evaluateAndApplyExternalAuthorization(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    externalActionId: string;
    intent: "simulate" | "execute";
    requestingCapabilityKey: string;
    grantedExternalPermissions: string[];
    correlationId?: string | null;
  },
): Promise<ApplyAuthorizationResult> {
  const { data: actionRow } = await admin
    .from("external_actions")
    .select("payload_manifest, launch_plan_id, venture_id, adapter_key")
    .eq("organization_id", input.organizationId)
    .eq("id", input.externalActionId)
    .maybeSingle();

  const payload = (actionRow?.payload_manifest ?? {}) as Record<string, unknown>;
  const payloadHash = hashPayloadManifest(payload);
  const approvalKind = input.intent === "execute" ? "execute_external" : "simulate";

  await invalidateStaleAutonomousAuthorizations(admin, {
    organizationId: input.organizationId,
    externalActionId: input.externalActionId,
    currentPayloadHash: payloadHash,
  });

  const reused = await findReusableAutonomousAuthorization(admin, {
    organizationId: input.organizationId,
    externalActionId: input.externalActionId,
    approvalKind,
    payloadHash,
  });

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: LAUNCH_GATEWAY_EVENTS.externalActionAuthorizationEvaluated,
    message: "External action authorization evaluated",
    externalActionId: input.externalActionId,
    missionId: input.missionId,
    correlationId: input.correlationId,
  });

  if (reused) {
    const nextStatus = input.intent === "execute" ? "execution_ready" : "simulation_ready";
    await updateExternalAction(admin, input.organizationId, input.externalActionId, {
      execution_status: nextStatus,
      approval_status: "approved",
      authorization_source: "autonomous_policy",
      active_authorization_id: reused.id,
      approved_at: new Date().toISOString(),
      approved_payload_hash: payloadHash,
    });
    return {
      externalActionId: input.externalActionId,
      decision: "AUTO_AUTHORIZE",
      authorizationId: reused.id,
      executionStatus: nextStatus,
      reused: true,
      explanations: ["authorization_reused"],
    };
  }

  const evaluation = await evaluateAutonomousExternalAuthorization(admin, input);

  if (evaluation.decision === "BLOCK") {
    await updateExternalAction(admin, input.organizationId, input.externalActionId, {
      execution_status: "blocked",
      approval_status: "rejected",
      authorization_source: "denied",
      error: evaluation.evidence.explanations.join(";").slice(0, 500),
      audit_snapshot: {
        policy_decision: evaluation.decision,
        policy_key: evaluation.policyKey,
        policy_version: evaluation.policyVersion,
        explanations: evaluation.evidence.explanations,
      } as Json,
    });
    await emitLaunchGatewayEvent(admin, {
      organizationId: input.organizationId,
      eventType: LAUNCH_GATEWAY_EVENTS.externalActionAuthorizationBlocked,
      message: "External action authorization blocked",
      externalActionId: input.externalActionId,
      missionId: input.missionId,
    });
    return {
      externalActionId: input.externalActionId,
      decision: evaluation.decision,
      authorizationId: null,
      executionStatus: "blocked",
      reused: false,
      explanations: evaluation.evidence.explanations,
    };
  }

  if (evaluation.decision === "REQUIRE_HUMAN_APPROVAL") {
    await updateExternalAction(admin, input.organizationId, input.externalActionId, {
      execution_status: "awaiting_approval",
      approval_status: "pending",
      authorization_source: null,
      error: evaluation.evidence.explanations.join(";").slice(0, 500),
      audit_snapshot: {
        policy_decision: evaluation.decision,
        policy_key: evaluation.policyKey,
        policy_version: evaluation.policyVersion,
        explanations: evaluation.evidence.explanations,
      } as Json,
    });
    await emitLaunchGatewayEvent(admin, {
      organizationId: input.organizationId,
      eventType: LAUNCH_GATEWAY_EVENTS.externalActionHumanApprovalRequired,
      message: "Human approval required for external action",
      externalActionId: input.externalActionId,
      missionId: input.missionId,
    });
    return {
      externalActionId: input.externalActionId,
      decision: evaluation.decision,
      authorizationId: null,
      executionStatus: "awaiting_approval",
      reused: false,
      explanations: evaluation.evidence.explanations,
    };
  }

  const authorizationId = await persistAutonomousAuthorization(admin, {
    organizationId: input.organizationId,
    externalActionId: input.externalActionId,
    launchPlanId: actionRow?.launch_plan_id ? String(actionRow.launch_plan_id) : null,
    ventureId: actionRow?.venture_id ? String(actionRow.venture_id) : null,
    approvalKind,
    evaluation,
    correlationId: input.correlationId,
    provider: actionRow?.adapter_key ? String(actionRow.adapter_key) : null,
  });

  const nextStatus = input.intent === "execute" ? "execution_ready" : "simulation_ready";
  await updateExternalAction(admin, input.organizationId, input.externalActionId, {
    execution_status: nextStatus,
    approval_status: "approved",
    authorization_source: "autonomous_policy",
    active_authorization_id: authorizationId,
    approved_at: new Date().toISOString(),
    approved_payload_hash: payloadHash,
    audit_snapshot: {
      policy_decision: evaluation.decision,
      policy_key: evaluation.policyKey,
      policy_version: evaluation.policyVersion,
      explanations: evaluation.evidence.explanations,
    } as Json,
  });

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: LAUNCH_GATEWAY_EVENTS.externalActionAutoAuthorized,
    message: "External action auto-authorized by policy",
    externalActionId: input.externalActionId,
    missionId: input.missionId,
  });

  return {
    externalActionId: input.externalActionId,
    decision: evaluation.decision,
    authorizationId,
    executionStatus: nextStatus,
    reused: false,
    explanations: evaluation.evidence.explanations,
  };
}
