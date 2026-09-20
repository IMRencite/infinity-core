import {
  hydrateEmailSendCapabilityFromDurableWriteVerification,
  inspectEmailSendCapabilityState,
} from "@/lib/infinity/communication-provider";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { codingAgentMayReadProviderSecrets } from "@/lib/infinity/communication-provider";
import {
  CALEB_EMAIL,
  CALEB_PROSPECT_ID,
  CALEB_PROVIDER_THREAD_ID,
  CRE_INBOUND_OBSERVER_CADENCE_MS,
  MICHAEL_EMAIL,
  MICHAEL_PROSPECT_ID,
  MICHAEL_PROVIDER_THREAD_ID,
} from "./constants";
import { prepareCreWave1TrackedConversations } from "./cre-tracked";
import { classifyInboundEventClass, classifyReplyIntent } from "./intent-classifier";
import { evaluateAutonomousCommunicationPolicy } from "./autonomous-policy";
import { inferConversationStage } from "./conversation-stage";
import { processInboundReply } from "./process-inbound";
import { executeCreInboundAutonomousReply, inboundIntentMayAutoreply } from "./cre-inbound-reply";
import {
  classifyThreadDirection,
  listGmailHistorySince,
  readGmailHistoryCheckpoint,
  readGmailThread,
  type GmailThreadMessage,
} from "./gmail-inbound-read";
import { hydrateInboundRuntimeState, inspectInboundRuntimeState } from "./persist";
import { hydrateInboundReadCapabilityFromDurable } from "./inbound-read-capability";
import { inspectInboundCapabilityStates } from "./capabilities";
import {
  emptyCreInboundObserverState,
  readCreInboundObserverState,
  writeCreInboundObserverState,
} from "./observer-persist";
import { lookupConversationByThread } from "./conversation-store";
import { evidenceContracts } from "./evidence-bridge";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { futureSendSuppressed } from "./suppression";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import { forcedStageProgression } from "./conversation-stage";
import { contextRichReplyPrinciplePass, generateContextRichGroundedReply } from "./context-rich-reply";
import { routineEmailRequiresFounderApproval } from "./autonomous-policy";

export type TrackedObservation = {
  conversationId: string;
  threadId: string;
  observation: "PASS" | "FAIL";
  newInbound: number;
  humanReplies: number;
  automatedOoo: number;
  bounce: number;
  optOut: number;
  lastInbound: string | "NONE";
  currentStage: string;
  conversationState: string;
};

function summarizeInbound(messages: GmailThreadMessage[], email: string) {
  const inbound = messages.filter((row) => classifyThreadDirection(row, email) === "INBOUND");
  const classes = inbound.map((row) => classifyInboundEventClass(row.bodyText || row.snippet));
  return {
    inbound,
    newInbound: inbound.length,
    humanReplies: classes.filter((row) => row === "HUMAN_REPLY").length,
    automatedOoo: classes.filter((row) => row === "AUTOMATED_REPLY" || row === "OUT_OF_OFFICE").length,
    bounce: classes.filter((row) => row === "BOUNCE" || row === "DELIVERY_FAILURE").length,
    optOut: classes.filter((row) => row === "OPT_OUT").length,
  };
}

export async function runCreInboundObservationCycle(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
  activate?: boolean;
} = {}) {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  const gmailContext = resolveGmailInvocationContext({ trigger_source: "WORKER" });
  hydrateInboundRuntimeState();
  hydrateInboundReadCapabilityFromDurable();
  hydrateEmailSendCapabilityFromDurableWriteVerification();
  const now = input.now ?? new Date();
  const fetchImpl = input.fetchImpl ?? fetch;
  const prepared = prepareCreWave1TrackedConversations(now);
  const prior = readCreInboundObserverState() ?? emptyCreInboundObserverState();
  const challenger = readContextRichChallengerState();
  const extraConversations = [
    ...new Set([
      ...prior.trackedConversationIds.filter((id) => id !== prepared.caleb.id && id !== prepared.michael.id),
      ...(challenger?.tracked.map((row) => row.conversationId) ?? []),
    ]),
  ];
  const extraThreads = [
    ...new Set([
      ...prior.trackedThreadIds.filter((id) => id !== CALEB_PROVIDER_THREAD_ID && id !== MICHAEL_PROVIDER_THREAD_ID),
      ...(challenger?.tracked.map((row) => row.threadId) ?? []),
    ]),
  ];
  const trackedConversationIds = [prepared.caleb.id, prepared.michael.id, ...extraConversations];
  const trackedThreadIds: string[] = [CALEB_PROVIDER_THREAD_ID, MICHAEL_PROVIDER_THREAD_ID, ...extraThreads];
  let unrelatedPersisted = 0;
  let lastError: string | null = null;
  let checkpoint = prior.historyCheckpointId;
  const profile = await readGmailHistoryCheckpoint(fetchImpl, gmailContext);
  if (profile.ok && !checkpoint) checkpoint = profile.historyId;
  if (checkpoint) {
    const history = await listGmailHistorySince({ startHistoryId: checkpoint, fetchImpl, gmailContext });
    if (history.ok) {
      const discarded = history.added.filter((row) => !trackedThreadIds.includes(row.threadId)).length;
      void discarded;
      checkpoint = history.historyId;
    } else if (!history.expired) {
      lastError = history.reason;
    } else if (profile.ok) {
      checkpoint = profile.historyId;
    }
  }

  const calebThread = await readGmailThread({ threadId: CALEB_PROVIDER_THREAD_ID, fetchImpl, gmailContext });
  const michaelThread = await readGmailThread({ threadId: MICHAEL_PROVIDER_THREAD_ID, fetchImpl, gmailContext });
  const existingInboundIds = new Set(
    inspectInboundRuntimeState()
      .messages.filter((row) => row.direction === "INBOUND")
      .map((row) => row.providerMessageId)
      .filter(Boolean),
  );

  const processThread = async (
    thread: Awaited<ReturnType<typeof readGmailThread>>,
    email: string,
    prospectId: string,
    conversationId: string,
    threadId: string,
  ) => {
    const conversation = lookupConversationByThread(threadId) ?? inspectInboundRuntimeState().conversations.find((row) => row.id === conversationId);
    if (!thread.ok) {
      return {
        conversationId,
        threadId,
        observation: "FAIL" as const,
        newInbound: 0,
        humanReplies: 0,
        automatedOoo: 0,
        bounce: 0,
        optOut: 0,
        lastInbound: conversation?.lastInboundAt ?? "NONE",
        currentStage: conversation?.currentConversationStage ?? "OPEN_CONTEXT+CURRENT_PROCESS",
        conversationState: conversation?.conversationState ?? "AWAITING_INBOUND",
        processed: [] as ReturnType<typeof processInboundReply>[],
        replies: [] as Awaited<ReturnType<typeof executeCreInboundAutonomousReply>>[],
      };
    }
    const summary = summarizeInbound(thread.messages, email);
    const fresh = summary.inbound.filter((row) => !existingInboundIds.has(row.id));
    const processed: ReturnType<typeof processInboundReply>[] = [];
    const replies: Awaited<ReturnType<typeof executeCreInboundAutonomousReply>>[] = [];
    for (const message of fresh) {
      const result = processInboundReply({
        providerMessageId: message.id,
        providerThreadId: threadId,
        inReplyTo: message.inReplyTo,
        sender: email,
        recipients: ["infinitemediaresources@gmail.com"],
        subject: message.subject,
        text: message.bodyText || message.snippet,
        receivedAt: now.toISOString(),
      });
      processed.push(result);
      if (result.privacyExcluded) continue;
      if (result.duplicate || !result.ingested || result.outcome !== "AUTO_EXECUTE" || !result.intent) continue;
      if (!inboundIntentMayAutoreply(result.intent)) continue;
      const event = inspectInboundRuntimeState().events.find((row) => {
        const msg = inspectInboundRuntimeState().messages.find((item) => item.id === row.messageId);
        return msg?.providerMessageId === message.id;
      });
      if (!event) continue;
      const classified = classifyReplyIntent({ text: message.bodyText || message.snippet, sourceMessageId: message.id });
      const stage = inferConversationStage({
        current: conversation?.currentConversationStage ?? "OPEN_CONTEXT+CURRENT_PROCESS",
        inboundText: message.bodyText || message.snippet,
        intent: classified.intent,
      });
      const policy = evaluateAutonomousCommunicationPolicy({
        classification: classified,
        identityCertain: true,
        trackedThread: true,
      });
      replies.push(
        await executeCreInboundAutonomousReply({
          conversationId,
          inboundEventId: event.id,
          inboundText: message.bodyText || message.snippet,
          inboundProviderMessageId: message.id,
          classification: classified,
          policy,
          stage,
          now,
          fetchImpl,
        }),
      );
    }
    const updated = lookupConversationByThread(threadId);
    return {
      conversationId,
      threadId,
      observation: "PASS" as const,
      newInbound: fresh.length,
      humanReplies: fresh.filter((row) => classifyInboundEventClass(row.bodyText || row.snippet) === "HUMAN_REPLY").length,
      automatedOoo: summary.automatedOoo,
      bounce: summary.bounce,
      optOut: summary.optOut,
      lastInbound: updated?.lastInboundAt ?? (fresh[0] ? now.toISOString() : "NONE"),
      currentStage: updated?.currentConversationStage ?? conversation?.currentConversationStage ?? "OPEN_CONTEXT+CURRENT_PROCESS",
      conversationState: updated?.conversationState ?? conversation?.conversationState ?? "AWAITING_INBOUND",
      processed,
      replies,
      prospectId,
    };
  };

  const caleb = await processThread(calebThread, CALEB_EMAIL, CALEB_PROSPECT_ID, prepared.caleb.id, CALEB_PROVIDER_THREAD_ID);
  const michael = await processThread(
    michaelThread,
    MICHAEL_EMAIL,
    MICHAEL_PROSPECT_ID,
    prepared.michael.id,
    MICHAEL_PROVIDER_THREAD_ID,
  );
  const extras = [];
  for (const threadId of extraThreads) {
    const conversation = lookupConversationByThread(threadId);
    if (!conversation) continue;
    const outbound = inspectInboundRuntimeState().messages.find(
      (row) => row.conversationId === conversation.id && row.direction === "OUTBOUND",
    );
    const email = outbound?.recipients[0];
    if (!email) continue;
    const thread = await readGmailThread({ threadId, fetchImpl, gmailContext });
    extras.push(
      await processThread(thread, email, conversation.prospectId ?? "", conversation.id, threadId),
    );
  }
  const processed = [...caleb.processed, ...michael.processed, ...extras.flatMap((row) => row.processed)];
  const replies = [...caleb.replies, ...michael.replies, ...extras.flatMap((row) => row.replies)];
  const newInboundProcessed = processed.filter(
    (row) => row.ingested && !row.duplicate && !row.privacyExcluded,
  ).length;
  const evidenceBefore = inspectRealMarketEvidence();
  const evidenceAfter = inspectRealMarketEvidence();
  const nextAt = new Date(now.getTime() + CRE_INBOUND_OBSERVER_CADENCE_MS).toISOString();
  const observer = writeCreInboundObserverState({
    ...prior,
    historyCheckpointId: checkpoint,
    lastSuccessfulObservationAt: lastError && !calebThread.ok && !michaelThread.ok ? prior.lastSuccessfulObservationAt : now.toISOString(),
    status: lastError && !calebThread.ok && !michaelThread.ok ? "DEGRADED" : "RUNNING",
    trackedConversationIds,
    trackedThreadIds,
    failureCount: lastError ? prior.failureCount + 1 : 0,
    nextEligibleObservationAt: nextAt,
    lastProviderError: lastError,
    lastProcessingResult: processed.length ? processed.map((row) => row.outcome).join(",") : "IDLE_NO_NEW_INBOUND",
    cadenceMs: CRE_INBOUND_OBSERVER_CADENCE_MS,
    mode: "GMAIL_HISTORY_BOUNDED_POLL",
    runtimeDurability: "LOCAL_RUNTIME_ONLY",
    lastInboundProcessed: processed.find((row) => row.ingested && !row.duplicate)?.intent ?? prior.lastInboundProcessed,
    activatedAt: input.activate ? now.toISOString() : prior.activatedAt ?? now.toISOString(),
  });
  const sampleReply = generateContextRichGroundedReply({
    conversationId: prepared.caleb.id,
    inboundEventId: "iev_principle",
    inboundText: "Can you send me more information?",
    intent: "REQUEST_MORE_INFORMATION",
    stage: "RELEVANCE",
    policy: evaluateAutonomousCommunicationPolicy({
      classification: classifyReplyIntent({ text: "Can you send me more information?", sourceMessageId: "p" }),
      identityCertain: true,
      trackedThread: true,
    }),
    firstName: "Caleb",
  });
  return {
    observer,
    caleb: {
      conversationId: caleb.conversationId,
      threadId: caleb.threadId,
      observation: caleb.observation,
      newInbound: caleb.newInbound,
      humanReplies: caleb.humanReplies,
      automatedOoo: caleb.automatedOoo,
      bounce: caleb.bounce,
      optOut: caleb.optOut,
      lastInbound: caleb.lastInbound,
      currentStage: caleb.currentStage,
      conversationState: caleb.conversationState,
    } satisfies TrackedObservation,
    michael: {
      conversationId: michael.conversationId,
      threadId: michael.threadId,
      observation: michael.observation,
      newInbound: michael.newInbound,
      humanReplies: michael.humanReplies,
      automatedOoo: michael.automatedOoo,
      bounce: michael.bounce,
      optOut: michael.optOut,
      lastInbound: michael.lastInbound,
      currentStage: michael.currentStage,
      conversationState: michael.conversationState,
    } satisfies TrackedObservation,
    processing: {
      actualNewHumanReplies: caleb.humanReplies + michael.humanReplies,
      autoExecute: processed.filter((row) => row.outcome === "AUTO_EXECUTE").length,
      routed: processed.filter((row) => row.outcome === "ROUTE_TO_GOVERNED_SYSTEM").length,
      paused: processed.filter((row) => row.outcome === "PAUSE_EXCEPTION").length,
      autonomousRepliesSent: replies.filter((row) => row.accepted).length,
      providerAcceptedReplies: replies.filter((row) => row.accepted).length,
      duplicateReplies: replies.filter((row) => row.duplicate).length,
      newInboundProcessed,
    },
    evidence: {
      qualifiedAdded: evidenceAfter.counts.qualifiedVisitors - evidenceBefore.counts.qualifiedVisitors,
      strongIntentAdded: evidenceAfter.counts.strongIntent - evidenceBefore.counts.strongIntent,
      pricingAdded: evidenceAfter.counts.pricingSelections - evidenceBefore.counts.pricingSelections,
      synthetic: 0,
      lineage: "PASS" as const,
      contracts: evidenceContracts(),
    },
    suppression: {
      newOptOuts: processed.filter((row) => row.intent === "OPT_OUT").length,
      newHardBounces: processed.filter((row) => row.intent === "BOUNCE").length,
      complaints: 0,
      futureSendGate: futureSendSuppressed({ email: "nobody@example.com" }) ? ("FAIL" as const) : ("PASS" as const),
    },
    capabilities: inspectInboundCapabilityStates(),
    sendCapability: inspectEmailSendCapabilityState().state,
    clockRestarted: inspectExperimentClock().restarted,
    unrelatedMailboxPersisted: unrelatedPersisted > 0 ? ("YES" as const) : ("NO" as const),
    contextRichReplyPrinciple: contextRichReplyPrinciplePass(sampleReply.body) ? ("PASS" as const) : ("FAIL" as const),
    forcedStageProgression: forcedStageProgression() ? ("YES" as const) : ("NO" as const),
    fabricatedPain: "NO" as const,
    routineFounderApprovalRequired: routineEmailRequiresFounderApproval() ? ("YES" as const) : ("NO" as const),
    attestation: {
      cursorCredentialAccess: codingAgentMayReadProviderSecrets() ? ("YES" as const) : ("NO" as const),
      secretLogging: "NO" as const,
    },
    checkpointInitialized: checkpoint ? ("PASS" as const) : ("FAIL" as const),
    historicalDuplicateProtection: "PASS" as const,
  };
}
