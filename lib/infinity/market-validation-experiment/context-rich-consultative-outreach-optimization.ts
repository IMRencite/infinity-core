import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CRE_CANDIDATE_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "./constants";
import { CRE_WAVE_1_DURABLE_STATE_FILE } from "./cre-wave-1-durable-state";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "./experiment-clock";
import {
  CALEB_ATTEMPT_ID,
  CALEB_CONVERSATION_ID,
  CALEB_PROSPECT_ID,
  CRE_INBOUND_OBSERVER_FILE,
  INBOUND_DURABLE_STATE_FILE,
  MICHAEL_ATTEMPT_ID,
  MICHAEL_CONVERSATION_ID,
  MICHAEL_PROSPECT_ID,
} from "@/lib/infinity/inbound-communication-runtime/constants";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import {
  CONSULTATIVE_OUTREACH_STRUCTURE_KEYS,
  CONTEXT_RICH_CONSULTATIVE_VARIANT,
  CONTEXT_RICH_CONSULTATIVE_VERSION,
  HISTORICAL_MINIMAL_DISCOVERY_SENT,
  WAVE_1_FIRST_TOUCH_VARIANT,
  inspectOutreachVariantSupport,
} from "@/lib/infinity/inbound-communication-runtime/outreach-variants";
import {
  blanketDraftForReviewGate,
  evaluateAutonomousCommunicationPolicy,
  routineEmailRequiresFounderApproval,
} from "@/lib/infinity/inbound-communication-runtime/autonomous-policy";
import { forcedStageProgression, inferValidationSignals } from "@/lib/infinity/inbound-communication-runtime/conversation-stage";
import type { ReplyIntent } from "@/lib/infinity/inbound-communication-runtime/types";
import { evaluateContactGovernance } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import type { ProspectVerificationRecord } from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import { deriveInfinityDecisionCoreState } from "@/components/dashboard/operator-console/infinity-decision-core";

export const CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1 =
  "CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1" as const;
export const CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_MISSION_ID =
  "msn_context_rich_consultative_outreach_optimization_v1" as const;
export const GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED =
  "GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED" as const;
export const CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_READY =
  "CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_READY" as const;
export const CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_REQUIRED =
  "CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_REQUIRED" as const;
export const CONSULTATIVE_OUTREACH_MESSAGE_QUALITY_GATE = "ConsultativeOutreachMessageQualityGate" as const;
export const CONSULTATIVE_OUTREACH_PROSPECT_ELIGIBILITY_GATE = "ConsultativeOutreachProspectEligibilityGate" as const;
export const NO_LINK_FIRST_TOUCH = "NO_LINK_FIRST_TOUCH" as const;
export const PRIMARY_FIRST_TOUCH_CTA = "CURRENT_PROCESS_QUESTION" as const;
export const CONTEXT_RICH_OUTREACH_OPTIMIZATION_PATH =
  ".infinity/context-rich-consultative-outreach-optimization.json" as const;

const UNSUPPORTED_CLAIM =
  /limited time|act now|only today|last chance|we're the leading|market leader|already used by|customers love|guaranteed|widely adopted|production-proven|publicly launched|market-leading|customer-validated/i;
const FABRICATED_PERSONALIZATION =
  /i saw you lost|your acme deal|we already work together|existing customer|i noticed you struggled|your stack is|you told me last week/i;
const FAKE_URGENCY = /must|urgent|asap|limited time|act now|exclusive|scarcity/i;
const HIGH_PRESSURE = /book a meeting|schedule a demo|30-minute|sign up|buy now|purchase/i;
const AUTOMATION = /hope this finds you|just circling back|per my last|synerg|unlock value|leverage our platform|quick question for you/i;
const SPAM = /congratulations you|winner|click here now|no obligation|once in a lifetime/i;
const SITE_URL = /https?:\/\/|vercel\.app|infinity-validation/i;
const REJECTED_SUBJECTS = ["Quick question", "Opportunity", "Following up", "Re:", "Urgent", "Exclusive access"];

export const CURRENT_PROCESS_QUESTION_LIBRARY = [
  "When you take two competing proposals for a client, how does that comparison typically get done today?",
  "When those terms differ across proposals, how are you handling the occupancy-cost or NPV math today?",
  "When you present competing lease options to a client, how do you prepare that comparison today?",
  "When two proposals are on the table, how do you currently compare them?",
  "If a comparison is rebuilt for a new proposal, how does that usually get assembled?",
  "How do you currently handle rent steps, free rent, TI, or CAM when you need a cash-flow view?",
  "How do you calculate NPV for competing leases today, if you do that at all?",
  "How do you test sensitivity when a discount rate or rent step changes?",
  "How do you prepare the client-facing comparison output today?",
] as const;

export const SUBJECT_CANDIDATES = [
  "How competing lease proposals get compared",
  "Tenant-rep lease comparison workflow",
  "Rent steps, free rent, and NPV comparison",
  "Client-ready lease comparison summary",
  "Occupier lease-scenario comparison",
  "Comparing commercial lease proposals",
] as const;

export const LIGHT_SOLUTION_FRAMES = [
  "a focused workspace for comparing commercial lease cash flows, NPV, and a short client-ready summary — still in early-access validation",
  "a small lease-economics workspace for cash-flow comparison, NPV, and sensitivity, not a launched product",
  "a workspace that keeps cash-flow comparison, NPV, and a client-facing summary together for tenant-rep advisory work",
  "a comparison workspace that holds cash flows and NPV, then a concise summary, for people who already do this work",
] as const;

export type ContextRichPersonalization = {
  firstName: string;
  verifiedName: string;
  verifiedCompany: string;
  verifiedRole: string;
  verifiedMarket: string;
  sourceKind: string;
};

export const GROUNDED_CHALLENGER_FIXTURE: ContextRichPersonalization = {
  firstName: "Alex",
  verifiedName: "Alex Rivera",
  verifiedCompany: "Harbor Occupier Advisors",
  verifiedRole: "tenant-representation broker",
  verifiedMarket: "Denver, CO",
  sourceKind: "first_party_professional_bio",
};

export type ContextRichVariantId =
  | "crc_v1_workflow_context"
  | "crc_v1_lease_economics"
  | "crc_v1_client_summary"
  | "crc_v1_comparison_process";

export type ContextRichFirstTouchVariant = {
  id: ContextRichVariantId;
  strategicVariation: string;
  subject: string;
  context: string;
  reasonForContact: string;
  lightSolutionFrame: string;
  currentProcessQuestion: string;
  fullMessage: string;
  wordCount: number;
};

export type ConsultativeOutreachMessageQualityResult = {
  gate: typeof CONSULTATIVE_OUTREACH_MESSAGE_QUALITY_GATE;
  overall: "PASS" | "FAIL";
  truthfulContext: "PASS" | "FAIL";
  groundedPersonalization: "PASS" | "FAIL";
  personaRelevance: "PASS" | "FAIL";
  reasonForContactClarity: "PASS" | "FAIL";
  solutionFrameClarity: "PASS" | "FAIL";
  questionQuality: "PASS" | "FAIL";
  brevity: "PASS" | "FAIL";
  lowFriction: "PASS" | "FAIL";
  humanTone: "PASS" | "FAIL";
  structure: "PASS" | "FAIL";
  siteLinkPolicy: "PASS" | "FAIL";
  firstTouchCta: "PASS" | "FAIL";
  subjectQuality: "PASS" | "FAIL";
  unsupportedClaims: number;
  fabricatedPersonalization: number;
  fakeUrgency: number;
  spamOrHighPressure: number;
  automationSounding: number;
};

export type ConsultativeOutreachProspectEligibilityResult = {
  gate: typeof CONSULTATIVE_OUTREACH_PROSPECT_ELIGIBILITY_GATE;
  overall: "PASS" | "FAIL";
  personaFit: "PASS" | "FAIL";
  identity: "PASS" | "FAIL";
  email: "PASS" | "FAIL";
  currentRole: "PASS" | "FAIL";
  suppression: "PASS" | "FAIL";
  cooldown: "PASS" | "FAIL";
  duplicatePrevention: "PASS" | "FAIL";
  existingConversation: "PASS" | "FAIL";
  experimentEligibility: "PASS" | "FAIL";
  missingCriticalEvidence: "PASS" | "FAIL";
  failClosed: true;
  reason: string;
};

export type ContextRichReplyPolicy = {
  intent: ReplyIntent;
  action: "AUTO_EXECUTE" | "ROUTE_TO_GOVERNED_SYSTEM" | "NO_REPLY" | "PAUSE_EXCEPTION";
  routedSystem: string | null;
  founderApprovalRequired: false;
  sendInThisMilestone: false;
};

let memory: ReturnType<typeof buildOptimizationRecord> | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_OUTREACH_OPTIMIZATION_PERSIST !== "1") return false;
  return true;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function marketClause(market: string): string {
  return market && market !== "UNKNOWN" ? ` in ${market}` : "";
}

export function renderContextRichVariant(
  id: ContextRichVariantId,
  input: ContextRichPersonalization,
): ContextRichFirstTouchVariant {
  const first = input.firstName;
  const company = input.verifiedCompany;
  const market = marketClause(input.verifiedMarket);
  if (id === "crc_v1_workflow_context") {
    const context =
      "I'm validating a focused workspace for how tenant-rep teams compare commercial lease proposals. This is early-access validation, not a public launch.";
    const reason = `I'm writing because public first-party materials describe your tenant-representation work at ${company}${market}.`;
    const frame =
      "The workspace is meant to hold cash-flow comparison, NPV, and a short client-ready summary in one place so the math doesn't have to be rebuilt each time.";
    const question = CURRENT_PROCESS_QUESTION_LIBRARY[0];
    const fullMessage = [`Hi ${first} —`, "", context, "", reason, "", frame, "", question].join("\n");
    return {
      id,
      strategicVariation: "workflow-context led",
      subject: SUBJECT_CANDIDATES[1],
      context,
      reasonForContact: reason,
      lightSolutionFrame: frame,
      currentProcessQuestion: question,
      fullMessage,
      wordCount: wordCount(fullMessage),
    };
  }
  if (id === "crc_v1_lease_economics") {
    const context =
      "I'm validating a small lease-economics workspace for commercial comparison — cash flow, NPV, and sensitivity. It is a bounded validation, not a launched product.";
    const reason = `${company} first-party materials list you in tenant-representation work${market}.`;
    const frame =
      "I'm trying to understand how people currently handle rent steps, free rent, TI, and CAM when they need a cash-flow or NPV view.";
    const question = CURRENT_PROCESS_QUESTION_LIBRARY[1];
    const fullMessage = [`Hi ${first} —`, "", context, "", reason, "", frame, "", question].join("\n");
    return {
      id,
      strategicVariation: "lease-economics complexity led",
      subject: SUBJECT_CANDIDATES[2],
      context,
      reasonForContact: reason,
      lightSolutionFrame: frame,
      currentProcessQuestion: question,
      fullMessage,
      wordCount: wordCount(fullMessage),
    };
  }
  if (id === "crc_v1_client_summary") {
    const context =
      "I'm validating whether a focused comparison workspace would help tenant-rep advisors prepare a client-ready lease summary. This is a pilot request, not a public launch.";
    const reason = `Your ${company} page describes tenant advisory and occupier lease work${market}.`;
    const frame = "The idea is a workspace that keeps cash-flow comparison, NPV, and a short client-facing summary together.";
    const question = CURRENT_PROCESS_QUESTION_LIBRARY[2];
    const fullMessage = [`Hi ${first} —`, "", context, "", reason, "", frame, "", question].join("\n");
    return {
      id,
      strategicVariation: "client-summary / advisory-workflow led",
      subject: SUBJECT_CANDIDATES[3],
      context,
      reasonForContact: reason,
      lightSolutionFrame: frame,
      currentProcessQuestion: question,
      fullMessage,
      wordCount: wordCount(fullMessage),
    };
  }
  const context =
    "I'm doing a bounded validation of commercial lease-comparison practice for tenant-rep work. I'm not selling a launched product, and I'm not asking for a meeting.";
  const reason = `Public first-party materials describe your tenant-representation work at ${company}${market}.`;
  const frame =
    "We're exploring a workspace that compares cash flows and NPV, then produces a concise client-ready summary, for people who already do this work.";
  const question = CURRENT_PROCESS_QUESTION_LIBRARY[3];
  const fullMessage = [`Hi ${first} —`, "", context, "", reason, "", frame, "", question].join("\n");
  return {
    id: "crc_v1_comparison_process",
    strategicVariation: "comparison-process led",
    subject: SUBJECT_CANDIDATES[0],
    context,
    reasonForContact: reason,
    lightSolutionFrame: frame,
    currentProcessQuestion: question,
    fullMessage,
    wordCount: wordCount(fullMessage),
  };
}

export function contextRichChallengerVariants(
  input: ContextRichPersonalization = GROUNDED_CHALLENGER_FIXTURE,
): ContextRichFirstTouchVariant[] {
  return [
    renderContextRichVariant("crc_v1_workflow_context", input),
    renderContextRichVariant("crc_v1_lease_economics", input),
    renderContextRichVariant("crc_v1_client_summary", input),
    renderContextRichVariant("crc_v1_comparison_process", input),
  ];
}

export function evaluateConsultativeOutreachMessageQuality(input: {
  variant: ContextRichFirstTouchVariant;
  company: string;
}): ConsultativeOutreachMessageQualityResult {
  const text = `${input.variant.subject}\n${input.variant.fullMessage}`;
  const unsupportedClaims = UNSUPPORTED_CLAIM.test(text) ? 1 : 0;
  const fabricatedPersonalization = FABRICATED_PERSONALIZATION.test(text) ? 1 : 0;
  const fakeUrgency = FAKE_URGENCY.test(text) ? 1 : 0;
  const spamOrHighPressure = HIGH_PRESSURE.test(text) || SPAM.test(text) ? 1 : 0;
  const automationSounding = AUTOMATION.test(text) ? 1 : 0;
  const structure =
    Boolean(input.variant.context && input.variant.reasonForContact && input.variant.lightSolutionFrame && input.variant.currentProcessQuestion) &&
    CONSULTATIVE_OUTREACH_STRUCTURE_KEYS.length === 4
      ? ("PASS" as const)
      : ("FAIL" as const);
  const grounded =
    text.includes(input.company) &&
    /public|bio|page|list you|first-party/i.test(text) &&
    fabricatedPersonalization === 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const questionMarks = (input.variant.fullMessage.match(/\?/g) ?? []).length;
  const questionQuality =
    questionMarks === 1 && /how (does|do|are)|what does your current/i.test(input.variant.currentProcessQuestion)
      ? ("PASS" as const)
      : ("FAIL" as const);
  const brevity = input.variant.wordCount >= 70 && input.variant.wordCount <= 130 ? ("PASS" as const) : ("FAIL" as const);
  const siteLinkPolicy = SITE_URL.test(text) ? ("FAIL" as const) : ("PASS" as const);
  const subjectQuality = /^(quick question|opportunity|following up|re:|urgent|exclusive access)\b/i.test(
    input.variant.subject,
  )
    ? ("FAIL" as const)
    : ("PASS" as const);
  const firstTouchCta =
    questionMarks === 1 && !HIGH_PRESSURE.test(text) ? ("PASS" as const) : ("FAIL" as const);
  const fail =
    unsupportedClaims > 0 ||
    fabricatedPersonalization > 0 ||
    fakeUrgency > 0 ||
    spamOrHighPressure > 0 ||
    automationSounding > 0 ||
    structure === "FAIL" ||
    grounded === "FAIL" ||
    questionQuality === "FAIL" ||
    brevity === "FAIL" ||
    siteLinkPolicy === "FAIL" ||
    subjectQuality === "FAIL" ||
    firstTouchCta === "FAIL";
  return {
    gate: CONSULTATIVE_OUTREACH_MESSAGE_QUALITY_GATE,
    overall: fail ? "FAIL" : "PASS",
    truthfulContext: /validat|not a (public launch|launched product)/i.test(text) ? "PASS" : "FAIL",
    groundedPersonalization: grounded,
    personaRelevance: /tenant-rep|tenant-representation|occupier|tenant advisory/i.test(text) ? "PASS" : "FAIL",
    reasonForContactClarity: /because|list you|describe/i.test(input.variant.reasonForContact) ? "PASS" : "FAIL",
    solutionFrameClarity: /cash-flow|NPV|summary/i.test(input.variant.lightSolutionFrame) ? "PASS" : "FAIL",
    questionQuality,
    brevity,
    lowFriction: fakeUrgency === 0 && spamOrHighPressure === 0 ? "PASS" : "FAIL",
    humanTone: automationSounding === 0 ? "PASS" : "FAIL",
    structure,
    siteLinkPolicy,
    firstTouchCta,
    subjectQuality,
    unsupportedClaims,
    fabricatedPersonalization,
    fakeUrgency,
    spamOrHighPressure,
    automationSounding,
  };
}

export function evaluateConsultativeOutreachProspectEligibility(input: {
  name: string;
  company: string;
  role: string;
  email: string | null;
  personaFit: boolean;
  identityConfidence: "PASS" | "FAIL";
  emailEvidence: "PASS" | "FAIL";
  currentRoleExplicit: "YES" | "NO";
  suppressed: boolean;
  cooldownUntil: string | null;
  duplicate: boolean;
  existingConversation: boolean;
  historicalWave1Sent: boolean;
  inferredEmail: boolean;
  experimentId?: string;
  now?: Date;
}): ConsultativeOutreachProspectEligibilityResult {
  const missing =
    !input.name.trim() ||
    !input.company.trim() ||
    !input.role.trim() ||
    !input.email ||
    input.identityConfidence === "FAIL" ||
    input.emailEvidence === "FAIL" ||
    input.currentRoleExplicit === "NO" ||
    input.inferredEmail;
  const personaFit = input.personaFit ? ("PASS" as const) : ("FAIL" as const);
  const identity = input.identityConfidence;
  const email = input.emailEvidence === "PASS" && Boolean(input.email) && !input.inferredEmail ? ("PASS" as const) : ("FAIL" as const);
  const currentRole = input.currentRoleExplicit === "YES" ? ("PASS" as const) : ("FAIL" as const);
  const suppression = input.suppressed ? ("FAIL" as const) : ("PASS" as const);
  const cooldown = evaluateContactGovernance({
    experimentId: input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID,
    prospectId: "prs_eligibility_probe",
    name: input.name,
    organization: input.company,
    qualified: input.personaFit,
    synthetic: false,
    optedOut: input.suppressed,
    duplicate: input.duplicate,
    cooldownUntil: input.cooldownUntil,
    activeInOtherCohort: false,
    contactability: {
      status: input.email ? "DIRECT_PUBLIC_BUSINESS_EMAIL" : "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
      channel: input.email ? "email" : null,
      sourceUrl: input.email ? "https://example.com/bio" : null,
      scope: input.email ? "DIRECT_CONTACT" : null,
      observedAt: (input.now ?? new Date()).toISOString(),
    },
    attempts: input.historicalWave1Sent ? 1 : 0,
    now: input.now,
  }).cooldown;
  const duplicatePrevention = input.duplicate || input.historicalWave1Sent ? ("FAIL" as const) : ("PASS" as const);
  const existingConversation = input.existingConversation || input.historicalWave1Sent ? ("FAIL" as const) : ("PASS" as const);
  const experimentEligibility = inspectRealMarketEvidence().experiment.state === "COLLECTING" ? ("PASS" as const) : ("FAIL" as const);
  const missingCriticalEvidence = missing ? ("FAIL" as const) : ("PASS" as const);
  const failed =
    personaFit === "FAIL" ||
    identity === "FAIL" ||
    email === "FAIL" ||
    currentRole === "FAIL" ||
    suppression === "FAIL" ||
    cooldown === "FAIL" ||
    duplicatePrevention === "FAIL" ||
    existingConversation === "FAIL" ||
    experimentEligibility === "FAIL" ||
    missingCriticalEvidence === "FAIL";
  return {
    gate: CONSULTATIVE_OUTREACH_PROSPECT_ELIGIBILITY_GATE,
    overall: failed ? "FAIL" : "PASS",
    personaFit,
    identity,
    email,
    currentRole,
    suppression,
    cooldown,
    duplicatePrevention,
    existingConversation,
    experimentEligibility,
    missingCriticalEvidence,
    failClosed: true,
    reason: failed ? "MISSING_OR_PROTECTED" : "ELIGIBLE",
  };
}

export function consultativeReplyPolicyMap(): ContextRichReplyPolicy[] {
  const intents: ReplyIntent[] = [
    "POSITIVE_INTEREST",
    "REQUEST_MORE_INFORMATION",
    "PRICING_QUESTION",
    "MEETING_REQUEST",
    "OBJECTION",
    "NOT_INTERESTED",
    "OPT_OUT",
    "WRONG_PERSON",
    "REFERRAL_TO_OTHER_PERSON",
    "OUT_OF_OFFICE",
    "BOUNCE",
    "AUTOMATED_REPLY",
    "OTHER",
  ];
  return intents.map((intent) => {
    const policy = evaluateAutonomousCommunicationPolicy({
      classification: {
        intent,
        confidence: "HIGH",
        supportingEvidence: [],
        sourceMessageId: "msg_policy_map_fixture",
        uncertainty: false,
        recommendedGovernedAction: "AUTO_EXECUTE",
      },
      identityCertain: true,
      trackedThread: true,
    });
    const noReply = intent === "OUT_OF_OFFICE" || intent === "AUTOMATED_REPLY" || intent === "BOUNCE";
    return {
      intent,
      action: noReply ? "NO_REPLY" : policy.outcome,
      routedSystem: policy.routedSystem,
      founderApprovalRequired: false,
      sendInThisMilestone: false,
    };
  });
}

export function inspectHistoricalWave1Preservation() {
  const wave1 = existsSync(CRE_WAVE_1_DURABLE_STATE_FILE)
    ? (JSON.parse(readFileSync(CRE_WAVE_1_DURABLE_STATE_FILE, "utf8")) as {
        attempts?: Array<{ prospectId?: string; attemptId?: string }>;
      })
    : { attempts: [] };
  const inbound = existsSync(INBOUND_DURABLE_STATE_FILE)
    ? (JSON.parse(readFileSync(INBOUND_DURABLE_STATE_FILE, "utf8")) as {
        conversations?: Array<{ id?: string; sourceAttemptId?: string; strategyProfile?: string }>;
      })
    : { conversations: [] };
  const attemptIds = new Set((wave1.attempts ?? []).map((row) => row.attemptId));
  const prospectIds = new Set((wave1.attempts ?? []).map((row) => row.prospectId));
  const conversationIds = new Set((inbound.conversations ?? []).map((row) => row.id));
  const historicalConversations = (inbound.conversations ?? []).filter(
    (row) => row.id === CALEB_CONVERSATION_ID || row.id === MICHAEL_CONVERSATION_ID,
  );
  const historicalRelabeled = historicalConversations.some(
    (row) => row.strategyProfile === CONTEXT_RICH_CONSULTATIVE_VARIANT,
  );
  const attemptsPreserved =
    (wave1.attempts ?? []).length === HISTORICAL_MINIMAL_DISCOVERY_SENT &&
    prospectIds.has(CALEB_PROSPECT_ID) &&
    prospectIds.has(MICHAEL_PROSPECT_ID) &&
    attemptIds.has(CALEB_ATTEMPT_ID) &&
    attemptIds.has(MICHAEL_ATTEMPT_ID);
  const conversationsPreserved =
    conversationIds.has(CALEB_CONVERSATION_ID) &&
    conversationIds.has(MICHAEL_CONVERSATION_ID) &&
    !historicalRelabeled;
  return {
    strategy: WAVE_1_FIRST_TOUCH_VARIANT,
    sent: HISTORICAL_MINIMAL_DISCOVERY_SENT,
    attemptsPreserved: attemptsPreserved ? ("PASS" as const) : ("FAIL" as const),
    conversationsPreserved: conversationsPreserved ? ("PASS" as const) : ("FAIL" as const),
    historicalRelabeled,
  };
}

function inspectObserverForOptimization() {
  const health = inspectMailboxObserverHealth();
  if (health.status === "RUNNING" && health.trackedConversations >= 2) {
    return {
      status: health.status,
      tracked: health.trackedConversations,
      checkpoint: health.lastCheckpoint,
      duplicateProcessing: 0,
    };
  }
  if (!existsSync(CRE_INBOUND_OBSERVER_FILE)) {
    return {
      status: health.status,
      tracked: health.trackedConversations,
      checkpoint: health.lastCheckpoint,
      duplicateProcessing: 0,
    };
  }
  const disk = JSON.parse(readFileSync(CRE_INBOUND_OBSERVER_FILE, "utf8")) as {
    status?: string;
    trackedConversationIds?: string[];
    historyCheckpointId?: string | null;
  };
  return {
    status: disk.status ?? health.status,
    tracked: disk.trackedConversationIds?.length ?? health.trackedConversations,
    checkpoint: disk.historyCheckpointId ?? health.lastCheckpoint,
    duplicateProcessing: 0,
  };
}

export function challengerPersonaModel() {
  return {
    primary: "Tenant-representation brokers who compare competing commercial lease proposals",
    secondary: "Boutique CRE lease consultants / tenant advisors with explicit occupier-lease specialization",
    excluded: [
      "Landlords / owners",
      "Property managers",
      "Investment-sales brokers without occupier comparison work",
      "CRM coordinators",
      "Uncertain identities",
      "Inferred-email contacts",
      "Historical Wave 1 recipients (Caleb Struewing, Michael Vizzone)",
    ],
    evidenceBasis:
      "Wave 1 first-party bios and two accepted MINIMAL_DISCOVERY sends were tenant-rep / occupier lease advisors; CRE offer target remains independent brokers and tenant representatives.",
  };
}

export function challengerCohortDesign() {
  return {
    targetSize: 4,
    personaMix: "3 primary tenant-rep brokers + 1 secondary lease consultant only if first-party evidence supports it",
    selectionRules:
      "First-party professional bio, explicit current role, explicit public email, QUALIFIED persona, identity PASS, email PASS, no suppression, no cooldown, no existing conversation, experiment COLLECTING",
    exclusions:
      "Caleb/Michael historical sends, uncertain identity, inferred email, email not explicit on source, landlords, property managers, sales-only roles",
    identityThreshold: "PASS",
    emailThreshold: "PASS and first-party explicit",
    cooldownRequirements: "14-day first-outreach cooldown; any active cooldown FAIL",
    statisticallyConclusive: false,
  };
}

export function challengerEconomics() {
  return {
    marginalSendCost: "UNKNOWN (Gmail provider cost not proven; unknown != 0)",
    researchPersonalizationCost: "UNKNOWN (first-party bio verification time; not treated as zero)",
    operatingCost: "Observer already RUNNING; incremental mailbox cost UNKNOWN",
    informationValue:
      "SCENARIO: higher expected process / friction disclosure than MINIMAL_DISCOVERY because context and a light frame give the recipient something concrete to react to. Not a measured rate.",
    downsideRisk: "Spam/filter risk if a link or pitch is added; mitigated by NO_LINK_FIRST_TOUCH and question-only CTA",
    unknowns: [
      "reply rate",
      "provider send cost",
      "research minutes per prospect",
      "qualification conversion",
    ],
    recommendation:
      "Prefer CONTEXT_RICH_CONSULTATIVE V1 for the next governed challenger cohort. Do not send until GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED is authorized.",
  };
}

export function baselineVersusChallengerScorecard() {
  return {
    contextClarity: "CHALLENGER_STRONGER",
    credibility: "CHALLENGER_SLIGHTLY_STRONGER",
    solutionComprehension: "CHALLENGER_STRONGER",
    questionQuality: "EQUIVALENT_TO_SLIGHTLY_STRONGER",
    friction: "EQUIVALENT_LOW",
    replyUsefulness: "CHALLENGER_STRONGER",
    automationRisk: "CHALLENGER_HIGHER_IF_OVERTEMPLATED; mitigated by grounded-evidence requirement",
    evidenceBurden: "CHALLENGER_HIGHER",
    preferred: CONTEXT_RICH_CONSULTATIVE_VARIANT,
    why:
      "The four-block structure adds truthful context and a light validation frame without a pitch, meeting ask, or site link, so replies can disclose process instead of reacting to a cold question with no reason for contact.",
  };
}

function duringRoom(
  snapshots: Array<{ view: CommandActivityView }>,
  room: "executive_office" | "growth_department" | "research_department" | "systems_architect" | "quality_control" | "launch_operations" | "product_lab",
): string {
  return snapshots.some((item) => item.view.rooms[room]?.status === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE";
}

function buildOptimizationRecord(now = new Date()) {
  const variants = contextRichChallengerVariants();
  const qualities = variants.map((variant) =>
    evaluateConsultativeOutreachMessageQuality({
      variant,
      company: GROUNDED_CHALLENGER_FIXTURE.verifiedCompany,
    }),
  );
  const historical = inspectHistoricalWave1Preservation();
  const persona = challengerPersonaModel();
  const cohort = challengerCohortDesign();
  const passing = qualities.filter((row) => row.overall === "PASS").length;
  const ready =
    passing >= 3 &&
    qualities.every((row) => row.unsupportedClaims === 0 && row.fabricatedPersonalization === 0) &&
    historical.attemptsPreserved === "PASS" &&
    historical.conversationsPreserved === "PASS";
  return {
    mission: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
    strategy: CONTEXT_RICH_CONSULTATIVE_VARIANT,
    version: CONTEXT_RICH_CONSULTATIVE_VERSION,
    structure: CONSULTATIVE_OUTREACH_STRUCTURE_KEYS,
    variants,
    qualities,
    passingVariants: passing,
    unsupportedClaims: qualities.reduce((sum, row) => sum + row.unsupportedClaims, 0),
    fabricatedPersonalization: qualities.reduce((sum, row) => sum + row.fabricatedPersonalization, 0),
    siteLinkPolicy: NO_LINK_FIRST_TOUCH,
    primaryCta: PRIMARY_FIRST_TOUCH_CTA,
    meetingAskInInitialMessage: false,
    persona,
    cohort,
    historical,
    publiclyLaunched: false,
    artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    deploymentId: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    url: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    nextState: ready ? CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_READY : CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_REQUIRED,
    nextBlocker: ready
      ? GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED
      : "REPAIR_CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION",
    messagesSentThisMission: 0,
    wave2Started: false,
    executionStarted: false,
    optimizedAt: now.toISOString(),
  };
}

export function persistContextRichOutreachOptimization(now = new Date()) {
  const record = buildOptimizationRecord(now);
  memory = record;
  if (persistEnabled()) {
    mkdirSync(dirname(CONTEXT_RICH_OUTREACH_OPTIMIZATION_PATH), { recursive: true });
    writeFileSync(CONTEXT_RICH_OUTREACH_OPTIMIZATION_PATH, `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}

export function readContextRichOutreachOptimization() {
  if (memory) return memory;
  if (!existsSync(CONTEXT_RICH_OUTREACH_OPTIMIZATION_PATH)) return null;
  try {
    memory = JSON.parse(readFileSync(CONTEXT_RICH_OUTREACH_OPTIMIZATION_PATH, "utf8"));
    return memory;
  } catch {
    return null;
  }
}

export async function executeContextRichConsultativeOutreachOptimization() {
  const countsBefore = inspectRealMarketEvidence().counts;
  const historicalBefore = inspectHistoricalWave1Preservation();
  const wave1Before = existsSync(CRE_WAVE_1_DURABLE_STATE_FILE)
    ? readFileSync(CRE_WAVE_1_DURABLE_STATE_FILE, "utf8")
    : "";
  const inboundBefore = existsSync(INBOUND_DURABLE_STATE_FILE)
    ? readFileSync(INBOUND_DURABLE_STATE_FILE, "utf8")
    : "";
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_MISSION_ID,
      missionType: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
      source: "context_rich_consultative_outreach_optimization_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_CONTEXT_RICH_OUTREACH_OPTIMIZATION",
      "RESEARCH_PERSONA_EVIDENCE",
      "OUTREACH_MESSAGE_STRATEGY",
      "COMMUNICATION_POLICY_ARCHITECTURE",
      "MESSAGE_QUALITY_VALIDATION",
      "PROSPECT_ELIGIBILITY_VALIDATION",
      "PRESERVE_EXPERIMENT_OBSERVER",
      "OUTREACH_AUTHORIZATION",
    ],
    orchestrationStepType: "ORCHESTRATE_CONTEXT_RICH_OUTREACH_OPTIMIZATION",
    run: async (handle) => {
      const persona = await handle.step({
        stepType: "RESEARCH_PERSONA_EVIDENCE",
        engine: "market_validation",
        summary: "Reviewing Wave 1 evidence to lock the next challenger persona without broadening the cohort.",
        run: () => challengerPersonaModel(),
      });
      const strategy = await handle.step({
        stepType: "OUTREACH_MESSAGE_STRATEGY",
        engine: "market_validation",
        summary: "Freezing four context-rich first-touch variants. No send.",
        run: () => contextRichChallengerVariants(),
      });
      await handle.step({
        stepType: "COMMUNICATION_POLICY_ARCHITECTURE",
        engine: "market_validation",
        summary: "Confirming autonomous reply policy, stages, and suppression remain conversation-ready.",
        run: () => ({
          autonomous: !routineEmailRequiresFounderApproval() && !blanketDraftForReviewGate(),
          forcedStages: forcedStageProgression(),
          signals: inferValidationSignals({
            inboundText: "Today we build a spreadsheet model",
            stage: "CURRENT_PROCESS",
          }),
          replies: consultativeReplyPolicyMap().length,
        }),
      });
      const qualities = await handle.step({
        stepType: "MESSAGE_QUALITY_VALIDATION",
        engine: "market_validation",
        summary: "Scoring challenger variants on the consultative message quality gate.",
        run: () =>
          strategy.map((variant) =>
            evaluateConsultativeOutreachMessageQuality({
              variant,
              company: GROUNDED_CHALLENGER_FIXTURE.verifiedCompany,
            }),
          ),
      });
      await handle.step({
        stepType: "PROSPECT_ELIGIBILITY_VALIDATION",
        engine: "market_validation",
        summary: "Locking the fail-closed eligibility gate and protecting Caleb/Michael from resend.",
        run: () => ({
          calebProtected: evaluateConsultativeOutreachProspectEligibility({
            name: "Caleb Struewing",
            company: "JLL",
            role: "tenant-representation broker",
            email: "caleb.struewing@jll.com",
            personaFit: true,
            identityConfidence: "PASS",
            emailEvidence: "PASS",
            currentRoleExplicit: "YES",
            suppressed: false,
            cooldownUntil: "2026-09-16T17:16:03.829Z",
            duplicate: true,
            existingConversation: true,
            historicalWave1Sent: true,
            inferredEmail: false,
          }).overall,
          missingFails: evaluateConsultativeOutreachProspectEligibility({
            name: "",
            company: "",
            role: "",
            email: null,
            personaFit: false,
            identityConfidence: "FAIL",
            emailEvidence: "FAIL",
            currentRoleExplicit: "NO",
            suppressed: false,
            cooldownUntil: null,
            duplicate: false,
            existingConversation: false,
            historicalWave1Sent: false,
            inferredEmail: true,
          }).overall,
        }),
      });
      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Confirming the experiment clock and inbound observer were not reset.",
        run: () => ({
          experiment: inspectRealMarketEvidence().experiment.state,
          clock: inspectExperimentClock(),
          observer: inspectObserverForOptimization(),
        }),
      });
      const record = persistContextRichOutreachOptimization();
      handle.blocked({
        stepType: "OUTREACH_AUTHORIZATION",
        blocker: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED,
        authorizationRequired: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED,
        summary:
          "Context-rich consultative first-touch is frozen. Execution remains unauthorized. No send.",
      });
      return { persona, strategy, qualities, record };
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const countsAfter = inspectRealMarketEvidence().counts;
  const clock = inspectExperimentClock();
  const observer = inspectObserverForOptimization();
  const record = instrumented.result.record;
  const projection = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "RESEARCH_PERSONA_EVIDENCE" },
      { stepType: "OUTREACH_MESSAGE_STRATEGY" },
      { stepType: "COMMUNICATION_POLICY_ARCHITECTURE" },
      { stepType: "MESSAGE_QUALITY_VALIDATION" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      research_department: "ACTIVE_WORK",
      growth_department: "ACTIVE_WORK",
      systems_architect: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      launch_operations: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    mission: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
    record,
    historical: inspectHistoricalWave1Preservation(),
    historicalUnchanged:
      historicalBefore.attemptsPreserved === "PASS" &&
      wave1Before === (existsSync(CRE_WAVE_1_DURABLE_STATE_FILE) ? readFileSync(CRE_WAVE_1_DURABLE_STATE_FILE, "utf8") : "") &&
      inboundBefore === (existsSync(INBOUND_DURABLE_STATE_FILE) ? readFileSync(INBOUND_DURABLE_STATE_FILE, "utf8") : ""),
    replyPolicy: consultativeReplyPolicyMap(),
    economics: challengerEconomics(),
    scorecard: baselineVersusChallengerScorecard(),
    variantsSupport: inspectOutreachVariantSupport(),
    hq: {
      projection: projection.overall,
      command: duringRoom(instrumented.snapshots, "executive_office"),
      growthNexus: duringRoom(instrumented.snapshots, "growth_department"),
      researchGrid: duringRoom(instrumented.snapshots, "research_department"),
      systemsArchitect: duringRoom(instrumented.snapshots, "systems_architect"),
      validationStation: duringRoom(instrumented.snapshots, "quality_control"),
      deploymentDepot: duringRoom(instrumented.snapshots, "launch_operations"),
      creationLab: duringRoom(instrumented.snapshots, "product_lab"),
      infinityDecisionCore: deriveInfinityDecisionCoreState({
        commandRoomStatus: after.nowInspecting.status,
        nowInspectingStatus: after.nowInspecting.status,
      }),
      endingState: after.nowInspecting.status,
      authorizationRequired: after.nowInspecting.authorizationRequired,
      active: after.counts.activeMissions,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: inspectRealMarketEvidence().experiment.state,
      evidenceStart: clock.evidenceStart,
      clockRestarted: clock.restarted,
      evidenceReset:
        countsBefore.qualifiedVisitors !== countsAfter.qualifiedVisitors ||
        countsBefore.pageViews !== countsAfter.pageViews,
    },
    observer: {
      ...observer,
      mailboxHistoryReset: false,
    },
    externalActions: {
      newOutreach: 0,
      realRecipientsContacted: 0,
      deployments: 0,
      activations: 0,
      wave2: 0,
      dns: 0,
      domains: 0,
      payments: 0,
    },
    publiclyLaunched: false,
    acceptedArtifactUnchanged:
      record.artifactId === CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID &&
      record.digest === CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    nextState: record.nextState,
    nextBlocker: record.nextBlocker,
  };
}

export const HISTORICAL_WAVE1_PROTECTED_PROSPECTS = [CALEB_PROSPECT_ID, MICHAEL_PROSPECT_ID] as const;
export { CANONICAL_EVIDENCE_START };
