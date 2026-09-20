export const CANONICAL_OUTBOUND_PIPELINE_STATES = [
  "NOT_DETECTED",
  "DETECTED_NOT_INGESTED",
  "INGESTED_NOT_MATCHED",
  "MATCHED_NOT_CLASSIFIED",
  "CLASSIFIED_NO_NEXT_ACTION",
  "NEXT_ACTION_BLOCKED",
  "WAITING_FOR_PACING",
  "PACING_EXPIRED_WORKER_NOT_RUN",
  "QUEUED",
  "SEND_FAILED",
  "SENT",
  "DELIVERED",
] as const;
export type CanonicalOutboundPipelineState = (typeof CANONICAL_OUTBOUND_PIPELINE_STATES)[number];

export const PRODUCTION_OUTBOUND_CLOSED_LOOP_GATE = "ProductionOutboundClosedLoopGate" as const;
export const INBOUND_REPLY_INGESTION_GATE = "InboundReplyIngestionGate" as const;
export const OUTBOUND_CONVERSATION_CONTINUITY_GATE = "OutboundConversationContinuityGate" as const;
export const INBOUND_REPLY_CLASSIFICATION_GATE = "InboundReplyClassificationGate" as const;
export const NATURAL_RESPONSE_PACING_GATE = "NaturalResponsePacingGate" as const;
export const INBOUND_REPLY_IDEMPOTENCY_GATE = "InboundReplyIdempotencyGate" as const;
export const OUTBOUND_THREAD_CONTINUITY_GATE = "OutboundThreadContinuityGate" as const;
export const PRODUCTION_OPT_OUT_SUPPRESSION_GATE = "ProductionOptOutSuppressionGate" as const;
export const PRODUCTION_OPT_OUT_CLASSIFICATION_GATE = "ProductionOptOutClassificationGate" as const;
export const PRODUCTION_SALES_CONVERSATION_PERSISTENCE_GATE = "ProductionSalesConversationPersistenceGate" as const;
export const OUTBOUND_PERFORMANCE_FEEDBACK_GATE = "OutboundPerformanceFeedbackGate" as const;
export const FOUNDER_DAILY_REPORT_OUTBOUND_EVENT_GATE = "FounderDailyReportOutboundEventGate" as const;
export const SUPPRESSED_RECIPIENT_SEND_BLOCK_GATE = "SuppressedRecipientSendBlockGate" as const;
export const SUPPRESSED_FOLLOWUP_CANCELLATION_GATE = "SuppressedFollowupCancellationGate" as const;
export const PRODUCTION_OUTBOUND_RESTART_CONTINUITY_GATE = "ProductionOutboundRestartContinuityGate" as const;
export const OPT_OUT_IDEMPOTENCY_GATE = "OptOutIdempotencyGate" as const;
export const GMAIL_PRODUCTION_GRANT_GATE = "GmailProductionGrantGate" as const;

export type NamedOutboundLoopGate = {
  gate: string;
  result: "PASS" | "FAIL" | "NOT_PROVEN";
  reasons: string[];
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateGmailProductionGrantGate(input: {
  productionContext: boolean;
  tokenExchange: boolean;
  sendScope: boolean;
  readonlyScope: boolean;
  userinfoScope: boolean;
  identity: boolean;
  fingerprint?: string | null;
}): NamedOutboundLoopGate {
  if (!input.productionContext) {
    return named(GMAIL_PRODUCTION_GRANT_GATE, "NOT_PROVEN", ["NOT_PRODUCTION_RUNTIME"]);
  }
  const reasons: string[] = [];
  if (!input.tokenExchange) reasons.push("TOKEN_EXCHANGE_FAIL");
  if (!input.sendScope) reasons.push("GMAIL_SEND_MISSING");
  if (!input.readonlyScope) reasons.push("GMAIL_READONLY_MISSING");
  if (!input.userinfoScope) reasons.push("USERINFO_EMAIL_MISSING");
  if (!input.identity) reasons.push("IDENTITY_FAIL");
  return named(
    GMAIL_PRODUCTION_GRANT_GATE,
    reasons.length ? "FAIL" : "PASS",
    reasons.length ? reasons : ["PRODUCTION_GRANT_INCLUDES_READONLY"],
  );
}

export function evaluateInboundReplyIngestionGate(input: {
  replyFound: boolean;
  ingested: boolean | null;
  conversationEvent: boolean;
  canonicalMessage: boolean;
}): NamedOutboundLoopGate {
  if (!input.replyFound) return named(INBOUND_REPLY_INGESTION_GATE, "NOT_PROVEN", ["REPLY_NOT_FOUND"]);
  if (input.ingested == null) return named(INBOUND_REPLY_INGESTION_GATE, "NOT_PROVEN", ["INGESTION_NOT_EXERCISED"]);
  if (!input.ingested || !input.conversationEvent || !input.canonicalMessage) {
    return named(INBOUND_REPLY_INGESTION_GATE, "FAIL", ["DETECTED_NOT_INGESTED"]);
  }
  return named(INBOUND_REPLY_INGESTION_GATE, "PASS", ["REPLY_INGESTED"]);
}

export function evaluateOutboundConversationContinuityGate(input: {
  threadMatch: boolean | null;
  prospectMatch: boolean | null;
  campaignMatch: boolean | null;
  ventureMatch: boolean | null;
}): NamedOutboundLoopGate {
  const checks = [input.threadMatch, input.prospectMatch, input.campaignMatch, input.ventureMatch];
  if (checks.some((row) => row == null)) {
    return named(OUTBOUND_CONVERSATION_CONTINUITY_GATE, "NOT_PROVEN", ["MATCH_NOT_EXERCISED"]);
  }
  const reasons: string[] = [];
  if (!input.threadMatch) reasons.push("THREAD_MISMATCH");
  if (!input.prospectMatch) reasons.push("PROSPECT_MISMATCH");
  if (!input.campaignMatch) reasons.push("CAMPAIGN_MISMATCH");
  if (!input.ventureMatch) reasons.push("VENTURE_MISMATCH");
  return named(OUTBOUND_CONVERSATION_CONTINUITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CONVERSATION_MATCHED"]);
}

export function evaluateInboundReplyClassificationGate(input: {
  executed: boolean | null;
  classification: string | null;
}): NamedOutboundLoopGate {
  if (input.executed == null) return named(INBOUND_REPLY_CLASSIFICATION_GATE, "NOT_PROVEN", ["CLASSIFIER_NOT_EXERCISED"]);
  if (!input.executed || !input.classification) return named(INBOUND_REPLY_CLASSIFICATION_GATE, "FAIL", ["CLASSIFIER_NOT_RUN"]);
  if (/OPT_OUT|UNSUBSCRIBE|NEGATIVE|BOUNCE|AUTO_REPLY|NOT_INTERESTED/i.test(input.classification)) {
    return named(INBOUND_REPLY_CLASSIFICATION_GATE, "FAIL", ["UNEXPECTED_NEGATIVE_CLASS"]);
  }
  if (!/POSITIVE_INTEREST|QUESTION|POSITIVE_INFORMATION_REQUEST|INTERESTED|DEMO_REQUEST|PRICING_QUESTION/i.test(input.classification)) {
    return named(INBOUND_REPLY_CLASSIFICATION_GATE, "FAIL", ["CLASS_NOT_INTERESTED"]);
  }
  return named(INBOUND_REPLY_CLASSIFICATION_GATE, "PASS", [input.classification]);
}

export function evaluateNaturalResponsePacingGate(input: {
  inboundAt: string | null;
  eligibleAt: string | null;
  workerLastRun: string | null;
  workerEnabled: boolean;
  now?: string;
}): NamedOutboundLoopGate {
  if (!input.inboundAt || !input.eligibleAt) {
    return named(NATURAL_RESPONSE_PACING_GATE, "NOT_PROVEN", ["PACING_NOT_EXERCISED"]);
  }
  if (!input.workerEnabled) return named(NATURAL_RESPONSE_PACING_GATE, "FAIL", ["NO_WORKER"]);
  const now = Date.parse(input.now ?? new Date().toISOString());
  const eligible = Date.parse(input.eligibleAt);
  if (Number.isNaN(eligible) || Number.isNaN(now)) return named(NATURAL_RESPONSE_PACING_GATE, "FAIL", ["PACING_UNPARSEABLE"]);
  if (eligible <= now && !input.workerLastRun) {
    return named(NATURAL_RESPONSE_PACING_GATE, "FAIL", ["PACING_EXPIRED_WORKER_NOT_RUN"]);
  }
  return named(NATURAL_RESPONSE_PACING_GATE, "PASS", ["PACING_BOUNDED"]);
}

export function evaluateInboundReplyIdempotencyGate(input: {
  firstKey: string;
  secondKey: string;
  secondCreated: boolean;
}): NamedOutboundLoopGate {
  if (!input.firstKey) return named(INBOUND_REPLY_IDEMPOTENCY_GATE, "NOT_PROVEN", ["KEY_MISSING"]);
  if (input.firstKey === input.secondKey && input.secondCreated) {
    return named(INBOUND_REPLY_IDEMPOTENCY_GATE, "FAIL", ["DUPLICATE_ALLOWED"]);
  }
  return named(INBOUND_REPLY_IDEMPOTENCY_GATE, "PASS", ["DUPLICATE_BLOCKED"]);
}

export function evaluateOutboundThreadContinuityGate(input: {
  originalThreadId: string | null;
  replyThreadId: string | null;
}): NamedOutboundLoopGate {
  if (!input.originalThreadId || !input.replyThreadId) {
    return named(OUTBOUND_THREAD_CONTINUITY_GATE, "NOT_PROVEN", ["THREAD_IDS_MISSING"]);
  }
  return named(
    OUTBOUND_THREAD_CONTINUITY_GATE,
    input.originalThreadId === input.replyThreadId ? "PASS" : "FAIL",
    input.originalThreadId === input.replyThreadId ? ["SAME_THREAD"] : ["THREAD_CHANGED"],
  );
}

export function evaluateProductionOptOutSuppressionGate(input: {
  classifiedOptOut: boolean;
  suppressionPersisted: boolean;
  followUpBlocked: boolean;
  durable?: boolean;
}): NamedOutboundLoopGate {
  if (!input.classifiedOptOut) return named(PRODUCTION_OPT_OUT_SUPPRESSION_GATE, "NOT_PROVEN", ["STOP_NOT_EXERCISED"]);
  const reasons: string[] = [];
  if (!input.suppressionPersisted) reasons.push("SUPPRESSION_NOT_PERSISTED");
  if (!input.followUpBlocked) reasons.push("FOLLOW_UP_NOT_BLOCKED");
  if (input.durable === false) reasons.push("SUPPRESSION_NOT_DURABLE");
  return named(PRODUCTION_OPT_OUT_SUPPRESSION_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["OPT_OUT_ENFORCED"]);
}

export function evaluateProductionSalesConversationPersistenceGate(input: {
  found: boolean;
  durable: boolean;
  ventureOccupancyNpv: boolean;
  threadMatch: boolean;
  classificationPersisted: boolean;
  lastActivityPersisted: boolean;
  nextActionPersisted: boolean;
}): NamedOutboundLoopGate {
  if (!input.found) return named(PRODUCTION_SALES_CONVERSATION_PERSISTENCE_GATE, "NOT_PROVEN", ["CONVERSATION_NOT_FOUND"]);
  const reasons: string[] = [];
  if (!input.durable) reasons.push("NOT_DURABLE");
  if (!input.ventureOccupancyNpv) reasons.push("VENTURE_MISMATCH");
  if (!input.threadMatch) reasons.push("THREAD_MISMATCH");
  if (!input.classificationPersisted) reasons.push("CLASSIFICATION_MISSING");
  if (!input.lastActivityPersisted) reasons.push("LAST_ACTIVITY_MISSING");
  if (!input.nextActionPersisted) reasons.push("NEXT_ACTION_MISSING");
  return named(
    PRODUCTION_SALES_CONVERSATION_PERSISTENCE_GATE,
    reasons.length ? "FAIL" : "PASS",
    reasons.length ? reasons : ["SALES_CONVERSATION_DURABLE"],
  );
}

export function evaluateOutboundPerformanceFeedbackGate(input: {
  eventsFound: boolean;
  durable: boolean;
  conversationLinked: boolean;
  ventureLinked: boolean;
}): NamedOutboundLoopGate {
  if (!input.eventsFound) return named(OUTBOUND_PERFORMANCE_FEEDBACK_GATE, "NOT_PROVEN", ["EVENTS_MISSING"]);
  const reasons: string[] = [];
  if (!input.durable) reasons.push("NOT_DURABLE");
  if (!input.conversationLinked) reasons.push("CONVERSATION_UNLINKED");
  if (!input.ventureLinked) reasons.push("VENTURE_UNLINKED");
  return named(OUTBOUND_PERFORMANCE_FEEDBACK_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["PI_EVENTS_DURABLE"]);
}

export function evaluateFounderDailyReportOutboundEventGate(input: {
  eventsPersisted: boolean;
  visibleInReport: boolean;
}): NamedOutboundLoopGate {
  if (!input.eventsPersisted) return named(FOUNDER_DAILY_REPORT_OUTBOUND_EVENT_GATE, "NOT_PROVEN", ["EVENTS_NOT_PERSISTED"]);
  return named(
    FOUNDER_DAILY_REPORT_OUTBOUND_EVENT_GATE,
    input.visibleInReport ? "PASS" : "FAIL",
    input.visibleInReport ? ["OUTBOUND_EVENTS_VISIBLE"] : ["EVENTS_NOT_VISIBLE_IN_REPORT"],
  );
}

export function evaluateProductionOptOutClassificationGate(input: {
  stopDetected: boolean;
  classification: string | null;
  threadMatch: boolean | null;
  prospectMatch: boolean | null;
  campaignMatch: boolean | null;
  ventureMatch: boolean | null;
}): NamedOutboundLoopGate {
  if (!input.stopDetected) return named(PRODUCTION_OPT_OUT_CLASSIFICATION_GATE, "NOT_PROVEN", ["STOP_NOT_DETECTED"]);
  const reasons: string[] = [];
  if (!/OPT_OUT|UNSUBSCRIBE/i.test(input.classification ?? "")) reasons.push("CLASS_NOT_OPT_OUT");
  if (input.threadMatch === false) reasons.push("THREAD_MISMATCH");
  if (input.prospectMatch === false) reasons.push("PROSPECT_MISMATCH");
  if (input.campaignMatch === false) reasons.push("CAMPAIGN_MISMATCH");
  if (input.ventureMatch === false) reasons.push("VENTURE_MISMATCH");
  if ([input.threadMatch, input.prospectMatch, input.campaignMatch, input.ventureMatch].some((row) => row == null)) {
    return named(PRODUCTION_OPT_OUT_CLASSIFICATION_GATE, "NOT_PROVEN", ["MATCH_NOT_EXERCISED"]);
  }
  return named(PRODUCTION_OPT_OUT_CLASSIFICATION_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["OPT_OUT_CLASSIFIED"]);
}

export function evaluateSuppressedRecipientSendBlockGate(input: {
  suppressionLookup: boolean;
  eligibility: "BLOCKED" | "ALLOWED" | null;
  providerCalled: boolean | null;
}): NamedOutboundLoopGate {
  if (!input.suppressionLookup || input.eligibility == null || input.providerCalled == null) {
    return named(SUPPRESSED_RECIPIENT_SEND_BLOCK_GATE, "NOT_PROVEN", ["ELIGIBILITY_NOT_EXERCISED"]);
  }
  const reasons: string[] = [];
  if (input.eligibility !== "BLOCKED") reasons.push("ELIGIBILITY_ALLOWED");
  if (input.providerCalled) reasons.push("PROVIDER_CALLED");
  return named(SUPPRESSED_RECIPIENT_SEND_BLOCK_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["PROVIDER_NEVER_CALLED"]);
}

export function evaluateSuppressedFollowupCancellationGate(input: {
  remainingEligible: number | null;
}): NamedOutboundLoopGate {
  if (input.remainingEligible == null) {
    return named(SUPPRESSED_FOLLOWUP_CANCELLATION_GATE, "NOT_PROVEN", ["FOLLOWUPS_NOT_CHECKED"]);
  }
  return named(
    SUPPRESSED_FOLLOWUP_CANCELLATION_GATE,
    input.remainingEligible === 0 ? "PASS" : "FAIL",
    input.remainingEligible === 0 ? ["NO_ELIGIBLE_FOLLOWUPS"] : ["ELIGIBLE_FOLLOWUPS_REMAIN"],
  );
}

export function evaluateProductionOutboundRestartContinuityGate(input: {
  restartPerformed: boolean;
  salesSurvived: boolean;
  piSurvived: boolean;
  suppressionSurvived: boolean;
  duplicateInboundProcessing: boolean;
  duplicateResponseSent: boolean;
  suppressedFollowUpEligible: boolean;
}): NamedOutboundLoopGate {
  if (!input.restartPerformed) {
    return named(PRODUCTION_OUTBOUND_RESTART_CONTINUITY_GATE, "NOT_PROVEN", ["RESTART_NOT_PERFORMED"]);
  }
  const reasons: string[] = [];
  if (!input.salesSurvived) reasons.push("SALES_LOST");
  if (!input.piSurvived) reasons.push("PI_LOST");
  if (!input.suppressionSurvived) reasons.push("SUPPRESSION_LOST");
  if (input.duplicateInboundProcessing) reasons.push("DUPLICATE_INBOUND");
  if (input.duplicateResponseSent) reasons.push("DUPLICATE_RESPONSE");
  if (input.suppressedFollowUpEligible) reasons.push("FOLLOWUP_RESURRECTED");
  return named(PRODUCTION_OUTBOUND_RESTART_CONTINUITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["RESTART_SAFE"]);
}

export function evaluateOptOutIdempotencyGate(input: {
  replayed: boolean;
  sameSuppression: boolean;
  conflictingState: boolean;
  outboundTriggered: boolean;
  followUpResurrected: boolean;
}): NamedOutboundLoopGate {
  if (!input.replayed) return named(OPT_OUT_IDEMPOTENCY_GATE, "NOT_PROVEN", ["OPT_OUT_NOT_REPLAYED"]);
  const reasons: string[] = [];
  if (!input.sameSuppression) reasons.push("SUPPRESSION_CHANGED");
  if (input.conflictingState) reasons.push("CONFLICTING_SUPPRESSION");
  if (input.outboundTriggered) reasons.push("OUTBOUND_TRIGGERED");
  if (input.followUpResurrected) reasons.push("FOLLOWUP_RESURRECTED");
  return named(OPT_OUT_IDEMPOTENCY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["OPT_OUT_IDEMPOTENT"]);
}

export function evaluateProductionOutboundClosedLoopGate(input: {
  providerSend: boolean;
  inboxDelivery: boolean;
  inboundReply: boolean;
  detected: boolean;
  ingested: boolean;
  matched: boolean;
  classified: boolean;
  nextAction: boolean;
  paced: boolean;
  workerExecuted: boolean;
  queued: boolean;
  providerAcceptedResponse: boolean;
  sameThread: boolean;
  responseDelivered: boolean;
  salesUpdated: boolean;
  performanceUpdated: boolean;
  dailyReportProven: boolean;
  optOutTested: boolean;
  optOutClassified: boolean;
  suppressionProven: boolean;
  futureSendBlocked: boolean;
  followUpsCancelled: boolean;
  idempotencyProven: boolean;
  optOutIdempotencyProven: boolean;
  restartContinuity: boolean;
  semantic?: {
    inboundBodyParsed: boolean;
    directionCorrect: boolean;
    intentCorrect: boolean;
    priorContextLoaded: boolean;
    responseNonEmpty: boolean;
    responseAnswersLatest: boolean;
    generatedBodyPreserved: boolean;
    deliveredBodyVerified: boolean;
    stopNotEchoed: boolean;
    multiTurnProven: boolean;
  };
  consent?: {
    prospectAuthored: boolean;
    roleProspect: boolean;
    noSalesReply: boolean;
    providerNotCalled: boolean;
    suppressionDurable: boolean;
    suppressionSurvivedRestart: boolean;
    futureSendIneligible: boolean;
    salesDidNotOverride: boolean;
  };
}): NamedOutboundLoopGate {
  const transportMissing = Object.entries(input)
    .filter(([key, ok]) => key !== "semantic" && key !== "consent" && !ok)
    .map(([name]) => name);
  if (!input.semantic) {
    return named(
      PRODUCTION_OUTBOUND_CLOSED_LOOP_GATE,
      "NOT_PROVEN",
      [...transportMissing, "SEMANTIC_CORRECTNESS_NOT_PROVEN"],
    );
  }
  if (!input.consent) {
    return named(
      PRODUCTION_OUTBOUND_CLOSED_LOOP_GATE,
      "NOT_PROVEN",
      [...transportMissing, "PROSPECT_AUTHORED_OPT_OUT_NOT_PROVEN"],
    );
  }
  const semanticMissing = Object.entries(input.semantic).filter(([, ok]) => !ok).map(([name]) => name);
  const consentMissing = Object.entries(input.consent).filter(([, ok]) => !ok).map(([name]) => name);
  if (transportMissing.length || semanticMissing.length || consentMissing.length) {
    return named(PRODUCTION_OUTBOUND_CLOSED_LOOP_GATE, "FAIL", [...transportMissing, ...semanticMissing, ...consentMissing]);
  }
  return named(PRODUCTION_OUTBOUND_CLOSED_LOOP_GATE, "PASS", ["TRANSPORT_SEMANTIC_AND_CONSENT_COMPLETE"]);
}

export function resolveCanonicalPipelineState(input: {
  replyFound: boolean;
  ingested: boolean;
  matched: boolean;
  classified: boolean;
  nextAction: boolean;
  blocked: boolean;
  eligibleAt: string | null;
  workerRanAfterEligible: boolean;
  queued: boolean;
  sendAttempted: boolean;
  sendAccepted: boolean;
  delivered: boolean;
  now?: string;
}): CanonicalOutboundPipelineState {
  if (!input.replyFound) return "NOT_DETECTED";
  if (!input.ingested) return "DETECTED_NOT_INGESTED";
  if (!input.matched) return "INGESTED_NOT_MATCHED";
  if (!input.classified) return "MATCHED_NOT_CLASSIFIED";
  if (!input.nextAction) return "CLASSIFIED_NO_NEXT_ACTION";
  if (input.blocked) return "NEXT_ACTION_BLOCKED";
  if (input.delivered) return "DELIVERED";
  if (input.sendAccepted) return "SENT";
  if (input.sendAttempted && !input.sendAccepted) return "SEND_FAILED";
  if (input.queued) return "QUEUED";
  if (input.eligibleAt) {
    const eligible = Date.parse(input.eligibleAt);
    const now = Date.parse(input.now ?? new Date().toISOString());
    if (!Number.isNaN(eligible) && eligible <= now && !input.workerRanAfterEligible) return "PACING_EXPIRED_WORKER_NOT_RUN";
    if (!Number.isNaN(eligible) && eligible > now) return "WAITING_FOR_PACING";
  }
  return "WAITING_FOR_PACING";
}
