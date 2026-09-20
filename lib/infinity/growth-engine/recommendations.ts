import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  AFTERNOON_SEND_HYPOTHESIS,
  ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS,
  DEFAULT_CAMPAIGN_BUSINESS_DAYS,
  DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
  DEFAULT_STARTING_PROSPECT_TARGET,
  MORNING_SEND_HYPOTHESIS,
  VENTURE_GROWTH_STRATEGY_CONTRACT,
  type TrialSuitability,
  type VentureGrowthStrategy,
} from "./contract";
import { evaluateFreeTrialSuitabilityGate } from "./trial";
import { askReviewContactSampleHypothesis, defaultValidationCampaign } from "./outreach";
import { classifyOperatingGrowthState } from "./readiness";
import { rankGrowthTactics } from "./tactics";
import {
  OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
  occupancynpvGrowthSelectionInput,
  readOccupancynpvFirstGrowthExperiment,
} from "./occupancynpv-experiment";
import { evaluateLiveOutboundCommunicationPathGate } from "./path-gate";
import { selectGrowthTactics } from "./selection";

export function occupancynpvGrowthRecommendation(): {
  strategy: VentureGrowthStrategy;
  trialSuitability: TrialSuitability;
  firstEntryExperiment: string;
  targetSegment: string;
  outreachVolume: string;
  timingExperiment: string;
} {
  const suitability = evaluateFreeTrialSuitabilityGate({
    timeToValue: "FAST",
    usageFrequency: "MEDIUM",
    marginalCost: "LOW",
    providerCost: "UNKNOWN",
    supportBurden: "UNKNOWN",
    abuseRisk: "UNKNOWN",
    competitiveNormsIncludeTrial: true,
    purchaseFriction: "HIGH",
  });
  const path = evaluateLiveOutboundCommunicationPathGate();
  const experiment = readOccupancynpvFirstGrowthExperiment();
  const ranked = selectGrowthTactics(occupancynpvGrowthSelectionInput(path.result === "PASS"));
  const status = classifyOperatingGrowthState({
    publiclyLaunched: true,
    evidenceGeneratingTactic: true,
    sparsePerformanceEvidence: true,
  });
  const tactics = ranked.length > 0
    ? ranked.map((row) => row.tactic)
    : rankGrowthTactics({
      productModel: "B2B SaaS lease NPV",
      timeToValue: "FAST",
      marginalFulfillmentCost: "LOW",
      supportBurden: "UNKNOWN",
      traffic: "SPARSE",
      competitiveNormsIncludeTrial: true,
      outreachAppropriate: true,
    }).map((row) => row.tactic);
  return {
    strategy: {
      contract: VENTURE_GROWTH_STRATEGY_CONTRACT,
      venture_id: CRE_VENTURE_ID,
      target_segments: ["tenant-representation brokers", "small CRE analysis teams"],
      positioning: "Faster lease-scenario NPV comparison for tenant-rep work",
      primary_acquisition_channels: ["OUTBOUND_EMAIL", "INTERACTIVE_PREVIEW"],
      secondary_channels: ["SEO", "ORGANIC_CONTENT"],
      conversion_strategy: "Value event is a meaningful lease comparison, not signup alone",
      activation_strategy: "Guided first comparison with sample data",
      trial_or_entry_strategy: "Compare first comparison free vs Professional time-based trial vs interactive sample vs direct purchase. Do not enable yet.",
      outreach_strategy: `${DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY}/business day for ~${DEFAULT_CAMPAIGN_BUSINESS_DAYS} days (~${DEFAULT_STARTING_PROSPECT_TARGET} qualified prospects), adaptive; start ${experiment?.conservative_daily_ramp ?? 5}/day until mailbox health is measured`,
      follow_up_strategy: "Touch 2 at ~3 business days; Touch 3 at ~5–7 business days; stop on reply/opt-out/bounce/complaint",
      retention_strategy: "Track comparison reuse, renewal, and support burden after paid conversion",
      current_tactics: tactics,
      current_experiments: [OCCUPANCYNPV_GROWTH_CAMPAIGN_ID, "send-window-hypothesis", "entry-offer-comparison"],
      economic_guardrails: ["Do not change $290/year Professional or $149 Per-Deal", "UNKNOWN cost is not zero"],
      budget_guardrails: ["No ad spend", "No unsolicited test sends", "Conservative mailbox ramp"],
      current_evidence: ["PUBLICLY_LAUNCHED", "payment/checkout/fulfillment PASS", "performance evidence sparse", "first outbound experiment active"],
      next_learning_objective: experiment?.next_learning_objective
        ?? "Source and qualify tenant-rep prospects, then send inside recipient-local windows",
      current_status: experiment?.status === "PAUSED" ? "QUEUED" : status,
      last_updated_at: experiment?.last_cycle_at ?? "2026-09-10T17:00:00.000Z",
      value_event: "meaningful lease comparison completed",
      authorized_to_execute: Boolean(experiment?.authorized_to_execute && path.result === "PASS"),
    },
    trialSuitability: suitability.result,
    firstEntryExperiment: "First comparison free vs Professional time-based trial vs interactive sample vs direct purchase",
    targetSegment: "tenant-representation brokers with active lease comparison work",
    outreachVolume: `${DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY} qualified new prospects/business day × ${DEFAULT_CAMPAIGN_BUSINESS_DAYS} business days ≈ ${DEFAULT_STARTING_PROSPECT_TARGET}`,
    timingExperiment: `${MORNING_SEND_HYPOTHESIS} vs ${AFTERNOON_SEND_HYPOTHESIS}`,
  };
}

export function askReviewGrowthRecommendation(): {
  strategy: VentureGrowthStrategy;
  contactSample: number;
  dailyContacts: number;
  trialEntry: string;
} {
  const campaign = defaultValidationCampaign(ASKREVIEW_VENTURE_ID);
  return {
    strategy: {
      contract: VENTURE_GROWTH_STRATEGY_CONTRACT,
      venture_id: ASKREVIEW_VENTURE_ID,
      target_segments: ["local SMB operators who need review requests"],
      positioning: "Affordable review-request / QR kit for small locations",
      primary_acquisition_channels: ["OUTBOUND_EMAIL", "FIRST_USE_FREE"],
      secondary_channels: ["ORGANIC_SOCIAL"],
      conversion_strategy: "Value event is a review request or QR kit generated",
      activation_strategy: "First location kit preview",
      trial_or_entry_strategy: "Evaluate first location free / QR preview / limited free location / time-based trial / direct purchase. Production paused.",
      outreach_strategy: `Size contact volume to reach ${ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS} qualified conversations, not ${ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS} contacts`,
      follow_up_strategy: campaign.follow_up_1_business_days + " then " + campaign.follow_up_2_business_days + " business days; stop on reply",
      retention_strategy: "Not activated while production is paused",
      current_tactics: ["OUTBOUND_EMAIL", "FIRST_USE_FREE", "INTERACTIVE_PREVIEW"],
      current_experiments: ["qualified-conversation-volume"],
      economic_guardrails: ["$29/month HYPOTHESIS", "$49 one-time HYPOTHESIS"],
      budget_guardrails: ["No payment activation", "No real outreach"],
      current_evidence: ["SELECTION_UNDER_REVIEW", "PRODUCTION PAUSED"],
      next_learning_objective: `Enough qualified conversations to test willingness to pay (${ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS} minimum)`,
      current_status: "GROWTH_STRATEGY_REQUIRED",
      last_updated_at: "2026-09-10T00:00:00.000Z",
      value_event: "review request / QR kit generated",
      authorized_to_execute: false,
    },
    contactSample: askReviewContactSampleHypothesis(),
    dailyContacts: DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
    trialEntry: "First location free / QR preview versus time-based trial versus direct purchase",
  };
}

export function futureVentureReceivesGrowthDefaults(ventureId: string): VentureGrowthStrategy {
  return {
    contract: VENTURE_GROWTH_STRATEGY_CONTRACT,
    venture_id: ventureId,
    target_segments: [],
    positioning: "To be generated from canonical research",
    primary_acquisition_channels: [],
    secondary_channels: [],
    conversion_strategy: "Define VALUE_EVENT before optimizing signups",
    activation_strategy: "Required before public launch readiness",
    trial_or_entry_strategy: "Analyze; do not default to free trial",
    outreach_strategy: "Select only if recipients can be qualified; otherwise use other channels",
    follow_up_strategy: "Bounded sequence with stop rules",
    retention_strategy: "Required after paid conversion",
    current_tactics: [],
    current_experiments: [],
    economic_guardrails: ["Consume VentureEconomicsIntelligenceContract"],
    budget_guardrails: ["No spend without authority"],
    current_evidence: [],
    next_learning_objective: "Generate the first evidence-producing tactic",
    current_status: "GROWTH_STRATEGY_REQUIRED",
    last_updated_at: "2026-09-10T00:00:00.000Z",
    value_event: "UNKNOWN",
    authorized_to_execute: false,
  };
}
