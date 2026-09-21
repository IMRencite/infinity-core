import {
  MAX_NEW_ORGANIC_ASSETS_PER_DAY,
  ORGANIC_HEALTH_SCOPE,
  ORGANIC_LEASE_NAMESPACE,
} from "@/lib/infinity/runtime-isolation/cross-system";
import { evaluateOrganicWorkLivenessInvariant, transitionOrganicWork } from "./transition";
import { selectFirstOccupancyNpvOrganicOpportunity } from "./opportunity";
import type { OrganicContentOpportunity, OrganicTransitionLog, OrganicWorkObligation } from "./types";

export type OrganicPublishingHold = "PAUSED_FOR_QC_REPAIR" | "PAUSED_FOR_SECOND_QC_ESCAPE" | null;

export type OrganicGrowthSchedulerState = {
  version: 1;
  scope: typeof ORGANIC_HEALTH_SCOPE;
  lease_namespace: typeof ORGANIC_LEASE_NAMESPACE;
  last_tick_at: string | null;
  last_trigger_source: "VERCEL_CRON" | "HTTP" | "UNKNOWN";
  cursor_triggered: boolean;
  founder_triggered: boolean;
  manual_trigger: boolean;
  next_run_at: string | null;
  published_today: number;
  published_day: string | null;
  obligations: OrganicWorkObligation[];
  logs: OrganicTransitionLog[];
  last_error: string | null;
  business_loop: "HEALTHY" | "DEGRADED";
  publishing_hold: OrganicPublishingHold;
  first_canary_status: "ESCAPED_DEFECT" | "REPAIRED_PASS" | "NONE";
  second_canary_status?: "ESCAPED_DEFECT" | "V3_REPAIRED_PASS" | "NONE";
  qc_escape_count: number;
  qc_repair?: {
    human_resource_depth: "PASS" | "FAIL" | "NOT_RUN";
    thin_content: "PASS" | "FAIL" | "NOT_RUN";
    contrast: "PASS" | "FAIL" | "NOT_RUN";
    element_contrast?: "PASS" | "FAIL" | "NOT_RUN";
    rendered_text_visibility: "PASS" | "FAIL" | "NOT_RUN";
    screenshot_capture?: "PASS" | "FAIL" | "NOT_RUN";
    visual_inspection?: "PASS" | "FAIL" | "NOT_RUN";
    layout?: "PASS" | "FAIL" | "NOT_RUN";
    content_density_visual?: "PASS" | "FAIL" | "NOT_RUN";
    intent_coverage?: "PASS" | "FAIL" | "NOT_RUN";
    metadata?: "PASS" | "FAIL" | "NOT_RUN";
    public_internal_language: "PASS" | "FAIL" | "NOT_RUN";
    product_maturity_truth: "PASS" | "FAIL" | "NOT_RUN";
    post_publish?: "PASS" | "FAIL" | "NOT_RUN";
    browser_qc: "PASS" | "FAIL" | "NOT_RUN";
    desktop: "PASS" | "FAIL" | "NOT_RUN";
    tablet: "PASS" | "FAIL" | "NOT_RUN";
    mobile: "PASS" | "FAIL" | "NOT_RUN";
  };
};

const memory: OrganicGrowthSchedulerState = {
  version: 1,
  scope: ORGANIC_HEALTH_SCOPE,
  lease_namespace: ORGANIC_LEASE_NAMESPACE,
  last_tick_at: null,
  last_trigger_source: "UNKNOWN",
  cursor_triggered: false,
  founder_triggered: false,
  manual_trigger: false,
  next_run_at: null,
  published_today: 0,
  published_day: null,
  obligations: [],
  logs: [],
  last_error: null,
  business_loop: "HEALTHY",
  publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE",
  first_canary_status: "REPAIRED_PASS",
  second_canary_status: "ESCAPED_DEFECT",
  qc_escape_count: 2,
};

export function getOrganicGrowthSchedulerState(): OrganicGrowthSchedulerState {
  return memory;
}

export function replaceOrganicGrowthSchedulerState(next: OrganicGrowthSchedulerState): void {
  Object.assign(memory, next);
}

function dayKey(now: string): string {
  return now.slice(0, 10);
}

function nextDailyRun(now: string): string {
  const date = new Date(now);
  date.setUTCHours(date.getUTCHours() + 24);
  return date.toISOString();
}

export function executeOrganicGrowthSchedulerTick(input: {
  now?: string;
  trigger_source: "VERCEL_CRON" | "HTTP" | "UNKNOWN";
  cursor_triggered?: boolean;
  founder_triggered?: boolean;
  execute_publish?: boolean;
}): {
  state: OrganicGrowthSchedulerState;
  opportunity: OrganicContentOpportunity;
  obligation: OrganicWorkObligation | null;
  execute_publish: boolean;
} {
  const now = input.now ?? new Date().toISOString();
  const cron = input.trigger_source === "VERCEL_CRON";
  memory.last_tick_at = now;
  memory.last_trigger_source = input.trigger_source;
  memory.cursor_triggered = Boolean(input.cursor_triggered);
  memory.founder_triggered = Boolean(input.founder_triggered);
  memory.manual_trigger = !cron;
  memory.next_run_at = nextDailyRun(now);
  if (memory.published_day !== dayKey(now)) {
    memory.published_today = 0;
    memory.published_day = dayKey(now);
  }
  const opportunity = selectFirstOccupancyNpvOrganicOpportunity(now);
  const existing = memory.obligations.find((row) => row.opportunity_id === opportunity.opportunity_id);
  let obligation = existing ?? null;
  if (!existing && opportunity.decision === "NEW_PAGE") {
    const created = transitionOrganicWork({
      current: null,
      to_state: "SELECTED",
      expected_version: 0,
      actor: "OrganicGrowthScheduler",
      reason: opportunity.decision_reason,
      now,
      owner: "OrganicGrowthWorker",
      next_action_at: now,
      due_at: new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (created.ok) {
      obligation = {
        ...created.obligation,
        opportunity_id: opportunity.opportunity_id,
        decision: opportunity.decision,
        decision_reason: opportunity.decision_reason,
        asset_type: opportunity.candidate_asset_type,
        title: opportunity.question,
        route: "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      };
      memory.obligations.push(obligation);
      memory.logs.push(created.log);
      const scheduled = transitionOrganicWork({
        current: obligation,
        to_state: "SCHEDULED",
        expected_version: obligation.version,
        actor: "OrganicGrowthScheduler",
        reason: "DAILY_LOOP_ARMED",
        now,
        owner: "OrganicGrowthWorker",
        next_action_at: now,
      });
      if (scheduled.ok) {
        obligation = scheduled.obligation;
        memory.obligations[memory.obligations.length - 1] = obligation;
        memory.logs.push(scheduled.log);
      }
    }
  }
  const overdue = memory.obligations.some((row) => evaluateOrganicWorkLivenessInvariant(row, now).result === "FAIL");
  memory.business_loop = overdue ? "DEGRADED" : "HEALTHY";
  const execute = Boolean(input.execute_publish)
    && !memory.publishing_hold
    && memory.published_today < MAX_NEW_ORGANIC_ASSETS_PER_DAY;
  return { state: memory, opportunity, obligation, execute_publish: execute };
}

export function pauseOrganicPublishingForQcRepair(reason = "QC_ESCAPE"): void {
  memory.publishing_hold = "PAUSED_FOR_QC_REPAIR";
  memory.first_canary_status = "ESCAPED_DEFECT";
  memory.qc_escape_count = Math.max(1, memory.qc_escape_count);
  memory.last_error = reason;
}

export function pauseOrganicPublishingForSecondQcEscape(reason = "SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE"): void {
  memory.publishing_hold = "PAUSED_FOR_SECOND_QC_ESCAPE";
  memory.second_canary_status = "ESCAPED_DEFECT";
  memory.qc_escape_count = Math.max(2, memory.qc_escape_count);
  memory.last_error = reason;
}

export function resumeOrganicPublishingAfterRepairedCanary(): void {
  memory.publishing_hold = null;
  memory.first_canary_status = "REPAIRED_PASS";
  memory.last_error = null;
}

export function resumeOrganicPublishingAfterV3RepairedCanary(): void {
  memory.publishing_hold = null;
  memory.second_canary_status = "V3_REPAIRED_PASS";
  memory.last_error = null;
}

export function recordOrganicPublish(now: string): void {
  if (memory.published_day !== dayKey(now)) {
    memory.published_today = 0;
    memory.published_day = dayKey(now);
  }
  memory.published_today += 1;
}
