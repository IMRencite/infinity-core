import { createHash } from "node:crypto";

export const SEARCH_RESEARCH_RETRIEVED_AT = "2026-09-03" as const;

export const TOPIC_IDS = [
  "commercial-lease-npv",
  "lease-comparison",
  "effective-rent",
  "occupancy-costs",
  "lease-sensitivity-analysis",
  "tenant-rep-analysis",
  "lease-financial-modeling",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

export const SEMANTIC_INTENTS = [
  "DEFINITION",
  "HOW_TO",
  "CALCULATION",
  "FORMULA",
  "COMPARISON",
  "ASSUMPTION",
  "WORKFLOW",
  "MISTAKE",
  "LIMITATION",
  "DECISION",
  "COST_COMPONENT",
  "BROKER_PRACTICE",
  "FINANCE_EXECUTIVE",
  "SCENARIO",
  "SENSITIVITY",
  "SOFTWARE_COMPARISON",
  "PRICING_INTENT",
  "PRODUCT_WORKFLOW",
  "OTHER",
] as const;

export type SemanticIntent = (typeof SEMANTIC_INTENTS)[number];
export type SearchIntent = "INFORMATIONAL" | "COMMERCIAL_INVESTIGATION" | "TRANSACTIONAL" | "NAVIGATIONAL";
export type SearchDemandClass = "SEARCH_DEMAND_OBSERVED" | "SEARCH_DEMAND_RELATIVE" | "SEARCH_DEMAND_UNKNOWN";
export type EvidenceClass =
  | "SERP_OBSERVED"
  | "QUESTION_PATTERN_OBSERVED"
  | "AUTOCOMPLETE_OBSERVED"
  | "COMMUNITY_DEMAND_OBSERVED"
  | "PROFESSIONAL_QUERY_PATTERN"
  | "AUTHORITY_TERMINOLOGY"
  | "MULTI_SOURCE_CONFIRMED";
export type CoverageDecision =
  | "BUILD_STANDALONE"
  | "EXPAND_EXISTING_PAGE"
  | "ADD_TO_HUB"
  | "ADD_ANSWER_CHUNK"
  | "MERGE_WITH_EXISTING"
  | "DEFER_LOW_VALUE";
export type FunnelStage = "AWARENESS" | "CONSIDERATION" | "DECISION" | "VALIDATION";
export type Persona = "tenant-rep-broker" | "cfo-finance" | "tenant-operator" | "landlord-analyst";

export type SearchQuestionRecord = {
  questionId: string;
  question: string;
  normalizedQuestion: string;
  topic: TopicId;
  evidenceClass: EvidenceClass;
  demandClass: SearchDemandClass;
  monthlyVolume: null;
  fabricatedSearchVolume: false;
  source: string;
  retrievedAt: typeof SEARCH_RESEARCH_RETRIEVED_AT;
  observedPhrasing: string;
  semanticIntent: SemanticIntent;
  searchIntent: SearchIntent;
  funnelStage: FunnelStage;
  persona: Persona;
  commercialRelevance: "HIGH" | "MEDIUM" | "LOW";
  standaloneEligible: boolean;
  answerChunkEligible: boolean;
  parentHub: string;
  relatedQuestions: string[];
  candidateInternalLinkTargets: string[];
  externalSourceNeeds: string[];
  ctaIntent: SearchIntent;
  clusterId: string;
  canonicalQuestion: string;
  alternatePhrasings: string[];
  primaryTopic: TopicId;
  secondaryTopics: TopicId[];
  decision: CoverageDecision;
  mappedRoute: string | null;
  mappedSection: string | null;
};

export type RawRow = {
  q: string;
  topic: TopicId;
  evidence: EvidenceClass;
  demand: SearchDemandClass;
  source: string;
  phrasing: string;
  intent: SemanticIntent;
  search: SearchIntent;
  funnel: FunnelStage;
  persona: Persona;
  commercial: "HIGH" | "MEDIUM" | "LOW";
};

const SOURCES = {
  fnrp: "https://fnrpusa.com/blog/how-to-compare-commercial-real-estate-leases/",
  transwestern: "https://transwestern.com/news-detail/simplifying-the-importance-of-net-present-value-in-commercial-real-estate",
  costar: "https://costarmanager.com/blog/understanding-discount-rate-present-value-and-net-present-value",
  linkedinNpv: "https://www.linkedin.com/advice/3/whats-easiest-way-calculate-commercial-leases",
  legalclarity: "https://legalclarity.org/what-is-effective-rent-and-how-is-it-calculated/",
  wikipediaNer: "https://en.wikipedia.org/wiki/Net_effective_rent",
  oconnell: "https://ryanoconnellfinance.com/commercial-lease-analysis/",
  released: "https://www.re-leased.com/terms/net-effective-rent",
  lextract: "https://lextract.io/templates/lease-comparison-template",
  gable: "https://www.gable.to/blog/post/commercial-lease-guide",
  lucid: "https://www.lucidlease.ai/blog/10-critical-questions-every-business-should-ask-before-signing-a-commercial-lease/",
  camaudit: "https://www.camaudit.io/partners/resources/accounting-firms/why-occupancy-cost-is-not-just-rent",
  towercorp: "https://towercorp.com/hidden-costs-of-commercial-real-estate-leases-every-business-owner-should-know/",
  bluecap: "https://www.bluecapeconomicadvisors.com/post/total-cost-of-occupancy-analysis-the-hidden-expenses-in-your-site-selection-decision",
  capveriCam: "https://www.capveri.com/resources/cam-lease-clause-negotiation-guide",
  capveriOcc: "https://www.capveri.com/blog/occupancy-cost-analysis-commercial-lease",
  solsten: "https://nordicrealestateservices.com/blog/cre-sensitivity-analysis-guide/",
  westwood: "https://westwoodnetlease.com/what-is-a-sensitivity-analysis/",
  linkedinLease: "https://www.linkedin.com/advice/0/what-most-effective-strategies-analyzing-xmpge",
  coy: "https://coydavidson.com/financial-analysis-for-office-lease-transactions-2/",
  cactus: "https://www.trycactus.com/blog/commercial-real-estate-financial-modeling",
  modelreef: "https://modelreef.io/resources/articles/real-estate-cash-flow-model/commercial-real-estate-valuation-model-in-excel-structure-and-common-pitfalls",
  prosperspark: "https://www.prosperspark.com/how-to-audit-an-excel-model-25-checks/",
  investopedia: "https://www.investopedia.com/terms/n/npv.asp",
  investopediaRate: "https://www.investopedia.com/terms/d/discountrate.asp",
  bls: "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm",
  naiop: "https://www.naiop.org/",
  boma: "https://www.boma.org/",
  fasb: "https://www.fasb.org/",
} as const;

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function idFor(question: string): string {
  return `q_${createHash("sha256").update(normalizeQuestion(question)).digest("hex").slice(0, 16)}`;
}

function clusterKey(normalized: string): string {
  if (/what is npv|npv mean|npv in a commercial/.test(normalized) && !/calculat|discount|cost|vs|wrong|explain/.test(normalized))
    return "npv-definition";
  if (/how.*calculat.*npv|calculat.*lease npv|easiest way to calculate/.test(normalized)) return "npv-calculation";
  if (/discount rate/.test(normalized) && /npv|lease/.test(normalized)) return "npv-discount-rate";
  if (/why.*npv|why use npv/.test(normalized)) return "npv-why";
  if (/what costs belong|costs belong in/.test(normalized)) return "npv-costs";
  if (/free rent/.test(normalized) && /npv/.test(normalized)) return "npv-free-rent";
  if (/ti allowance|tenant improvement/.test(normalized) && /npv/.test(normalized)) return "npv-ti";
  if (/escalat/.test(normalized) && /npv/.test(normalized)) return "npv-escalation";
  if (/cam/.test(normalized) && /npv/.test(normalized)) return "npv-cam";
  if (/compare.*npv|using npv/.test(normalized) && /lease/.test(normalized)) return "npv-compare";
  if (/lower npv|always.*better/.test(normalized)) return "npv-lower-better";
  if (/when not|wrong metric|limit/.test(normalized) && /npv/.test(normalized)) return "npv-limits";
  if (/npv vs effective|effective rent vs npv/.test(normalized)) return "npv-vs-effective";
  if (/npv vs total lease cost|aggregate cost/.test(normalized)) return "npv-vs-total";
  if (/npv vs present value|present value vs npv|difference between present value and npv/.test(normalized))
    return "npv-vs-pv";
  if (/explain.*npv|npv to (a )?client/.test(normalized)) return "npv-explain";
  if (/renewal/.test(normalized) && /npv/.test(normalized)) return "npv-renewal";
  if (/commencement|start date/.test(normalized) && /npv/.test(normalized)) return "npv-start-dates";
  if (/sensitivity/.test(normalized) && /npv/.test(normalized)) return "npv-sensitivity";
  if (/compare two|compare.*proposals|compare.*offers|compare.*options/.test(normalized) && /lease/.test(normalized))
    return "compare-two";
  if (/normaliz/.test(normalized)) return "compare-normalize";
  if (/gross.*net|nnn|full.service/.test(normalized) && /compar/.test(normalized)) return "compare-gross-net";
  if (/different (lease )?term/.test(normalized)) return "compare-terms";
  if (/free rent/.test(normalized) && /compar|ti /.test(normalized)) return "compare-free-rent-ti";
  if (/what belongs in.*(comparison|report)/.test(normalized)) return "compare-contents";
  if (/broker.*compar|how (do|should) brokers/.test(normalized)) return "compare-broker";
  if (/cfo.*compar|how (do|should) cfos/.test(normalized)) return "compare-cfo";
  if (/spreadsheet|template/.test(normalized) && /compar/.test(normalized)) return "compare-spreadsheet";
  if (/what is effective rent|define effective rent/.test(normalized)) return "er-definition";
  if (/calculat.*effective|effective rent formula|how.*effective rent/.test(normalized)) return "er-calculate";
  if (/effective.*face|face rent vs/.test(normalized)) return "er-vs-face";
  if (/effective.*asking|asking rent/.test(normalized)) return "er-vs-asking";
  if (/effective rent per square|psf/.test(normalized)) return "er-psf";
  if (/blended rent|average rent vs effective/.test(normalized)) return "er-vs-average";
  if (/effective rent/.test(normalized) && /mistake|error|limit/.test(normalized)) return "er-mistakes";
  if (/cam charges change a lease comparison/.test(normalized)) return "compare-cam";
  if (/questions should a business ask before signing|ask before signing a commercial lease/.test(normalized))
    return "compare-signing";
  if (/what is (total )?occupancy cost|total cost of occupancy/.test(normalized)) return "occ-definition";
  if (/what is cam|cam in a commercial/.test(normalized)) return "occ-cam";
  if (/hidden occupancy|hidden cost/.test(normalized)) return "occ-hidden";
  if (/occupancy cost per (square|employee)/.test(normalized)) return "occ-unit";
  if (/base rent/.test(normalized) && /occupancy|not the full/.test(normalized)) return "occ-base-rent";
  if (/cam caps change occupancy/.test(normalized)) return "occ-cam-caps";
  if (/lowest rent option have a higher occupancy|lowest rent can/.test(normalized)) return "occ-lowest-rent";
  if (/occupancy cost on a gross|compare occupancy cost on a gross/.test(normalized)) return "occ-gross-net";
  if (/tax/.test(normalized) && /occupancy|lease/.test(normalized)) return "occ-taxes";
  if (/insurance/.test(normalized) && /occupancy|lease/.test(normalized)) return "occ-insurance";
  if (/utilit|parking|furniture|moving|build-out/.test(normalized) && /occupancy|cost/.test(normalized))
    return "occ-other-costs";
  if (/what is lease sensitivity|what does lease sensitivity/.test(normalized)) return "sens-definition";
  if (/why (use |do ).*sensitivity/.test(normalized)) return "sens-why";
  if (/discount rate sensitivity/.test(normalized)) return "sens-discount";
  if (/rent.escalation sensitivity/.test(normalized)) return "sens-escalation";
  if (/cam sensitivity change/.test(normalized)) return "sens-cam";
  if (/occupancy.cost sensitivity|occupancy cost sensitivity/.test(normalized)) return "sens-occupancy";
  if (/decision risks does lease sensitivity/.test(normalized)) return "sens-risks";
  if (/assumptions flip a ranking/.test(normalized)) return "sens-flip";
  if (/difference between sensitivity analysis and scenario/.test(normalized)) return "sens-scenario";
  if (/scenario analysis|best case|worst case/.test(normalized)) return "sens-scenario";
  if (/present.*cfo|cfo presentation|client presentation/.test(normalized) && /sensitiv|scenario/.test(normalized))
    return "sens-cfo";
  if (/break-even/.test(normalized)) return "sens-breakeven";
  if (/loi|letter of intent/.test(normalized)) return "tr-loi";
  if (/recommendation memo|client summary|what belongs in/.test(normalized) && /broker|tenant.rep|memo/.test(normalized))
    return "tr-memo";
  if (/renewal vs relocation|renew versus reloc/.test(normalized)) return "tr-renew-reloc";
  if (/explain lease economics|present lease economics/.test(normalized)) return "tr-explain";
  if (/lease abstract vs/.test(normalized)) return "tr-abstract";
  if (/common broker lease.analysis mistakes/.test(normalized)) return "tr-mistakes";
  if (/analysis support lease negotiation/.test(normalized)) return "tr-negotiate";
  if (/analysis change negotiation strategy/.test(normalized)) return "tr-strategy";
  if (/client-facing lease summary/.test(normalized)) return "tr-summary";
  if (/compare multiple spaces/.test(normalized)) return "tr-multi";
  if (/when (does )?finance|when (does )?legal/.test(normalized)) return "tr-handoff";
  if (/what is a commercial lease financial model/.test(normalized)) return "model-definition";
  if (/free rent sit in a lease model/.test(normalized)) return "model-free-rent";
  if (/ti allowance sit in a lease model/.test(normalized)) return "model-ti";
  if (/rent escalations sit in a lease model/.test(normalized)) return "model-escalation";
  if (/cam sit in a lease model/.test(normalized)) return "model-cam";
  if (/scenario analysis in a lease model/.test(normalized)) return "model-scenario";
  if (/lease model be presented to a client/.test(normalized)) return "model-present";
  if (/inputs belong|model inputs|what belongs in a.*model/.test(normalized)) return "model-inputs";
  if (/cash flow model|build.*lease model|how to build/.test(normalized)) return "model-build";
  if (/spreadsheet error|model audit|hardcoded/.test(normalized)) return "model-audit";
  if (/lease vs buy/.test(normalized)) return "model-lease-vs-buy";
  return normalizeQuestion(normalized).slice(0, 48);
}

const RAW: RawRow[] = [
  { q: "What is NPV in a commercial lease?", topic: "commercial-lease-npv", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.transwestern, phrasing: "What is this worth to me today?", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What does NPV mean in commercial real estate?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.transwestern, phrasing: "Simplifying the importance of net present value", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How is lease NPV calculated?", topic: "commercial-lease-npv", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.linkedinNpv, phrasing: "What's the easiest way to calculate a commercial lease's NPV?", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you calculate commercial lease NPV in Excel?", topic: "commercial-lease-npv", evidence: "COMMUNITY_DEMAND_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.linkedinNpv, phrasing: "calculate a commercial lease's NPV using a simple spreadsheet", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "What discount rate should be used for commercial lease NPV?", topic: "commercial-lease-npv", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "What discount rate should you use?", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "Why use NPV when comparing commercial leases?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.transwestern, phrasing: "why NPV allows comparison of different pay schedules", intent: "DECISION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What costs belong in commercial lease NPV?", topic: "commercial-lease-npv", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "include base rent, tenant improvements, escalations, and operating expenses", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does free rent affect lease NPV?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "free rent periods change present value", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does a TI allowance affect lease NPV?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "tenant improvements belong in the cash-flow list", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do rent escalations affect lease NPV?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "lease escalations in the present-value walk", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "Should CAM be included in lease NPV?", topic: "commercial-lease-npv", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "pro rata share of operating expenses for common areas", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare leases using NPV?", topic: "commercial-lease-npv", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "comparative lease analysis estimates NPV of two or more options", intent: "COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do different lease terms change NPV?", topic: "commercial-lease-npv", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.transwestern, phrasing: "compare varied payments over time", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "Is lower NPV always a better lease?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.fnrp, phrasing: "for tenants, the lowest NPV is the cheapest", intent: "LIMITATION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "When should you not use NPV for a lease choice?", topic: "commercial-lease-npv", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.transwestern, phrasing: "put aside location and other non-cash factors", intent: "LIMITATION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "NPV vs effective rent: what is the difference?", topic: "commercial-lease-npv", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "NPV vs effective rent as separate metrics", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "NPV vs total lease cost: why do they differ?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.transwestern, phrasing: "aggregate cost can match while NPV differs", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What is the difference between NPV and present value in a lease?", topic: "commercial-lease-npv", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.costar, phrasing: "sum of present values is called net present value", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do renewal options change lease NPV?", topic: "commercial-lease-npv", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "assess renewal options in comparison", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do different commencement dates change lease NPV?", topic: "commercial-lease-npv", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "compare commencement date and expiration date", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How should you explain lease NPV to a client?", topic: "commercial-lease-npv", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "the price of the deal in today's dollars", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does sensitivity analysis change a lease NPV ranking?", topic: "commercial-lease-npv", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "a 1-2 point rate change can reverse which lease wins", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },

  { q: "How do you compare two commercial lease proposals?", topic: "lease-comparison", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.gable, phrasing: "How to compare proposals and calculate true occupancy cost", intent: "HOW_TO", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you normalize commercial lease proposals?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.gable, phrasing: "convert proposals to total occupancy cost per square foot", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare a gross lease and a net lease?", topic: "lease-comparison", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.gable, phrasing: "A $30/SF gross lease and an $18/SF NNN lease may cost the same", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare commercial leases with different terms?", topic: "lease-comparison", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "Compare lease term length, commencement, and expiration", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do free rent and TI allowances change a lease comparison?", topic: "lease-comparison", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "Evaluate TI allowance and free rent, then calculate NPV", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do rent escalations change a lease comparison?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.gable, phrasing: "How is rent increasing over time?", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do CAM charges change a lease comparison?", topic: "lease-comparison", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "Evaluate CAM structure: gross vs NNN, exclusions, caps", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do taxes change a commercial lease comparison?", topic: "lease-comparison", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lucid, phrasing: "What is my real total occupancy cost?", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does insurance change a commercial lease comparison?", topic: "lease-comparison", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.towercorp, phrasing: "insurance premiums raise total occupancy cost", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How do renewal options change a lease comparison?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "Assess renewal options: number, term, rent basis", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do termination options change a lease comparison?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "Compare termination options, timing, and penalties", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do you compare leases with different commencement dates?", topic: "lease-comparison", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "commencement date and expiration date for each option", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do you compare multiple office or industrial locations?", topic: "lease-comparison", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.capveriOcc, phrasing: "Comparing locations on NPV of total occupancy cost", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "MEDIUM" },
  { q: "What belongs in a commercial lease comparison?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "side-by-side occupancy cost, term, TI, free rent, CAM, options", intent: "WORKFLOW", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do tenant-rep brokers compare lease offers?", topic: "lease-comparison", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "occupancy costs on a present value basis per usable foot", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do CFOs review commercial lease comparisons?", topic: "lease-comparison", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "discounted present value as a level rate per square foot", intent: "FINANCE_EXECUTIVE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "Is there a commercial lease comparison spreadsheet?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "Lease comparison template", intent: "SOFTWARE_COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "What is a commercial lease comparison template?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "compare commercial lease options template", intent: "SOFTWARE_COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do you compare a renewal proposal to a new space?", topic: "lease-comparison", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "comparing a renewal proposal against a new space alternative", intent: "SCENARIO", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What questions should a business ask before signing a commercial lease?", topic: "lease-comparison", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lucid, phrasing: "10 critical questions before signing", intent: "DECISION", search: "INFORMATIONAL", funnel: "DECISION", persona: "tenant-operator", commercial: "HIGH" },
  { q: "How do parking costs change a lease comparison?", topic: "lease-comparison", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "Compare parking ratio, cost, and reserved allocation", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "LOW" },
  { q: "How do you compare office versus industrial lease economics?", topic: "lease-comparison", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_UNKNOWN", source: SOURCES.gable, phrasing: "industrial properties lean toward triple net", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },

  { q: "What is effective rent in a commercial lease?", topic: "effective-rent", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.legalclarity, phrasing: "What is effective rent and how is it calculated?", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is net effective rent?", topic: "effective-rent", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.wikipediaNer, phrasing: "Net effective rent, also called net effective rate", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you calculate effective rent?", topic: "effective-rent", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.legalclarity, phrasing: "Effective Rent = (Total Rent + Expenses − Concessions − TI) ÷ Term", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is the effective rent formula?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "Effective Rent = LPV × k / annuity factor", intent: "FORMULA", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What is the difference between effective rent and face rent?", topic: "effective-rent", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.legalclarity, phrasing: "Face rent is the sticker price. Effective rent adjusts it.", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is the difference between effective rent and asking rent?", topic: "effective-rent", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.wikipediaNer, phrasing: "NER is contrasted with face rent or asking rent", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "Effective rent vs NPV: which should you use?", topic: "effective-rent", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "effective rent is a level annuity; NPV is a lump sum", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does free rent change effective rent?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.released, phrasing: "NER spreads concession value across the full lease term", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does a TI allowance change effective rent?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "TI allowances reduce landlord net revenue and effective rent", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do escalations change effective rent?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.oconnell, phrasing: "escalations belong in the cash-flow stream", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "Does effective rent work the same on gross and net leases?", topic: "effective-rent", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.oconnell, phrasing: "normalize to the same expense basis", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do brokers use effective rent?", topic: "effective-rent", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.released, phrasing: "NER enables comparison between proposals with different concessions", intent: "BROKER_PRACTICE", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do tenants use effective rent?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.legalclarity, phrasing: "a single comparable number to weigh one deal against another", intent: "DECISION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "MEDIUM" },
  { q: "How do landlords use effective rent?", topic: "effective-rent", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.wikipediaNer, phrasing: "true economic income a landlord receives", intent: "DECISION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "landlord-analyst", commercial: "MEDIUM" },
  { q: "How do different term lengths change effective rent?", topic: "effective-rent", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.oconnell, phrasing: "a $30/SF 5-year vs 10-year lease is not the same product", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do renewal options change effective rent?", topic: "effective-rent", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_UNKNOWN", source: SOURCES.oconnell, phrasing: "embedded options are not captured by effective rent", intent: "LIMITATION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "What is effective rent per square foot?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "a single $/SF/year figure", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is blended rent versus effective rent?", topic: "effective-rent", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.released, phrasing: "average rent after spreading concessions", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "What is the difference between average rent and effective rent?", topic: "effective-rent", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.legalclarity, phrasing: "simple average versus NPV-adjusted effective rent", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "What are common effective rent mistakes?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "Comparing face rents without adjusting for concessions", intent: "MISTAKE", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What are the limits of effective rent?", topic: "effective-rent", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "sensitive to discount rate; does not value embedded options", intent: "LIMITATION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "Should you use a simple average or an NPV-adjusted effective rent?", topic: "effective-rent", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.legalclarity, phrasing: "simple method versus NPV-adjusted method", intent: "DECISION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },

  { q: "What is total occupancy cost in a commercial lease?", topic: "occupancy-costs", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.camaudit, phrasing: "Total Occupancy Cost: the full annual amount a tenant pays", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "cfo-finance", commercial: "HIGH" },
  { q: "Is occupancy cost just the rent line?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.camaudit, phrasing: "Why occupancy cost is not just the rent line", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What is CAM in a commercial lease?", topic: "occupancy-costs", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.camaudit, phrasing: "CAM is the tenant's pro-rata share of common-area costs", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do property taxes change occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.camaudit, phrasing: "real estate tax pass-throughs", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does insurance change occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.towercorp, phrasing: "insurance premiums have risen in many regions", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "Do utilities belong in occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.bluecap, phrasing: "utilities can quietly inflate operating costs", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "MEDIUM" },
  { q: "Does parking belong in occupancy cost?", topic: "occupancy-costs", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "parking ratio, cost, reserved vs unreserved", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "MEDIUM" },
  { q: "Do moving costs belong in occupancy cost?", topic: "occupancy-costs", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.bluecap, phrasing: "hidden expenses in site selection", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "Do furniture and build-out costs belong in occupancy cost?", topic: "occupancy-costs", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.bluecap, phrasing: "tenant improvements and operational maintenance", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How do TI offsets change occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.capveriOcc, phrasing: "amortized build-out or improvement costs borne by the tenant", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What operating expenses belong beside face rent?", topic: "occupancy-costs", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.boma, phrasing: "buildings have shared operating costs", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare occupancy cost on a gross lease and a net lease?", topic: "occupancy-costs", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.towercorp, phrasing: "A $25 gross lease may beat an $18 NNN lease after extras", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is occupancy cost per square foot?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.capveriOcc, phrasing: "true occupancy cost to $37–43/SF", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What is occupancy cost per employee?", topic: "occupancy-costs", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.bluecap, phrasing: "site selection beyond rent", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How do you compare occupancy cost across locations?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.capveriOcc, phrasing: "Comparing locations on NPV of total occupancy cost", intent: "COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "HIGH" },
  { q: "How should a company budget occupancy cost?", topic: "occupancy-costs", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.camaudit, phrasing: "separate GL accounts for rent, CAM, taxes, insurance", intent: "WORKFLOW", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "What hidden occupancy costs do tenants miss?", topic: "occupancy-costs", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.towercorp, phrasing: "Hidden costs can raise expenses 20 to 40% beyond base rent", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-operator", commercial: "HIGH" },
  { q: "Why can the lowest rent option have a higher occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.towercorp, phrasing: "advertised rate rarely reflects the full financial commitment", intent: "DECISION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do management fees change occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.capveriCam, phrasing: "management fees over 4 to 5 percent", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "Should capital expenditures be in occupancy cost?", topic: "occupancy-costs", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.capveriCam, phrasing: "negotiate an explicit exclusions list covering capital expenditures", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How do CAM caps change occupancy-cost risk?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.capveriCam, phrasing: "cap on controllable expenses, typically 3 to 5 percent", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is the difference between base rent and occupancy cost?", topic: "occupancy-costs", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.camaudit, phrasing: "occupancy cost is 40 to 100 percent higher than base rent", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-operator", commercial: "HIGH" },

  { q: "What is lease sensitivity analysis?", topic: "lease-sensitivity-analysis", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.westwood, phrasing: "What is a sensitivity analysis and how does it work?", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "cfo-finance", commercial: "HIGH" },
  { q: "Why use sensitivity analysis on a commercial lease?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.linkedinLease, phrasing: "test how the financial outcome changes when assumptions change", intent: "DECISION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does discount-rate sensitivity change a lease ranking?", topic: "lease-sensitivity-analysis", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "A 1–2 percentage point change in k can reverse which lease wins", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does rent-escalation sensitivity change a lease ranking?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.linkedinLease, phrasing: "vary the rent escalation rate", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does CAM sensitivity change a lease ranking?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.capveriOcc, phrasing: "uncapped CAM creates higher downside risk in sensitivity analysis", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does term-length sensitivity change a lease ranking?", topic: "lease-sensitivity-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.linkedinLease, phrasing: "test different lease durations", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How does free-rent sensitivity change a lease ranking?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.linkedinLease, phrasing: "incentives and concessions in the sensitivity walk", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How does TI sensitivity change a lease ranking?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.capveriOcc, phrasing: "Location B looks worse once TI allowances are netted", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do renewal assumptions change a sensitivity result?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.solsten, phrasing: "tenant renewal probability is a core stress variable", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How does occupancy-cost sensitivity change a location choice?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.capveriOcc, phrasing: "occupancy cost analysis with sensitivity analysis", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What is the difference between sensitivity analysis and scenario analysis?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.solsten, phrasing: "Sensitivity changes one or two variables. Scenarios move many together.", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do you build a best-case lease scenario?", topic: "lease-sensitivity-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.westwood, phrasing: "visual what-if analysis of unknown variables", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do you build a worst-case lease scenario?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.westwood, phrasing: "figure out the worst-case scenario", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What is a break-even point in a lease comparison?", topic: "lease-sensitivity-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.linkedinLease, phrasing: "identify the key drivers and risks of the lease", intent: "DECISION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How do you compare multiple lease scenarios?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.linkedinLease, phrasing: "assess robustness under different scenarios", intent: "SCENARIO", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should you present lease scenarios to a client?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.solsten, phrasing: "Scenarios are a storytelling tool", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should you present lease scenarios to a CFO?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "after-tax cash flows discounted at the after-tax cost of debt", intent: "FINANCE_EXECUTIVE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do brokers use sensitivity in a lease workflow?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.linkedinLease, phrasing: "identify key drivers and risks", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you run lease sensitivity in a spreadsheet?", topic: "lease-sensitivity-analysis", evidence: "COMMUNITY_DEMAND_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.linkedinLease, phrasing: "vary discount rate, escalation, vacancy, inflation, or market rent", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "What decision risks does lease sensitivity reveal?", topic: "lease-sensitivity-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.solsten, phrasing: "four to six variables cover most of the risk", intent: "DECISION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What does lease sensitivity analysis show?", topic: "lease-sensitivity-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.westwood, phrasing: "how variables can change throughout the life of the investment", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "Which lease assumptions flip a ranking first?", topic: "lease-sensitivity-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "discount rate and large upfront concessions", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },

  { q: "How do tenant-rep brokers compare commercial leases?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "Financial analysis for office lease transactions", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do brokers analyze lease proposals?", topic: "tenant-rep-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "used by corporate real estate teams and tenant brokers", intent: "WORKFLOW", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should a tenant-rep broker explain lease economics?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "the price of the deal", intent: "BROKER_PRACTICE", search: "INFORMATIONAL", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare commercial LOIs?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "unlike the quoted rent figure in an LOI", intent: "HOW_TO", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What belongs in a lease recommendation memo?", topic: "tenant-rep-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "document final recommendation with supporting rationale", intent: "WORKFLOW", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What is the difference between a lease abstract and a financial analysis?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.coy, phrasing: "once occupancy cost components are on the table, project the term", intent: "COMPARISON", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How do brokers show lease savings?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.coy, phrasing: "the deal that looked cheaper can cost more over the life", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you explain NPV to a leasing client?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "time-value-weighted cost of the lease", intent: "BROKER_PRACTICE", search: "INFORMATIONAL", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you explain effective rent to a leasing client?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.released, phrasing: "true economic cost rather than headline asking rent", intent: "BROKER_PRACTICE", search: "INFORMATIONAL", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What belongs in a client-facing lease summary?", topic: "tenant-rep-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "score each option and document the recommendation", intent: "WORKFLOW", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should brokers communicate lease economics to a CFO?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "absolute terms and present value, rentable and usable feet", intent: "FINANCE_EXECUTIVE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do you present a scenario comparison to a client?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "renewal versus new space alternative", intent: "SCENARIO", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare a renewal versus a relocation?", topic: "tenant-rep-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.lextract, phrasing: "comparing a renewal proposal against a new space", intent: "SCENARIO", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do brokers use a spreadsheet in lease analysis?", topic: "tenant-rep-analysis", evidence: "COMMUNITY_DEMAND_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "lease comparison template used by tenant brokers", intent: "PRODUCT_WORKFLOW", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "What are common broker lease-analysis mistakes?", topic: "tenant-rep-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.oconnell, phrasing: "comparing gross and net leases without adjusting expenses", intent: "MISTAKE", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you compare multiple spaces for one client?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "two or more lease options", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "When should finance get involved in a lease decision?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.coy, phrasing: "tenants with meaningful tax considerations", intent: "DECISION", search: "INFORMATIONAL", funnel: "DECISION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "When should legal get involved in a lease decision?", topic: "tenant-rep-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lucid, phrasing: "leases are written to protect the building", intent: "DECISION", search: "INFORMATIONAL", funnel: "DECISION", persona: "tenant-operator", commercial: "MEDIUM" },
  { q: "How does analysis support lease negotiation?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.coy, phrasing: "know the landlord's effective rental rate before you sit down", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How does analysis change negotiation strategy?", topic: "tenant-rep-analysis", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.coy, phrasing: "there is room between what they ask and what they accept", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What software do tenant-rep brokers use to model total cost?", topic: "tenant-rep-analysis", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.lextract, phrasing: "what software they use to model total costs", intent: "SOFTWARE_COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "MEDIUM" },
  { q: "How does a lease comparison tool differ from a brokerage CRM?", topic: "tenant-rep-analysis", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_UNKNOWN", source: SOURCES.bls, phrasing: "brokers advise clients on property deals", intent: "SOFTWARE_COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "LOW" },

  { q: "What is a commercial lease financial model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.cactus, phrasing: "Commercial real estate financial modeling", intent: "DEFINITION", search: "INFORMATIONAL", funnel: "AWARENESS", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What inputs belong in a commercial lease model?", topic: "lease-financial-modeling", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.modelreef, phrasing: "rent roll, expiries, escalations, opex, capex, sale assumptions", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do you build a commercial lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.modelreef, phrasing: "Build the model skeleton: Inputs, schedules, outputs, checks", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you build a lease cash-flow model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.modelreef, phrasing: "Create the operating cash flow schedules", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How should rent escalations sit in a lease model?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.modelreef, phrasing: "model leases with timing realism", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should free rent sit in a lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.cactus, phrasing: "the free rent period that never made it into the cash flow", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should a TI allowance sit in a lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.cactus, phrasing: "omitting TI inflates cash-flow projections", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How should CAM sit in a lease model?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.modelreef, phrasing: "operating expense history and recoveries", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How should taxes sit in a lease model?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.modelreef, phrasing: "operating expenses include property tax", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How should insurance sit in a lease model?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.modelreef, phrasing: "expense assumptions: tax, insurance, R&M, utilities", intent: "COST_COMPONENT", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "How should renewal assumptions sit in a lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.cactus, phrasing: "incorrect lease expiration distorts rollover risk", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "What discount rate belongs in a lease model?", topic: "lease-financial-modeling", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.investopediaRate, phrasing: "A discount rate prices waiting", intent: "ASSUMPTION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does NPV come out of a lease model?", topic: "lease-financial-modeling", evidence: "AUTHORITY_TERMINOLOGY", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.investopedia, phrasing: "NPV discounts later cash", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How does effective rent come out of a lease model?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.oconnell, phrasing: "convert irregular cash flow into a level annuity", intent: "CALCULATION", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "How do you run scenario analysis in a lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.modelreef, phrasing: "hidden hardcodes make scenario analysis untrustworthy", intent: "SCENARIO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do you run sensitivity analysis in a lease model?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.modelreef, phrasing: "list the assumptions that drive value", intent: "SENSITIVITY", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do you compare a lease versus a buy in a model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.cactus, phrasing: "models drive investment decisions", intent: "COMPARISON", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "cfo-finance", commercial: "MEDIUM" },
  { q: "What spreadsheet errors show up in lease models?", topic: "lease-financial-modeling", evidence: "MULTI_SOURCE_CONFIRMED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.cactus, phrasing: "88% of spreadsheets contain errors", intent: "MISTAKE", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How do you audit a commercial lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.prosperspark, phrasing: "25 checks: inputs, formulas, outputs, reconciliations", intent: "HOW_TO", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "HIGH" },
  { q: "How should a lease model be presented to a client?", topic: "lease-financial-modeling", evidence: "PROFESSIONAL_QUERY_PATTERN", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.coy, phrasing: "shareable comparison next to sensitivity cases", intent: "BROKER_PRACTICE", search: "COMMERCIAL_INVESTIGATION", funnel: "DECISION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "What are common lease-analysis mistakes?", topic: "lease-financial-modeling", evidence: "QUESTION_PATTERN_OBSERVED", demand: "SEARCH_DEMAND_OBSERVED", source: SOURCES.cactus, phrasing: "wrong expiration, missing free rent, omitted TI", intent: "MISTAKE", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "tenant-rep-broker", commercial: "HIGH" },
  { q: "Should Excel NPV or XNPV be used in a lease model?", topic: "lease-financial-modeling", evidence: "SERP_OBSERVED", demand: "SEARCH_DEMAND_RELATIVE", source: SOURCES.modelreef, phrasing: "Using NPV instead of XNPV", intent: "FORMULA", search: "INFORMATIONAL", funnel: "CONSIDERATION", persona: "cfo-finance", commercial: "LOW" },
];

const EXISTING_ROUTES: Record<string, string> = {
  "npv-definition": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
  "npv-discount-rate": "/commercial-lease-npv/what-discount-rate-should-you-use",
  "npv-limits": "/commercial-lease-npv/when-is-npv-the-wrong-metric",
  "npv-lower-better": "/commercial-lease-npv/when-is-npv-the-wrong-metric",
  "compare-two": "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
  "compare-free-rent-ti": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv",
  "compare-terms": "/lease-comparison/how-do-you-compare-different-lease-terms",
  "npv-vs-effective": "/effective-rent/effective-rent-vs-npv",
  "sens-definition": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show",
  "tr-explain": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics",
  "model-audit": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes",
};

const NEW_STANDALONE_ROUTES: Record<string, string> = {
  "npv-calculation": "/commercial-lease-npv/how-is-lease-npv-calculated",
  "npv-costs": "/commercial-lease-npv/what-costs-belong-in-lease-npv",
  "npv-vs-pv": "/commercial-lease-npv/npv-vs-present-value",
  "npv-explain": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients",
  "compare-normalize": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals",
  "compare-gross-net": "/lease-comparison/how-do-you-compare-gross-and-net-leases",
  "compare-contents": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison",
  "compare-broker": "/lease-comparison/how-do-brokers-compare-lease-offers",
  "er-calculate": "/effective-rent/how-to-calculate-effective-rent",
  "er-vs-face": "/effective-rent/effective-rent-vs-face-rent",
  "er-psf": "/effective-rent/effective-rent-per-square-foot",
  "er-mistakes": "/effective-rent/common-effective-rent-mistakes",
  "occ-definition": "/occupancy-costs/what-is-total-occupancy-cost",
  "occ-cam": "/occupancy-costs/what-is-cam-in-a-commercial-lease",
  "occ-hidden": "/occupancy-costs/hidden-occupancy-costs",
  "occ-unit": "/occupancy-costs/occupancy-cost-per-square-foot",
  "sens-why": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "sens-discount": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking",
  "sens-cfo": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo",
  "tr-loi": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "tr-memo": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo",
  "tr-renew-reloc": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation",
  "model-inputs": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
  "model-build": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model",
};

const HUB_FOR: Record<TopicId, string> = {
  "commercial-lease-npv": "/commercial-lease-npv",
  "lease-comparison": "/lease-comparison",
  "effective-rent": "/effective-rent",
  "occupancy-costs": "/occupancy-costs",
  "lease-sensitivity-analysis": "/lease-sensitivity-analysis",
  "tenant-rep-analysis": "/tenant-rep-analysis",
  "lease-financial-modeling": "/lease-financial-modeling",
};

const MERGE_TO_EXISTING: Record<string, { route: string; section: string }> = {
  "npv-why": { route: "/commercial-lease-npv", section: "why" },
  "npv-free-rent": { route: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv", section: "example" },
  "npv-ti": { route: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv", section: "example" },
  "npv-escalation": { route: "/lease-comparison", section: "escalation" },
  "npv-cam": { route: "/occupancy-costs", section: "cam" },
  "npv-compare": { route: "/lease-comparison/how-do-you-compare-two-commercial-lease-options", section: "direct-answer" },
  "npv-vs-total": { route: "/commercial-lease-npv", section: "compare" },
  "npv-renewal": { route: "/lease-comparison", section: "renewal" },
  "npv-start-dates": { route: "/lease-comparison/how-do-you-compare-two-commercial-lease-options", section: "dates" },
  "npv-sensitivity": { route: "/lease-sensitivity-analysis", section: "npv" },
  "er-definition": { route: "/effective-rent", section: "direct-answer" },
};

export const DEPTH_STANDALONE_ROUTES: Record<string, string> = {
  "npv-why": "/commercial-lease-npv/why-use-npv-when-comparing-leases",
  "npv-vs-total": "/commercial-lease-npv/npv-vs-total-lease-cost",
  "npv-cam": "/commercial-lease-npv/should-cam-be-in-lease-npv",
  "compare-cfo": "/lease-comparison/how-do-cfos-review-lease-comparisons",
  "compare-cam": "/lease-comparison/how-do-cam-charges-change-a-comparison",
  "compare-signing": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease",
  "er-definition": "/effective-rent/what-is-effective-rent",
  "er-vs-average": "/effective-rent/blended-rent-vs-effective-rent",
  "er-vs-asking": "/effective-rent/effective-rent-vs-asking-rent",
  "does effective rent work the same on gross and n": "/effective-rent/effective-rent-on-gross-and-net-leases",
  "should you use a simple average or an npv adjust": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent",
  "occ-taxes": "/occupancy-costs/how-property-taxes-change-occupancy-cost",
  "occ-insurance": "/occupancy-costs/how-insurance-changes-occupancy-cost",
  "occ-base-rent": "/occupancy-costs/base-rent-vs-occupancy-cost",
  "occ-gross-net": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases",
  "occ-lowest-rent": "/occupancy-costs/why-lowest-rent-can-cost-more",
  "occ-cam-caps": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk",
  "sens-scenario": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis",
  "sens-escalation": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking",
  "sens-cam": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking",
  "sens-risks": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals",
  "sens-flip": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking",
  "sens-occupancy": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice",
  "tr-abstract": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis",
  "tr-mistakes": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes",
  "tr-negotiate": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation",
  "tr-strategy": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy",
  "tr-summary": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary",
  "tr-multi": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client",
  "model-definition": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model",
  "model-free-rent": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model",
  "model-ti": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model",
  "model-escalation": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model",
  "model-scenario": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model",
  "model-present": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client",
  "model-cam": "/lease-financial-modeling/how-cam-sits-in-a-lease-model",
};

function decide(clusterId: string, commercial: "HIGH" | "MEDIUM" | "LOW"): CoverageDecision {
  if (EXISTING_ROUTES[clusterId]) return "MERGE_WITH_EXISTING";
  if (NEW_STANDALONE_ROUTES[clusterId]) return "BUILD_STANDALONE";
  if (MERGE_TO_EXISTING[clusterId]) return commercial === "LOW" ? "DEFER_LOW_VALUE" : "EXPAND_EXISTING_PAGE";
  if (commercial === "LOW") return "DEFER_LOW_VALUE";
  if (commercial === "MEDIUM") return "ADD_ANSWER_CHUNK";
  return "ADD_TO_HUB";
}

function mappedFor(clusterId: string, topic: TopicId): { route: string | null; section: string | null } {
  if (EXISTING_ROUTES[clusterId]) return { route: EXISTING_ROUTES[clusterId], section: "direct-answer" };
  if (NEW_STANDALONE_ROUTES[clusterId]) return { route: NEW_STANDALONE_ROUTES[clusterId], section: "direct-answer" };
  if (MERGE_TO_EXISTING[clusterId]) return MERGE_TO_EXISTING[clusterId];
  return { route: HUB_FOR[topic], section: "questions" };
}

export function rawSearchQuestionRows(): RawRow[] {
  return RAW;
}

export function buildSearchValidatedQuestionGraph(): SearchQuestionRecord[] {
  const grouped = new Map<string, RawRow[]>();
  for (const row of RAW) {
    const key = clusterKey(normalizeQuestion(row.q));
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  const records: SearchQuestionRecord[] = [];
  for (const [clusterId, members] of grouped) {
    const primary = [...members].sort((a, b) => {
      const rank = (item: RawRow) =>
        item.evidence === "MULTI_SOURCE_CONFIRMED" ? 0 : item.evidence === "SERP_OBSERVED" ? 1 : 2;
      return rank(a) - rank(b);
    })[0];
    const decision = decide(clusterId, primary.commercial);
    const mapped = mappedFor(clusterId, primary.topic);
    const alternates = members.filter((item) => item.q !== primary.q).map((item) => item.q);
    const related = members.map((item) => item.q);
    for (const member of members) {
      const secondary = TOPIC_IDS.filter((topic) => topic !== member.topic).filter((topic) => {
        const blob = `${member.q} ${member.phrasing}`.toLowerCase();
        return (
          (topic === "commercial-lease-npv" && /npv|present value/.test(blob)) ||
          (topic === "effective-rent" && /effective rent/.test(blob)) ||
          (topic === "occupancy-costs" && /occupancy|cam|tax|insurance/.test(blob)) ||
          (topic === "lease-comparison" && /compar/.test(blob)) ||
          (topic === "lease-sensitivity-analysis" && /sensitiv|scenario/.test(blob)) ||
          (topic === "tenant-rep-analysis" && /broker|client|loi|memo/.test(blob)) ||
          (topic === "lease-financial-modeling" && /model|spreadsheet|cash flow/.test(blob))
        );
      });
      records.push({
        questionId: idFor(member.q),
        question: member.q,
        normalizedQuestion: normalizeQuestion(member.q),
        topic: member.topic,
        evidenceClass: member.evidence,
        demandClass: member.demand,
        monthlyVolume: null,
        fabricatedSearchVolume: false,
        source: member.source,
        retrievedAt: SEARCH_RESEARCH_RETRIEVED_AT,
        observedPhrasing: member.phrasing,
        semanticIntent: member.intent,
        searchIntent: member.search,
        funnelStage: member.funnel,
        persona: member.persona,
        commercialRelevance: member.commercial,
        standaloneEligible: decision === "BUILD_STANDALONE" || Boolean(EXISTING_ROUTES[clusterId]),
        answerChunkEligible: decision !== "DEFER_LOW_VALUE",
        parentHub: HUB_FOR[member.topic],
        relatedQuestions: related.filter((item) => item !== member.q),
        candidateInternalLinkTargets: [mapped.route, HUB_FOR[member.topic], "/compare-commercial-leases", "/how-it-works"].filter(
          (item): item is string => Boolean(item),
        ),
        externalSourceNeeds: [member.source, SOURCES.investopedia, SOURCES.bls, SOURCES.naiop],
        ctaIntent: member.search,
        clusterId,
        canonicalQuestion: primary.q,
        alternatePhrasings: alternates,
        primaryTopic: primary.topic,
        secondaryTopics: secondary,
        decision,
        mappedRoute: mapped.route,
        mappedSection: mapped.section,
      });
    }
  }
  return records;
}

export function uniqueCanonicalQuestions(records = buildSearchValidatedQuestionGraph()): SearchQuestionRecord[] {
  const seen = new Set<string>();
  return records.filter((row) => {
    if (seen.has(row.clusterId)) return false;
    seen.add(row.clusterId);
    return row.question === row.canonicalQuestion;
  });
}

export function newStandaloneRoutes(): string[] {
  return Object.values(NEW_STANDALONE_ROUTES);
}

export function existingStandaloneRoutes(): string[] {
  return [...new Set(Object.values(EXISTING_ROUTES))];
}

export function depthStandaloneRoutes(): string[] {
  return Object.values(DEPTH_STANDALONE_ROUTES);
}

export function allStandaloneQuestionRoutes(): string[] {
  return [...existingStandaloneRoutes(), ...newStandaloneRoutes(), ...depthStandaloneRoutes()];
}

export function authorityContentGaps(records = uniqueCanonicalQuestions()): Array<{
  model: "AuthorityContentGap";
  question: string;
  topic: TopicId;
  decision: CoverageDecision;
  reason: string;
}> {
  return records
    .filter((row) => row.decision !== "BUILD_STANDALONE" && !EXISTING_ROUTES[row.clusterId])
    .map((row) => ({
      model: "AuthorityContentGap" as const,
      question: row.canonicalQuestion,
      topic: row.primaryTopic,
      decision: row.decision,
      reason:
        row.decision === "DEFER_LOW_VALUE"
          ? "Low commercial depth or thin unique math for a 2000-word page."
          : row.decision === "MERGE_WITH_EXISTING"
            ? "Wording variant of an existing standalone page."
            : row.decision === "EXPAND_EXISTING_PAGE"
              ? "Better answered by deepening an existing page."
              : row.decision === "ADD_ANSWER_CHUNK"
                ? "Distinct enough for a GEO chunk, not a new URL."
                : "Hub section covers the decision without a thin clone page.",
    }));
}

export function topicCoverageReport(records = buildSearchValidatedQuestionGraph()) {
  return TOPIC_IDS.map((topic) => {
    const raw = records.filter((row) => row.topic === topic);
    const canonical = uniqueCanonicalQuestions(raw);
    const standalone = canonical.filter((row) => row.decision === "BUILD_STANDALONE" || EXISTING_ROUTES[row.clusterId]);
    const hubContained = canonical.filter((row) => row.decision === "ADD_TO_HUB" || row.decision === "EXPAND_EXISTING_PAGE");
    const chunks = canonical.filter((row) => row.answerChunkEligible);
    const gaps = canonical.filter((row) => row.decision === "DEFER_LOW_VALUE");
    return {
      topic,
      rawValidated: raw.length,
      uniqueCanonical: canonical.length,
      standalonePages: standalone.length,
      hubContainedAnswers: hubContained.length,
      answerChunks: chunks.length,
      remainingGaps: gaps.length,
      meaningfulRelationships: raw.filter((row) => row.decision !== "DEFER_LOW_VALUE").length,
    };
  });
}

export function evidenceClassCounts(records = buildSearchValidatedQuestionGraph()) {
  const counts: Record<EvidenceClass, number> = {
    SERP_OBSERVED: 0,
    QUESTION_PATTERN_OBSERVED: 0,
    AUTOCOMPLETE_OBSERVED: 0,
    COMMUNITY_DEMAND_OBSERVED: 0,
    PROFESSIONAL_QUERY_PATTERN: 0,
    AUTHORITY_TERMINOLOGY: 0,
    MULTI_SOURCE_CONFIRMED: 0,
  };
  for (const row of records) counts[row.evidenceClass] += 1;
  return counts;
}

export function decisionCounts(records = uniqueCanonicalQuestions()) {
  const counts: Record<CoverageDecision, number> = {
    BUILD_STANDALONE: 0,
    EXPAND_EXISTING_PAGE: 0,
    ADD_TO_HUB: 0,
    ADD_ANSWER_CHUNK: 0,
    MERGE_WITH_EXISTING: 0,
    DEFER_LOW_VALUE: 0,
  };
  for (const row of records) counts[row.decision] += 1;
  return counts;
}

export function searchResearchSummary() {
  const records = buildSearchValidatedQuestionGraph();
  const byTopic = TOPIC_IDS.map((topic) => ({
    topic,
    raw: records.filter((row) => row.topic === topic).length,
  }));
  return {
    topicsResearched: TOPIC_IDS.length,
    rawValidatedQuestionCandidates: records.length,
    byTopic,
    minimumTwentyPerTopic: byTopic.every((row) => row.raw >= 20),
    fabricatedSearchVolume: false as const,
    evidence: evidenceClassCounts(records),
    canonicalUnique: uniqueCanonicalQuestions(records).length,
    duplicatesMerged: records.length - uniqueCanonicalQuestions(records).length,
    crossTopicRelationships: records.reduce((sum, row) => sum + row.secondaryTopics.length, 0),
    coverage: topicCoverageReport(records),
    decisions: decisionCounts(),
    newStandalone: newStandaloneRoutes(),
    depthStandalone: depthStandaloneRoutes(),
    gaps: authorityContentGaps(),
  };
}

export function hubPathForTopic(topic: TopicId): string {
  return HUB_FOR[topic];
}

export function standaloneRouteForCluster(clusterId: string): string | undefined {
  return EXISTING_ROUTES[clusterId] ?? NEW_STANDALONE_ROUTES[clusterId] ?? DEPTH_STANDALONE_ROUTES[clusterId];
}
