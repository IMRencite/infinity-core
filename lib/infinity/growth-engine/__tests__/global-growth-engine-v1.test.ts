import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  AFTERNOON_SEND_HYPOTHESIS,
  ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS,
  AUTONOMOUS_RESPONSE_PACING_CONTRACT,
  DEFAULT_CAMPAIGN_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS,
  DEFAULT_MAX_TOUCHES,
  DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
  DEFAULT_STARTING_PROSPECT_TARGET,
  FIVE_CONTACTS_IS_INSUFFICIENT,
  FREE_TRIAL_OFFER_CONTRACT,
  GROWTH_EXPERIMENT_ACTIVE,
  GROWTH_TACTIC_CONTRACT,
  GROWTH_TACTIC_REGISTRY,
  INFINITY_COMMUNICATION_IDENTITY_CONTRACT,
  INFINITY_FIRST_CONTACT_IDENTITY,
  INFINITY_TRUTHFUL_IDENTITY,
  MORNING_SEND_HYPOTHESIS,
  NATURAL_AUTONOMOUS_COMMUNICATION_CONTRACT,
  OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT,
  TRIAL_FULFILLMENT_CONTRACT,
  USAGE_LIMITED_TRIAL_CONTRACT,
  VENTURE_GROWTH_FUNNEL_CONTRACT,
  VENTURE_GROWTH_STRATEGY_CONTRACT,
} from "../contract";
import {
  classifyInboundCommunication,
  communicationContracts,
  evaluateAutonomousCommunicationQualityGate,
  evaluateInfinityIdentityTruthfulnessGate,
  firstContactIdentity,
  identityReply,
  planResponseDelay,
} from "../communication";
import { emptyOutreachEvidenceLedger, ventureGrowthFunnelContract } from "../funnel";
import { buildGlobalGrowthNexusFloorView } from "../hq";
import { growthOutcomeLearningTarget } from "../learning";
import {
  askReviewContactSampleHypothesis,
  defaultValidationCampaign,
  estimateContactsForQualifiedConversations,
  evaluateOutboundDeliverabilityHealthGate,
  evaluateOutreachEvidenceSufficiencyGate,
  isRoutineOvernightHour,
  sendTimeOptimizationContract,
  shouldStopColdSequence,
} from "../outreach";
import {
  evaluatePassiveEvidenceWaitingGate,
  evaluateVentureGrowthReadinessGate,
} from "../readiness";
import { askReviewGrowthRecommendation, futureVentureReceivesGrowthDefaults, occupancynpvGrowthRecommendation } from "../recommendations";
import { growthTacticContract, listGrowthTactics, rankGrowthTactics } from "../tactics";
import {
  evaluateAutoConversionSafety,
  evaluateFreeTrialSuitabilityGate,
  evaluateTrialAbuseRiskGate,
  evaluateTrialActivationGate,
  trialContractsPresent,
} from "../trial";

const ROOT = process.cwd();

describe("GrowthTacticRegistry", () => {
  it("registers provider-neutral tactics including trials, outreach, and organic channels", () => {
    const tactics = listGrowthTactics();
    expect(GROWTH_TACTIC_REGISTRY).toBe("GrowthTacticRegistry");
    expect(growthTacticContract("FREE_TRIAL").contract).toBe(GROWTH_TACTIC_CONTRACT);
    expect(tactics).toEqual(expect.arrayContaining([
      "FREE_TRIAL",
      "LIMITED_FREE_USAGE",
      "OUTBOUND_EMAIL",
      "SEO",
      "PAID_SEARCH",
      "REFERRAL",
    ]));
    expect(rankGrowthTactics({
      productModel: "marketplace",
      timeToValue: "SLOW",
      marginalFulfillmentCost: "HIGH",
      supportBurden: "HIGH",
      traffic: "PRESENT",
      competitiveNormsIncludeTrial: false,
      outreachAppropriate: false,
    }).some((row) => row.tactic === "OUTBOUND_EMAIL")).toBe(false);
  });
});

describe("VentureGrowthStrategyContract", () => {
  it("OccupancyNPV is GROWTH_EXPERIMENT_ACTIVE instead of passive waiting", () => {
    const rec = occupancynpvGrowthRecommendation();
    expect(rec.strategy.contract).toBe(VENTURE_GROWTH_STRATEGY_CONTRACT);
    expect(rec.strategy.venture_id).toBe(CRE_VENTURE_ID);
    expect(rec.strategy.current_status).toBe(GROWTH_EXPERIMENT_ACTIVE);
    expect(rec.strategy.authorized_to_execute).toBe(false);
    expect(rec.strategy.economic_guardrails.join(" ")).toContain("$290/year");
    expect(rec.strategy.economic_guardrails.join(" ")).toContain("$149");
    expect(rec.trialSuitability).toBe("TEST");
    expect(rec.firstEntryExperiment).toMatch(/First comparison free/);
    expect(evaluatePassiveEvidenceWaitingGate({
      status: rec.strategy.current_status,
      activeOrRecentEvidenceTactic: true,
      legitimateExternalDependency: false,
    }).result).toBe("PASS");
    expect(evaluatePassiveEvidenceWaitingGate({
      status: "WAITING_FOR_EVIDENCE",
      activeOrRecentEvidenceTactic: false,
      legitimateExternalDependency: false,
    }).result).toBe("FAIL");
  });

  it("future ventures receive a growth strategy without a founder prompt", () => {
    const created = futureVentureReceivesGrowthDefaults("candidate:future-1");
    expect(created.contract).toBe(VENTURE_GROWTH_STRATEGY_CONTRACT);
    expect(created.current_status).toBe("GROWTH_STRATEGY_REQUIRED");
    expect(created.trial_or_entry_strategy).toMatch(/do not default to free trial/i);
    expect(evaluateVentureGrowthReadinessGate({
      hasStrategy: true,
      hasAcquisitionPath: true,
      hasConversionPath: true,
      hasMeasurement: true,
      hasInitialTactic: true,
      hasNextLearningObjective: true,
    }).result).toBe("PASS");
  });
});

describe("trial architecture", () => {
  it("supports time-based and usage-limited trials with consent-gated auto-conversion", () => {
    expect(trialContractsPresent()).toEqual([
      FREE_TRIAL_OFFER_CONTRACT,
      USAGE_LIMITED_TRIAL_CONTRACT,
      TRIAL_FULFILLMENT_CONTRACT,
    ]);
    expect(evaluateTrialActivationGate({ enabled: true, authorized: false }).result).toBe("FAIL");
    expect(evaluateTrialAbuseRiskGate({ invasiveSurveillance: true, proportionateControls: true }).result).toBe("FAIL");
    expect(evaluateAutoConversionSafety({
      explicitConsent: false,
      durationShown: true,
      postTrialPriceShown: true,
      billingFrequencyShown: true,
      billingDateShown: true,
      paymentMethodValid: true,
      customerCancelled: false,
      paymentPathHealthy: true,
      fulfillmentHealthy: true,
    }).reasons).toContain("CONSENT_MISSING");
    expect(evaluateAutoConversionSafety({
      explicitConsent: true,
      durationShown: true,
      postTrialPriceShown: false,
      billingFrequencyShown: true,
      billingDateShown: true,
      paymentMethodValid: true,
      customerCancelled: false,
      paymentPathHealthy: true,
      fulfillmentHealthy: true,
    }).reasons).toContain("POST_TRIAL_PRICE_UNDISCLOSED");
    expect(evaluateAutoConversionSafety({
      explicitConsent: true,
      durationShown: true,
      postTrialPriceShown: true,
      billingFrequencyShown: true,
      billingDateShown: true,
      paymentMethodValid: true,
      customerCancelled: true,
      paymentPathHealthy: true,
      fulfillmentHealthy: true,
    }).reasons).toContain("CANCELLED_BEFORE_BILLING");
    expect(evaluateAutoConversionSafety({
      explicitConsent: true,
      durationShown: true,
      postTrialPriceShown: true,
      billingFrequencyShown: true,
      billingDateShown: true,
      paymentMethodValid: true,
      customerCancelled: false,
      paymentPathHealthy: false,
      fulfillmentHealthy: true,
    }).reasons).toContain("PAYMENT_PATH_UNHEALTHY");
    expect(evaluateFreeTrialSuitabilityGate({
      timeToValue: "UNKNOWN",
      usageFrequency: "UNKNOWN",
      marginalCost: "UNKNOWN",
      providerCost: "UNKNOWN",
      supportBurden: "UNKNOWN",
      abuseRisk: "UNKNOWN",
      competitiveNormsIncludeTrial: false,
      purchaseFriction: "UNKNOWN",
    }).result).toBe("INSUFFICIENT_EVIDENCE");
  });
});

describe("outreach volume and evidence", () => {
  it("uses 10 qualified prospects/day for 20 business days as an adaptive default", () => {
    const campaign = defaultValidationCampaign(CRE_VENTURE_ID);
    expect(campaign.contract).toBe(OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT);
    expect(campaign.daily_new_contact_target).toBe(DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY);
    expect(campaign.campaign_duration_business_days).toBe(DEFAULT_CAMPAIGN_BUSINESS_DAYS);
    expect(campaign.target_contact_sample).toBe(DEFAULT_STARTING_PROSPECT_TARGET);
    expect(campaign.adaptive_volume).toBe(true);
    expect(DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY).toBe(10);
    expect(DEFAULT_CAMPAIGN_BUSINESS_DAYS).toBe(20);
    expect(DEFAULT_STARTING_PROSPECT_TARGET).toBe(200);
  });

  it("does not treat 15 qualified conversations as 15 contacts", () => {
    expect(ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS).toBe(15);
    const sample = askReviewContactSampleHypothesis();
    expect(sample).toBeGreaterThan(15);
    expect(sample).toBe(estimateContactsForQualifiedConversations({
      minimumQualifiedConversations: 15,
      expectedQualifiedConversationRate: 0.075,
    }));
    expect(askReviewGrowthRecommendation().contactSample).toBe(sample);
    expect(askReviewGrowthRecommendation().dailyContacts).toBe(10);
  });

  it("rejects a 5-contact high-confidence NO DEMAND claim", () => {
    expect(FIVE_CONTACTS_IS_INSUFFICIENT).toBe(5);
    const fail = evaluateOutreachEvidenceSufficiencyGate({
      prospectsSourced: 5,
      qualifiedConversations: 0,
      claimedNoDemand: true,
      confidence: "HIGH",
    });
    expect(fail.result).toBe("FAIL");
    const ledger = emptyOutreachEvidenceLedger();
    expect(ledger.qualifiedConversations).toBe(0);
    expect(ledger.actualPurchase).toBe(0);
  });

  it("schedules in recipient local time and stops on reply/unsubscribe/bounce/complaint", () => {
    const timing = sendTimeOptimizationContract();
    expect(timing.recipientLocalTime).toBe(true);
    expect(timing.morningHypothesis).toBe(MORNING_SEND_HYPOTHESIS);
    expect(timing.afternoonHypothesis).toBe(AFTERNOON_SEND_HYPOTHESIS);
    expect(timing.weekdayOptimization).toBe(true);
    expect(timing.hourOptimization).toBe(true);
    expect(timing.universalHardCodedBestTime).toBe(false);
    expect(isRoutineOvernightHour(2)).toBe(true);
    expect(isRoutineOvernightHour(9)).toBe(false);
    expect(shouldStopColdSequence("reply")).toBe(true);
    expect(shouldStopColdSequence("unsubscribe")).toBe(true);
    expect(shouldStopColdSequence("hard_bounce")).toBe(true);
    expect(shouldStopColdSequence("complaint")).toBe(true);
    expect(shouldStopColdSequence("none")).toBe(false);
    expect(DEFAULT_MAX_TOUCHES).toBe(3);
    expect(DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS).toBe(3);
    expect(DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS).toBe(6);
    expect(evaluateOutboundDeliverabilityHealthGate({
      hardBounceRate: 0.2,
      complaintRate: 0.01,
      increasingVolumeWhileUnhealthy: true,
    }).result).toBe("FAIL");
  });
});

describe("identity and natural communication", () => {
  it("allows I’m Infinity first contact and requires truthful answers when asked", () => {
    expect(communicationContracts().identity).toBe(INFINITY_COMMUNICATION_IDENTITY_CONTRACT);
    expect(communicationContracts().natural).toBe(NATURAL_AUTONOMOUS_COMMUNICATION_CONTRACT);
    expect(firstContactIdentity()).toBe(INFINITY_FIRST_CONTACT_IDENTITY);
    expect(firstContactIdentity("Sarah")).toBe("Hi Sarah — I’m Infinity.");
    expect(communicationContracts().fullDisclosureRequiredInEveryOpening).toBe(false);
    expect(evaluateInfinityIdentityTruthfulnessGate({
      opening: firstContactIdentity(),
      askedAboutIdentity: false,
    }).result).toBe("PASS");
    expect(identityReply("IDENTITY_QUESTION")).toBe(INFINITY_TRUTHFUL_IDENTITY);
    expect(evaluateInfinityIdentityTruthfulnessGate({
      opening: firstContactIdentity(),
      askedAboutIdentity: true,
      reply: INFINITY_TRUTHFUL_IDENTITY,
    }).result).toBe("PASS");
    expect(evaluateInfinityIdentityTruthfulnessGate({
      opening: "Hi, I’m Sarah from sales",
      askedAboutIdentity: false,
    }).result).toBe("FAIL");
    expect(evaluateInfinityIdentityTruthfulnessGate({
      opening: firstContactIdentity(),
      askedAboutIdentity: true,
      reply: "I am not an AI, I'm a real human",
    }).result).toBe("FAIL");
    expect(evaluateAutonomousCommunicationQualityGate({
      message: "Just circling back to see if you had a chance to review.",
      ignoresThread: true,
      repeatsContent: true,
      unsupportedClaim: false,
      continuesAfterOptOut: true,
      wrongVentureContext: false,
    }).result).toBe("FAIL");
    expect(classifyInboundCommunication("Are you a bot?")).toBe("IDENTITY_QUESTION");
  });
});

describe("response pacing", () => {
  it("uses variable routine delay and never artificially delays urgent issues", () => {
    expect(communicationContracts().pacing).toBe(AUTONOMOUS_RESPONSE_PACING_CONTRACT);
    const urgent = planResponseDelay({ urgent: true, afterHoursRecipientLocal: true, complexity: "LOW" });
    expect(urgent.delayMinutes).toBe(0);
    expect(urgent.artificiallyDelayedUrgent).toBe(false);
    expect(urgent.queueForNextWindow).toBe(false);
    const afterHours = planResponseDelay({ urgent: false, afterHoursRecipientLocal: true, complexity: "LOW" });
    expect(afterHours.queueForNextWindow).toBe(true);
    const low = planResponseDelay({ urgent: false, afterHoursRecipientLocal: false, complexity: "LOW" });
    const high = planResponseDelay({ urgent: false, afterHoursRecipientLocal: false, complexity: "HIGH" });
    expect(low.delayMinutes).toBeGreaterThanOrEqual(3);
    expect(high.delayMinutes).toBeGreaterThan(low.delayMinutes);
    expect(low.delayMinutes).not.toBe(high.delayMinutes);
  });
});

describe("Growth Nexus and learning", () => {
  it("projects strategy, volume, trial, timing, and communication into Growth Nexus", () => {
    const floor = buildGlobalGrowthNexusFloorView();
    expect(floor.senderIdentity).toBe("Infinity");
    expect(floor.identityPolicy).toBe("BRAND_FIRST / TRUTHFUL_ON_INQUIRY");
    expect(floor.humanImpersonation).toBe("PROHIBITED");
    const occ = floor.views.find((view) => view.strategy.venture_id === CRE_VENTURE_ID);
    const ask = floor.views.find((view) => view.strategy.venture_id === ASKREVIEW_VENTURE_ID);
    expect(occ?.channels.length).toBeGreaterThan(0);
    expect(occ?.campaign.dailyTarget).toBe(10);
    expect(occ?.campaign.qualifiedConversations).toBe(0);
    expect(occ?.trial.strategy).toMatch(/trial|comparison|purchase/i);
    expect(occ?.timing.bestSendWindows.join(" ")).toContain("08:30-10:30");
    expect(occ?.timing.responsePacing).toMatch(/variable/);
    expect(occ?.nextTactic).toBeTruthy();
    expect(occ?.nextLearningObjective).toBeTruthy();
    expect(ask?.trial.enabled).toBe(false);
    expect(ventureGrowthFunnelContract().contract).toBe(VENTURE_GROWTH_FUNNEL_CONTRACT);
    expect(growthOutcomeLearningTarget({ ventureId: CRE_VENTURE_ID, metric: "reply", synthetic: true })).toBeNull();
    expect(growthOutcomeLearningTarget({ ventureId: CRE_VENTURE_ID, metric: "reply", synthetic: false })).toBe("PerformanceIntelligence");
    const panel = readFileSync(join(ROOT, "components/dashboard/operator-console/department-detail-panel.tsx"), "utf8");
    expect(panel).toContain("Growth Strategy");
    expect(panel).toContain("Qualified Conversations");
    expect(panel).toContain("Best Send Windows");
    expect(panel).toContain("Response Pacing");
    expect(panel).toContain("Next Learning Objective");
    expect(panel).toContain("Selected Segment");
    expect(panel).toContain("Contacts Sent");
    expect(panel).toContain("Send-Time Experiment");
    expect(panel).toContain("Current Best Window");
  });
});
