import { createHash } from "node:crypto";
import { PUBLIC_WEB_RESEARCH_RUNTIME } from "@/lib/infinity/research/public-web/capabilities";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { KNOWN_HIGH_CONFIDENCE_QUESTION_COVERAGE, QUESTION_KNOWLEDGE_GRAPH } from "../constants";
import { creAuthoritySources } from "../geo-seo-architecture";
import { extractAnswerFirstBlocks, pageContent } from "./page-inspect";
import type { ContentDisposition, QuestionClass, QuestionCoverageProfile, QuestionKnowledgeGraph, QuestionNode } from "./types";

const VENTURE_ID = `candidate:${CRE_CANDIDATE_ID}`;

type Seed = {
  question: string;
  topicId: string;
  intent: QuestionClass;
  entities: string[];
  commercial: "HIGH" | "MEDIUM" | "LOW";
  citation: "HIGH" | "MEDIUM" | "LOW";
  disposition: ContentDisposition;
  clusterId: string;
  mappedRoute: string | null;
  mappedSection: string | null;
  parent?: string | null;
};

function idFor(question: string): string {
  return `q_${createHash("sha256").update(question.toLowerCase()).digest("hex").slice(0, 16)}`;
}

export function canonicalQuestionId(question: string): string {
  return idFor(question);
}

function normalize(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CRE_SEEDS: Seed[] = [
  { question: "What is NPV in a commercial lease?", topicId: "npv", intent: "DEFINITION", entities: ["npv", "commercial_lease"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "direct-answer" },
  { question: "How do you calculate commercial lease NPV?", topicId: "npv", intent: "CALCULATION", entities: ["npv", "lease_cash_flow"], commercial: "HIGH", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "how-it-works" },
  { question: "Why is NPV useful when comparing leases?", topicId: "npv", intent: "WHY", entities: ["npv", "occupancy_cost"], commercial: "HIGH", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "why" },
  { question: "What discount rate should be used for lease NPV?", topicId: "discount_rate", intent: "DECISION", entities: ["discount_rate", "npv"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "discount_rate", mappedRoute: "/discount-rate-sensitivity", mappedSection: "direct-answer" },
  { question: "Does free rent affect lease NPV?", topicId: "free_rent", intent: "WHAT_HAPPENS_IF", entities: ["free_rent", "npv"], commercial: "HIGH", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "example" },
  { question: "How does tenant improvement allowance affect NPV?", topicId: "ti", intent: "CALCULATION", entities: ["tenant_improvement_allowance", "npv"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "ti", mappedRoute: "/tenant-improvement-allowance", mappedSection: "direct-answer" },
  { question: "Should CAM be included in lease NPV?", topicId: "cam", intent: "DECISION", entities: ["cam", "npv", "operating_expenses"], commercial: "HIGH", citation: "HIGH", disposition: "HUB_SECTION", clusterId: "cam", mappedRoute: "/resources", mappedSection: "expansion" },
  { question: "How do rent escalations affect NPV?", topicId: "escalation", intent: "WHAT_HAPPENS_IF", entities: ["rent_escalation", "npv"], commercial: "HIGH", citation: "HIGH", disposition: "HUB_SECTION", clusterId: "escalation", mappedRoute: "/resources", mappedSection: "expansion" },
  { question: "How do you compare leases with different terms?", topicId: "compare", intent: "COMPARISON", entities: ["commercial_lease", "lease_term"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "compare", mappedRoute: "/compare-commercial-leases", mappedSection: "direct-answer" },
  { question: "Is lower NPV always the better lease?", topicId: "npv", intent: "LIMITATION", entities: ["npv"], commercial: "HIGH", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "mistakes" },
  { question: "NPV vs total lease cost", topicId: "npv", intent: "ALTERNATIVE", entities: ["npv", "occupancy_cost"], commercial: "MEDIUM", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "questions" },
  { question: "NPV vs effective rent", topicId: "effective_rent", intent: "ALTERNATIVE", entities: ["npv", "effective_rent"], commercial: "MEDIUM", citation: "HIGH", disposition: "NOT_WORTH_SEPARATE_CONTENT", clusterId: "npv", mappedRoute: null, mappedSection: null },
  { question: "What costs belong in lease NPV?", topicId: "npv", intent: "DEFINITION", entities: ["npv", "occupancy_cost", "cam"], commercial: "HIGH", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "deeper" },
  { question: "What are common lease NPV mistakes?", topicId: "npv", intent: "MISTAKE", entities: ["npv"], commercial: "HIGH", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "mistakes" },
  { question: "How do tenant-rep brokers use NPV?", topicId: "tenant_rep", intent: "PROFESSIONAL_WORKFLOW", entities: ["tenant_representation", "npv"], commercial: "HIGH", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "workflow", mappedRoute: "/how-it-works", mappedSection: "workflow" },
  { question: "What is a tenant improvement allowance?", topicId: "ti", intent: "DEFINITION", entities: ["tenant_improvement_allowance"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "ti", mappedRoute: "/tenant-improvement-allowance", mappedSection: "direct-answer" },
  { question: "What is CAM in a commercial lease?", topicId: "cam", intent: "DEFINITION", entities: ["cam", "operating_expenses"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "cam", mappedRoute: null, mappedSection: null },
  { question: "How does free rent change occupancy cost?", topicId: "free_rent", intent: "HOW_IT_WORKS", entities: ["free_rent", "occupancy_cost"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "free_rent", mappedRoute: null, mappedSection: null },
  { question: "How do rent escalations change a comparison?", topicId: "escalation", intent: "COMPARISON", entities: ["rent_escalation"], commercial: "HIGH", citation: "MEDIUM", disposition: "DEDICATED_PAGE", clusterId: "escalation", mappedRoute: null, mappedSection: null },
  { question: "What is percentage rent?", topicId: "percentage_rent", intent: "DEFINITION", entities: ["percentage_rent"], commercial: "MEDIUM", citation: "MEDIUM", disposition: "NOT_WORTH_SEPARATE_CONTENT", clusterId: "percentage_rent", mappedRoute: null, mappedSection: null },
  { question: "What is occupancy cost?", topicId: "occupancy", intent: "DEFINITION", entities: ["occupancy_cost"], commercial: "HIGH", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "compare", mappedRoute: "/compare-commercial-leases", mappedSection: "direct-answer" },
  { question: "What belongs in a lease cash-flow model?", topicId: "cash_flow", intent: "PROCESS", entities: ["lease_cash_flow"], commercial: "HIGH", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "how-it-works" },
  { question: "What is effective rent?", topicId: "effective_rent", intent: "DEFINITION", entities: ["effective_rent"], commercial: "MEDIUM", citation: "MEDIUM", disposition: "NOT_WORTH_SEPARATE_CONTENT", clusterId: "effective_rent", mappedRoute: null, mappedSection: null },
  { question: "How does tenant representation use a client summary?", topicId: "tenant_rep", intent: "PROFESSIONAL_WORKFLOW", entities: ["tenant_representation", "client_summary"], commercial: "HIGH", citation: "LOW", disposition: "COMMERCIAL_PAGE_SECTION", clusterId: "workflow", mappedRoute: "/how-it-works", mappedSection: "workflow" },
  { question: "How do you compare leases with different lease terms?", topicId: "lease_term", intent: "COMPARISON", entities: ["lease_term", "commercial_lease"], commercial: "HIGH", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "compare", mappedRoute: "/compare-commercial-leases", mappedSection: "direct-answer" },
  { question: "What are renewal options worth in a comparison?", topicId: "renewal", intent: "DECISION", entities: ["renewal_options"], commercial: "MEDIUM", citation: "MEDIUM", disposition: "NOT_WORTH_SEPARATE_CONTENT", clusterId: "compare", mappedRoute: null, mappedSection: null },
  { question: "What operating expenses belong beside face rent?", topicId: "opex", intent: "DEFINITION", entities: ["operating_expenses", "cam"], commercial: "HIGH", citation: "MEDIUM", disposition: "HUB_SECTION", clusterId: "cam", mappedRoute: "/resources", mappedSection: "expansion" },
  { question: "What is the difference between a gross lease and a net lease?", topicId: "gross_net", intent: "COMPARISON", entities: ["gross_vs_net_lease"], commercial: "MEDIUM", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "gross_net", mappedRoute: null, mappedSection: null },
  { question: "How should lease incentives be timed in a model?", topicId: "incentives", intent: "HOW_TO", entities: ["lease_incentives", "free_rent", "tenant_improvement_allowance"], commercial: "HIGH", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "compare", mappedRoute: "/compare-commercial-leases", mappedSection: "table" },
  { question: "What is present value in lease economics?", topicId: "pv", intent: "DEFINITION", entities: ["present_value", "npv"], commercial: "MEDIUM", citation: "HIGH", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "direct-answer", parent: "What is NPV in a commercial lease?" },
  { question: "How does the proposed workflow capture lease terms?", topicId: "product", intent: "PROCESS", entities: ["client_summary"], commercial: "HIGH", citation: "LOW", disposition: "DEDICATED_PAGE", clusterId: "workflow", mappedRoute: "/how-it-works", mappedSection: "workflow" },
  { question: "What pricing is being tested for the pilot?", topicId: "pricing", intent: "PRICING", entities: [], commercial: "HIGH", citation: "LOW", disposition: "DEDICATED_PAGE", clusterId: "pricing", mappedRoute: "/pricing", mappedSection: "pricing" },
  { question: "Is this a finished product?", topicId: "validation", intent: "OBJECTION", entities: [], commercial: "HIGH", citation: "LOW", disposition: "FAQ_ITEM", clusterId: "objections", mappedRoute: "/faq", mappedSection: "faq" },
  { question: "Is payment collected on this site?", topicId: "validation", intent: "OBJECTION", entities: [], commercial: "HIGH", citation: "LOW", disposition: "FAQ_ITEM", clusterId: "objections", mappedRoute: "/faq", mappedSection: "faq" },
  { question: "Who is this lease comparison workflow for?", topicId: "product", intent: "WHO_FOR", entities: ["tenant_representation"], commercial: "HIGH", citation: "LOW", disposition: "COMMERCIAL_PAGE_SECTION", clusterId: "product", mappedRoute: "/", mappedSection: "hero" },
  { question: "Who is this not for?", topicId: "product", intent: "WHO_NOT_FOR", entities: [], commercial: "HIGH", citation: "LOW", disposition: "COMMERCIAL_PAGE_SECTION", clusterId: "product", mappedRoute: null, mappedSection: null },
  { question: "What happens if the discount-rate ranking flips?", topicId: "discount_rate", intent: "WHAT_HAPPENS_IF", entities: ["discount_rate", "npv"], commercial: "MEDIUM", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "discount_rate", mappedRoute: "/discount-rate-sensitivity", mappedSection: "deeper" },
  { question: "Does NPV capture every qualitative lease consideration?", topicId: "npv", intent: "LIMITATION", entities: ["npv"], commercial: "HIGH", citation: "MEDIUM", disposition: "ARTICLE_SECTION", clusterId: "npv", mappedRoute: "/commercial-lease-npv", mappedSection: "mistakes" },
];

export function questionDiscoveryRuntime() {
  return {
    runtime: PUBLIC_WEB_RESEARCH_RUNTIME,
    capability: "web.search",
    fabricatedSearchDemand: false as const,
    gscLive: false as const,
    sourcesAllowed: ["public web search", "FAQ patterns", "buyer objections", "professional organizations", "industry publications", "public educational content"],
  };
}

export function clusterOverlappingQuestions(questions: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const question of questions) {
    const normalized = normalize(question);
    const key = /npv|present value/.test(normalized)
      ? "npv"
      : /discount rate/.test(normalized)
        ? "discount_rate"
        : /tenant improvement|tia\b/.test(normalized)
          ? "ti"
          : /cam|operating expense/.test(normalized)
            ? "cam"
            : /free rent/.test(normalized)
              ? "free_rent"
              : /escalat/.test(normalized)
                ? "escalation"
                : /compare|different term/.test(normalized)
                  ? "compare"
                  : normalized;
    const list = groups.get(key) ?? [];
    list.push(question);
    groups.set(key, list);
  }
  return [...groups.values()];
}

export function disposeQuestion(input: { overlappingCount: number; uniqueIntent: boolean; commercial: "HIGH" | "MEDIUM" | "LOW" }): ContentDisposition {
  if (input.overlappingCount >= 2 && !input.uniqueIntent) return "NOT_WORTH_SEPARATE_CONTENT";
  if (input.commercial === "LOW") return "FAQ_ITEM";
  return "ARTICLE_SECTION";
}

export function buildCreQuestionKnowledgeGraph(now = CANONICAL_EVIDENCE_START): QuestionKnowledgeGraph {
  void QUESTION_KNOWLEDGE_GRAPH;
  const sources = creAuthoritySources(now).map((item) => item.source);
  const nodes: QuestionNode[] = CRE_SEEDS.map((seed) => ({
    questionId: idFor(seed.question),
    ventureId: VENTURE_ID,
    topicId: seed.topicId,
    question: seed.question,
    normalizedQuestion: normalize(seed.question),
    intent: seed.intent,
    persona: "tenant-representation broker",
    funnelStage: seed.intent === "PRICING" || seed.intent === "OBJECTION" ? "DECISION" : seed.intent === "DEFINITION" ? "AWARENESS" : "CONSIDERATION",
    commercialRelevance: seed.commercial,
    citationOpportunity: seed.citation,
    searchOpportunity: "GROUNDED_QUERY",
    entityRefs: seed.entities,
    parentQuestionId: seed.parent ? idFor(seed.parent) : null,
    relatedQuestionIds: [],
    recommendedContentDisposition: seed.disposition,
    evidenceState: sources.length ? "SOURCE_BACKED" : "UNGROUNDED",
    answerState: "UNANSWERED",
    priority: seed.commercial === "HIGH" ? 1 : seed.commercial === "MEDIUM" ? 2 : 3,
    observedSources: sources,
    createdAt: now,
    updatedAt: now,
    mappedRoute: seed.mappedRoute,
    mappedSection: seed.mappedSection,
    clusterId: seed.clusterId,
  }));
  for (const node of nodes) {
    node.relatedQuestionIds = nodes
      .filter((item) => item.clusterId === node.clusterId && item.questionId !== node.questionId)
      .map((item) => item.questionId);
  }
  const clusters = [...new Set(nodes.map((node) => node.clusterId))].map((clusterId) => {
    const members = nodes.filter((node) => node.clusterId === clusterId);
    return {
      clusterId,
      topic: clusterId,
      questionIds: members.map((node) => node.questionId),
      disposition: members.some((node) => node.recommendedContentDisposition === "DEDICATED_PAGE")
        ? ("DEDICATED_PAGE" as const)
        : members[0].recommendedContentDisposition,
    };
  });
  return { model: "QuestionKnowledgeGraph", nodes, clusters, fabricatedSearchDemand: false };
}

export function applySeoGeoQuestionMapping(graph: QuestionKnowledgeGraph): QuestionKnowledgeGraph {
  const remap: Record<string, { route: string; section: string; disposition?: QuestionNode["recommendedContentDisposition"] }> = {
    "what is npv in a commercial lease": { route: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "what discount rate should be used for lease npv": { route: "/commercial-lease-npv/what-discount-rate-should-you-use", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "how do you compare leases with different terms": { route: "/lease-comparison/how-do-you-compare-two-commercial-lease-options", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "how does tenant improvement allowance affect npv": { route: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "does free rent affect lease npv": { route: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv", section: "example", disposition: "ARTICLE_SECTION" },
    "npv vs effective rent": { route: "/effective-rent/effective-rent-vs-npv", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "what is effective rent": { route: "/effective-rent", section: "direct-answer", disposition: "HUB_SECTION" },
    "what is cam in a commercial lease": { route: "/occupancy-costs", section: "direct-answer", disposition: "HUB_SECTION" },
    "should cam be included in lease npv": { route: "/occupancy-costs", section: "npv", disposition: "ARTICLE_SECTION" },
    "how do rent escalations affect npv": { route: "/lease-comparison", section: "escalation", disposition: "HUB_SECTION" },
    "what are common lease npv mistakes": { route: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "how do tenant rep brokers use npv": { route: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics", section: "workflow", disposition: "ARTICLE_SECTION" },
    "is lower npv always the better lease": { route: "/commercial-lease-npv/when-is-npv-the-wrong-metric", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "when is npv the wrong metric": { route: "/commercial-lease-npv/when-is-npv-the-wrong-metric", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "what does lease sensitivity analysis show": { route: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "how should a tenant rep broker explain lease economics to a client": { route: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "how do you compare two commercial lease proposals": { route: "/lease-comparison/how-do-you-compare-two-commercial-lease-options", section: "direct-answer", disposition: "DEDICATED_PAGE" },
  };
  const extras: Seed[] = [
    { question: "When is NPV the wrong metric?", topicId: "npv", intent: "LIMITATION", entities: ["npv"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "npv", mappedRoute: "/commercial-lease-npv/when-is-npv-the-wrong-metric", mappedSection: "direct-answer" },
    { question: "What does lease sensitivity analysis show?", topicId: "sensitivity", intent: "HOW_IT_WORKS", entities: ["discount_rate", "npv"], commercial: "HIGH", citation: "MEDIUM", disposition: "DEDICATED_PAGE", clusterId: "discount_rate", mappedRoute: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show", mappedSection: "direct-answer" },
    { question: "How should a tenant-rep broker explain lease economics to a client?", topicId: "tenant_rep", intent: "PROFESSIONAL_WORKFLOW", entities: ["tenant_representation", "npv"], commercial: "HIGH", citation: "MEDIUM", disposition: "DEDICATED_PAGE", clusterId: "workflow", mappedRoute: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics", mappedSection: "direct-answer" },
    { question: "How do you compare two commercial lease proposals?", topicId: "compare", intent: "COMPARISON", entities: ["commercial_lease", "npv"], commercial: "HIGH", citation: "HIGH", disposition: "DEDICATED_PAGE", clusterId: "compare", mappedRoute: "/lease-comparison/how-do-you-compare-two-commercial-lease-options", mappedSection: "direct-answer" },
    { question: "What belongs in a commercial lease comparison report?", topicId: "tenant_rep", intent: "PROCESS", entities: ["client_summary"], commercial: "HIGH", citation: "LOW", disposition: "HUB_SECTION", clusterId: "workflow", mappedRoute: "/tenant-rep-analysis", mappedSection: "report" },
    { question: "How does a lease comparison tool differ from a brokerage CRM?", topicId: "product", intent: "ALTERNATIVE", entities: ["tenant_representation"], commercial: "HIGH", citation: "LOW", disposition: "HUB_SECTION", clusterId: "workflow", mappedRoute: "/tenant-rep-analysis", mappedSection: "crm" },
    { question: "How does the workflow move from proposals to a client summary?", topicId: "product", intent: "PROCESS", entities: ["client_summary"], commercial: "HIGH", citation: "LOW", disposition: "HUB_SECTION", clusterId: "workflow", mappedRoute: "/lease-financial-modeling", mappedSection: "workflow" },
  ];
  const mapped = graph.nodes.map((node) => {
    const next = remap[node.normalizedQuestion];
    if (!next) return node;
    return {
      ...node,
      mappedRoute: next.route,
      mappedSection: next.section,
      recommendedContentDisposition: next.disposition ?? node.recommendedContentDisposition,
    };
  });
  const have = new Set(mapped.map((node) => node.normalizedQuestion));
  const added = extras
    .filter((seed) => !have.has(normalize(seed.question)))
    .map((seed) => ({
      questionId: idFor(seed.question),
      ventureId: VENTURE_ID,
      topicId: seed.topicId,
      question: seed.question,
      normalizedQuestion: normalize(seed.question),
      intent: seed.intent,
      persona: "tenant-representation broker",
      funnelStage: "CONSIDERATION" as const,
      commercialRelevance: seed.commercial,
      citationOpportunity: seed.citation,
      searchOpportunity: "GROUNDED_QUERY" as const,
      entityRefs: seed.entities,
      parentQuestionId: null,
      relatedQuestionIds: [],
      recommendedContentDisposition: seed.disposition,
      evidenceState: "SOURCE_BACKED" as const,
      answerState: "UNANSWERED" as const,
      priority: 1 as const,
      observedSources: [],
      createdAt: mapped[0]?.createdAt ?? CANONICAL_EVIDENCE_START,
      updatedAt: mapped[0]?.updatedAt ?? CANONICAL_EVIDENCE_START,
      mappedRoute: seed.mappedRoute,
      mappedSection: seed.mappedSection,
      clusterId: seed.clusterId,
    }));
  return { ...graph, nodes: [...mapped, ...added] };
}

export function applySuccessorQuestionMapping(graph: QuestionKnowledgeGraph): QuestionKnowledgeGraph {
  const remap: Record<string, { route: string; section: string; disposition?: QuestionNode["recommendedContentDisposition"] }> = {
    "what is cam in a commercial lease": { route: "/resources/cam-costs", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "should cam be included in lease npv": { route: "/resources/cam-costs", section: "npv", disposition: "ARTICLE_SECTION" },
    "what operating expenses belong beside face rent": { route: "/resources/cam-costs", section: "opex", disposition: "ARTICLE_SECTION" },
    "how does free rent change occupancy cost": { route: "/resources/free-rent", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "does free rent affect lease npv": { route: "/resources/free-rent", section: "npv", disposition: "ARTICLE_SECTION" },
    "how do rent escalations change a comparison": { route: "/resources/rent-escalations", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "how do rent escalations affect npv": { route: "/resources/rent-escalations", section: "npv", disposition: "ARTICLE_SECTION" },
    "what is the difference between a gross lease and a net lease": { route: "/resources/gross-vs-net-lease", section: "direct-answer", disposition: "DEDICATED_PAGE" },
    "npv vs effective rent": { route: "/commercial-lease-npv", section: "alternatives", disposition: "ARTICLE_SECTION" },
    "what is effective rent": { route: "/commercial-lease-npv", section: "alternatives", disposition: "ARTICLE_SECTION" },
    "who is this not for": { route: "/", section: "who-not-for", disposition: "COMMERCIAL_PAGE_SECTION" },
    "how do tenant rep brokers use npv": { route: "/for/tenant-rep-brokers", section: "workflow", disposition: "ARTICLE_SECTION" },
    "how does tenant representation use a client summary": { route: "/for/tenant-rep-brokers", section: "summary", disposition: "COMMERCIAL_PAGE_SECTION" },
  };
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const next = remap[node.normalizedQuestion];
      if (!next) return node;
      return {
        ...node,
        mappedRoute: next.route,
        mappedSection: next.section,
        recommendedContentDisposition: next.disposition ?? node.recommendedContentDisposition,
      };
    }),
  };
}

export function scoreQuestionAnswers(
  graph: QuestionKnowledgeGraph,
  files: Array<{ path: string; content: string }>,
  options?: { matchAnyAnswerFirst?: boolean },
): QuestionKnowledgeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (!node.mappedRoute || node.mappedSection === "expansion") {
        return { ...node, answerState: "UNANSWERED" as const };
      }
      const content = pageContent(files, node.mappedRoute);
      if (!content) return { ...node, answerState: "UNANSWERED" as const };
      const lower = content.toLowerCase();
      const tokens = node.normalizedQuestion.split(" ").filter((item) => item.length > 3);
      const hits = tokens.filter((token) => lower.includes(token)).length;
      const blocks = extractAnswerFirstBlocks(content);
      const overlapFor = (question: string) =>
        question
          .toLowerCase()
          .split(/\W+/)
          .filter((item) => item.length > 3)
          .filter((token) => node.normalizedQuestion.includes(token)).length;
      const primary = blocks[0];
      const bestOverlap = options?.matchAnyAnswerFirst
        ? Math.max(0, ...blocks.map((block) => overlapFor(block.question)))
        : primary
          ? overlapFor(primary.question)
          : 0;
      const contained = options?.matchAnyAnswerFirst
        ? blocks.some((block) => {
            const normalizedBlock = normalize(block.question);
            return (
              normalizedBlock === node.normalizedQuestion ||
              normalizedBlock.includes(node.normalizedQuestion) ||
              node.normalizedQuestion.includes(normalizedBlock)
            );
          })
        : false;
      const aligned = (blocks.length > 0 && bestOverlap >= 3) || contained;
      const hasExample = /illustrative|example|worked/.test(lower);
      const hasLimit = /limitation|does not|not automatically|common mistake/.test(lower);
      const hasSource = /authorityrefs|investopedia|naiop|boma|bls\.gov|fasb/.test(lower);
      const hasRelated = /relatedcontent|related concepts/.test(lower);
      if (aligned && hasExample && hasLimit && hasSource && hasRelated && (node.intent === "DEFINITION" || node.intent === "COMPARISON" || node.intent === "HOW_IT_WORKS")) {
        return { ...node, answerState: "DEEP" as const };
      }
      if (aligned && (hits >= 2 || Boolean(options?.matchAnyAnswerFirst))) return { ...node, answerState: "ANSWERED" as const };
      if (hits >= 2) return { ...node, answerState: "SHALLOW" as const };
      return { ...node, answerState: "UNANSWERED" as const };
    }),
  };
}

export function buildQuestionCoverageProfile(graph: QuestionKnowledgeGraph): QuestionCoverageProfile {
  const known = graph.nodes.length;
  const answered = graph.nodes.filter((node) => node.answerState === "ANSWERED" || node.answerState === "DEEP").length;
  const deep = graph.nodes.filter((node) => node.answerState === "DEEP").length;
  const sourceGrounded = graph.nodes.filter((node) => node.evidenceState !== "UNGROUNDED").length;
  const citationReady = graph.nodes.filter((node) => node.answerState === "DEEP" && node.citationOpportunity !== "LOW").length;
  const schemaSupported = graph.nodes.filter((node) => node.mappedRoute && node.intent === "DEFINITION").length;
  const internallyLinked = graph.nodes.filter((node) => Boolean(node.mappedRoute)).length;
  const highCommercialUnanswered = graph.nodes.filter((node) => node.commercialRelevance === "HIGH" && node.answerState === "UNANSWERED").length;
  const highCitationUnanswered = graph.nodes.filter((node) => node.citationOpportunity === "HIGH" && (node.answerState === "UNANSWERED" || node.answerState === "SHALLOW")).length;
  const group = (key: (node: QuestionNode) => string) => {
    const out: Record<string, { known: number; answered: number }> = {};
    for (const node of graph.nodes) {
      const bucket = key(node);
      out[bucket] ??= { known: 0, answered: 0 };
      out[bucket].known += 1;
      if (node.answerState === "ANSWERED" || node.answerState === "DEEP") out[bucket].answered += 1;
    }
    return out;
  };
  return {
    model: "QuestionCoverageProfile",
    coverageClaim: KNOWN_HIGH_CONFIDENCE_QUESTION_COVERAGE,
    completeUniverseClaimed: false,
    knownRelevantQuestions: known,
    answeredQuestions: answered,
    deeplyAnsweredQuestions: deep,
    sourceGroundedQuestions: sourceGrounded,
    citationReadyQuestions: citationReady,
    schemaSupportedQuestions: schemaSupported,
    internallyLinkedQuestions: internallyLinked,
    highCommercialUnanswered,
    highCitationUnanswered,
    coverageByIntent: group((node) => node.intent),
    coverageByEntity: group((node) => node.entityRefs[0] ?? "none"),
    coverageByFunnelStage: group((node) => node.funnelStage),
    coverageConfidence: known >= 20 ? "HIGH" : "MEDIUM",
    gscLive: false,
  };
}
