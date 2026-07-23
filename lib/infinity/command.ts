import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  COMMAND_DECISION_OUTCOME_DISCOVERY,
  COMMAND_DECISION_REQUEST_DISCOVERY,
  DISCOVERY_CAPABILITY_KEY,
  DISCOVERY_ENGINE_NAME,
  PENDING_JOB_STATUSES,
} from "./constants";
import { recordEngineEvent } from "./events";
import type { CommandCycle, CommandDecision, Mission } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function hasPendingDiscoveryJobs(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .like("capability_key", "discovery.%")
    .in("status", [...PENDING_JOB_STATUSES]);

  if (error) {
    throw new Error(`Failed to check discovery jobs: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

export async function createCommandCycle(
  supabase: InfinitySupabase,
  organizationId: string,
  mission: Mission,
  triggerSource: "manual" | "scheduled" | "event" | "system" = "manual",
): Promise<
  | { status: "skipped"; reason: "pending_discovery_jobs"; cycle: null }
  | { status: "created"; cycle: CommandCycle }
> {
  const pending = await hasPendingDiscoveryJobs(supabase, organizationId);

  if (pending) {
    return { status: "skipped", reason: "pending_discovery_jobs", cycle: null };
  }

  const { data: cycle, error } = await supabase
    .from("command_cycles")
    .insert({
      organization_id: organizationId,
      mission_id: mission.id,
      status: "running",
      trigger_source: triggerSource,
      summary: {
        mission_title: mission.title,
        trigger: triggerSource,
      },
    })
    .select("*")
    .single();

  if (error || !cycle) {
    throw new Error(
      `Failed to create command cycle: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.cycle_started",
    entityType: "command_cycle",
    entityId: cycle.id,
    message: `Command cycle started for mission "${mission.title}"`,
    correlationId: cycle.correlation_id,
    payload: {
      mission_id: mission.id,
      trigger_source: triggerSource,
    },
  });

  return { status: "created", cycle };
}

export async function createDiscoveryDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
): Promise<CommandDecision> {
  const reasoning =
    "Active mission exists, no pending discovery jobs, and discovery policy permits a bounded autonomous scan.";

  const { data: decision, error } = await supabase
    .from("command_decisions")
    .insert({
      organization_id: organizationId,
      command_cycle_id: cycle.id,
      mission_id: mission.id,
      decision_type: COMMAND_DECISION_REQUEST_DISCOVERY,
      outcome: COMMAND_DECISION_OUTCOME_DISCOVERY,
      reasoning,
      confidence: 85,
      evidence_refs: [],
      payload: {
        requested_capability: DISCOVERY_CAPABILITY_KEY,
        scan_type: "broad_market",
        rationale: "Maintain opportunity pipeline under active mission",
      },
    })
    .select("*")
    .single();

  if (error || !decision) {
    throw new Error(
      `Failed to create command decision: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.decision_created",
    entityType: "command_decision",
    entityId: decision.id,
    message: "Command decision created: request discovery scan",
    correlationId: cycle.correlation_id,
    payload: {
      command_cycle_id: cycle.id,
      decision_type: decision.decision_type,
      outcome: decision.outcome,
      requested_capability: DISCOVERY_CAPABILITY_KEY,
    },
  });

  return decision;
}

export async function skipCommandCycle(
  supabase: InfinitySupabase,
  organizationId: string,
  cycleId: string,
  reason: string,
  correlationId: string,
) {
  const { error } = await supabase
    .from("command_cycles")
    .update({
      status: "skipped",
      completed_at: new Date().toISOString(),
      summary: { skip_reason: reason },
    })
    .eq("id", cycleId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to skip command cycle: ${error.message}`);
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.cycle_skipped",
    entityType: "command_cycle",
    entityId: cycleId,
    message: reason,
    correlationId,
    severity: "warning",
  });
}

export async function completeCommandCycle(
  supabase: InfinitySupabase,
  organizationId: string,
  cycleId: string,
  correlationId: string,
  summary: Json,
) {
  const { error } = await supabase
    .from("command_cycles")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      summary: summary as Json,
    })
    .eq("id", cycleId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to complete command cycle: ${error.message}`);
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.cycle_completed",
    entityType: "command_cycle",
    entityId: cycleId,
    message: "Command cycle completed",
    correlationId,
    payload: summary as Json,
  });
}

export { DISCOVERY_ENGINE_NAME };
