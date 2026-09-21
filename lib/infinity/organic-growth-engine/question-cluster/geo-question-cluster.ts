import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";

export const GEO_QUESTION_CLUSTER_GATE_VERSION = "geo-question-cluster-v1" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type QuestionClass = "PRIMARY" | "MUST_ANSWER" | "HIGH_VALUE_SECONDARY" | "SUPPORTING" | "SEPARATE_PAGE";
export type CoverageState =
  | "NOT_COVERED"
  | "MENTION_ONLY"
  | "ANSWERED"
  | "ANSWERED_WITH_DEPTH"
  | "ROUTED_TO_EXISTING_PAGE"
  | "PLANNED_SEPARATE_PAGE"
  | "NOT_APPLICABLE";
export type AnswerQuality = "MENTION_ONLY" | "DIRECT_ANSWER" | "EXPLAINED" | "ACTIONABLE" | "EVIDENCE_BACKED";
export type OwnershipDecision = "SAME_PAGE" | "EXISTING_PAGE" | "NEW_SEPARATE_PAGE" | "NOT_APPLICABLE";

export type OrganicQuestionCoverageNode = {
  graph_id: string;
  venture_id: string;
  asset_id: string;
  canonical_url: string;
  primary_question: string;
  canonical_intent: string;
  question: string;
  question_class: QuestionClass;
  question_intent: string;
  semantic_relationship: string;
  importance_score: number;
  search_signal: string;
  voc_signal: string;
  sales_signal: string;
  existing_page_owner: string | null;
  coverage_state: CoverageState;
  answer_location: string;
  answer_quality: AnswerQuality | "NONE";
  citation_ready: boolean;
  evidence_required: boolean;
  evidence_state: "NONE" | "MAPPED" | "EXTERNAL" | "PRODUCT_TRUTH" | "REASONING";
  separate_page_candidate: boolean;
  ownership: OwnershipDecision;
  created_at: string;
  updated_at: string;
};

export type CitationReadyAnswer = {
  question: string;
  heading_id: string;
  answer: string;
  self_contained: boolean;
  claims: string[];
  evidence_requirement: "NONE" | "EXTERNAL" | "PRODUCT_TRUTH" | "REASONING";
  sources: Array<{ href: string; authority: string }>;
  citation_suitability: "READY" | "NEEDS_EVIDENCE" | "NOT_READY";
};

export type OrganicQuestionCluster = {
  cluster_id: string;
  venture_id: string;
  topic: string;
  primary_asset: string;
  supporting_assets: string[];
  questions_owned: string[];
  questions_routed: string[];
  commercial_path: string;
  internal_link_graph: Array<{ from: string; to: string; reason: string }>;
  coverage_score: number;
  authority_score: number;
  updated_at: string;
};

export type OrganicQuestionGap = {
  asset: string;
  missing_question: string;
  question_class: QuestionClass;
  importance: number;
  source_signal: string;
  recommended_action: "EXPAND_EXISTING" | "ROUTE_EXISTING" | "PLAN_SEPARATE_PAGE" | "NOT_APPLICABLE";
  existing_owner: string | null;
  new_page_candidate: boolean;
  priority: "HIGH" | "MEDIUM" | "LOW";
};

export type QuestionCoverageReport = {
  primary: { answered: number; total: number };
  must_answer: { answered: number; total: number };
  high_value_secondary: { answered: number; total: number };
  supporting: { answered: number; total: number };
  routed_existing: number;
  separate_page: number;
  unresolved_important: number;
};

const RESOLVED: CoverageState[] = ["ANSWERED", "ANSWERED_WITH_DEPTH", "ROUTED_TO_EXISTING_PAGE", "PLANNED_SEPARATE_PAGE", "NOT_APPLICABLE"];

export function isResolvedCoverage(state: CoverageState): boolean {
  return RESOLVED.includes(state);
}

export function evaluateQuestionIntentOwnershipGate(nodes: OrganicQuestionCoverageNode[]): NamedOutboundLoopGate {
  const bad = nodes.filter((row) => {
    if (row.question_class === "SEPARATE_PAGE" && row.ownership === "SAME_PAGE" && row.importance_score >= 80) return true;
    if ((row.question_class === "PRIMARY" || row.question_class === "MUST_ANSWER") && row.ownership === "NEW_SEPARATE_PAGE") return true;
    if (row.existing_page_owner && row.ownership === "NEW_SEPARATE_PAGE") return true;
    return false;
  });
  return named("QuestionIntentOwnershipGate", bad.length ? "FAIL" : "PASS", bad.length ? bad.map((row) => row.question) : ["OWNERSHIP_COHERENT"]);
}

export function evaluateQuestionCannibalizationGate(nodes: OrganicQuestionCoverageNode[]): NamedOutboundLoopGate {
  const duplicateNew = nodes.filter((row) => row.ownership === "NEW_SEPARATE_PAGE" && Boolean(row.existing_page_owner));
  const samePageSplit = nodes.filter((row) => row.question_class === "PRIMARY" && row.ownership !== "SAME_PAGE");
  const reasons = [
    ...duplicateNew.map((row) => `DUPLICATE_URL:${row.question}`),
    ...samePageSplit.map((row) => `PRIMARY_SPLIT:${row.question}`),
  ];
  return named("QuestionCannibalizationGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["NO_CANNIBALIZATION"]);
}

export function evaluateCitationReadyAnswerGate(blocks: CitationReadyAnswer[]): NamedOutboundLoopGate {
  if (!blocks.length) return named("CitationReadyAnswerGate", "FAIL", ["NO_CITATION_BLOCKS"]);
  const failed = blocks.filter((block) => {
    if (!block.self_contained) return true;
    if (/as discussed above|as mentioned above|click here|this page exists to/i.test(block.answer)) return true;
    if (block.answer.trim().split(/\s+/).length < 12) return true;
    if (block.citation_suitability === "NOT_READY") return true;
    if (block.evidence_requirement === "EXTERNAL" && !block.sources.length) return true;
    if (block.evidence_requirement === "PRODUCT_TRUTH" && !/3-day|no credit card|pricing/i.test(block.answer) && /occupancynpv/i.test(block.question + block.answer) && /need|trial|compare/i.test(block.question)) {
      return !/timeline|inputs|does not invent/i.test(block.answer);
    }
    return false;
  });
  return named("CitationReadyAnswerGate", failed.length ? "FAIL" : "PASS", failed.length ? failed.map((row) => row.heading_id) : ["CITATION_READY"]);
}

export function evaluateGEOCitationReadinessGate(input: {
  entity_defined: boolean;
  direct_answers: number;
  self_contained_blocks: number;
  structured_comparison: boolean;
  labeled_example: boolean;
  source_backed: boolean;
  product_truth_consistent: boolean;
  internal_links: number;
  hierarchy: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.entity_defined) reasons.push("NO_ENTITY");
  if (input.direct_answers < 6) reasons.push("TOO_FEW_DIRECT_ANSWERS");
  if (input.self_contained_blocks < 6) reasons.push("TOO_FEW_SELF_CONTAINED");
  if (!input.structured_comparison) reasons.push("NO_STRUCTURED_COMPARISON");
  if (!input.labeled_example) reasons.push("NO_LABELED_EXAMPLE");
  if (!input.source_backed) reasons.push("NO_AUTHORITY_SOURCES");
  if (!input.product_truth_consistent) reasons.push("PRODUCT_TRUTH");
  if (input.internal_links < 3) reasons.push("WEAK_INTERNAL_LINKS");
  if (!input.hierarchy) reasons.push("NO_HIERARCHY");
  return named("GEOCitationReadinessGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["GEO_READY"]);
}

export function evaluateQuestionCoverageGate(nodes: OrganicQuestionCoverageNode[]): NamedOutboundLoopGate & { report: QuestionCoverageReport } {
  const report = summarizeQuestionCoverage(nodes);
  const reasons: string[] = [];
  if (report.primary.answered < report.primary.total) reasons.push("PRIMARY_UNRESOLVED");
  if (report.must_answer.answered < report.must_answer.total) reasons.push("MUST_ANSWER_UNRESOLVED");
  if (report.unresolved_important) reasons.push("IMPORTANT_UNRESOLVED");
  return { ...named("QuestionCoverageGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CLUSTER_COVERED"]), report };
}

export function summarizeQuestionCoverage(nodes: OrganicQuestionCoverageNode[]): QuestionCoverageReport {
  const tally = (klass: QuestionClass) => {
    const rows = nodes.filter((row) => row.question_class === klass);
    return { answered: rows.filter((row) => isResolvedCoverage(row.coverage_state)).length, total: rows.length };
  };
  return {
    primary: tally("PRIMARY"),
    must_answer: tally("MUST_ANSWER"),
    high_value_secondary: tally("HIGH_VALUE_SECONDARY"),
    supporting: tally("SUPPORTING"),
    routed_existing: nodes.filter((row) => row.coverage_state === "ROUTED_TO_EXISTING_PAGE").length,
    separate_page: nodes.filter((row) => row.coverage_state === "PLANNED_SEPARATE_PAGE" || row.ownership === "NEW_SEPARATE_PAGE").length,
    unresolved_important: nodes.filter((row) => (row.question_class === "PRIMARY" || row.question_class === "MUST_ANSWER") && !isResolvedCoverage(row.coverage_state)).length,
  };
}

export function evaluateNaturalAnswerReadabilityGate(answers: string[]): NamedOutboundLoopGate {
  const failed = answers.filter((answer) => {
    const words = answer.trim().split(/\s+/);
    if (words.length > 70 && !/[.?]/.test(answer.slice(0, 180))) return true;
    if ((answer.match(/OccupancyNPV/g) ?? []).length > 2 && words.length < 80) return true;
    if (/search intent|content opportunity|cannibalization/i.test(answer)) return true;
    return false;
  });
  return named("NaturalAnswerReadabilityGate", failed.length ? "FAIL" : "PASS", failed.length ? ["UNNATURAL_ANSWER"] : ["NATURAL"]);
}

export function evaluateAnswerRedundancyGate(answers: string[]): NamedOutboundLoopGate {
  const normalized = answers.map((row) => row.toLowerCase().replace(/\s+/g, " ").trim()).filter((row) => row.length > 40);
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const left = new Set(normalized[i].split(" ").filter((word) => word.length > 3));
      const right = new Set(normalized[j].split(" ").filter((word) => word.length > 3));
      let hit = 0;
      for (const word of left) if (right.has(word)) hit += 1;
      const overlap = hit / Math.min(left.size, right.size);
      if (overlap > 0.84) return named("AnswerRedundancyGate", "FAIL", ["REPEATED_ANSWER_BLOCK"]);
    }
  }
  return named("AnswerRedundancyGate", "PASS", ["UNIQUE_ANSWERS"]);
}

export function evaluateQuestionClusterInternalLinkGate(input: {
  required_routes: string[];
  present_routes: string[];
  natural: boolean;
}): NamedOutboundLoopGate {
  const missing = input.required_routes.filter((route) => !input.present_routes.includes(route));
  if (missing.length) return named("QuestionClusterInternalLinkGate", "FAIL", missing);
  if (!input.natural) return named("QuestionClusterInternalLinkGate", "FAIL", ["UNNATURAL_LINKS"]);
  return named("QuestionClusterInternalLinkGate", "PASS", ["CLUSTER_LINKS"]);
}

export function evaluateFaqStuffingGate(input: {
  faq_count: number;
  headings_are_questions: number;
  unique_sections: number;
}): NamedOutboundLoopGate {
  if (input.faq_count >= 12 && input.faq_count > input.unique_sections) {
    return named("FaqStuffingGate", "FAIL", ["FAQ_STUFFING"]);
  }
  if (input.faq_count >= 8 && input.headings_are_questions < 4) {
    return named("FaqStuffingGate", "FAIL", ["FAQ_ONLY_COVERAGE"]);
  }
  return named("FaqStuffingGate", "PASS", ["FAQ_NOT_STUFFED"]);
}

export function applyVocQuestionSignal(
  nodes: OrganicQuestionCoverageNode[],
  signal: { question: string; source: "SALES" | "VOC" | "SEARCH" },
): OrganicQuestionCoverageNode[] {
  const match = nodes.find((row) => row.question.toLowerCase().includes(signal.question.toLowerCase().slice(0, 24)) || signal.question.toLowerCase().includes(row.question.toLowerCase().slice(0, 24)));
  if (match) {
    return nodes.map((row) => row.question === match.question
      ? { ...row, voc_signal: signal.source === "VOC" || signal.source === "SALES" ? signal.source : row.voc_signal, sales_signal: signal.source === "SALES" ? "RECURRING" : row.sales_signal, search_signal: signal.source === "SEARCH" ? "QUERY" : row.search_signal, importance_score: Math.min(100, row.importance_score + 5), updated_at: new Date().toISOString() }
      : row);
  }
  return [
    ...nodes,
    {
      ...nodes[0],
      question: signal.question,
      question_class: "HIGH_VALUE_SECONDARY",
      coverage_state: "NOT_COVERED",
      answer_quality: "NONE",
      voc_signal: signal.source,
      sales_signal: signal.source === "SALES" ? "RECURRING" : "NONE",
      search_signal: signal.source === "SEARCH" ? "QUERY" : "NONE",
      importance_score: 70,
      updated_at: new Date().toISOString(),
    },
  ];
}

export function buildOrganicQuestionGapReport(nodes: OrganicQuestionCoverageNode[]): OrganicQuestionGap[] {
  return nodes
    .filter((row) => row.coverage_state === "NOT_COVERED" || row.coverage_state === "MENTION_ONLY" || row.coverage_state === "PLANNED_SEPARATE_PAGE")
    .map((row) => ({
      asset: row.canonical_url,
      missing_question: row.question,
      question_class: row.question_class,
      importance: row.importance_score,
      source_signal: row.voc_signal !== "NONE" ? row.voc_signal : row.search_signal,
      recommended_action: row.ownership === "NEW_SEPARATE_PAGE"
        ? "PLAN_SEPARATE_PAGE"
        : row.ownership === "EXISTING_PAGE"
          ? "ROUTE_EXISTING"
          : row.coverage_state === "NOT_COVERED"
            ? "EXPAND_EXISTING"
            : "EXPAND_EXISTING",
      existing_owner: row.existing_page_owner,
      new_page_candidate: row.separate_page_candidate,
      priority: row.importance_score >= 80 ? "HIGH" : row.importance_score >= 60 ? "MEDIUM" : "LOW",
    }));
}

export function shouldRefreshQuestionCoverage(input: {
  new_relevant_questions: number;
  search_gaps: number;
  sales_recurring: number;
  evidence_stale: boolean;
  competitor_better: boolean;
}): boolean {
  return input.new_relevant_questions > 0 || input.search_gaps > 0 || input.sales_recurring > 0 || input.evidence_stale || input.competitor_better;
}

export function substantialAssetNeedsQuestionGraph(assetType: string): boolean {
  return /GUIDE|QUESTION|COMPARISON|DECISION|REFERENCE|CHECKLIST|EVERGREEN|RESOURCE|EDUCATION/i.test(assetType);
}
