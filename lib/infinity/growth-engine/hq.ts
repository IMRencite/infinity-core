import {
  AFTERNOON_SEND_HYPOTHESIS,
  DEFAULT_CAMPAIGN_BUSINESS_DAYS,
  DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
  DEFAULT_STARTING_PROSPECT_TARGET,
  INFINITY_BRAND_NAME,
  MORNING_SEND_HYPOTHESIS,
  type GrowthNexusFloorView,
  type GrowthNexusHqView,
  type VentureGrowthStrategy,
} from "./contract";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { projectOrganicGrowthHq } from "@/lib/infinity/organic-growth-engine/continuous/hq";
import { getOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/store";
import { projectOrganicRuntimeHq } from "@/lib/infinity/organic-growth-engine/obligation/hq";
import { projectSystemBlogHq, projectVentureBlogLiveWork } from "@/lib/infinity/organic-growth-engine/blog-os/live-work";
import { askReviewGrowthRecommendation, occupancynpvGrowthRecommendation } from "./recommendations";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID, readOccupancynpvFirstGrowthExperiment } from "./occupancynpv-experiment";
import { RUNTIME_UNREACHABLE, type HqProductionOperatingState } from "./hq-runtime-projection";

export function applyProductionRuntimeToGrowthNexusView(
  view: GrowthNexusHqView,
  production: HqProductionOperatingState | typeof RUNTIME_UNREACHABLE | null,
): GrowthNexusHqView {
  if (production === RUNTIME_UNREACHABLE) {
    return {
      ...view,
      production: {
        bound: "NO",
        source: RUNTIME_UNREACHABLE,
        freshness: "STALE",
      },
    };
  }
  if (!production || view.strategy.venture_id !== production.campaign.ventureId) return view;
  return {
    ...view,
    campaign: {
      ...view.campaign,
      campaignId: production.campaign.campaignId,
      dailyTarget: production.campaign.initialCap,
      prospectTarget: production.campaign.target,
      newProspectsToday: production.funnel.qualified,
      sourced: production.funnel.rawDiscovered,
      sent: production.funnel.sent,
      delivered: production.funnel.delivered,
      sequenceVolume: production.funnel.sent,
      replies: production.funnel.replied,
      qualifiedReplies: production.funnel.replied,
      qualifiedConversations: production.funnel.qualifiedConversations,
      selectedSegment: production.campaign.segment,
      nextSendWindow: production.nextSendWindow,
      status: `${production.campaign.status} · automation ${production.campaign.automationCompleteness}`,
    },
    deliverability: production.deliverability,
    nextLearningObjective: production.nextLearningObjective,
    production: {
      bound: "YES",
      source: production.source,
      runtime: `${production.runtime.project} · ${production.runtime.projectId}`,
      provider: production.selectedProvider,
      tactic: production.campaign.tactic,
      rawDiscovered: String(production.funnel.rawDiscovered),
      relevant: String(production.funnel.relevant),
      qualifiedContactable: String(production.funnel.qualified),
      discoveredNotContactable: String(production.funnel.discoveredNotContactable),
      queueState: production.funnel.queueState,
      queuedCycleLocal: String(production.funnel.queuedCycleLocal),
      durableQueueDepth: String(production.durableQueue?.depth ?? production.funnel.durableQueueDepth ?? production.funnel.queuedCycleLocal),
      waitingForWindow: String(production.durableQueue?.waitingForWindow ?? production.funnel.waitingForWindow ?? 0),
      sentToday: String(production.durableQueue?.sentToday ?? production.funnel.sentToday ?? production.funnel.sent),
      dailyCap: String(production.durableQueue?.dailyCap ?? production.campaign.initialCap),
      nextSend: production.durableQueue?.nextSend ?? production.nextSendWindow,
      replies: String(production.durableQueue?.replies ?? production.funnel.replied),
      followUpsDue: String(production.durableQueue?.followUpsDue ?? production.funnel.followUpsDue ?? 0),
      lastSourceCycle: production.durableQueue?.lastSourceCycle ?? production.cycle.lastDiscoveryAt ?? "NONE",
      nextSourceDecision: production.durableQueue?.nextSourceDecision ?? "UNKNOWN",
      currentExperiment: production.durableQueue?.currentExperiment ?? "first-outbound-validation",
      sent: String(production.funnel.sent),
      automation: production.automation.overall,
      sourcing: production.automation.sourcing,
      qualification: production.automation.qualification,
      scheduling: production.automation.scheduling,
      sending: production.automation.sending,
      replyRetrieval: production.automation.replyRetrieval,
      followUp: production.automation.followUp,
      classification: production.automation.classification,
      lowRiskReplies: production.automation.lowRiskReplies,
      suppression: production.automation.suppression ?? "UNKNOWN",
      optimization: production.automation.optimization,
      prospect: production.prospects[0]?.businessName ?? "NONE",
      prospectStatus: production.prospects[0]?.status ?? "NONE",
      prospectSource: production.prospects[0]?.sourceProvenance ?? "NONE",
      prospectContact: production.prospects[0]?.contactProvenance ?? "NONE",
      prospectTimezone: production.prospects[0]?.timezone ?? "NONE",
      prospectReason: production.prospects[0]?.qualificationReason ?? "NONE",
      nextSystemGap: production.nextSystemGap,
    },
  };
}

export function buildGrowthNexusHqView(strategy: VentureGrowthStrategy, extras?: {
  trialSuitability?: GrowthNexusHqView["trial"]["suitability"];
  trialStrategy?: string;
  nextTactic?: string;
  production?: HqProductionOperatingState | typeof RUNTIME_UNREACHABLE | null;
}): GrowthNexusHqView {
  const experiment = strategy.venture_id === CRE_VENTURE_ID ? readOccupancynpvFirstGrowthExperiment() : null;
  const ledger = experiment?.ledger;
  const base = {
    strategy,
    channels: [...strategy.primary_acquisition_channels, ...strategy.secondary_channels],
    campaign: {
      campaignId: experiment?.campaign_id ?? (strategy.venture_id === CRE_VENTURE_ID ? OCCUPANCYNPV_GROWTH_CAMPAIGN_ID : `campaign:${strategy.venture_id}:designed`),
      dailyTarget: experiment?.daily_new_contact_target ?? DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
      businessDays: experiment?.campaign_duration_business_days ?? DEFAULT_CAMPAIGN_BUSINESS_DAYS,
      prospectTarget: experiment?.initial_prospect_target ?? DEFAULT_STARTING_PROSPECT_TARGET,
      newProspectsToday: 0,
      sourced: ledger?.prospectsSourced ?? 0,
      sent: ledger?.attempted ?? 0,
      delivered: ledger?.delivered ?? 0,
      sequenceVolume: ledger?.attempted ?? 0,
      replies: ledger?.replied ?? 0,
      qualifiedReplies: ledger?.qualifiedReplies ?? 0,
      qualifiedConversations: ledger?.qualifiedConversations ?? 0,
      selectedSegment: experiment?.target_segment ?? strategy.target_segments[0] ?? "Not selected",
      messageVariant: experiment?.message_variants[0]?.id ?? "designed",
      followUpState: experiment ? `Touch 2 in ${experiment.follow_up_1_business_days}d · Touch 3 in ${experiment.follow_up_2_business_days}d` : "designed",
      sendTimeExperiment: `${MORNING_SEND_HYPOTHESIS} vs ${AFTERNOON_SEND_HYPOTHESIS}`,
      currentBestWindow: (ledger?.attempted ?? 0) > 0
        ? "Learning from send outcomes"
        : "insufficient outcomes — both windows experimental",
      nextSendWindow: (ledger?.prospectsQualified ?? 0) > 0
        ? `${MORNING_SEND_HYPOTHESIS} or ${AFTERNOON_SEND_HYPOTHESIS}`
        : "none — no qualified prospects queued",
      status: experiment?.status ?? strategy.current_status,
    },
    trial: {
      strategy: extras?.trialStrategy ?? strategy.trial_or_entry_strategy,
      suitability: extras?.trialSuitability ?? "INSUFFICIENT_EVIDENCE",
      starts: 0,
      activation: 0,
      valueEvents: 0,
      conversions: 0,
      enabled: false,
    },
    timing: {
      bestSendWindows: [MORNING_SEND_HYPOTHESIS, AFTERNOON_SEND_HYPOTHESIS],
      recipientLocalTime: true,
      responsePacing: "variable 3–90 minutes; urgent bypass; after-hours queue",
    },
    communication: {
      senderIdentity: INFINITY_BRAND_NAME,
      identityPolicy: "BRAND_FIRST / TRUTHFUL_ON_INQUIRY" as const,
      humanImpersonation: "PROHIBITED" as const,
    },
    deliverability: (ledger?.attempted ?? 0) > 0 ? "MEASURED_AFTER_SEND" : "NOT_SENT — mailbox health not yet measured",
    retention: strategy.retention_strategy,
    currentExperiments: strategy.current_experiments,
    nextTactic: extras?.nextTactic ?? strategy.current_tactics[0] ?? "GENERATE_FIRST_EVIDENCE_TACTIC",
    nextLearningObjective: strategy.next_learning_objective,
  };
  return applyProductionRuntimeToGrowthNexusView(base, extras?.production ?? null);
}

export function buildGlobalGrowthNexusFloorView(
  production?: HqProductionOperatingState | typeof RUNTIME_UNREACHABLE | null,
): GrowthNexusFloorView {
  const occupancy = occupancynpvGrowthRecommendation();
  const askReview = askReviewGrowthRecommendation();
  return {
    views: [
      buildGrowthNexusHqView(occupancy.strategy, {
        trialSuitability: occupancy.trialSuitability,
        trialStrategy: occupancy.firstEntryExperiment,
        nextTactic: occupancy.strategy.current_tactics[0],
        production,
      }),
      buildGrowthNexusHqView(askReview.strategy, {
        trialStrategy: askReview.trialEntry,
        nextTactic: "OUTBOUND_EMAIL",
      }),
    ],
    senderIdentity: INFINITY_BRAND_NAME,
    identityPolicy: "BRAND_FIRST / TRUTHFUL_ON_INQUIRY",
    humanImpersonation: "PROHIBITED",
    organic: projectOrganicGrowthHq(getOrganicContinuousState("occupancynpv")),
    organicRuntime: projectOrganicRuntimeHq(),
    blogOs: projectVentureBlogLiveWork("occupancynpv"),
    systemBlog: projectSystemBlogHq(),
  };
}
