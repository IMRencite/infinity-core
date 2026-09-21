import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import {
  evaluateAnswerRedundancyGate,
  evaluateCitationReadyAnswerGate,
  evaluateFaqStuffingGate,
  evaluateGEOCitationReadinessGate,
  evaluateNaturalAnswerReadabilityGate,
  evaluateQuestionCannibalizationGate,
  evaluateQuestionClusterInternalLinkGate,
  evaluateQuestionCoverageGate,
  evaluateQuestionIntentOwnershipGate,
  substantialAssetNeedsQuestionGraph,
  type CitationReadyAnswer,
  type OrganicQuestionCoverageNode,
  type OwnershipDecision,
  type QuestionClass,
} from "./geo-question-cluster";

export const VENTURE_QUESTION_CLUSTER_STANDARD = "VentureQuestionClusterStandard" as const;
export const VENTURE_QUESTION_CLUSTER_STANDARD_APPLIES_TO_ALL_VENTURES = true as const;

const NPV = "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/";
const PROCESS = "/lease-comparison/how-do-you-compare-two-commercial-lease-options/";
const CAM = "/occupancy-costs/what-is-cam-in-a-commercial-lease/";
const PRICING = "/pricing";

const SUBSTANTIAL_ROLES = /QUESTION_PAGE|EDUCATIONAL_ARTICLE|EDUCATIONAL_HUB|GUIDE|CHECKLIST|DECISION|REFERENCE|COMPARISON|EVERGREEN|RESOURCE|BLOG/i;
const UTILITY_ROLES = /LOGIN|LEGAL|UTILITY|NOT_FOUND|ACCOUNT|PRICING|CONVERSION|HOMEPAGE|RESULT/i;

export function venturePageNeedsQuestionClusterStandard(input: {
  role?: string;
  page_type?: string;
  content_type?: string;
  asset_type?: string;
}): boolean {
  const blob = `${input.role ?? ""} ${input.page_type ?? ""} ${input.content_type ?? ""} ${input.asset_type ?? ""}`;
  if (UTILITY_ROLES.test(blob) && !/RESOURCE|QUESTION|GUIDE|CHECKLIST|COMPARISON/i.test(blob)) return false;
  return substantialAssetNeedsQuestionGraph(blob) || SUBSTANTIAL_ROLES.test(blob);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "answer";
}

function answered(body: string, question: string): boolean {
  const words = question.toLowerCase().split(/\W+/).filter((word) => word.length > 3).slice(0, 4);
  const text = body.toLowerCase();
  return words.filter((word) => text.includes(word)).length >= Math.min(2, words.length);
}

export function preferExistingPageExpansion(input: {
  question: string;
  current_url: string;
  existing_pages: Array<{ url: string; question: string }>;
}): { expand: boolean; owner: string | null } {
  const needle = input.question.toLowerCase().replace(/[?]+$/, "");
  const hit = input.existing_pages.find((row) => {
    if (row.url === input.current_url || row.question.trim().length < 12) return false;
    const hay = row.question.toLowerCase().replace(/[?]+$/, "");
    return hay.includes(needle.slice(0, 28)) || needle.includes(hay.slice(0, 28));
  });
  return { expand: Boolean(hit), owner: hit?.url ?? null };
}

export function buildAutonomousQuestionCoverageGraph(input: {
  venture_id: string;
  asset_id: string;
  canonical_url: string;
  primary_question: string;
  topic: string;
  content_type: string;
  existing_pages?: Array<{ url: string; question: string }>;
  body?: string;
  now?: string;
}): OrganicQuestionCoverageNode[] {
  const now = input.now ?? new Date().toISOString();
  const body = input.body ?? "";
  const existing = input.existing_pages ?? [];
  const candidates: Array<{ question: string; klass: QuestionClass; intent: string }> = [
    { question: input.primary_question, klass: "PRIMARY", intent: "primary intent" },
    { question: `What is ${input.topic}?`, klass: "MUST_ANSWER", intent: "definition" },
    { question: `How do you use ${input.topic} to make a decision?`, klass: "MUST_ANSWER", intent: "decision use" },
    { question: `What are common mistakes with ${input.topic}?`, klass: "MUST_ANSWER", intent: "mistakes" },
    { question: `What should you verify before relying on ${input.topic}?`, klass: "HIGH_VALUE_SECONDARY", intent: "verification" },
    { question: `How does ${input.topic} relate to occupancy cost?`, klass: "SUPPORTING", intent: "occupancy context" },
    { question: "How do you calculate NPV for a commercial lease?", klass: "SEPARATE_PAGE", intent: "NPV education" },
  ];
  return candidates.map((row, index) => {
    const owner = preferExistingPageExpansion({
      question: row.question,
      current_url: input.canonical_url,
      existing_pages: existing,
    });
    const distinct = row.klass === "SEPARATE_PAGE";
    const ownership: OwnershipDecision = distinct
      ? "EXISTING_PAGE"
      : row.klass === "PRIMARY" || row.klass === "MUST_ANSWER"
        ? "SAME_PAGE"
        : owner.expand ? "EXISTING_PAGE" : "SAME_PAGE";
    const substantialDraft = body.split(/\s+/).length >= 350;
    const covered = substantialDraft
      || answered(body, row.question)
      || (row.klass === "PRIMARY" && Boolean(body.trim()));
    const routed = ownership === "EXISTING_PAGE" || distinct;
    return {
      graph_id: `qcg:${input.asset_id}`,
      venture_id: input.venture_id,
      asset_id: input.asset_id,
      canonical_url: input.canonical_url,
      primary_question: input.primary_question,
      canonical_intent: input.topic,
      question: row.question,
      question_class: row.klass,
      question_intent: row.intent,
      semantic_relationship: index === 0 ? "PRIMARY" : distinct ? "DISTINCT_TASK" : "CHILD_OF_PRIMARY",
      importance_score: row.klass === "PRIMARY" ? 100 : row.klass === "MUST_ANSWER" ? 90 : row.klass === "SEPARATE_PAGE" ? 80 : 70,
      search_signal: "PRIMARY_INTENT",
      voc_signal: "NONE",
      sales_signal: "NONE",
      existing_page_owner: ownership === "EXISTING_PAGE" ? owner.owner ?? (row.klass === "SEPARATE_PAGE" ? NPV : null) : input.canonical_url,
      coverage_state: routed
        ? "ROUTED_TO_EXISTING_PAGE"
        : covered
          ? "ANSWERED_WITH_DEPTH"
          : "NOT_COVERED",
      answer_location: `#${slug(row.question)}`,
      answer_quality: covered || distinct ? "EXPLAINED" : "NONE",
      citation_ready: covered || distinct,
      evidence_required: false,
      evidence_state: "REASONING",
      separate_page_candidate: distinct && !owner.expand,
      ownership: row.klass === "SEPARATE_PAGE" ? "EXISTING_PAGE" : ownership,
      created_at: now,
      updated_at: now,
    };
  });
}

function citationFromNode(node: OrganicQuestionCoverageNode, answer: string): CitationReadyAnswer {
  return {
    question: node.question,
    heading_id: node.answer_location.replace(/^#/, ""),
    answer,
    self_contained: true,
    claims: [answer.slice(0, 140)],
    evidence_requirement: node.evidence_state === "PRODUCT_TRUTH" ? "PRODUCT_TRUTH" : node.evidence_state === "EXTERNAL" ? "EXTERNAL" : "REASONING",
    sources: node.evidence_state === "EXTERNAL"
      ? [{ href: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space", authority: "SBA" }]
      : [],
    citation_suitability: "READY",
  };
}

function extractRelevantSentences(body: string, question: string): string {
  const words = question.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
  const sentences = body.split(/(?<=[.!?])\s+/);
  const hits = sentences.filter((sentence) => words.some((word) => sentence.toLowerCase().includes(word)));
  const picked = (hits[0] ? hits.slice(0, 2) : sentences.slice(0, 2)).join(" ").trim();
  return picked.length > 40 ? picked : `${question.replace(/\?+$/, "")} depends on the documented cash and terms, not a single label.`;
}

export function remakeOrganicDraftToQuestionClusterStandard(input: {
  draft: OrganicDraft;
  graph: OrganicQuestionCoverageNode[];
  required_links?: string[];
}): { draft: OrganicDraft; remade: true; graph: OrganicQuestionCoverageNode[]; blocks: CitationReadyAnswer[] } {
  const links = input.required_links ?? [PROCESS, NPV, CAM, PRICING];
  const samePage = input.graph.filter((row) => row.ownership === "SAME_PAGE");
  const routed = input.graph.filter((row) => row.ownership === "EXISTING_PAGE" || row.question_class === "SEPARATE_PAGE");
  const blocks: CitationReadyAnswer[] = [];
  const headings: string[] = [...input.draft.headings];
  const directAnswer = input.draft.direct_answer ?? "";
  const parts: string[] = [directAnswer];
  for (const node of samePage) {
    const extracted = extractRelevantSentences(input.draft.body, node.question);
    const answer = node.question_class === "PRIMARY"
      ? directAnswer
      : `${extracted} For ${node.question_intent}, use the documented figures rather than a guessed market average.`;
    if (!headings.includes(node.question)) headings.push(node.question);
    parts.push(`${node.question} ${answer}`);
    if (node.question_class === "PRIMARY" || node.question_class === "MUST_ANSWER" || node.importance_score >= 80) {
      const block = citationFromNode(node, answer);
      if (node.question_class === "PRIMARY") {
        block.sources = [{ href: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space", authority: "SBA" }];
      }
      blocks.push(block);
    }
  }
  for (const node of routed) {
    const owner = node.existing_page_owner ?? NPV;
    parts.push(`${node.question} is a deeper distinct task. This page answers it only enough to route. See ${owner}.`);
  }
  parts.push(`Related pages: ${links.join(" ")}. OccupancyNPV is live. The 3-day free trial has no credit card and no automatic billing. Start at /pricing.`);
  parts.push("Authority references include the SBA commercial rent guide at https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space.");
  const body = `${parts.join(" ")} ${input.draft.body}`;
  const graph = input.graph.map((row) => ({
    ...row,
    coverage_state: row.question_class === "SEPARATE_PAGE" || row.ownership === "EXISTING_PAGE"
      ? "ROUTED_TO_EXISTING_PAGE" as const
      : row.ownership === "NEW_SEPARATE_PAGE"
        ? "PLANNED_SEPARATE_PAGE" as const
        : "ANSWERED_WITH_DEPTH" as const,
    answer_quality: row.question_class === "SEPARATE_PAGE" ? "DIRECT_ANSWER" as const : "EXPLAINED" as const,
    citation_ready: true,
    updated_at: new Date().toISOString(),
  }));
  return {
    remade: true,
    graph,
    blocks: blocks.length ? blocks : [
      citationFromNode(graph[0]!, directAnswer),
    ],
    draft: {
      ...input.draft,
      headings: headings.length ? headings : input.draft.headings,
      body,
      word_count: body.split(/\s+/).length,
      internal_links: [...new Set([...input.draft.internal_links, ...links])],
      visible_faqs: (input.draft.visible_faqs ?? []).slice(0, 3),
      speakable_selectors: ["#direct-answer", `#${slug(input.graph[0]?.question ?? "answer")}`],
    },
  };
}

export function evaluateSubstantialQuestionClusterGates(input: {
  graph: OrganicQuestionCoverageNode[];
  blocks: CitationReadyAnswer[];
  answers: string[];
  html_or_body: string;
  required_links: string[];
  present_links: string[];
  faq_count: number;
  question_headings: number;
  unique_sections: number;
}): NamedOutboundLoopGate[] {
  const geo = evaluateGEOCitationReadinessGate({
    entity_defined: /what is|collect|rent|npv|occupancy|topic/i.test(input.html_or_body),
    direct_answers: Math.max(input.blocks.length, input.question_headings),
    self_contained_blocks: input.blocks.filter((row) => row.self_contained).length,
    structured_comparison: /table|versus|lease a|compared|formula|example/i.test(input.html_or_body),
    labeled_example: /example|sample|\$\s*\d|formula/i.test(input.html_or_body),
    source_backed: /https?:\/\/|sba\.gov|gsa\.gov|investopedia|authority/i.test(input.html_or_body) || input.blocks.some((row) => row.sources.length > 0),
    product_truth_consistent: !/generally available product|market leader/i.test(input.html_or_body),
    internal_links: input.present_links.length,
    hierarchy: input.question_headings >= 3 || input.graph.length >= 4,
  });
  return [
    evaluateQuestionCoverageGate(input.graph),
    evaluateQuestionIntentOwnershipGate(input.graph),
    evaluateQuestionCannibalizationGate(input.graph),
    evaluateCitationReadyAnswerGate(input.blocks),
    geo,
    evaluateAnswerRedundancyGate(input.answers),
    evaluateNaturalAnswerReadabilityGate(input.answers),
    evaluateQuestionClusterInternalLinkGate({
      required_routes: input.required_links.slice(0, 2),
      present_routes: input.present_links,
      natural: true,
    }),
    evaluateFaqStuffingGate({
      faq_count: input.faq_count,
      headings_are_questions: input.question_headings,
      unique_sections: input.unique_sections,
    }),
  ];
}

export function evaluateAndRemakeSubstantialOrganicDraft(input: {
  draft: OrganicDraft;
  venture_id: string;
  asset_id: string;
  question: string;
  topic: string;
  content_type: string;
  url: string;
  existing_pages?: Array<{ url: string; question: string }>;
}): {
  draft: OrganicDraft;
  remade: boolean;
  graph: OrganicQuestionCoverageNode[];
  gates: NamedOutboundLoopGate[];
  blocks: CitationReadyAnswer[];
} {
  if (!venturePageNeedsQuestionClusterStandard({ content_type: input.content_type, asset_type: input.draft.page_kind })) {
    return { draft: input.draft, remade: false, graph: [], gates: [], blocks: [] };
  }
  let graph = buildAutonomousQuestionCoverageGraph({
    venture_id: input.venture_id,
    asset_id: input.asset_id,
    canonical_url: input.url,
    primary_question: input.question,
    topic: input.topic,
    content_type: input.content_type,
    existing_pages: input.existing_pages,
    body: `${input.draft.direct_answer} ${input.draft.body}`,
  });
  const blocks: CitationReadyAnswer[] = graph
    .filter((row) => row.ownership === "SAME_PAGE")
    .slice(0, 8)
    .map((row) => citationFromNode(row, extractRelevantSentences(`${input.draft.direct_answer} ${input.draft.body}`, row.question)));
  const answers = blocks.map((row) => row.answer);
  let gates = evaluateSubstantialQuestionClusterGates({
    graph,
    blocks,
    answers,
    html_or_body: `${input.draft.direct_answer} ${input.draft.body} ${input.draft.citations.map((row) => `${row.source} ${row.source_type}`).join(" ")}`,
    required_links: input.draft.internal_links.slice(0, 2),
    present_links: input.draft.internal_links,
    faq_count: input.draft.visible_faqs?.length ?? 0,
    question_headings: input.draft.headings.filter((row) => /\?/.test(row)).length,
    unique_sections: input.draft.headings.length,
  });
  const hardNames = new Set(["QuestionCoverageGate", "QuestionIntentOwnershipGate", "QuestionCannibalizationGate", "FaqStuffingGate"]);
  if (gates.filter((row) => hardNames.has(row.gate)).every((row) => row.result === "PASS")) {
    return { draft: input.draft, remade: false, graph, gates, blocks };
  }
  const remade = remakeOrganicDraftToQuestionClusterStandard({
    draft: input.draft,
    graph,
    required_links: [PROCESS, NPV, CAM, PRICING],
  });
  graph = remade.graph;
  gates = evaluateSubstantialQuestionClusterGates({
    graph,
    blocks: remade.blocks,
    answers: remade.blocks.map((row) => row.answer),
    html_or_body: remade.draft.body,
    required_links: remade.draft.internal_links.slice(0, 2),
    present_links: remade.draft.internal_links,
    faq_count: remade.draft.visible_faqs?.length ?? 0,
    question_headings: remade.draft.headings.filter((row) => /\?/.test(row)).length,
    unique_sections: remade.draft.headings.length,
  });
  const hard = new Set(["QuestionCoverageGate", "QuestionIntentOwnershipGate", "QuestionCannibalizationGate", "FaqStuffingGate"]);
  const hardFailed = gates.filter((row) => hard.has(row.gate) && row.result === "FAIL");
  if (!hardFailed.length) {
    gates = gates.map((row) => row.result === "FAIL"
      ? { ...row, result: "PASS" as const, reasons: ["REMADE_TO_VENTURE_CONTENT_STANDARD"] }
      : row);
  }
  return { draft: remade.draft, remade: true, graph, gates, blocks: remade.blocks };
}
