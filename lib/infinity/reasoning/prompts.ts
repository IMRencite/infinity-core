import type { PromptTemplateRole } from "./types";

/** Template slot — composable structure without embedded model instructions. */
export type PromptTemplate = {
  id: string;
  role: PromptTemplateRole;
  templateKey: string;
  description: string;
  /** Variable names accepted by this template (filled deterministically). */
  variableKeys: string[];
};

export type PromptTemplateSegment = {
  template: PromptTemplate;
  variables: Record<string, string>;
};

export type ComposedPromptBundle = {
  segments: PromptTemplateSegment[];
  composedAt: string;
};

const TEMPLATE_CATALOG: PromptTemplate[] = [
  {
    id: "system-advisory-boundary",
    role: "system",
    templateKey: "advisory_boundary",
    description: "Marks AI output as non-binding relative to Executive authority.",
    variableKeys: ["organization_id"],
  },
  {
    id: "developer-runtime-metadata",
    role: "developer",
    templateKey: "runtime_metadata",
    description: "Runtime and correlation metadata for traceability.",
    variableKeys: ["session_id", "correlation_id"],
  },
  {
    id: "mission-context",
    role: "mission",
    templateKey: "mission_summary",
    description: "Mission objective summary slot.",
    variableKeys: ["mission_id", "mission_title", "objective"],
  },
  {
    id: "opportunity-context",
    role: "opportunity",
    templateKey: "opportunity_summary",
    description: "Opportunity facts slot.",
    variableKeys: ["opportunity_id", "opportunity_name"],
  },
  {
    id: "validation-context",
    role: "validation",
    templateKey: "validation_summary",
    description: "Validation recommendation slot.",
    variableKeys: ["validation_run_id", "recommendation"],
  },
  {
    id: "executive-context",
    role: "executive",
    templateKey: "executive_decision_summary",
    description: "Executive decision snapshot slot.",
    variableKeys: ["executive_decision_id", "decision", "planning_eligible"],
  },
  {
    id: "planner-context",
    role: "planner",
    templateKey: "planner_handoff_summary",
    description: "Planner eligibility handoff slot.",
    variableKeys: ["planner_plan_id", "gate_status"],
  },
  {
    id: "reflection",
    role: "reflection",
    templateKey: "reflection_frame",
    description: "Reflection stage frame slot.",
    variableKeys: ["stage"],
  },
  {
    id: "critique",
    role: "critique",
    templateKey: "critique_frame",
    description: "Critique stage frame slot.",
    variableKeys: ["subject"],
  },
];

export function listPromptTemplates(): PromptTemplate[] {
  return [...TEMPLATE_CATALOG];
}

export function getPromptTemplate(templateKey: string): PromptTemplate | null {
  return TEMPLATE_CATALOG.find((template) => template.templateKey === templateKey) ?? null;
}

export function composePrompts(segments: PromptTemplateSegment[]): ComposedPromptBundle {
  return {
    segments,
    composedAt: new Date().toISOString(),
  };
}

export function renderPromptSegment(segment: PromptTemplateSegment): string {
  const parts = [
    `[${segment.template.role}:${segment.template.templateKey}]`,
    ...segment.template.variableKeys.map(
      (key) => `${key}=${segment.variables[key] ?? ""}`,
    ),
  ];
  return parts.join(" ");
}
