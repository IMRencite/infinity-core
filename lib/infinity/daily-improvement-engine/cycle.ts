import {
  ALWAYS_ON_RUNTIME_NOT_SCHEDULED_ESCAPE,
  CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE,
  MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING_ESCAPE,
  HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED_ESCAPE,
  LIVE_TURN_REPORT_TARGET_MISMATCH_ESCAPE,
  REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE,
  SECOND_ISOLATE_HEALTH_STATE_OVERWRITE_ESCAPE,
  PACING_WINDOW_MISREAD_ESCAPE,
  ROBOTIC_CUSTOMER_FACING_LANGUAGE_ESCAPE,
} from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { BLOG_OS_DAILY_IMPROVEMENT_QUESTIONS } from "@/lib/infinity/organic-growth-engine/blog-os/contract";
import { ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS } from "@/lib/infinity/organic-growth-engine/question-cluster/venture-content-standard";
import {
  classifyImprovementRisk,
  evaluateDailyImprovementLineageGate,
  evaluateDailyImprovementRollbackGate,
  evaluateDailyImprovementSafetyGate,
  ownerForSystem,
} from "./gates";
import {
  REVIEWED_SYSTEMS,
  type DailyImprovementCandidate,
  type DailyImprovementCycle,
  type DailyImprovementObservation,
  type DailyImprovementRun,
  type DailySystemBenchmark,
  type FounderImprovementApprovalItem,
  type InfinityDailyImprovementReport,
  type InfinityNextDayPlan,
  type ReviewedSystem,
} from "./types";

export const DAILY_IMPROVEMENT_LOOP = [
  "OBSERVE",
  "BENCHMARK",
  "COMPARE",
  "IDENTIFY_GAPS",
  "GENERATE_HYPOTHESES",
  "CLASSIFY_RISK",
  "TEST",
  "CANARY",
  "REGRESSION",
  "APPLY_OR_HOLD",
  "MEASURE",
  "LEARN",
  "NEXT_DAY_PLAN",
] as const;

export type OperatingConstraints = {
  outbound_mode: "CANARY" | "OFF" | "LIVE";
  organic_execute_publish: boolean;
  backlink_mode: "DISCOVERY_ONLY" | "ACTIVE";
  mercury_status: "HEALTHY" | "DEGRADED" | "FAILED" | "UNKNOWN";
  affiliate_engine_active: boolean;
  communication_last_error: string | null;
  sales_stage: string | null;
  unresolved_actionable_inbound?: number;
};

const DEFAULT_CONSTRAINTS: OperatingConstraints = {
  outbound_mode: "CANARY",
  organic_execute_publish: false,
  backlink_mode: "DISCOVERY_ONLY",
  mercury_status: "DEGRADED",
  affiliate_engine_active: false,
  communication_last_error: null,
  sales_stage: "ACTIVE_CONVERSATION",
};

function id(prefix: string, system: string): string {
  return `${prefix}:${system.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function observeSystems(now: string, constraints: OperatingConstraints = DEFAULT_CONSTRAINTS): DailyImprovementObservation[] {
  const rows: DailyImprovementObservation[] = [
    {
      observation_id: "obs:sales-canary",
      system: "Sales",
      venture_id: "occupancynpv",
      kind: "INTERNAL",
      summary: `Outbound remains ${constraints.outbound_mode}. OccupancyNPV conversation ${constraints.sales_stage ?? "UNKNOWN"}.`,
      evidence: ["production-outbound closed-loop durable state", "always-closing sales doctrine"],
      sources: ["internal"],
      observed_at: now,
    },
    {
      observation_id: "obs:organic-hold",
      system: "Organic Growth",
      venture_id: "occupancynpv",
      kind: "INTERNAL",
      summary: constraints.organic_execute_publish
        ? `execute_publish:true. Daily improvement observes Organic Growth without mutating obligation state.`
        : `execute_publish:${constraints.organic_execute_publish}. Daily improvement reviews content quality without activating publishing.`,
      evidence: ["organic continuous store", "organic work obligations", "execute_publish flag", "venture blog operating system", ...ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS, ...BLOG_OS_DAILY_IMPROVEMENT_QUESTIONS],
      sources: ["internal"],
      observed_at: now,
    },
    {
      observation_id: "obs:backlink-discovery",
      system: "Backlink Intelligence",
      venture_id: "occupancynpv",
      kind: "INTERNAL",
      summary: `Mode ${constraints.backlink_mode}. Review only; no placement.`,
      evidence: ["backlink intelligence mode"],
      sources: ["internal"],
      observed_at: now,
    },
    {
      observation_id: "obs:affiliate-absent",
      system: "Affiliate / Partner Growth",
      venture_id: null,
      kind: "INTERNAL",
      summary: constraints.affiliate_engine_active
        ? "Affiliate engine is active and eligible for review."
        : "Affiliate / Partner Growth Engine is not implemented. Do not fabricate activity.",
      evidence: ["system registry"],
      sources: ["internal"],
      observed_at: now,
    },
    {
      observation_id: "obs:runtime-gmail",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "INTERNAL",
      summary: constraints.unresolved_actionable_inbound
        ? `ACTIONABLE PROSPECT MESSAGES without provider replies: ${constraints.unresolved_actionable_inbound}`
        : constraints.communication_last_error
          ? `Gmail scheduler last_error ${constraints.communication_last_error}`
          : "Gmail scheduler last_error NONE; provider-reply reconciliation current",
      evidence: ["communication-runtime-scheduler-v1", "CommunicationReconciliationEngine"],
      sources: ["internal"],
      observed_at: now,
    },
    {
      observation_id: "obs:treasury-read-only",
      system: "Treasury Integrations",
      venture_id: null,
      kind: "INTERNAL",
      summary: `Mercury ${constraints.mercury_status}. Read-only observation only.`,
      evidence: ["treasury verification"],
      sources: ["internal"],
      observed_at: now,
    },
    {
      observation_id: "obs:qc-escape",
      system: "QC Gates",
      venture_id: null,
      kind: "QC_ESCAPE",
      summary: ALWAYS_ON_RUNTIME_NOT_SCHEDULED_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...ALWAYS_ON_RUNTIME_NOT_SCHEDULED_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:robotic-language",
      system: "Sales",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: ROBOTIC_CUSTOMER_FACING_LANGUAGE_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...ROBOTIC_CUSTOMER_FACING_LANGUAGE_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:pacing-misread",
      system: "Founder HQ",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: PACING_WINDOW_MISREAD_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...PACING_WINDOW_MISREAD_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:mailbox-watch-blind",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:cron-env-visibility",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:gmail-credential-read-order-race",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: "Token exchange ran before the same cron request later read a valid Gmail fingerprint.",
      evidence: ["GMAIL_CREDENTIAL_READ_ORDER_RACE", "GRANT:NOT_CONFIGURED then PROCESS_ENV 2c60da8a2c79"],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:second-isolate-health-state-overwrite",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: SECOND_ISOLATE_HEALTH_STATE_OVERWRITE_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...SECOND_ISOLATE_HEALTH_STATE_OVERWRITE_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:repeated-actionable-inbound-not-completed",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:high-intent-short-reply-not-reliably-advanced",
      system: "Sales",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:live-turn-report-target-mismatch",
      system: "Communication Runtime",
      venture_id: "occupancynpv",
      kind: "QC_ESCAPE",
      summary: LIVE_TURN_REPORT_TARGET_MISMATCH_ESCAPE.miss_reason.slice(0, 180),
      evidence: [...LIVE_TURN_REPORT_TARGET_MISMATCH_ESCAPE.defect_class],
      sources: ["EscapedDefectRegistry"],
      observed_at: now,
    },
    {
      observation_id: "obs:offer-freshness",
      system: "Conversion Architecture",
      venture_id: "occupancynpv",
      kind: "INTERNAL",
      summary: "OccupancyNPV live pricing still shows a 3-day no-card trial at /pricing.",
      evidence: ["https://occupancynpv.com/pricing"],
      sources: ["official product surface"],
      observed_at: now,
    },
  ];
  return rows;
}

export function benchmarkSystems(observations: DailyImprovementObservation[], constraints: OperatingConstraints = DEFAULT_CONSTRAINTS): DailySystemBenchmark[] {
  const offer = loadVentureOfferProfile("occupancynpv");
  return REVIEWED_SYSTEMS.map((system) => {
    const related = observations.filter((row) => row.system === system);
    const active = !(system === "Affiliate / Partner Growth" && !constraints.affiliate_engine_active);
    let benchmark_state: DailySystemBenchmark["benchmark_state"] = related.length ? "ON_STANDARD" : "UNKNOWN";
    let current_state = related[0]?.summary ?? "No new observation";
    if (system === "Communication Runtime") {
      const unresolved = constraints.unresolved_actionable_inbound ?? 0;
      benchmark_state = unresolved > 0 || constraints.communication_last_error ? "MATERIAL_GAP" : "ON_STANDARD";
      current_state = unresolved > 0
        ? `DEGRADED:UNRESOLVED_ACTIONABLE_INBOUND:${unresolved}`
        : constraints.communication_last_error
          ? `DEGRADED:${constraints.communication_last_error}`
          : "HEALTHY_OR_UNPROVEN";
    }
    if (system === "Treasury Integrations") {
      benchmark_state = constraints.mercury_status === "DEGRADED" ? "MATERIAL_GAP" : constraints.mercury_status === "HEALTHY" ? "ON_STANDARD" : "UNKNOWN";
      current_state = `Mercury ${constraints.mercury_status}`;
    }
    if (system === "Organic Growth") {
      benchmark_state = "ON_STANDARD";
      current_state = `Publishing held (execute_publish:${constraints.organic_execute_publish})`;
    }
    if (system === "Backlink Intelligence") {
      benchmark_state = "ON_STANDARD";
      current_state = constraints.backlink_mode;
    }
    if (system === "Affiliate / Partner Growth") {
      benchmark_state = "UNKNOWN";
      current_state = "NOT_IMPLEMENTED";
    }
    if (system === "Sales") {
      benchmark_state = offer.offer_status === "VERIFIED" ? "ON_STANDARD" : "UNKNOWN";
      current_state = `CANARY · offer ${offer.offer_status}`;
    }
    if (system === "QC Gates") {
      benchmark_state = "SLIGHTLY_BEHIND";
      current_state = "Escaped always-on scheduler defect remains a learning signal";
    }
    return {
      system,
      venture_id: system === "Affiliate / Partner Growth" || system === "Treasury Integrations" ? null : "occupancynpv",
      current_state,
      benchmark_state,
      evidence: related.flatMap((row) => row.evidence),
      active,
    };
  });
}

export function generateCandidates(benchmarks: DailySystemBenchmark[], now: string): DailyImprovementCandidate[] {
  return benchmarks
    .filter((row) => row.active && row.benchmark_state !== "LEADING" && row.benchmark_state !== "ON_STANDARD")
    .map((row) => {
      const risk = classifyImprovementRisk({
        money_movement: row.system === "Treasury Integrations",
        security_auth: row.system === "Security / Auth boundaries",
        copy_or_reporting: row.system === "QC Gates" || row.system === "Performance Intelligence",
      });
      const candidate: DailyImprovementCandidate = {
        candidate_id: id("imp", row.system),
        system: row.system,
        venture_id: row.venture_id,
        current_state: row.current_state,
        benchmark_state: row.benchmark_state,
        gap: row.current_state,
        evidence: row.evidence.length ? row.evidence : ["insufficient — classified UNKNOWN"],
        sources: ["internal inventory"],
        hypothesis: row.system === "Communication Runtime"
          ? "Cron and interactive Gmail reads must share one runtime credential boundary."
          : "Close the observed gap only if evidence, tests, and rollback exist.",
        expected_benefit: "Restore or raise operating quality without inventing a new silo.",
        effort: row.benchmark_state === "CRITICAL_GAP" ? "HIGH" : "MEDIUM",
        risk,
        dependencies: [],
        test_plan: row.system === "Communication Runtime"
          ? "CommunicationRuntimeCronHealthGate + EnvironmentParityGate + no manual tick"
          : `Subsystem tests for ${row.system}`,
        success_metric: row.system === "Communication Runtime" ? "last_error NONE on VERCEL_CRON" : "gap reduced with evidence",
        rollback_plan: "Revert the owning system's last verified deployment.",
        owner: ownerForSystem(row.system),
        approval_requirement: risk === "HIGH_RISK" ? "FOUNDER" : risk === "MEDIUM_RISK" ? "POLICY" : "NONE",
        status: risk === "HIGH_RISK" ? "FOUNDER_REVIEW" : "QUEUED",
      };
      void now;
      return candidate;
    });
}

export function decideCandidates(candidates: DailyImprovementCandidate[]): DailyImprovementCycle["run"]["decisions"] {
  return candidates.map((candidate) => {
    const safety = evaluateDailyImprovementSafetyGate({
      candidate,
      evidence_sufficient: candidate.evidence.length > 0 && !candidate.evidence[0]?.startsWith("insufficient"),
      rollback_exists: Boolean(candidate.rollback_plan),
      auto_apply: candidate.risk === "LOW_RISK" && candidate.approval_requirement === "NONE",
    });
    if (candidate.risk === "HIGH_RISK" || candidate.approval_requirement === "FOUNDER") {
      return { decision_id: `dec:${candidate.candidate_id}`, candidate_id: candidate.candidate_id, action: "FOUNDER_REVIEW", reason: "HIGH_RISK_OR_PROTECTED", approved_by: "POLICY" };
    }
    if (candidate.risk === "MEDIUM_RISK") {
      return { decision_id: `dec:${candidate.candidate_id}`, candidate_id: candidate.candidate_id, action: "CANARY", reason: "MEDIUM_RISK_CANARY_FIRST", approved_by: "POLICY" };
    }
    if (safety.result !== "PASS") {
      return { decision_id: `dec:${candidate.candidate_id}`, candidate_id: candidate.candidate_id, action: "HOLD", reason: safety.reasons.join(","), approved_by: "ENGINE" };
    }
    return { decision_id: `dec:${candidate.candidate_id}`, candidate_id: candidate.candidate_id, action: "HOLD", reason: "LOW_RISK_HELD_UNTIL_SUBSYSTEM_TESTS — newer is not better", approved_by: "ENGINE" };
  });
}

export function buildDailyImprovementReport(input: {
  date: string;
  run: DailyImprovementRun;
  constraints?: OperatingConstraints;
}): InfinityDailyImprovementReport {
  const constraints = input.constraints ?? DEFAULT_CONSTRAINTS;
  const counts = {
    leading: input.run.benchmarks.filter((row) => row.benchmark_state === "LEADING").length,
    on_standard: input.run.benchmarks.filter((row) => row.benchmark_state === "ON_STANDARD").length,
    slightly_behind: input.run.benchmarks.filter((row) => row.benchmark_state === "SLIGHTLY_BEHIND").length,
    material_gaps: input.run.benchmarks.filter((row) => row.benchmark_state === "MATERIAL_GAP").length,
    critical_gaps: input.run.benchmarks.filter((row) => row.benchmark_state === "CRITICAL_GAP").length,
    unknown: input.run.benchmarks.filter((row) => row.benchmark_state === "UNKNOWN").length,
  };
  const byStatus = (status: DailyImprovementCandidate["status"]) => input.run.candidates.filter((row) => row.status === status);
  return {
    date: input.date,
    systems_reviewed: input.run.benchmarks.filter((row) => row.active).map((row) => row.system),
    ventures_reviewed: [...new Set(input.run.benchmarks.map((row) => row.venture_id).filter((row): row is string => Boolean(row)))],
    ...counts,
    top_opportunities: input.run.candidates.slice(0, 5),
    changes_auto_applied: byStatus("APPLIED"),
    changes_in_canary: byStatus("CANARY"),
    changes_rejected: byStatus("REJECTED"),
    changes_rolled_back: byStatus("ROLLED_BACK"),
    founder_approval_required: input.run.candidates.filter((row) => row.status === "FOUNDER_REVIEW" || row.approval_requirement === "FOUNDER"),
    market_changes: input.run.observations.filter((row) => row.kind === "MARKET").map((row) => row.summary),
    provider_platform_changes: input.run.observations.filter((row) => row.kind === "PROVIDER").map((row) => row.summary),
    qc_escapes: input.run.observations.filter((row) => row.kind === "QC_ESCAPE").map((row) => row.summary),
    top_sales_learnings: [
      "Sell the verified offer, not just the product.",
      "Ask for the sale when intent exists.",
      "OccupancyNPV verified conversion destination is /pricing.",
      "Did outbound contain internal terminology?",
      "Did copy sound natural?",
      "Did CTA fit the prospect stage?",
      "Did the real offer get used?",
      "Are we over-explaining?",
      "Are prospects getting enough questions to think about their problem?",
      "Are we asking too many questions?",
      "Are we connecting features to outcomes?",
      "Are we asking for action?",
      "Which phrasing actually progresses deals?",
      "Did consent correctly override sales?",
      "Was role-direction detection correct?",
      "Did we echo an opt-out?",
      "Can a future send still occur after STOP?",
      "Did the report inspect the intended live turn?",
      "Did every actionable inbound receive a provider-level disposition?",
      "Did reconciliation change failed state?",
      "Did any high-intent message exceed SLA?",
      "Did any actionable inbound miss SLA?",
      "Did short contextual replies get classified correctly?",
      "Did any high-intent reply become UNKNOWN?",
      "Did a quality gate block a customer conversation?",
      "Did BLOCKED automatically recover?",
      "Did every actionable inbound reach provider truth?",
      "Did processed keys hide missing provider replies?",
      "Did a BLOCKED job look complete?",
      "Did scheduler HEALTHY hide business-loop failure?",
      "Did any job stay waiting after eligible_at?",
      "Did any stale state prevent valid sales activity?",
      "Did any suppression state differ across runtime paths?",
      "Did mailbox watch stay live after deploy?",
      "Did GRANT:NOT_CONFIGURED blind inbound discovery?",
      "Did any execution context disagree on required env?",
      "Did any cron enter NOT_CONFIGURED?",
      "Did credential source unexpectedly change?",
      "Did fallback activate?",
      "Was there a configuration conflict?",
      "Did token exchange use the same resolved context?",
      "Did any Gmail operation occur before hydration?",
      "Did any context reread credentials independently?",
      "Did any cron require a warm HTTP request?",
      "Did a stale isolate overwrite newer state?",
      "Did a different deployment affect active health?",
      "Did a partial invocation reset a healthy counter?",
      "Did HTTP/diagnostic traffic mutate cron stability?",
    ],
    top_content_learnings: [
      constraints.organic_execute_publish
        ? "Organic publishing is gated. Ask whether any published page failed founder-visible quality."
        : "Organic publishing remains execute_publish:false.",
      "Did actual browser-render evidence get collected?",
      "Did any screenshot PASS only because capture succeeded?",
      "Did any visible text element fail contrast?",
      "Were all text-bearing elements enumerated?",
      "Did computed CSS differ from visible appearance?",
      "Did candidate screenshot match live deployment?",
      "Did page depth rely primarily on a table/list?",
      "Did IntentCoverageGraph contain mention-only nodes?",
      "Did human review contradict an automated PASS?",
      "Did title branding duplicate?",
      "Did obsolete pilot positioning remain?",
      "Did any text fail contrast?",
      "Was any page too thin for intent?",
      "Did internal planning or pilot-concept language leak?",
      "Did HumanValueGate PASS without enough coverage?",
      "Did production proof rely on a shared shell assumption?",
      "Daily improvement must be wired before Continuous Publishing Activation.",
      "Did pacing confuse HQ visibility?",
      "Did any founder-visible state misrepresent healthy operation?",
    ],
    top_prospect_learnings: [
      "Canary outbound only. Do not grow volume from this review.",
    ],
    next_day_priorities: input.run.candidates.slice(0, 5).map((row) => `${row.system}: ${row.gap}`),
  };
}

export function buildNextDayPlan(date: string, candidates: DailyImprovementCandidate[]): InfinityNextDayPlan {
  const ranked = [...candidates].sort((left, right) => {
    const rank = (state: string) => state === "CRITICAL_GAP" ? 0 : state === "MATERIAL_GAP" ? 1 : 2;
    return rank(left.benchmark_state) - rank(right.benchmark_state);
  });
  return {
    date,
    priorities: ranked.slice(0, 8).map((row, index) => ({
      rank: index + 1,
      item: `${row.system} → ${row.owner}`,
      reason: row.gap,
    })),
  };
}

export function runDailyImprovementCycle(input: {
  now: string;
  date: string;
  trigger?: "VERCEL_CRON" | "MANUAL";
  constraints?: OperatingConstraints;
}): DailyImprovementCycle {
  const constraints = input.constraints ?? DEFAULT_CONSTRAINTS;
  const observations = observeSystems(input.now, constraints);
  const benchmarks = benchmarkSystems(observations, constraints);
  const candidates = generateCandidates(benchmarks, input.now);
  const decisions = decideCandidates(candidates);
  const run: DailyImprovementRun = {
    run_id: `dirun:${input.date}`,
    date: input.date,
    started_at: input.now,
    finished_at: input.now,
    trigger: input.trigger ?? "VERCEL_CRON",
    observations,
    benchmarks,
    candidates,
    decisions,
    experiments: [],
    rollbacks: [],
    evidence: observations.map((row) => ({
      evidence_id: `ev:${row.observation_id}`,
      candidate_id: id("imp", row.system),
      kind: row.kind,
      summary: row.summary,
      source: row.sources[0] ?? "internal",
    })),
  };
  const report = buildDailyImprovementReport({ date: input.date, run, constraints });
  const next_day = buildNextDayPlan(input.date, candidates);
  const approvals: FounderImprovementApprovalItem[] = candidates
    .filter((row) => row.approval_requirement === "FOUNDER")
    .map((row) => ({
      candidate_id: row.candidate_id,
      change: row.hypothesis,
      reason: row.gap,
      evidence: row.evidence,
      benefit: row.expected_benefit,
      risk: row.risk,
      test_result: "NOT_RUN",
      rollback: row.rollback_plan,
      affected_systems: [row.system],
    }));
  void evaluateDailyImprovementRollbackGate({ applied: false, rollback: null });
  void evaluateDailyImprovementLineageGate({
    what_changed: "daily improvement cycle recorded",
    why: "nightly observe → benchmark → route",
    evidence: ["DailyImprovementRun"],
    approved_by: "ENGINE",
    before: "no cycle",
    after: run.run_id,
  });
  return { run, report, next_day, approvals };
}

export function reviewedSystems(): ReviewedSystem[] {
  return [...REVIEWED_SYSTEMS];
}
