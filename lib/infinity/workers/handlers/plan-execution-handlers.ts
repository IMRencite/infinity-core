import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadCanonicalExecutiveSelectionForMission } from "@/lib/infinity/executive-selection/authorization";
import { loadPlanExecutionById } from "@/lib/infinity/plan-execution/persistence";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";

export async function runQaVerifyAutonomousPlanExecution(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const planExecutionId = requireStringField(input, "plan_execution_id");

  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const issues: string[] = [];

  const executive = await loadCanonicalExecutiveSelectionForMission(
    admin,
    context.organizationId,
    missionId,
  );

  if (!executive || executive.canonicalDecisionType !== "select_for_planning") {
    issues.push("executive_selection_missing");
  }

  const pe = await loadPlanExecutionById(admin, context.organizationId, planExecutionId);
  if (!pe) {
    issues.push("plan_execution_not_found");
  }

  if (pe && executive && pe.executiveDecisionId !== executive.canonicalDecisionId) {
    issues.push("executive_decision_mismatch");
  }

  if (pe && !pe.allocationProposalId) {
    issues.push("allocation_missing");
  }

  if (pe?.buildJobId) {
    const { data: job } = await admin
      .from("build_jobs")
      .select("builder_key, generic_qa_status, product_qa_status, status")
      .eq("id", pe.buildJobId)
      .maybeSingle();
    if (!job?.builder_key?.startsWith("website.internal")) {
      issues.push("builder_adapter_invalid");
    }
    if (job?.product_qa_status !== "passed") {
      issues.push("product_qa_not_passed");
    }
    if (job?.generic_qa_status !== "passed") {
      issues.push("generic_qa_not_passed");
    }
  } else if (pe) {
    issues.push("build_job_missing");
  }

  if (pe?.buildId) {
    const { count: snapshots } = await admin
      .from("build_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("build_id", pe.buildId);
    if ((snapshots ?? 0) < 1) {
      issues.push("snapshot_missing");
    }
  }

  const verdict = issues.length === 0 ? "pass" : "fail";

  return {
    structuredOutput: { verdict, issues, plan_execution_id: planExecutionId },
    artifactType: "qa_report",
    artifactPayload: { verdict, issues, layer: "autonomous_plan_execution" },
  };
}

export async function dispatchPlanExecutionWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  if (context.capabilityKey === "qa.verify_autonomous_plan_execution") {
    return runQaVerifyAutonomousPlanExecution(admin, context);
  }
  return null;
}
