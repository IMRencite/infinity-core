import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export type EngineJob = Tables<"engine_jobs">;
export type WorkerRun = Tables<"worker_runs">;
export type CapabilityRecord = Tables<"capability_registry">;

export type FailureClass =
  | "retryable"
  | "non_retryable"
  | "timeout"
  | "cancellation";

export type WorkerExecutionResult = {
  output: Json;
  metrics?: Json;
  confidenceScore?: number | null;
  qualityScore?: number | null;
  costAmount?: number | null;
  costCurrency?: string | null;
};

export type WorkerExecutionContext = {
  admin: AdminSupabaseClient;
  organizationId: string;
  missionId: string | null;
  engineJobId: string;
  workerRunId: string;
  correlationId: string;
  attemptNumber: number;
  input: Json;
};

export type WorkerDefinition = {
  capabilityKey: string;
  engineName: string;
  workerName: string;
  version: string;
  implementationKey: string;
  timeoutSeconds?: number;
  classifyFailure?: (error: unknown) => FailureClass;
  execute: (
    input: Json,
    context: WorkerExecutionContext,
  ) => Promise<WorkerExecutionResult>;
};

export type JobExecutionResult =
  | {
      status: "completed";
      job: EngineJob;
      workerRun: WorkerRun;
      output: Json;
    }
  | {
      status: "waiting";
      job: EngineJob;
      workerRun: WorkerRun;
      nextAttemptAt: string;
    }
  | {
      status: "dead_letter";
      job: EngineJob;
      workerRun: WorkerRun;
    }
  | {
      status: "failed";
      job: EngineJob;
      workerRun: WorkerRun | null;
      message: string;
    }
  | {
      status: "cancelled";
      job: EngineJob;
      workerRun: WorkerRun | null;
    }
  | {
      status: "already_terminal";
      job: EngineJob;
      message: string;
    };

export type DurableFlowResult = {
  missionId: string;
  commandCycleId: string;
  commandDecisionId: string;
  planId: string;
  planStepId: string;
  engineJobId: string;
  workerRunId: string | null;
  opportunityScanId: string | null;
  jobStatus: string;
  workerRunStatus: string | null;
  correlationId: string;
};
