import { beforeEach, describe, expect, it } from "vitest";
import {
  evaluateEmailSendAuthorization,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope, buildEmailIntent } from "@/lib/infinity/communication-provider/envelope";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CALEB_PROSPECT_ID,
  CALEB_PROVIDER_THREAD_ID,
  MICHAEL_PROSPECT_ID,
  MICHAEL_PROVIDER_THREAD_ID,
  INBOUND_MISSION,
  INBOUND_MISSION_ID,
  GMAIL_READONLY_SCOPE,
  attachmentContentProcessing,
  automatedReplyIsEvidence,
  blanketDraftForReviewGate,
  calebThreadLinked,
  classifyInboundEventClass,
  classifyReplyIntent,
  codingAgentMayReadProviderSecrets,
  evaluateAutonomousCommunicationPolicy,
  evaluateMailboxPrivacy,
  evidenceContracts,
  executeInboundCommunicationRuntimeMission,
  excludeUnrelatedInbox,
  forcedStageProgression,
  futureSendSuppressed,
  generateGroundedReply,
  groundedReplyContainsFabricatedClaims,
  inboundReplyIsPricingIntent,
  inboundReplyIsStrongIntent,
  inferConversationStage,
  inspectGmailInboundAdapter,
  inspectGmailInboundScopes,
  inspectInboundCapabilityStates,
  inspectMailboxWatch,
  listConversations,
  listMessages,
  listSuppressions,
  liveRepliesExecutedThisMilestone,
  matchInboundThread,
  mayExecuteAttachmentContents,
  michaelThreadLinked,
  persistMessage,
  persistSuppression,
  planAutonomousReply,
  prepareCreWave1TrackedConversations,
  processInboundReply,
  projectCommunicationIntelligence,
  providerNeutralInboundModel,
  resetInboundCommunicationRuntime,
  routineEmailRequiresFounderApproval,
  unknownThreadFailClosed,
} from "..";

describe("INBOUND COMMUNICATION + AUTONOMOUS CONVERSATION RUNTIME V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
  });

  it("registers Mission Runtime and does not require blanket founder approval", async () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.InboundCommunicationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts.InboundCommunicationRuntime.missionType).toBe(INBOUND_MISSION);
    expect(roomForStep("INGEST_INBOUND_EVENTS", "organic_growth")).toBe("growth_department");
    expect(roomForStep("CLASSIFY_AND_POLICY", "market_validation")).toBe("quality_control");
    expect(routineEmailRequiresFounderApproval()).toBe(false);
    expect(blanketDraftForReviewGate()).toBe(false);
    expect(providerNeutralInboundModel()).toBe("BUILT");
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    const run = await executeInboundCommunicationRuntimeMission();
    expect(run.mission).toBe(INBOUND_MISSION);
    expect(run.missionId).toBe(INBOUND_MISSION_ID);
    expect(run.liveReplyExecuted).toBe(false);
    expect(run.providerWrites).toBe(0);
    expect(run.sendCapability).toBe("LIVE_WRITE_VERIFIED");
    expect(run.clock.restarted).toBe(false);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).latestCompleted?.missionType).toBe(INBOUND_MISSION);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
  });

  it("persists conversations and messages and prepares Caleb and Michael threads only", () => {
    const prepared = prepareCreWave1TrackedConversations();
    expect(prepared.benPrepared).toBe(false);
    expect(prepared.stephaniePrepared).toBe(false);
    expect(calebThreadLinked()).toBe(true);
    expect(michaelThreadLinked()).toBe(true);
    expect(lookupByProspect(CALEB_PROSPECT_ID)?.providerThreadId).toBe(CALEB_PROVIDER_THREAD_ID);
    expect(lookupByProspect(MICHAEL_PROSPECT_ID)?.providerThreadId).toBe(MICHAEL_PROVIDER_THREAD_ID);
    persistMessage({
      conversationId: prepared.caleb.id,
      direction: "OUTBOUND",
      provider: "gmail.com_v1",
      providerMessageId: "1a0631f98c277314",
      providerThreadId: CALEB_PROVIDER_THREAD_ID,
      sender: "infinitemediaresources@gmail.com",
      recipients: ["caleb.struewing@jll.com"],
      subject: prepared.caleb.subject,
      normalizedText: "initial",
      receivedAt: null,
      sentAt: new Date().toISOString(),
      messageType: "INITIAL_OUTREACH",
      automationClassification: "UNKNOWN",
      providerMetadata: {},
      traceability: {
        organizationId: LIVE_ORG,
        ventureId: prepared.caleb.ventureId,
        experimentId: prepared.caleb.experimentId,
        prospectId: CALEB_PROSPECT_ID,
        sourceAttemptId: prepared.caleb.sourceAttemptId,
      },
      attachmentMetadata: [],
    });
    expect(listConversations()).toHaveLength(2);
    expect(listMessages(prepared.caleb.id).length).toBeGreaterThan(0);
  });

  it("matches known threads, fail-closes unknown threads, and excludes unrelated inbox mail", () => {
    prepareCreWave1TrackedConversations();
    expect(matchInboundThread({ providerThreadId: CALEB_PROVIDER_THREAD_ID }).matched).toBe(true);
    expect(matchInboundThread({ providerThreadId: MICHAEL_PROVIDER_THREAD_ID }).matched).toBe(true);
    expect(matchInboundThread({ providerThreadId: "unknown-thread" }).matched).toBe(false);
    expect(unknownThreadFailClosed()).toBe(true);
    expect(
      evaluateMailboxPrivacy({
        providerThreadId: "personal-unrelated",
        sender: "friend@gmail.com",
        recipients: ["infinitemediaresources@gmail.com"],
      }).process,
    ).toBe(false);
    expect(excludeUnrelatedInbox()).toBe(true);
    const unknown = processInboundReply({
      providerMessageId: "msg_unknown",
      providerThreadId: "not-a-tracked-thread",
      sender: "stranger@example.com",
      recipients: ["infinitemediaresources@gmail.com"],
      subject: "Hello",
      text: "How much does it cost?",
    });
    expect(unknown.ingested).toBe(false);
    expect(unknown.privacyExcluded || unknown.paused).toBe(true);
  });

  it("classifies human, automated, OOO, bounce, opt-out, not-interested, pricing, meeting, wrong-person, and referral", () => {
    expect(classifyInboundEventClass("Thanks — we use Excel today for occupancy-cost compare.")).toBe("HUMAN_REPLY");
    expect(classifyInboundEventClass("This is an automatic reply. Do not reply to this message.")).toBe("AUTOMATED_REPLY");
    expect(classifyInboundEventClass("I am out of the office until next Monday.")).toBe("OUT_OF_OFFICE");
    expect(classifyInboundEventClass("Mailer-Daemon: undeliverable User unknown 550 5.1.1")).toBe("BOUNCE");
    expect(classifyReplyIntent({ text: "Please remove me and do not email me again.", sourceMessageId: "m1" }).intent).toBe("OPT_OUT");
    expect(classifyReplyIntent({ text: "Not interested, please don't contact us.", sourceMessageId: "m2" }).intent).toBe("NOT_INTERESTED");
    expect(classifyReplyIntent({ text: "How much does it cost per deal?", sourceMessageId: "m3" }).intent).toBe("PRICING_QUESTION");
    expect(classifyReplyIntent({ text: "Let's talk next week if you are free.", sourceMessageId: "m4" }).intent).toBe("MEETING_REQUEST");
    expect(classifyReplyIntent({ text: "You have the wrong person.", sourceMessageId: "m5" }).intent).toBe("WRONG_PERSON");
    expect(classifyReplyIntent({ text: "Wrong person — try Jane Smith on our occupier team.", sourceMessageId: "m6" }).intent).toBe(
      "REFERRAL_TO_OTHER_PERSON",
    );
  });

  it("infers consultative stages without forced progression or manufactured pain", () => {
    expect(forcedStageProgression()).toBe(false);
    expect(
      inferConversationStage({
        current: "OPEN_CONTEXT+CURRENT_PROCESS",
        inboundText: "Today we build the comparison in Excel for each client.",
        intent: "OTHER",
      }),
    ).toBe("CURRENT_PROCESS");
    expect(
      inferConversationStage({
        current: "CURRENT_PROCESS",
        inboundText: "How much does it cost?",
        intent: "PRICING_QUESTION",
      }),
    ).toBe("PRICING");
    const reply = generateGroundedReply({
      conversationId: "cnv_test",
      inboundEventId: "iev_test",
      inboundText: "How much does it cost?",
      intent: "PRICING_QUESTION",
      stage: "PRICING",
      policy: evaluateAutonomousCommunicationPolicy({
        classification: classifyReplyIntent({ text: "How much does it cost?", sourceMessageId: "m" }),
        identityCertain: true,
        trackedThread: true,
      }),
      firstName: "Caleb",
    });
    expect(reply.fabricatedClaims).toBe(0);
    expect(groundedReplyContainsFabricatedClaims(reply.body)).toBe(false);
    expect(reply.liveSend).toBe(false);
    expect(/excel is painful|losing deals|act now/i.test(reply.body)).toBe(false);
  });

  it("returns AUTO_EXECUTE, ROUTE_TO_GOVERNED_SYSTEM, and PAUSE_EXCEPTION without a draft-for-review gate", () => {
    const pricing = classifyReplyIntent({ text: "How much does it cost?", sourceMessageId: "a" });
    expect(
      evaluateAutonomousCommunicationPolicy({ classification: pricing, identityCertain: true, trackedThread: true }).outcome,
    ).toBe("AUTO_EXECUTE");
    const meeting = classifyReplyIntent({ text: "Can we meet next week?", sourceMessageId: "b" });
    expect(
      evaluateAutonomousCommunicationPolicy({ classification: meeting, identityCertain: true, trackedThread: true }).outcome,
    ).toBe("ROUTE_TO_GOVERNED_SYSTEM");
    expect(
      evaluateAutonomousCommunicationPolicy({
        classification: pricing,
        identityCertain: false,
        trackedThread: true,
      }).outcome,
    ).toBe("PAUSE_EXCEPTION");
  });

  it("ingests Caleb replies idempotently, plans grounded thread-bounded replies, and never live-sends", () => {
    prepareCreWave1TrackedConversations();
    const payload = {
      providerMessageId: "inb_caleb_1",
      providerThreadId: CALEB_PROVIDER_THREAD_ID,
      sender: "caleb.struewing@jll.com",
      recipients: ["infinitemediaresources@gmail.com"],
      subject: "Re: Question on Columbus lease-scenario comparison",
      text: "How much does it cost?",
    };
    const first = processInboundReply(payload);
    const second = processInboundReply(payload);
    expect(first.ingested).toBe(true);
    expect(first.intent).toBe("PRICING_QUESTION");
    expect(first.liveReplyExecuted).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(liveRepliesExecutedThisMilestone()).toBe(0);
    const planned = planAutonomousReply({
      conversationId: lookupByProspect(CALEB_PROSPECT_ID)!.id,
      inboundEventId: "missing",
      inboundText: "How much does it cost?",
      classification: classifyReplyIntent({ text: "How much does it cost?", sourceMessageId: "x" }),
      policy: evaluateAutonomousCommunicationPolicy({
        classification: classifyReplyIntent({ text: "How much does it cost?", sourceMessageId: "x" }),
        identityCertain: true,
        trackedThread: true,
      }),
      stage: "PRICING",
    });
    expect(planned.liveReplyExecuted).toBe(false);
  });

  it("keeps inbound replies from becoming evidence and preserves CRE clock", () => {
    const contracts = evidenceContracts();
    expect(contracts.replyIsNotStrongIntent).toBe(true);
    expect(contracts.replyIsNotPricingIntent).toBe(true);
    expect(contracts.automatedReplyIsNotEvidence).toBe(true);
    expect(contracts.oooIsNotEvidence).toBe(true);
    expect(contracts.openIsNotStrongIntent).toBe(true);
    expect(contracts.visitIsNotPricingIntent).toBe(true);
    expect(inboundReplyIsStrongIntent()).toBe(false);
    expect(inboundReplyIsPricingIntent()).toBe(false);
    expect(automatedReplyIsEvidence()).toBe(false);
    expect(inspectExperimentClock().restarted).toBe(false);
  });

  it("persists opt-out and hard-bounce suppression and blocks future sends", () => {
    persistSuppression({
      identity: "caleb.struewing@jll.com",
      reason: "OPT_OUT",
      scope: "CONTACT_GLOBAL",
    });
    persistSuppression({
      identity: "mvizzone@tenantadvisors.com",
      reason: "HARD_BOUNCE",
      scope: "CONTACT_GLOBAL",
    });
    expect(listSuppressions().length).toBeGreaterThanOrEqual(2);
    expect(futureSendSuppressed({ email: "caleb.struewing@jll.com" })).toBe(true);
    const envelope = buildEmailEnvelope({
      organizationId: LIVE_ORG,
      toAddress: "caleb.struewing@jll.com",
      subject: "follow",
      body: "hi",
      experimentId: "exp_e72beb7b6d35e7b20acf",
    });
    const decision = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(envelope, "bounded_outreach"),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
    });
    expect(decision.suppression).toBe("FAIL");
    expect(decision.allowed).toBe(false);
  });

  it("exposes HQ conversation intelligence and Gmail inbound scope upgrade without faking read verification", () => {
    prepareCreWave1TrackedConversations();
    processInboundReply({
      providerMessageId: "inb_michael_1",
      providerThreadId: MICHAEL_PROVIDER_THREAD_ID,
      sender: "mvizzone@tenantadvisors.com",
      recipients: ["infinitemediaresources@gmail.com"],
      subject: "Re: Question on Chicago tenant-rep lease comparison",
      text: "Can we meet next week?",
    });
    const hq = projectCommunicationIntelligence();
    expect(hq.activeConversations).toBeGreaterThan(0);
    expect(hq.meetingRequests).toBe(1);
    const scopes = inspectGmailInboundScopes();
    expect(scopes.existingSendCapability).toBe("LIVE_WRITE_VERIFIED");
    expect(scopes.missingScopes).toContain(GMAIL_READONLY_SCOPE);
    expect(scopes.scopeUpgradeRequired).toBe("YES");
    expect(inspectGmailInboundAdapter().liveRead).toBe(false);
    expect(inspectMailboxWatch().fakePush).toBe(false);
    expect(inspectMailboxWatch().fallback).toBe("BOUNDED_INCREMENTAL_HISTORY_POLL");
    expect(inspectInboundCapabilityStates()["communication.email.read"]).toBe("ARCHITECTURE_BUILT_SCOPE_BLOCKED");
    expect(mayExecuteAttachmentContents()).toBe(false);
    expect(attachmentContentProcessing()).toBe("PARTIAL");
  });
});

function lookupByProspect(prospectId: string) {
  return listConversations().find((row) => row.prospectId === prospectId) ?? null;
}
