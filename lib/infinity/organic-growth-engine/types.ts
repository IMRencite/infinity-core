import type {
  CannibalizationAction,
  CannibalizationLevel,
  ClaimType,
  EvidenceConfidenceLevel,
  ExpansionWave,
  FollowUpAssignment,
  GraphRelationshipType,
  HitlNecessityLevel,
  HumanContributionStatus,
  InternalLinkRelationship,
  NeighborhoodDecision,
  OrganicViabilityRecommendation,
  PageDecision,
  PageType,
  PlanningBand,
  ResourceDepthClassification,
  ThinContentDecision,
  UrlLifecycleStatus,
} from "./constants";

export type SourceLineage = {
  companyBuilderRunId?: string | null;
  ventureBlueprintId?: string | null;
  companyBuilderBuildPackageId?: string | null;
  ventureSelectionHandoffId?: string | null;
  opportunityCandidateId?: string | null;
  monetizationRunId?: string | null;
  organicGrowthRunId?: string | null;
  capabilityTest?: boolean;
  inputMode?: "blueprint" | "simulation";
};

export type VentureOrganicContext = {
  ventureId: string;
  ventureName: string;
  domain?: string;
  businessSummary: string;
  targetCustomer: string;
  problem: string;
  solution: string;
  primaryMonetizationModel: string;
  distributionStrategy: string;
  customerLifetimeValue?: number | null;
  averageOrderValue?: number | null;
  conversionRateEstimate?: number | null;
  ventureType: string;
  secondaryVentureTypes?: string[];
  economicTargets?: Record<string, number | null>;
  budgetEnvelope?: Record<string, number | null>;
  acquisitionArchitecture?: {
    primaryChannel?: string;
    channels?: Array<{ channel: string; role?: string }>;
  } | null;
  contentArchitecture?: Record<string, unknown> | null;
  existingSite?: ExistingSiteInventory | null;
};

export type ExistingSiteInventory = {
  domain: string;
  publishedUrls: Array<{
    url: string;
    pageType?: string;
    title?: string;
    status: UrlLifecycleStatus;
  }>;
  reservedRoutes?: string[];
};

export type OrganicChannelViabilityInput = {
  searchDemand: number;
  aiAnswerDemand: number;
  commercialIntent: number;
  customerValue: number;
  customerLifetimeValue: number;
  conversionPotential: number;
  serpCompetition: number;
  answerEngineCompetition: number;
  contentProductionCost: number;
  researchCost: number;
  authorityRequirements: number;
  timeToSignal: number;
  timeToRevenue: number;
  topicDepth: number;
  entityDepth: number;
  geographicDepth: number;
  questionDepth: number;
  comparisonDepth: number;
  programmaticOpportunity: number;
  contentDifferentiation: number;
  evidenceAvailability: number;
  brandRelevance: number;
  maintenanceRequirements: number;
  crawlIndexability: number;
  expectedMarginalPageValue: number;
  citationOpportunity: number;
  firstPartyInformationOpportunity: number;
};

export type OrganicChannelViability = {
  organicViabilityScore: number;
  recommendation: OrganicViabilityRecommendation;
  rationale: string[];
  inputSignals: OrganicChannelViabilityInput;
  organicAcquisitionRecommended: boolean;
};

export type SearchAnswerNode = {
  nodeId: string;
  nodeType:
    | "entity"
    | "topic"
    | "subtopic"
    | "question"
    | "problem"
    | "service"
    | "product"
    | "category"
    | "route"
    | "feature"
    | "location"
    | "region"
    | "city"
    | "neighborhood"
    | "use_case"
    | "comparison"
    | "alternative"
    | "buyer_stage"
    | "intent";
  label: string;
  entityType?: string;
  evidenceConfidence: EvidenceConfidenceLevel;
  metadata?: Record<string, unknown>;
};

export type SearchAnswerEdge = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: GraphRelationshipType;
  weight?: number;
  evidenceConfidence: EvidenceConfidenceLevel;
};

export type SearchAnswerOpportunityGraph = {
  ventureId: string;
  nodes: SearchAnswerNode[];
  edges: SearchAnswerEdge[];
};

export type DemandSignal = {
  level: number;
  evidenceConfidence: EvidenceConfidenceLevel;
  notes?: string;
};

export type PageOpportunity = {
  pageOpportunityId: string;
  ventureId: string;
  pageType: PageType;
  primaryEntity: string;
  secondaryEntities: string[];
  primaryIntent: string;
  secondaryIntents: string[];
  buyerStage: string;
  proposedTopic: string;
  proposedPurpose: string;
  commercialRelationship: string;
  conversionRelationship: string;
  authorityRelationship: string;
  searchDemandSignal: DemandSignal;
  aiAnswerDemandSignal: DemandSignal;
  uniquenessPotential: number;
  evidenceAvailability: number;
  contentDepthPotential: number;
  citationPotential: number;
  programmaticPotential: number;
  estimatedProductionCost: number;
  estimatedResearchCost: number;
  estimatedMaintenanceCost: number;
  estimatedTrafficPotential: number;
  estimatedConversionPotential: number;
  estimatedRevenueContribution: number;
  cannibalizationRisk: number;
  thinContentRisk: number;
  crawlValue: number;
  confidence: number;
  parentEntityId?: string;
  geographicContext?: {
    city?: string;
    neighborhood?: string;
    region?: string;
    country?: string;
  };
};

export type PageOpportunityScore = {
  pageOpportunityId: string;
  score: number;
  weightedBreakdown: Record<string, number>;
  scoringVersion: string;
};

export type PageDecisionRecord = {
  pageOpportunityId: string;
  decision: PageDecision;
  reason: string;
  cannibalizationLevel?: CannibalizationLevel;
  cannibalizationAction?: CannibalizationAction;
  thinContentDecision?: ThinContentDecision;
  neighborhoodDecision?: NeighborhoodDecision;
};

export type DigitalRealEstateExpansionAssessment = {
  addressableUniqueIntents: number;
  entityCount: number;
  topicDepth: number;
  questionDepth: number;
  geographicDimensions: number;
  productServiceDimensions: number;
  comparisonDimensions: number;
  programmaticFeasibility: number;
  contentUniqueness: number;
  conversionValue: number;
  customerLifetimeValue: number;
  authorityCompounding: number;
  internalLinkCompounding: number;
  aiAnswerOpportunity: number;
  citationOpportunity: number;
  maintenanceCost: number;
  productionCost: number;
  researchCost: number;
  indexingConstraints: number;
  expectedMarginalPageValue: number;
};

export type DigitalRealEstateExpansionScore = {
  score: number;
  planningBand: PlanningBand;
  initialArchitectureRecommendation: string;
  longTermExpansionPotential: string;
  assessment: DigitalRealEstateExpansionAssessment;
};

export type MarginalPageEconomics = {
  pageOpportunityId: string;
  productionCost: number;
  researchCost: number;
  maintenanceCost: number;
  expectedTraffic: number;
  expectedConversionRate: number;
  valuePerConversion: number;
  expectedRevenue: number;
  expectedGrossProfit: number;
  expectedPaybackPeriod: number;
  authorityContribution: number;
  citationContribution: number;
  expectedPageValue: number;
  marginalExpansionValue: number;
};

export type SiteTopicPage = {
  pageOpportunityId: string;
  role: "hub" | "sub_hub" | "spoke" | "question_spoke" | "commercial_spoke" | "geographic_spoke" | "product_spoke" | "comparison_spoke" | "supporting_resource";
  parentPageId?: string;
  childrenPageIds: string[];
  siblingPageIds: string[];
  relatedPageIds: string[];
  conversionDestination?: string;
  authorityRole: string;
};

export type SiteTopicArchitecture = {
  ventureId: string;
  rootTopics: string[];
  pages: SiteTopicPage[];
};

export type CanonicalUrlEntry = {
  url: string;
  pageOpportunityId: string;
  slug: string;
  status: UrlLifecycleStatus;
  canonicalTo?: string;
  breadcrumbPath: string[];
};

export type CanonicalURLRegistry = {
  domain: string;
  entries: CanonicalUrlEntry[];
  reservedRoutes: string[];
};

export type InternalLinkRecommendation = {
  sourcePageId: string;
  targetPageId: string;
  targetUrl: string;
  relationship: InternalLinkRelationship;
  anchorIntent: string;
  reason: string;
  priority: number;
};

export type InternalLinkGraph = {
  links: InternalLinkRecommendation[];
  orphanPageIds: string[];
  weakHubPageIds: string[];
  overlinkedPageIds: string[];
  underlinkedPageIds: string[];
  organicAuthorityGraphScore: number;
};

export type SiteEntity = {
  entityId: string;
  entityType: string;
  label: string;
  canonicalUrl?: string;
  canonicalAtId?: string;
  properties: Record<string, unknown>;
  sourceConfidence: EvidenceConfidenceLevel;
  relationships: Array<{
    targetEntityId: string;
    relationship: string;
  }>;
};

export type SiteEntityGraph = {
  domain: string;
  entities: SiteEntity[];
};

export type SchemaRecommendation = {
  pageOpportunityId: string;
  schemaTypes: string[];
  entityReferences: string[];
  fields: Record<string, unknown>;
  rationale: string;
  requirementsSatisfied: boolean;
};

export type OrganicContentContract = {
  pageOpportunityId: string;
  primaryQueryIntent: string;
  primaryAnswerIntent: string;
  primaryEntity: string;
  supportingEntities: string[];
  titleIntent: string;
  h1Intent: string;
  directAnswerRequired: boolean;
  directAnswerTargetLength?: number;
  sections: Array<{ heading: string; purpose: string }>;
  questionsAnswered: string[];
  evidenceRequirements: string[];
  authoritySourceRequirements: string[];
  internalLinkRequirements: string[];
  conversionGoal: string;
  schemaRequirements: string[];
  freshnessRequirement?: string;
  resourceDepth: ResourceDepthClassification;
};

export type TopicCoverageMap = {
  pageOpportunityId: string;
  primaryTopic: string;
  userNeed: string;
  relatedQuestions: string[];
  entitiesToExplain: string[];
  attributesThatMatter: string[];
  terminologyToDefine: string[];
  comparisonsNeeded: string[];
  decisionsReaderMustMake: string[];
  risksAndMistakes: string[];
  implementationInformation: string[];
  evidenceRequired: string[];
  factualClaimsRequiringSources: string[];
  expertKnowledgeNeeded: string[];
  followUpQuestions: Array<{ question: string; assignment: FollowUpAssignment }>;
  coverageComplete: boolean;
};

export type InformationGainPlan = {
  pageOpportunityId: string;
  informationGainTypes: string[];
  contributionSummary: string;
  meaningfulGainEstablished: boolean;
  mergeTargetPageId?: string;
};

export type EvidencePlan = {
  pageOpportunityId: string;
  claimsRequiringEvidence: Array<{
    claim: string;
    preferredSourceTypes: string[];
    section: string;
  }>;
  sourceHierarchy: string[];
};

export type ClaimGraphEntry = {
  claimId: string;
  pageId: string;
  statement: string;
  claimType: ClaimType;
  importance: number;
  sourceRequired: boolean;
  sources: Array<{
    url?: string;
    title?: string;
    sourceType: string;
    retrievedAt?: string;
    evidenceConfidence: EvidenceConfidenceLevel;
  }>;
  confidence: number;
  freshness?: string;
  lastVerifiedAt?: string;
};

export type ClaimGraph = {
  pageOpportunityId: string;
  claims: ClaimGraphEntry[];
};

export type ThinContentRiskAssessment = {
  pageOpportunityId: string;
  thinContentRiskScore: number;
  standalonePageValueScore: number;
  decision: ThinContentDecision;
  reasons: string[];
};

export type CitationWorthinessScore = {
  pageOpportunityId: string;
  score: number;
  factors: Record<string, number>;
  definitiveResourceCandidate: boolean;
};

export type ContentCompletenessScore = {
  pageOpportunityId: string;
  score: number;
  decision: "PASS" | "EXPAND" | "MERGE" | "REJECT";
  gaps: string[];
};

export type NeighborhoodPageViability = {
  pageOpportunityId: string;
  neighborhood: string;
  city: string;
  score: number;
  decision: NeighborhoodDecision;
  reasons: string[];
};

export type NeighborhoodInformationGainPlan = {
  pageOpportunityId: string;
  neighborhood: string;
  city: string;
  localInformationGain: string[];
  verifiedLocalEvidence: string[];
  localEntities: string[];
  meaningfulGainEstablished: boolean;
};

export type EEATReadiness = {
  pageOpportunityId: string;
  experience: { strengths: string[]; gaps: string[] };
  expertise: { strengths: string[]; gaps: string[] };
  authoritativeness: { strengths: string[]; gaps: string[] };
  trust: { strengths: string[]; gaps: string[] };
};

export type HumanExpertiseContributionPlan = {
  pageOpportunityId: string;
  necessityLevel: HitlNecessityLevel;
  contributionTypes: string[];
  reason: string;
  publicationBlocking: boolean;
};

export type HumanContributionRequest = {
  requestId: string;
  ventureId: string;
  pageId: string;
  contributionType: string;
  reason: string;
  questions: string[];
  requestedEvidence: string[];
  requestedExpertise?: string;
  requiredCredentialsIfApplicable?: string;
  priority: number;
  publicationBlocking: boolean;
  status: HumanContributionStatus;
  createdAt: string;
  receivedAt?: string;
  contributorReference?: string;
  provenanceReference?: string;
  supportedClaims?: string[];
  verificationStatus?: "UNVERIFIED" | "VERIFIED" | "REJECTED";
};

export type SiteMapPlanEntry = {
  pageOpportunityId: string;
  url: string;
  pageType: PageType;
  status: UrlLifecycleStatus;
  priority: number;
  parentPageId?: string;
  childrenPageIds: string[];
  schemaTypes: string[];
  generationOrder: number;
  expansionWave: ExpansionWave;
  freshnessRequirement?: string;
};

export type SiteMapPlan = {
  ventureId: string;
  entries: SiteMapPlanEntry[];
  clusterCount: number;
};

export type AdversarialReviewFinding = {
  severity: "info" | "warning" | "critical";
  category: string;
  message: string;
  pageOpportunityId?: string;
  blocksExpansion: boolean;
};

export type OrganicGrowthBuildPackage = {
  packageVersion: string;
  ventureId: string;
  status: "READY" | "BLOCKED" | "PARTIAL";
  organicChannelViability: OrganicChannelViability;
  searchAnswerOpportunityGraph: SearchAnswerOpportunityGraph;
  approvedPageOpportunities: PageOpportunity[];
  pageDecisions: PageDecisionRecord[];
  siteTopicArchitecture: SiteTopicArchitecture;
  canonicalUrlRegistry: CanonicalURLRegistry;
  internalLinkGraph: InternalLinkGraph;
  siteEntityGraph: SiteEntityGraph;
  schemaRecommendations: SchemaRecommendation[];
  organicContentContracts: OrganicContentContract[];
  topicCoverageMaps: TopicCoverageMap[];
  informationGainPlans: InformationGainPlan[];
  evidencePlans: EvidencePlan[];
  claimGraphs: ClaimGraph[];
  contentCompletenessRequirements: ContentCompletenessScore[];
  citationWorthinessRequirements: CitationWorthinessScore[];
  neighborhoodInformationGainPlans: NeighborhoodInformationGainPlan[];
  eeatReadiness: EEATReadiness[];
  humanExpertiseContributionPlans: HumanExpertiseContributionPlan[];
  humanContributionRequests: HumanContributionRequest[];
  siteMapPlan: SiteMapPlan;
  digitalRealEstateExpansion: DigitalRealEstateExpansionScore;
  marginalPageEconomics: MarginalPageEconomics[];
  expansionWaves: Record<ExpansionWave, string[]>;
  economicConstraints: Record<string, number | null>;
  generationPriorities: string[];
  qualityRequirements: string[];
  expansionStrategy: string;
  adversarialReviewFindings: AdversarialReviewFinding[];
  sourceLineage: SourceLineage;
  blockedReasons: string[];
  feedbackReadyMetrics?: FeedbackReadyMetricsContract[];
  clusterEconomics?: { expectedClusterValue: number; marginalExpansionValue: number };
  economicsProvenance?: Record<string, EconomicsValueSource>;
  organicAuthorityGraph?: OrganicAuthorityGraph;
};

export type OrganicGrowthEngineReport = {
  engineVersion: string;
  venturesProcessed: number;
  organicViability: Record<string, OrganicChannelViability>;
  opportunityGraphStats: Record<string, { nodes: number; edges: number }>;
  digitalRealEstate: Record<
    string,
    {
      rawOpportunities: number;
      deduplicatedOpportunities: number;
      create: number;
      merge: number;
      defer: number;
      reject: number;
      thinContentFailures: number;
      informationGainFailures: number;
      evidenceFailures: number;
      citationWorthinessFailures: number;
      initialGenerationWave: number;
    }
  >;
  contentDepth: Record<string, Record<ResourceDepthClassification, number>>;
  topicCoverageMapsGenerated: number;
  informationGainPlansGenerated: number;
  evidencePlansGenerated: number;
  claimGraphsGenerated: number;
  citationWorthinessScores: number;
  eeatReadinessAssessments: number;
  hitlClassification: Record<HitlNecessityLevel, number>;
  cityNeighborhood: {
    citiesEvaluated: number;
    neighborhoodsEvaluated: number;
    create: number;
    mergeIntoCityPage: number;
    supportingSection: number;
    defer: number;
    reject: number;
  };
  urlArchitecture: {
    urlsAssigned: number;
    collisionsPrevented: number;
    invalidLinkTargets: number;
  };
  internalLinks: { edges: number; orphans: number; invalidTargets: number };
  schema: { recommendations: number; localBusinessFabricated: number };
  buildPackagesCreated: number;
  autonomyBoundary: {
    pagesPublished: 0;
    publicDeployments: 0;
    realWebsitesModified: 0;
    purchases: 0;
    externalMutations: 0;
  };
};

export type RunOrganicGrowthEngineInput = {
  organizationId: string;
  idempotencyKey: string;
  simulationOnly?: boolean;
  ventureContexts?: VentureOrganicContext[];
  companyBuilderBlueprintIds?: string[];
  companyBuilderBuildPackageIds?: string[];
  ventureSelectionHandoffIds?: string[];
  capabilityTest?: boolean;
  enableGroundedResearch?: boolean;
};

export type EconomicsValueSource = "MONETIZATION_PLAN" | "VENTURE_CONTEXT" | "DERIVED_ESTIMATE";

export type ResolvedMonetizationEconomics = {
  customerLifetimeValue: number;
  averageOrderValue: number;
  conversionRateEstimate: number;
  grossMarginPercent: number;
  minMarginalPageValue: number;
  sources: Record<string, EconomicsValueSource>;
  monetizationPlanId?: string | null;
  opportunityCandidateId?: string | null;
};

export type UpstreamOrganicInput = {
  context: VentureOrganicContext;
  sourceLineage: SourceLineage;
  economics: ResolvedMonetizationEconomics;
};

export type FeedbackReadyMetricsContract = {
  pageOpportunityId: string;
  canonicalUrl: string;
  metricSlots: Array<
    | "indexation"
    | "impressions"
    | "clicks"
    | "rank"
    | "ai_citations"
    | "sessions"
    | "leads"
    | "conversions"
    | "revenue"
    | "assisted_conversions"
    | "backlinks"
    | "claim_freshness"
  >;
  baselineRecorded: false;
};

export type GeneratedOrganicPageArtifact = {
  pageOpportunityId: string;
  canonicalUrl: string;
  title: string;
  bodyText: string;
  sections: Array<{ heading: string; body: string }>;
  internalLinks: Array<{ targetUrl: string; anchor: string }>;
  schemaTypes: string[];
  claims: Array<{ statement: string; sourceUrl?: string; fabricated?: boolean }>;
};

export type PostGenerationGateOutcome = "PASS" | "REPAIR" | "BLOCK_ARTIFACT";

export type PostGenerationGateResult = {
  pageOpportunityId: string;
  outcome: PostGenerationGateOutcome;
  failures: string[];
};

export type PostGenerationRepairAction = {
  action:
    | "REWRITE_SECTION"
    | "REGENERATE_ARTIFACT"
    | "REPAIR_LINKS"
    | "REPAIR_SCHEMA"
    | "EXPAND_CONTENT"
    | "REQUEST_EVIDENCE"
    | "REQUEST_HUMAN_CONTRIBUTION"
    | "BLOCK_PUBLICATION";
  reason: string;
  targetSection?: string;
};

export type PostGenerationRepairResult = {
  pageOpportunityId: string;
  initialOutcome: PostGenerationGateOutcome;
  finalOutcome: PostGenerationGateOutcome;
  repairsAttempted: number;
  actions: PostGenerationRepairAction[];
  artifact: GeneratedOrganicPageArtifact;
  revalidationFailures?: string[];
};

export type OrganicAuthorityNode = {
  pageOpportunityId: string;
  role: string;
  authorityWeight: number;
  inboundLinkCount: number;
  outboundLinkCount: number;
  parentPageId?: string;
  coverageGap: boolean;
  priorityScore: number;
};

export type OrganicAuthorityGraph = {
  ventureId: string;
  hubPageIds: string[];
  nodes: OrganicAuthorityNode[];
  coverageGaps: string[];
  authorityFlowEdges: Array<{
    sourcePageId: string;
    targetPageId: string;
    relationship: string;
    priority: number;
  }>;
};

export type OrganicPipelineRunResult = {
  organicGrowthRunId: string;
  organicGrowthBuildPackageId: string;
  ventureId: string;
  sourceLineage: SourceLineage;
  pabHandoff: OrganicPabHandoffResult;
  repairResults: PostGenerationRepairResult[];
  postGenerationSummary: { pass: number; repair: number; blocked: number };
  inputMode: "LIVE" | "MOCK" | "SIMULATION";
};

export type OrganicPabHandoffResult = {
  featureContracts: Array<{ featureId: string; featureName: string; pageOpportunityId: string }>;
  codingTasks: Array<{ taskId: string; pageOpportunityId: string; objective: string }>;
  traceabilityLinks: Array<{ linkType: string; sourceRef: string; targetRef: string }>;
  generatedArtifacts: GeneratedOrganicPageArtifact[];
  postGenerationResults: PostGenerationGateResult[];
  repairResults?: PostGenerationRepairResult[];
};

export type { ExpansionWave, ResourceDepthClassification } from "./constants";

export type RunOrganicGrowthEngineOutput = {
  ok: boolean;
  organicGrowthRunId: string;
  report: OrganicGrowthEngineReport;
  buildPackages: OrganicGrowthBuildPackage[];
};

export type OrganicGrowthRunRecord = {
  id: string;
  organization_id: string;
  status: string;
  engine_version: string;
  engine_report: OrganicGrowthEngineReport | null;
  idempotency_key: string;
  correlation_id: string;
};
