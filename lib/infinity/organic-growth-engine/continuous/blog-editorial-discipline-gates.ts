import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { isAuthorityBlogDraft } from "./blog-authority-gates";

export const EDITORIAL_META_LANGUAGE_GATE = "EditorialMetaLanguageGate" as const;
export const FACTUAL_CLAIM_DISCIPLINE_GATE = "FactualClaimDisciplineGate" as const;
export const BLOG_TRANSITION_NATURALNESS_GATE = "BlogTransitionNaturalnessGate" as const;
export const BLOG_INTERNAL_LINK_READINESS_GATE = "BlogInternalLinkReadinessGate" as const;
export const BLOG_INTERNAL_LINK_NATURALNESS_GATE = "BlogInternalLinkNaturalnessGate" as const;

const SEO_LINK_SCAFFOLD =
  /\b(compare layers with|Many riders compare|is about safety and respect, but|\) covers how to show up|\) explains what lifestyle)\s*\[|\[([^\]]+)\]\([^)]+\)\s+(covers|explains|is about)\b/i;

const META_LANGUAGE =
  /\b(this piece answers|this article (will|shows|explains)|one connected story|spec dump|in this guide|we cover|these sections|the goal of this (page|article)|not a formality|your tired future self|that is the whole game|earned that clarity through miles)\b/i;

const UNSUPPORTED_INTENT_CLAIMS =
  /\b(assume the blank was chosen for cost|designed for a mockup,? not for your bars|brands deliberately|manufacturers choose cost over riders)\b/i;

const GENERATED_APHORISM_STACK =
  /\b(the closet does not lie|marketing copy sells the mockup\. your weekend sells the truth|trust the grab-and-go test)\b/i;

const MECHANICAL_TRANSITION_START =
  /^\s*(Therefore|Meanwhile|Also,|So,|First,|Next,|Then,|Still,|Finally,|For example,|Because,)\b/i;

function isClubThrottleShirtArticle(draft: OrganicDraft): boolean {
  return draft.canonical?.includes("/journal/apparel/how-riders-choose-a-shirt") === true;
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

export function evaluateEditorialMetaLanguageGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(EDITORIAL_META_LANGUAGE_GATE, []);
  const text = `${draft.h1}\n${draft.body}`;
  const reasons: string[] = [];
  if (META_LANGUAGE.test(text)) reasons.push("EDITORIAL_META_LANGUAGE");
  if (/\bthis piece\b/i.test(text)) reasons.push("EDITORIAL_META_LANGUAGE");
  return named(EDITORIAL_META_LANGUAGE_GATE, [...new Set(reasons)]);
}

export function evaluateFactualClaimDisciplineGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(FACTUAL_CLAIM_DISCIPLINE_GATE, []);
  const reasons: string[] = [];
  if (UNSUPPORTED_INTENT_CLAIMS.test(draft.body)) reasons.push("UNSUPPORTED_BRAND_INTENT_CLAIM");
  if (GENERATED_APHORISM_STACK.test(draft.body) && (draft.body.match(/—/g) ?? []).length >= 8) {
    reasons.push("APHORISM_STACK");
  }
  return named(FACTUAL_CLAIM_DISCIPLINE_GATE, reasons);
}

export function evaluateBlogTransitionNaturalnessGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(BLOG_TRANSITION_NATURALNESS_GATE, []);
  const sentences = draft.body.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 8);
  const transitionRe =
    /\b(because|so|therefore|however|also|for example|first|next|then|instead|meanwhile|still|finally|although|even so|in other words|but|yet|after that|before you|in practice)\b/i;
  const transitionSentences = sentences.filter((s) => transitionRe.test(s));
  if (!transitionSentences.length) return named(BLOG_TRANSITION_NATURALNESS_GATE, ["NO_TRANSITIONS"]);
  const mechanical = transitionSentences.filter((s) => MECHANICAL_TRANSITION_START.test(s)).length;
  const reasons: string[] = [];
  if (mechanical / transitionSentences.length > 0.42) reasons.push("TRANSITION_MECHANICAL_DENSITY");
  const openers = sentences.filter((s) => MECHANICAL_TRANSITION_START.test(s)).length;
  if (openers / sentences.length > 0.22) reasons.push("TRANSITION_OPENER_STUFFING");
  if (isClubThrottleShirtArticle(draft)) {
    const becauseOpeners = sentences.filter((s) => /^\s*Because\b/i.test(s)).length;
    if (becauseOpeners >= 3) reasons.push("TRANSITION_TOKEN_PADDING");
    if (/Before you buy again, run the five-stage test/i.test(draft.body)) {
      reasons.push("CONCLUSION_OVEREXPLAINED");
    }
  }
  return named(BLOG_TRANSITION_NATURALNESS_GATE, reasons);
}

export function countInternalLinksInBody(body: string): number {
  return (body.match(/\]\(\/journal\/[^)]+\)/g) ?? []).length;
}

export function evaluateBlogInternalLinkNaturalnessGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(BLOG_INTERNAL_LINK_NATURALNESS_GATE, []);
  const reasons: string[] = [];
  if (SEO_LINK_SCAFFOLD.test(draft.body)) reasons.push("INTERNAL_LINK_SCAFFOLD");
  if (/\bMany riders compare layers with \[/i.test(draft.body)) reasons.push("INTERNAL_LINK_SCAFFOLD");
  if (/\) is about safety and respect, but the same night/i.test(draft.body)) reasons.push("INTERNAL_LINK_SCAFFOLD");
  return named(BLOG_INTERNAL_LINK_NATURALNESS_GATE, reasons);
}

export function evaluateBlogInternalLinkReadinessGate(input: {
  draft: OrganicDraft;
  required_paths?: string[];
  min_links?: number;
}): OrganicNamedGate {
  if (!isAuthorityBlogDraft(input.draft)) return named(BLOG_INTERNAL_LINK_READINESS_GATE, []);
  const min = input.min_links ?? 3;
  const count = countInternalLinksInBody(input.draft.body);
  const reasons: string[] = [];
  if (count < min) reasons.push("INTERNAL_LINKS_LOW");
  const required = input.required_paths ?? [];
  for (const path of required) {
    if (!input.draft.body.includes(path)) reasons.push("MISSING_TOPIC_GRAPH_LINK");
  }
  return named(BLOG_INTERNAL_LINK_READINESS_GATE, [...new Set(reasons)]);
}
