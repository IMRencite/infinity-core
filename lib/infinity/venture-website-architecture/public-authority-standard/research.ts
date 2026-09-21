import { LOCKED_QUALITY_FLOORS, TOPICAL_COVERAGE_DIMENSIONS } from "./constants";
import type {
  AuthorityContentGap,
  AuthorityQuestionNode,
  CoverageDecision,
  Gate,
  PublicQuestionKnowledgeGraph,
  SearchDemandClass,
  SearchQuestionEvidence,
  TopicCoverageState,
  TopicalCoverageDimension,
} from "./types";

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(what|does|do|is|are|the|a|an|in|for|of|to|how|why|when|should|you|your|mean|meaning)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(normalizeQuestion(text).split(" ").filter((item) => item.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap / union.size;
}

export function clusterSemanticQuestions(questions: string[]): Array<{
  canonicalQuestion: string;
  alternatePhrasings: string[];
  members: string[];
}> {
  const clusters: Array<{ canonicalQuestion: string; alternatePhrasings: string[]; members: string[]; bag: Set<string> }> = [];
  for (const question of questions) {
    const bag = tokens(question);
    const match = clusters.find((cluster) => jaccard(cluster.bag, bag) >= 0.62);
    if (match) {
      match.members.push(question);
      if (question !== match.canonicalQuestion) match.alternatePhrasings.push(question);
      match.bag = new Set([...match.bag, ...bag]);
    } else {
      clusters.push({ canonicalQuestion: question, alternatePhrasings: [], members: [question], bag });
    }
  }
  return clusters.map(({ canonicalQuestion, alternatePhrasings, members }) => ({
    canonicalQuestion,
    alternatePhrasings,
    members,
  }));
}

export function assignPrimaryTopic(input: { topicScores: Array<{ topic: string; score: number }> }): {
  primaryTopic: string;
  secondaryTopics: string[];
} {
  const ranked = [...input.topicScores].sort((a, b) => b.score - a.score);
  const primary = ranked[0]?.topic;
  if (!primary) throw new Error("topic_ownership_requires_one_primary");
  return {
    primaryTopic: primary,
    secondaryTopics: ranked.slice(1).filter((row) => row.score > 0).map((row) => row.topic),
  };
}

export function interpretUnknownVolume(evidence: Pick<SearchQuestionEvidence, "monthlyVolume" | "demandClass">): {
  unknown: boolean;
  treatedAsZero: false;
  fabricated: false;
} {
  const unknown = evidence.monthlyVolume === null || evidence.demandClass === "SEARCH_DEMAND_UNKNOWN";
  return { unknown, treatedAsZero: false, fabricated: false };
}

export function rejectFabricatedSearchMetrics(input: {
  monthlyVolume?: number | null;
  rankingDifficulty?: number | null;
  trafficEstimate?: number | null;
  cpc?: number | null;
  trend?: number | null;
  claimedActual: boolean;
}): Gate {
  const numeric = [input.monthlyVolume, input.rankingDifficulty, input.trafficEstimate, input.cpc, input.trend];
  const hasNumber = numeric.some((value) => typeof value === "number");
  if (hasNumber && input.claimedActual === false) return "FAIL";
  return "PASS";
}

export function evaluateQuestionCoverageRule(input: {
  coreTopics: string[];
  relationshipsByTopic: Record<string, number>;
  standalonePagesByTopic?: Record<string, number>;
}): { overall: Gate; coverageNotPageCount: true; failures: string[] } {
  const failures: string[] = [];
  for (const topic of input.coreTopics) {
    if ((input.relationshipsByTopic[topic] ?? 0) < LOCKED_QUALITY_FLOORS.minValidatedQuestionsPerCoreTopic) {
      failures.push(`${topic}:below_20_relationships`);
    }
  }
  return { overall: failures.length ? "FAIL" : "PASS", coverageNotPageCount: true, failures };
}

export function topicCoverageState(input: {
  researchedQuestions: number;
  meaningfulRelationships: number;
  contentSatisfied: number;
}): TopicCoverageState {
  if (input.researchedQuestions === 0) return "UNRESEARCHED";
  if (input.researchedQuestions < 20) return "RESEARCHED_INCOMPLETE";
  if (input.meaningfulRelationships >= 20 && input.contentSatisfied < 20) return "SEARCH_COVERAGE_READY";
  if (input.meaningfulRelationships >= 20 && input.contentSatisfied >= 20 && input.contentSatisfied < input.meaningfulRelationships) {
    return "CONTENT_COVERAGE_PARTIAL";
  }
  if (input.meaningfulRelationships >= 20 && input.contentSatisfied >= 20) return "TOPIC_AUTHORITY_READY";
  return "RESEARCHED_INCOMPLETE";
}

export function evaluateStandaloneEligibility(input: {
  distinctIntent: boolean;
  independentSearchUsefulness: boolean;
  substantialAnswerDepth: boolean;
  canSupportTwoThousandWordsWithoutPadding: boolean;
  meaningfulGraphRelationships: boolean;
  geoUtility: boolean;
  decisionUsefulness: boolean;
}): { gate: "StandaloneAuthorityPageEligibilityGate"; overall: Gate; decision: CoverageDecision } {
  const ready =
    input.distinctIntent &&
    input.independentSearchUsefulness &&
    input.substantialAnswerDepth &&
    input.canSupportTwoThousandWordsWithoutPadding &&
    input.meaningfulGraphRelationships &&
    input.geoUtility &&
    input.decisionUsefulness;
  return {
    gate: "StandaloneAuthorityPageEligibilityGate",
    overall: ready ? "PASS" : "FAIL",
    decision: ready ? "BUILD_STANDALONE" : "ADD_TO_HUB",
  };
}

export function evaluateTopicalCompleteness(input: {
  meaningfulRelationships: number;
  coveredDimensions: TopicalCoverageDimension[];
  standaloneUrlCount?: number;
}): { gate: "TopicalCompletenessGate"; overall: Gate; coverageNotPageCount: true } {
  const dimensionPass = TOPICAL_COVERAGE_DIMENSIONS.every((dimension) => input.coveredDimensions.includes(dimension));
  const relationshipPass = input.meaningfulRelationships >= 20;
  return {
    gate: "TopicalCompletenessGate",
    overall: dimensionPass && relationshipPass ? "PASS" : "FAIL",
    coverageNotPageCount: true,
  };
}

export function buildAuthorityContentGap(input: {
  question: string;
  topic: string;
  decision: CoverageDecision;
  reason: string;
  searchEvidence: SearchQuestionEvidence["evidenceClass"];
  priority?: AuthorityContentGap["priority"];
  semanticRelationships?: string[];
  commercialRelevance?: AuthorityContentGap["commercialRelevance"];
}): AuthorityContentGap {
  return {
    model: "AuthorityContentGap",
    gapId: `gap_${normalizeQuestion(input.question).replace(/\s+/g, "_").slice(0, 48)}`,
    question: input.question,
    topic: input.topic,
    decision: input.decision,
    reason: input.reason,
    searchEvidence: input.searchEvidence,
    priority: input.priority ?? "MEDIUM",
    semanticRelationships: input.semanticRelationships ?? [],
    commercialRelevance: input.commercialRelevance ?? "MEDIUM",
  };
}

export function buildQuestionKnowledgeGraph(nodes: AuthorityQuestionNode[]): PublicQuestionKnowledgeGraph {
  const clusters = clusterSemanticQuestions(nodes.map((node) => node.canonicalQuestion)).map((cluster, index) => {
    const members = nodes.filter((node) => cluster.members.includes(node.canonicalQuestion));
    return {
      clusterId: members[0]?.clusterId ?? `cluster_${index}`,
      canonicalQuestion: cluster.canonicalQuestion,
      alternatePhrasings: cluster.alternatePhrasings,
      primaryTopic: members[0]?.primaryTopic ?? "",
      secondaryTopics: [...new Set(members.flatMap((node) => node.secondaryTopics))],
      primaryRoute: null,
      questionIds: members.map((node) => node.questionId),
    };
  });
  return { model: "QuestionKnowledgeGraph", nodes, clusters, fabricatedSearchDemand: false };
}

export function demandClassForUnknownVolume(): SearchDemandClass {
  return "SEARCH_DEMAND_UNKNOWN";
}
