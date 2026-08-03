import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  COMMAND_DECISION_OUTCOME_DISCOVERY,
  COMMAND_DECISION_OUTCOME_EVALUATION,
  COMMAND_DECISION_OUTCOME_INITIATIVE_PLANNING,
  COMMAND_DECISION_OUTCOME_VALIDATION,
  COMMAND_DECISION_REQUEST_DISCOVERY,
  COMMAND_DECISION_REQUEST_EVALUATION,
  COMMAND_DECISION_REQUEST_INITIATIVE_PLANNING,
  COMMAND_DECISION_REQUEST_VALIDATION,
  DECISION_EVALUATE_CAPABILITY_KEY,
  DECISION_ENGINE_NAME,
  DISCOVERY_CAPABILITY_KEY,
  DISCOVERY_ENGINE_NAME,
  PENDING_JOB_STATUSES,
  PLANNER_INITIATIVE_GATE_CAPABILITY_KEY,
  VALIDATION_CAPABILITY_KEY,
  VALIDATION_ENGINE_NAME,
} from "./constants";
import { findOpportunityNeedingEvaluation } from "./decision/queries";
import { recordEngineEvent } from "./events";
import {
  findOpportunityNeedingValidation,
  selectOpportunityForInitiativePlanning,
} from "./validation";
import {
  FOUNDING_DISCOVERY_POLICY,
  readMissionScanType,
  readPrimaryMissionObjective,
} from "./mission-defaults";
import type { CommandCycle, CommandDecision, Mission } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function hasPendingDecisionJobs(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .like("capability_key", "decision.%")
    .in("status", [...PENDING_JOB_STATUSES]);

  if (error) {
    throw new Error(`Failed to check decision jobs: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

export async function hasPendingValidationJobs(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .like("capability_key", "validation.%")
    .in("status", [...PENDING_JOB_STATUSES]);

  if (error) {
    throw new Error(`Failed to check validation jobs: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

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
  const pendingDiscovery = await hasPendingDiscoveryJobs(supabase, organizationId);
  const pendingDecision = await hasPendingDecisionJobs(supabase, organizationId);
  const pendingValidation = await hasPendingValidationJobs(supabase, organizationId);

  if (pendingDiscovery || pendingDecision || pendingValidation) {
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
    message: `Command cycle started for enterprise-value mission "${mission.title}"`,
    correlationId: cycle.correlation_id,
    payload: {
      mission_id: mission.id,
      mission_title: mission.title,
      mission_objective: readPrimaryMissionObjective(mission),
      optimization_target: "enterprise_value",
      trigger_source: triggerSource,
      portfolio_value_rationale:
        "Command evaluates autonomous actions against the active enterprise-value mission and portfolio opportunity flow.",
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
  const missionObjective = readPrimaryMissionObjective(mission);
  const scanType = readMissionScanType(mission);

  const reasoning = [
    `Active mission "${mission.title}" optimizes for long-term enterprise value.`,
    "No discovery jobs are queued or running, portfolio opportunity flow is insufficient,",
    "and discovery policy permits a bounded autonomous scan to increase candidate opportunity generation",
    "within approved constraints.",
  ].join(" ");

  const decisionPayload = {
    requested_capability: DISCOVERY_CAPABILITY_KEY,
    scan_type: scanType,
    optimization_target: "enterprise_value",
    mission_id: mission.id,
    mission_title: mission.title,
    mission_objective: missionObjective,
    portfolio_value_rationale:
      "Increase portfolio opportunity flow to support enterprise-value compounding under bounded autonomy.",
    expected_outcome:
      "Generate additional opportunity scan activity without creating duplicate discovery work.",
    pipeline_state: "insufficient_or_empty",
    policy_context: {
      policy_category: FOUNDING_DISCOVERY_POLICY.policy_category,
      policy_key: FOUNDING_DISCOVERY_POLICY.policy_key,
      autonomy_level: FOUNDING_DISCOVERY_POLICY.autonomy_level,
    },
  };

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
      payload: decisionPayload,
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
    message:
      "Command decision created: bounded discovery scan to increase portfolio opportunity flow",
    correlationId: cycle.correlation_id,
    payload: {
      command_cycle_id: cycle.id,
      decision_type: decision.decision_type,
      outcome: decision.outcome,
      confidence: decision.confidence,
      decision_reasoning: reasoning,
      ...decisionPayload,
    },
  });

  return decision;
}

export async function createEvaluateOpportunityDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  opportunity: { id: string; name: string },
): Promise<CommandDecision> {
  const reasoning = [
    `Active mission "${mission.title}" requires structured evaluation of discovered opportunities.`,
    `Opportunity "${opportunity.name}" is scored or recommended but lacks a completed Decision Engine evaluation.`,
    "Command is requesting bounded autonomous evaluation without venture creation.",
  ].join(" ");

  const decisionPayload = {
    requested_capability: DECISION_EVALUATE_CAPABILITY_KEY,
    opportunity_id: opportunity.id,
    opportunity_name: opportunity.name,
    mission_id: mission.id,
    optimization_target: "enterprise_value",
    expected_outcome:
      "Produce a versioned evaluation, recommendation, and optional allocation proposal under policy constraints.",
  };

  const { data: decision, error } = await supabase
    .from("command_decisions")
    .insert({
      organization_id: organizationId,
      command_cycle_id: cycle.id,
      mission_id: mission.id,
      decision_type: COMMAND_DECISION_REQUEST_EVALUATION,
      outcome: COMMAND_DECISION_OUTCOME_EVALUATION,
      reasoning,
      confidence: 80,
      evidence_refs: [],
      payload: decisionPayload,
    })
    .select("*")
    .single();

  if (error || !decision) {
    throw new Error(
      `Failed to create evaluation command decision: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.decision_created",
    entityType: "command_decision",
    entityId: decision.id,
    message: "Command decision created: evaluate discovered opportunity",
    correlationId: cycle.correlation_id,
    payload: {
      command_cycle_id: cycle.id,
      decision_type: decision.decision_type,
      outcome: decision.outcome,
      ...decisionPayload,
    },
  });

  return decision;
}

export async function selectOpportunityForEvaluation(
  supabase: InfinitySupabase,
  organizationId: string,
) {
  return findOpportunityNeedingEvaluation(supabase, organizationId);
}

export async function createValidationDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  opportunity: { id: string; name: string },
): Promise<CommandDecision> {
  const reasoning = [
    `Active mission "${mission.title}" requires deterministic validation before planning.`,
    `Opportunity "${opportunity.name}" has a decision evaluation recommending validation or initiative work.`,
    "Command is requesting bounded validation without building ventures or assets.",
  ].join(" ");

  const decisionPayload = {
    requested_capability: VALIDATION_CAPABILITY_KEY,
    opportunity_id: opportunity.id,
    opportunity_name: opportunity.name,
    mission_id: mission.id,
    expected_outcome:
      "Produce a versioned validation run, findings, and planning eligibility recommendation.",
  };

  const { data: decision, error } = await supabase
    .from("command_decisions")
    .insert({
      organization_id: organizationId,
      command_cycle_id: cycle.id,
      mission_id: mission.id,
      decision_type: COMMAND_DECISION_REQUEST_VALIDATION,
      outcome: COMMAND_DECISION_OUTCOME_VALIDATION,
      reasoning,
      confidence: 78,
      evidence_refs: [],
      payload: decisionPayload,
    })
    .select("*")
    .single();

  if (error || !decision) {
    throw new Error(
      `Failed to create validation command decision: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.decision_created",
    entityType: "command_decision",
    entityId: decision.id,
    message: "Command decision created: validate opportunity assumptions",
    correlationId: cycle.correlation_id,
    payload: {
      command_cycle_id: cycle.id,
      decision_type: decision.decision_type,
      outcome: decision.outcome,
      ...decisionPayload,
    },
  });

  return decision;
}

export async function selectOpportunityForValidation(
  supabase: InfinitySupabase,
  organizationId: string,
) {
  return findOpportunityNeedingValidation(supabase, organizationId);
}

export async function createInitiativePlanningDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  opportunity: { id: string; name: string },
): Promise<CommandDecision> {
  const reasoning = [
    `Active mission "${mission.title}" may record planner eligibility only after validation approval.`,
    `Opportunity "${opportunity.name}" has validation recommendation approved_for_planning.`,
    "Command is recording a gated planning record without Build Factory or venture creation.",
  ].join(" ");

  const decisionPayload = {
    requested_capability: PLANNER_INITIATIVE_GATE_CAPABILITY_KEY,
    opportunity_id: opportunity.id,
    opportunity_name: opportunity.name,
    mission_id: mission.id,
    expected_outcome:
      "Persist a Planner eligibility record for a validation-approved opportunity.",
  };

  const { data: decision, error } = await supabase
    .from("command_decisions")
    .insert({
      organization_id: organizationId,
      command_cycle_id: cycle.id,
      mission_id: mission.id,
      decision_type: COMMAND_DECISION_REQUEST_INITIATIVE_PLANNING,
      outcome: COMMAND_DECISION_OUTCOME_INITIATIVE_PLANNING,
      reasoning,
      confidence: 85,
      evidence_refs: [],
      payload: decisionPayload,
    })
    .select("*")
    .single();

  if (error || !decision) {
    throw new Error(
      `Failed to create initiative planning command decision: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "command",
    eventType: "command.decision_created",
    entityType: "command_decision",
    entityId: decision.id,
    message: "Command decision created: record validation-approved planner eligibility",
    correlationId: cycle.correlation_id,
    payload: {
      command_cycle_id: cycle.id,
      decision_type: decision.decision_type,
      outcome: decision.outcome,
      ...decisionPayload,
    },
  });

  return decision;
}

export async function selectOpportunityForInitiativePlanningRecord(
  supabase: InfinitySupabase,
  organizationId: string,
) {
  return selectOpportunityForInitiativePlanning(supabase, organizationId);
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

export { DECISION_ENGINE_NAME, DISCOVERY_ENGINE_NAME, VALIDATION_ENGINE_NAME };
