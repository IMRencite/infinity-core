import type { ReplyIntent } from "@/lib/infinity/inbound-communication-runtime/types";
import {
  inferValidationSignals,
  type ValidationSignal,
} from "@/lib/infinity/inbound-communication-runtime/conversation-stage";
import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";

export const CONSULTATIVE_OUTREACH_OUTCOME_EVALUATION = "ConsultativeOutreachOutcomeEvaluation" as const;

export type ConsultativeOutreachOutcomeEvaluation =
  | "CHALLENGER_DIRECTIONALLY_STRONGER"
  | "BASELINE_DIRECTIONALLY_STRONGER"
  | "NO_MEANINGFUL_DIFFERENCE_YET"
  | "INSUFFICIENT_OUTCOME_EVIDENCE";

export type CohortOutcomeCounts = {
  sent: number;
  providerAccepted: number;
  humanReplies: number;
  qualifiedEngagement: number;
  processDisclosures: number;
  frictionDisclosures: number;
  impactDisclosures: number;
  pricing: number;
  meeting: number;
  referrals: number;
  notInterested: number;
  optOuts: number;
  wrongPerson: number;
  bounces: number;
  automatedReplies: number;
  other: number;
};

export function isNonHumanIntent(intent: ReplyIntent | string | null): boolean {
  return intent === "OUT_OF_OFFICE" || intent === "BOUNCE" || intent === "AUTOMATED_REPLY";
}

export function isQualifiedEngagement(input: {
  intent: ReplyIntent | string | null;
  signals: ValidationSignal[];
}): boolean {
  if (!input.intent || isNonHumanIntent(input.intent)) return false;
  if (
    input.intent === "REQUEST_MORE_INFORMATION" ||
    input.intent === "PRICING_QUESTION" ||
    input.intent === "MEETING_REQUEST" ||
    input.intent === "REFERRAL_TO_OTHER_PERSON"
  ) {
    return true;
  }
  return input.signals.some((signal) =>
    signal === "CURRENT_PROCESS_DISCLOSURE" ||
    signal === "FRICTION_DISCLOSURE" ||
    signal === "IMPACT_DISCLOSURE",
  );
}

export function extractObservationSignals(input: {
  inboundText: string;
  stage: ConversationStage;
  intent?: ReplyIntent;
}): ValidationSignal[] {
  return inferValidationSignals(input);
}

export function emptyOutcomeCounts(sent: number): CohortOutcomeCounts {
  return {
    sent,
    providerAccepted: sent,
    humanReplies: 0,
    qualifiedEngagement: 0,
    processDisclosures: 0,
    frictionDisclosures: 0,
    impactDisclosures: 0,
    pricing: 0,
    meeting: 0,
    referrals: 0,
    notInterested: 0,
    optOuts: 0,
    wrongPerson: 0,
    bounces: 0,
    automatedReplies: 0,
    other: 0,
  };
}

export function evaluateConsultativeOutreachOutcome(input: {
  baseline: CohortOutcomeCounts;
  challenger: CohortOutcomeCounts;
}): {
  gate: typeof CONSULTATIVE_OUTREACH_OUTCOME_EVALUATION;
  evaluation: ConsultativeOutreachOutcomeEvaluation;
  statisticallyConclusive: false;
  evidence: string;
} {
  const baselineSignal =
    input.baseline.qualifiedEngagement +
    input.baseline.processDisclosures +
    input.baseline.frictionDisclosures +
    input.baseline.impactDisclosures;
  const challengerSignal =
    input.challenger.qualifiedEngagement +
    input.challenger.processDisclosures +
    input.challenger.frictionDisclosures +
    input.challenger.impactDisclosures;
  if (input.baseline.humanReplies === 0 && input.challenger.humanReplies === 0) {
    return {
      gate: CONSULTATIVE_OUTREACH_OUTCOME_EVALUATION,
      evaluation: "INSUFFICIENT_OUTCOME_EVIDENCE",
      statisticallyConclusive: false,
      evidence: "No human replies observed on either the two-person baseline or the two-person challenger cohort.",
    };
  }
  if (challengerSignal > baselineSignal) {
    return {
      gate: CONSULTATIVE_OUTREACH_OUTCOME_EVALUATION,
      evaluation: "CHALLENGER_DIRECTIONALLY_STRONGER",
      statisticallyConclusive: false,
      evidence: "Challenger produced more qualified or process/friction/impact evidence than baseline in this small sample.",
    };
  }
  if (baselineSignal > challengerSignal) {
    return {
      gate: CONSULTATIVE_OUTREACH_OUTCOME_EVALUATION,
      evaluation: "BASELINE_DIRECTIONALLY_STRONGER",
      statisticallyConclusive: false,
      evidence: "Baseline produced more qualified or process/friction/impact evidence than challenger in this small sample.",
    };
  }
  return {
    gate: CONSULTATIVE_OUTREACH_OUTCOME_EVALUATION,
    evaluation: "NO_MEANINGFUL_DIFFERENCE_YET",
    statisticallyConclusive: false,
    evidence: "Observed human replies did not produce a material difference in qualified validation evidence.",
  };
}
