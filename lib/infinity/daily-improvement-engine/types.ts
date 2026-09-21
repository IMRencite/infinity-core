export const DAILY_IMPROVEMENT_ENGINE = "DailyImprovementEngine" as const;
export const DAILY_IMPROVEMENT_SCOPE = "daily-improvement-engine-v1" as const;
export const UNKNOWN = "UNKNOWN" as const;

export const REVIEWED_SYSTEMS = [
  "Sales",
  "Prospect Intelligence",
  "Organic Growth",
  "Design Core / Creative",
  "Performance Intelligence",
  "Backlink Intelligence",
  "Affiliate / Partner Growth",
  "Build Factory",
  "Founder HQ",
  "Public Operations",
  "Communication Runtime",
  "Schedulers",
  "Schema / SEO / GEO",
  "Content Quality",
  "Conversion Architecture",
  "Product UX",
  "Venture UX",
  "Treasury Integrations",
  "Provider Integrations",
  "Security / Auth boundaries",
  "QC Gates",
] as const;

export type ReviewedSystem = (typeof REVIEWED_SYSTEMS)[number];

export const BENCHMARK_STATES = [
  "LEADING",
  "ON_STANDARD",
  "SLIGHTLY_BEHIND",
  "MATERIAL_GAP",
  "CRITICAL_GAP",
  "UNKNOWN",
] as const;
export type BenchmarkState = (typeof BENCHMARK_STATES)[number];

export const IMPROVEMENT_RISKS = ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"] as const;
export type ImprovementRisk = (typeof IMPROVEMENT_RISKS)[number];

export const IMPROVEMENT_OWNERS = [
  "Sales",
  "Organic Growth",
  "Prospect Intelligence",
  "Design Core",
  "Backlink Intelligence",
  "Systems Architect / Runtime",
  "HQ",
  "Public Operations",
  "Performance Intelligence",
  "Build Factory",
  "QC",
] as const;
export type ImprovementOwner = (typeof IMPROVEMENT_OWNERS)[number];

export const EXPERIMENT_DECISIONS = ["ADOPT", "REJECT", "CONTINUE_TEST", "ROLLBACK", "FOUNDER_REVIEW"] as const;
export type ExperimentDecision = (typeof EXPERIMENT_DECISIONS)[number];

export type DailyImprovementObservation = {
  observation_id: string;
  system: ReviewedSystem;
  venture_id: string | null;
  kind: "INTERNAL" | "EXTERNAL" | "QC_ESCAPE" | "MARKET" | "PROVIDER";
  summary: string;
  evidence: string[];
  sources: string[];
  observed_at: string;
};

export type DailySystemBenchmark = {
  system: ReviewedSystem;
  venture_id: string | null;
  current_state: string;
  benchmark_state: BenchmarkState;
  evidence: string[];
  active: boolean;
};

export type DailyImprovementCandidate = {
  candidate_id: string;
  system: ReviewedSystem;
  venture_id: string | null;
  current_state: string;
  benchmark_state: BenchmarkState;
  gap: string;
  evidence: string[];
  sources: string[];
  hypothesis: string;
  expected_benefit: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  risk: ImprovementRisk;
  dependencies: string[];
  test_plan: string;
  success_metric: string;
  rollback_plan: string;
  owner: ImprovementOwner;
  approval_requirement: "NONE" | "POLICY" | "FOUNDER";
  status: "QUEUED" | "TESTING" | "CANARY" | "APPLIED" | "HELD" | "REJECTED" | "ROLLED_BACK" | "FOUNDER_REVIEW";
};

export type DailyImprovementDecision = {
  decision_id: string;
  candidate_id: string;
  action: "TEST" | "CANARY" | "APPLY" | "HOLD" | "REJECT" | "FOUNDER_REVIEW";
  reason: string;
  approved_by: "ENGINE" | "POLICY" | "FOUNDER";
};

export type ImprovementEvidenceRecord = {
  evidence_id: string;
  candidate_id: string;
  kind: string;
  summary: string;
  source: string;
};

export type ImprovementExperiment = {
  experiment_id: string;
  candidate_id: string;
  baseline: string;
  hypothesis: string;
  change: string;
  expected_result: string;
  metric: string;
  canary_surface: string;
  start: string;
  end: string | null;
  result: string | typeof UNKNOWN;
  decision: ExperimentDecision | typeof UNKNOWN;
};

export type ImprovementRollbackRecord = {
  rollback_id: string;
  candidate_id: string;
  previous_state: string;
  new_state: string;
  deployment_ref: string | typeof UNKNOWN;
  reason: string;
  rollback_action: string;
};

export type DailyImprovementRun = {
  run_id: string;
  date: string;
  started_at: string;
  finished_at: string;
  trigger: "VERCEL_CRON" | "MANUAL";
  observations: DailyImprovementObservation[];
  benchmarks: DailySystemBenchmark[];
  candidates: DailyImprovementCandidate[];
  decisions: DailyImprovementDecision[];
  experiments: ImprovementExperiment[];
  rollbacks: ImprovementRollbackRecord[];
  evidence: ImprovementEvidenceRecord[];
};

export type InfinityDailyImprovementReport = {
  date: string;
  systems_reviewed: ReviewedSystem[];
  ventures_reviewed: string[];
  leading: number;
  on_standard: number;
  slightly_behind: number;
  material_gaps: number;
  critical_gaps: number;
  unknown: number;
  top_opportunities: DailyImprovementCandidate[];
  changes_auto_applied: DailyImprovementCandidate[];
  changes_in_canary: DailyImprovementCandidate[];
  changes_rejected: DailyImprovementCandidate[];
  changes_rolled_back: DailyImprovementCandidate[];
  founder_approval_required: DailyImprovementCandidate[];
  market_changes: string[];
  provider_platform_changes: string[];
  qc_escapes: string[];
  top_sales_learnings: string[];
  top_content_learnings: string[];
  top_prospect_learnings: string[];
  next_day_priorities: string[];
};

export type InfinityNextDayPlan = {
  date: string;
  priorities: Array<{ rank: number; item: string; reason: string }>;
};

export type FounderImprovementApprovalItem = {
  candidate_id: string;
  change: string;
  reason: string;
  evidence: string[];
  benefit: string;
  risk: ImprovementRisk;
  test_result: string;
  rollback: string;
  affected_systems: ReviewedSystem[];
};

export type DailyImprovementCycle = {
  run: DailyImprovementRun;
  report: InfinityDailyImprovementReport;
  next_day: InfinityNextDayPlan;
  approvals: FounderImprovementApprovalItem[];
};
