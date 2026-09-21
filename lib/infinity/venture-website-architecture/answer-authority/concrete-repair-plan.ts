import { WORD_COUNT_GUIDANCE } from "./constants";
import { bandForRole } from "./depth-and-direct-response";
import type { AuthorityRepairPlan, CrePageAuditRow, QuestionNode } from "./types";

export type RepairAction = "KEEP" | "EXPAND" | "MERGE" | "RESTRUCTURE" | "REPLACE" | "REDIRECT_IN_FUTURE";

export type AuthorityRepairRoute = {
  route: string;
  currentRole: string;
  primaryIntent: string;
  approxWords: number;
  recommendedDepthRange: string;
  questionsMissing: string[];
  sectionsMissing: string[];
  directResponseGaps: string[];
  visualizationGaps: string[];
  sourceGaps: string[];
  semanticEntityGaps: string[];
  internalLinkGaps: string[];
  ctaGaps: string[];
  schemaChanges: string[];
  recommendedAction: RepairAction;
};

export type RankedPageOpportunity = {
  recommendedUrl: string;
  pageRole: string;
  primaryQuestion: string;
  questionCluster: string;
  commercialRelevance: "HIGH" | "MEDIUM" | "LOW";
  citationOpportunity: "HIGH" | "MEDIUM" | "LOW";
  parentHub: string;
  internalLinkTargets: string[];
  whySeparatePage: string;
};

const DEPTH_RANGE: Record<string, string> = {
  CORE_MONEY_PAGE: "approximately 2,000–5,000+ words when justified",
  MAJOR_HUB: "approximately 2,000–4,000+ words when justified",
  HIGH_VALUE_EDUCATIONAL: "approximately 1,200–3,000+ words when justified",
  SUPPORTING_QUESTION: "approximately 800–2,000+ words when justified",
  UTILITY: "as needed for the conversion or legal task",
};

const ROUTE_INTENT: Record<string, string> = {
  "/": "COMMERCIAL",
  "/how-it-works": "PROCEDURAL",
  "/compare-commercial-leases": "COMPARISON",
  "/commercial-lease-npv": "DEFINITIONAL",
  "/tenant-improvement-allowance": "DEFINITIONAL",
  "/discount-rate-sensitivity": "EDUCATIONAL",
  "/resources": "EDUCATIONAL",
  "/pricing": "TRANSACTIONAL",
  "/faq": "EDUCATIONAL",
  "/early-access": "TRANSACTIONAL",
};

const ROUTE_SECTIONS: Record<string, string[]> = {
  "/": [
    "problem cost of the rebuilt spreadsheet",
    "why the current method fails",
    "who this is not for",
    "homepage FAQ",
    "post-objection CTA",
    "authority source block",
  ],
  "/how-it-works": ["broker workflow inputs/outputs", "worked comparison example", "objection handling", "named sources"],
  "/compare-commercial-leases": ["cash-flow timing diagram", "incentive interaction write-up", "source pair beyond BLS"],
  "/commercial-lease-npv": [
    "explicit NPV formula",
    "full worked cash-flow example",
    "TI / free rent / CAM / escalation impact sections",
    "discount-rate selection",
    "different lease terms",
    "NPV vs total cost and effective rent",
    "broker workflow",
    "cash-flow visualization",
  ],
  "/tenant-improvement-allowance": ["NPV interaction section", "unused-TI limitation", "second independent source"],
  "/discount-rate-sensitivity": ["what rate to choose", "ranking-flip worked case", "client-explanation script"],
  "/resources": [
    "spoke introductions with unique value",
    "question-cluster navigation",
    "topic map visualization",
    "hub-depth overview",
  ],
  "/pricing": ["who-not-for", "offer mechanism recap"],
  "/faq": ["keep short; do not absorb the topic universe"],
  "/early-access": ["what the pilot includes", "link to authority pages in-body"],
};

const ROUTE_DR: Record<string, string[]> = {
  "/": ["PROBLEM_COST", "WHY_CURRENT_METHOD_FAILS", "WHO_NOT_FOR", "FAQ", "post-objection CTA"],
  "/how-it-works": ["WHO_NOT_FOR", "OBJECTION_HANDLING", "PRICING adjacent CTA"],
  "/compare-commercial-leases": ["WHO_NOT_FOR", "CTA sequence after objections"],
  "/pricing": ["WHO_NOT_FOR"],
};

const ROUTE_VIZ: Record<string, string[]> = {
  "/": ["long-form section rhythm; keep product UI, add objection/FAQ composition"],
  "/compare-commercial-leases": ["cash-flow timing chart", "second comparison visual beyond one table"],
  "/commercial-lease-npv": ["formula block", "period-by-period cash-flow table", "discount-rate chart"],
  "/resources": ["topic-map / cluster diagram"],
  "/tenant-improvement-allowance": ["TI vs rent trade timeline"],
  "/discount-rate-sensitivity": ["ranking-flip chart"],
};

const ROUTE_LINKS: Record<string, string[]> = {
  "/": ["contextual source references inside the offer, not only related cards"],
  "/how-it-works": ["parent hub and NPV as prerequisite"],
  "/compare-commercial-leases": ["CAM / free-rent / escalation spokes once they exist"],
  "/commercial-lease-npv": ["future CAM, free-rent, escalation spokes; persona page"],
  "/resources": ["question-cluster links, not only spoke titles"],
};

function actionFor(row: CrePageAuditRow): RepairAction {
  if (row.route === "/faq" && row.depth === "PASS") return "KEEP";
  if (row.route === "/early-access") return "EXPAND";
  if (row.route === "/resources") return "RESTRUCTURE";
  if (row.route === "/" || row.route === "/commercial-lease-npv") return "EXPAND";
  if (row.publishability === "FAIL") return "EXPAND";
  return "KEEP";
}

export function buildConcreteRepairRoutes(input: {
  pageRows: CrePageAuditRow[];
  questions: QuestionNode[];
  semanticMissing: Record<string, string[]>;
}): AuthorityRepairRoute[] {
  return input.pageRows.map((row) => {
    const band = bandForRole(row.role, row.route);
    const missingQuestions = input.questions
      .filter((node) => (node.mappedRoute === row.route && (node.answerState === "UNANSWERED" || node.answerState === "SHALLOW")) || (row.route === "/" && node.question === "Who is this not for?" && node.answerState === "UNANSWERED"))
      .map((node) => node.question);
    return {
      route: row.route,
      currentRole: row.role,
      primaryIntent: ROUTE_INTENT[row.route] ?? row.role,
      approxWords: row.approxWords,
      recommendedDepthRange: DEPTH_RANGE[band] ?? DEPTH_RANGE.UTILITY,
      questionsMissing: [...new Set(missingQuestions)],
      sectionsMissing: ROUTE_SECTIONS[row.route] ?? [],
      directResponseGaps: ROUTE_DR[row.route] ?? [],
      visualizationGaps: row.visualAdequacy === "FAIL" || row.route === "/commercial-lease-npv" || row.route === "/resources" ? ROUTE_VIZ[row.route] ?? [] : [],
      sourceGaps: row.sourceAdequacy === "FAIL" ? ["named independent authority references on this page"] : row.route === "/commercial-lease-npv" ? ["second independent source beyond Investopedia for lease-specific claims"] : [],
      semanticEntityGaps: input.semanticMissing[row.route] ?? [],
      internalLinkGaps: ROUTE_LINKS[row.route] ?? [],
      ctaGaps: row.route === "/" ? ["post-objection CTA", "FAQ CTA"] : row.directResponseAdequacy === "FAIL" ? ["readiness-based CTA, not only a closing button"] : [],
      schemaChanges: [],
      recommendedAction: actionFor(row),
    };
  });
}

export function rankedDedicatedPageOpportunities(questions: QuestionNode[]): RankedPageOpportunity[] {
  const dedicated = questions.filter((node) => node.recommendedContentDisposition === "DEDICATED_PAGE" && (!node.mappedRoute || node.answerState === "UNANSWERED"));
  const seeds: RankedPageOpportunity[] = [
    {
      recommendedUrl: "/resources/cam-costs/",
      pageRole: "EDUCATIONAL_ARTICLE",
      primaryQuestion: "What is CAM in a commercial lease?",
      questionCluster: "cam",
      commercialRelevance: "HIGH",
      citationOpportunity: "HIGH",
      parentHub: "/resources",
      internalLinkTargets: ["/resources", "/compare-commercial-leases", "/commercial-lease-npv"],
      whySeparatePage: "CAM is a high-citation occupancy-cost entity with no dedicated page and is only mentioned in passing.",
    },
    {
      recommendedUrl: "/resources/free-rent/",
      pageRole: "EDUCATIONAL_ARTICLE",
      primaryQuestion: "How does free rent change occupancy cost?",
      questionCluster: "free_rent",
      commercialRelevance: "HIGH",
      citationOpportunity: "HIGH",
      parentHub: "/resources",
      internalLinkTargets: ["/resources", "/commercial-lease-npv", "/compare-commercial-leases"],
      whySeparatePage: "Free-rent timing changes NPV and is currently a shallow mention, not a spoke.",
    },
    {
      recommendedUrl: "/resources/rent-escalations/",
      pageRole: "EDUCATIONAL_ARTICLE",
      primaryQuestion: "How do rent escalations change a comparison?",
      questionCluster: "escalation",
      commercialRelevance: "HIGH",
      citationOpportunity: "MEDIUM",
      parentHub: "/resources",
      internalLinkTargets: ["/resources", "/compare-commercial-leases", "/discount-rate-sensitivity"],
      whySeparatePage: "Escalations are a distinct comparison input and currently have no dedicated treatment.",
    },
    {
      recommendedUrl: "/resources/gross-vs-net-lease/",
      pageRole: "EDUCATIONAL_ARTICLE",
      primaryQuestion: "What is the difference between a gross lease and a net lease?",
      questionCluster: "gross_net",
      commercialRelevance: "MEDIUM",
      citationOpportunity: "HIGH",
      parentHub: "/resources",
      internalLinkTargets: ["/resources", "/compare-commercial-leases"],
      whySeparatePage: "Gross vs net is a definitional comparison that would cannibalize the money page if stuffed into it.",
    },
    {
      recommendedUrl: "/for/tenant-rep-brokers/",
      pageRole: "PERSONA",
      primaryQuestion: "How should tenant-rep brokers compare leases?",
      questionCluster: "workflow",
      commercialRelevance: "HIGH",
      citationOpportunity: "LOW",
      parentHub: "/",
      internalLinkTargets: ["/", "/how-it-works", "/compare-commercial-leases", "/early-access"],
      whySeparatePage: "Persona commercial intent is distinct from educational NPV and from the homepage offer.",
    },
  ];
  void dedicated;
  void WORD_COUNT_GUIDANCE;
  return seeds;
}

export function summarizeConcreteRepair(input: {
  plan: AuthorityRepairPlan;
  routes: AuthorityRepairRoute[];
  opportunities: RankedPageOpportunity[];
}) {
  return {
    ...input.plan,
    pagesToRestructure: input.routes.filter((item) => item.recommendedAction === "RESTRUCTURE").length,
    existingPagesNeedingMajorRepair: input.routes.filter((item) => item.recommendedAction === "EXPAND" || item.recommendedAction === "RESTRUCTURE").length,
    routes: input.routes,
    opportunities: input.opportunities,
  };
}
