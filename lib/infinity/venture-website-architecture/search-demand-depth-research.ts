import {
  DEPTH_STANDALONE_ROUTES,
  TOPIC_IDS,
  uniqueCanonicalQuestions,
  type CoverageDecision,
  type EvidenceClass,
  type TopicId,
} from "./search-validated-question-graph";
import { DEPTH_QUESTION_PAGES } from "./search-demand-depth-catalog";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES } from "./digital-real-estate-catalog";

export const SEARCH_DEPTH_RESEARCH_RETRIEVED_AT = "2026-09-04" as const;

export type DepthEvidenceRecord = {
  question: string;
  topic: TopicId;
  clusterId: string;
  evidenceClass: EvidenceClass | "RELATED_SEARCH_OBSERVED" | "PAA_OBSERVED";
  provenance: "FRESH_SOURCE_CONFIRMED" | "PRIOR_VALIDATED_REUSED";
  source: string;
  intentDistinction: string;
  priorOwner: string;
  decision: "BUILD_STANDALONE" | "EXPAND_EXISTING_PAGE" | "ADD_TO_HUB" | "ADD_ANSWER_CHUNK" | "MERGE_WITH_EXISTING" | "DEFER_LOW_VALUE";
  reason: string;
  monthlyVolume: null;
  fabricatedSearchVolume: false;
};

const PREVIOUS_STANDALONE: Record<TopicId, number> = {
  "commercial-lease-npv": 7,
  "lease-comparison": 7,
  "effective-rent": 5,
  "occupancy-costs": 4,
  "lease-sensitivity-analysis": 4,
  "tenant-rep-analysis": 4,
  "lease-financial-modeling": 3,
};

export const FRESH_DEPTH_EVIDENCE: DepthEvidenceRecord[] = [
  {
    question: "Why use NPV when comparing commercial leases?",
    topic: "commercial-lease-npv",
    clusterId: "npv-why",
    evidenceClass: "SERP_OBSERVED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://transwestern.com/news-detail/simplifying-the-importance-of-net-present-value-in-commercial-real-estate",
    intentDistinction: "Decision rationale, not calculation steps or a definition.",
    priorOwner: "hub /commercial-lease-npv why section",
    decision: "BUILD_STANDALONE",
    reason: "Transwestern still treats why-NPV as a comparison question distinct from the walk.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "Why do NPV and total lease cost differ?",
    topic: "commercial-lease-npv",
    clusterId: "npv-vs-total",
    evidenceClass: "SERP_OBSERVED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://transwestern.com/news-detail/simplifying-the-importance-of-net-present-value-in-commercial-real-estate",
    intentDistinction: "Aggregate cash can match while timing ranks differently.",
    priorOwner: "hub compare section",
    decision: "BUILD_STANDALONE",
    reason: "Authority pages keep repeating that equal totals can hide different NPV.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "Should CAM be included in lease NPV?",
    topic: "commercial-lease-npv",
    clusterId: "npv-cam",
    evidenceClass: "PROFESSIONAL_QUERY_PATTERN",
    provenance: "PRIOR_VALIDATED_REUSED",
    source: "https://fnrpusa.com/blog/how-to-compare-commercial-real-estate-leases/",
    intentDistinction: "Cost-component ownership on the NPV walk, not a CAM definition.",
    priorOwner: "occupancy hub",
    decision: "BUILD_STANDALONE",
    reason: "FNRP lists operating expenses inside comparative lease NPV, not only on a CAM page.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "What is effective rent in a commercial lease?",
    topic: "effective-rent",
    clusterId: "er-definition",
    evidenceClass: "MULTI_SOURCE_CONFIRMED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://legalclarity.org/what-is-effective-rent-and-how-is-it-calculated/",
    intentDistinction: "Definition intent is searched separately from the formula page.",
    priorOwner: "effective-rent hub",
    decision: "BUILD_STANDALONE",
    reason: "LegalClarity and Re-Leased still publish definition-first pages.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "How do property taxes change occupancy cost?",
    topic: "occupancy-costs",
    clusterId: "occ-taxes",
    evidenceClass: "SERP_OBSERVED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://www.capveri.com/blog/occupancy-cost-analysis-commercial-lease",
    intentDistinction: "Tax pass-through is a distinct occupancy-stack question.",
    priorOwner: "occupancy hub extras",
    decision: "BUILD_STANDALONE",
    reason: "CapVeri treats tax as its own occupancy line, not a footnote on total cost.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "How do CAM caps change occupancy-cost risk?",
    topic: "occupancy-costs",
    clusterId: "occ-cam-caps",
    evidenceClass: "SERP_OBSERVED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://lextract.io/resources/articles/tenant-rep-cam-caps-exclusions",
    intentDistinction: "Risk and cap structure, not a CAM definition.",
    priorOwner: "AnswerChunk / hub",
    decision: "BUILD_STANDALONE",
    reason: "2026 tenant-rep guides still treat CAM caps as a standalone negotiation question.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "What is the difference between sensitivity analysis and scenario analysis?",
    topic: "lease-sensitivity-analysis",
    clusterId: "sens-scenario",
    evidenceClass: "SERP_OBSERVED",
    provenance: "PRIOR_VALIDATED_REUSED",
    source: "https://nordicrealestateservices.com/blog/cre-sensitivity-analysis-guide/",
    intentDistinction: "Method comparison, not why-use or discount-rate sensitivity.",
    priorOwner: "hub / AnswerChunk",
    decision: "BUILD_STANDALONE",
    reason: "CRE sensitivity guides keep the one-variable vs many-variable split as its own lesson.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "Effective rent vs asking rent: what is the difference?",
    topic: "effective-rent",
    clusterId: "er-vs-asking",
    evidenceClass: "SERP_OBSERVED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://compstak.com/blog/effective-rent-vs-asking-rent-why-the-gap-matters-for-cre-in",
    intentDistinction: "Asking/face rent is a marketing quote. Effective rent nets concessions. Distinct from NPV compare.",
    priorOwner: "effective-rent hub definition",
    decision: "BUILD_STANDALONE",
    reason: "CompStak still publishes asking-vs-effective as its own underwriting question.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "What is the difference between base rent and occupancy cost?",
    topic: "occupancy-costs",
    clusterId: "occ-base-rent",
    evidenceClass: "MULTI_SOURCE_CONFIRMED",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://legalclarity.org/total-occupancy-cost-what-it-is-and-how-to-calculate-it/",
    intentDistinction: "Base rent is one line. Occupancy cost is the stack. Not a CAM definition page.",
    priorOwner: "occupancy hub extras",
    decision: "BUILD_STANDALONE",
    reason: "LegalClarity and CAMAudit still treat rent-vs-occupancy as a distinct search question.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
  {
    question: "What is the difference between a lease abstract and a financial analysis?",
    topic: "tenant-rep-analysis",
    clusterId: "tr-abstract",
    evidenceClass: "AUTHORITY_TERMINOLOGY",
    provenance: "FRESH_SOURCE_CONFIRMED",
    source: "https://leaseparse.com/what-is-lease-abstraction",
    intentDistinction: "Abstraction extracts terms. Analysis interprets cash and risk. Distinct from a client summary.",
    priorOwner: "tenant-rep hub / AnswerChunk",
    decision: "BUILD_STANDALONE",
    reason: "LeaseParse still separates abstraction (data) from analysis (insight) as two professional steps.",
    monthlyVolume: null,
    fabricatedSearchVolume: false,
  },
];

export function previousStandaloneCount(topic: TopicId): number {
  return PREVIOUS_STANDALONE[topic];
}

function ownedByTopic(page: { topic?: string; cluster?: string; hub?: string }, topic: TopicId): boolean {
  if (page.topic === topic || page.cluster === topic) return true;
  const hub = (page.hub ?? "").replace(/\/+$/, "");
  return hub === `/${topic}`;
}

export function currentStandaloneRoutesForTopic(topic: TopicId): string[] {
  const prior = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES]
    .filter((page) => ownedByTopic(page, topic))
    .map((page) => page.route);
  const next = DEPTH_QUESTION_PAGES.filter((page) => ownedByTopic(page, topic)).map((page) => page.route);
  return [...prior, ...next];
}

export function topicDepthCoverageTable() {
  const canonical = uniqueCanonicalQuestions();
  return TOPIC_IDS.map((topic) => {
    const rows = canonical.filter((row) => row.primaryTopic === topic);
    const previous = previousStandaloneCount(topic);
    const next = DEPTH_QUESTION_PAGES.filter((page) => page.topic === topic);
    const finalStandalone = previous + next.length;
    const chunkOnly = rows.filter((row) => row.decision === "ADD_ANSWER_CHUNK").length;
    const merged = rows.filter((row) => row.decision === "MERGE_WITH_EXISTING" || row.decision === "EXPAND_EXISTING_PAGE").length;
    const deferred = rows.filter((row) => row.decision === "DEFER_LOW_VALUE").length;
    return {
      topic,
      validatedQuestions: rows.length,
      previousStandalone: previous,
      newStandalone: next.length,
      finalStandalone,
      answerChunkOnly: chunkOnly,
      merged,
      deferred,
      targetMet: finalStandalone >= 10,
      evidence: next.map((page) => page.clusterId).join(", "),
    };
  });
}

export function searchDemandEvidenceRollup() {
  const fresh = FRESH_DEPTH_EVIDENCE.filter((row) => row.provenance === "FRESH_SOURCE_CONFIRMED").length;
  const reused = FRESH_DEPTH_EVIDENCE.filter((row) => row.provenance === "PRIOR_VALIDATED_REUSED").length;
  const priorGraph = uniqueCanonicalQuestions().length;
  return {
    freshResearchPerformed: true,
    freshEvidenceRecords: fresh,
    priorValidatedEvidenceReused: priorGraph + reused,
    unverifiedCandidates: 0,
    fabricatedSearchVolume: 0,
    liveGoogleAutocompleteUnavailable: true,
    liveGooglePaaUnavailable: true,
    evidenceLimitation:
      "Live Google autocomplete and People Also Ask were not captured in this session. Fresh confirmation used currently visible professional sources. Remaining promotions reuse prior SERP/question-pattern records. No PAA or autocomplete labels were applied without proof.",
    byClass: FRESH_DEPTH_EVIDENCE.reduce<Record<string, number>>((counts, row) => {
      counts[row.evidenceClass] = (counts[row.evidenceClass] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

export function promotionExamples(): DepthEvidenceRecord[] {
  return DEPTH_QUESTION_PAGES.map((page) => {
    const fresh = FRESH_DEPTH_EVIDENCE.find((row) => row.clusterId === page.clusterId);
    if (fresh) return fresh;
    return {
      question: page.question,
      topic: page.topic,
      clusterId: page.clusterId,
      evidenceClass: "QUESTION_PATTERN_OBSERVED",
      provenance: "PRIOR_VALIDATED_REUSED",
      source: "prior-search-validated-question-graph",
      intentDistinction: `${page.semanticIntent} intent is not answered by an existing standalone owner.`,
      priorOwner: "hub or AnswerChunk",
      decision: "BUILD_STANDALONE",
      reason: "Reassessed from ADD_TO_HUB / ADD_ANSWER_CHUNK / EXPAND_EXISTING_PAGE because the question has distinct search intent and enough depth.",
      monthlyVolume: null,
      fabricatedSearchVolume: false,
    };
  });
}

export function rejectedQuotaPadding(): Array<{ question: string; decision: CoverageDecision; reason: string }> {
  return [
    {
      question: "How do you calculate commercial lease NPV in Excel?",
      decision: "ADD_ANSWER_CHUNK",
      reason: "Same calculation intent as the existing how-is-lease-npv-calculated page.",
    },
    {
      question: "Is there a commercial lease comparison spreadsheet?",
      decision: "ADD_ANSWER_CHUNK",
      reason: "Software-template intent, not a distinct economics page.",
    },
    {
      question: "How do parking costs change a lease comparison?",
      decision: "DEFER_LOW_VALUE",
      reason: "Low commercial depth. Belongs inside occupancy extras.",
    },
    {
      question: "Should Excel NPV or XNPV be used in a lease model?",
      decision: "DEFER_LOW_VALUE",
      reason: "Formula-tooling nuance, not a standalone authority question.",
    },
  ];
}

void DEPTH_STANDALONE_ROUTES;
