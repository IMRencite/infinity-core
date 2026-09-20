import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CRE_VENTURE_ID } from "./venture-identity";
import { liveCommercialCheckoutUnhealthy } from "./commercial-readiness";
import {
  AFTERNOON_SEND_HYPOTHESIS,
  DEFAULT_CAMPAIGN_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS,
  DEFAULT_MAX_TOUCHES,
  DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
  DEFAULT_STARTING_PROSPECT_TARGET,
  GROWTH_EXPERIMENT_ACTIVE,
  MORNING_SEND_HYPOTHESIS,
  OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT,
} from "./contract";
import { evaluateAutonomousCommunicationQualityGate, evaluateInfinityIdentityTruthfulnessGate } from "./communication";
import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "@/lib/infinity/production-outbound/email-signature";
import { emptyOutreachEvidenceLedger, type OutreachEvidenceLedger } from "./funnel";
import { evaluateLiveOutboundCommunicationPathGate } from "./path-gate";
import { selectFirstGrowthTactic, selectGrowthTactics } from "./selection";

export const OCCUPANCYNPV_FIRST_GROWTH_EXPERIMENT_PATH =
  ".infinity/growth-engine/occupancynpv-first-experiment.json" as const;

export const OCCUPANCYNPV_GROWTH_CAMPAIGN_ID = `campaign:${CRE_VENTURE_ID}:first-outbound-validation` as const;
export const OCCUPANCYNPV_GROWTH_EXPERIMENT_ID = `experiment:${CRE_VENTURE_ID}:first-growth-v1` as const;
export const OCCUPANCYNPV_PROFESSIONAL_PRICE_USD = 290;
export const OCCUPANCYNPV_PER_DEAL_PRICE_USD = 149;
export const OCCUPANCYNPV_CONSERVATIVE_DAILY_RAMP = 5;
export const OCCUPANCYNPV_MINIMUM_QUALIFIED_CONVERSATIONS = 15;

export const OCCUPANCYNPV_TARGET_SEGMENT = {
  segment: "US tenant-representation brokers and boutique tenant-side CRE advisors",
  qualification:
    "Person/business does tenant-rep or lease-comparison advisory; work email; current enough public context; truthful relevance; not suppressed/duplicate/disqualified",
  evidence: "VentureEconomicsIntelligenceContract customer_segment = US tenant-representation and boutique CRE brokers; OccupancyNPV JTBD is lease occupancy NPV comparison",
  estimatedReachableAudience: "UNKNOWN",
  confidence: "MEDIUM" as const,
};

export const OCCUPANCYNPV_MESSAGE_VARIANTS = [
  {
    id: "variant_problem_framing",
    dimension: "problem framing",
    subject: "Still rebuilding lease scenarios in spreadsheets?",
    body: `Hi —\n\nComparing lease, occupancy, and property scenarios gets messy fast. One change to rent, occupancy, financing, or cap rate can mean rebuilding the whole model just to see what changed.\n\nOccupancyNPV makes that much simpler. You can compare scenarios in one place and quickly see how each decision affects NPV and property value — without rebuilding another spreadsheet.\n\nIf that's something you deal with, I can send you a quick example of how it works.\n\n${OCCUPANCYNPV_EMAIL_SIGNATURE}`,
  },
  {
    id: "variant_value_framing",
    dimension: "value framing",
    subject: "How are you comparing lease scenarios?",
    body: `Hi —\n\nAssumptions for occupancy, rent, and financing are often scattered across models, so updating one input means reconciling several sheets before you can show a client a clean comparison.\n\nOccupancyNPV keeps those assumptions in one workflow so you can see occupancy-cost and NPV impact without switching tools or rebuilding the model.\n\nWould it be useful if I showed you one lease-vs-alternative scenario?\n\n${OCCUPANCYNPV_EMAIL_SIGNATURE}`,
  },
] as const;

export type OccupancynpvFirstGrowthExperiment = {
  campaign_id: typeof OCCUPANCYNPV_GROWTH_CAMPAIGN_ID;
  experiment_id: typeof OCCUPANCYNPV_GROWTH_EXPERIMENT_ID;
  venture_id: typeof CRE_VENTURE_ID;
  contract: typeof OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT;
  selected_tactic: "OUTBOUND_EMAIL";
  status: typeof GROWTH_EXPERIMENT_ACTIVE | "PAUSED" | "DESIGNED_NOT_SENT";
  authorized_to_execute: boolean;
  target_segment: typeof OCCUPANCYNPV_TARGET_SEGMENT.segment;
  daily_new_contact_target: number;
  conservative_daily_ramp: number;
  campaign_duration_business_days: number;
  initial_prospect_target: number;
  minimum_qualified_conversations: number;
  adaptive_volume: true;
  weekday_strategy: "Prefer Tuesday–Thursday initially; collect Monday/Friday evidence over time";
  send_windows: [typeof MORNING_SEND_HYPOTHESIS, typeof AFTERNOON_SEND_HYPOTHESIS];
  timezone_strategy: "recipient_local_time";
  max_touches: number;
  follow_up_1_business_days: number;
  follow_up_2_business_days: number;
  message_variants: typeof OCCUPANCYNPV_MESSAGE_VARIANTS;
  prices_locked: { professional_usd: number; per_deal_usd: number };
  trial_enabled: false;
  ledger: OutreachEvidenceLedger;
  last_cycle_at: string | null;
  next_learning_objective: string;
  stop_on: Array<"reply" | "unsubscribe" | "hard_bounce" | "complaint" | "rejection" | "disqualification">;
  incidents: string[];
};

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") return false;
  return true;
}

function defaultExperiment(): OccupancynpvFirstGrowthExperiment {
  return {
    campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
    experiment_id: OCCUPANCYNPV_GROWTH_EXPERIMENT_ID,
    venture_id: CRE_VENTURE_ID,
    contract: OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT,
    selected_tactic: "OUTBOUND_EMAIL",
    status: GROWTH_EXPERIMENT_ACTIVE,
    authorized_to_execute: true,
    target_segment: OCCUPANCYNPV_TARGET_SEGMENT.segment,
    daily_new_contact_target: DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
    conservative_daily_ramp: OCCUPANCYNPV_CONSERVATIVE_DAILY_RAMP,
    campaign_duration_business_days: DEFAULT_CAMPAIGN_BUSINESS_DAYS,
    initial_prospect_target: DEFAULT_STARTING_PROSPECT_TARGET,
    minimum_qualified_conversations: OCCUPANCYNPV_MINIMUM_QUALIFIED_CONVERSATIONS,
    adaptive_volume: true,
    weekday_strategy: "Prefer Tuesday–Thursday initially; collect Monday/Friday evidence over time",
    send_windows: [MORNING_SEND_HYPOTHESIS, AFTERNOON_SEND_HYPOTHESIS],
    timezone_strategy: "recipient_local_time",
    max_touches: DEFAULT_MAX_TOUCHES,
    follow_up_1_business_days: DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS,
    follow_up_2_business_days: DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS,
    message_variants: OCCUPANCYNPV_MESSAGE_VARIANTS,
    prices_locked: {
      professional_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
      per_deal_usd: OCCUPANCYNPV_PER_DEAL_PRICE_USD,
    },
    trial_enabled: false,
    ledger: emptyOutreachEvidenceLedger(),
    last_cycle_at: null,
    next_learning_objective: "Source and qualify tenant-rep prospects, then send inside recipient-local windows",
    stop_on: ["reply", "unsubscribe", "hard_bounce", "complaint", "rejection", "disqualification"],
    incidents: [],
  };
}

export function readOccupancynpvFirstGrowthExperiment(): OccupancynpvFirstGrowthExperiment | null {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") return null;
  if (!existsSync(OCCUPANCYNPV_FIRST_GROWTH_EXPERIMENT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_FIRST_GROWTH_EXPERIMENT_PATH, "utf8")) as OccupancynpvFirstGrowthExperiment;
  } catch {
    return null;
  }
}

export function persistOccupancynpvFirstGrowthExperiment(
  experiment: OccupancynpvFirstGrowthExperiment,
): OccupancynpvFirstGrowthExperiment {
  if (persistEnabled()) {
    mkdirSync(dirname(OCCUPANCYNPV_FIRST_GROWTH_EXPERIMENT_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_FIRST_GROWTH_EXPERIMENT_PATH, `${JSON.stringify(experiment, null, 2)}\n`);
  }
  return experiment;
}

export function occupancynpvGrowthSelectionInput(communicationPathVerified: boolean) {
  return {
    publiclyLaunched: true,
    checkoutWorks: true,
    fulfillmentWorks: true,
    traffic: "SPARSE" as const,
    timeToValue: "FAST" as const,
    marginalFulfillmentCost: "LOW" as const,
    outreachAppropriate: true,
    searchableFiniteMarket: true,
    organicDemandEvidenced: false,
    interactivePreviewAlreadyLive: true,
    trialAuthorized: false,
    communicationPathVerified,
  };
}

export function evaluateOccupancynpvMessageQuality(): { identity: "PASS" | "FAIL"; quality: "PASS" | "FAIL" } {
  const identity = OCCUPANCYNPV_MESSAGE_VARIANTS.every((variant) =>
    evaluateInfinityIdentityTruthfulnessGate({ opening: variant.body, askedAboutIdentity: false }).result === "PASS",
  );
  const quality = OCCUPANCYNPV_MESSAGE_VARIANTS.every((variant) =>
    evaluateAutonomousCommunicationQualityGate({
      message: variant.body,
      ignoresThread: false,
      repeatsContent: false,
      unsupportedClaim: false,
      continuesAfterOptOut: false,
      wrongVentureContext: false,
    }).result === "PASS",
  );
  return { identity: identity ? "PASS" : "FAIL", quality: quality ? "PASS" : "FAIL" };
}

export function occupancynpvGrowthSourcingCycle(): {
  sourced: number;
  qualified: number;
  queued: number;
  reason: "NO_AUTHORIZED_QUALIFIED_PROSPECT_SOURCE" | "ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED";
} {
  return {
    sourced: 0,
    qualified: 0,
    queued: 0,
    reason: "ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED",
  };
}

export function occupancynpvGrowthSendCycle(ledger: OutreachEvidenceLedger): {
  sent: number;
  reason: "NO_QUALIFIED_PROSPECTS_QUEUED" | "SEND_NOT_EXECUTED";
} {
  if (ledger.prospectsQualified === 0) {
    return { sent: 0, reason: "NO_QUALIFIED_PROSPECTS_QUEUED" };
  }
  return { sent: 0, reason: "SEND_NOT_EXECUTED" };
}

export function activateOccupancynpvFirstGrowthExperiment(input: { persist?: boolean } = {}): OccupancynpvFirstGrowthExperiment {
  const existing = readOccupancynpvFirstGrowthExperiment();
  const path = evaluateLiveOutboundCommunicationPathGate();
  const selected = selectFirstGrowthTactic(occupancynpvGrowthSelectionInput(path.result === "PASS"));
  if (selected.tactic !== "OUTBOUND_EMAIL") {
    throw new Error(`FIRST_GROWTH_TACTIC_UNEXPECTED:${selected.tactic}`);
  }
  const checkoutUnhealthy = liveCommercialCheckoutUnhealthy();
  const next: OccupancynpvFirstGrowthExperiment = {
    ...(existing ?? defaultExperiment()),
    selected_tactic: "OUTBOUND_EMAIL",
    authorized_to_execute: path.result === "PASS" && !checkoutUnhealthy,
    status: checkoutUnhealthy ? "PAUSED" : GROWTH_EXPERIMENT_ACTIVE,
    trial_enabled: false,
    prices_locked: {
      professional_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
      per_deal_usd: OCCUPANCYNPV_PER_DEAL_PRICE_USD,
    },
    incidents: checkoutUnhealthy ? ["LIVE_CHECKOUT_UNHEALTHY"] : existing?.incidents ?? [],
    next_learning_objective: checkoutUnhealthy
      ? "Repair live checkout before driving prospects"
      : "Source and qualify tenant-rep prospects, then send inside recipient-local windows",
  };
  if (input.persist !== false) persistOccupancynpvFirstGrowthExperiment(next);
  return next;
}

export function advanceOccupancynpvGrowthExperiment(input: { persist?: boolean; now?: string } = {}): OccupancynpvFirstGrowthExperiment {
  const current = readOccupancynpvFirstGrowthExperiment() ?? activateOccupancynpvFirstGrowthExperiment({ persist: false });
  const checkoutUnhealthy = liveCommercialCheckoutUnhealthy();
  const sourcing = occupancynpvGrowthSourcingCycle();
  const sending = occupancynpvGrowthSendCycle(current.ledger);
  const next: OccupancynpvFirstGrowthExperiment = {
    ...current,
    last_cycle_at: input.now ?? new Date().toISOString(),
    status: checkoutUnhealthy ? "PAUSED" : GROWTH_EXPERIMENT_ACTIVE,
    authorized_to_execute: !checkoutUnhealthy && current.authorized_to_execute,
    incidents: checkoutUnhealthy
      ? [...new Set([...current.incidents, "LIVE_CHECKOUT_UNHEALTHY"])]
      : current.incidents.filter((row) => row !== "LIVE_CHECKOUT_UNHEALTHY"),
    ledger: current.ledger,
    next_learning_objective: checkoutUnhealthy
      ? "Repair live checkout before driving prospects"
      : sourcing.sourced === 0
        ? "Source and qualify tenant-rep prospects, then send inside recipient-local windows"
        : sending.sent === 0
          ? "Send queued qualified prospects inside recipient-local windows"
          : current.next_learning_objective,
  };
  if (input.persist !== false) persistOccupancynpvFirstGrowthExperiment(next);
  return next;
}

export function occupancynpvGrowthExperimentIsActive(experiment = readOccupancynpvFirstGrowthExperiment()): boolean {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") return false;
  return experiment?.status === GROWTH_EXPERIMENT_ACTIVE;
}

export function occupancynpvRankedTactics() {
  const path = evaluateLiveOutboundCommunicationPathGate();
  return selectGrowthTactics(occupancynpvGrowthSelectionInput(path.result === "PASS"));
}
