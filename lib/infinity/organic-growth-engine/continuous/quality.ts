import {
  ORGANIC_CONTENT_QUALITY_GATE,
  ORGANIC_EVIDENCE_GATE,
  ORGANIC_TECHNICAL_SEO_GATE,
} from "./contract";
import type { OrganicAsset, OrganicNamedGate } from "./types";

export type OrganicDraft = {
  title: string;
  meta_description: string;
  h1: string;
  headings: string[];
  body: string;
  direct_answer?: string;
  citations: Array<{
    source: string;
    source_type: "primary" | "authority" | "secondary" | "invented";
    published_at?: string;
    retrieved_at: string;
    claim: string;
  }>;
  schema: string[];
  canonical: string;
  breadcrumbs: string[];
  internal_links: string[];
  word_count: number;
  visible_faqs?: Array<{ question: string; answer: string }>;
  speakable_selectors?: string[];
  date_published?: string;
  date_modified?: string;
  page_kind?: "EVERGREEN_RESOURCE" | "BLOG_ARTICLE" | "SERVICE_PAGE" | "BLOG_INDEX" | "TOPIC_HUB" | "GENERIC";
  origin?: string;
  about?: string[];
  mentions?: string[];
};

export function planGeoAnswer(input: { question: string; topic: string; entity: string }): {
  direct_answer: string;
  headings: string[];
  entity_context: string;
  freshness_note: string;
} {
  return {
    direct_answer: `${input.question.replace(/\?+$/, "")} is explained in the context of ${input.entity}.`,
    headings: [
      `What is ${input.topic}?`,
      `How ${input.topic} is calculated`,
      `Why ${input.topic} matters`,
      `Related ${input.entity} concepts`,
    ],
    entity_context: input.entity,
    freshness_note: "Include last reviewed date and source retrieval dates.",
  };
}

export function evaluateOrganicContentQualityGate(
  draft: OrganicDraft,
  extras?: { complexity?: "SIMPLE" | "MODERATE" | "COMPLEX" },
): OrganicNamedGate {
  const reasons: string[] = [];
  const text = `${draft.h1} ${draft.headings.join(" ")} ${draft.body}`;
  const titleProbe = `${draft.h1} ${draft.title}`.replace(/occupancynpv/gi, " ");
  const complex = extras?.complexity === "COMPLEX" || /cap rate|\bnoi\b|\bnpv\b|valuation/i.test(titleProbe);
  if (draft.word_count < 250 || draft.body.trim().length < 250) reasons.push("thin");
  if (complex && draft.word_count < 350 && !/example|limit/i.test(text)) reasons.push("thin");
  if (/lorem ipsum|as an ai|in today's fast-paced/i.test(draft.body)) reasons.push("obviously_ai_filler");
  if (!draft.h1.trim() || draft.h1 === draft.title && draft.headings.length < 2) reasons.push("weak_structure");
  if (draft.headings.length < 2) reasons.push("weak_structure");
  if (!draft.direct_answer && draft.word_count < 800) reasons.push("unclear_intent");
  if (draft.internal_links.length < 2) reasons.push("missing_internal_links");
  if (!draft.canonical.startsWith("/")) reasons.push("wrong_url_placement");
  if (genericScore(draft.body) > 0.8) reasons.push("generic");
  if (complex && !/example|sample|\$\s*\d|percent/i.test(text)) reasons.push("missing_examples");
  if (complex && !/limit|does not|not a full/i.test(text)) reasons.push("missing_limitations");
  if (complex && !/related|compare|versus|npv|cash-on-cash|irr|mistake/i.test(text)) reasons.push("missing_related_question_coverage");
  if (complex && !/noi|vacancy|operating expenses|property value|interest/i.test(text)) reasons.push("missing_core_entities");
  const focus = draft.h1
    .toLowerCase()
    .split(/\s+/)
    .find((word) => word.length >= 3 && !/^(how|what|when|where|which|does|with|from|this|that|calculated)$/.test(word));
  if (focus && draft.body.split(/\s+/).filter((word) => word.toLowerCase().replace(/[^a-z]/g, "") === focus.replace(/[^a-z]/g, "")).length > 28) {
    reasons.push("keyword_stuffing");
  }
  if (!draft.meta_description || draft.meta_description.length < 40) reasons.push("adds_no_meaningful_value");
  return {
    gate: ORGANIC_CONTENT_QUALITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

function genericScore(body: string): number {
  const generic = ["unlock your potential", "in conclusion", "it is important to note", "comprehensive guide"];
  const hits = generic.filter((phrase) => body.toLowerCase().includes(phrase)).length;
  return hits / generic.length;
}

export function evaluateOrganicEvidenceGate(draft: OrganicDraft, required: boolean): OrganicNamedGate {
  if (!required) {
    return { gate: ORGANIC_EVIDENCE_GATE, result: "PASS", reasons: ["not_required"] };
  }
  const reasons: string[] = [];
  if (!draft.citations.length) reasons.push("poor_evidence");
  if (draft.citations.some((row) => row.source_type === "invented" || !row.source.trim())) reasons.push("invented_citations");
  if (draft.citations.some((row) => !row.claim.trim())) reasons.push("unlinked_claims");
  const stale = draft.citations.filter((row) => {
    if (!row.published_at || row.source_type === "authority" || row.source_type === "primary") return false;
    return Date.parse(row.retrieved_at) - Date.parse(row.published_at) > 1000 * 60 * 60 * 24 * 365 * 3;
  });
  if (stale.length && /rate|tax|regulation|medical|legal/.test(draft.body.toLowerCase())) reasons.push("stale_sources");
  return {
    gate: ORGANIC_EVIDENCE_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateOrganicTechnicalSeoGate(input: {
  asset: OrganicAsset;
  draft: OrganicDraft;
  status_code?: number;
  robots?: string;
  sitemap?: boolean;
  renderable?: boolean;
  mobile?: boolean;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.draft.canonical) reasons.push("missing_canonical");
  if ((input.status_code ?? 200) !== 200) reasons.push("bad_status_code");
  if ((input.robots ?? "index,follow").includes("noindex")) reasons.push("robots_noindex");
  if (input.sitemap === false) reasons.push("missing_sitemap");
  if (!input.draft.schema.length) reasons.push("missing_schema");
  if (input.draft.schema.includes("HowTo") && !/step|how to/i.test(input.draft.body)) reasons.push("invalid_howto_schema");
  if (!input.draft.breadcrumbs.length) reasons.push("broken_breadcrumbs");
  if (!input.draft.title || !input.draft.meta_description) reasons.push("missing_metadata");
  if (input.renderable === false) reasons.push("not_renderable");
  if (input.mobile === false) reasons.push("mobile_incompatible");
  return {
    gate: ORGANIC_TECHNICAL_SEO_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function recommendOrganicSchema(contentType: OrganicAsset["content_type"]): string[] {
  const base = ["Organization", "WebSite", "WebPage", "BreadcrumbList"];
  if (contentType === "BLOG" || contentType === "TIMELY_EDITORIAL") return [...base, "BlogPosting", "SpeakableSpecification", "FAQPage"];
  if (contentType === "FAQ") return [...base, "FAQPage", "SpeakableSpecification"];
  if (contentType === "GUIDE" || contentType === "EVERGREEN_QUESTION") return [...base, "Article", "SpeakableSpecification", "FAQPage"];
  if (contentType === "COMMERCIAL_INTENT") return [...base, "Service", "SpeakableSpecification", "FAQPage"];
  if (contentType === "PILLAR" || contentType === "CLUSTER_HUB") return [...base, "CollectionPage"];
  return base;
}

export function evidenceRequiredFor(topic: string): boolean {
  return /medical|legal|financ|tax|cap rate|noi|regulated|interest rate/.test(topic.toLowerCase());
}
