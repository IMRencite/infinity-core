import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { evaluateProductionArtifactLaunchReadiness } from "@/lib/infinity/production-artifact/launch-readiness";
import { hashPayloadManifest } from "./resource-registry";

export async function validateBuildSnapshotForExternalDeploy(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    buildId: string;
    buildSnapshotId: string;
  },
): Promise<{ valid: boolean; reasons: string[]; artifactHash: string | null }> {
  const reasons: string[] = [];

  const { data: build } = await admin
    .from("builds")
    .select("id, status, review_status")
    .eq("id", input.buildId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!build) reasons.push("build_missing");

  const { data: snapshot } = await admin
    .from("build_snapshots")
    .select("id, root_hash")
    .eq("id", input.buildSnapshotId)
    .eq("build_id", input.buildId)
    .maybeSingle();

  if (!snapshot) reasons.push("snapshot_missing");

  const { data: job } = await admin
    .from("build_jobs")
    .select("product_qa_status, generic_qa_status, reproducibility_status")
    .eq("build_id", input.buildId)
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (job?.product_qa_status !== "passed") reasons.push("product_qa_not_passed");
  if (job?.generic_qa_status !== "passed") reasons.push("generic_qa_not_passed");
  const repro = job?.reproducibility_status ?? "";
  if (repro !== "reproducible" && repro !== "passed") {
    reasons.push("reproducibility_not_passed");
  }

  return {
    valid: reasons.length === 0,
    reasons,
    artifactHash: snapshot?.root_hash ?? null,
  };
}

export async function validateProductionArtifactForExternalDeploy(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    ventureAssemblyId: string;
    productionArtifactId: string | null;
    buildSnapshotId: string | null;
    approvedArtifactHash?: string | null;
  },
): Promise<{ valid: boolean; reasons: string[]; contentHash: string | null }> {
  const readiness = await evaluateProductionArtifactLaunchReadiness(admin, {
    organizationId: input.organizationId,
    ventureAssemblyId: input.ventureAssemblyId,
    productionArtifactId: input.productionArtifactId,
    buildSnapshotId: input.buildSnapshotId,
  });
  const reasons = [...readiness.reasons];
  if (
    input.approvedArtifactHash &&
    readiness.contentHash &&
    input.approvedArtifactHash !== readiness.contentHash
  ) {
    reasons.push("approval_artifact_hash_mismatch");
  }
  return {
    valid: readiness.ready && reasons.length === 0,
    reasons,
    contentHash: readiness.contentHash,
  };
}

export async function validateLiveApproval(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    externalActionId: string;
    liveApprovalId: string;
    payloadManifest: Record<string, unknown>;
  },
): Promise<boolean> {
  const { data: approval } = await admin
    .from("external_action_approvals")
    .select("*")
    .eq("id", input.liveApprovalId)
    .eq("organization_id", input.organizationId)
    .eq("external_action_id", input.externalActionId)
    .eq("approval_kind", "execute_external")
    .eq("status", "approved")
    .maybeSingle();

  if (!approval) return false;
  if (approval.expires_at && Date.parse(approval.expires_at) < Date.now()) return false;

  const hash = hashPayloadManifest(input.payloadManifest);
  if (approval.payload_hash && approval.payload_hash !== hash) return false;

  return true;
}
