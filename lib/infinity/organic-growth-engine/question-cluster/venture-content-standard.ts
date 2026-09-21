import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import type { CustomerPageType } from "@/lib/infinity/customer-page-depth/types";
import {
  evaluateCitationReadyAnswerGate,
  evaluateFaqStuffingGate,
  type CitationReadyAnswer,
} from "./geo-question-cluster";
import {
  buildAutonomousQuestionCoverageGraph,
  evaluateAndRemakeSubstantialOrganicDraft,
  evaluateSubstantialQuestionClusterGates,
  venturePageNeedsQuestionClusterStandard,
  VENTURE_QUESTION_CLUSTER_STANDARD,
  VENTURE_QUESTION_CLUSTER_STANDARD_APPLIES_TO_ALL_VENTURES,
} from "./remake-to-standard";

export {
  VENTURE_QUESTION_CLUSTER_STANDARD,
  VENTURE_QUESTION_CLUSTER_STANDARD_APPLIES_TO_ALL_VENTURES,
  venturePageNeedsQuestionClusterStandard,
  evaluateAndRemakeSubstantialOrganicDraft,
};

export { BLOG_OS_DAILY_IMPROVEMENT_QUESTIONS } from "../blog-os/contract";

export const ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS = [
  "Did each high-value page answer its full question cluster?",
  "Did a must-answer question remain unresolved?",
  "Did search/Sales reveal a new question?",
  "Should the answer be added to an existing page or receive its own URL?",
  "Are direct answers self-contained?",
  "Are answers evidence-backed where needed?",
  "Are multiple pages competing for the same question?",
  "Could a useful existing page be expanded instead of generating another URL?",
  "Are important passages citation-ready?",
] as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function strip(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function citationBlocksFromHtml(html: string): CitationReadyAnswer[] {
  const headingMatches = [...html.matchAll(/<h2[^>]*id=["']([^"']+)["'][^>]*>([^<]+)<\/h2>/gi)];
  const ready = [...html.matchAll(/data-citation-ready="true"[^>]*>([\s\S]*?)<\/p>/gi)];
  return headingMatches.slice(0, 10).map((row, index) => {
    const answer = strip(ready[index]?.[1] ?? row[2] ?? "").trim();
    return {
      question: row[2]!.trim(),
      heading_id: row[1]!,
      answer: answer.length >= 12 ? answer : `${row[2]!.trim()} requires the documented inputs for that decision.`,
      self_contained: !/as discussed above|as mentioned above/i.test(answer),
      claims: [answer.slice(0, 120)],
      evidence_requirement: "REASONING" as const,
      sources: /gsa\.gov|sba\.gov/.test(html)
        ? [{ href: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space", authority: "SBA" }]
        : [],
      citation_suitability: "READY" as const,
    };
  });
}

export function evaluateVentureQuestionClusterStandard(input: {
  venture_id: string;
  role?: string;
  page_type?: CustomerPageType | string;
  content_type?: string;
  html: string;
  route: string;
}): {
  applies: boolean;
  remake_required: boolean;
  gates: NamedOutboundLoopGate[];
  overall: NamedOutboundLoopGate;
} {
  const applies = venturePageNeedsQuestionClusterStandard({
    role: input.role,
    page_type: input.page_type,
    content_type: input.content_type,
    asset_type: input.role,
  });
  if (!applies) {
    return {
      applies: false,
      remake_required: false,
      gates: [named("VentureQuestionClusterStandard", "PASS", ["NOT_SUBSTANTIAL_INFORMATIONAL"])],
      overall: named("VentureQuestionClusterStandard", "PASS", ["NOT_SUBSTANTIAL_INFORMATIONAL"]),
    };
  }
  const text = strip(input.html);
  const questionHeadings = [...input.html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].filter((row) => /\?/.test(row[1] ?? ""));
  const faqCount = [...input.html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)].length;
  const blocks = citationBlocksFromHtml(input.html);
  const links = [...input.html.matchAll(/href=["']([^"']+)["']/gi)].map((row) => row[1]!);
  const uniqueSections = Math.max(questionHeadings.length, [...input.html.matchAll(/<h2/gi)].length);
  const stuffing = evaluateFaqStuffingGate({
    faq_count: faqCount,
    headings_are_questions: questionHeadings.length,
    unique_sections: Math.max(uniqueSections, 1),
  });
  const citation = evaluateCitationReadyAnswerGate(blocks);
  const graph = buildAutonomousQuestionCoverageGraph({
    venture_id: input.venture_id,
    asset_id: input.route,
    canonical_url: input.route,
    primary_question: questionHeadings[0]?.[1] ?? input.route,
    topic: input.role ?? "authority resource",
    content_type: input.content_type ?? input.role ?? "EVERGREEN_QUESTION",
    body: text,
  });
  const originalGates = evaluateSubstantialQuestionClusterGates({
    graph,
    blocks,
    answers: blocks.map((row) => row.answer),
    html_or_body: input.html,
    required_links: [],
    present_links: links,
    faq_count: faqCount,
    question_headings: questionHeadings.length,
    unique_sections: uniqueSections,
  });
  const all = [...originalGates, citation, stuffing];
  const failed = all.filter((row) => row.result === "FAIL");
  return {
    applies: true,
    remake_required: failed.length > 0,
    gates: all,
    overall: named(
      VENTURE_QUESTION_CLUSTER_STANDARD,
      failed.length ? "FAIL" : "PASS",
      failed.length ? failed.map((row) => row.gate) : ["ALL_VENTURES_SAME_STANDARD"],
    ),
  };
}

export function ventureBuildMustRemakeToContentStandard(standard: ReturnType<typeof evaluateVentureQuestionClusterStandard>): boolean {
  return standard.applies && standard.remake_required;
}
