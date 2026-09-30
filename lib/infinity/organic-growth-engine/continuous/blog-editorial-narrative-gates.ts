import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import {
  resolveVentureEditorialProfile,
  type VentureEditorialProfile,
} from "./venture-editorial-profiles";

export const BLOG_HEADING_DENSITY_GATE = "BlogHeadingDensityGate" as const;
export const BLOG_TRANSITION_CONTINUITY_GATE = "BlogTransitionContinuityGate" as const;
export const EDITORIAL_NARRATIVE_ARCHITECTURE_GATE = "EditorialNarrativeArchitectureGate" as const;
export const EDITORIAL_POINT_STRENGTH_GATE = "EditorialPointStrengthGate" as const;
export const EDITORIAL_SPECIFICITY_GATE = "EditorialSpecificityGate" as const;
export const READER_CURIOSITY_GATE = "ReaderCuriosityGate" as const;
export const EDITORIAL_RHYTHM_GATE = "EditorialRhythmGate" as const;
export const SEO_SCAFFOLDING_EXPOSURE_GATE = "SeoScaffoldingExposureGate" as const;
export const FAQ_REPEATS_BODY_GATE = "FaqRepeatsBodyGate" as const;
export const HOLISTIC_PUBLICATION_QUALITY_JUDGE = "HolisticPublicationQualityJudge" as const;
export const HUMAN_FIRST_EDITORIAL_QC_V2 = "HumanFirstEditorialQcV2" as const;

/** Narrative failures that require full restructure, not sentence patches. */
export const STRUCTURAL_REWRITE_FAILURE_CODES = [
  "NO_NARRATIVE_SPINE",
  "HEADLINE_TO_HEADLINE_FLOW",
  "MICRO_SECTION_DENSITY_HIGH",
  "TEMPLATED_ARTICLE_STRUCTURE",
  "SEO_SCAFFOLDING_EXPOSED",
  "LOW_SHARE_VALUE",
  "NO_PAYOFF",
  "WEAK_ENDING",
] as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

function visibleText(draft: OrganicDraft): string {
  return `${draft.h1}\n${draft.headings.join("\n")}\n${draft.body}\n${draft.direct_answer ?? ""}`;
}

function bodyBlocks(draft: OrganicDraft): string[] {
  return draft.body.split(/\n{2,}/).filter((block) => block.trim().length > 20);
}

function contentHeadings(draft: OrganicDraft): string[] {
  return draft.headings.filter(
    (h) => !/where to go next|related reading|related reads|featured reads/i.test(h),
  );
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const CHECKLIST_HEADING =
  /\btest\b|\bvs\.?\b|versus|how to read|in plain|step \d|checklist|pick your|without the sermon|keep, exchange|screen print vs|tee vs/i;

export function evaluateBlogHeadingDensityGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const headings = contentHeadings(draft);
  const blocks = bodyBlocks(draft);
  const blockWordCounts = blocks.map((b) => b.split(/\s+/).length);
  const medianDepth = median(blockWordCounts);
  const words = draft.body.split(/\s+/).length;
  const reasons: string[] = [];

  const enthusiastStrict = profile?.sophistication === "ENTHUSIAST";
  const operator = profile?.sophistication === "OPERATOR";
  const headingCap = enthusiastStrict ? 9 : operator ? 18 : 14;
  const medianFloor = enthusiastStrict ? 130 : operator ? 72 : 95;

  if (words >= 750 && headings.length >= headingCap && medianDepth < medianFloor) {
    reasons.push("MICRO_SECTION_DENSITY_HIGH");
  }
  if (
    headings.length >= 8
    && blocks.length >= Math.ceil(headings.length * 0.75)
    && medianDepth < medianFloor + 15
    && headings.filter((h) => CHECKLIST_HEADING.test(h)).length >= Math.ceil(headings.length * 0.45)
  ) {
    reasons.push("HEADLINE_TO_HEADLINE_FLOW");
  }
  if (headings.length >= 10 && words < 2200 && medianDepth < 110 && enthusiastStrict) {
    reasons.push("TEMPLATED_ARTICLE_STRUCTURE");
  }
  return named(BLOG_HEADING_DENSITY_GATE, reasons);
}

export function evaluateBlogTransitionContinuityGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const blocks = bodyBlocks(draft);
  const reasons: string[] = [];
  const bridge =
    /\b(that is when|which means|so when|the graphic|the fabric|the collar|the first wash|then the|once you|after that|before you|instead of|rather than|fit tells|mockup|jacket comes off|debt service|buyers still|hold income|when rates|same noi|which piece)\b/i;
  let bridged = 0;
  for (let i = 0; i < blocks.length - 1; i += 1) {
    const tail = blocks[i]!.slice(-220);
    const head = blocks[i + 1]!.slice(0, 120);
    if (bridge.test(tail) || bridge.test(head)) bridged += 1;
  }
  const headings = contentHeadings(draft).length;
  const minBridge = profile?.sophistication === "OPERATOR" ? 0.12 : 0.25;
  if (headings >= 8 && blocks.length >= 8 && bridged < Math.max(2, Math.floor(blocks.length * minBridge))) {
    reasons.push("WEAK_TRANSITIONS");
  }
  return named(BLOG_TRANSITION_CONTINUITY_GATE, reasons);
}

export function evaluateEditorialNarrativeArchitectureGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const text = visibleText(draft).toLowerCase();
  const reasons: string[] = [];
  const words = draft.body.split(/\s+/).length;

  const thesisMarkers =
    (text.match(
      /\b(not when you buy|after the ride|first wash|real product review|judged when|mockup|product photo|same noi|higher cap|indicated value|buyer yield|debt service)\b/gi,
    ) ?? []).length;
  const thesisMin = profile?.sophistication === "OPERATOR" ? 1 : 2;
  if (words > 700 && thesisMarkers < thesisMin) reasons.push("WEAK_CENTRAL_THESIS");

  if (profile?.venture_id === "club-throttle") {
    const micro = evaluateBlogHeadingDensityGate(draft).result === "FAIL";
    if (words > 700 && micro) reasons.push("NO_NARRATIVE_SPINE");
  } else if (profile?.venture_id === "occupancynpv") {
    const operatorSpine =
      /\$\d|noi|cap rate|debt service|coverage|refinanc/i.test(text)
      && /buyer|bid|value|yield|before|when rates/i.test(text);
    if (words > 900 && !operatorSpine) reasons.push("NO_NARRATIVE_SPINE");
  }

  const payoff = /keep when|return when|rule|write the next|before you cut tags|callback|that is the shirt you/i.test(
    text,
  );
  if (words > 800 && contentHeadings(draft).length <= 8 && !payoff) reasons.push("NO_PAYOFF");

  return named(EDITORIAL_NARRATIVE_ARCHITECTURE_GATE, reasons);
}

const STRONG_POINT =
  /the (first wash|mockup|collar|graphic gets|real product)|not when you buy|designed for a mockup|worth keeping|disappears when|that is when you find out|better bet|tells you whether|same noi|almost \$286|disappears before|bid you can clear|not a tenant|policy rate is not/i;

export function evaluateEditorialPointStrengthGate(draft: OrganicDraft): OrganicNamedGate {
  const text = visibleText(draft);
  const reasons: string[] = [];
  const strong = (text.match(STRONG_POINT) ?? []).length;
  const headings = contentHeadings(draft).length;
  const operator = resolveVentureEditorialProfile(draft)?.sophistication === "OPERATOR";
  const minStrong = operator ? 2 : 3;
  if (headings >= 8 && strong < minStrong) reasons.push("WEAK_POINT_STRENGTH");
  if (!operator && headings >= 10 && strong < 4) reasons.push("WEAK_POINT_STRENGTH");
  return named(EDITORIAL_POINT_STRENGTH_GATE, reasons);
}

const GENERIC_ADVICE =
  /\b(fabric quality matters|fit matters|print placement matters|important to consider)\b/i;
const CLUB_SCENE_TOKENS = [
  "gas station",
  "jacket",
  "collar",
  "mockup",
  "handlebar",
  "clutch",
  "humid",
  "parking",
  "waistband",
  "sodium",
  "peel off",
  "lot lights",
  "first wash",
];

function countSceneTokens(body: string): number {
  const lower = body.toLowerCase();
  return CLUB_SCENE_TOKENS.filter((token) => lower.includes(token)).length;
}

export function evaluateEditorialSpecificityGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const text = visibleText(draft);
  const reasons: string[] = [];
  if (profile?.venture_id === "club-throttle") {
    if (countSceneTokens(draft.body) < 6) reasons.push("GENERIC_OBSERVATION");
    if (GENERIC_ADVICE.test(draft.body)) reasons.push("GENERIC_OBSERVATION");
  }
  if (profile?.venture_id === "occupancynpv" && !/\$\d|120,?000|286,?000|1\.54|2,?000,?000/i.test(text)) {
    if (draft.body.split(/\s+/).length > 900) reasons.push("GENERIC_OBSERVATION");
  }
  return named(EDITORIAL_SPECIFICITY_GATE, reasons);
}

export function evaluateReaderCuriosityGate(draft: OrganicDraft): OrganicNamedGate {
  const opening = draft.body.slice(0, 650);
  const reasons: string[] = [];
  const unresolved =
    /\?|four hours later|that is when|find out whether|looks like it lost|disappear|before you know|the catch/i.test(
      opening,
    );
  if (!unresolved) reasons.push("WEAK_CURIOSITY_LOOP");
  return named(READER_CURIOSITY_GATE, reasons);
}

export function evaluateEditorialRhythmGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  if (profile?.sophistication === "OPERATOR") return named(EDITORIAL_RHYTHM_GATE, []);
  const blocks = bodyBlocks(draft);
  const reasons: string[] = [];
  if (blocks.length < 6) return named(EDITORIAL_RHYTHM_GATE, reasons);
  const lengths = blocks.map((b) => b.split(/\s+/).length);
  const shortParas = lengths.filter((n) => n >= 35 && n <= 75).length;
  if (shortParas / lengths.length > 0.75 && lengths.length >= 10) {
    reasons.push("FLAT_PARAGRAPH_RHYTHM");
  }
  return named(EDITORIAL_RHYTHM_GATE, reasons);
}

export function evaluateSeoScaffoldingExposureGate(draft: OrganicDraft): OrganicNamedGate {
  const headings = contentHeadings(draft);
  const reasons: string[] = [];
  const checklistHeadings = headings.filter((h) => CHECKLIST_HEADING.test(h)).length;
  if (headings.length >= 10 && checklistHeadings >= Math.ceil(headings.length * 0.5)) {
    reasons.push("SEO_SCAFFOLDING_EXPOSED");
  }
  const faqCount = draft.visible_faqs?.length ?? 0;
  if (faqCount >= 5 && headings.length >= 12) reasons.push("SEO_SCAFFOLDING_EXPOSED");
  return named(SEO_SCAFFOLDING_EXPOSURE_GATE, reasons);
}

function normalizeForOverlap(text: string): string {
  return text.toLowerCase().replace(/\W+/g, " ").trim();
}

export function evaluateFaqRepeatsBodyGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  if (profile?.sophistication === "OPERATOR") return named(FAQ_REPEATS_BODY_GATE, []);
  const faqs = draft.visible_faqs ?? [];
  if (faqs.length < 4) return named(FAQ_REPEATS_BODY_GATE, []);
  const bodyNorm = normalizeForOverlap(draft.body);
  const reasons: string[] = [];
  let repeats = 0;
  for (const faq of faqs) {
    const answerWords = normalizeForOverlap(faq.answer).split(" ").filter((w) => w.length > 4);
    if (answerWords.length < 4) continue;
    const hit = answerWords.filter((w) => bodyNorm.includes(w)).length / answerWords.length;
    if (hit > 0.72) repeats += 1;
  }
  if (repeats >= Math.ceil(faqs.length * 0.6)) reasons.push("FAQ_REPEATS_BODY");
  return named(FAQ_REPEATS_BODY_GATE, reasons);
}

export function evaluateHolisticPublicationQualityJudge(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const text = visibleText(draft);
  const reasons: string[] = [];
  const narrativeFails = [
    evaluateBlogHeadingDensityGate(draft),
    evaluateBlogTransitionContinuityGate(draft),
    evaluateEditorialNarrativeArchitectureGate(draft),
  ].some((g) => g.result === "FAIL");

  if (narrativeFails && profile?.sophistication !== "OPERATOR") reasons.push("NOT_PUBLICATION_QUALITY");

  if (profile?.venture_id === "club-throttle") {
    const publicationFeel =
      /rider|ride|jacket|mockup|publication|lot/i.test(text)
      && evaluateBlogHeadingDensityGate(draft).result === "PASS";
    if (!publicationFeel && draft.body.split(/\s+/).length > 700) {
      reasons.push("NOT_PUBLICATION_QUALITY");
    }
  }
  if (profile?.venture_id === "occupancynpv") {
    const operatorFeel = /\$\d|noi|cap rate|debt service|operator|tenant|landlord/i.test(text);
    if (!operatorFeel && draft.body.split(/\s+/).length > 900) reasons.push("NOT_PUBLICATION_QUALITY");
  }

  const pov =
    /mockup|overrated|better bet|for most riders|operators should|buyers still|do not treat|marketing copy/i.test(text);
  if (draft.body.split(/\s+/).length > 800 && !pov) reasons.push("WEAK_POINT_OF_VIEW");

  return named(HOLISTIC_PUBLICATION_QUALITY_JUDGE, reasons);
}

export function evaluateHumanFirstEditorialQcV2(
  draft: OrganicDraft,
  profile?: VentureEditorialProfile | null,
): OrganicNamedGate {
  const resolved = profile ?? resolveVentureEditorialProfile(draft);
  if (!resolved) return named(HUMAN_FIRST_EDITORIAL_QC_V2, ["NO_EDITORIAL_PROFILE"]);
  const gates = [
    evaluateBlogHeadingDensityGate(draft),
    evaluateBlogTransitionContinuityGate(draft),
    evaluateEditorialNarrativeArchitectureGate(draft),
    evaluateEditorialPointStrengthGate(draft),
    evaluateEditorialSpecificityGate(draft),
    evaluateReaderCuriosityGate(draft),
    evaluateEditorialRhythmGate(draft),
    evaluateSeoScaffoldingExposureGate(draft),
    evaluateFaqRepeatsBodyGate(draft),
    evaluateHolisticPublicationQualityJudge(draft),
  ];
  const reasons = gates.filter((g) => g.result === "FAIL").flatMap((g) => g.reasons.filter((r) => r !== "OK"));
  return named(HUMAN_FIRST_EDITORIAL_QC_V2, [...new Set(reasons)]);
}

export function narrativeStructuralRewriteHints(reasons: string[]): string[] {
  const hints: string[] = [];
  for (const code of reasons) {
    if ((STRUCTURAL_REWRITE_FAILURE_CODES as readonly string[]).includes(code)) {
      hints.push(`STRUCTURAL_REWRITE_REQUIRED:${code}`);
    }
  }
  return hints;
}
