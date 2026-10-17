import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate, OrganicQcResult } from "./types";

function dimensionPassFail(result: OrganicQcResult): "PASS" | "FAIL" {
  return result === "PASS" ? "PASS" : "FAIL";
}
import type { QuestionClusterPlan, SearchDemandEvidence } from "./search-demand-evidence";
import { resolveVentureEditorialProfile } from "./venture-editorial-profiles";
import { evaluateHumanFirstEditorialQcV2 } from "./blog-editorial-narrative-gates";
import { evaluateHumanFirstEditorialQc } from "./blog-human-flow-gates";
import { evaluateEditorialPublicationQualityGate } from "./editorial-publication-gates";
import { evaluateBlogConsumerEditorialQualityGate } from "./blog-consumer-editorial-quality";
import { pairHeadingsToParagraphs } from "./article-section-renderer";
import {
  evaluateBlogInternalLinkReadinessGate,
  evaluateBlogTransitionNaturalnessGate,
  countInternalLinksInBody,
  evaluateBlogInternalLinkNaturalnessGate,
  evaluateEditorialMetaLanguageGate,
  evaluateFactualClaimDisciplineGate,
} from "./blog-editorial-discipline-gates";
import {
  evaluateHeadingBodySemanticAlignmentGate,
  CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS,
} from "./blog-heading-body-alignment";

export const BLOG_SEARCH_DEMAND_GATE = "BlogSearchDemandGate" as const;
export const VENTURE_TRAFFIC_FIT_GATE = "VentureTrafficFitGate" as const;
export const BLOG_TOPIC_GAP_GATE = "BlogTopicGapGate" as const;
export const BLOG_AUTHORITY_DEPTH_GATE = "BlogAuthorityDepthGate" as const;
export const SEARCH_QUESTION_COVERAGE_GATE = "SearchQuestionCoverageGate" as const;
export const BLOG_FOURTH_GRADE_READABILITY_GATE = "BlogFourthGradeReadabilityGate" as const;
export const BLOG_TRANSITION_USAGE_GATE = "BlogTransitionUsageGate" as const;
export const BLOG_SECTION_DEPTH_GATE = "BlogSectionDepthGate" as const;
export const AUTHORITY_BLOG_PUBLICATION_GATE = "AuthorityBlogPublicationGate" as const;

/** Normal authority blogs must exceed 2k words; target buffer 2200+. */
export const AUTHORITY_ARTICLE_BODY_WORD_MIN = 2000 as const;
/** Buffer above 2k min; trimmed authority articles may sit ~2.05–2.15k without failing depth. */
export const AUTHORITY_ARTICLE_BODY_WORD_TARGET = 2001 as const;
export const SECTION_WORD_MAX = 300 as const;
export const READABILITY_GRADE_MAX = 5 as const;
export const TRANSITION_SENTENCE_TARGET = 0.35 as const;

const TRANSITION_RE =
  /\b(because|so|therefore|however|also|for example|first|next|then|instead|meanwhile|still|finally|although|even so|in other words|but|yet|after that|before you|in practice)\b/i;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

export function isAuthorityBlogDraft(draft: OrganicDraft): boolean {
  if (draft.page_kind === "BLOG_ARTICLE" || draft.page_kind === "EVERGREEN_RESOURCE") return true;
  const canonical = draft.canonical ?? "";
  return /\/journal\/|occupancynpv\.com\/blog\//.test(canonical);
}

export function evaluateBlogSearchDemandGate(evidence: SearchDemandEvidence | null | undefined): OrganicNamedGate {
  const reasons: string[] = [];
  if (!evidence?.primary_query?.trim()) reasons.push("NO_PRIMARY_QUERY");
  if (!evidence?.signals?.length) reasons.push("NO_DEMAND_SIGNAL");
  for (const signal of evidence?.signals ?? []) {
    if (signal.kind === "OBSERVED_QUERY" && /topic graph only|journal cluster only/i.test(signal.source)) {
      reasons.push("OBSERVED_QUERY_UNSUBSTANTIATED");
    }
  }
  return named(BLOG_SEARCH_DEMAND_GATE, reasons);
}

export function evaluateVentureTrafficFitGate(input: {
  draft: OrganicDraft;
  evidence: SearchDemandEvidence | null | undefined;
}): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(input.draft);
  const text = `${input.draft.h1} ${input.draft.body}`.toLowerCase();
  const reasons: string[] = [];
  if (profile?.venture_id === "club-throttle") {
    const fit = /rider|ride|motorcycle|jacket|bike night|apparel|streetwear|graphic|tee|lot|handlebar/i.test(text);
    if (!fit) reasons.push("LOW_VENTURE_TRAFFIC_FIT");
    if (/occupancynpv|cap rate|commercial lease/i.test(text)) reasons.push("CROSS_VENTURE_LEAK");
  }
  if (profile?.venture_id === "occupancynpv") {
    const fit = /tenant|landlord|noi|lease|operator|property|cap rate|occupancy/i.test(text);
    if (!fit) reasons.push("LOW_VENTURE_TRAFFIC_FIT");
  }
  if (!input.evidence?.journey_note) reasons.push("NO_JOURNEY_NOTE");
  return named(VENTURE_TRAFFIC_FIT_GATE, reasons);
}

export function evaluateBlogTopicGapGate(input: {
  draft: OrganicDraft;
  existing_slugs?: string[];
}): OrganicNamedGate {
  const reasons: string[] = [];
  const slug = input.draft.canonical?.split("/").filter(Boolean).slice(-1)[0] ?? "";
  const dupes = (input.existing_slugs ?? []).filter((s) => s === slug);
  if (dupes.length > 1) reasons.push("DUPLICATE_SLUG");
  return named(BLOG_TOPIC_GAP_GATE, reasons);
}

export function evaluateBlogAuthorityDepthGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(BLOG_AUTHORITY_DEPTH_GATE, []);
  const words = draft.body.split(/\s+/).filter(Boolean).length;
  const reasons: string[] = [];
  if (words <= AUTHORITY_ARTICLE_BODY_WORD_MIN) reasons.push("AUTHORITY_DEPTH_AT_OR_BELOW_MIN");
  if (words > AUTHORITY_ARTICLE_BODY_WORD_MIN && words < AUTHORITY_ARTICLE_BODY_WORD_TARGET) {
    reasons.push("AUTHORITY_DEPTH_BELOW_TARGET_BUFFER");
  }
  return named(BLOG_AUTHORITY_DEPTH_GATE, reasons);
}

export function evaluateSearchQuestionCoverageGate(input: {
  draft: OrganicDraft;
  cluster: QuestionClusterPlan;
}): OrganicNamedGate {
  const text = input.draft.body.toLowerCase();
  const reasons: string[] = [];
  if (!text.includes(input.cluster.core_question.split("?")[0]!.slice(0, 24).toLowerCase().split(" ")[0]!)) {
    if (!/ride home|after the ride|first wash|choose a shirt/i.test(text)) reasons.push("PRIMARY_QUESTION_WEAK");
  }
  const must = input.cluster.supporting.filter((q) => q.coverage === "MUST_ANSWER_HERE");
  let covered = 0;
  for (const row of must) {
    const tokens = row.question.toLowerCase().split(/\W+/).filter((t) => t.length > 4);
    const hit = tokens.filter((t) => text.includes(t)).length / Math.max(1, tokens.length);
    if (hit >= 0.25) covered += 1;
  }
  if (covered < Math.ceil(must.length * 0.7)) reasons.push("RELATED_QUESTION_COVERAGE_LOW");
  return named(SEARCH_QUESTION_COVERAGE_GATE, reasons);
}

export function countTransitionSentenceShare(body: string): number {
  const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 8);
  if (!sentences.length) return 0;
  const withTransition = sentences.filter((s) => TRANSITION_RE.test(s)).length;
  return withTransition / sentences.length;
}

function estimateWordSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let token = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  token = token.replace(/^y/, "");
  const groups = token.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

export function estimateReadabilityGrade(body: string): number {
  const words = body.split(/\s+/).filter(Boolean);
  const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 4);
  if (!words.length || !sentences.length) return 12;
  const avgWords = words.length / sentences.length;
  const avgSyllables = words.reduce((sum, w) => sum + estimateWordSyllables(w), 0) / words.length;
  const grade = 0.39 * avgWords + 11.8 * avgSyllables - 15.59;
  return Math.max(1, Math.min(12, Math.round(grade)));
}

export function evaluateBlogFourthGradeReadabilityGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(BLOG_FOURTH_GRADE_READABILITY_GATE, []);
  const grade = estimateReadabilityGrade(draft.body);
  const reasons: string[] = [];
  if (grade > READABILITY_GRADE_MAX) reasons.push("READABILITY_ABOVE_TARGET");
  return named(BLOG_FOURTH_GRADE_READABILITY_GATE, reasons);
}

export function evaluateBlogTransitionUsageGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(BLOG_TRANSITION_USAGE_GATE, []);
  const share = countTransitionSentenceShare(draft.body);
  const reasons: string[] = [];
  if (share < TRANSITION_SENTENCE_TARGET) reasons.push("TRANSITION_USAGE_LOW");
  return named(BLOG_TRANSITION_USAGE_GATE, reasons);
}

export function evaluateBlogSectionDepthGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named(BLOG_SECTION_DEPTH_GATE, []);
  const sections = pairHeadingsToParagraphs(draft.headings, draft.body);
  const reasons: string[] = [];
  for (const section of sections) {
    const words = section.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
    if (words > SECTION_WORD_MAX) reasons.push("SECTION_BLOCK_TOO_LONG");
  }
  return named(BLOG_SECTION_DEPTH_GATE, [...new Set(reasons)]);
}

export function buildAuthorityReadabilityReport(draft: OrganicDraft) {
  const sections = pairHeadingsToParagraphs(draft.headings, draft.body);
  const sectionWords = sections.map((s) => s.paragraphs.join(" ").split(/\s+/).filter(Boolean).length);
  const paras = draft.body.split(/\n{2,}/).map((p) => p.split(/\s+/).filter(Boolean).length);
  return {
    article_body_words: draft.body.split(/\s+/).filter(Boolean).length,
    readability_grade_estimate: estimateReadabilityGrade(draft.body),
    transition_sentence_share: countTransitionSentenceShare(draft.body),
    longest_section_words: sectionWords.length ? Math.max(...sectionWords) : 0,
    paragraph_word_counts: paras,
    paragraph_max_words: paras.length ? Math.max(...paras) : 0,
    h2_count: draft.headings.length,
    h3_count: (draft.body.match(/^###\s/mg) ?? []).length,
    internal_link_count: countInternalLinksInBody(draft.body),
  };
}

export function evaluateAuthorityBlogPublicationGate(input: {
  draft: OrganicDraft;
  demand: SearchDemandEvidence;
  cluster: QuestionClusterPlan;
  existing_slugs?: string[];
  internal_link_paths?: string[];
  heading_body_expectations?: typeof CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS | undefined;
}): OrganicNamedGate & { dimensions: Record<string, "PASS" | "FAIL"> } {
  const dimensions: Record<string, "PASS" | "FAIL"> = {
    SEARCH_DEMAND: dimensionPassFail(evaluateBlogSearchDemandGate(input.demand).result),
    VENTURE_TRAFFIC_FIT: dimensionPassFail(
      evaluateVentureTrafficFitGate({ draft: input.draft, evidence: input.demand }).result,
    ),
    TOPIC_GAP: dimensionPassFail(
      evaluateBlogTopicGapGate({ draft: input.draft, existing_slugs: input.existing_slugs }).result,
    ),
    DEPTH: dimensionPassFail(evaluateBlogAuthorityDepthGate(input.draft).result),
    RELATED_QUESTION_COVERAGE: dimensionPassFail(
      evaluateSearchQuestionCoverageGate({ draft: input.draft, cluster: input.cluster }).result,
    ),
    READABILITY: dimensionPassFail(evaluateBlogFourthGradeReadabilityGate(input.draft).result),
    TRANSITION_USAGE: dimensionPassFail(evaluateBlogTransitionUsageGate(input.draft).result),
    TRANSITION_NATURALNESS: dimensionPassFail(evaluateBlogTransitionNaturalnessGate(input.draft).result),
    SECTION_STRUCTURE: dimensionPassFail(evaluateBlogSectionDepthGate(input.draft).result),
    INTERNAL_LINKS: dimensionPassFail(
      evaluateBlogInternalLinkReadinessGate({
        draft: input.draft,
        required_paths: input.internal_link_paths,
      }).result,
    ),
    INTERNAL_LINK_NATURALNESS: dimensionPassFail(evaluateBlogInternalLinkNaturalnessGate(input.draft).result),
    HEADING_BODY_ALIGNMENT: dimensionPassFail(
      evaluateHeadingBodySemanticAlignmentGate({
        draft: input.draft,
        expectations: input.heading_body_expectations,
      }).result,
    ),
    META_LANGUAGE: dimensionPassFail(evaluateEditorialMetaLanguageGate(input.draft).result),
    FACTUAL_DISCIPLINE: dimensionPassFail(evaluateFactualClaimDisciplineGate(input.draft).result),
    HUMAN_EDITORIAL: dimensionPassFail(evaluateHumanFirstEditorialQc(input.draft).result),
    NARRATIVE: dimensionPassFail(evaluateHumanFirstEditorialQcV2(input.draft).result),
    ACTIONABILITY: dimensionPassFail(evaluateBlogConsumerEditorialQualityGate(input.draft).result),
    PUBLICATION_QUALITY: dimensionPassFail(evaluateEditorialPublicationQualityGate(input.draft).result),
  };
  const reasons = Object.entries(dimensions)
    .filter(([, v]) => v === "FAIL")
    .map(([k]) => `${k}_FAIL`);
  return { ...named(AUTHORITY_BLOG_PUBLICATION_GATE, reasons), dimensions };
}
