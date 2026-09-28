import type { OrganicDraft } from "./quality";
import type { ContentCoveragePlan } from "./content-coverage-plan";
import type { OrganicNamedGate } from "./types";

export const CONTENT_QUALITY_V4 = "content-quality-framework-v4" as const;
export const SUBSTANTIVE_WORD_FLOOR = 2000 as const;

export const UTILITY_PAGE_KINDS = new Set(["GENERIC"]);
export const UTILITY_PATHS = /\/(cart|checkout|login|account|password|order-confirmation|hq|operator)\b/i;

export const PAGE_TYPE_DEPTH_PROFILE = {
  BLOG_ARTICLE: { floor: 2000, typical: [2200, 3500] },
  EVERGREEN_RESOURCE: { floor: 2000, typical: [3000, 5000] },
  GUIDE: { floor: 2000, typical: [3500, 6000] },
  HUB: { floor: 2000, typical: [3000, 5000] },
  SERVICE_PAGE: { floor: 2000, typical: [2000, 3500] },
  COMMERCIAL: { floor: 2000, typical: [2000, 3500] },
  COMPARISON: { floor: 2000, typical: [2500, 4000] },
  PRODUCT_DETAIL: { floor: 2000, typical: [2000, 3500] },
  COLLECTION: { floor: 2000, typical: [2000, 3000] },
  ABOUT: { floor: 2000, typical: [2000, 3000] },
} as const;

export function isUtilitySurface(draft: OrganicDraft): boolean {
  if (draft.page_kind && ["SERVICE_PAGE"].includes(draft.page_kind) === false && UTILITY_PATHS.test(draft.canonical)) return true;
  return /\/(privacy|terms|legal)\b/i.test(draft.canonical) && (draft.word_count ?? 0) < 800;
}

export function countSubstantiveWords(draft: OrganicDraft): number {
  const raw = `${draft.h1} ${draft.headings.join(" ")} ${draft.direct_answer ?? ""} ${draft.body} ${(draft.visible_faqs ?? []).map((row) => `${row.question} ${row.answer}`).join(" ")}`;
  return raw.replace(/\s+/g, " ").trim().split(" ").filter((word) => word && !/^https?:/i.test(word)).length;
}

export function evaluateSubstantiveWordCountGate(draft: OrganicDraft): OrganicNamedGate & { words: number; floor: number } {
  const words = countSubstantiveWords(draft);
  if (isUtilitySurface(draft) || /\/(privacy|terms)\b/i.test(draft.canonical)) {
    return { gate: "SubstantiveWordCountGate", result: "PASS", reasons: ["UTILITY_OR_LEGAL_EXEMPT"], words, floor: 0 };
  }
  if (words < SUBSTANTIVE_WORD_FLOOR) {
    return { gate: "SubstantiveWordCountGate", result: "FAIL", reasons: ["BELOW_2000_SUBSTANTIVE_WORDS"], words, floor: SUBSTANTIVE_WORD_FLOOR };
  }
  return { gate: "SubstantiveWordCountGate", result: "PASS", reasons: ["WORD_FLOOR_MET"], words, floor: SUBSTANTIVE_WORD_FLOOR };
}

export function evaluateHumanWritingGate(draft: OrganicDraft): OrganicNamedGate {
  const text = `${draft.body} ${draft.direct_answer ?? ""}`;
  const reasons: string[] = [];
  if (/lorem ipsum|as an ai|in today's (fast-paced|ever-evolving)|unlock the power|elevate your|delve into|it's important to note that/i.test(text)) {
    reasons.push("AI_NOTE_WRITING");
  }
  if (/\ba honest\b/i.test(text)) reasons.push("FAIL_LANGUAGE_QC");
  if (/review carefully|consider your options|talk to an expert/i.test(text) && !/checklist|worksheet|table|calculate|inspect/i.test(text)) {
    reasons.push("GENERIC_ADVICE_ONLY");
  }
  const paragraphs = draft.body.split(/\n\n+/).filter((row) => row.trim());
  if (paragraphs.length >= 3 && paragraphs.some((row) => row.split(/\s+/).length > 150)) reasons.push("PARAGRAPH_OVER_150");
  return { gate: "HumanWritingGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["READS_LIKE_A_KNOWLEDGEABLE_HUMAN"] };
}

export function evaluateReadabilityGate(draft: OrganicDraft): OrganicNamedGate {
  const sentences = draft.body.split(/[.!?]+/).map((row) => row.trim()).filter(Boolean);
  if (!sentences.length) return { gate: "ReadabilityGate", result: "FAIL", reasons: ["NO_SENTENCES"] };
  const avg = sentences.reduce((sum, row) => sum + row.split(/\s+/).length, 0) / sentences.length;
  if (avg > 28) return { gate: "ReadabilityGate", result: "FAIL", reasons: ["SENTENCES_TOO_LONG_FOR_PLAIN_LANGUAGE"] };
  return { gate: "ReadabilityGate", result: "PASS", reasons: ["PLAIN_LANGUAGE_LENGTH"] };
}

export function evaluateSectionDepthGate(draft: OrganicDraft): OrganicNamedGate {
  const paragraphs = draft.body.split(/\n\n+/).filter((row) => row.trim());
  const shallow = draft.headings.length >= 6 && paragraphs.filter((row) => row.split(/\s+/).length < 28).length >= Math.max(4, draft.headings.length - 1);
  if (shallow) return { gate: "SectionDepthGate", result: "FAIL", reasons: ["FAIL_THIN_SECTION"] };
  return { gate: "SectionDepthGate", result: "PASS", reasons: ["SECTIONS_HAVE_SUBSTANCE"] };
}

export function evaluateInternalLinkPlanGate(draft: OrganicDraft): OrganicNamedGate {
  if (isUtilitySurface(draft)) return { gate: "InternalLinkPlan", result: "PASS", reasons: ["NOT_APPLICABLE"] };
  if ((draft.internal_links?.length ?? 0) < 1) return { gate: "InternalLinkPlan", result: "FAIL", reasons: ["ORPHAN_OR_NO_OUTBOUND"] };
  return { gate: "InternalLinkPlan", result: "PASS", reasons: ["INTERNAL_PATHWAYS_PRESENT"] };
}

export function evaluateAuthorityReferencePlanGate(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate {
  if (isUtilitySurface(draft)) return { gate: "AuthorityReferencePlan", result: "PASS", reasons: ["NOT_APPLICABLE"] };
  const trusted = (draft.citations ?? []).filter((row) => row.source_type === "authority" || row.source_type === "primary");
  if (plan.evidence_needs.length && trusted.length === 0) {
    return { gate: "AuthorityReferencePlan", result: "FAIL", reasons: ["MISSING_TRUSTED_SOURCES"] };
  }
  if (trusted.some((row) => /competitor|affiliate/i.test(row.source))) {
    return { gate: "AuthorityReferencePlan", result: "FAIL", reasons: ["COMPETING_OR_THIN_SOURCE"] };
  }
  return { gate: "AuthorityReferencePlan", result: "PASS", reasons: trusted.length ? ["TRUSTED_SOURCES_PRESENT"] : ["LEGITIMATE_NA"] };
}

export function evaluateMetaContractGate(draft: OrganicDraft): OrganicNamedGate {
  const reasons: string[] = [];
  if (!draft.title || draft.title.length < 12) reasons.push("TITLE_THIN");
  if (!draft.meta_description || draft.meta_description.length < 40) reasons.push("META_DESCRIPTION_THIN");
  if (!draft.canonical) reasons.push("CANONICAL_MISSING");
  return { gate: "MetaContract", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["META_CONTRACT_MET"] };
}

export function evaluateSchemaContractGate(draft: OrganicDraft): OrganicNamedGate {
  const required = ["Organization", "WebSite", "WebPage", "BreadcrumbList"];
  const missing = required.filter((name) => !draft.schema.includes(name) && !draft.schema.includes("BlogPosting"));
  if (draft.page_kind === "BLOG_ARTICLE" && !draft.schema.includes("BlogPosting") && !draft.schema.includes("Article")) {
    return { gate: "SchemaContract", result: "FAIL", reasons: ["BLOG_SCHEMA_MISSING"] };
  }
  if (missing.length && draft.schema.length < 3) return { gate: "SchemaContract", result: "FAIL", reasons: ["SCHEMA_GRAPH_THIN"] };
  return { gate: "SchemaContract", result: "PASS", reasons: ["SCHEMA_CONTRACT_MET"] };
}

export function evaluateIndependentReaderChallenge(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate {
  const text = `${draft.h1} ${draft.body} ${draft.direct_answer ?? ""}`.toLowerCase();
  const independent = [
    "what should I do next",
    "what is still out of scope",
    "what number should I write down",
  ];
  const unanswered = independent.filter((question) => {
    if (question.includes("next") && !/next|checklist|request|open /.test(text)) return true;
    if (question.includes("out of scope") && !/not legal|not automatically|limitation/.test(text)) return true;
    if (question.includes("number") && plan.examples_needed.length && !/\$|\d/.test(text)) return true;
    return false;
  });
  return {
    gate: "ReaderQuestionChallengeV3",
    result: unanswered.length ? "FAIL" : "PASS",
    reasons: unanswered.length ? unanswered.map((row) => `MISSING:${row}`) : ["INDEPENDENT_MATERIAL_QUESTIONS_ANSWERED"],
  };
}

export function evaluateActionabilityGateV4(draft: OrganicDraft): OrganicNamedGate {
  const text = draft.body.toLowerCase();
  if (/review carefully|consider your options|talk to an expert/.test(text) && !/checklist|worksheet|table|calculate|inspect|request /.test(text)) {
    return { gate: "ActionabilityGate", result: "FAIL", reasons: ["GENERIC_ADVICE_DOES_NOT_COUNT"] };
  }
  const actionable = /checklist|step|worksheet|table|calculate|inspect|request |stress-test/.test(text);
  return { gate: "ActionabilityGate", result: actionable ? "PASS" : "FAIL", reasons: actionable ? ["READER_CAN_DO"] : ["VAGUE_ACTION"] };
}

export function evaluateLearningGateV4(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate {
  const blob = `${draft.body} ${(plan.learning_outcomes ?? []).join(" ")}`;
  const labeled = /READER_CAN_EXPLAIN|READER_CAN_IDENTIFY|READER_CAN_DO|READER_CAN_COMPARE|READER_CAN_AVOID|READER_NEXT_STEP/.test(blob);
  if (labeled || (plan.learning_outcomes ?? []).length >= 4) {
    return { gate: "LearningGate", result: "PASS", reasons: ["CONCRETE_LEARNING_OUTCOMES"] };
  }
  return { gate: "LearningGate", result: "FAIL", reasons: ["LEARNING_TEST_GENERIC"] };
}
