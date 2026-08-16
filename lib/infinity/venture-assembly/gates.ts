import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadPlanExecutionById } from "@/lib/infinity/plan-execution/persistence";

export type VentureAssemblyGateResult =
  | {
      allowed: true;
      planExecution: NonNullable<Awaited<ReturnType<typeof loadPlanExecutionById>>>;
      buildSnapshotId: string;
    }
  | { allowed: false; reason: string; classification: string };

export async function evaluateVentureAssemblyGates(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planExecutionId: string;
  },
): Promise<VentureAssemblyGateResult> {
  const pe = await loadPlanExecutionById(admin, input.organizationId, input.planExecutionId);
  if (!pe) {
    return { allowed: false, reason: "PlanExecution not found.", classification: "plan_execution_missing" };
  }
  if (pe.missionId !== input.missionId) {
    return { allowed: false, reason: "Mission mismatch.", classification: "mission_mismatch" };
  }
  if (pe.status !== "internally_complete") {
    return {
      allowed: false,
      reason: `PlanExecution must be internally_complete (got ${pe.status}).`,
      classification: "plan_execution_incomplete",
    };
  }
  if (!pe.buildId || !pe.buildJobId) {
    return { allowed: false, reason: "Build outputs missing.", classification: "build_missing" };
  }

  const { data: job } = await admin
    .from("build_jobs")
    .select("product_qa_status, generic_qa_status, reproducibility_status, builder_key")
    .eq("id", pe.buildJobId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!job) {
    return { allowed: false, reason: "BuildJob not found.", classification: "build_job_missing" };
  }
  if (job.product_qa_status !== "passed" || job.generic_qa_status !== "passed") {
    return {
      allowed: false,
      reason: "Build Factory QA must pass.",
      classification: "build_qa_failed",
    };
  }
  const repro = job.reproducibility_status ?? "";
  if (repro !== "reproducible" && repro !== "passed") {
    return {
      allowed: false,
      reason: "Reproducibility must pass.",
      classification: "reproducibility_failed",
    };
  }

  const { data: snapshot } = await admin
    .from("build_snapshots")
    .select("id")
    .eq("build_id", pe.buildId)
    .eq("organization_id", input.organizationId)
    .order("snapshot_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot?.id) {
    return { allowed: false, reason: "Build snapshot missing.", classification: "snapshot_missing" };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, version, status")
    .eq("id", pe.planId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!plan) {
    return { allowed: false, reason: "Approved plan missing.", classification: "plan_missing" };
  }

  return {
    allowed: true,
    planExecution: pe,
    buildSnapshotId: snapshot.id,
  };
}
