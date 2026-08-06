import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { PLANNER_INITIATIVE_GATE_CAPABILITY_KEY } from "@/lib/infinity/constants";
import { recordEngineEvent } from "@/lib/infinity/events";
import {
  assertPlannerExecutiveAuthorization,
  buildPlannerHandoffIdempotencyKey,
  type PlannerExecutiveAuthorization,
  PlannerAuthorizationError,
} from "@/lib/infinity/executive-selection/authorization";
import { assertPlannerMayExecute } from "@/lib/infinity/planner-gating";
import type { CommandCycle, CommandDecision, Mission, Plan, PlanStep } from "@/lib/infinity/types";

type InfinitySupabase = SupabaseClient<Database>;

export type ExecutivePlannerHandoffResult = {
  status: "created" | "reused";
  plan: Plan;
  steps: PlanStep[];
  qaVerdict: "pass" | "fail";
  authorization: PlannerExecutiveAuthorization;
};

export function readCanonicalDecisionId(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }
  const id = (metadata as Record<string, unknown>).canonical_executive_selection_decision_id;
  return typeof id === "string" ? id : null;
}

export async function findPlanForExecutiveAuthorization(
  supabase: InfinitySupabase,
  organizationId: string,
  auth: PlannerExecutiveAuthorization,
): Promise<Plan | null> {
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("mission_id", auth.missionId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);

  const idempotencyKey = buildPlannerHandoffIdempotencyKey(auth);

  for (const plan of plans ?? []) {
    if (typeof plan.metadata !== "object" || plan.metadata === null || Array.isArray(plan.metadata)) {
      continue;
    }
    const meta = plan.metadata as Record<string, unknown>;
    if (meta.planner_handoff_idempotency_key === idempotencyKey) {
      return plan;
    }
    if (readCanonicalDecisionId(plan.metadata) === auth.canonicalDecisionId) {
      return plan;
    }
  }

  return null;
}

export async function verifyExecutiveHandoffPlan(
  supabase: InfinitySupabase,
  auth: PlannerExecutiveAuthorization,
  plan: Plan,
  steps: PlanStep[],
): Promise<{ verdict: "pass" | "fail"; issues: string[] }> {
  const issues: string[] = [];

  if (typeof plan.metadata !== "object" || plan.metadata === null || Array.isArray(plan.metadata)) {
    issues.push("plan_metadata_invalid");
  } else {
    const meta = plan.metadata as Record<string, unknown>;
    if (meta.opportunity_id !== auth.opportunityId) {
      issues.push("plan_opportunity_mismatch");
    }
    if (readCanonicalDecisionId(plan.metadata) !== auth.canonicalDecisionId) {
      issues.push("canonical_decision_mismatch");
    }
    if (meta.build_factory === true || meta.creates_venture === true) {
      issues.push("unsupported_build_scheduled");
    }
  }

  const hasBuildStep = steps.some(
    (s) =>
      s.capability_key.startsWith("build.") ||
      s.capability_key.startsWith("website.") ||
      s.capability_key.includes("deploy"),
  );

  if (hasBuildStep) {
    issues.push("build_capability_in_plan");
  }

  if (steps.length === 0) {
    issues.push("plan_has_no_steps");
  }

  return { verdict: issues.length === 0 ? "pass" : "fail", issues };
}

export async function createInitiativePlanFromExecutiveAuthorization(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    mission: Mission;
    cycle: CommandCycle;
    decision: CommandDecision;
    authorization: PlannerExecutiveAuthorization;
    correlationId?: string | null;
  },
): Promise<ExecutivePlannerHandoffResult> {
  await assertPlannerExecutiveAuthorization(supabase, input.authorization);

  await assertPlannerMayExecute(
    supabase,
    input.organizationId,
    PLANNER_INITIATIVE_GATE_CAPABILITY_KEY,
    input.authorization.opportunityId,
  );

  const existing = await findPlanForExecutiveAuthorization(
    supabase,
    input.organizationId,
    input.authorization,
  );

  if (existing) {
    const { data: steps } = await supabase
      .from("plan_steps")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("plan_id", existing.id)
      .order("step_order", { ascending: true });

    const qa = await verifyExecutiveHandoffPlan(
      supabase,
      input.authorization,
      existing,
      steps ?? [],
    );

    await recordEngineEvent(supabase, {
      organizationId: input.organizationId,
      engineName: "planner",
      eventType: "planner.plan_reused",
      entityType: "plan",
      entityId: existing.id,
      message: "Planner reused existing Executive handoff plan.",
      correlationId: input.correlationId ?? input.cycle.correlation_id,
      payload: {
        canonical_executive_selection_decision_id: input.authorization.canonicalDecisionId,
        planner_handoff_idempotency_key: buildPlannerHandoffIdempotencyKey(input.authorization),
      },
    });

    return {
      status: "reused",
      plan: existing,
      steps: steps ?? [],
      qaVerdict: qa.verdict,
      authorization: input.authorization,
    };
  }

  const idempotencyKey = buildPlannerHandoffIdempotencyKey(input.authorization);

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      organization_id: input.organizationId,
      command_decision_id: input.decision.id,
      mission_id: input.mission.id,
      command_cycle_id: input.cycle.id,
      version: 1,
      status: "active",
      title: "Executive selection initiative plan (v2)",
      objectives: [
        {
          key: "executive_selection_handoff",
          description:
            "Governed plan for canonical Executive selection — no build, deploy, or external spend.",
        },
      ],
      metadata: {
        opportunity_id: input.authorization.opportunityId,
        planner_gate: "executive_selection_v2",
        source_system: input.authorization.sourceSystem,
        canonical_executive_selection_decision_id: input.authorization.canonicalDecisionId,
        executive_context_id: input.authorization.executiveContextId,
        context_hash: input.authorization.contextHash,
        planner_handoff_idempotency_key: idempotencyKey,
        build_factory: false,
        creates_venture: false,
        creates_build: false,
      },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new PlannerAuthorizationError(
      `Failed to create Executive handoff plan: ${planError?.message ?? "unknown"}`,
    );
  }

  const { data: step, error: stepError } = await supabase
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: PLANNER_INITIATIVE_GATE_CAPABILITY_KEY,
      title: "Planner authorization verified",
      description:
        "Canonical Executive selection authorized planning. Build Factory and external actions are not scheduled.",
      constraints: {
        opportunity_id: input.authorization.opportunityId,
        mission_id: input.mission.id,
        canonical_executive_selection_decision_id: input.authorization.canonicalDecisionId,
        integration: "executive_planner_handoff_v1",
        creates_venture: false,
        creates_asset: false,
        creates_build: false,
      },
      status: "completed",
    })
    .select("*")
    .single();

  if (stepError || !step) {
    throw new PlannerAuthorizationError(
      `Failed to create Executive handoff plan step: ${stepError?.message ?? "unknown"}`,
    );
  }

  const qa = await verifyExecutiveHandoffPlan(supabase, input.authorization, plan, [step]);

  await supabase
    .from("plans")
    .update({
      metadata: {
        ...(plan.metadata as Record<string, unknown>),
        plan_qa_verdict: qa.verdict,
        plan_qa_issues: qa.issues,
      },
    })
    .eq("id", plan.id)
    .eq("organization_id", input.organizationId);

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: "planner",
    eventType: "planner.plan_created",
    entityType: "plan",
    entityId: plan.id,
    message: "Planner created Executive selection handoff plan.",
    correlationId: input.correlationId ?? input.cycle.correlation_id,
    payload: {
      opportunity_id: input.authorization.opportunityId,
      canonical_executive_selection_decision_id: input.authorization.canonicalDecisionId,
    },
  });

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: "planner",
    eventType: "planner.plan_qa_completed",
    entityType: "plan",
    entityId: plan.id,
    message: `Executive handoff plan QA ${qa.verdict}`,
    correlationId: input.correlationId ?? input.cycle.correlation_id,
    payload: { verdict: qa.verdict, issues: qa.issues },
  });

  if (qa.verdict === "fail") {
    throw new PlannerAuthorizationError(
      `Executive handoff plan QA failed: ${qa.issues.join(", ")}`,
    );
  }

  return {
    status: "created",
    plan,
    steps: [step],
    qaVerdict: qa.verdict,
    authorization: input.authorization,
  };
}
