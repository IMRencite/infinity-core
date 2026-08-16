import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { AuthorizationEvaluationResult } from "./evaluate";

export function authorizationIdempotencyKey(input: {
  externalActionId: string;
  approvalKind: string;
  payloadHash: string;
}): string {
  return ["autonomous_auth", input.externalActionId, input.approvalKind, input.payloadHash].join(":");
}

export async function invalidateStaleAutonomousAuthorizations(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    externalActionId: string;
    currentPayloadHash: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("external_action_approvals")
    .update({ status: "expired", invalidated_at: now })
    .eq("organization_id", input.organizationId)
    .eq("external_action_id", input.externalActionId)
    .eq("authorization_source", "autonomous_policy")
    .eq("status", "approved")
    .neq("payload_hash", input.currentPayloadHash);
}

export async function findReusableAutonomousAuthorization(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    externalActionId: string;
    approvalKind: string;
    payloadHash: string;
  },
): Promise<{ id: string } | null> {
  const idempotencyKey = authorizationIdempotencyKey({
    externalActionId: input.externalActionId,
    approvalKind: input.approvalKind,
    payloadHash: input.payloadHash,
  });
  const { data } = await admin
    .from("external_action_approvals")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .eq("authorization_source", "autonomous_policy")
    .eq("status", "approved")
    .is("invalidated_at", null)
    .maybeSingle();
  return data ? { id: String(data.id) } : null;
}

export async function persistAutonomousAuthorization(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    externalActionId: string;
    launchPlanId: string | null;
    ventureId: string | null;
    approvalKind: "simulate" | "execute_external";
    evaluation: AuthorizationEvaluationResult;
    correlationId?: string | null;
    provider?: string | null;
  },
): Promise<string> {
  const payloadHash = input.evaluation.evidence.payloadHash ?? "";
  const idempotencyKey = authorizationIdempotencyKey({
    externalActionId: input.externalActionId,
    approvalKind: input.approvalKind,
    payloadHash,
  });

  const reused = await findReusableAutonomousAuthorization(admin, {
    organizationId: input.organizationId,
    externalActionId: input.externalActionId,
    approvalKind: input.approvalKind,
    payloadHash,
  });
  if (reused) return reused.id;

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("external_action_approvals")
    .insert({
      organization_id: input.organizationId,
      external_action_id: input.externalActionId,
      launch_plan_id: input.launchPlanId,
      venture_id: input.ventureId,
      approval_kind: input.approvalKind,
      status: input.evaluation.decision === "AUTO_AUTHORIZE" ? "approved" : "rejected",
      authorization_source:
        input.evaluation.decision === "AUTO_AUTHORIZE" ? "autonomous_policy" : "denied",
      policy_key: input.evaluation.policyKey,
      policy_version: input.evaluation.policyVersion,
      policy_decision: input.evaluation.decision,
      payload_hash: payloadHash,
      provider: input.provider ?? null,
      max_authorized_cost: Number(
        (input.evaluation.evidence.costEvaluation.estimatedCostUsd as number | undefined) ?? 0,
      ),
      risk_class: input.evaluation.evidence.riskClass,
      side_effect_class: input.evaluation.evidence.sideEffectClass,
      cost_evaluation: input.evaluation.evidence.costEvaluation as Json,
      capability_evaluation: input.evaluation.evidence.capabilityEvaluation as Json,
      credential_evaluation: input.evaluation.evidence.credentialEvaluation as Json,
      artifact_evaluation: input.evaluation.evidence.artifactEvaluation as Json,
      decision_reason: input.evaluation.evidence.explanations as Json,
      authorized_at: input.evaluation.decision === "AUTO_AUTHORIZE" ? now : null,
      decided_at: now,
      correlation_id: input.correlationId ?? null,
      idempotency_key: idempotencyKey,
      reason: input.evaluation.evidence.explanations.join(";").slice(0, 500),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "autonomous_authorization_persist_failed");
  }
  return String(data.id);
}
