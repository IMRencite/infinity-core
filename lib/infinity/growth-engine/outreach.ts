import {
  AFTERNOON_SEND_HYPOTHESIS,
  ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS,
  DEFAULT_CAMPAIGN_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS,
  DEFAULT_MAX_TOUCHES,
  DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
  DEFAULT_STARTING_PROSPECT_TARGET,
  FIVE_CONTACTS_IS_INSUFFICIENT,
  MORNING_SEND_HYPOTHESIS,
  OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT,
  OUTREACH_SEND_TIME_OPTIMIZATION_CONTRACT,
  type NamedGrowthGate,
} from "./contract";

export function estimateContactsForQualifiedConversations(input: {
  minimumQualifiedConversations: number;
  expectedQualifiedConversationRate: number;
}): number {
  const rate = input.expectedQualifiedConversationRate > 0 ? input.expectedQualifiedConversationRate : 0.075;
  return Math.ceil(input.minimumQualifiedConversations / rate);
}

export function defaultValidationCampaign(ventureId: string) {
  return {
    contract: OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT,
    campaign_id: `campaign:${ventureId}:validation`,
    venture_id: ventureId,
    daily_new_contact_target: DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
    campaign_duration_business_days: DEFAULT_CAMPAIGN_BUSINESS_DAYS,
    target_contact_sample: DEFAULT_STARTING_PROSPECT_TARGET,
    max_touches: DEFAULT_MAX_TOUCHES,
    follow_up_1_business_days: DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS,
    follow_up_2_business_days: DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS,
    send_windows: [MORNING_SEND_HYPOTHESIS, AFTERNOON_SEND_HYPOTHESIS],
    timezone_strategy: "recipient_local_time",
    adaptive_volume: true,
    status: "DESIGNED_NOT_SENT",
  };
}

export function evaluateOutreachEvidenceSufficiencyGate(input: {
  prospectsSourced: number;
  qualifiedConversations: number;
  claimedNoDemand: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (input.prospectsSourced <= FIVE_CONTACTS_IS_INSUFFICIENT && input.claimedNoDemand && input.confidence === "HIGH") {
    reasons.push("TINY_SAMPLE_STRONG_NO_DEMAND");
  }
  if (input.prospectsSourced < 15 && input.claimedNoDemand) reasons.push("INSUFFICIENT_CONTACT_SAMPLE");
  return { gate: "OutreachEvidenceSufficiencyGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateOutboundDeliverabilityHealthGate(input: {
  hardBounceRate: number;
  complaintRate: number;
  increasingVolumeWhileUnhealthy: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (input.hardBounceRate > 0.05) reasons.push("HARD_BOUNCE_ELEVATED");
  if (input.complaintRate > 0.001) reasons.push("COMPLAINT_ELEVATED");
  if (input.increasingVolumeWhileUnhealthy) reasons.push("VOLUME_INCREASE_WHILE_UNHEALTHY");
  return { gate: "OutboundDeliverabilityHealthGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function shouldStopColdSequence(event: "reply" | "unsubscribe" | "hard_bounce" | "complaint" | "rejection" | "disqualification" | "none"): boolean {
  return event !== "none";
}

export function isRoutineOvernightHour(hour: number): boolean {
  return hour < 7 || hour >= 21;
}

export function askReviewContactSampleHypothesis(): number {
  return estimateContactsForQualifiedConversations({
    minimumQualifiedConversations: ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS,
    expectedQualifiedConversationRate: 0.075,
  });
}

export function sendTimeOptimizationContract() {
  return {
    contract: OUTREACH_SEND_TIME_OPTIMIZATION_CONTRACT,
    recipientLocalTime: true,
    morningHypothesis: MORNING_SEND_HYPOTHESIS,
    afternoonHypothesis: AFTERNOON_SEND_HYPOTHESIS,
    weekdayOptimization: true,
    hourOptimization: true,
    universalHardCodedBestTime: false,
  };
}
