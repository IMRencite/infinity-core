import type { Tables } from "@/lib/supabase/database.types";

export type Mission = Tables<"missions">;
export type CommandCycle = Tables<"command_cycles">;
export type CommandDecision = Tables<"command_decisions">;
export type Plan = Tables<"plans">;
export type PlanStep = Tables<"plan_steps">;
export type EngineJob = Tables<"engine_jobs">;
export type WorkerRun = Tables<"worker_runs">;
export type CapabilityRecord = Tables<"capability_registry">;

export type CommandCycleResult =
  | {
      status: "completed";
      cycleId: string;
      correlationId: string;
      missionId: string;
      decisionId: string;
      planId: string;
      planStepId: string;
      jobId: string;
      workerRunId: string;
      opportunityScanId: string | null;
      jobStatus: string;
      workerRunStatus: string;
    }
  | {
      status: "skipped";
      reason:
        | "no_active_mission"
        | "pending_discovery_jobs"
        | "cycle_not_runnable"
        | "no_opportunity_for_evaluation"
        | "no_opportunity_for_validation"
        | "no_opportunity_for_initiative_planning"
        | "validation_required_first";
      message: string;
    }
  | {
      status: "failed";
      message: string;
    };

export type CreateMissionInput = {
  organizationId: string;
  title: string;
  description?: string;
  objectives?: unknown[];
  constraints?: Record<string, unknown>;
  activate?: boolean;
};

export type ExecutionDiagnostics = {
  engineJobId: string | null;
  engineJobStatus: string | null;
  capabilityKey: string | null;
  resolvedVersion: string | null;
  attemptCount: number | null;
  maxAttempts: number | null;
  nextAttemptAt: string | null;
  workerRunId: string | null;
  workerRunStatus: string | null;
  durationMs: number | null;
  lastError: string | null;
};

export type RunQueuedJobResult =
  | {
      status: "completed";
      engineJobId: string;
      engineJobStatus: string;
      workerRunId: string;
      workerRunStatus: string;
      opportunityScanId: string | null;
      message: string;
    }
  | {
      status: "skipped";
      reason: "no_due_job";
      message: string;
    }
  | {
      status: "waiting" | "dead_letter" | "cancelled" | "already_terminal";
      engineJobId: string;
      engineJobStatus: string;
      workerRunId: string | null;
      workerRunStatus: string | null;
      opportunityScanId: string | null;
      message: string;
    }
  | {
      status: "failed";
      message: string;
    };
