export const CUSTOMER_FEEDBACK_RECORD = "CustomerFeedbackRecord" as const;
export const PRODUCT_IMPROVEMENT_OPPORTUNITY_CONTRACT = "ProductImprovementOpportunityContract" as const;
export const PRODUCT_IMPROVEMENT_OUTCOME_CONTRACT = "ProductImprovementOutcomeContract" as const;
export const PRODUCT_IMPROVEMENT_PRIORITY_ENGINE = "ProductImprovementPriorityEngine" as const;
export const PRODUCT_IMPROVEMENT_QUALITY_GATE = "ProductImprovementQualityGate" as const;
export const AUTONOMOUS_PRODUCT_IMPROVEMENT_GATE = "AutonomousProductImprovementGate" as const;
export const CROSS_VENTURE_LEARNING_GENERALIZABILITY_GATE = "CrossVentureLearningGeneralizabilityGate" as const;
export const CUSTOMER_FEEDBACK_PROMPT_INJECTION_GATE = "CustomerFeedbackPromptInjectionGate" as const;

export const FEEDBACK_TYPES = [
  "BUG",
  "FEATURE_REQUEST",
  "USABILITY_PROBLEM",
  "WORKFLOW_FRICTION",
  "CONFUSION",
  "MISSING_INTEGRATION",
  "PERFORMANCE_ISSUE",
  "ACCESSIBILITY_ISSUE",
  "PRICING_FEEDBACK",
  "CANCELLATION_REASON",
  "SUPPORT_REQUEST",
  "COMPLIMENT",
  "SECURITY_CONCERN",
  "PRIVACY_CONCERN",
  "LEGAL_CONCERN",
  "IDENTITY_QUESTION",
  "OTHER",
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type ImprovementStatus =
  | "NEW_FEEDBACK"
  | "AGGREGATING"
  | "UNDER_EVALUATION"
  | "NEEDS_CLARIFICATION"
  | "REJECTED"
  | "DEFERRED"
  | "DEFERRED_CAPITAL"
  | "REDUCED_SCOPE_PRODUCTION_QUALITY"
  | "CAPITAL_REALLOCATION_REQUIRED"
  | "APPROVED_FOR_BUILD"
  | "BUILDING"
  | "QC"
  | "DEPLOYMENT_READY"
  | "DEPLOYED"
  | "MEASURING"
  | "VALIDATED_IMPROVEMENT"
  | "NO_MEASURABLE_IMPROVEMENT"
  | "ROLLED_BACK";

export type NamedGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

export type CustomerFeedbackRecord = {
  contract: typeof CUSTOMER_FEEDBACK_RECORD;
  feedback_id: string;
  venture_id: string;
  customer_ref: string | null;
  contact_identity: string;
  channel: string;
  message_id: string | null;
  thread_id: string | null;
  received_at: string;
  raw_message_reference: string;
  feedback_types: FeedbackType[];
  requested_capability: string | null;
  affected_workflow: string | null;
  problem_statement: string;
  customer_language_summary: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  frequency_signal: number;
  customer_value_signal: "PAYING" | "TRIAL" | "PROSPECT" | "UNKNOWN";
  strategic_fit: "STRONG" | "PLAUSIBLE" | "WEAK" | "OUT_OF_SCOPE";
  revenue_context: string | null;
  evidence_confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  privacy_classification: "MINIMAL" | "SENSITIVE" | "RESTRICTED";
  risk_classification: "LOW" | "MEDIUM" | "HIGH";
  status: ImprovementStatus;
  provenance: "CUSTOMER_MESSAGE" | "FOUNDER_SUGGESTION" | "REVIEW_REQUEST";
  synthetic: boolean;
  prompt_injection: boolean;
  untrusted: true;
};

export type ProductImprovementOpportunity = {
  contract: typeof PRODUCT_IMPROVEMENT_OPPORTUNITY_CONTRACT;
  improvement_id: string;
  venture_id: string;
  cluster_key: string;
  problem: string;
  requested_capability: string;
  affected_workflow: string;
  supporting_feedback_ids: string[];
  total_mentions: number;
  unique_customer_count: number;
  paying_customer_count: number;
  repeat_mentions: number;
  frequency: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  customer_value: "PAYING" | "MIXED" | "PROSPECT" | "UNKNOWN";
  retention_relevance: "HIGH" | "MEDIUM" | "LOW";
  conversion_relevance: "HIGH" | "MEDIUM" | "LOW";
  revenue_relevance: "HIGH" | "MEDIUM" | "LOW";
  strategic_fit: "STRONG" | "PLAUSIBLE" | "WEAK" | "OUT_OF_SCOPE";
  implementation_class: "COPY" | "UX_REPAIR" | "WORKFLOW" | "EXPORT" | "PERSISTENCE" | "FEATURE" | "BUGFIX" | "SECURITY" | "LEGAL" | "PRICING";
  estimated_complexity: "LOW" | "MEDIUM" | "HIGH";
  estimated_cost: number | null;
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  priority_score: number;
  priority_factors: Record<string, number>;
  status: ImprovementStatus;
  rejection_reason: string | null;
  acceptance_criteria: string[];
  created_at: string;
  updated_at: string;
  synthetic: boolean;
};

export type ProductImprovementOutcome = {
  contract: typeof PRODUCT_IMPROVEMENT_OUTCOME_CONTRACT;
  outcome_id: string;
  improvement_id: string;
  expected_outcome: string;
  measurement_window: string;
  primary_metrics: string[];
  secondary_metrics: string[];
  baseline: Record<string, number | null>;
  actual: Record<string, number | null>;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  decision: "VALIDATED_IMPROVEMENT" | "NO_MEASURABLE_IMPROVEMENT" | "ROLLED_BACK" | "MEASURING";
};

export type ProductImprovementLearning = {
  learning_id: string;
  scope: "VENTURE_SPECIFIC_LEARNING" | "CATEGORY_LEARNING" | "CROSS_VENTURE_PRODUCT_PRIOR" | "CROSS_VENTURE_DESIGN_PRIOR";
  claim: string;
  sample_size: number;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  venture_ids: string[];
  category: string | null;
  aesthetic_sameness: false;
};

export type ProductImprovementState = {
  feedback: CustomerFeedbackRecord[];
  opportunities: ProductImprovementOpportunity[];
  outcomes: ProductImprovementOutcome[];
  learnings: ProductImprovementLearning[];
  incidents: Array<{ incident_id: string; feedback_id: string; kind: string; open: boolean }>;
};
