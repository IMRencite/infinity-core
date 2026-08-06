import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isOpportunityApprovedForPlanning } from "./validation";
import type { PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

/** Command pipeline capabilities that run before planning approval exists. */
export const PLANNER_GATE_EXEMPT_CAPABILITY_PREFIXES = [
  "discovery.",
  "decision.",
  "validation.",
  "executive.",
] as const;

export class PlannerGatingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerGatingError";
  }
}

export function isPlannerGateExemptCapability(capabilityKey: string): boolean {
  if (capabilityKey === "qa.verify_executive_selection") {
    return true;
  }
  return PLANNER_GATE_EXEMPT_CAPABILITY_PREFIXES.some((prefix) =>
    capabilityKey.startsWith(prefix),
  );
}

export function extractOpportunityIdFromConstraints(constraints: unknown): string | null {
  if (typeof constraints !== "object" || constraints === null || Array.isArray(constraints)) {
    return null;
  }

  const opportunityId = (constraints as Record<string, unknown>).opportunity_id;
  return typeof opportunityId === "string" && opportunityId.length > 0 ? opportunityId : null;
}

export function extractOpportunityIdFromJobPayload(payload: Json | null | undefined): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, Json>;
  const direct = record.opportunity_id;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  return extractOpportunityIdFromConstraints(record.constraints);
}

export async function assertOpportunityApprovedForPlanning(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
): Promise<void> {
  const approved = await isOpportunityApprovedForPlanning(
    supabase,
    organizationId,
    opportunityId,
  );

  if (!approved) {
    throw new PlannerGatingError(
      "Planner cannot receive this opportunity until validation recommends approved_for_planning.",
    );
  }
}

/**
 * Enforces validation approval for any non-exempt planner capability (including future `planner.*` workers).
 */
export async function assertPlannerMayExecute(
  supabase: InfinitySupabase,
  organizationId: string,
  capabilityKey: string,
  opportunityId: string | null | undefined,
): Promise<void> {
  if (isPlannerGateExemptCapability(capabilityKey)) {
    return;
  }

  if (!opportunityId) {
    throw new PlannerGatingError(
      "Planner execution requires an opportunity validated as approved_for_planning.",
    );
  }

  await assertOpportunityApprovedForPlanning(supabase, organizationId, opportunityId);
}

export async function assertPlannerMayExecutePlanStep(
  supabase: InfinitySupabase,
  organizationId: string,
  step: Pick<PlanStep, "capability_key" | "constraints">,
): Promise<void> {
  await assertPlannerMayExecute(
    supabase,
    organizationId,
    step.capability_key,
    extractOpportunityIdFromConstraints(step.constraints),
  );
}

export async function assertPlannerMayExecuteEngineJob(
  supabase: InfinitySupabase,
  organizationId: string,
  job: {
    capability_key: string;
    payload: Json;
  },
): Promise<void> {
  await assertPlannerMayExecute(
    supabase,
    organizationId,
    job.capability_key,
    extractOpportunityIdFromJobPayload(job.payload),
  );
}
