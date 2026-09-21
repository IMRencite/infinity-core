import {
  ENTITY_COVERAGE_GATE,
  ORGANIC_TOPICAL_COMPLETENESS_GATE,
  PRACTICAL_USEFULNESS_GATE,
  QUESTION_CLUSTER_COVERAGE_GATE,
} from "./contract";
import type { OrganicContentType } from "./contract";
import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";

export type TopicComplexity = "SIMPLE" | "MODERATE" | "COMPLEX";
export type CoverageBand = "LOW" | "MEDIUM" | "HIGH";
export type ClusterDisposition = "ANSWER_HERE" | "LINK_OUT" | "DEFER";
export type ContentAuditClass = "COMPLETE" | "NEEDS_EXPANSION" | "THIN" | "DUPLICATIVE";

export type RelatedClusterQuestion = {
  question: string;
  disposition: ClusterDisposition;
  reason: string;
};

export type TopicalCompletenessPlan = {
  primary_question: string;
  content_type: OrganicContentType;
  complexity: TopicComplexity;
  required_definitions: string[];
  required_concepts: string[];
  required_entities: string[];
  related_questions: RelatedClusterQuestion[];
  calculations: string[];
  worked_examples: string[];
  inputs: string[];
  interpretation: string[];
  use_cases: string[];
  limitations: string[];
  edge_cases: string[];
  comparisons: string[];
  common_mistakes: string[];
  misconceptions: string[];
  practical_application: string[];
  related_metrics: string[];
  recommended_internal_links: string[];
  authoritative_source_needs: string[];
};

export type EntityCoveragePlan = {
  required_entities: string[];
  present: string[];
  missing: string[];
};

export type OrganicContentQualityProfile = {
  content_type: OrganicContentType;
  topic_complexity: TopicComplexity;
  coverage_score: number;
  question_cluster_score: number;
  entity_coverage: number;
  evidence_score: number;
  practical_usefulness_score: number;
  internal_link_score: number;
  seo_geo_score: number;
  overall: "PASS" | "REVISE" | "FAIL";
};

const COMPLEX_HINTS = /cap rate|noi|npv|irr|valuation|interest rate|lease|dcf|underwrit/i;

export function classifyTopicComplexity(input: {
  question: string;
  topic: string;
  content_type: OrganicContentType;
}): TopicComplexity {
  if (input.content_type === "GLOSSARY" && input.question.split(/\s+/).length <= 6) return "SIMPLE";
  if (input.content_type === "TIMELY_EDITORIAL" || input.content_type === "BLOG" || input.content_type === "FAQ") {
    return COMPLEX_HINTS.test(`${input.question} ${input.topic}`) ? "MODERATE" : "SIMPLE";
  }
  if (input.content_type === "GUIDE" || input.content_type === "COMPARISON" || input.content_type === "EVERGREEN_QUESTION") {
    return COMPLEX_HINTS.test(`${input.question} ${input.topic}`) ? "COMPLEX" : "MODERATE";
  }
  return COMPLEX_HINTS.test(`${input.question} ${input.topic}`) ? "COMPLEX" : "MODERATE";
}

export function buildCapRateQuestionCluster(): RelatedClusterQuestion[] {
  return [
    { question: "What is cap rate?", disposition: "ANSWER_HERE", reason: "definition_required" },
    { question: "What is the cap rate formula?", disposition: "ANSWER_HERE", reason: "method_required" },
    { question: "What counts as NOI?", disposition: "ANSWER_HERE", reason: "input_required" },
    { question: "How do you calculate property value from cap rate?", disposition: "ANSWER_HERE", reason: "inverse_method" },
    { question: "What is a good cap rate?", disposition: "ANSWER_HERE", reason: "interpretation" },
    { question: "What raises or lowers a cap rate?", disposition: "ANSWER_HERE", reason: "drivers" },
    { question: "Why do cap rates differ by property type?", disposition: "ANSWER_HERE", reason: "context" },
    { question: "How do interest rates affect cap rates?", disposition: "LINK_OUT", reason: "deserves_dedicated_page" },
    { question: "How does cap rate relate to risk?", disposition: "ANSWER_HERE", reason: "interpretation" },
    { question: "What are the limitations of cap rate?", disposition: "ANSWER_HERE", reason: "limits_required" },
    { question: "What common cap-rate mistakes occur?", disposition: "ANSWER_HERE", reason: "mistakes_required" },
    { question: "How does cap rate compare with cash-on-cash return?", disposition: "ANSWER_HERE", reason: "comparison" },
    { question: "How does cap rate compare with IRR?", disposition: "ANSWER_HERE", reason: "comparison" },
    { question: "Can cap rate be negative?", disposition: "ANSWER_HERE", reason: "edge_case" },
    { question: "Should trailing or projected NOI be used?", disposition: "ANSWER_HERE", reason: "input_choice" },
    { question: "How do vacancies affect cap rate?", disposition: "ANSWER_HERE", reason: "occupancy" },
    { question: "How do operating expenses affect cap rate?", disposition: "ANSWER_HERE", reason: "noi_drivers" },
    { question: "How does cap rate affect commercial real estate valuation?", disposition: "ANSWER_HERE", reason: "use_case" },
    { question: "How is commercial-lease NPV different?", disposition: "LINK_OUT", reason: "existing_occupancy_npv_page" },
  ];
}

export function buildTopicalCompletenessPlan(input: {
  question: string;
  topic: string;
  content_type: OrganicContentType;
  related?: RelatedClusterQuestion[];
}): TopicalCompletenessPlan {
  const complexity = classifyTopicComplexity(input);
  const capRate = /cap rate/i.test(`${input.question} ${input.topic}`);
  const related = input.related ?? (capRate ? buildCapRateQuestionCluster() : [
    { question: input.question, disposition: "ANSWER_HERE", reason: "primary" },
    { question: `What is ${input.topic}?`, disposition: "ANSWER_HERE", reason: "definition" },
    { question: `What limits ${input.topic}?`, disposition: "ANSWER_HERE", reason: "limits" },
  ]);
  return {
    primary_question: input.question,
    content_type: input.content_type,
    complexity,
    required_definitions: capRate ? ["capitalization rate", "NOI", "property value"] : [input.topic],
    required_concepts: capRate
      ? ["formula", "trailing vs projected income", "risk", "property type"]
      : ["definition", "use", "limits"],
    required_entities: capRate
      ? ["NOI", "property value", "purchase price", "vacancy", "operating expenses", "interest rates", "property type", "cash flow"]
      : [input.topic],
    related_questions: related,
    calculations: capRate ? ["NOI / value", "value = NOI / rate"] : [],
    worked_examples: capRate ? ["$100,000 NOI / $1,250,000 value = 8%"] : [],
    inputs: capRate ? ["NOI", "value or purchase price"] : [],
    interpretation: capRate ? ["higher rate often more risk or weaker growth"] : [`how to read ${input.topic}`],
    use_cases: ["screening", "conversation support"],
    limitations: capRate ? ["not leverage", "not a full DCF", "not lease NPV"] : [`${input.topic} is not a complete decision`],
    edge_cases: capRate ? ["negative income", "pro forma vs trailing"] : [],
    comparisons: capRate ? ["cash-on-cash", "IRR", "lease NPV"] : [],
    common_mistakes: capRate ? ["mixing trailing and projected NOI", "using the rate as a lease discount rate"] : [],
    misconceptions: capRate ? ["a low rate always means a better asset"] : [],
    practical_application: ["work the formula", "name the income date", "state the value source"],
    related_metrics: capRate ? ["NOI", "cash-on-cash", "IRR"] : [],
    recommended_internal_links: [
      "/commercial-lease-npv/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
    ],
    authoritative_source_needs: capRate
      ? ["authority definition of capitalization rate", "authority definition of NOI"]
      : [],
  };
}

function normalizeCoverageText(text: string): string {
  return text.toLowerCase().replace(/[-_/]/g, " ");
}

export function buildEntityCoveragePlan(plan: TopicalCompletenessPlan, text: string): EntityCoveragePlan {
  const haystack = normalizeCoverageText(text);
  const present = plan.required_entities.filter((entity) => haystack.includes(normalizeCoverageText(entity)));
  return {
    required_entities: plan.required_entities,
    present,
    missing: plan.required_entities.filter((entity) => !present.includes(entity)),
  };
}

function combinedText(draft: OrganicDraft): string {
  return `${draft.h1} ${draft.headings.join(" ")} ${draft.direct_answer ?? ""} ${draft.body}`.toLowerCase();
}

export function scoreQuestionClusterCoverage(plan: TopicalCompletenessPlan, draft: OrganicDraft): {
  score: number;
  band: CoverageBand;
  answered: string[];
  missing: string[];
} {
  const text = combinedText(draft);
  const required = plan.related_questions.filter((row) => row.disposition === "ANSWER_HERE");
  const answered = required.filter((row) => {
    const tokens = row.question.toLowerCase().replace(/[?]/g, "").split(/\s+/).filter((word) => word.length > 3);
    return tokens.filter((token) => text.includes(token)).length >= Math.min(2, tokens.length);
  });
  const score = required.length ? answered.length / required.length : 1;
  const band: CoverageBand = score >= 0.75 ? "HIGH" : score >= 0.5 ? "MEDIUM" : "LOW";
  return {
    score,
    band,
    answered: answered.map((row) => row.question),
    missing: required.filter((row) => !answered.includes(row)).map((row) => row.question),
  };
}

function requiredBand(complexity: TopicComplexity, contentType: OrganicContentType): CoverageBand {
  if (contentType === "BLOG" || contentType === "TIMELY_EDITORIAL") return complexity === "COMPLEX" ? "MEDIUM" : "LOW";
  if (complexity === "COMPLEX" || contentType === "GUIDE") return "HIGH";
  if (complexity === "SIMPLE") return "LOW";
  return "MEDIUM";
}

function bandRank(band: CoverageBand): number {
  return band === "HIGH" ? 3 : band === "MEDIUM" ? 2 : 1;
}

export function evaluateOrganicTopicalCompletenessGate(input: {
  draft: OrganicDraft;
  plan: TopicalCompletenessPlan;
}): OrganicNamedGate {
  const text = combinedText(input.draft);
  const reasons: string[] = [];
  const needs = [
    { key: "definition", test: /what is|definition|means|ratio used/i },
    { key: "method", test: /formula|divided by|equals|calculate/i },
    { key: "example", test: /example|sample|\$|percent/i },
    { key: "interpretation", test: /implies|means that|higher|lower|risk/i },
    { key: "limitations", test: /limit|does not|not a full|not the same/i },
    { key: "mistakes", test: /mistake|avoid|do not|common error/i },
  ];
  const required = input.plan.complexity === "SIMPLE" ? needs.slice(0, 2) : needs;
  for (const item of required) {
    if (!item.test.test(text)) reasons.push(`missing_${item.key}`);
  }
  if (input.plan.complexity === "COMPLEX" && input.draft.headings.length < 5) reasons.push("insufficient_sections");
  return {
    gate: ORGANIC_TOPICAL_COMPLETENESS_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateQuestionClusterCoverageGate(input: {
  draft: OrganicDraft;
  plan: TopicalCompletenessPlan;
}): OrganicNamedGate {
  const coverage = scoreQuestionClusterCoverage(input.plan, input.draft);
  const needed = requiredBand(input.plan.complexity, input.plan.content_type);
  const fail = bandRank(coverage.band) < bandRank(needed);
  return {
    gate: QUESTION_CLUSTER_COVERAGE_GATE,
    result: fail ? "FAIL" : "PASS",
    reasons: fail ? [`coverage_${coverage.band.toLowerCase()}`, ...coverage.missing.slice(0, 4)] : [`coverage_${coverage.band.toLowerCase()}`],
  };
}

export function evaluateEntityCoverageGate(input: {
  draft: OrganicDraft;
  plan: TopicalCompletenessPlan;
}): OrganicNamedGate {
  const entities = buildEntityCoveragePlan(input.plan, combinedText(input.draft));
  const allowedMissing = input.plan.complexity === "SIMPLE" ? entities.required_entities.length : input.plan.complexity === "MODERATE" ? 2 : 0;
  const fail = entities.missing.length > allowedMissing;
  return {
    gate: ENTITY_COVERAGE_GATE,
    result: fail ? "FAIL" : "PASS",
    reasons: fail ? entities.missing.map((row) => `missing_entity:${row}`) : ["entities_present"],
  };
}

export function evaluatePracticalUsefulnessGate(input: {
  draft: OrganicDraft;
  plan: TopicalCompletenessPlan;
}): OrganicNamedGate {
  const text = combinedText(input.draft);
  const reasons: string[] = [];
  if (!input.draft.direct_answer) reasons.push("no_direct_answer");
  if (input.plan.complexity !== "SIMPLE" && !/example|sample|\$\s*\d|percent/.test(text)) reasons.push("missing_example");
  if (input.plan.complexity === "COMPLEX" && !/limit|does not|not a full|mistake/.test(text)) reasons.push("dictionary_only");
  if (input.plan.complexity === "COMPLEX" && !/apply|use this|when the|recalculate|name the/.test(text)) reasons.push("not_actionable");
  return {
    gate: PRACTICAL_USEFULNESS_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function buildOrganicContentQualityProfile(input: {
  draft: OrganicDraft;
  plan: TopicalCompletenessPlan;
  evidence: OrganicNamedGate;
  links: number;
  seo: OrganicNamedGate;
}): OrganicContentQualityProfile {
  const cluster = scoreQuestionClusterCoverage(input.plan, input.draft);
  const entities = buildEntityCoveragePlan(input.plan, combinedText(input.draft));
  const topical = evaluateOrganicTopicalCompletenessGate({ draft: input.draft, plan: input.plan });
  const usefulness = evaluatePracticalUsefulnessGate({ draft: input.draft, plan: input.plan });
  const question_cluster_score = cluster.score;
  const entity_coverage = input.plan.required_entities.length
    ? entities.present.length / input.plan.required_entities.length
    : 1;
  const coverage_score = (question_cluster_score + entity_coverage + (topical.result === "PASS" ? 1 : 0.4)) / 3;
  const overall =
    topical.result === "FAIL" || usefulness.result === "FAIL" || cluster.band === "LOW"
      ? "FAIL"
      : coverage_score >= 0.75
        ? "PASS"
        : "REVISE";
  return {
    content_type: input.plan.content_type,
    topic_complexity: input.plan.complexity,
    coverage_score: Number(coverage_score.toFixed(2)),
    question_cluster_score: Number(question_cluster_score.toFixed(2)),
    entity_coverage: Number(entity_coverage.toFixed(2)),
    evidence_score: input.evidence.result === "PASS" ? 1 : 0,
    practical_usefulness_score: usefulness.result === "PASS" ? 1 : 0,
    internal_link_score: Math.min(1, input.links / 3),
    seo_geo_score: input.seo.result === "PASS" ? 1 : 0,
    overall,
  };
}

export function auditOrganicDraftDepth(input: {
  draft: OrganicDraft;
  plan: TopicalCompletenessPlan;
}): ContentAuditClass {
  const cluster = scoreQuestionClusterCoverage(input.plan, input.draft);
  const topical = evaluateOrganicTopicalCompletenessGate({ draft: input.draft, plan: input.plan });
  const usefulness = evaluatePracticalUsefulnessGate({ draft: input.draft, plan: input.plan });
  if (topical.result === "PASS" && usefulness.result === "PASS" && cluster.band === "HIGH") return "COMPLETE";
  if (cluster.band === "LOW" || usefulness.result === "FAIL") return "THIN";
  return "NEEDS_EXPANSION";
}

export function adjacentQuestionDemand(plan: TopicalCompletenessPlan): RelatedClusterQuestion[] {
  return plan.related_questions.filter((row) => row.disposition === "LINK_OUT");
}
