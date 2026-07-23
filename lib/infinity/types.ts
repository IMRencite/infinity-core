import type { Tables } from "@/lib/supabase/database.types";

export type Mission = Tables<"missions">;
export type CommandCycle = Tables<"command_cycles">;
export type CommandDecision = Tables<"command_decisions">;
export type Plan = Tables<"plans">;
export type PlanStep = Tables<"plan_steps">;
export type EngineJob = Tables<"engine_jobs">;
export type CapabilityRecord = Tables<"capability_registry">;

export type CommandCycleResult =
  | {
      status: "completed";
      cycleId: string;
      decisionId: string;
      planId: string;
      jobId: string;
      correlationId: string;
    }
  | {
      status: "skipped";
      reason: "no_active_mission" | "pending_discovery_jobs" | "cycle_not_runnable";
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
