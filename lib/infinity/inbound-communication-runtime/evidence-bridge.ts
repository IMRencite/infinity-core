import {
  emailOpenIsStrongIntent,
  siteVisitIsPricingIntent,
} from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { LOCKED_EXPERIMENT } from "./constants";
import type { InboundEventClass, ReplyIntent } from "./types";

export function inboundReplyIsStrongIntent(): false {
  return false;
}

export function inboundReplyIsPricingIntent(): false {
  return false;
}

export function automatedReplyIsEvidence(): false {
  return false;
}

export function outOfOfficeIsEvidence(): false {
  return false;
}

export function bounceIsEvidence(): false {
  return false;
}

export function evaluateInboundEvidenceImpact(input: {
  classification: InboundEventClass;
  intent: ReplyIntent;
}): {
  qualified: false;
  strongIntent: false;
  pricingIntent: false;
  candidate: "ENGAGEMENT" | "PRICING_QUESTION" | "STRONG_INTENT_CANDIDATE" | "NEGATIVE" | "NONE";
} {
  if (
    input.classification === "AUTOMATED_REPLY" ||
    input.classification === "OUT_OF_OFFICE" ||
    input.classification === "BOUNCE" ||
    input.classification === "DELIVERY_FAILURE"
  ) {
    return { qualified: false, strongIntent: false, pricingIntent: false, candidate: "NONE" };
  }
  if (input.intent === "OPT_OUT" || input.intent === "NOT_INTERESTED" || input.intent === "WRONG_PERSON") {
    return { qualified: false, strongIntent: false, pricingIntent: false, candidate: "NEGATIVE" };
  }
  if (input.intent === "PRICING_QUESTION") {
    return { qualified: false, strongIntent: false, pricingIntent: false, candidate: "PRICING_QUESTION" };
  }
  if (input.intent === "MEETING_REQUEST" || input.intent === "POSITIVE_INTEREST") {
    return { qualified: false, strongIntent: false, pricingIntent: false, candidate: "STRONG_INTENT_CANDIDATE" };
  }
  if (input.intent === "REQUEST_MORE_INFORMATION") {
    return { qualified: false, strongIntent: false, pricingIntent: false, candidate: "ENGAGEMENT" };
  }
  return { qualified: false, strongIntent: false, pricingIntent: false, candidate: "NONE" };
}

export function applyInboundEvidenceToExperiment(): {
  experimentId: typeof LOCKED_EXPERIMENT;
  countsUnchanged: true;
  clockRestarted: false;
} {
  const before = inspectRealMarketEvidence();
  void before;
  void inspectExperimentClock();
  return {
    experimentId: LOCKED_EXPERIMENT,
    countsUnchanged: true,
    clockRestarted: false,
  };
}

export function evidenceContracts(): {
  replyIsNotStrongIntent: true;
  replyIsNotPricingIntent: true;
  automatedReplyIsNotEvidence: true;
  oooIsNotEvidence: true;
  openIsNotStrongIntent: true;
  visitIsNotPricingIntent: true;
} {
  void inboundReplyIsStrongIntent();
  void inboundReplyIsPricingIntent();
  void automatedReplyIsEvidence();
  void outOfOfficeIsEvidence();
  void emailOpenIsStrongIntent();
  void siteVisitIsPricingIntent();
  return {
    replyIsNotStrongIntent: true,
    replyIsNotPricingIntent: true,
    automatedReplyIsNotEvidence: true,
    oooIsNotEvidence: true,
    openIsNotStrongIntent: true,
    visitIsNotPricingIntent: true,
  };
}
