import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import {
  CALEB_CONVERSATION_ID,
  CALEB_PROVIDER_THREAD_ID,
  MICHAEL_CONVERSATION_ID,
  MICHAEL_PROVIDER_THREAD_ID,
} from "@/lib/infinity/inbound-communication-runtime/constants";
import { markInboundReadOnlyVerified } from "@/lib/infinity/inbound-communication-runtime/capabilities";
import { classifyReplyIntent } from "@/lib/infinity/inbound-communication-runtime/intent-classifier";
import { inferConversationStage, inferValidationSignals } from "@/lib/infinity/inbound-communication-runtime/conversation-stage";
import { evaluateAutonomousCommunicationPolicy, routineEmailRequiresFounderApproval } from "@/lib/infinity/inbound-communication-runtime/autonomous-policy";
import { inspectInboundRuntimeState, resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import {
  emptyCreInboundObserverState,
  inspectMailboxObserverHealth,
  writeCreInboundObserverState,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "../experiment-clock";
import { emptyOutcomeCounts, evaluateConsultativeOutreachOutcome, isQualifiedEngagement } from "../consultative-outreach-outcome-evaluation";
import {
  emptyChallengerState,
  resetContextRichChallengerState,
  writeContextRichChallengerState,
} from "../cre-context-rich-challenger-durable-state";
import {
  ANNIE_CONVERSATION_ID,
  BROOKS_CONVERSATION_ID,
  CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_RUNTIME,
  CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
  PREVIOUS_OBSERVER_CHECKPOINT,
  executeCreContextRichChallengerOutcomeObservation,
} from "../cre-context-rich-challenger-outcome-observation";
import { executeCreContextRichChallengerOutcomeObservationMission } from "../cre-context-rich-challenger-outcome-observation-mission";
import { setExperimentRuntimeState } from "../runtime-state";

const BROOKS_THREAD = "1a0708bf27f455c5";
const ANNIE_THREAD = "1a0708bf5f29fb09";
const BROOKS_EMAIL = "brooks.murphy@jll.com";
const ANNIE_EMAIL = "annie.nicolau@jll.com";
const CALEB_EMAIL = "caleb.struewing@jll.com";
const MICHAEL_EMAIL = "mvizzone@tenantadvisors.com";
const NOW = new Date("2026-09-05T09:00:00.000Z");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encodeBody(text: string): string {
  return Buffer.from(text).toString("base64url");
}

function seedObserverTwoOfFour(): void {
  writeCreInboundObserverState({
    ...emptyCreInboundObserverState(),
    status: "RUNNING",
    historyCheckpointId: PREVIOUS_OBSERVER_CHECKPOINT,
    trackedConversationIds: [CALEB_CONVERSATION_ID, MICHAEL_CONVERSATION_ID],
    trackedThreadIds: [CALEB_PROVIDER_THREAD_ID, MICHAEL_PROVIDER_THREAD_ID],
    activatedAt: "2026-09-03T00:02:00.381Z",
  });
}

function seedChallengerCohort(): void {
  const state = emptyChallengerState(NOW);
  writeContextRichChallengerState({
    ...state,
    authorizationConsumed: true,
    nextState: "CRE_CONTEXT_RICH_CHALLENGER_OBSERVING",
    startedAt: "2026-09-05T07:43:09.929Z",
    updatedAt: "2026-09-05T07:50:10.631Z",
    providerWrites: 2,
    sends: [
      {
        prospectId: "prs_430e03049f84389d",
        name: "Brooks Murphy",
        email: BROOKS_EMAIL,
        personaSlot: "PRIMARY",
        variantId: "crc_v1_workflow_context",
        subject: "Tenant-rep lease comparison workflow",
        question: "When you take two competing proposals for a client, how does that comparison typically get done today?",
        wordCount: 83,
        attemptId: "att_1202dd62a5ead5d4",
        conversationId: BROOKS_CONVERSATION_ID,
        providerMessageId: BROOKS_THREAD,
        providerThreadId: BROOKS_THREAD,
        providerResult: "PROVIDER_ACCEPTED",
        deliveryState: "DELIVERY_UNKNOWN",
        strategy: "CONTEXT_RICH_CONSULTATIVE",
        version: "V1",
      },
      {
        prospectId: "prs_f500b3c99bc96ed7",
        name: "Annie Nicolau",
        email: ANNIE_EMAIL,
        personaSlot: "PRIMARY",
        variantId: "crc_v1_lease_economics",
        subject: "Rent steps, free rent, and NPV comparison",
        question: "When those terms differ across proposals, how are you handling the occupancy-cost or NPV math today?",
        wordCount: 77,
        attemptId: "att_f595709a86ab471d",
        conversationId: ANNIE_CONVERSATION_ID,
        providerMessageId: ANNIE_THREAD,
        providerThreadId: ANNIE_THREAD,
        providerResult: "PROVIDER_ACCEPTED",
        deliveryState: "DELIVERY_UNKNOWN",
        strategy: "CONTEXT_RICH_CONSULTATIVE",
        version: "V1",
      },
    ],
    tracked: [
      {
        prospectId: "prs_430e03049f84389d",
        name: "Brooks Murphy",
        email: BROOKS_EMAIL,
        conversationId: BROOKS_CONVERSATION_ID,
        threadId: BROOKS_THREAD,
      },
      {
        prospectId: "prs_f500b3c99bc96ed7",
        name: "Annie Nicolau",
        email: ANNIE_EMAIL,
        conversationId: ANNIE_CONVERSATION_ID,
        threadId: ANNIE_THREAD,
      },
    ],
  });
}

function threadFetch(input: {
  inbound?: Partial<Record<string, string>>;
  writes?: string[];
} = {}) {
  const inbound = input.inbound ?? {};
  return async (raw: RequestInfo | URL, init?: RequestInit) => {
    const url = String(raw);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("messages/send")) {
      input.writes?.push(`${method}:${url}`);
      const body = JSON.parse(String(init?.body ?? "{}")) as { threadId?: string };
      return json({ id: `msg_reply_${body.threadId}`, threadId: body.threadId });
    }
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return json({
        access_token: "access-token-test",
        scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
      });
    }
    if (url.includes("tokeninfo") || url.includes("userinfo")) {
      return json({ email: "infinitemediaresources@gmail.com", verified_email: true });
    }
    if (url.includes("/profile")) return json({ historyId: "14933910" });
    if (url.includes("/history?")) return json({ historyId: "14933910", history: [] });
    const threads: Record<string, string> = {
      [CALEB_PROVIDER_THREAD_ID]: CALEB_EMAIL,
      [MICHAEL_PROVIDER_THREAD_ID]: MICHAEL_EMAIL,
      [BROOKS_THREAD]: BROOKS_EMAIL,
      [ANNIE_THREAD]: ANNIE_EMAIL,
    };
    const threadId = Object.keys(threads).find((id) => url.includes(id));
    if (threadId) {
      const prospect = threads[threadId];
      const messages = [
        {
          id: threadId,
          threadId,
          snippet: "outreach",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: "infinitemediaresources@gmail.com" },
              { name: "To", value: prospect },
              { name: "Subject", value: "lease-scenario" },
            ],
            body: { data: encodeBody("outreach") },
          },
        },
      ];
      if (inbound[threadId]) {
        messages.push({
          id: `${threadId}_in`,
          threadId,
          snippet: inbound[threadId],
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: prospect },
              { name: "To", value: "infinitemediaresources@gmail.com" },
              { name: "Subject", value: "Re: lease-scenario" },
            ],
            body: { data: encodeBody(inbound[threadId]) },
          },
        });
      }
      return json({ id: threadId, messages });
    }
    return json({ error: { message: "unexpected" } }, 404);
  };
}

describe("CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    resetContextRichChallengerState();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    markInboundReadOnlyVerified();
    seedChallengerCohort();
    seedObserverTwoOfFour();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-not-secret-pattern");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
  });

  afterEach(() => {
    resetInboundCommunicationRuntime();
    resetContextRichChallengerState();
    vi.unstubAllEnvs();
  });

  it("registers the observation runtime and does not require founder approval", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreContextRichChallengerOutcomeObservationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_RUNTIME].missionType).toBe(
      CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
    );
    expect(registry.contracts[CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_RUNTIME].authorizationSemantics).toBe("NONE");
    expect(routineEmailRequiresFounderApproval()).toBe(false);
  });

  it("classifies inbound intents and extracts validation signals without forcing them", () => {
    expect(classifyReplyIntent({ text: "Can you send me more information?", sourceMessageId: "i1" }).intent).toBe(
      "REQUEST_MORE_INFORMATION",
    );
    expect(classifyReplyIntent({ text: "What's the price?", sourceMessageId: "i2" }).intent).toBe("PRICING_QUESTION");
    expect(classifyReplyIntent({ text: "Can we meet next week?", sourceMessageId: "i3" }).intent).toBe("MEETING_REQUEST");
    expect(classifyReplyIntent({ text: "Not interested.", sourceMessageId: "i4" }).intent).toBe("NOT_INTERESTED");
    expect(classifyReplyIntent({ text: "Please unsubscribe and do not email me.", sourceMessageId: "i5" }).intent).toBe(
      "OPT_OUT",
    );
    expect(classifyReplyIntent({ text: "I'm not the right person for this.", sourceMessageId: "i6" }).intent).toBe(
      "WRONG_PERSON",
    );
    expect(
      classifyReplyIntent({
        text: "Wrong person — try Jane Smith on our occupier team.",
        sourceMessageId: "i7",
      }).intent,
    ).toBe("REFERRAL_TO_OTHER_PERSON");
    expect(classifyReplyIntent({ text: "I am out of the office until Monday.", sourceMessageId: "i8" }).intent).toBe(
      "OUT_OF_OFFICE",
    );
    expect(
      classifyReplyIntent({
        text: "Mailer-Daemon delivery status notification user unknown 550 5.1.1",
        sourceMessageId: "i9",
      }).intent,
    ).toBe("BOUNCE");
    expect(
      classifyReplyIntent({
        text: "This is an automatic reply. Do not reply to this email.",
        sourceMessageId: "i10",
      }).intent,
    ).toBe("AUTOMATED_REPLY");
    const processSignals = inferValidationSignals({
      inboundText: "Today we use Excel to compare two proposals.",
      stage: "CURRENT_PROCESS",
    });
    expect(processSignals).toContain("CURRENT_PROCESS_DISCLOSURE");
    const frictionSignals = inferValidationSignals({
      inboundText: "Updating concessions is painful and keeps breaking.",
      stage: "FRICTION",
    });
    expect(frictionSignals).toContain("FRICTION_DISCLOSURE");
    const impactSignals = inferValidationSignals({
      inboundText: "So we lose time when clients wait.",
      stage: "IMPACT",
    });
    expect(impactSignals).toContain("IMPACT_DISCLOSURE");
    expect(
      inferConversationStage({
        current: "OPEN_CONTEXT",
        inboundText: "Today we use Excel to compare two proposals.",
        intent: "OTHER",
      }),
    ).toBe("CURRENT_PROCESS");
    expect(
      isQualifiedEngagement({
        intent: "OUT_OF_OFFICE",
        signals: [],
      }),
    ).toBe(false);
    expect(
      isQualifiedEngagement({
        intent: "REQUEST_MORE_INFORMATION",
        signals: [],
      }),
    ).toBe(true);
  });

  it("routes policy without blanket founder approval and does not contact referrals", () => {
    const meeting = classifyReplyIntent({ text: "Can we meet next week?", sourceMessageId: "p1" });
    expect(
      evaluateAutonomousCommunicationPolicy({
        classification: meeting,
        identityCertain: true,
        trackedThread: true,
      }).outcome,
    ).toBe("ROUTE_TO_GOVERNED_SYSTEM");
    const referral = classifyReplyIntent({
      text: "Wrong person — try Jane Smith on our occupier team.",
      sourceMessageId: "p2",
    });
    expect(
      evaluateAutonomousCommunicationPolicy({
        classification: referral,
        identityCertain: true,
        trackedThread: true,
      }).outcome,
    ).toBe("ROUTE_TO_GOVERNED_SYSTEM");
    const uncertain = classifyReplyIntent({ text: "Can you send me more information?", sourceMessageId: "p3" });
    expect(
      evaluateAutonomousCommunicationPolicy({
        classification: uncertain,
        identityCertain: false,
        trackedThread: true,
      }).outcome,
    ).toBe("PAUSE_EXCEPTION");
  });

  it("keeps small-sample discipline and does not declare a winner", () => {
    const empty = evaluateConsultativeOutreachOutcome({
      baseline: emptyOutcomeCounts(2),
      challenger: emptyOutcomeCounts(2),
    });
    expect(empty.evaluation).toBe("INSUFFICIENT_OUTCOME_EVIDENCE");
    expect(empty.statisticallyConclusive).toBe(false);
    const stronger = evaluateConsultativeOutreachOutcome({
      baseline: { ...emptyOutcomeCounts(2), humanReplies: 1 },
      challenger: { ...emptyOutcomeCounts(2), humanReplies: 1, qualifiedEngagement: 1, processDisclosures: 1 },
    });
    expect(stronger.evaluation).toBe("CHALLENGER_DIRECTIONALLY_STRONGER");
    expect(stronger.statisticallyConclusive).toBe(false);
    expect(stronger.evidence).not.toMatch(/significant|winning|proven|superior/i);
  });

  it("observes no new inbound, restores four tracked conversations, and preserves the experiment clock", async () => {
    const writes: string[] = [];
    const result = await executeCreContextRichChallengerOutcomeObservation({
      now: NOW,
      fetchImpl: threadFetch({ writes }),
    });
    expect(result.observingNoNewOutcome).toBe("OBSERVING_NO_NEW_OUTCOME");
    expect(result.inboundSince.total).toBe(0);
    expect(result.observer.tracked).toBe(4);
    expect(result.observer.mailboxHistoryReset).toBe(false);
    expect(result.observer.previousCheckpoint).toBe(PREVIOUS_OBSERVER_CHECKPOINT);
    expect(result.observer.currentCheckpoint).toBeTruthy();
    expect(result.observer.duplicateProcessing).toBe(0);
    expect(result.clock.restarted).toBe(false);
    expect(result.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(result.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(result.newColdOutreach).toBe(0);
    expect(writes).toHaveLength(0);
    expect(result.nextState).toBe("CRE_CONTEXT_RICH_CHALLENGER_OBSERVING");
    expect(result.wave2Started).toBe(false);
    expect(result.wave2Readiness).toBe("WAIT_FOR_MORE_CHALLENGER_OUTCOMES");
    expect(result.comparison.evaluation).toBe("INSUFFICIENT_OUTCOME_EVIDENCE");
    expect(result.comparison.statisticallyConclusive).toBe(false);
    expect(result.website.changed).toBe(false);
    expect(result.website.publiclyLaunched).toBe(false);
    expect(result.challengerCohort.members).toEqual(["Brooks Murphy", "Annie Nicolau"]);
    expect(result.challengerCohort.historicalMembers).toEqual(["Caleb Struewing", "Michael Vizzone"]);
    expect(inspectExperimentClock(NOW).restarted).toBe(false);
  });

  it("dedupes repeated inbound and does not treat OOO, bounce, or automated replies as qualified", async () => {
    const writes: string[] = [];
    const fetchImpl = threadFetch({
      inbound: {
        [MICHAEL_PROVIDER_THREAD_ID]: "I am out of the office until Monday.",
        [CALEB_PROVIDER_THREAD_ID]: "Mailer-Daemon delivery status notification user unknown 550 5.1.1",
        [ANNIE_THREAD]: "This is an automatic reply. Do not reply to this email.",
      },
      writes,
    });
    const first = await executeCreContextRichChallengerOutcomeObservation({ now: NOW, fetchImpl });
    expect(first.inboundSince.ooo).toBe(1);
    expect(first.inboundSince.bounces).toBe(1);
    expect(first.inboundSince.automated).toBe(1);
    expect(first.baseline.qualifiedEngagement).toBe(0);
    expect(first.challengerOutcomes.qualifiedEngagement).toBe(0);
    expect(first.comparison.evaluation).toBe("INSUFFICIENT_OUTCOME_EVIDENCE");
    const second = await executeCreContextRichChallengerOutcomeObservation({ now: NOW, fetchImpl });
    expect(second.observer.duplicateProcessing + second.cycle.processing.newInboundProcessed).toBeGreaterThanOrEqual(0);
    expect(second.inboundSince.total).toBe(first.inboundSince.total);
    expect(writes).toHaveLength(0);
  });

  it("captures opt-out suppression, wrong-person, and referral without contacting the referral", async () => {
    const writes: string[] = [];
    const result = await executeCreContextRichChallengerOutcomeObservation({
      now: NOW,
      fetchImpl: threadFetch({
        inbound: {
          [CALEB_PROVIDER_THREAD_ID]: "Please unsubscribe and do not email me.",
          [MICHAEL_PROVIDER_THREAD_ID]: "I'm not the right person for this.",
          [BROOKS_THREAD]: "Wrong person — try Jane Smith on our occupier team.",
        },
        writes,
      }),
    });
    expect(result.baseline.optOuts).toBe(1);
    expect(result.baseline.wrongPerson).toBe(1);
    expect(result.challengerOutcomes.referrals).toBe(1);
    expect(result.suppressionChanged).toBe(true);
    expect(inspectInboundRuntimeState().referrals.length).toBeGreaterThan(0);
    expect(writes.some((row) => /jane|smith/i.test(row))).toBe(false);
    expect(result.newColdOutreach).toBe(0);
    const brooks = result.details.find((row) => row.recipient === "Brooks Murphy");
    expect(brooks?.autonomousPolicyOutcome).toBe("ROUTE_TO_GOVERNED_SYSTEM");
    expect(brooks?.replySent).toBe(false);
  });

  it("separates baseline and challenger outcomes and does not send new cold outreach on challenger inbound", async () => {
    const writes: string[] = [];
    const result = await executeCreContextRichChallengerOutcomeObservation({
      now: NOW,
      fetchImpl: threadFetch({
        inbound: {
          [CALEB_PROVIDER_THREAD_ID]: "Can you send me more information?",
          [BROOKS_THREAD]: "Today we use Excel to compare two proposals.",
        },
        writes,
      }),
    });
    expect(result.baseline.humanReplies).toBe(1);
    expect(result.baseline.qualifiedEngagement).toBe(1);
    expect(result.challengerOutcomes.humanReplies).toBe(1);
    expect(result.challengerOutcomes.processDisclosures).toBe(1);
    expect(result.challengerOutcomes.qualifiedEngagement).toBe(1);
    expect(result.details.find((row) => row.recipient === "Caleb Struewing")?.strategy).toBe("CONSULTATIVE_DISCOVERY");
    expect(result.details.find((row) => row.recipient === "Brooks Murphy")?.strategy).toBe("CONTEXT_RICH_CONSULTATIVE");
    expect(result.details.find((row) => row.recipient === "Brooks Murphy")?.newStage).toBe("CURRENT_PROCESS");
    expect(result.comparison.evaluation).toBe("CHALLENGER_DIRECTIONALLY_STRONGER");
    expect(result.comparison.statisticallyConclusive).toBe(false);
    expect(result.nextState).toBe("CRE_CONTEXT_RICH_CHALLENGER_OBSERVING_WITH_EVIDENCE");
    expect(result.newColdOutreach).toBe(0);
    expect(writes.filter((row) => row.includes(BROOKS_THREAD) || row.includes(BROOKS_EMAIL))).toHaveLength(0);
    expect(result.wave2Started).toBe(false);
  });

  it("projects HQ work only during the observation cycle and leaves the observer running idle afterward", async () => {
    const writes: string[] = [];
    const result = await executeCreContextRichChallengerOutcomeObservationMission({
      now: NOW,
      fetchImpl: threadFetch({ writes }),
    });
    expect(result.hq.projection).toBe("PASS");
    expect(result.hq.command).toBe("ACTIVE_WORK");
    expect(result.hq.growthNexus).toBe("ACTIVE_WORK");
    expect(result.hq.signalIntelligence).toBe("ACTIVE_WORK");
    expect(result.hq.validationStation).toBe("ACTIVE_WORK");
    expect(result.hq.researchGrid).toBe("PRESENT_IDLE");
    expect(result.hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(result.hq.creationLab).toBe("PRESENT_IDLE");
    expect(result.hq.infinityDecisionCoreDuring).toBe("ACTIVE_WORK");
    expect(result.hq.after.active).toBe(0);
    expect(result.hq.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(result.hq.after.fakeContinuousActiveWork).toBe(false);
    expect(result.hq.observerIdleState).toBe("RUNNING");
    expect(inspectMailboxObserverHealth().status).toBe("RUNNING");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(writes).toHaveLength(0);
    expect(result.newColdOutreach).toBe(0);
  });
});
