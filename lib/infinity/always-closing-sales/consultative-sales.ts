import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "@/lib/infinity/production-outbound/email-signature";
import type { CommercialAction, SalesStagePolicy } from "./doctrine";

export const CONSULTATIVE_SALES_PROGRESSION = [
  "CLARIFY",
  "PROBLEM",
  "CONSEQUENCE",
  "DESIRED_OUTCOME",
  "SOLUTION",
  "OFFER",
  "COMMITMENT_QUESTION",
] as const;

export type ConsultativeSalesStep = (typeof CONSULTATIVE_SALES_PROGRESSION)[number];
export type ConsultativeQuestionType = "SITUATION" | "PROBLEM" | "CONSEQUENCE" | "DESIRED_OUTCOME" | "DECISION" | "COMMITMENT";

export type ConsultativeSalesConversationPolicy = {
  policy: "ConsultativeSalesConversationPolicy";
  stage: SalesStagePolicy;
  steps: ConsultativeSalesStep[];
  max_questions: 1 | 2;
  restart_discovery: boolean;
};

export function consultativeSalesConversationPolicy(stage: SalesStagePolicy, turn = 1): ConsultativeSalesConversationPolicy {
  if (stage === "HIGH_INTENT" || turn >= 5) {
    return { policy: "ConsultativeSalesConversationPolicy", stage, steps: ["SOLUTION", "OFFER"], max_questions: 1, restart_discovery: false };
  }
  if (stage === "QUALIFIED") {
    return { policy: "ConsultativeSalesConversationPolicy", stage, steps: ["PROBLEM", "CONSEQUENCE", "SOLUTION", "OFFER", "COMMITMENT_QUESTION"], max_questions: 1, restart_discovery: false };
  }
  if (stage === "ENGAGED") {
    return { policy: "ConsultativeSalesConversationPolicy", stage, steps: ["CLARIFY", "PROBLEM", "DESIRED_OUTCOME", "OFFER", "COMMITMENT_QUESTION"], max_questions: 1, restart_discovery: false };
  }
  if (stage === "POST_SALE") {
    return { policy: "ConsultativeSalesConversationPolicy", stage, steps: ["SOLUTION", "OFFER"], max_questions: 1, restart_discovery: false };
  }
  return { policy: "ConsultativeSalesConversationPolicy", stage, steps: ["CLARIFY", "SOLUTION", "OFFER"], max_questions: 1, restart_discovery: false };
}

export function evaluateConsultativeSalesConversationPolicy(policy: ConsultativeSalesConversationPolicy): NamedOutboundLoopGate {
  const ok = policy.steps.length > 0 && policy.max_questions <= 2 && (policy.stage !== "HIGH_INTENT" || !policy.restart_discovery);
  return {
    gate: "ConsultativeSalesConversationPolicy",
    result: ok ? "PASS" : "FAIL",
    reasons: ok ? ["STAGE_FIT_PROGRESSION"] : ["POLICY_INVALID"],
  };
}

export type ConsultativeQuestion = {
  type: ConsultativeQuestionType;
  text: string;
};

const QUESTIONS: Record<ConsultativeQuestionType, string> = {
  SITUATION: "How are you comparing those options today?",
  PROBLEM: "Are you rebuilding the numbers manually every time something changes?",
  CONSEQUENCE: "How hard is it to tell which option actually makes more financial sense when the assumptions keep changing?",
  DESIRED_OUTCOME: "Would it help if you could see both options side by side without rebuilding the analysis?",
  DECISION: "If you're already looking at a lease decision, is the hard part seeing which option is actually stronger?",
  COMMITMENT: "If you're already looking at a lease decision, wouldn't it make sense to run your actual numbers and see which option comes out stronger?",
};

export function selectConsultativeQuestion(input: {
  stage: SalesStagePolicy;
  inbound: string;
  turn?: number;
  already_asked?: string[];
}): ConsultativeQuestion | null {
  const policy = consultativeSalesConversationPolicy(input.stage, input.turn ?? 1);
  if (input.stage === "HIGH_INTENT" || (input.turn ?? 1) >= 5) return null;
  const inbound = input.inbound.toLowerCase();
  let type: ConsultativeQuestionType = "SITUATION";
  if (input.stage === "QUALIFIED" || /try this with my current lease|need to enter/.test(inbound)) type = "COMMITMENT";
  else if (/renew|mov(e|ing)|relocat/.test(inbound)) type = "DESIRED_OUTCOME";
  else if (/example|spreadsheet|rebuild/.test(inbound)) type = "PROBLEM";
  else if (/price|cost|trial/.test(inbound)) type = "DECISION";
  else if (input.stage === "ENGAGED") type = "SITUATION";
  else if (input.stage === "FIRST_TOUCH") return null;
  const asked = new Set((input.already_asked ?? []).map((row) => row.toLowerCase()));
  if (asked.has(QUESTIONS[type].toLowerCase())) return null;
  if (inbound.includes("rebuilding") && type === "PROBLEM") type = "DESIRED_OUTCOME";
  return { type, text: QUESTIONS[type] };
}

export function evaluateConsultativeQuestionEngine(question: ConsultativeQuestion | null, stage: SalesStagePolicy): NamedOutboundLoopGate {
  if (stage === "HIGH_INTENT" || stage === "FIRST_TOUCH") {
    return { gate: "ConsultativeQuestionEngine", result: "PASS", reasons: question ? ["OPTIONAL_QUESTION"] : ["NO_DISCOVERY_REQUIRED"] };
  }
  if (!question) return { gate: "ConsultativeQuestionEngine", result: "PASS", reasons: ["QUESTION_OMITTED_ON_PURPOSE"] };
  return { gate: "ConsultativeQuestionEngine", result: "PASS", reasons: [question.type] };
}

export type SalesContrast = {
  current_way: string;
  better_way: string;
  sentence: string;
};

export function buildSalesContrast(kind: "spreadsheet" | "two_models" | "guessing" | "rework" = "spreadsheet"): SalesContrast {
  const rows: Record<typeof kind, SalesContrast> = {
    spreadsheet: {
      current_way: "rebuilding separate spreadsheets",
      better_way: "see both options side by side",
      sentence: "Instead of rebuilding separate spreadsheets, you can see both options side by side.",
    },
    two_models: {
      current_way: "trying to reconcile two models",
      better_way: "see both options side by side",
      sentence: "Instead of trying to reconcile two models, you can see both options side by side.",
    },
    guessing: {
      current_way: "guessing which option is stronger",
      better_way: "see which option makes more financial sense",
      sentence: "Rather than guessing which option is stronger, you can see which one makes more financial sense.",
    },
    rework: {
      current_way: "spending time reworking the analysis",
      better_way: "change the numbers without rebuilding the whole analysis",
      sentence: "Instead of spending time reworking the analysis, you can change the numbers without rebuilding everything.",
    },
  };
  return rows[kind];
}

export function evaluateSalesContrastBuilder(contrast: SalesContrast): NamedOutboundLoopGate {
  const ok = Boolean(contrast.current_way && contrast.better_way && contrast.sentence) && !/worst|disaster|you'll lose/i.test(contrast.sentence);
  return { gate: "SalesContrastBuilder", result: ok ? "PASS" : "FAIL", reasons: ok ? ["CURRENT_VS_BETTER"] : ["CONTRAST_MISSING"] };
}

function visibleBody(generated: string): string {
  return generated.replace(OCCUPANCYNPV_EMAIL_SIGNATURE, "").trim();
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).map((row) => row.trim()).filter(Boolean).length;
}

function questionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

export function evaluateSalesOverExplanationGate(input: {
  inbound: string;
  generated: string;
}): NamedOutboundLoopGate & { over_explanation: boolean } {
  const body = visibleBody(input.generated);
  const reasons: string[] = [];
  if (body.length > 1100) reasons.push("TOO_LONG");
  if (sentenceCount(body) > 12) reasons.push("TOO_MANY_SENTENCES");
  if (/npv methodology|valuation architecture|property-value model|npv framework|cap rate|financing, and exit/i.test(body.split("\n")[0] ?? "")) {
    reasons.push("TECHNICAL_LEAD");
  }
  if ((body.match(/NPV|cap rate|discount rate|DealWorkspace/g) ?? []).length >= 3) reasons.push("FEATURE_LIST");
  const inboundShort = input.inbound.length < 180 && /\?/.test(input.inbound);
  if (inboundShort && body.length > 2.6 * Math.max(input.inbound.length, 80) && /NPV and property-value impact/i.test(body)) {
    reasons.push("MORE_DETAIL_THAN_NEEDED");
  }
  return {
    gate: "SalesOverExplanationGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["JUST_ENOUGH"],
    over_explanation: reasons.length > 0,
  };
}

export function evaluateSalesQuestionQualityGate(input: {
  inbound: string;
  generated: string;
  stage: SalesStagePolicy;
  already_answered_questions?: string[];
}): NamedOutboundLoopGate {
  const body = visibleBody(input.generated);
  const count = questionMarks(body);
  const reasons: string[] = [];
  if (count > 2) reasons.push("STACKED_QUESTIONS");
  if (input.stage === "HIGH_INTENT" && count > 1) reasons.push("DISCOVERY_AFTER_INTENT");
  const asked = body.match(/[^.!?\n]*\?/g) ?? [];
  for (const question of asked) {
    const prior = (input.already_answered_questions ?? []).some((row) => question.toLowerCase().includes(row.toLowerCase().slice(0, 24)));
    if (prior) reasons.push("QUESTION_ALREADY_ANSWERED");
    if (/how is the weather|can i help you today|what do you think in general/i.test(question)) reasons.push("FILLER_QUESTION");
  }
  if (count >= 1) {
    const first = asked[0] ?? "";
    if (first.length < 12) reasons.push("QUESTION_TOO_THIN");
  }
  return {
    gate: "SalesQuestionQualityGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : count ? ["QUESTION_ADVANCES"] : ["NO_QUESTION_OK"],
  };
}

export function evaluateConsultativeSalesLanguageGate(input: {
  inbound: string;
  generated: string;
  stage: SalesStagePolicy;
  next_action: CommercialAction;
  turn?: number;
}): NamedOutboundLoopGate & {
  simple_language: "PASS" | "FAIL";
  question_led: "PASS" | "FAIL" | "NOT_APPLICABLE";
  pain_recognized: "PASS" | "FAIL" | "NOT_APPLICABLE";
  consequence_clear: "PASS" | "FAIL" | "NOT_APPLICABLE";
  desired_outcome_clear: "PASS" | "FAIL" | "NOT_APPLICABLE";
  current_vs_better_contrast: "PASS" | "FAIL" | "NOT_APPLICABLE";
  offer_used: "PASS" | "FAIL" | "NOT_APPLICABLE";
  commitment_ask: "PASS" | "FAIL" | "NOT_APPLICABLE";
  over_explanation: boolean;
  technical_jargon: boolean;
  robotic_tone: boolean;
} {
  const body = visibleBody(input.generated);
  const over = evaluateSalesOverExplanationGate(input);
  const questions = evaluateSalesQuestionQualityGate({ inbound: input.inbound, generated: input.generated, stage: input.stage });
  const robotic = /if useful|if you'd like|let me know if|the verified path|the next action is/i.test(body);
  const jargon = /valuation architecture|npv framework|property-value model|dealworkspace|eligible_at/i.test(body);
  const simple = !jargon && !/pursuant|aforementioned|methodology/i.test(body) && body.length < 1400;
  const highIntentInbound = /how do i start the free trial|rather just try it|can i try it|i want to (try|start)|start now|let'?s do it/i.test(input.inbound);
  const skipCraftDemand = input.stage === "HIGH_INTENT" || highIntentInbound;
  const outcomeNeeded = !skipCraftDemand;
  const outcome = /financial sense|side by side|without rebuilding|real numbers|stronger/i.test(body);
  const painNeeded = ["ENGAGED", "QUALIFIED"].includes(input.stage) && (input.turn ?? 1) < 5 && !skipCraftDemand;
  const pain = /spreadsheet|rebuild|manual|changing|two models|messy|guessing/i.test(body);
  const consequenceNeeded = input.stage === "QUALIFIED" && (input.turn ?? 1) < 5 && !skipCraftDemand;
  const consequence = /harder than it needs|slows the decision|hard to (know|tell)|out of date|less messy/i.test(body);
  const contrastNeeded = ["ENGAGED", "QUALIFIED"].includes(input.stage) && (input.turn ?? 1) < 5 && !skipCraftDemand;
  const contrast = /instead of|rather than|without rebuilding|big difference/i.test(body);
  const offerNeeded = /INVITE_TRIAL|START_TRIAL|REQUEST_PURCHASE|REQUEST_NUMBERS|INVITE_DEMO/.test(input.next_action) || input.stage === "HIGH_INTENT";
  const offer = /free trial|https:\/\/occupancynpv\.com\/pricing/i.test(body);
  const commitNeeded = ["QUALIFIED", "HIGH_INTENT"].includes(input.stage) || (input.turn ?? 1) >= 4;
  const commit = /wouldn't it make sense|why not test|start the free trial|start here|run your (actual|real) numbers|run both|run the comparison|try (it|this) with your (actual|real) numbers/i.test(body);
  const questionNeeded = input.stage === "ENGAGED" && (input.turn ?? 1) < 5;
  const hasQ = questionMarks(body) >= 1;
  const reasons: string[] = [];
  if (!simple) reasons.push("NOT_SIMPLE");
  if (over.over_explanation) reasons.push("OVER_EXPLAINED");
  if (questions.result !== "PASS") reasons.push("WEAK_QUESTION");
  if (robotic) reasons.push("ROBOTIC");
  if (jargon) reasons.push("TECHNICAL_JARGON");
  if (outcomeNeeded && !outcome) reasons.push("NO_OUTCOME");
  if (painNeeded && !pain) reasons.push("NO_PAIN");
  if (consequenceNeeded && !consequence) reasons.push("NO_CONSEQUENCE");
  if (contrastNeeded && !contrast) reasons.push("NO_CONTRAST");
  if (offerNeeded && !offer) reasons.push("NO_OFFER");
  if (commitNeeded && !commit) reasons.push("NO_COMMITMENT");
  if (questionNeeded && !hasQ) reasons.push("NO_SALES_QUESTION");
  return {
    gate: "ConsultativeSalesLanguageGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CONSULTATIVE_COPY"],
    simple_language: simple ? "PASS" : "FAIL",
    question_led: questionNeeded ? (hasQ ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    pain_recognized: painNeeded ? (pain ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    consequence_clear: consequenceNeeded ? (consequence ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    desired_outcome_clear: outcomeNeeded ? (outcome ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    current_vs_better_contrast: contrastNeeded ? (contrast ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    offer_used: offerNeeded ? (offer ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    commitment_ask: commitNeeded ? (commit ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    over_explanation: over.over_explanation,
    technical_jargon: jargon,
    robotic_tone: robotic,
  };
}

export function consultativeLearningDimensions(input: {
  question: ConsultativeQuestion | null;
  contrast: SalesContrast | null;
  cta: string;
  offer_used: boolean;
}): Record<string, string> {
  return {
    question_type: input.question?.type ?? "NONE",
    pain_framing: input.contrast?.current_way ?? "NONE",
    contrast_framing: input.contrast?.better_way ?? "NONE",
    offer_placement: input.offer_used ? "PRESENT" : "ABSENT",
    cta: input.cta.slice(0, 80),
    optimize_for: "qualified_response_trial_demo_purchase",
  };
}

export const CONSULTATIVE_SALES_COMPOSER_VERSION = "consultative-sales-language-v1" as const;

export const CONSULTATIVE_SALES_LIVE_GATES = [
  "ConsultativeSalesConversationPolicy",
  "ConsultativeQuestionEngine",
  "SalesContrastBuilder",
  "ConsultativeSalesLanguageGate",
  "SalesOverExplanationGate",
  "SalesQuestionQualityGate",
  "NaturalSalesConversationGate",
  "OfferDrivenSalesAdvancementGate",
  "SalesAdvancementQualityGate",
] as const;

export function evaluateLiveConsultativeSalesComposerParityGate(input: {
  live_version: string | null;
  expected_version?: string;
  gates_present?: string[];
}): NamedOutboundLoopGate {
  const expected = input.expected_version ?? CONSULTATIVE_SALES_COMPOSER_VERSION;
  const present = new Set(input.gates_present ?? CONSULTATIVE_SALES_LIVE_GATES);
  const missing = CONSULTATIVE_SALES_LIVE_GATES.filter((gate) => !present.has(gate));
  const ok = input.live_version === expected && missing.length === 0;
  return {
    gate: "LiveConsultativeSalesComposerParityGate",
    result: ok ? "PASS" : "FAIL",
    reasons: ok ? ["LIVE_COMPOSER_MATCHES_SOURCE"] : [
      ...(input.live_version !== expected ? ["COMPOSER_VERSION_MISMATCH"] : []),
      ...missing.map((gate) => `MISSING_${gate}`),
    ],
  };
}
