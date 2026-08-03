export type PlannerContextInput = {
  plannerPlanId: string | null;
  gateStatus: "not_eligible" | "awaiting_executive" | "eligible";
  notes: string[];
};

export type PlannerContextSnapshot = {
  kind: "planner";
  plannerPlanId: string | null;
  gateStatus: PlannerContextInput["gateStatus"];
  notes: string[];
  /** Planner cannot proceed on AI recommendation alone. */
  requiresExecutiveDecision: true;
};

export function buildPlannerContext(input: PlannerContextInput): PlannerContextSnapshot {
  return {
    kind: "planner",
    plannerPlanId: input.plannerPlanId,
    gateStatus: input.gateStatus,
    notes: input.notes,
    requiresExecutiveDecision: true,
  };
}
