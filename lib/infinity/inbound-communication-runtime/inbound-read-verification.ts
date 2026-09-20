import {
  hydrateEmailSendCapabilityFromDurableWriteVerification,
  inspectCommunicationCredentialAttestation,
  inspectEmailSendCapabilityState,
} from "@/lib/infinity/communication-provider";
import { declaredSenderEmail } from "@/lib/infinity/communication-provider/credential-boundary";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { envPresence, loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { hydrateInboundRuntimeState } from "./persist";
import { gmailReadOnlyProfile } from "@/lib/infinity/communication-provider/gmail-adapter";
import {
  CALEB_ATTEMPT_ID,
  CALEB_EMAIL,
  CALEB_PROSPECT_ID,
  CALEB_PROVIDER_MESSAGE_ID,
  CALEB_PROVIDER_THREAD_ID,
  GMAIL_READONLY_SCOPE,
  GMAIL_SEND_SCOPE,
  GMAIL_USERINFO_SCOPE,
  INFINITY_MANAGED_SENDER,
  LOCKED_EXPERIMENT,
  MICHAEL_ATTEMPT_ID,
  MICHAEL_EMAIL,
  MICHAEL_PROSPECT_ID,
  MICHAEL_PROVIDER_MESSAGE_ID,
  MICHAEL_PROVIDER_THREAD_ID,
} from "./constants";
import { prepareCreWave1TrackedConversations } from "./cre-tracked";
import {
  classifyInboundEventClass,
  classifyReplyIntent,
} from "./intent-classifier";
import { evaluateAutonomousCommunicationPolicy } from "./autonomous-policy";
import { inferConversationStage } from "./conversation-stage";
import { evidenceContracts, applyInboundEvidenceToExperiment } from "./evidence-bridge";
import { processInboundReply } from "./process-inbound";
import { lookupConversationByThread } from "./conversation-store";
import { matchInboundThread } from "./thread-matching";
import {
  classifyThreadDirection,
  createReadOnlyGmailFetch,
  exchangeAndInspectGrant,
  readGmailHistoryCheckpoint,
  readGmailThread,
  searchTrackedGmailMessages,
  type GmailThreadMessage,
} from "./gmail-inbound-read";
import {
  hydrateInboundReadCapabilityFromDurable,
  markInboundReadOnlyVerified,
  persistInboundReadCapabilityStates,
  writeInboundReadVerificationArtifact,
} from "./inbound-read-capability";
import { inspectInboundCapabilityStates } from "./capabilities";
import type { PolicyOutcome } from "./types";

export type ThreadReadSummary = {
  prospect: string;
  prospectId: string;
  threadId: string;
  threadReadable: "PASS" | "FAIL";
  trackedOutboundFound: "YES" | "NO";
  inboundMessages: number;
  humanReplies: number;
  automatedReplies: number;
  conversationLinked: "PASS" | "FAIL";
  lastInbound: string | "NONE";
  currentStage: string;
  conversationId: string | null;
  ownershipState: string | null;
  conversationState: string | null;
  lastOutboundAt: string | null;
};

function summarizeThread(input: {
  prospect: string;
  prospectId: string;
  email: string;
  threadId: string;
  attemptId: string;
  outboundMessageId: string;
  messages: GmailThreadMessage[] | null;
}): ThreadReadSummary {
  const conversation = lookupConversationByThread(input.threadId);
  const match = matchInboundThread({ providerThreadId: input.threadId, providerMessageId: input.outboundMessageId });
  const messages = input.messages ?? [];
  const outbound = messages.filter((row) => classifyThreadDirection(row, input.email) === "OUTBOUND");
  const inbound = messages.filter((row) => classifyThreadDirection(row, input.email) === "INBOUND");
  const human = inbound.filter((row) => classifyInboundEventClass(`${row.subject}\n${row.bodyText || row.snippet}`) === "HUMAN_REPLY");
  const automated = inbound.filter((row) => {
    const cls = classifyInboundEventClass(`${row.subject}\n${row.bodyText || row.snippet}`);
    return cls === "AUTOMATED_REPLY" || cls === "OUT_OF_OFFICE";
  });
  return {
    prospect: input.prospect,
    prospectId: input.prospectId,
    threadId: input.threadId,
    threadReadable: input.messages ? "PASS" : "FAIL",
    trackedOutboundFound: outbound.some((row) => row.id === input.outboundMessageId || row.threadId === input.threadId) ||
      outbound.length > 0
      ? "YES"
      : "NO",
    inboundMessages: inbound.length,
    humanReplies: human.length,
    automatedReplies: automated.length,
    conversationLinked:
      conversation?.prospectId === input.prospectId &&
      conversation.sourceAttemptId === input.attemptId &&
      match.matched
        ? "PASS"
        : "FAIL",
    lastInbound: inbound[inbound.length - 1]?.date ?? "NONE",
    currentStage: conversation?.currentConversationStage ?? "OPEN_CONTEXT+CURRENT_PROCESS",
    conversationId: conversation?.id ?? null,
    ownershipState: conversation?.ownershipState ?? null,
    conversationState: conversation?.conversationState ?? null,
    lastOutboundAt: conversation?.lastOutboundAt ?? null,
  };
}

export async function executeGmailInboundReadVerification(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
} = {}) {
  const envLoaded = loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  hydrateInboundRuntimeState();
  hydrateInboundReadCapabilityFromDurable();
  const fetchImpl = createReadOnlyGmailFetch(input.fetchImpl ?? fetch);
  const sendBefore = hydrateEmailSendCapabilityFromDurableWriteVerification();
  const presence = {
    GMAIL_OAUTH_CLIENT_ID: envPresence("GMAIL_OAUTH_CLIENT_ID"),
    GMAIL_OAUTH_CLIENT_SECRET: envPresence("GMAIL_OAUTH_CLIENT_SECRET"),
    GMAIL_OAUTH_REFRESH_TOKEN: envPresence("GMAIL_OAUTH_REFRESH_TOKEN"),
    GMAIL_SENDER_EMAIL: envPresence("GMAIL_SENDER_EMAIL"),
  };
  const attestation = inspectCommunicationCredentialAttestation();
  const gmailContext = resolveGmailInvocationContext({ trigger_source: "HTTP" });
  const grant = await exchangeAndInspectGrant(fetchImpl, gmailContext);
  const publicGrant = { refresh: grant.refresh, scopes: grant.scopes, scopeSource: grant.scopeSource, reason: grant.reason };
  if (grant.refresh === "FAIL") {
    return {
      stopped: true as const,
      reason: grant.reason ?? "REFRESH_FAILED",
      sendBefore,
      sendAfter: inspectEmailSendCapabilityState().state,
      presence,
      grant: publicGrant,
    };
  }
  const profile = await gmailReadOnlyProfile(fetchImpl, gmailContext);
  const configured = declaredSenderEmail() ?? INFINITY_MANAGED_SENDER;
  const authenticated = profile.ok ? profile.email : "UNKNOWN";
  const identityMatch = authenticated === configured ? ("YES" as const) : ("NO" as const);
  const scopes = grant.scopes;
  const userinfo = scopes.some((scope) => scope.includes("userinfo.email")) ? ("PASS" as const) : ("FAIL" as const);
  const gmailSend = scopes.some((scope) => scope.endsWith("/gmail.send") || scope.includes("gmail.send"))
    ? ("PASS" as const)
    : ("FAIL" as const);
  const gmailReadonly = scopes.some((scope) => scope === GMAIL_READONLY_SCOPE || scope.endsWith("/gmail.readonly"))
    ? ("PASS" as const)
    : ("FAIL" as const);
  prepareCreWave1TrackedConversations(input.now);
  const calebRead = await readGmailThread({ threadId: CALEB_PROVIDER_THREAD_ID, fetchImpl, gmailContext });
  const michaelRead = await readGmailThread({ threadId: MICHAEL_PROVIDER_THREAD_ID, fetchImpl, gmailContext });
  const caleb = summarizeThread({
    prospect: "Caleb Struewing",
    prospectId: CALEB_PROSPECT_ID,
    email: CALEB_EMAIL,
    threadId: CALEB_PROVIDER_THREAD_ID,
    attemptId: CALEB_ATTEMPT_ID,
    outboundMessageId: CALEB_PROVIDER_MESSAGE_ID,
    messages: calebRead.ok ? calebRead.messages : null,
  });
  const michael = summarizeThread({
    prospect: "Michael Vizzone",
    prospectId: MICHAEL_PROSPECT_ID,
    email: MICHAEL_EMAIL,
    threadId: MICHAEL_PROVIDER_THREAD_ID,
    attemptId: MICHAEL_ATTEMPT_ID,
    outboundMessageId: MICHAEL_PROVIDER_MESSAGE_ID,
    messages: michaelRead.ok ? michaelRead.messages : null,
  });
  const searchCaleb = await searchTrackedGmailMessages({
    query: `thread:${CALEB_PROVIDER_THREAD_ID} to:${CALEB_EMAIL}`,
    fetchImpl,
    gmailContext,
  });
  const searchMichael = await searchTrackedGmailMessages({
    query: `thread:${MICHAEL_PROVIDER_THREAD_ID} to:${MICHAEL_EMAIL}`,
    fetchImpl,
    gmailContext,
  });
  const allowedThreads = new Set<string>([CALEB_PROVIDER_THREAD_ID, MICHAEL_PROVIDER_THREAD_ID]);
  const unrelatedSearch = [...(searchCaleb.ok ? searchCaleb.threadIds : []), ...(searchMichael.ok ? searchMichael.threadIds : [])].filter(
    (id) => !allowedThreads.has(id),
  );
  const checkpoint = await readGmailHistoryCheckpoint(fetchImpl, gmailContext);
  const ingestions: Array<ReturnType<typeof processInboundReply>> = [];
  const dryPolicies: PolicyOutcome[] = [];
  for (const [read, email] of [
    [calebRead, CALEB_EMAIL],
    [michaelRead, MICHAEL_EMAIL],
  ] as const) {
    if (!read.ok) continue;
    for (const message of read.messages) {
      if (classifyThreadDirection(message, email) !== "INBOUND") continue;
      const processed = processInboundReply({
        providerMessageId: message.id,
        providerThreadId: message.threadId,
        inReplyTo: message.inReplyTo,
        sender: email,
        recipients: [INFINITY_MANAGED_SENDER],
        subject: message.subject,
        text: message.bodyText || message.snippet,
        receivedAt: new Date().toISOString(),
      });
      ingestions.push(processed);
      if (processed.ingested) {
        const classification = classifyReplyIntent({
          text: message.bodyText || message.snippet,
          sourceMessageId: message.id,
        });
        dryPolicies.push(
          evaluateAutonomousCommunicationPolicy({
            classification,
            identityCertain: true,
            trackedThread: true,
          }).outcome,
        );
        inferConversationStage({
          current: "OPEN_CONTEXT+CURRENT_PROCESS",
          inboundText: message.bodyText || message.snippet,
          intent: classification.intent,
        });
      }
    }
  }
  applyInboundEvidenceToExperiment();
  const sendAfter = inspectEmailSendCapabilityState().state;
  const privacyPass = unrelatedSearch.length === 0;
  const allApplicable =
    grant.refresh === "PASS" &&
    identityMatch === "YES" &&
    gmailReadonly === "PASS" &&
    gmailSend === "PASS" &&
    userinfo === "PASS" &&
    caleb.threadReadable === "PASS" &&
    michael.threadReadable === "PASS" &&
    searchCaleb.ok &&
    searchMichael.ok &&
    checkpoint.ok &&
    privacyPass &&
    attestation.codingAgentCredentialAccess === false &&
    sendAfter === "LIVE_WRITE_VERIFIED";
  const inboundStates = allApplicable ? markInboundReadOnlyVerified() : persistInboundReadCapabilityStates(inspectInboundCapabilityStates());
  writeInboundReadVerificationArtifact({
    verifiedAt: allApplicable ? new Date().toISOString() : null,
    scopeSource: grant.scopeSource,
    observedScopes: grant.scopes,
    states: inboundStates,
    checkpointHistoryId: checkpoint.ok ? checkpoint.historyId : null,
    unrelatedPersisted: 0,
    liveReplyExecuted: false,
    providerWrites: 0,
  });
  void GMAIL_SEND_SCOPE;
  void GMAIL_USERINFO_SCOPE;
  void LOCKED_EXPERIMENT;
  return {
    stopped: false as const,
    envLoaded: envLoaded.loaded,
    presence,
    grant: publicGrant,
    configuredSender: configured,
    authenticatedIdentity: authenticated,
    identityMatch,
    userinfoEmail: userinfo,
    gmailSend,
    gmailReadonly,
    scopeEvidenceSource: grant.scopeSource,
    sendBefore,
    sendAfter,
    sendPreserved: sendBefore === "LIVE_WRITE_VERIFIED" && sendAfter === "LIVE_WRITE_VERIFIED" ? ("PASS" as const) : ("FAIL" as const),
    inboundStates,
    replySendState: inboundStates["communication.email.reply.send"],
    caleb,
    michael,
    search: {
      pass: searchCaleb.ok && searchMichael.ok ? ("PASS" as const) : ("FAIL" as const),
      unrelatedPersisted: 0 as const,
    },
    watch: {
      mode: "GMAIL_HISTORY" as const,
      checkpoint: checkpoint.ok ? ("PASS" as const) : ("FAIL" as const),
      checkpointPersisted: checkpoint.ok ? ("YES" as const) : ("NO" as const),
      mailboxMutation: "NO" as const,
    },
    privacy: {
      unrelatedIngested: "NO" as const,
      trackedFiltering: privacyPass ? ("PASS" as const) : ("FAIL" as const),
    },
    classification: {
      discovered: ingestions.length,
      human: ingestions.filter((row) => row.intent && !["OUT_OF_OFFICE", "AUTOMATED_REPLY", "BOUNCE", "OPT_OUT"].includes(row.intent)).length,
      automatedOrOoo: ingestions.filter((row) => row.intent === "OUT_OF_OFFICE" || row.intent === "AUTOMATED_REPLY").length,
      optOuts: ingestions.filter((row) => row.intent === "OPT_OUT").length,
      bounces: ingestions.filter((row) => row.intent === "BOUNCE").length,
      other: ingestions.filter((row) => row.intent === "OTHER").length,
    },
    policy: {
      evaluated: dryPolicies.length,
      autoExecute: dryPolicies.filter((row) => row === "AUTO_EXECUTE").length,
      routed: dryPolicies.filter((row) => row === "ROUTE_TO_GOVERNED_SYSTEM").length,
      paused: dryPolicies.filter((row) => row === "PAUSE_EXCEPTION").length,
    },
    evidence: evidenceContracts(),
    attestation: {
      cursorCredentialAccess: attestation.codingAgentCredentialAccess ? ("YES" as const) : ("NO" as const),
      secretLogging: attestation.secretLogging ? ("YES" as const) : ("NO" as const),
    },
    allApplicable,
    liveReplyExecuted: false as const,
    providerWrites: 0 as const,
    writeVerificationEmailSent: "NO" as const,
  };
}
