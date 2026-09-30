import { evaluateBlogContentQualityV2 } from "./blog-quality-core";
import { resolveContentCoveragePlan, type ContentCoveragePlan } from "./content-coverage-plan";
import { evaluateOrganicContentQualityGate, type OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import {
  evaluateActionabilityGateV4,
  evaluateAuthorityReferencePlanGate,
  evaluateHumanWritingGate,
  evaluateIndependentReaderChallenge,
  evaluateInternalLinkPlanGate,
  evaluateLearningGateV4,
  evaluateMetaContractGate,
  evaluateReadabilityGate,
  evaluateSchemaContractGate,
  evaluateSectionDepthGate,
  evaluateSubstantiveWordCountGate,
} from "./content-quality-v4";
import {
  evaluateContentNormalizationGate,
  evaluateDuplicateDraftGate,
  evaluateEmptySectionGate,
} from "./content-normalization";
export const CONTENT_QUALITY_FRAMEWORK = "ContentQualityFramework" as const;
export const CONTENT_QUALITY_FRAMEWORK_VERSION = "content-quality-framework-v4" as const;
export const CONTENT_QUALITY_V3 = "content-quality-framework-v3" as const;
export const CONTENT_QUALITY_V4 = "content-quality-framework-v4" as const;

export type ContentPageOverlay = "BLOG" | "EVERGREEN_RESOURCE" | "COMPARISON" | "COMMERCIAL" | "GENERIC";
export type CoverageItemState = "ANSWERED" | "PARTIAL" | "MISSING" | "NOT_APPLICABLE";
export type ReaderQuestionScope = "IN_SCOPE_MATERIAL" | "IN_SCOPE_MINOR" | "OUT_OF_SCOPE";

export function overlayForDraft(draft: OrganicDraft): ContentPageOverlay {
  if (draft.page_kind === "BLOG_ARTICLE") return "BLOG";
  if (draft.page_kind === "EVERGREEN_RESOURCE") return "EVERGREEN_RESOURCE";
  if (/compar/i.test(`${draft.canonical} ${draft.h1}`)) return "COMPARISON";
  return "GENERIC";
}

function draftText(draft: OrganicDraft): string {
  return `${draft.h1} ${draft.headings.join(" ")} ${draft.body} ${draft.direct_answer ?? ""} ${(draft.visible_faqs ?? []).map((row) => `${row.question} ${row.answer}`).join(" ")}`;
}

export function classifyCoverageItem(text: string, tokens: string[]): CoverageItemState {
  const hits = tokens.filter((token) => text.toLowerCase().includes(token.toLowerCase()));
  if (!tokens.length) return "NOT_APPLICABLE";
  if (hits.length === 0) return "MISSING";
  if (hits.length < tokens.length) return "PARTIAL";
  return "ANSWERED";
}

export function evaluateDraftToCoverageMap(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate & {
  items: Array<{ item: string; state: CoverageItemState }>;
} {
  const text = draftText(draft);
  const items = plan.cluster.questions
    .filter((row) => row.role === "PRIMARY" || row.role === "MUST_ANSWER")
    .map((row) => ({ item: row.question, state: classifyCoverageItem(text, row.coverage_tokens) }));
  if (!items.length) {
    return {
      gate: "DraftToCoverageVerification",
      result: draft.direct_answer ? "PASS" : "FAIL",
      reasons: draft.direct_answer ? ["COVERAGE_ITEMS_MAPPED"] : ["PRIMARY_UNMAPPED"],
      items,
    };
  }
  const failed = items.filter((row) => row.state === "MISSING" || row.state === "PARTIAL");
  return {
    gate: "DraftToCoverageVerification",
    result: failed.length ? "FAIL" : "PASS",
    reasons: failed.length ? failed.map((row) => `${row.state}:${row.item}`) : ["COVERAGE_ITEMS_MAPPED"],
    items,
  };
}

export const CAM_READER_QUESTION_CHALLENGE = [
  { question: "What does first-year CAM typically include versus exclude?", tokens: ["typically includes", "typically excludes", "janitorial"], scope: "IN_SCOPE_MATERIAL" as const },
  { question: "How do landlords estimate first-year CAM?", tokens: ["prior-year actuals", "landlord estimates"], scope: "IN_SCOPE_MATERIAL" as const },
  { question: "What is controllable versus uncontrollable CAM?", tokens: ["controllable", "uncontrollable"], scope: "IN_SCOPE_MATERIAL" as const },
  { question: "How does first-year CAM change occupancy-cost NPV?", tokens: ["occupancy-cost NPV", "discounted"], scope: "IN_SCOPE_MATERIAL" as const },
  { question: "What CAM documents should a tenant inspect?", tokens: ["prior-year reconciliation statement", "included-expenses list"], scope: "IN_SCOPE_MATERIAL" as const },
  { question: "What red flags mean the CAM estimate is not usable?", tokens: ["red flag"], scope: "IN_SCOPE_MATERIAL" as const },
] as const;

export function evaluateReaderQuestionChallenge(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate & {
  remaining: Array<{ question: string; scope: ReaderQuestionScope }>;
} {
  if (plan.canonical_url.includes("/cam-first-year")) {
    const text = draftText(draft);
    const remaining = CAM_READER_QUESTION_CHALLENGE
      .filter((row) => classifyCoverageItem(text, [...row.tokens]) !== "ANSWERED")
      .map((row) => ({ question: row.question, scope: row.scope }));
    return {
      gate: "ReaderQuestionChallenge",
      result: remaining.length ? "FAIL" : "PASS",
      reasons: remaining.length ? remaining.map((row) => `UNANSWERED:${row.question}`) : ["NO_MATERIAL_UNANSWERED_QUESTIONS"],
      remaining,
    };
  }
  if (plan.canonical_url.includes("/journal/") || plan.canonical_url.includes("/blog/")) {
    const text = draftText(draft);
    const remaining = plan.cluster.questions
      .filter((row) => row.role === "PRIMARY" || row.role === "MUST_ANSWER")
      .filter((row) => classifyCoverageItem(text, row.coverage_tokens) !== "ANSWERED")
      .map((row) => ({ question: row.question, scope: "IN_SCOPE_MATERIAL" as const }));
    return {
      gate: "ReaderQuestionChallenge",
      result: remaining.length ? "FAIL" : "PASS",
      reasons: remaining.length ? remaining.map((row) => `UNANSWERED:${row.question}`) : ["NO_MATERIAL_UNANSWERED_QUESTIONS"],
      remaining,
    };
  }
  const text = draftText(draft);
  const remaining = CAM_READER_QUESTION_CHALLENGE
    .filter((row) => classifyCoverageItem(text, [...row.tokens]) !== "ANSWERED")
    .map((row) => ({ question: row.question, scope: row.scope }));
  return {
    gate: "ReaderQuestionChallenge",
    result: remaining.length ? "FAIL" : "PASS",
    reasons: remaining.length ? remaining.map((row) => `UNANSWERED:${row.question}`) : ["NO_MATERIAL_UNANSWERED_QUESTIONS"],
    remaining,
  };
}

function outcomeTokenPresent(text: string, token: string): boolean {
  if (text.includes(token) || text.includes(token.replace(/-/g, " "))) return true;
  if (token.endsWith("ing") && text.includes(token.slice(0, -3))) return true;
  if (token.endsWith("ion") && text.includes(`${token.slice(0, -3)}ed`)) return true;
  return false;
}

function outcomeSubstanceTokens(outcome: string): string[] {
  return outcome
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["explain", "identify", "apply", "avoid", "request", "the", "and", "for", "with", "that", "this", "next", "able"].includes(word));
}

export function evaluateLearningOutcomes(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate {
  const outcomes = plan.learning_outcomes ?? [];
  if (!outcomes.length) return { gate: "ReaderLearningOutcomes", result: "PASS", reasons: ["NO_DECLARED_OUTCOMES"] };
  const text = draftText(draft).toLowerCase();
  const missed = outcomes.filter((row) => {
    const tokens = outcomeSubstanceTokens(row);
    return !tokens.length || tokens.some((token) => !outcomeTokenPresent(text, token));
  });
  return {
    gate: "ReaderLearningOutcomes",
    result: missed.length ? "FAIL" : "PASS",
    reasons: missed.length ? missed.slice(0, 3) : ["LEARNING_OUTCOMES_MET"],
  };
}

export function evaluateActionabilityContract(draft: OrganicDraft, plan: ContentCoveragePlan): OrganicNamedGate {
  if (plan.practical_next_steps.length === 0) {
    return { gate: "ActionabilityContract", result: "PASS", reasons: ["NOT_APPLICABLE"] };
  }
  const text = draftText(draft).toLowerCase();
  const hits = plan.practical_next_steps.filter((step) => text.includes(step.split(" ").slice(0, 3).join(" ").toLowerCase()));
  const applied = /checklist|request|inspect|compare|stress-test|worksheet/.test(text);
  return {
    gate: "ActionabilityContract",
    result: hits.length && applied ? "PASS" : "FAIL",
    reasons: hits.length && applied ? ["ACTIONABLE_GUIDANCE"] : ["GENERIC_EXPLANATION_WITHOUT_APPLICATION"],
  };
}

export function evaluateContentQualityFramework(draft: OrganicDraft, plan = resolveContentCoveragePlan(draft)): {
  gate: typeof CONTENT_QUALITY_FRAMEWORK;
  version: typeof CONTENT_QUALITY_FRAMEWORK_VERSION;
  overlay: ContentPageOverlay;
  coverage_plan_id: string;
  result: "PASS" | "FAIL";
  reasons: string[];
  coverage_plan_required: true;
} {
  const overlay = overlayForDraft(draft);
  const baseline = overlay === "BLOG"
    ? evaluateBlogContentQualityV2(draft, plan)
    : evaluateOrganicContentQualityGate(draft);
  const coverage = evaluateDraftToCoverageMap(draft, plan);
  const challenge = evaluateReaderQuestionChallenge(draft, plan);
  const outcomes = evaluateLearningOutcomes(draft, plan);
  const action = evaluateActionabilityContract(draft, plan);
  const overlayReasons: string[] = [];
  if (overlay === "BLOG" && !draft.direct_answer) overlayReasons.push("BLOG_HOOK_MISSING");
  if (overlay === "EVERGREEN_RESOURCE" && draft.headings.length < 6) overlayReasons.push("EVERGREEN_STRUCTURE_THIN");
  const paragraphs = draft.body.split(/\n\n+/).filter((row) => row.trim());
  const shallow = draft.headings.length >= 4 && paragraphs.filter((row) => row.split(/\s+/).length < 28).length >= Math.max(3, draft.headings.length - 1);
  if (overlay === "BLOG" && shallow) overlayReasons.push("HEADING_SCAFFOLD_FAILURE");
  const learning = /READER_CAN_EXPLAIN|READER_CAN_IDENTIFY|READER_CAN_DO|READER_CAN_COMPARE|READER_CAN_AVOID|READER_NEXT_STEP/.test(`${draft.body} ${(plan.learning_outcomes ?? []).join(" ")}`)
    || (plan.learning_outcomes ?? []).length >= 3;
  if (overlay === "BLOG" && !learning) overlayReasons.push("LEARNING_TEST_GENERIC");
  const v4 = overlay === "BLOG" || /\/blog\/|\/journal\//.test(draft.canonical);
  const word = v4 ? evaluateSubstantiveWordCountGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const human = v4 ? evaluateHumanWritingGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const read = v4 ? evaluateReadabilityGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const depth = v4 ? evaluateSectionDepthGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const links = v4 ? evaluateInternalLinkPlanGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const authority = v4 ? evaluateAuthorityReferencePlanGate(draft, plan) : { result: "PASS" as const, reasons: [] as string[] };
  const meta = v4 ? evaluateMetaContractGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const schema = v4 ? evaluateSchemaContractGate(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const independent = v4 ? evaluateIndependentReaderChallenge(draft, plan) : { result: "PASS" as const, reasons: [] as string[] };
  const actionV4 = v4 ? evaluateActionabilityGateV4(draft) : { result: "PASS" as const, reasons: [] as string[] };
  const learnV4 = v4 ? evaluateLearningGateV4(draft, plan) : { result: "PASS" as const, reasons: [] as string[] };
  const normalization = v4 ? evaluateContentNormalizationGate({ body: draft.body }) : { result: "PASS" as const, reasons: [] as string[] };
  const empty = v4 ? evaluateEmptySectionGate({ headings: draft.headings, body: draft.body }) : { result: "PASS" as const, reasons: [] as string[] };
  const duplicate = v4 ? evaluateDuplicateDraftGate({ body: draft.body, headings: draft.headings }) : { result: "PASS" as const, reasons: [] as string[] };
  const reasons = [
    ...baseline.reasons,
    ...overlayReasons,
    ...(overlay === "BLOG" && coverage.result === "FAIL" ? coverage.reasons : []),
    ...(overlay === "BLOG" && challenge.result === "FAIL" ? challenge.reasons : []),
    ...(overlay === "BLOG" && outcomes.result === "FAIL" ? outcomes.reasons : []),
    ...(overlay === "BLOG" && action.result === "FAIL" ? action.reasons : []),
    ...(word.result === "FAIL" ? word.reasons : []),
    ...(human.result === "FAIL" ? human.reasons : []),
    ...(read.result === "FAIL" ? read.reasons : []),
    ...(depth.result === "FAIL" ? depth.reasons : []),
    ...(links.result === "FAIL" ? links.reasons : []),
    ...(authority.result === "FAIL" ? authority.reasons : []),
    ...(meta.result === "FAIL" ? meta.reasons : []),
    ...(schema.result === "FAIL" ? schema.reasons : []),
    ...(independent.result === "FAIL" ? independent.reasons : []),
    ...(actionV4.result === "FAIL" ? actionV4.reasons : []),
    ...(learnV4.result === "FAIL" ? learnV4.reasons : []),
    ...(normalization.result === "FAIL" ? normalization.reasons : []),
    ...(empty.result === "FAIL" ? empty.reasons : []),
    ...(duplicate.result === "FAIL" ? duplicate.reasons : []),
  ];
  return {
    gate: CONTENT_QUALITY_FRAMEWORK,
    version: CONTENT_QUALITY_FRAMEWORK_VERSION,
    overlay,
    coverage_plan_id: plan.plan_id,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CANONICAL_BASELINE_V4"],
    coverage_plan_required: true,
  };
}

export function auditPublicContentGeneratorUsesFramework(source: string): boolean {
  return /evaluateContentQualityFramework|evaluateConsumerEditorialPublishStack|runBoundedConsumerEditorialRepair|evaluateOrganicContentQualityGate|evaluateBlogContentQualityGate/.test(
    source,
  );
}
