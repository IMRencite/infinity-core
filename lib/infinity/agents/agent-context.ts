export const AGENT_CONTEXT_KEYS = [
  "organization",
  "mission",
  "opportunity",
  "validation",
  "executive_decision",
  "planner",
  "policy",
  "memory",
  "prior_agent_results",
] as const;

export type AgentContextKey = (typeof AGENT_CONTEXT_KEYS)[number];

export type AgentContextRequirement = {
  key: AgentContextKey;
  required: boolean;
  description: string;
};

export type AgentContextSnapshot = {
  organizationId: string;
  correlationId: string;
  missionId: string | null;
  opportunityId: string | null;
  validationRunId: string | null;
  executiveDecisionId: string | null;
  plannerPlanId: string | null;
  policyKeys: string[];
  memoryRefIds: string[];
  payload: Record<string, string | number | boolean | null>;
};

export function buildAgentContextSnapshot(input: {
  organizationId: string;
  correlationId: string;
  missionId?: string | null;
  opportunityId?: string | null;
  validationRunId?: string | null;
  executiveDecisionId?: string | null;
  plannerPlanId?: string | null;
  policyKeys?: string[];
  memoryRefIds?: string[];
  payload?: Record<string, string | number | boolean | null>;
}): AgentContextSnapshot {
  return {
    organizationId: input.organizationId,
    correlationId: input.correlationId,
    missionId: input.missionId ?? null,
    opportunityId: input.opportunityId ?? null,
    validationRunId: input.validationRunId ?? null,
    executiveDecisionId: input.executiveDecisionId ?? null,
    plannerPlanId: input.plannerPlanId ?? null,
    policyKeys: input.policyKeys ?? [],
    memoryRefIds: input.memoryRefIds ?? [],
    payload: input.payload ?? {},
  };
}

export function assertRequiredContext(
  agentRequired: AgentContextRequirement[],
  snapshot: AgentContextSnapshot,
): void {
  for (const requirement of agentRequired) {
    if (!requirement.required) continue;

    switch (requirement.key) {
      case "organization":
        if (!snapshot.organizationId) {
          throw new Error(`Missing required context: ${requirement.key}`);
        }
        break;
      case "mission":
        if (!snapshot.missionId) throw new Error(`Missing required context: ${requirement.key}`);
        break;
      case "opportunity":
        if (!snapshot.opportunityId) {
          throw new Error(`Missing required context: ${requirement.key}`);
        }
        break;
      case "validation":
        if (!snapshot.validationRunId) {
          throw new Error(`Missing required context: ${requirement.key}`);
        }
        break;
      case "executive_decision":
        if (!snapshot.executiveDecisionId) {
          throw new Error(`Missing required context: ${requirement.key}`);
        }
        break;
      default:
        break;
    }
  }
}
