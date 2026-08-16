import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { hashPayloadManifest } from "../resource-registry";

export async function resolveExecutionAuthorization(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    externalActionId: string;
    liveApprovalId?: string | null;
    payloadManifest: Record<string, unknown>;
    approvalKind?: "execute_external" | "simulate";
  },
): Promise<{ authorized: boolean; source: "human" | "autonomous_policy" | null; approvalId: string | null; reasons: string[] }> {
  const reasons: string[] = [];
  const payloadHash = hashPayloadManifest(input.payloadManifest);
  const kind = input.approvalKind ?? "execute_external";

  if (input.liveApprovalId) {
    const { data: approval } = await admin
      .from("external_action_approvals")
      .select("*")
      .eq("id", input.liveApprovalId)
      .eq("organization_id", input.organizationId)
      .eq("external_action_id", input.externalActionId)
      .eq("approval_kind", kind)
      .eq("status", "approved")
      .maybeSingle();

    if (!approval) {
      reasons.push("human_approval_not_found");
      return { authorized: false, source: null, approvalId: null, reasons };
    }
    if (approval.expires_at && Date.parse(approval.expires_at) < Date.now()) {
      reasons.push("human_approval_expired");
      return { authorized: false, source: null, approvalId: null, reasons };
    }
    if (approval.payload_hash && approval.payload_hash !== payloadHash) {
      reasons.push("human_approval_payload_mismatch");
      return { authorized: false, source: null, approvalId: null, reasons };
    }
    const source =
      approval.authorization_source === "autonomous_policy"
        ? "autonomous_policy"
        : "human";
    return { authorized: true, source, approvalId: String(approval.id), reasons: [] };
  }

  const { data: autonomous } = await admin
    .from("external_action_approvals")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("external_action_id", input.externalActionId)
    .eq("approval_kind", kind)
    .eq("authorization_source", "autonomous_policy")
    .eq("status", "approved")
    .eq("policy_decision", "AUTO_AUTHORIZE")
    .is("invalidated_at", null)
    .order("authorized_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!autonomous) {
    reasons.push("no_valid_authorization");
    return { authorized: false, source: null, approvalId: null, reasons };
  }
  if (autonomous.payload_hash && autonomous.payload_hash !== payloadHash) {
    reasons.push("autonomous_authorization_payload_mismatch");
    return { authorized: false, source: null, approvalId: null, reasons };
  }
  if (autonomous.expires_at && Date.parse(autonomous.expires_at) < Date.now()) {
    reasons.push("autonomous_authorization_expired");
    return { authorized: false, source: null, approvalId: null, reasons };
  }

  return {
    authorized: true,
    source: "autonomous_policy",
    approvalId: String(autonomous.id),
    reasons: [],
  };
}

export async function resolveSimulationAuthorization(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    externalActionId: string;
    payloadManifest: Record<string, unknown>;
  },
): Promise<{ authorized: boolean; source: string | null; reasons: string[] }> {
  const result = await resolveExecutionAuthorization(admin, {
    organizationId: input.organizationId,
    externalActionId: input.externalActionId,
    payloadManifest: input.payloadManifest,
    approvalKind: "simulate",
  });
  return {
    authorized: result.authorized,
    source: result.source,
    reasons: result.reasons,
  };
}
