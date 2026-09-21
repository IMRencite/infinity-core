import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CALEB_CONVERSATION_ID,
  CALEB_PROSPECT_ID,
  CRE_CHANNEL,
  GMAIL_PROVIDER_ID,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
  MICHAEL_CONVERSATION_ID,
  MICHAEL_PROSPECT_ID,
} from "@/lib/infinity/inbound-communication-runtime/constants";
import { classifyInboundEventClass, classifyReplyIntent } from "@/lib/infinity/inbound-communication-runtime/intent-classifier";
import { inferConversationStage } from "@/lib/infinity/inbound-communication-runtime/conversation-stage";
import { evaluateAutonomousCommunicationPolicy } from "@/lib/infinity/inbound-communication-runtime/autonomous-policy";
import { runCreInboundObservationCycle } from "@/lib/infinity/inbound-communication-runtime/cre-inbound-observer";
import { inspectMailboxObserverHealth, readCreInboundObserverState } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { hydrateInboundRuntimeState, inspectInboundRuntimeState } from "@/lib/infinity/inbound-communication-runtime/persist";
import { lookupConversation, lookupConversationByThread, persistConversation } from "@/lib/infinity/inbound-communication-runtime/conversation-store";
import { persistMessage } from "@/lib/infinity/inbound-communication-runtime/message-store";
import { inspectHistoricalWave1Preservation } from "./context-rich-consultative-outreach-optimization";
import {
  emptyOutcomeCounts,
  evaluateConsultativeOutreachOutcome,
  extractObservationSignals,
  isNonHumanIntent,
  isQualifiedEngagement,
  type CohortOutcomeCounts,
} from "./consultative-outreach-outcome-evaluation";
import { CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID } from "./cre-context-rich-challenger-cohort";
import {
  readContextRichChallengerState,
  writeContextRichChallengerState,
} from "./cre-context-rich-challenger-durable-state";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID, LOCKED_CRE_EXPERIMENT_ID } from "./constants";

export const CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1 =
  "CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1" as const;
export const CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_MISSION_ID =
  "msn_cre_context_rich_challenger_outcome_observation_v1" as const;
export const CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_RUNTIME =
  "CreContextRichChallengerOutcomeObservationRuntime" as const;
export const CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_REQUIRED =
  "CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_REQUIRED" as const;
export const CRE_CONTEXT_RICH_CHALLENGER_ADDITIONAL_OBSERVATION_REQUIRED =
  "CRE_CONTEXT_RICH_CHALLENGER_ADDITIONAL_OBSERVATION_REQUIRED" as const;
export const CRE_VALIDATION_WAVE_2_DECISION_REQUIRED = "CRE_VALIDATION_WAVE_2_DECISION_REQUIRED" as const;
export const PREVIOUS_OBSERVER_CHECKPOINT = "14933879" as const;
export const BROOKS_CONVERSATION_ID = "cnv_13b5bd0edb3f5ba8" as const;
export const ANNIE_CONVERSATION_ID = "cnv_d47861e4f5c9fb3a" as const;
export const CHALLENGER_SEND_AT = "2026-09-05T07:50:10.631Z" as const;
export const OUTCOME_OBSERVATION_FILE =
  ".infinity/market-validation/cre-context-rich-challenger-outcome-observation.json" as const;

const TRACKED_IDS = [CALEB_CONVERSATION_ID, MICHAEL_CONVERSATION_ID, BROOKS_CONVERSATION_ID, ANNIE_CONVERSATION_ID] as const;
const BASELINE = new Set<string>([CALEB_CONVERSATION_ID, MICHAEL_CONVERSATION_ID, CALEB_PROSPECT_ID, MICHAEL_PROSPECT_ID]);
const CHALLENGER = new Set<string>([BROOKS_CONVERSATION_ID, ANNIE_CONVERSATION_ID]);

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_OUTCOME_OBSERVATION_PERSIST !== "1") return false;
  return true;
}

function messageTime(row: { receivedAt: string | null; sentAt: string | null }): number {
  return Date.parse(row.receivedAt ?? row.sentAt ?? "") || 0;
}

function challengerSinceMs(): number {
  const inbound = inspectInboundRuntimeState();
  const outboundTimes = inbound.messages
    .filter((row) => CHALLENGER.has(row.conversationId) && row.direction === "OUTBOUND")
    .map((row) => Date.parse(row.sentAt ?? ""))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (outboundTimes.length) return Math.min(...outboundTimes);
  return Date.parse(CHALLENGER_SEND_AT);
}

function hydrateChallengerConversations(now: Date): void {
  const challenger = readContextRichChallengerState();
  if (!challenger) return;
  for (const send of challenger.sends) {
    if (!send.conversationId || !send.providerThreadId) continue;
    const existing =
      lookupConversation(send.conversationId) ?? lookupConversationByThread(send.providerThreadId);
    if (!existing) {
      persistConversation({
        id: send.conversationId,
        organizationId: LOCKED_ORG,
        ventureId: LOCKED_VENTURE,
        experimentId: LOCKED_EXPERIMENT,
        cohortId: CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID,
        prospectId: send.prospectId,
        customerId: null,
        channel: CRE_CHANNEL,
        provider: GMAIL_PROVIDER_ID,
        providerThreadId: send.providerThreadId,
        subject: send.subject,
        conversationType: "MARKET_VALIDATION_OUTREACH",
        ownershipState: "INFINITY_MANAGED",
        conversationState: "AWAITING_INBOUND",
        strategyProfile: "CONTEXT_RICH_CONSULTATIVE",
        currentConversationStage: "OPEN_CONTEXT",
        lastInboundAt: null,
        lastOutboundAt: send.providerResult === "PROVIDER_ACCEPTED" ? CHALLENGER_SEND_AT : now.toISOString(),
        sourceAttemptId: send.attemptId,
        sourceProviderMessageId: send.providerMessageId,
        now,
      });
    }
    const hasOutbound = inspectInboundRuntimeState().messages.some(
      (row) => row.conversationId === send.conversationId && row.direction === "OUTBOUND",
    );
    if (!hasOutbound && send.email) {
      persistMessage({
        conversationId: send.conversationId,
        direction: "OUTBOUND",
        provider: GMAIL_PROVIDER_ID,
        providerMessageId: send.providerMessageId,
        providerThreadId: send.providerThreadId,
        sender: "infinitemediaresources@gmail.com",
        recipients: [send.email],
        subject: send.subject,
        normalizedText: send.question,
        receivedAt: null,
        sentAt: CHALLENGER_SEND_AT,
        messageType: "INITIAL_OUTREACH",
        automationClassification: "UNKNOWN",
        providerMetadata: {},
        attachmentMetadata: [],
        traceability: {
          organizationId: LOCKED_ORG,
          ventureId: LOCKED_VENTURE,
          experimentId: LOCKED_EXPERIMENT,
          prospectId: send.prospectId,
          sourceAttemptId: send.attemptId,
        },
      });
    }
  }
}

function tallyIntent(counts: CohortOutcomeCounts, intent: string, signals: string[]): void {
  if (intent === "OUT_OF_OFFICE") return;
  if (intent === "BOUNCE") {
    counts.bounces += 1;
    return;
  }
  if (intent === "AUTOMATED_REPLY") {
    counts.automatedReplies += 1;
    return;
  }
  counts.humanReplies += 1;
  if (isQualifiedEngagement({ intent, signals: signals as never })) counts.qualifiedEngagement += 1;
  if (signals.includes("CURRENT_PROCESS_DISCLOSURE")) counts.processDisclosures += 1;
  if (signals.includes("FRICTION_DISCLOSURE")) counts.frictionDisclosures += 1;
  if (signals.includes("IMPACT_DISCLOSURE")) counts.impactDisclosures += 1;
  if (intent === "PRICING_QUESTION" || signals.includes("PRICING_SIGNAL")) counts.pricing += 1;
  if (intent === "MEETING_REQUEST" || signals.includes("MEETING_SIGNAL")) counts.meeting += 1;
  if (intent === "REFERRAL_TO_OTHER_PERSON" || signals.includes("REFERRAL_SIGNAL")) counts.referrals += 1;
  if (intent === "NOT_INTERESTED") counts.notInterested += 1;
  if (intent === "OPT_OUT") counts.optOuts += 1;
  if (intent === "WRONG_PERSON") counts.wrongPerson += 1;
  if (intent === "OTHER") counts.other += 1;
}

function recipientName(conversationId: string, prospectId: string | null | undefined): string {
  if (prospectId === CALEB_PROSPECT_ID || conversationId === CALEB_CONVERSATION_ID) return "Caleb Struewing";
  if (prospectId === MICHAEL_PROSPECT_ID || conversationId === MICHAEL_CONVERSATION_ID) return "Michael Vizzone";
  if (conversationId === BROOKS_CONVERSATION_ID) return "Brooks Murphy";
  if (conversationId === ANNIE_CONVERSATION_ID) return "Annie Nicolau";
  return "UNKNOWN";
}

function policyOutcomeFor(intent: string, outcome: "AUTO_EXECUTE" | "ROUTE_TO_GOVERNED_SYSTEM" | "PAUSE_EXCEPTION") {
  if (isNonHumanIntent(intent)) return "NO_REPLY_REQUIRED" as const;
  return outcome;
}

export async function executeCreContextRichChallengerOutcomeObservation(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}) {
  hydrateInboundRuntimeState();
  const now = input.now ?? new Date();
  hydrateChallengerConversations(now);
  const priorObserver = readCreInboundObserverState();
  const previousCheckpoint = priorObserver?.historyCheckpointId ?? PREVIOUS_OBSERVER_CHECKPOINT;
  const historical = inspectHistoricalWave1Preservation();
  const challenger = readContextRichChallengerState();
  const since = challengerSinceMs();
  const suppressionBefore = inspectInboundRuntimeState().suppressions.length;
  const stageBefore = Object.fromEntries(
    TRACKED_IDS.map((id) => [id, lookupConversation(id)?.currentConversationStage ?? null]),
  );
  const autonomousBefore = new Set(
    inspectInboundRuntimeState()
      .messages.filter((row) => row.direction === "OUTBOUND" && row.messageType === "AUTONOMOUS_REPLY")
      .map((row) => row.id),
  );
  const cycle = await runCreInboundObservationCycle({
    fetchImpl: input.fetchImpl,
    now,
    activate: false,
  });
  const inbound = inspectInboundRuntimeState();
  const accepted = challenger?.sends.filter((row) => row.providerResult === "PROVIDER_ACCEPTED").length ?? 2;
  const baseline = emptyOutcomeCounts(2);
  const challengerCounts = emptyOutcomeCounts(accepted);
  const trackedInbound = inbound.messages.filter(
    (row) => row.direction === "INBOUND" && TRACKED_IDS.includes(row.conversationId as (typeof TRACKED_IDS)[number]),
  );
  const sinceInbound = trackedInbound.filter((row) => messageTime(row) >= since);
  for (const message of trackedInbound) {
    const conversation = lookupConversation(message.conversationId);
    const classification = classifyReplyIntent({ text: message.normalizedText, sourceMessageId: message.id });
    const previousStage = stageBefore[message.conversationId] ?? conversation?.currentConversationStage ?? "OPEN_CONTEXT";
    const newStage = inferConversationStage({
      current: previousStage,
      inboundText: message.normalizedText,
      intent: classification.intent,
    });
    const signals = extractObservationSignals({
      inboundText: message.normalizedText,
      stage: newStage,
      intent: classification.intent,
    });
    if (BASELINE.has(message.conversationId) || BASELINE.has(conversation?.prospectId ?? "")) {
      tallyIntent(baseline, classification.intent, signals);
    } else if (CHALLENGER.has(message.conversationId)) {
      tallyIntent(challengerCounts, classification.intent, signals);
    }
  }
  const details = sinceInbound.map((message) => {
    const conversation = lookupConversation(message.conversationId);
    const classification = classifyReplyIntent({ text: message.normalizedText, sourceMessageId: message.id });
    const previousStage = stageBefore[message.conversationId] ?? conversation?.currentConversationStage ?? "OPEN_CONTEXT";
    const newStage = inferConversationStage({
      current: previousStage,
      inboundText: message.normalizedText,
      intent: classification.intent,
    });
    const signals = extractObservationSignals({
      inboundText: message.normalizedText,
      stage: newStage,
      intent: classification.intent,
    });
    const policy = evaluateAutonomousCommunicationPolicy({
      classification,
      identityCertain: Boolean(conversation?.prospectId),
      trackedThread: Boolean(conversation?.providerThreadId),
    });
    const replySent = inbound.messages.some(
      (row) =>
        row.direction === "OUTBOUND" &&
        row.messageType === "AUTONOMOUS_REPLY" &&
        row.conversationId === message.conversationId &&
        !autonomousBefore.has(row.id),
    );
    const suppressionChanged =
      classification.intent === "OPT_OUT" ||
      classification.intent === "BOUNCE" ||
      inbound.suppressions.some((row) => row.identity && row.sourceConversationId === message.conversationId);
    return {
      recipient: recipientName(message.conversationId, conversation?.prospectId),
      strategy: conversation?.strategyProfile ?? "UNKNOWN",
      inboundMessageId: message.providerMessageId ?? message.id,
      intent: classification.intent,
      eventClass: classifyInboundEventClass(message.normalizedText),
      validationSignals: signals,
      previousStage,
      newStage: conversation?.currentConversationStage ?? newStage,
      autonomousPolicyOutcome: policyOutcomeFor(classification.intent, policy.outcome),
      replySent,
      suppressionChanged,
    };
  });
  const comparison = evaluateConsultativeOutreachOutcome({ baseline, challenger: challengerCounts });
  const qualified = baseline.qualifiedEngagement + challengerCounts.qualifiedEngagement;
  const nextState =
    comparison.evaluation === "INSUFFICIENT_OUTCOME_EVIDENCE" || qualified === 0
      ? ("CRE_CONTEXT_RICH_CHALLENGER_OBSERVING" as const)
      : ("CRE_CONTEXT_RICH_CHALLENGER_OBSERVING_WITH_EVIDENCE" as const);
  const nextBlocker =
    nextState === "CRE_CONTEXT_RICH_CHALLENGER_OBSERVING_WITH_EVIDENCE"
      ? CRE_CONTEXT_RICH_CHALLENGER_ADDITIONAL_OBSERVATION_REQUIRED
      : CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_REQUIRED;
  const clock = inspectExperimentClock(now);
  const wave2 = clock.windowExpired
    ? ("EXPERIMENT_WINDOW_DECISION_REQUIRED" as const)
    : ("WAIT_FOR_MORE_CHALLENGER_OUTCOMES" as const);
  if (challenger) {
    writeContextRichChallengerState({
      ...challenger,
      nextState,
      updatedAt: now.toISOString(),
    });
  }
  const observer = inspectMailboxObserverHealth();
  const cohortSeparation =
    historical.attemptsPreserved === "PASS" &&
    historical.conversationsPreserved === "PASS" &&
    historical.historicalRelabeled === false
      ? ("PASS" as const)
      : ("FAIL" as const);
  const record = {
    mission: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
    observedAt: now.toISOString(),
    nextState,
    nextBlocker,
    wave2Readiness: wave2,
    comparison,
    baseline,
    challenger: challengerCounts,
    sinceInbound: sinceInbound.length,
    details,
    newColdOutreach: 0,
    wave2Started: false,
  };
  if (persistEnabled()) {
    mkdirSync(dirname(OUTCOME_OBSERVATION_FILE), { recursive: true });
    writeFileSync(OUTCOME_OBSERVATION_FILE, `${JSON.stringify(record, null, 2)}\n`);
  }
  const suppressionAfter = inspectInboundRuntimeState().suppressions.length;
  return {
    mission: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
    historical,
    cohortSeparation,
    challengerCohort: {
      id: challenger?.cohortLabel ?? "CRE_CONTEXT_RICH_CHALLENGER_V1",
      sent: challengerCounts.sent,
      members: ["Brooks Murphy", "Annie Nicolau"],
      historicalMembers: ["Caleb Struewing", "Michael Vizzone"],
      relabeled: historical.historicalRelabeled,
    },
    observer: {
      status: observer.status,
      tracked: observer.trackedConversations,
      previousCheckpoint,
      currentCheckpoint: observer.lastCheckpoint,
      mailboxHistoryReset: false,
      duplicateProcessing: cycle.processing.duplicateReplies,
    },
    inboundSince: {
      total: sinceInbound.length,
      human: sinceInbound.filter((row) => classifyInboundEventClass(row.normalizedText) === "HUMAN_REPLY").length,
      ooo: sinceInbound.filter((row) => classifyInboundEventClass(row.normalizedText) === "OUT_OF_OFFICE").length,
      automated: sinceInbound.filter((row) => classifyInboundEventClass(row.normalizedText) === "AUTOMATED_REPLY").length,
      bounces: sinceInbound.filter((row) => {
        const klass = classifyInboundEventClass(row.normalizedText);
        return klass === "BOUNCE" || klass === "DELIVERY_FAILURE";
      }).length,
      other: sinceInbound.filter((row) => {
        const klass = classifyInboundEventClass(row.normalizedText);
        return (
          klass !== "HUMAN_REPLY" &&
          klass !== "OUT_OF_OFFICE" &&
          klass !== "AUTOMATED_REPLY" &&
          klass !== "BOUNCE" &&
          klass !== "DELIVERY_FAILURE"
        );
      }).length,
    },
    baseline,
    challengerOutcomes: challengerCounts,
    details,
    comparison,
    informationValue: {
      baseline:
        baseline.qualifiedEngagement +
          baseline.processDisclosures +
          baseline.frictionDisclosures +
          baseline.impactDisclosures ===
        0
          ? "NONE_YET"
          : "PARTIAL",
      challenger:
        challengerCounts.qualifiedEngagement +
          challengerCounts.processDisclosures +
          challengerCounts.frictionDisclosures +
          challengerCounts.impactDisclosures ===
        0
          ? "NONE_YET"
          : "PARTIAL",
      materialNewWorkflowEvidence: details.some(
        (row) =>
          row.validationSignals.includes("CURRENT_PROCESS_DISCLOSURE") ||
          row.validationSignals.includes("FRICTION_DISCLOSURE") ||
          row.validationSignals.includes("IMPACT_DISCLOSURE"),
      )
        ? "YES"
        : "NO",
    },
    experiment: inspectRealMarketEvidence({ now }).experiment,
    clock,
    evidenceStart: CANONICAL_EVIDENCE_START,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    wave2Readiness: wave2,
    wave2Started: false,
    nextState,
    nextBlocker,
    newColdOutreach: 0,
    suppressionChanged: suppressionAfter !== suppressionBefore,
    cycle,
    observingNoNewOutcome: sinceInbound.length === 0 ? ("OBSERVING_NO_NEW_OUTCOME" as const) : null,
    website: {
      artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
      changed: false,
      deployments: 0,
      publiclyLaunched: false,
    },
  };
}

export function readOutcomeObservationRecord() {
  if (!existsSync(OUTCOME_OBSERVATION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(OUTCOME_OBSERVATION_FILE, "utf8"));
  } catch {
    return null;
  }
}
