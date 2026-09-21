import type {
  AUTHORITY_GENERATION_FLOW,
  COMPLIANCE_STATES,
  COVERAGE_DECISIONS,
  DEFAULT_AVOIDED_SOURCE_CLASSES,
  PREFERRED_AUTHORITY_SOURCE_CLASSES,
  PUBLIC_PAGE_ARCHETYPES,
  PUBLIC_SITE_CLASSES,
  QUESTION_TYPES,
  SEARCH_DEMAND_CLASSES,
  SEARCH_EVIDENCE_CLASSES,
  SEARCH_INTENTS,
  TOPIC_COVERAGE_STATES,
  TOPICAL_COVERAGE_DIMENSIONS,
  VISUAL_EVIDENCE_PRECEDENCE,
} from "./constants";

export type Gate = "PASS" | "FAIL";
export type PublicSiteClass = (typeof PUBLIC_SITE_CLASSES)[number];
export type PublicPageArchetype = (typeof PUBLIC_PAGE_ARCHETYPES)[number];
export type SearchIntent = (typeof SEARCH_INTENTS)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type SearchEvidenceClass = (typeof SEARCH_EVIDENCE_CLASSES)[number];
export type SearchDemandClass = (typeof SEARCH_DEMAND_CLASSES)[number];
export type CoverageDecision = (typeof COVERAGE_DECISIONS)[number];
export type TopicCoverageState = (typeof TOPIC_COVERAGE_STATES)[number];
export type ComplianceState = (typeof COMPLIANCE_STATES)[number];
export type VisualEvidenceLayer = (typeof VISUAL_EVIDENCE_PRECEDENCE)[number];
export type AuthorityGenerationStep = (typeof AUTHORITY_GENERATION_FLOW)[number];
export type PreferredSourceClass = (typeof PREFERRED_AUTHORITY_SOURCE_CLASSES)[number];
export type AvoidedSourceClass = (typeof DEFAULT_AVOIDED_SOURCE_CLASSES)[number];
export type TopicalCoverageDimension = (typeof TOPICAL_COVERAGE_DIMENSIONS)[number];
export type FunnelStage = "AWARENESS" | "CONSIDERATION" | "DECISION" | "VALIDATION";

export type SearchQuestionEvidence = {
  model: "SearchQuestionEvidence";
  evidenceClass: SearchEvidenceClass;
  demandClass: SearchDemandClass;
  monthlyVolume: number | null;
  rankingDifficulty: number | null;
  trafficEstimate: number | null;
  cpc: number | null;
  trend: number | null;
  fabricatedSearchVolume: false;
  unknownIsNotZero: true;
  source: string;
  retrievedAt: string;
  observedPhrasing: string;
};

export type AuthorityQuestionNode = {
  questionId: string;
  canonicalQuestion: string;
  observedPhrasing: string;
  alternatePhrasings: string[];
  normalizedQuestion: string;
  primaryTopic: string;
  secondaryTopics: string[];
  searchEvidence: SearchQuestionEvidence;
  searchIntent: SearchIntent;
  questionType: QuestionType;
  funnelStage: FunnelStage;
  persona: string;
  commercialRelevance: "HIGH" | "MEDIUM" | "LOW";
  semanticCentrality: "HIGH" | "MEDIUM" | "LOW";
  standaloneEligible: boolean;
  answerChunkEligible: boolean;
  parentHub: string;
  relatedQuestions: string[];
  prerequisiteQuestions: string[];
  deeperFollowUpQuestions: string[];
  comparisonRelationships: string[];
  productWorkflowRelationships: string[];
  citationNeeds: string[];
  ctaIntent: SearchIntent;
  clusterId: string;
  dedupeProvenance: string;
  decision: CoverageDecision;
};

export type PublicQuestionKnowledgeGraph = {
  model: "QuestionKnowledgeGraph";
  nodes: AuthorityQuestionNode[];
  clusters: Array<{
    clusterId: string;
    canonicalQuestion: string;
    alternatePhrasings: string[];
    primaryTopic: string;
    secondaryTopics: string[];
    primaryRoute: string | null;
    questionIds: string[];
  }>;
  fabricatedSearchDemand: false;
};

export type AuthorityContentGap = {
  model: "AuthorityContentGap";
  gapId: string;
  question: string;
  topic: string;
  decision: CoverageDecision;
  reason: string;
  searchEvidence: SearchEvidenceClass;
  priority: "HIGH" | "MEDIUM" | "LOW";
  semanticRelationships: string[];
  commercialRelevance: "HIGH" | "MEDIUM" | "LOW";
};

export type PublicAuthorityPageContract = {
  model: "PublicAuthorityPageContract";
  pageArchetype: PublicPageArchetype;
  primaryTopic: string;
  primaryQuestion: string;
  secondaryQuestions: string[];
  searchIntent: SearchIntent;
  funnelStage: FunnelStage;
  targetPersona: string;
  readabilityProfile: {
    target: "approximately 4th grade";
    activeVoice: true;
    maxParagraphWords: 150;
    jargonMustBeExplained: true;
    keywordStuffingRejected: true;
  };
  questionCoverageProfile: {
    primaryQuestionRequired: true;
    secondarySurfaces: number;
  };
  semanticCoverageProfile: {
    requiredDimensions: TopicalCoverageDimension[];
  };
  answerSurfaceProfile: {
    minAnswerChunks: number;
    variantChunksRejected: true;
  };
  citationReadinessProfile: {
    contextualCitationsRequired: boolean;
    sourceDumpOnlyRejected: true;
  };
  internalLinkProfile: {
    parentHubRequired: boolean;
    bodyContextRequired: boolean;
    suggestedContextualRange: [number, number] | null;
    countIsNotABlindQuota: true;
  };
  visualPlan: {
    aboveFoldMeaningfulVisual: boolean;
    cssOnlyRejected: true;
    family: string;
  };
  conversionPath: {
    searchIntent: SearchIntent;
    steps: string[];
    transactionalForcedOnInformational: false;
  };
  schemaProfile: string[];
  responsiveLayoutProfile: {
    viewports: [1280, 1440, 390];
    overflowRejected: true;
  };
  authoritySourcePolicy: {
    preferred: PreferredSourceClass[];
    avoided: AvoidedSourceClass[];
  };
  publishabilityProfile: {
    premiumRequiresAllHardGates: true;
  };
  searchDemandEvidence: SearchQuestionEvidence | null;
  topicGraphRelationships: string[];
  commercialPathRelationships: string[];
  pageDepthPolicy: {
    minUsefulWords: number | null;
    paddingRejected: true;
  };
  visualCoveragePolicy: {
    qualifyingArchetype: boolean;
  };
  renderedQualityProfile: {
    composition: true;
    tables: true;
    deadSpace: true;
    textWall: true;
  };
};

export type PublicAuthoritySiteProfile = {
  model: "PublicAuthoritySiteProfile";
  ventureId: string;
  industry: string;
  market: string;
  siteClass: PublicSiteClass;
  audiences: string[];
  topicTaxonomy: string[];
  hubArchitecture: Array<{ topic: string; hubRoute: string }>;
  questionKnowledgeGraph: PublicQuestionKnowledgeGraph;
  minimumValidatedQuestionsPerCoreTopic: 20;
  urlConventions: { authorityPattern: string; flatQuestionPagesRejected: true };
  internalLinkStrategy: string;
  authoritySourcePolicy: {
    preferred: PreferredSourceClass[];
    avoided: AvoidedSourceClass[];
    industryAuthorities: string[];
  };
  schemaPolicy: string;
  readabilityPolicy: { target: "approximately 4th grade" };
  contentDepthPolicy: { standaloneMinUsefulWords: 2000; paddingRejected: true };
  visualLanguage: string;
  visualAssetStrategy: {
    families: string[];
    reuseLimits: string;
    altTextPolicy: string;
    performanceRules: string;
  };
  ctaStrategy: string;
  commercialPathway: string[];
  pageArchetypesEnabled: PublicPageArchetype[];
  legalConstraints: string[];
  citationPolicy: string;
  searchResearchPolicy: { researchBeforeScale: true; fabricatedVolumeRejected: true };
  topicalCompletenessPolicy: { coverageNotPageCount: true; qualifiedStandaloneTarget?: 10 };
  sectionSurfacePolicy?: {
    variants: readonly string[];
    mechanicalStripingRejected: true;
    allWhiteMonotonyRejected: true;
  };
  publishabilityRequirements: string[];
  standardOverrides: PublicAuthorityStandardOverride[];
  widthProfile?: {
    pageShellMaxWidth: number;
    authoritySectionMaxWidth: number;
    proseMaxWidth: number;
    wideModuleMaxWidth: number;
    fullBleedAllowed: boolean;
    desktopOuterGutter: number;
    mobileOuterGutter: number;
    breakoutEligibility: string[];
  };
};

export type PublicPageArchetypeDefinition = {
  archetype: PublicPageArchetype;
  inheritsGlobalContract: true;
  contentDepth: "BRIEF" | "STANDARD" | "DEEP";
  requiredVisualTypes: string[];
  minAnswerSurfaces: number;
  ctaStructure: string[];
  schema: string[];
  defaultSearchIntent: SearchIntent;
  conversionPath: string[];
  linkingRequirements: string[];
  outcomes: string[];
};

export type PublicAuthorityStandardOverride = {
  model: "PublicAuthorityStandardOverride";
  overrideId: string;
  ventureId: string;
  scope: { page?: string; pageClass?: string; siteWide?: boolean };
  standardOrGate: string;
  originalRequirement: string;
  replacementRequirement: string;
  reason: string;
  authority: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  traceability: string;
  reviewState: "ACTIVE" | "EXPIRED" | "PENDING_REVIEW";
};

export type InfinityPublicAuthorityStandard = {
  model: "InfinityPublicAuthorityStandard";
  version: "V1";
  principle: string;
  globalMinimums: typeof import("./constants").LOCKED_QUALITY_FLOORS;
  defaultPolicies: {
    urlPattern: string;
    sourcePreference: PreferredSourceClass[];
    sourceAvoidance: AvoidedSourceClass[];
    visualEvidencePrecedence: VisualEvidenceLayer[];
    researchBeforeScale: true;
    boundedGeneration: true;
  };
  requiredProfiles: ["PublicAuthoritySiteProfile", "PublicAuthorityPageContract", "PageVisualPlan"];
  requiredGates: readonly string[];
  allowedAdaptation: string[];
  overrideRules: {
    adHocBypass: false;
    silentWeakening: false;
    overrideModel: "PublicAuthorityStandardOverride";
  };
  publishabilityRequirements: {
    premiumState: "PREMIUM_AUTHORITY_VALIDATION_READY";
    allApplicableHardGates: true;
  };
  researchRequirements: {
    minValidatedQuestionsPerCoreTopic: 20;
    coverageIsNotPageCount: true;
    unknownVolumeIsNotZero: true;
  };
  renderedValidationRequirements: {
    founderEvidenceOutranksAutomation: true;
  };
  pageTemplatesAreArchetypes: true;
};
