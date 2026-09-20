import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "./occupancynpv-experiment";
import { evaluateOutboundProspectQualificationGate, type QualifiedOutboundProspect } from "./qualification";
import { evaluateAutonomousCommunicationQualityGate, evaluateInfinityIdentityTruthfulnessGate } from "./communication";
import { evaluateOutboundDeliverabilityHealthGate } from "./outreach";
import { recipientLocalWindowEligible } from "./scheduler-coverage";
import { evaluateLiveOutboundCommunicationPathGate } from "./path-gate";
import { GROWTH_EXPERIMENT_ACTIVE } from "./contract";

export const PER_PROSPECT_OUTBOUND_AUTHORIZATION_GATE = "PerProspectOutboundAuthorizationGate" as const;
export { OCCUPANCYNPV_GROWTH_BOUNDED_SEND_GRANT } from "./founder-grant";

export function evaluatePerProspectOutboundAuthorizationGate(input: {
  prospect: QualifiedOutboundProspect;
  campaignId: string;
  campaignStatus: string;
  message: string;
  variantId: string;
  recipientLocalHour: number;
  recipientLocalMinute: number;
  recipientLocalWeekday: number;
  dailySent: number;
  dailyCap: number;
  attempted?: number;
  hardBounceRate?: number;
  complaintRate?: number;
}): {
  gate: typeof PER_PROSPECT_OUTBOUND_AUTHORIZATION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  prospectSendAuthorized: boolean;
} {
  const reasons: string[] = [];
  if (input.campaignId !== OCCUPANCYNPV_GROWTH_CAMPAIGN_ID) reasons.push("CAMPAIGN_SCOPE_VIOLATION");
  if (input.campaignStatus !== GROWTH_EXPERIMENT_ACTIVE && input.campaignStatus !== "WAITING_FOR_SEND_WINDOW") {
    reasons.push("CAMPAIGN_NOT_ACTIVE");
  }
  const qualification = evaluateOutboundProspectQualificationGate(input.prospect);
  if (qualification.result !== "PASS") reasons.push(...qualification.reasons.map((row) => `QUALIFICATION:${row}`));
  const quality = evaluateAutonomousCommunicationQualityGate({
    message: input.message,
    ignoresThread: false,
    repeatsContent: false,
    unsupportedClaim: false,
    continuesAfterOptOut: false,
    wrongVentureContext: false,
  });
  if (quality.result !== "PASS") reasons.push("COMMUNICATION_QUALITY_FAIL");
  const identity = evaluateInfinityIdentityTruthfulnessGate({
    opening: input.message,
    askedAboutIdentity: false,
  });
  if (identity.result !== "PASS") reasons.push("IDENTITY_FAIL");
  if (!["variant_problem_framing", "variant_value_framing"].includes(input.variantId)) {
    reasons.push("UNREGISTERED_VARIANT");
  }
  if (!recipientLocalWindowEligible(input.recipientLocalHour, input.recipientLocalMinute)) {
    reasons.push("OUTSIDE_LOCAL_WINDOW");
  }
  if (input.recipientLocalWeekday === 0 || input.recipientLocalWeekday === 6) reasons.push("WEEKEND_BLOCKED");
  if (input.dailySent >= input.dailyCap) reasons.push("DAILY_CAP_REACHED");
  const deliverability = evaluateOutboundDeliverabilityHealthGate({
    hardBounceRate: input.hardBounceRate ?? 0,
    complaintRate: input.complaintRate ?? 0,
    increasingVolumeWhileUnhealthy: false,
  });
  if (deliverability.result !== "PASS") reasons.push("DELIVERABILITY_UNSAFE");
  const path = evaluateLiveOutboundCommunicationPathGate();
  if (path.result !== "PASS") reasons.push("LIVE_PATH_FAIL");
  return {
    gate: PER_PROSPECT_OUTBOUND_AUTHORIZATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    prospectSendAuthorized: reasons.length === 0,
  };
}
