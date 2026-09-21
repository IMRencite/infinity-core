import type { Gate, PageRole } from "../types";

export type { Gate };
import type {
  ADVERSARIAL_FAIL_REASONS,
  CONTENT_DISPOSITIONS,
  CONTENT_GAP_REASONS,
  DIRECT_RESPONSE_ELEMENTS,
  QC_LAYERS,
  QC_STATES,
  QUESTION_CLASSES,
  SOURCE_QUALITY_CLASSES,
  VISUALIZATION_REQUIREMENTS,
} from "./constants";

export type QuestionClass = (typeof QUESTION_CLASSES)[number];
export type ContentDisposition = (typeof CONTENT_DISPOSITIONS)[number];
export type SourceQualityClass = (typeof SOURCE_QUALITY_CLASSES)[number];
export type QcLayer = (typeof QC_LAYERS)[number];
export type QcState = (typeof QC_STATES)[number];
export type AdversarialFailReason = (typeof ADVERSARIAL_FAIL_REASONS)[number];
export type ContentGapReason = (typeof CONTENT_GAP_REASONS)[number];
export type DirectResponseElement = (typeof DIRECT_RESPONSE_ELEMENTS)[number];
export type VisualizationRequirement = (typeof VISUALIZATION_REQUIREMENTS)[number];

export type QuestionNode = {
  questionId: string;
  ventureId: string;
  topicId: string;
  question: string;
  normalizedQuestion: string;
  intent: QuestionClass;
  persona: string;
  funnelStage: "AWARENESS" | "CONSIDERATION" | "DECISION" | "VALIDATION";
  commercialRelevance: "HIGH" | "MEDIUM" | "LOW";
  citationOpportunity: "HIGH" | "MEDIUM" | "LOW";
  searchOpportunity: "UNKNOWN" | "GROUNDED_QUERY" | "ACTUAL";
  entityRefs: string[];
  parentQuestionId: string | null;
  relatedQuestionIds: string[];
  recommendedContentDisposition: ContentDisposition;
  evidenceState: "UNGROUNDED" | "SOURCE_BACKED" | "RESEARCH_REFINED";
  answerState: "UNANSWERED" | "SHALLOW" | "ANSWERED" | "DEEP";
  priority: number;
  observedSources: string[];
  createdAt: string;
  updatedAt: string;
  mappedRoute: string | null;
  mappedSection: string | null;
  clusterId: string;
};

export type QuestionKnowledgeGraph = {
  model: "QuestionKnowledgeGraph";
  nodes: QuestionNode[];
  clusters: Array<{ clusterId: string; topic: string; questionIds: string[]; disposition: ContentDisposition }>;
  fabricatedSearchDemand: false;
};

export type QuestionCoverageProfile = {
  model: "QuestionCoverageProfile";
  coverageClaim: "KNOWN_HIGH_CONFIDENCE_QUESTION_COVERAGE";
  completeUniverseClaimed: false;
  knownRelevantQuestions: number;
  answeredQuestions: number;
  deeplyAnsweredQuestions: number;
  sourceGroundedQuestions: number;
  citationReadyQuestions: number;
  schemaSupportedQuestions: number;
  internallyLinkedQuestions: number;
  highCommercialUnanswered: number;
  highCitationUnanswered: number;
  coverageByIntent: Record<string, { known: number; answered: number }>;
  coverageByEntity: Record<string, { known: number; answered: number }>;
  coverageByFunnelStage: Record<string, { known: number; answered: number }>;
  coverageConfidence: "LOW" | "MEDIUM" | "HIGH";
  gscLive: false;
};

export type CitationReadinessProfile = {
  model: "CitationReadinessProfile";
  clearSubject: Gate;
  clearPredicate: Gate;
  explicitEntities: Gate;
  selfContained: Gate;
  factualGrounding: Gate;
  sourceSupport: Gate;
  marketingFluffInAnswer: boolean;
  overall: Gate;
};

export type AnswerChunk = {
  questionId: string;
  pageId: string;
  sectionId: string;
  directAnswer: string;
  supportingContext: string;
  entityRefs: string[];
  sourceRefs: string[];
  internalLinkRefs: string[];
  schemaRef: string | null;
  citationReadiness: CitationReadinessProfile;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type AuthorityContentGap = {
  gapId: string;
  reason: ContentGapReason;
  questionId: string | null;
  route: string | null;
  summary: string;
  priority: number;
};

export type AuthorityRepairPlan = {
  successorRequired: boolean;
  pagesToExpand: string[];
  questionsToAdd: number;
  newDedicatedPagesRecommended: number;
  existingPagesNeedingDeeperSections: number;
  visualizationsNeeded: number;
  sourceResearchNeeded: boolean;
  internalLinkRepairs: number;
  directResponseRepairs: number;
  estimatedCostState: "UNKNOWN" | "NOT_APPLICABLE";
  maxRepairLoops: 2;
  regenerateEntireSite: false;
  targetedRepairRequired: true;
  deployed: false;
};

export type SourceIndependence = {
  model: "SourceIndependence";
  uniqueOrigins: number;
  sameOriginDuplicates: number;
  independentCorroboration: boolean;
  falselyClaimedCorroboration: false;
};

export type PageDepthAssessment = {
  route: string;
  role: string;
  intentComplexity: "HIGH" | "MEDIUM" | "LOW";
  topicComplexity: "HIGH" | "MEDIUM" | "LOW";
  approxWords: number;
  wordCountBand: "CORE_MONEY_PAGE" | "MAJOR_HUB" | "HIGH_VALUE_EDUCATIONAL" | "SUPPORTING_QUESTION" | "UTILITY";
  belowGuidanceBand: boolean;
  explicitDepthJustificationRequired: boolean;
  wordCountHardQuota: false;
  questionCoverage: Gate;
  visualAdequacy: Gate;
  sourceAdequacy: Gate;
  exampleAdequacy: Gate;
  conversionPath: Gate;
  overall: Gate;
};

export type CtaSequencePlan = {
  model: "CTASequencePlan";
  placements: Array<"early CTA" | "mechanism CTA" | "pricing CTA" | "post-objection CTA" | "final CTA">;
  afterEveryParagraph: false;
};

export type ObjectionNode = {
  objectionId: string;
  objection: string;
  sourceClass: "market_research" | "faq" | "pricing" | "workflow" | "risk";
  addressedOn: string[];
};

export type ObjectionKnowledgeGraph = {
  model: "ObjectionKnowledgeGraph";
  nodes: ObjectionNode[];
};

export type PageVisualPlan = {
  model: "PageVisualPlan";
  route: string;
  requirement: VisualizationRequirement;
  warrantedTypes: string[];
  presentTypes: string[];
  adequate: Gate;
};

export type InformationDensityProfile = {
  model: "PageInformationDensityProfile";
  route: string;
  usefulInformationPerViewport: "LOW" | "MEDIUM" | "HIGH";
  excessiveLowInformationEmptySpace: boolean;
  overcrowding: boolean;
  underdevelopment: boolean;
  intentionalWhitespacePreserved: true;
  overall: Gate;
};

export type SectionVarietyAssessment = {
  model: "SectionVarietyGate";
  route: string;
  compositionTypes: string[];
  repetitiveWhiteBoxPattern: boolean;
  overall: Gate;
};

export type SemanticCoverageProfile = {
  model: "SemanticCoverageProfile";
  route: string;
  primaryTopic: string;
  searchIntent: string;
  entityTarget: string;
  pageRole: PageRole | string;
  primaryIntentUnique: boolean;
  keywordStuffing: false;
  supportingEntitiesPresent: string[];
  missingEntities: string[];
  overall: Gate;
};

export type DigitalRealEstateURLArchitecture = {
  model: "DigitalRealEstateURLArchitecture";
  currentFlatRouteConcerns: string[];
  recommendedSilos: string[];
  moneyPages: string[];
  hubs: string[];
  topicClusters: string[];
  personaPages: string[];
  comparisonPages: string[];
  questionClusters: string[];
  conversionPages: string[];
  redirectPlanRequiredIfApplied: true;
  executed: false;
  urlsShortDescriptiveStable: true;
};

export type InternalLinkSufficiency = {
  technicalBrokenLinks: number;
  semanticLinkGaps: number;
  weaklyConnectedPages: number;
  hubQuality: Gate;
  contextualLinking: Gate;
  overall: Gate;
};

export type CompetitiveCoverageProfile = {
  model: "CompetitiveCoverageProfile";
  topic: string;
  referencePages: string[];
  questionCoverageObserved: "BENCHMARK_ONLY";
  entityCoverageObserved: "BENCHMARK_ONLY";
  visualPatternsObserved: string[];
  authoritySignalsObserved: string[];
  coverageGaps: string[];
  infinityDifferentiationOpportunities: string[];
  copiedProse: false;
  clonedComposition: false;
  plagiarism: false;
};

export type PublishabilityReview = {
  model: "PUBLISHABILITY_REVIEW";
  route: string;
  wouldCompeteWithStrongPages: Gate;
  fullyAnswersPrimaryIntent: Gate;
  feelsThin: boolean;
  feelsGeneric: boolean;
  feelsObviouslyAiGenerated: boolean;
  enoughExamples: Gate;
  enoughVisualExplanation: Gate;
  enoughSourceSupport: Gate;
  handlesObjections: Gate;
  coherentConversionPath: Gate;
  fulfillsIntendedPattern: Gate;
  seriousOwnerWouldPublish: Gate;
  hardFailReasons: AdversarialFailReason[];
  warningReasons: string[];
  overall: QcState;
};

export type LayeredQcResult = {
  layer: QcLayer;
  state: QcState;
  hardFails: string[];
  warnings: string[];
};

export type CrePageAuditRow = {
  route: string;
  role: string;
  approxWords: number;
  questionCoverage: Gate;
  depth: Gate;
  visualAdequacy: Gate;
  sourceAdequacy: Gate;
  directResponseAdequacy: Gate | "NOT_APPLICABLE";
  answerAuthority: Gate;
  publishability: Gate;
  primaryFailReasons: string[];
};

export type HomepageDimensionAudit = {
  longFormDepth: Gate;
  problemFraming: Gate;
  mechanism: Gate;
  productVisualization: Gate;
  benefits: Gate;
  useCases: Gate;
  objections: Gate;
  pricing: Gate;
  faq: Gate;
  ctaSequence: Gate;
  authorityLinks: Gate;
  overall: Gate;
};

export type NpvDimensionAudit = {
  directAnswer: Gate;
  formulaExplanation: Gate;
  workedExample: Gate;
  cashFlowTiming: Gate;
  discountRate: Gate;
  tenantImprovement: Gate;
  freeRent: Gate;
  cam: Gate;
  escalations: Gate;
  differentLeaseTerms: Gate;
  limitations: Gate;
  brokerWorkflow: Gate;
  commonMistakes: Gate;
  relatedQuestions: Gate;
  sources: Gate;
  visualizations: Gate;
  internalLinks: Gate;
  overall: Gate;
};

export type HubDimensionAudit = {
  topicOverview: Gate;
  spokeCoverage: Gate;
  questionNavigation: Gate;
  authorityDepth: Gate;
  visualStructure: Gate;
  conversionPath: Gate;
  overall: Gate;
};
