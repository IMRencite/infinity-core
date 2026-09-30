import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import {
  CLUB_THROTTLE_EDITORIAL_PROFILE,
  OCCUPANCY_EDITORIAL_PROFILE,
  resolveVentureEditorialProfile,
  type VentureEditorialProfile,
} from "./venture-editorial-profiles";
import { evaluateHumanFirstEditorialQc } from "./blog-human-flow-gates";

export const BLOG_CONSUMER_EDITORIAL_QUALITY_GATE = "BlogConsumerEditorialQualityGate" as const;
export const BLOG_MANUAL_TONE_DETECTOR = "BlogManualToneDetector" as const;
export const BLOG_SEMANTIC_REPETITION_GATE = "BlogSemanticRepetitionGate" as const;
export const BLOG_SHAREABILITY_GATE = "BlogShareabilityGate" as const;
export const VENTURE_EDITORIAL_PROFILE_GATE = "VentureEditorialProfileGate" as const;
export const VENTURE_VOICE_SEPARATION_GATE = "VentureVoiceSeparationGate" as const;
export const RENDERED_EDITORIAL_QUALITY_GATE = "RenderedEditorialQualityGate" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

function visibleText(draft: OrganicDraft): string {
  return `${draft.h1}\n${draft.headings.join("\n")}\n${draft.body}\n${draft.direct_answer ?? ""}`;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((row) => row.trim().length > 12);
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

export function evaluateBlogManualToneDetector(input: {
  draft: OrganicDraft;
  profile?: VentureEditorialProfile | null;
}): OrganicNamedGate {
  const profile = input.profile ?? resolveVentureEditorialProfile(input.draft);
  if (!profile) {
    return named(BLOG_MANUAL_TONE_DETECTOR, []);
  }
  const text = visibleText(input.draft);
  const reasons: string[] = [];
  const opening = text.slice(0, 280).toLowerCase();
  if (/^(fabric weight|a rider should|this guide explains|this article explains|in this guide)/i.test(opening.trim())) {
    reasons.push("DICTIONARY_OPENING");
  }
  const definitional = countMatches(text, /\b(is|are|means|refers to)\b/gi);
  if (definitional > Math.max(40, text.split(/\s+/).length / 35)) reasons.push("EXCESS_DEFINITIONAL_VOICE");
  const checklist = countMatches(text, /checklist|step \d|first,? second,? third/i);
  if (checklist > 6) reasons.push("CHECKLIST_MANUAL");
  const flatHeadings = input.draft.headings.filter((h) =>
    /in plain numbers|versus|how to read|limitations of|where to go next inside/i.test(h),
  ).length;
  if (flatHeadings >= Math.ceil(input.draft.headings.length * 0.45)) reasons.push("TEXTBOOK_HEADINGS");
  if (profile.sophistication === "OPERATOR") {
    const operatorManual = countMatches(text, /how do interest rates|same noi at a higher|is not the same as a tenant|cap rates do not move 1:1/gi);
    if (operatorManual >= 7) reasons.push("OPERATOR_DEFINITION_CHAIN");
    if (/buyer impact|seller impact|owner and operator impact|limitations and tradeoffs|key takeaways/i.test(input.draft.headings.join(" "))) {
      const scenario = /\$\d|120,?000|286,?000|1\.54|debt service/i.test(text);
      if (!scenario) reasons.push("OPERATOR_TEXTBOOK_WITHOUT_SCENARIO");
    }
  }
  const avgPara =
    input.draft.body.split(/\n{2,}/).reduce((sum, block) => sum + block.split(/\s+/).length, 0)
    / Math.max(1, input.draft.body.split(/\n{2,}/).length);
  if (avgPara > 95 && input.draft.body.split(/\n{2,}/).length > 12) reasons.push("FLAT_LONG_PARAGRAPHS");
  return named(BLOG_MANUAL_TONE_DETECTOR, reasons);
}

const REPETITION_CONCEPTS = [
  { id: "gsm_weight", patterns: [/gsm|grams per square meter|ounces per square yard|fabric weight/gi] },
  { id: "collar", patterns: [/collar/gi] },
  { id: "wash", patterns: [/wash|dryer|tumble dry|hang dry/gi] },
  { id: "print_method", patterns: [/screen print|direct-to-garment|dtg|plastisol/gi] },
  { id: "size_chart", patterns: [/size chart/gi] },
  { id: "noi_cap", patterns: [/same noi|cap rate|going-in cap|required yield|indicated value/gi] },
  { id: "fed_mortgage", patterns: [/federal reserve|commercial mortgage|treasury yield|credit spread/gi] },
  { id: "dscr_leverage", patterns: [/dscr|debt service|loan-to-value|ltv|debt yield/gi] },
];

export function evaluateBlogSemanticRepetitionGate(draft: OrganicDraft): OrganicNamedGate {
  const text = visibleText(draft);
  const reasons: string[] = [];
  for (const concept of REPETITION_CONCEPTS) {
    let hits = 0;
    for (const pattern of concept.patterns) hits += countMatches(text, pattern);
    const isOcc = draft.origin?.includes("occupancynpv") || draft.canonical?.includes("occupancynpv");
    const limit = isOcc && ["noi_cap", "fed_mortgage", "dscr_leverage"].includes(concept.id) ? 24 : 12;
    if (hits >= limit) reasons.push(`REPEAT_${concept.id.toUpperCase()}`);
  }
  const sents = sentences(text);
  const normalized = sents.map((s) => s.toLowerCase().replace(/\d+/g, "#").slice(0, 80));
  const dupes = normalized.filter((s, i) => normalized.indexOf(s) !== i);
  if (dupes.length >= 3) reasons.push("NEAR_DUPLICATE_SENTENCES");
  return named(BLOG_SEMANTIC_REPETITION_GATE, reasons);
}

export function evaluateBlogShareabilityGate(draft: OrganicDraft): OrganicNamedGate {
  const text = visibleText(draft);
  const reasons: string[] = [];
  const memorable =
    /mockup|collar tells|parking.?lot test|bar.?reach|30.?second|here'?s the catch|most riders|better bet|send this/i.test(
      text,
    );
  const comparison = /versus|vs\.|compared to|rather than|instead of/i.test(text);
  const myth = /myth|mistake|wrong move|do not|don't/i.test(text);
  if (!memorable && !comparison && !myth) reasons.push("LOW_MEMORABLE_LINES");
  if (!/[!?—]/.test(text) && text.split(/\s+/).length > 900) reasons.push("FLAT_PROSE_RHYTHM");
  return named(BLOG_SHAREABILITY_GATE, reasons);
}

export function evaluateVentureEditorialProfileGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  if (!profile) return named(VENTURE_EDITORIAL_PROFILE_GATE, ["UNKNOWN_VENTURE_PROFILE"]);
  const text = visibleText(draft);
  const reasons: string[] = [];
  for (const banned of profile.forbidden_cliches) {
    if (banned.test(text)) reasons.push("FORBIDDEN_CLICHE");
  }
  if (profile.venture_id === "club-throttle") {
    const scenarios = profile.scenario_library.filter((token) => text.toLowerCase().includes(token));
    if (scenarios.length < 3) reasons.push("LOW_SCENARIO_GROUNDING");
  }
  return named(VENTURE_EDITORIAL_PROFILE_GATE, [...new Set(reasons)]);
}

export function evaluateVentureVoiceSeparationGate(draft: OrganicDraft): OrganicNamedGate {
  const text = visibleText(draft).toLowerCase();
  const reasons: string[] = [];
  const isClub = draft.canonical?.includes("clubthrottle") || draft.origin?.includes("clubthrottle");
  const isOcc = draft.canonical?.includes("occupancynpv") || draft.origin?.includes("occupancynpv");
  if (isClub && /occupancynpv|commercial lease npv|cam reconciliation|cap rate hub/i.test(text)) {
    reasons.push("CROSS_VENTURE_OCCUPANCY_LEAK");
  }
  if (isOcc && /bike night|handlebars|saddlebag|riding jacket|motorcycle streetwear/i.test(text)) {
    reasons.push("CROSS_VENTURE_CLUB_THROTTLE_LEAK");
  }
  return named(VENTURE_VOICE_SEPARATION_GATE, reasons);
}

export function evaluateBlogConsumerEditorialQualityGate(
  draft: OrganicDraft,
  profile?: VentureEditorialProfile | null,
): OrganicNamedGate {
  const resolved = profile ?? resolveVentureEditorialProfile(draft);
  if (!resolved) return named(BLOG_CONSUMER_EDITORIAL_QUALITY_GATE, ["NO_CONSUMER_PROFILE"]);
  const text = visibleText(draft);
  const reasons: string[] = [];

  const opening = draft.body.slice(0, 420);
  if (resolved.venture_id === "club-throttle") {
    if (!/\?|you know|you've|when you|after the ride|at the lot|peel off|gas station/i.test(opening)) {
      reasons.push("WEAK_HOOK");
    }
    if (!/for most riders|in practice|the better bet|here is the catch|that sounds minor until/i.test(text)) {
      reasons.push("LOW_EDITORIAL_VOICE");
    }
    if (!/before you cut tags|30.?second|keep or return|exchange when|return when|do this/i.test(text)) {
      reasons.push("WEAK_ACTIONABILITY");
    }
  } else if (resolved.venture_id === "occupancynpv") {
    if (!/\?|when you|before you|first year|operating year|reconcil|budget|lease|tenant|landlord|surprise/i.test(opening)) {
      reasons.push("WEAK_HOOK");
    }
    if (!/in practice|operators|tenants|landlords|the better read|here is the catch|watch for/i.test(text)) {
      reasons.push("LOW_EDITORIAL_VOICE");
    }
    if (!/checklist|compare|reconcile|before you sign|next step|decision|stress-test|review/i.test(text)) {
      reasons.push("WEAK_ACTIONABILITY");
    }
  }
  const gates = [
    evaluateBlogManualToneDetector({ draft, profile: resolved }),
    evaluateBlogSemanticRepetitionGate(draft),
    evaluateBlogShareabilityGate(draft),
    evaluateVentureEditorialProfileGate(draft),
    evaluateVentureVoiceSeparationGate(draft),
  ];
  for (const gate of gates) {
    if (gate.result === "FAIL") reasons.push(...gate.reasons.filter((r) => r !== "OK"));
  }
  return named(BLOG_CONSUMER_EDITORIAL_QUALITY_GATE, [...new Set(reasons)]);
}

export function evaluateRenderedEditorialQualityGate(input: {
  venture_id: "club-throttle" | "occupancynpv";
  rendered_html_or_text: string;
}): OrganicNamedGate {
  const text = input.rendered_html_or_text.replace(/<[^>]+>/g, " ");
  const reasons: string[] = [];
  if (/teaching sample|learning test|section-depth|after this page a reader should/i.test(text)) {
    reasons.push("INTERNAL_RUBRIC_LEAK");
  }
  if (input.venture_id === "club-throttle" && /occupancynpv|commercial lease npv/i.test(text)) {
    reasons.push("CROSS_VENTURE_RENDER");
  }
  return named(RENDERED_EDITORIAL_QUALITY_GATE, reasons);
}

export function consumerEditorialRevisionHints(draft: OrganicDraft): string[] {
  const reasons: string[] = [];
  const gate = evaluateBlogConsumerEditorialQualityGate(draft);
  if (gate.result === "FAIL") reasons.push(...gate.reasons.filter((r) => r !== "OK"));
  const human = evaluateHumanFirstEditorialQc(draft);
  if (human.result === "FAIL") reasons.push(...human.reasons.filter((r) => r !== "OK"));
  return [...new Set(reasons)];
}

export { CLUB_THROTTLE_EDITORIAL_PROFILE, OCCUPANCY_EDITORIAL_PROFILE };
