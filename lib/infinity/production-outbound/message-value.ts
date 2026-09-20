export const OUTBOUND_REPLY_LIKELIHOOD_GATE = "OutboundReplyLikelihoodGate" as const;
export const OUTBOUND_MESSAGE_EXPERIMENT = "OutboundMessageExperiment" as const;
export const OUTBOUND_MESSAGE_LEARNING_ENGINE = "OutboundMessageLearningEngine" as const;

export const SUBJECT_STYLES = ["PAIN_LED", "QUESTION_LED", "BENEFIT_LED", "SPECIFIC_TOOL", "ASSET_LED"] as const;
export type OutboundSubjectStyle = (typeof SUBJECT_STYLES)[number];

export const OUTBOUND_PERSONAS = ["BROKER", "OWNER", "ASSET_MANAGER", "TENANT_REP", "INVESTOR", "CFO"] as const;
export type OutboundPersona = (typeof OUTBOUND_PERSONAS)[number];

export type ValueStrength = "STRONG" | "ACCEPTABLE" | "WEAK";
export type CtaFriction = "LOW" | "MEDIUM" | "HIGH";

export type OutboundValueModel = {
  persona: OutboundPersona;
  pain: string;
  problem_cost: string;
  dream_outcome: string;
  mechanism: string;
  time_to_value: string;
  effort_reduction: string;
  cta: string;
};

export const PERSONA_VALUE_MAP: Record<OutboundPersona, OutboundValueModel> = {
  BROKER: {
    persona: "BROKER",
    pain: "slow scenario comparison",
    problem_cost: "harder to explain options quickly",
    dream_outcome: "clear client comparison",
    mechanism: "compare lease and occupancy assumptions in one workflow",
    time_to_value: "see NPV impact without rebuilding the sheet",
    effort_reduction: "no spreadsheet rebuild for each assumption change",
    cta: "Want me to send you a quick example?",
  },
  OWNER: {
    persona: "OWNER",
    pain: "unclear financial impact of occupancy decisions",
    problem_cost: "greater decision uncertainty",
    dream_outcome: "see how assumptions affect value",
    mechanism: "update occupancy and rent in one comparison",
    time_to_value: "see property-value impact immediately after a change",
    effort_reduction: "one model instead of rebuilt sheets",
    cta: "Is this something you're dealing with now?",
  },
  ASSET_MANAGER: {
    persona: "ASSET_MANAGER",
    pain: "assumptions scattered across models",
    problem_cost: "slow updates and inconsistent inputs",
    dream_outcome: "centralized repeatable comparison",
    mechanism: "shared occupancy and financing inputs",
    time_to_value: "update assumptions without reconciling multiple files",
    effort_reduction: "less reconciliation across models",
    cta: "Would it be useful if I showed you one scenario?",
  },
  TENANT_REP: {
    persona: "TENANT_REP",
    pain: "difficult lease-vs-alternative modeling",
    problem_cost: "more manual analysis",
    dream_outcome: "clear client-facing comparison",
    mechanism: "lease occupancy NPV side by side",
    time_to_value: "compare alternatives in one workflow",
    effort_reduction: "no rebuilt spreadsheet for each option",
    cta: "Want to see how it handles a lease-vs-buy comparison?",
  },
  INVESTOR: {
    persona: "INVESTOR",
    pain: "unclear relationship between occupancy assumptions and property value",
    problem_cost: "slower investment decisions",
    dream_outcome: "quick value impact visibility",
    mechanism: "occupancy, rent, and cap rate in one NPV view",
    time_to_value: "see value impact as soon as an assumption changes",
    effort_reduction: "fewer rebuilt models",
    cta: "Want me to send you a quick example?",
  },
  CFO: {
    persona: "CFO",
    pain: "manual models and inconsistent assumptions",
    problem_cost: "rework and reconciliation",
    dream_outcome: "repeatable decision framework",
    mechanism: "one occupancy NPV comparison workflow",
    time_to_value: "evaluate alternatives without rebuilding the model",
    effort_reduction: "less rework across finance models",
    cta: "Would it be useful if I showed you one scenario?",
  },
};

export type OutboundMessageQualityDetail = {
  pain_clarity: ValueStrength;
  problem_cost: ValueStrength;
  dream_outcome: ValueStrength;
  perceived_likelihood: ValueStrength;
  time_to_value: ValueStrength;
  effort_reduction: ValueStrength;
  cta_friction: CtaFriction;
  identity: "PASS" | "FAIL";
  personalization_truth: "PASS" | "FAIL";
  spamminess: "PASS" | "FAIL";
  readability: "PASS" | "FAIL";
  result: "PASS" | "FAIL";
  reasons: string[];
};

function strength(ok: boolean, strong: boolean): ValueStrength {
  if (!ok) return "WEAK";
  return strong ? "STRONG" : "ACCEPTABLE";
}

export function classifySubjectStyle(subject: string): OutboundSubjectStyle {
  if (/\?$/.test(subject.trim())) return /spreadsheet|rebuild|messy|manual/i.test(subject) ? "PAIN_LED" : "QUESTION_LED";
  if (/spreadsheet|rebuild|still /i.test(subject)) return "PAIN_LED";
  if (/example|faster|quick/i.test(subject)) return "BENEFIT_LED";
  if (/npv|occupancy|lease/i.test(subject)) return "SPECIFIC_TOOL";
  return "ASSET_LED";
}

export function evaluateOutboundMessageValueQuality(input: {
  subject: string;
  body: string;
  persona?: OutboundPersona;
  invented_personalization?: boolean;
}): OutboundMessageQualityDetail {
  const text = `${input.subject}\n${input.body}`;
  const reasons: string[] = [];
  const pain = /spreadsheet|rebuild|messy|scattered|manual|unclear|slow/i.test(text);
  const cost = /rebuild|reconcil|uncertain|harder|rework|inconsistent/i.test(text);
  const outcome = /compar|npv|property value|see how|side by side/i.test(text);
  const mechanism = /occupancynpv|one (place|workflow|model)|assumptions/i.test(text);
  const ttv = /quickly|immediately|without rebuilding|in one/i.test(text);
  const effort = /without rebuilding|one place|one workflow|no spreadsheet/i.test(text);
  const productFirst = /^(hi[^\n]*\n+)?\s*(i['’]m infinity|we built|i work on occupancynpv)/i.test(input.body.trim());
  const highCta = /30[- ]minute|book a (call|demo)|schedule|purchase|calendar/i.test(text);
  const invented = Boolean(input.invented_personalization) || /i saw you just closed|loved your recent/i.test(text);
  const spam = /guaranteed|act now|limited time|best-in-class|revolutionary/i.test(text);
  const identityFail = /i personally wrote|human employee|i['’]m sarah|i['’]m john/i.test(text);
  const readable = input.body.length > 80 && input.body.length < 1200;
  if (!pain) reasons.push("NO_RECOGNIZABLE_PAIN");
  if (productFirst) reasons.push("PRODUCT_BEFORE_PAIN");
  if (!outcome) reasons.push("VAGUE_BENEFIT");
  if (!mechanism) reasons.push("FEATURE_HEAVY_OR_NO_MECHANISM");
  if (highCta) reasons.push("CTA_TOO_HIGH");
  if (invented) reasons.push("INVENTED_PERSONALIZATION");
  if (spam) reasons.push("SPAMMY");
  if (identityFail) reasons.push("IDENTITY_FAIL");
  if (!readable) reasons.push("READABILITY");
  const result = reasons.length ? "FAIL" : "PASS";
  return {
    pain_clarity: strength(pain, /spreadsheet|rebuild/i.test(text)),
    problem_cost: strength(cost, /rebuild|reconcil/i.test(text)),
    dream_outcome: strength(outcome, /npv|property value/i.test(text)),
    perceived_likelihood: strength(mechanism, /occupancynpv/i.test(text)),
    time_to_value: strength(ttv, /without rebuilding|quickly/i.test(text)),
    effort_reduction: strength(effort, /without rebuilding|one workflow/i.test(text)),
    cta_friction: highCta ? "HIGH" : /example|scenario|dealing with now/i.test(text) ? "LOW" : "MEDIUM",
    identity: identityFail ? "FAIL" : "PASS",
    personalization_truth: invented ? "FAIL" : "PASS",
    spamminess: spam ? "FAIL" : "PASS",
    readability: readable ? "PASS" : "FAIL",
    result,
    reasons: reasons.length ? reasons : ["PAIN_FIRST_VALUE_CLEAR"],
  };
}

export function evaluateOutboundReplyLikelihoodGate(input: {
  subject: string;
  body: string;
}): { gate: typeof OUTBOUND_REPLY_LIKELIHOOD_GATE; result: ValueStrength; reasons: string[] } {
  const quality = evaluateOutboundMessageValueQuality(input);
  const weak = [quality.pain_clarity, quality.dream_outcome, quality.perceived_likelihood, quality.effort_reduction].filter((row) => row === "WEAK").length;
  const reasons: string[] = [];
  if (quality.result === "FAIL") reasons.push(...quality.reasons);
  if (quality.cta_friction === "HIGH") reasons.push("CTA_HARD_TO_ANSWER");
  const result: ValueStrength = reasons.length || weak >= 2 ? "WEAK" : weak === 1 ? "ACCEPTABLE" : "STRONG";
  return { gate: OUTBOUND_REPLY_LIKELIHOOD_GATE, result, reasons: reasons.length ? reasons : ["REPLY_EARNED"] };
}

export type OutboundMessageExperimentRecord = {
  contract: typeof OUTBOUND_MESSAGE_EXPERIMENT;
  subject: string;
  subject_style: OutboundSubjectStyle;
  pain_angle: string;
  problem_cost_angle: string;
  dream_outcome: string;
  mechanism: string;
  time_to_value: string;
  effort_reduction: string;
  cta: string;
  length: number;
  persona: OutboundPersona;
  venture: string;
  campaign: string;
  observations: {
    delivery: number;
    bounce: number;
    reply: number;
    positive_reply: number;
    negative_reply: number;
    qualified_reply: number;
    opt_out: number;
  };
};

export function createOutboundMessageExperiment(input: {
  subject: string;
  body: string;
  persona: OutboundPersona;
  venture?: string;
  campaign?: string;
}): OutboundMessageExperimentRecord {
  const model = PERSONA_VALUE_MAP[input.persona];
  return {
    contract: OUTBOUND_MESSAGE_EXPERIMENT,
    subject: input.subject,
    subject_style: classifySubjectStyle(input.subject),
    pain_angle: model.pain,
    problem_cost_angle: model.problem_cost,
    dream_outcome: model.dream_outcome,
    mechanism: model.mechanism,
    time_to_value: model.time_to_value,
    effort_reduction: model.effort_reduction,
    cta: model.cta,
    length: input.body.length,
    persona: input.persona,
    venture: input.venture ?? "occupancynpv",
    campaign: input.campaign ?? "first-outbound-validation",
    observations: {
      delivery: 0,
      bounce: 0,
      reply: 0,
      positive_reply: 0,
      negative_reply: 0,
      qualified_reply: 0,
      opt_out: 0,
    },
  };
}

export function observeOutboundMessageOutcome(
  experiment: OutboundMessageExperimentRecord,
  outcome: keyof OutboundMessageExperimentRecord["observations"],
): OutboundMessageExperimentRecord {
  return {
    ...experiment,
    observations: {
      ...experiment.observations,
      [outcome]: experiment.observations[outcome] + 1,
    },
  };
}

export function learnOutboundMessageSignals(records: OutboundMessageExperimentRecord[]): {
  engine: typeof OUTBOUND_MESSAGE_LEARNING_ENGINE;
  qualified_reply_rate: number;
  overfit: boolean;
  preferred_subject_style: OutboundSubjectStyle | "INSUFFICIENT_EVIDENCE";
} {
  const replies = records.reduce((sum, row) => sum + row.observations.qualified_reply, 0);
  const deliveries = records.reduce((sum, row) => sum + Math.max(row.observations.delivery, 1), 0);
  return {
    engine: OUTBOUND_MESSAGE_LEARNING_ENGINE,
    qualified_reply_rate: replies / deliveries,
    overfit: records.length < 3,
    preferred_subject_style: records.length < 3 ? "INSUFFICIENT_EVIDENCE" : records[0]!.subject_style,
  };
}
