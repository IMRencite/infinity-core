export type ExecutiveContextInput = {
  executiveDecisionId: string | null;
  decision: string | null;
  planningEligible: boolean | null;
  priorityScore: number | null;
  rationale: string[];
};

export type ExecutiveContextSnapshot = {
  kind: "executive";
  executiveDecisionId: string | null;
  decision: string | null;
  planningEligible: boolean;
  priorityScore: number | null;
  rationale: string[];
  authoritative: true;
};

export function buildExecutiveContext(
  input: ExecutiveContextInput,
): ExecutiveContextSnapshot {
  return {
    kind: "executive",
    executiveDecisionId: input.executiveDecisionId,
    decision: input.decision,
    planningEligible: input.planningEligible === true,
    priorityScore: input.priorityScore,
    rationale: input.rationale,
    authoritative: true,
  };
}
