import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { EngineJob } from "@/lib/infinity/runtime/types";
import { assertPlannerMayExecuteEngineJob } from "@/lib/infinity/planner-gating";
import { resolveCapabilityRecord } from "@/lib/infinity/runtime/worker-registry";
import { getWorkerCapabilityContract, assertSideEffectAllowed } from "./capability";
import { assertEstimatedCostWithinPolicy } from "./budgets";
import type { PolicyGateOutcome } from "./types";

export async function evaluateWorkerPolicyGates(
  admin: AdminSupabaseClient,
  job: EngineJob,
): Promise<PolicyGateOutcome> {
  const contract = getWorkerCapabilityContract(job.capability_key);
  if (!contract || contract.status !== "active") {
    return {
      allowed: false,
      reason: "Capability not registered in worker foundation",
      classification: "capability_unregistered",
    };
  }

  try {
    assertSideEffectAllowed(contract.sideEffectClass);
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Side effect blocked",
      classification: "side_effect_denied",
    };
  }

  if (job.organization_id !== job.organization_id) {
    return {
      allowed: false,
      reason: "Organization mismatch",
      classification: "organization_inconsistent",
    };
  }

  if (job.mission_id) {
    const { data: mission } = await admin
      .from("missions")
      .select("status")
      .eq("id", job.mission_id)
      .eq("organization_id", job.organization_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!mission) {
      return {
        allowed: false,
        reason: "Mission is not active",
        classification: "mission_inactive",
      };
    }

    if (mission.status === "paused" || mission.status !== "active") {
      if (mission.status === "paused") {
        return {
          allowed: false,
          reason: "Mission is paused",
          classification: "mission_paused_or_cancelled",
        };
      }
      return {
        allowed: false,
        reason: "Mission is not active",
        classification: "mission_inactive",
      };
    }
  }

  if (job.plan_step_id) {
    const { data: step } = await admin
      .from("plan_steps")
      .select("id, status, capability_key, organization_id")
      .eq("id", job.plan_step_id)
      .eq("organization_id", job.organization_id)
      .maybeSingle();

    if (!step) {
      return {
        allowed: false,
        reason: "Plan step not found",
        classification: "plan_step_invalid",
      };
    }

    if (step.capability_key !== job.capability_key) {
      return {
        allowed: false,
        reason: "Plan step capability mismatch",
        classification: "plan_step_capability_mismatch",
      };
    }

    if (["cancelled", "blocked"].includes(step.status)) {
      return {
        allowed: false,
        reason: `Plan step status ${step.status}`,
        classification: "plan_step_ineligible",
      };
    }
  }

  try {
    await assertPlannerMayExecuteEngineJob(admin, job.organization_id, {
      capability_key: job.capability_key,
      payload: job.payload,
    });
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Planner gate denied",
      classification: "planner_gate_denied",
    };
  }

  try {
    const capability = await resolveCapabilityRecord(
      admin,
      job.organization_id,
      job.capability_key,
      job.resolved_capability_id,
    );
    if (job.resolved_version && job.resolved_version !== capability.version) {
      return {
        allowed: false,
        reason: "Resolved capability version mismatch",
        classification: "capability_version_mismatch",
      };
    }
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Registry resolution failed",
      classification: "capability_unavailable",
    };
  }

  try {
    assertEstimatedCostWithinPolicy(contract, 0);
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Budget denied",
      classification: "allocation_denied",
    };
  }

  const concurrencyOk = await checkConcurrencyLimit(admin, job, contract.concurrencyLimit);
  if (!concurrencyOk) {
    return {
      allowed: false,
      reason: "Concurrency limit reached for capability",
      classification: "concurrency_denied",
    };
  }

  return { allowed: true };
}

async function checkConcurrencyLimit(
  admin: AdminSupabaseClient,
  job: EngineJob,
  limit: number,
): Promise<boolean> {
  const { count } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", job.organization_id)
    .eq("capability_key", job.capability_key)
    .eq("status", "running");

  return (count ?? 0) < limit;
}
