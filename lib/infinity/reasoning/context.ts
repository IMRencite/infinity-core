import { buildExecutiveContext, type ExecutiveContextInput } from "./executive-context";
import { buildPlannerContext, type PlannerContextInput } from "./planner-context";
import type { MemoryRecord } from "./memory";

export type MissionContextInput = {
  missionId: string | null;
  title: string | null;
  objective: string | null;
};

export type OpportunityContextInput = {
  opportunityId: string | null;
  name: string | null;
  industry: string | null;
  category: string | null;
};

export type ValidationContextInput = {
  validationRunId: string | null;
  recommendation: string | null;
  overallScore: number | null;
  overallConfidence: number | null;
};

export type PolicyContextInput = {
  policyKeys: string[];
  autonomyLevel: string | null;
};

export type BuildContextInput = {
  buildFactoryEnabled: false;
  notes: string[];
};

export type MissionContextSnapshot = {
  kind: "mission";
  missionId: string | null;
  title: string | null;
  objective: string | null;
};

export type OpportunityContextSnapshot = {
  kind: "opportunity";
  opportunityId: string | null;
  name: string | null;
  industry: string | null;
  category: string | null;
};

export type ValidationContextSnapshot = {
  kind: "validation";
  validationRunId: string | null;
  recommendation: string | null;
  overallScore: number | null;
  overallConfidence: number | null;
};

export type PolicyContextSnapshot = {
  kind: "policy";
  policyKeys: string[];
  autonomyLevel: string | null;
};

export type MemoryContextSnapshot = {
  kind: "memory";
  records: MemoryRecord[];
};

export type BuildContextSnapshot = {
  kind: "build";
  buildFactoryEnabled: false;
  notes: string[];
};

export type ReasoningContextBundle = {
  assembledAt: string;
  organizationId: string;
  correlationId: string;
  mission: MissionContextSnapshot;
  opportunity: OpportunityContextSnapshot;
  validation: ValidationContextSnapshot;
  executive: ReturnType<typeof buildExecutiveContext>;
  planner: ReturnType<typeof buildPlannerContext>;
  policy: PolicyContextSnapshot;
  memory: MemoryContextSnapshot;
  build: BuildContextSnapshot;
};

export function buildMissionContext(input: MissionContextInput): MissionContextSnapshot {
  return { kind: "mission", ...input };
}

export function buildOpportunityContext(
  input: OpportunityContextInput,
): OpportunityContextSnapshot {
  return { kind: "opportunity", ...input };
}

export function buildValidationContext(
  input: ValidationContextInput,
): ValidationContextSnapshot {
  return { kind: "validation", ...input };
}

export function buildPolicyContext(input: PolicyContextInput): PolicyContextSnapshot {
  return { kind: "policy", ...input };
}

export function buildMemoryContext(records: MemoryRecord[]): MemoryContextSnapshot {
  return { kind: "memory", records };
}

export function buildBuildContext(input: BuildContextInput): BuildContextSnapshot {
  return {
    kind: "build",
    buildFactoryEnabled: false,
    notes: input.notes,
  };
}

export type AssembleReasoningContextInput = {
  organizationId: string;
  correlationId: string;
  mission: MissionContextInput;
  opportunity: OpportunityContextInput;
  validation: ValidationContextInput;
  executive: ExecutiveContextInput;
  planner: PlannerContextInput;
  policy: PolicyContextInput;
  memoryRecords: MemoryRecord[];
  build: BuildContextInput;
};

export function assembleReasoningContext(
  input: AssembleReasoningContextInput,
): ReasoningContextBundle {
  return {
    assembledAt: new Date().toISOString(),
    organizationId: input.organizationId,
    correlationId: input.correlationId,
    mission: buildMissionContext(input.mission),
    opportunity: buildOpportunityContext(input.opportunity),
    validation: buildValidationContext(input.validation),
    executive: buildExecutiveContext(input.executive),
    planner: buildPlannerContext(input.planner),
    policy: buildPolicyContext(input.policy),
    memory: buildMemoryContext(input.memoryRecords),
    build: buildBuildContext(input.build),
  };
}
