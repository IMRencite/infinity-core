import type { Json } from "@/lib/supabase/database.types";
import { WORKER_CAPABILITY_ENGINE_NAME, GOVERNED_WORKER_IMPLEMENTATION_KEY } from "@/lib/infinity/workers/constants";
import { dispatchGovernedWorkerJob } from "@/lib/infinity/workers/dispatcher";
import type {
  WorkerDefinition,
  WorkerExecutionContext,
  WorkerExecutionResult,
} from "@/lib/infinity/runtime/types";

export const governedWorkerBridge: WorkerDefinition = {
  capabilityKey: "workers.governed",
  engineName: WORKER_CAPABILITY_ENGINE_NAME,
  workerName: "governed_worker_bridge",
  version: "1.0.0",
  implementationKey: GOVERNED_WORKER_IMPLEMENTATION_KEY,
  timeoutSeconds: 120,
  async execute(_input: Json, context: WorkerExecutionContext): Promise<WorkerExecutionResult> {
    const { data: job, error: jobError } = await context.admin
      .from("engine_jobs")
      .select("*")
      .eq("id", context.engineJobId)
      .eq("organization_id", context.organizationId)
      .single();

    if (jobError || !job) {
      throw new Error(jobError?.message ?? "Engine job not found for governed worker");
    }

    const { data: workerRun, error: runError } = await context.admin
      .from("worker_runs")
      .select("*")
      .eq("id", context.workerRunId)
      .eq("organization_id", context.organizationId)
      .single();

    if (runError || !workerRun) {
      throw new Error(runError?.message ?? "Worker run not found for governed worker");
    }

    return dispatchGovernedWorkerJob(context.admin, { job, workerRun });
  },
};
