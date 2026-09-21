import { AUTHORITY_CONTENT_GAP, PUBLISHABILITY_REVIEW } from "../constants";
import { MAX_AUTHORITY_REPAIR_LOOPS, QC_LAYERS } from "./constants";
import { repairScope } from "../content-roles";
import { evaluateCitationReadiness } from "./citation-and-sources";
import { evaluateVentureQuestionClusterStandard } from "@/lib/infinity/organic-growth-engine/question-cluster/venture-content-standard";
import { evaluateAuthorityPageDepth, evaluateDirectResponsePage, evaluatePagePatternFulfillment } from "./depth-and-direct-response";
import { extractAnswerFirstBlocks, pageContent } from "./page-inspect";
import { evaluateInformationDensity, evaluatePageVisualPlan, evaluateSectionVariety, evaluateSemanticCoverage, keywordStuffingDetected } from "./visual-and-semantic";
import type {
  AdversarialFailReason,
  AuthorityContentGap,
  AuthorityRepairPlan,
  CompetitiveCoverageProfile,
  LayeredQcResult,
  PublishabilityReview,
  QcLayer,
  QcState,
  QuestionCoverageProfile,
  QuestionKnowledgeGraph,
} from "./types";
import type { PlannedPage } from "../types";

export function competitiveCoverageProfile(topic: string): CompetitiveCoverageProfile {
  return {
    model: "CompetitiveCoverageProfile",
    topic,
    referencePages: [],
    questionCoverageObserved: "BENCHMARK_ONLY",
    entityCoverageObserved: "BENCHMARK_ONLY",
    visualPatternsObserved: ["comparison table", "definition block", "worked numeric example"],
    authoritySignalsObserved: ["named finance references", "industry organizations"],
    coverageGaps: ["cash-flow timing diagrams", "broker workflow depth", "incentive interaction examples"],
    infinityDifferentiationOpportunities: [
      "shareable client-summary workflow",
      "discount-rate sensitivity beside terms",
      "honest validation-stage offer",
    ],
    copiedProse: false,
    clonedComposition: false,
    plagiarism: false,
  };
}

export function plagiarismPolicy() {
  return {
    copyCompetitorText: false,
    copyProprietaryGraphics: false,
    clonePageComposition: false,
    reuseBrandedClaims: false,
  };
}

export function reviewPublishability(input: {
  route: string;
  role: string;
  content: string;
  intendedPatternId: string;
}): PublishabilityReview {
  void PUBLISHABILITY_REVIEW;
  const depth = evaluateAuthorityPageDepth({
    route: input.route,
    role: input.role,
    content: input.content,
    topicComplexity: input.role === "PRICING" || input.role === "CONVERSION" || input.role === "FAQ" ? "LOW" : "HIGH",
  });
  const visual = evaluatePageVisualPlan({ route: input.route, content: input.content });
  const variety = evaluateSectionVariety({ route: input.route, content: input.content });
  const density = evaluateInformationDensity({ route: input.route, content: input.content });
  const pattern = evaluatePagePatternFulfillment({ patternId: input.intendedPatternId, content: input.content });
  const answers = extractAnswerFirstBlocks(input.content);
  const sourceRefs = [...input.content.matchAll(/https?:\/\/[^\s"'<]+/g)].map((match) => match[0]);
  const citation = answers[0]
    ? evaluateCitationReadiness({
        question: answers[0].question,
        answer: answers[0].answer,
        entityRefs: [],
        sourceRefs,
      })
    : null;
  const feelsThin = depth.overall === "FAIL" || depth.belowGuidanceBand;
  const feelsGeneric = variety.repetitiveWhiteBoxPattern || /unlock growth|seamless experience/i.test(input.content);
  const hardFailReasons: AdversarialFailReason[] = [];
  if (feelsThin) hardFailReasons.push("TOO_THIN");
  if (feelsGeneric) hardFailReasons.push("GENERIC_AI_COPY");
  if (visual.adequate === "FAIL") hardFailReasons.push("INSUFFICIENT_VISUAL_EXPLANATION");
  if (pattern.overall === "FAIL") hardFailReasons.push("REPETITIVE_TEMPLATE");
  if (density.excessiveLowInformationEmptySpace) hardFailReasons.push("EXCESSIVE_EMPTY_SPACE");
  if (input.role === "HOMEPAGE" && evaluateDirectResponsePage({ route: input.route, content: input.content, commercial: true }).overall === "FAIL") {
    hardFailReasons.push("INSUFFICIENT_DIRECT_RESPONSE");
    hardFailReasons.push("WEAK_CONVERSION_PATH");
  }
  if (!answers.length && (input.role === "QUESTION_PAGE" || input.role === "EDUCATIONAL_ARTICLE")) {
    hardFailReasons.push("INSUFFICIENT_QUESTION_COVERAGE");
  }
  const cluster = evaluateVentureQuestionClusterStandard({
    venture_id: "any-venture",
    role: input.role,
    html: input.content,
    route: input.route,
  });
  if (cluster.applies && cluster.overall.result === "FAIL") {
    const stuffing = cluster.gates.some((row) => row.gate === "FaqStuffingGate" && row.result === "FAIL");
    const noCitation = cluster.gates.some((row) => row.gate === "CitationReadyAnswerGate" && row.result === "FAIL") && !answers.length;
    if (stuffing || noCitation) hardFailReasons.push("INSUFFICIENT_QUESTION_COVERAGE");
  }
  if (citation && citation.sourceSupport === "FAIL" && input.role !== "CONVERSION" && input.role !== "PRICING" && input.role !== "FAQ") {
    hardFailReasons.push("WEAK_SOURCE_GROUNDING");
  }
  const overall: QcState = hardFailReasons.length ? "FAIL" : feelsThin ? "PASS_WITH_WARNINGS" : "PASS";
  return {
    model: "PUBLISHABILITY_REVIEW",
    route: input.route,
    wouldCompeteWithStrongPages: feelsThin ? "FAIL" : "PASS",
    fullyAnswersPrimaryIntent: depth.questionCoverage,
    feelsThin,
    feelsGeneric,
    feelsObviouslyAiGenerated: feelsGeneric && feelsThin,
    enoughExamples: depth.exampleAdequacy,
    enoughVisualExplanation: visual.adequate,
    enoughSourceSupport: depth.sourceAdequacy,
    handlesObjections: /not automatically|finished product|payment is not collected/i.test(input.content) ? "PASS" : "FAIL",
    coherentConversionPath: depth.conversionPath,
    fulfillsIntendedPattern: pattern.overall,
    seriousOwnerWouldPublish: overall === "PASS" ? "PASS" : "FAIL",
    hardFailReasons: [...new Set(hardFailReasons)],
    warningReasons: variety.repetitiveWhiteBoxPattern ? ["non-critical layout repetition"] : [],
    overall,
  };
}

export function adversarialReview(review: PublishabilityReview): { state: QcState; failReasons: AdversarialFailReason[]; rubberStamp: false } {
  return {
    state: review.hardFailReasons.length ? "FAIL" : review.overall,
    failReasons: review.hardFailReasons,
    rubberStamp: false,
  };
}

export function buildAuthorityContentGaps(input: {
  graph: QuestionKnowledgeGraph;
  pages: PlannedPage[];
  files: Array<{ path: string; content: string }>;
}): AuthorityContentGap[] {
  void AUTHORITY_CONTENT_GAP;
  const gaps: AuthorityContentGap[] = [];
  for (const node of input.graph.nodes) {
    if (node.answerState === "UNANSWERED" && node.priority === 1) {
      gaps.push({
        gapId: `gap_unanswered_${node.questionId}`,
        reason: node.recommendedContentDisposition === "DEDICATED_PAGE" ? "DEDICATED_PAGE_NEEDED" : "QUESTION_UNANSWERED",
        questionId: node.questionId,
        route: node.mappedRoute,
        summary: node.question,
        priority: node.priority,
      });
    } else if (node.answerState === "SHALLOW" && node.priority === 1) {
      gaps.push({
        gapId: `gap_shallow_${node.questionId}`,
        reason: "ANSWER_TOO_SHALLOW",
        questionId: node.questionId,
        route: node.mappedRoute,
        summary: node.question,
        priority: node.priority,
      });
    }
  }
  for (const page of input.pages.filter((item) => item.role !== "LEGAL")) {
    const content = pageContent(input.files, page.route);
    const visual = evaluatePageVisualPlan({ route: page.route, content });
    if (visual.adequate === "FAIL") {
      gaps.push({
        gapId: `gap_visual_${page.route}`,
        reason: "VISUAL_EXPLANATION_MISSING",
        questionId: null,
        route: page.route,
        summary: `Visual explanation insufficient on ${page.route}`,
        priority: 1,
      });
    }
    if (evaluateSemanticCoverage({
      route: page.route,
      role: page.role,
      content,
      primaryTopic: page.title,
      searchIntent: page.primaryIntent,
      entityTarget: page.topicCluster,
    }).overall === "FAIL") {
      gaps.push({
        gapId: `gap_semantic_${page.route}`,
        reason: "SEMANTIC_COVERAGE_WEAK",
        questionId: null,
        route: page.route,
        summary: `Semantic coverage weak on ${page.route}`,
        priority: 2,
      });
    }
  }
  return gaps;
}

export function planAuthorityRepair(input: {
  pages: PlannedPage[];
  files: Array<{ path: string; content: string }>;
  gaps: AuthorityContentGap[];
  reviews: PublishabilityReview[];
}): AuthorityRepairPlan {
  const hard = input.reviews.filter((item) => item.overall === "FAIL");
  const pagesToExpand = [...new Set(hard.map((item) => item.route))];
  const visualizationsNeeded = input.gaps.filter((gap) => gap.reason === "VISUAL_EXPLANATION_MISSING").length;
  const questionsToAdd = input.gaps.filter((gap) => gap.reason === "QUESTION_UNANSWERED" || gap.reason === "ANSWER_TOO_SHALLOW").length;
  const newDedicated = input.gaps.filter((gap) => gap.reason === "DEDICATED_PAGE_NEEDED").length;
  return {
    successorRequired: hard.length > 0,
    pagesToExpand,
    questionsToAdd,
    newDedicatedPagesRecommended: newDedicated,
    existingPagesNeedingDeeperSections: pagesToExpand.length,
    visualizationsNeeded,
    sourceResearchNeeded: true,
    internalLinkRepairs: input.gaps.filter((gap) => gap.reason === "INTERNAL_LINK_GAP").length,
    directResponseRepairs: hard.filter((item) => item.hardFailReasons.includes("INSUFFICIENT_DIRECT_RESPONSE")).length,
    estimatedCostState: "UNKNOWN",
    maxRepairLoops: MAX_AUTHORITY_REPAIR_LOOPS,
    regenerateEntireSite: false,
    targetedRepairRequired: true,
    deployed: false,
  };
}

export function boundedRepairLoop(failedDimensions: string[], attempt: number) {
  const scoped = repairScope(failedDimensions);
  return {
    attempt,
    max: MAX_AUTHORITY_REPAIR_LOOPS,
    ...scoped,
    unresolvedQualityBlocker: attempt >= MAX_AUTHORITY_REPAIR_LOOPS,
    infiniteRegeneration: false,
  };
}

export function runLayeredQc(input: {
  technicalPass: boolean;
  contentPass: boolean;
  directResponsePass: boolean;
  visualPass: boolean;
  seoGeoPass: boolean;
  answerAuthorityPass: boolean;
  adversarialPass: boolean;
  publishabilityPass: boolean;
  stuffing: boolean;
  renderedLayoutPass?: boolean;
  premiumCompositionPass?: boolean;
}): LayeredQcResult[] {
  const row = (layer: QcLayer, pass: boolean, hardFails: string[], warnings: string[] = []): LayeredQcResult => ({
    layer,
    state: pass ? "PASS" : "FAIL",
    hardFails: pass ? [] : hardFails,
    warnings,
  });
  return [
    row("TECHNICAL_QC", input.technicalPass, ["technical baseline failed"]),
    row("CONTENT_QC", input.contentPass, ["depth or uniqueness insufficient"]),
    row("DIRECT_RESPONSE_QC", input.directResponsePass, ["commercial sequence incomplete"]),
    row("VISUAL_QC", input.visualPass, ["visual explanation insufficient"]),
    row("SEO_GEO_QC", input.seoGeoPass && !input.stuffing, input.stuffing ? ["keyword stuffing"] : ["question or citation sufficiency failed"]),
    row("ANSWER_AUTHORITY_QC", input.answerAuthorityPass, ["direct answers not citation-ready"]),
    row("RENDERED_LAYOUT_QC", input.renderedLayoutPass !== false, ["rendered geometry failed"]),
    row("PREMIUM_COMPOSITION_QC", input.premiumCompositionPass !== false, ["premium composition failed"]),
    row("ADVERSARIAL_QC", input.adversarialPass, ["adversarial rejection"]),
    row("PUBLISHABILITY_QC", input.publishabilityPass, ["human publishability failed"]),
  ];
}

export function qcLayerNames() {
  return QC_LAYERS;
}

export function coverageToExpansionMissions(input: {
  gaps: AuthorityContentGap[];
  coverage: QuestionCoverageProfile;
}) {
  return [...input.gaps]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8)
    .map((gap) => ({
      topic: gap.summary,
      reason: gap.reason,
      autoPublish: false as const,
      coverageClaim: input.coverage.coverageClaim,
    }));
}

export function keywordStuffingHardFail(content: string): boolean {
  return keywordStuffingDetected(content);
}
