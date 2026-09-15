import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { HQ_CURRENT_IMPLEMENTATION_WORK_ID } from "@/lib/infinity/canonical-work/current-implementation";
import { listCanonicalWork } from "@/lib/infinity/canonical-work/store";
import { loadCapitalLedger } from "@/lib/infinity/financial-truth/capital-ledger";
import { projectVentureSpendAuthority } from "@/lib/infinity/financial-truth/spend-authority";
import { listVentureOperationalRecords } from "@/lib/infinity/venture-operating-scale/persist";
import { readOccupancynpvFirstGrowthExperiment } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { isSuppressed } from "@/lib/infinity/growth-engine/suppression";
import { observeSalesFloorForLoop, occupancyNpvSalesEvidence } from "@/lib/infinity/venture-sales-floor";
import type { SalesFloorLoopObservation } from "@/lib/infinity/venture-sales-floor";
import { loadAutonomousLoopState } from "./persist";
import type { AutonomousLoopPersistedState, CustomerReplyClass, VentureDailyReview } from "./types";

export const OCCUPANCYNPV_VENTURE_ID = CRE_VENTURE_ID;
export const ASKREVIEW_LOOP_VENTURE_ID = ASKREVIEW_VENTURE_ID;

export type ObservedVenture = {
  venture_id: string;
  display_name: string;
  eligible: boolean;
  paused: boolean;
  operating_mode: string;
  capital_status: string;
  checkout_ready: boolean;
  checkout_unhealthy: boolean;
  fulfillment_health: string;
  provider_health: "HEALTHY" | "DEGRADED" | "FAILED";
  provider_failure_class: "NONE" | "PROVIDER_FAILURE";
  growth_active: boolean;
  campaign_id: string | null;
  campaign_state: string | null;
  send_executed: boolean;
  sends_attempted: number;
  replies: number;
  replies_pending: boolean;
  reply_class: CustomerReplyClass | null;
  unsubscribe: boolean;
  remaining_spend_authority: number;
  remaining_allocation: number;
  committed: number;
  actual_spend: number;
  paid_acquisition_blocked: true;
  money_movement_disabled: true;
  active_mission_id: string | null;
  active_mission_title: string | null;
  qc_blocked: boolean;
};

export type AutonomousObservation = {
  now: string;
  loop: AutonomousLoopPersistedState;
  ventures: ObservedVenture[];
  occupancy: ObservedVenture | null;
  askreview: ObservedVenture | null;
  active_missions: Array<{ work_id: string; title: string; venture_id: string | null; status: string }>;
  recent_completed: Array<{ work_id: string; title: string }>;
  sales_floor?: SalesFloorLoopObservation;
};

export type ObserveOverrides = {
  occupancy?: Partial<ObservedVenture>;
  askreview?: Partial<ObservedVenture>;
  loop?: AutonomousLoopPersistedState;
  skip_disk_finance?: boolean;
};

function checkoutUnhealthyFromDisk(cwd: string): boolean {
  const relative = process.env.VITEST
    ? ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.vitest.json"
    : ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json";
  const path = join(cwd, relative);
  if (!existsSync(path)) return false;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { result?: string };
    return parsed.result === "FAIL";
  } catch {
    return false;
  }
}

export function classifyCustomerReply(text: string): CustomerReplyClass {
  const body = text.toLowerCase();
  if (/unsubscribe|opt[-\s]?out|remove me|stop emailing/.test(body)) return "UNSUBSCRIBE";
  if (/bounce|mailbox unavailable|user unknown/.test(body)) return "BOUNCE";
  if (/spam|phishing/.test(body)) return "SPAM_RISK";
  if (/not interested|no thanks|don't contact/.test(body)) return "NOT_INTERESTED";
  if (/too expensive|price|budget|concern|worry/.test(body)) return "OBJECTION";
  if (/interested|tell me more|demo|call/.test(body)) return "INTERESTED";
  if (/\?|how does|can you|what is/.test(body)) return "QUESTION";
  if (/yes|let's do|buy|purchase|signed/.test(body)) return "POSITIVE";
  return "UNKNOWN";
}

function defaultOccupancy(nowActive: { work_id: string; title: string } | null): ObservedVenture {
  return {
    venture_id: OCCUPANCYNPV_VENTURE_ID,
    display_name: "OccupancyNPV",
    eligible: true,
    paused: false,
    operating_mode: "OPERATING",
    capital_status: "ALLOCATED",
    checkout_ready: false,
    checkout_unhealthy: false,
    fulfillment_health: "UNKNOWN",
    provider_health: "HEALTHY",
    provider_failure_class: "NONE",
    growth_active: false,
    campaign_id: null,
    campaign_state: null,
    send_executed: false,
    sends_attempted: 0,
    replies: 0,
    replies_pending: false,
    reply_class: null,
    unsubscribe: false,
    remaining_spend_authority: 5,
    remaining_allocation: 25,
    committed: 0,
    actual_spend: 0,
    paid_acquisition_blocked: true,
    money_movement_disabled: true,
    active_mission_id: nowActive?.work_id ?? null,
    active_mission_title: nowActive?.title ?? null,
    qc_blocked: false,
  };
}

function defaultAskReview(): ObservedVenture {
  return {
    venture_id: ASKREVIEW_LOOP_VENTURE_ID,
    display_name: "AskReview",
    eligible: false,
    paused: true,
    operating_mode: "PAUSED",
    capital_status: "RESERVE_ONLY",
    checkout_ready: false,
    checkout_unhealthy: false,
    fulfillment_health: "PAUSED",
    provider_health: "HEALTHY",
    provider_failure_class: "NONE",
    growth_active: false,
    campaign_id: null,
    campaign_state: "PAUSED",
    send_executed: false,
    sends_attempted: 0,
    replies: 0,
    replies_pending: false,
    reply_class: null,
    unsubscribe: false,
    remaining_spend_authority: 0,
    remaining_allocation: 0,
    committed: 0,
    actual_spend: 0,
    paid_acquisition_blocked: true,
    money_movement_disabled: true,
    active_mission_id: null,
    active_mission_title: null,
    qc_blocked: false,
  };
}

export function observeAutonomousPortfolio(input?: {
  now?: string;
  cwd?: string;
  overrides?: ObserveOverrides;
}): AutonomousObservation {
  const now = input?.now ?? new Date().toISOString();
  const cwd = input?.cwd ?? process.cwd();
  const loop = input?.overrides?.loop ?? loadAutonomousLoopState({ now, cwd });
  const work = listCanonicalWork();
  const operatingWork = work.filter((item) => item.work_id !== HQ_CURRENT_IMPLEMENTATION_WORK_ID);
  const active = operatingWork.find((item) => item.status === "ACTIVE") ?? null;
  const current = active ? { work_id: active.work_id, title: active.title } : null;

  let occupancy = defaultOccupancy(current);
  const experiment = readOccupancynpvFirstGrowthExperiment();
  if (experiment) {
    occupancy = {
      ...occupancy,
      growth_active: experiment.status === "GROWTH_EXPERIMENT_ACTIVE" || experiment.status === "DESIGNED_NOT_SENT",
      campaign_id: experiment.campaign_id,
      campaign_state: experiment.status,
      send_executed: experiment.ledger.attempted > 0 && experiment.ledger.delivered > 0,
      sends_attempted: experiment.ledger.attempted,
      replies: experiment.ledger.replied,
      replies_pending: experiment.ledger.attempted > 0 && experiment.ledger.replied === 0,
    };
  }
  occupancy.checkout_unhealthy = checkoutUnhealthyFromDisk(cwd);
  occupancy.checkout_ready = !occupancy.checkout_unhealthy;
  occupancy.fulfillment_health = occupancy.checkout_unhealthy ? "DEGRADED" : "HEALTHY";
  occupancy.unsubscribe = isSuppressed({ ventureId: OCCUPANCYNPV_VENTURE_ID });

  if (!input?.overrides?.skip_disk_finance && !process.env.VITEST) {
    try {
      const authority = projectVentureSpendAuthority(loadCapitalLedger(), OCCUPANCYNPV_VENTURE_ID);
      occupancy.remaining_spend_authority = authority.remaining_spend_authority;
      occupancy.remaining_allocation = authority.unused_allocation;
      occupancy.committed = authority.committed_amount;
      occupancy.actual_spend = authority.actual_spend_amount;
    } catch {
      /* isolated / unreadable ledger stays at defaults */
    }
  }

  const records = listVentureOperationalRecords();
  const occupancyRecord = records.find((row) => row.venture_id === OCCUPANCYNPV_VENTURE_ID);
  if (occupancyRecord) {
    occupancy.operating_mode = occupancyRecord.operating_stage;
    occupancy.capital_status = occupancyRecord.revenue_state;
  }

  occupancy = { ...occupancy, ...input?.overrides?.occupancy };
  const askreview = { ...defaultAskReview(), ...input?.overrides?.askreview };

  return {
    now,
    loop,
    ventures: [occupancy, askreview],
    occupancy,
    askreview,
    active_missions: operatingWork
      .filter((item) => item.status === "ACTIVE")
      .map((item) => ({
        work_id: item.work_id,
        title: item.title,
        venture_id: item.venture_id,
        status: item.status,
      })),
    recent_completed: operatingWork
      .filter((item) => item.status === "COMPLETED" || item.status === "FAILED" || item.status === "CANCELLED")
      .slice(0, 8)
      .map((item) => ({ work_id: item.work_id, title: item.title })),
    sales_floor: observeSalesFloorForLoop(occupancyNpvSalesEvidence({
      sending: Boolean(experiment?.authorized_to_execute && experiment.ledger.attempted > 0),
      authorized_to_execute: experiment?.authorized_to_execute ?? false,
    })),
  };
}

export function projectDailyReviews(observation: AutonomousObservation): VentureDailyReview[] {
  return observation.ventures.map((venture) => ({
    venture_id: venture.venture_id,
    display_name: venture.display_name,
    eligible: venture.eligible,
    paused: venture.paused,
    healthy: venture.eligible && !venture.paused && venture.provider_health === "HEALTHY" && !venture.checkout_unhealthy,
    growth_action_active: venture.growth_active,
    customer_response_pending: venture.replies_pending,
    revenue_status: "NO_REVENUE_OBSERVED",
    actual_costs: venture.actual_spend,
    contribution: null,
    conversion_evidence: "INSUFFICIENT",
    provider_health: venture.provider_health,
    fulfillment_health: venture.fulfillment_health,
    capital_state: venture.capital_status,
    highest_value_next_action: venture.paused
      ? "HOLD_PAUSED_VENTURE"
      : venture.checkout_unhealthy
        ? "REPAIR_COMMERCIAL_CHECKOUT"
        : venture.replies > 0
          ? "RESPOND_TO_CUSTOMER"
          : venture.growth_active
            ? "CONTINUE_EXISTING_GROWTH_OR_WAIT"
            : "NO_ACTION_JUSTIFIED",
  }));
}
