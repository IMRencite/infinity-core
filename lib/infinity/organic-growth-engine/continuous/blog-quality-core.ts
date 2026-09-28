import { evaluateVisualBrandConsistency, type VisualPurpose } from "@/lib/infinity/commerce/brand/venture-visual-brand-profile";
import { BLOG_CONTENT_QUALITY_GATE, BLOG_VISUAL_ASSET_GATE } from "./contract";
import { clusterQuestionCoverage } from "./blog-ux";
import { resolveContentCoveragePlan, type ContentCoveragePlan } from "./content-coverage-plan";
import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";

export const BLOG_CONTENT_QUALITY_GATE_VERSION = "blog-content-qc-v2" as const;

export type CoverageVerdict = "COMPLETE" | "INCOMPLETE" | "PASS" | "FAIL" | "SUFFICIENT" | "INSUFFICIENT" | "MISSING" | "NOT_APPLICABLE" | "NO" | "YES";

export type BlogContentQualityV2Report = {
  gate: typeof BLOG_CONTENT_QUALITY_GATE;
  version: typeof BLOG_CONTENT_QUALITY_GATE_VERSION;
  result: "PASS" | "FAIL";
  reasons: string[];
  plan_id: string;
  dimensions: {
    primary_answer: "COMPLETE" | "INCOMPLETE";
    question_cluster: "COMPLETE" | "INCOMPLETE";
    topical_depth: "PASS" | "FAIL";
    practical_value: "PASS" | "FAIL";
    specificity: "PASS" | "FAIL";
    examples: "SUFFICIENT" | "INSUFFICIENT" | "NOT_APPLICABLE";
    calculations: "PASS" | "MISSING" | "NOT_APPLICABLE";
    tables_comparisons: "PASS" | "MISSING" | "NOT_APPLICABLE";
    definitions: "PASS" | "FAIL";
    common_mistakes: "PASS" | "MISSING" | "NOT_APPLICABLE";
    edge_cases: "PASS" | "MISSING" | "NOT_APPLICABLE";
    decision_support: "PASS" | "FAIL";
    limitations: "PASS" | "FAIL";
    internal_links: "PASS" | "FAIL";
    evidence: "PASS" | "FAIL";
    ai_note_style: "NO" | "YES";
    thinness: "NO" | "YES";
  };
};

function textOf(draft: OrganicDraft): string {
  return `${draft.h1} ${draft.headings.join(" ")} ${draft.body} ${draft.direct_answer ?? ""} ${(draft.visible_faqs ?? []).map((row) => `${row.question} ${row.answer}`).join(" ")}`;
}

function hasAll(text: string, tokens: string[], min = tokens.length): boolean {
  const lower = text.toLowerCase();
  const hits = tokens.filter((token) => phraseCovered(lower, token));
  return hits.length >= min;
}

function phraseCovered(lower: string, phrase: string): boolean {
  if (lower.includes(phrase.toLowerCase())) return true;
  const parts = phrase.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  if (parts.length === 0) return lower.includes(phrase.toLowerCase());
  return parts.filter((word) => lower.includes(word)).length >= Math.min(2, parts.length);
}

export function evaluateBlogContentQualityV2(
  draft: OrganicDraft,
  plan = resolveContentCoveragePlan(draft),
): BlogContentQualityV2Report {
  const text = textOf(draft);
  const reasons: string[] = [];
  const must = plan.cluster.questions.filter((row) => row.role === "PRIMARY" || row.role === "MUST_ANSWER");
  const secondary = plan.cluster.questions.filter((row) => row.role === "HIGH_VALUE_SECONDARY");
  const mustCovered = must.filter((row) => clusterQuestionCoverage(text, row, draft.internal_links).substantial);
  const secondaryCovered = secondary.filter((row) => clusterQuestionCoverage(text, row, draft.internal_links).covered);

  const primaryComplete = Boolean(draft.direct_answer && draft.direct_answer.length >= 80)
    && must.filter((row) => row.role === "PRIMARY").every((row) => clusterQuestionCoverage(text, row, draft.internal_links).substantial);
  if (!primaryComplete) reasons.push("PRIMARY_ANSWER_INCOMPLETE");

  const clusterComplete = must.length > 0 && mustCovered.length === must.length && (secondary.length === 0 || secondaryCovered.length >= Math.ceil(secondary.length * 0.6));
  if (!clusterComplete) reasons.push("QUESTION_CLUSTER_INCOMPLETE");

  const depthPass = draft.headings.length >= 8
    && plan.definitions_needed.filter((row) => text.toLowerCase().includes(row.toLowerCase())).length >= Math.min(4, plan.definitions_needed.length)
    && (plan.follow_up_questions.length === 0 || secondaryCovered.length >= 2);
  if (!depthPass) reasons.push("TOPICAL_DEPTH_FAIL");

  const practicalPass = hasAll(text, ["checklist", "stress-test"], 1)
    && plan.practical_next_steps.some((step) => text.toLowerCase().includes(step.split(" ").slice(0, 3).join(" ").toLowerCase()));
  if (!practicalPass) reasons.push("PRACTICAL_VALUE_FAIL");

  const specificityPass = /\$\s*\d|\d+\s*percent|\d{1,3}(?:,\d{3})+/.test(text)
    && !/in today's fast-paced|unlock your potential|comprehensive guide to everything/i.test(text);
  if (!specificityPass) reasons.push("SPECIFICITY_FAIL");

  const exampleNeeded = plan.examples_needed.length > 0;
  const examples = exampleNeeded
    ? (hasAll(text, plan.examples_needed, Math.min(2, plan.examples_needed.length)) ? "SUFFICIENT" : "INSUFFICIENT")
    : "NOT_APPLICABLE";
  if (examples === "INSUFFICIENT") reasons.push("EXAMPLES_INSUFFICIENT");

  const calcNeeded = plan.calculations_needed.length > 0;
  const calculations = !calcNeeded
    ? "NOT_APPLICABLE"
    : hasAll(text, plan.calculations_needed, Math.min(2, plan.calculations_needed.length))
      ? "PASS"
      : "MISSING";
  if (calculations === "MISSING") reasons.push("CALCULATIONS_MISSING");

  const tableNeeded = plan.tables_needed.length > 0;
  const tables = !tableNeeded
    ? "NOT_APPLICABLE"
    : (plan.tables_needed.some((label) => text.toLowerCase().includes(label.toLowerCase())) || /<table|occupancy-cost table|estimate vs stop vs base year/i.test(text))
      ? "PASS"
      : "MISSING";
  if (tables === "MISSING") reasons.push("TABLES_COMPARISONS_MISSING");

  const definitionsPass = plan.definitions_needed.length === 0
    || plan.definitions_needed.filter((row) => text.toLowerCase().includes(row.toLowerCase())).length >= Math.min(5, plan.definitions_needed.length);
  if (!definitionsPass) reasons.push("DEFINITIONS_FAIL");

  const mistakesNeeded = plan.common_mistakes.length > 0;
  const mistakes = !mistakesNeeded
    ? "NOT_APPLICABLE"
    : /mistake|misconception|confus/i.test(text) && hasAll(text, plan.common_mistakes, 2)
      ? "PASS"
      : "MISSING";
  if (mistakes === "MISSING") reasons.push("COMMON_MISTAKES_MISSING");

  const edgeNeeded = plan.edge_cases.length > 0;
  const edges = !edgeNeeded
    ? "NOT_APPLICABLE"
    : hasAll(text, plan.edge_cases, Math.min(2, plan.edge_cases.length))
      ? "PASS"
      : "MISSING";
  if (edges === "MISSING") reasons.push("EDGE_CASES_MISSING");

  const decisionPass = plan.decisions.length === 0
    || plan.decisions.filter((row) => phraseCovered(text.toLowerCase(), row)).length >= Math.min(2, plan.decisions.length);
  if (!decisionPass) reasons.push("DECISION_SUPPORT_FAIL");

  const limitationsPass = /limit|does not|not legal advice|not automatically|not a finished bill|not a property cap rate/i.test(text);
  if (!limitationsPass) reasons.push("LIMITATIONS_FAIL");

  const linksPass = draft.internal_links.length >= 3
    && plan.internal_link_opportunities.filter((url) => draft.internal_links.some((link) => link === url || link.includes(url.replace(/\/+$/, "")))).length >= Math.min(3, plan.internal_link_opportunities.length);
  if (!linksPass) reasons.push("INTERNAL_LINKS_FAIL");

  const evidencePass = draft.citations.length >= 2 && draft.citations.every((row) => row.source_type !== "invented" && /^https?:\/\//.test(row.source));
  if (!evidencePass) reasons.push("EVIDENCE_FAIL");

  const aiNote = /as an ai|in today's fast-paced|unlock your potential|comprehensive guide|in conclusion, it is important/i.test(text);
  if (aiNote) reasons.push("AI_NOTE_STYLE");

  const thin = !clusterComplete || !depthPass || examples === "INSUFFICIENT" || tables === "MISSING" || !decisionPass;
  if (thin) reasons.push("THINNESS");

  const dimensions = {
    primary_answer: primaryComplete ? "COMPLETE" : "INCOMPLETE",
    question_cluster: clusterComplete ? "COMPLETE" : "INCOMPLETE",
    topical_depth: depthPass ? "PASS" : "FAIL",
    practical_value: practicalPass ? "PASS" : "FAIL",
    specificity: specificityPass ? "PASS" : "FAIL",
    examples,
    calculations,
    tables_comparisons: tables,
    definitions: definitionsPass ? "PASS" : "FAIL",
    common_mistakes: mistakes,
    edge_cases: edges,
    decision_support: decisionPass ? "PASS" : "FAIL",
    limitations: limitationsPass ? "PASS" : "FAIL",
    internal_links: linksPass ? "PASS" : "FAIL",
    evidence: evidencePass ? "PASS" : "FAIL",
    ai_note_style: aiNote ? "YES" : "NO",
    thinness: thin ? "YES" : "NO",
  } as const;

  return {
    gate: BLOG_CONTENT_QUALITY_GATE,
    version: BLOG_CONTENT_QUALITY_GATE_VERSION,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
    plan_id: plan.plan_id,
    dimensions,
  };
}

export function evaluateBlogContentQualityGate(draft: OrganicDraft, plan?: ContentCoveragePlan): OrganicNamedGate {
  const report = evaluateBlogContentQualityV2(draft, plan);
  return { gate: BLOG_CONTENT_QUALITY_GATE, result: report.result, reasons: report.reasons };
}

export function evaluateBlogVisualAssetGate(input: {
  featured_image?: string;
  featured_alt?: string;
  supporting_visual?: boolean;
  broken?: boolean;
  generic_filler?: boolean;
  required?: boolean;
  venture_id?: string;
  visual_role?: VisualPurpose;
  featured_source?: string;
  sibling_featured_images?: string[];
}): OrganicNamedGate {
  const reasons: string[] = [];
  const required = input.required !== false;
  if (required && !input.featured_image) reasons.push("featured_image_missing");
  if (input.featured_image && !input.featured_alt) reasons.push("alt_text_missing");
  if (input.broken) reasons.push("broken_image");
  if (input.generic_filler) reasons.push("generic_filler_image");
  if (required && input.supporting_visual === false) reasons.push("supporting_visual_missing");
  const role = input.visual_role ?? "FEATURED_EDITORIAL_IMAGE";
  if (input.featured_image && role === "FEATURED_EDITORIAL_IMAGE") {
    const ventureId = input.venture_id
      ?? (input.featured_image.startsWith("/visual/journal-") ? "club-throttle" : "occupancynpv");
    const brand = evaluateVisualBrandConsistency({
      venture_id: ventureId,
      visual_role: role,
      featured_image: input.featured_image,
      featured_source: input.featured_source,
      sibling_featured_images: input.sibling_featured_images,
    });
    if (brand.result === "FAIL") reasons.push(...brand.reasons.filter((reason) => reason !== "featured_image_missing"));
  }
  return { gate: BLOG_VISUAL_ASSET_GATE, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}
