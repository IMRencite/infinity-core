import { inspectVentureImprovementIntakeSubmissions } from "@/lib/infinity/venture-improvement-intake/submit";
import { inspectProductImprovementLoop } from "./store";
import { realFeedbackCount } from "./ingest";
import type { CustomerFeedbackRecord, ImprovementStatus, ProductImprovementOpportunity } from "./types";

export const FOUNDER_FEEDBACK_VISIBILITY_GATE = "FounderFeedbackVisibilityGate" as const;

export type CustomerSuggestionType = "REAL" | "SYNTHETIC / QC";

export type CustomerSuggestionFilter =
  | "all"
  | "real"
  | "synthetic"
  | "new"
  | "repeated"
  | "under_evaluation"
  | "building"
  | "deployed"
  | "measuring"
  | "validated";

export type CustomerSuggestionRow = {
  feedback_id: string;
  intake_submission_id: string | null;
  opportunity_id: string | null;
  improvement_id: string | null;
  submitted_at: string;
  suggestion: string;
  goal_or_context: string | null;
  email: string | null;
  classification: string;
  labels: string[];
  repeat_count: number;
  status: ImprovementStatus;
  source: string;
  type: CustomerSuggestionType;
  synthetic: boolean;
  customer_ref: string | null;
  cluster_key: string | null;
  lifecycle_state: string;
  evidence_lineage: string[];
};

export type CustomerSuggestionsHqView = {
  venture_id: string;
  rows: CustomerSuggestionRow[];
  counts: {
    real: number;
    synthetic: number;
    repeated: number;
    open_opportunities: number;
    validated: number;
  };
};

const OPEN_STATUSES = new Set<ImprovementStatus>([
  "NEW_FEEDBACK",
  "AGGREGATING",
  "UNDER_EVALUATION",
  "NEEDS_CLARIFICATION",
  "APPROVED_FOR_BUILD",
  "BUILDING",
  "QC",
  "DEPLOYMENT_READY",
  "DEPLOYED",
  "MEASURING",
]);

function splitGoal(text: string): { suggestion: string; goal: string | null } {
  const match = text.match(/\nGoal:\s*([\s\S]+)$/);
  if (!match) return { suggestion: text, goal: null };
  return { suggestion: text.slice(0, match.index).trim(), goal: match[1]?.trim() || null };
}

function lifecycleLabel(status: ImprovementStatus, repeatCount: number): string {
  if (status === "VALIDATED_IMPROVEMENT") return "Validated";
  if (status === "DEPLOYED") return "Deployed";
  if (status === "MEASURING" || status === "NO_MEASURABLE_IMPROVEMENT" || status === "ROLLED_BACK") return "Measuring";
  if (status === "BUILDING" || status === "APPROVED_FOR_BUILD" || status === "QC" || status === "DEPLOYMENT_READY") return "Building";
  if (status === "UNDER_EVALUATION" || status === "NEEDS_CLARIFICATION") return "Under Evaluation";
  if (repeatCount >= 2) return "Repeated";
  return "New";
}

export function filterCustomerSuggestionRows(
  rows: CustomerSuggestionRow[],
  filter: CustomerSuggestionFilter,
): CustomerSuggestionRow[] {
  if (filter === "all") return rows;
  if (filter === "real") return rows.filter((row) => !row.synthetic);
  if (filter === "synthetic") return rows.filter((row) => row.synthetic);
  if (filter === "new") return rows.filter((row) => row.lifecycle_state === "New");
  if (filter === "repeated") return rows.filter((row) => row.lifecycle_state === "Repeated" || row.repeat_count >= 2);
  if (filter === "under_evaluation") return rows.filter((row) => row.lifecycle_state === "Under Evaluation");
  if (filter === "building") return rows.filter((row) => row.lifecycle_state === "Building");
  if (filter === "deployed") return rows.filter((row) => row.lifecycle_state === "Deployed");
  if (filter === "measuring") return rows.filter((row) => row.lifecycle_state === "Measuring");
  if (filter === "validated") return rows.filter((row) => row.lifecycle_state === "Validated");
  return rows;
}

function opportunityFor(feedback: CustomerFeedbackRecord, opportunities: ProductImprovementOpportunity[]) {
  return opportunities.find((row) =>
    row.venture_id === feedback.venture_id
    && !row.synthetic
    && row.supporting_feedback_ids.includes(feedback.feedback_id),
  ) ?? opportunities.find((row) =>
    row.venture_id === feedback.venture_id
    && row.cluster_key === (feedback.affected_workflow ?? feedback.requested_capability)
    && !row.synthetic,
  ) ?? null;
}

export function projectVentureCustomerSuggestions(ventureId: string): CustomerSuggestionsHqView {
  const state = inspectProductImprovementLoop();
  const intakes = inspectVentureImprovementIntakeSubmissions().filter((row) => row.venture_id === ventureId);
  const feedback = state.feedback.filter((row) => row.venture_id === ventureId);
  const opportunities = state.opportunities.filter((row) => row.venture_id === ventureId);
  const rows = feedback.map((row) => {
    const intake = intakes.find((item) => item.feedback_id === row.feedback_id || item.submission_id === row.message_id) ?? null;
    const parsed = splitGoal(row.problem_statement);
    const opportunity = opportunityFor(row, opportunities);
    const cluster = opportunity?.cluster_key ?? row.affected_workflow ?? row.requested_capability;
    const sameCluster = feedback.filter((item) => (item.affected_workflow ?? item.requested_capability) === cluster);
    const repeatCount = row.synthetic
      ? sameCluster.length
      : sameCluster.filter((item) => !item.synthetic).length;
    const status = opportunity?.status ?? row.status;
    const lifecycle = lifecycleLabel(status, repeatCount);
    return {
      feedback_id: row.feedback_id,
      intake_submission_id: intake?.submission_id ?? row.message_id,
      opportunity_id: opportunity?.improvement_id ?? null,
      improvement_id: opportunity?.improvement_id ?? null,
      submitted_at: row.received_at,
      suggestion: intake?.message ?? parsed.suggestion,
      goal_or_context: intake?.goal_or_context ?? parsed.goal,
      email: intake?.contact_email ?? (row.contact_identity.includes("@") ? row.contact_identity : null),
      classification: row.feedback_types.join(", ") || "OTHER",
      labels: [...row.feedback_types],
      repeat_count: repeatCount,
      status,
      source: intake?.source ?? row.channel,
      type: row.synthetic ? "SYNTHETIC / QC" as const : "REAL" as const,
      synthetic: row.synthetic,
      customer_ref: row.customer_ref ?? intake?.customer_ref ?? null,
      cluster_key: cluster,
      lifecycle_state: lifecycle,
      evidence_lineage: [
        `CustomerFeedbackRecord:${row.feedback_id}`,
        intake ? `VentureImprovementIntakeContract:${intake.submission_id}` : null,
        opportunity ? `ProductImprovementOpportunity:${opportunity.improvement_id}` : null,
        opportunity ? `CanonicalVentureImprovement:${opportunity.improvement_id}` : null,
      ].filter((item): item is string => Boolean(item)),
    };
  }).sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at) || b.feedback_id.localeCompare(a.feedback_id));

  const real = rows.filter((row) => !row.synthetic);
  const realOpps = opportunities.filter((row) => !row.synthetic);
  return {
    venture_id: ventureId,
    rows,
    counts: {
      real: realFeedbackCount(ventureId),
      synthetic: rows.filter((row) => row.synthetic).length,
      repeated: real.filter((row) => row.repeat_count >= 2).length,
      open_opportunities: realOpps.filter((row) => OPEN_STATUSES.has(row.status)).length,
      validated: realOpps.filter((row) => row.status === "VALIDATED_IMPROVEMENT").length,
    },
  };
}

export function evaluateFounderFeedbackVisibilityGate(input: {
  canonical_feedback_count: number;
  suggestions_tab_present?: boolean;
  suggestions_surface_reachable?: boolean;
  availableTabs?: readonly string[];
}): { gate: typeof FOUNDER_FEEDBACK_VISIBILITY_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const tabPresent = input.suggestions_tab_present ?? Boolean(input.availableTabs?.includes("suggestions"));
  const surfaceReachable = input.suggestions_surface_reachable ?? tabPresent;
  if (input.canonical_feedback_count > 0 && (!tabPresent || !surfaceReachable)) {
    return {
      gate: FOUNDER_FEEDBACK_VISIBILITY_GATE,
      result: "FAIL",
      reasons: ["CANONICAL_FEEDBACK_HIDDEN_FROM_FOUNDER"],
    };
  }
  return { gate: FOUNDER_FEEDBACK_VISIBILITY_GATE, result: "PASS", reasons: [] };
}
