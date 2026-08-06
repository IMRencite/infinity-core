import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { observeBuildFactoryBuilds } from "@/lib/infinity/build-factory/observe-builds";
import { observeBuildFactoryJobs } from "@/lib/infinity/build-factory/observe-build-jobs";
import { loadBuildJobByBuildId } from "@/lib/infinity/build-factory/persistence-v2";
import { PLAN_EXECUTION_EVENTS } from "./constants";
import { emitPlanExecutionEvent } from "./events";
import { loadActivePlanExecutionForMission, updatePlanExecution } from "./persistence";
import { classifyPlanStepCapability } from "./step-classification";

export async function observePlanExecution(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<number> {
  await observeBuildFactoryBuilds(admin, organizationId, missionId);
  await observeBuildFactoryJobs(admin, organizationId, missionId);

  const pe = await loadActivePlanExecutionForMission(admin, organizationId, missionId);
  if (!pe || pe.status === "internally_complete" || pe.status === "cancelled") {
    return 0;
  }

  const { data: steps } = await admin
    .from("plan_steps")
    .select("id, capability_key, status")
    .eq("organization_id", organizationId)
    .eq("plan_id", pe.planId);

  const completed = new Set(pe.completedStepIds);
  let updated = 0;

  for (const step of steps ?? []) {
    if (step.status === "completed" && !completed.has(step.id)) {
      completed.add(step.id);
      updated += 1;
      await emitPlanExecutionEvent(admin, {
        organizationId,
        eventType: PLAN_EXECUTION_EVENTS.stepCompleted,
        message: `Plan step completed: ${step.capability_key}`,
        missionId,
        planExecutionId: pe.id,
        planId: pe.planId,
        planStepId: step.id,
      });
    }
  }

  if (pe.buildId) {
    const { data: build } = await admin
      .from("builds")
      .select("status, review_status, current_snapshot_id")
      .eq("id", pe.buildId)
      .maybeSingle();

    const job = await loadBuildJobByBuildId(admin, organizationId, pe.buildId);

    if (job?.status === "failed") {
      const { data: jobRow } = await admin
        .from("build_jobs")
        .select("blocking_reason")
        .eq("id", job.id)
        .maybeSingle();
      if (jobRow?.blocking_reason === "repair_exhausted") {
      await emitPlanExecutionEvent(admin, {
        organizationId,
        eventType: PLAN_EXECUTION_EVENTS.repairExhausted,
        message: "Build repair exhausted",
        missionId,
        planExecutionId: pe.id,
        buildJobId: job.id,
      });
      }
    }

    const buildComplete =
      build?.status === "internally_complete" &&
      build.review_status === "passed" &&
      job?.genericQaStatus === "passed" &&
      job?.productQaStatus === "passed" &&
      job?.status === "internally_complete" &&
      Boolean(build.current_snapshot_id);

    if (buildComplete && pe.status !== "awaiting_review") {
      await updatePlanExecution(admin, organizationId, pe.id, {
        status: "awaiting_review",
        current_phase: "review",
      });
      updated += 1;
    }
  }

  const requiredInternal = pe.executableStepIds.filter((stepId) => {
    const row = (steps ?? []).find((s) => s.id === stepId);
    if (!row) {
      return false;
    }
    return classifyPlanStepCapability(row.capability_key) !== "unsupported_external";
  });

  const allInternalDone = requiredInternal.every((id) => completed.has(id));

  const { data: execQaWr } = await admin
    .from("worker_results")
    .select("id, status, structured_output")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("capability_key", "qa.verify_autonomous_plan_execution")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const execQaPass =
    execQaWr &&
    typeof execQaWr.structured_output === "object" &&
    execQaWr.structured_output !== null &&
    (execQaWr.structured_output as Record<string, unknown>).verdict === "pass";

  if (allInternalDone && execQaPass) {
    await updatePlanExecution(admin, organizationId, pe.id, {
      status: "internally_complete",
      current_phase: "complete",
      completed_at: new Date().toISOString(),
      completed_step_ids: Array.from(completed) as unknown as Json,
    });

    await emitPlanExecutionEvent(admin, {
      organizationId,
      eventType: PLAN_EXECUTION_EVENTS.internallyCompleted,
      message: "Plan execution internally complete — not deployed or published",
      missionId,
      planExecutionId: pe.id,
      planId: pe.planId,
      payload: { execution_qa_result_id: execQaWr?.id },
    });
    updated += 1;
  } else if (updated > 0 || completed.size !== pe.completedStepIds.length) {
    await updatePlanExecution(admin, organizationId, pe.id, {
      completed_step_ids: Array.from(completed) as unknown as Json,
    });
  }

  return updated;
}
