import type { BrandMediaProfile } from "@/lib/infinity/creative-media-engine/types";
import type { CreativeAssetPlan, QualityTarget, VentureDesignTokens } from "@/lib/infinity/public-venture-design/types";
import type {
  CTA_STRENGTHS,
  FUNNEL_STAGES,
  GRAPH_EDGE_TYPES,
  OPPORTUNITY_STATUSES,
  PAGE_INTENTS,
  PAGE_ROLES,
  SCHEMA_TYPES,
  SEARCH_VOLUME_STATES,
  SITE_AI_ROLES,
} from "./constants";

export type PageRole = (typeof PAGE_ROLES)[number];
export type PageIntent = (typeof PAGE_INTENTS)[number];
export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type SearchVolumeState = (typeof SEARCH_VOLUME_STATES)[number];
export type GraphEdgeType = (typeof GRAPH_EDGE_TYPES)[number];
export type SchemaType = (typeof SCHEMA_TYPES)[number];
export type SiteAiRole = (typeof SITE_AI_ROLES)[number];
export type CtaStrength = (typeof CTA_STRENGTHS)[number];
export type Gate = "PASS" | "FAIL";

export type SearchOpportunity = {
  query: string;
  volumeState: SearchVolumeState;
  volume: number | null;
  relevance: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
};

export type GeoOpportunity = {
  question: string;
  answerability: "HIGH" | "MEDIUM" | "LOW";
  entityFocus: string;
  volumeState: SearchVolumeState;
};

export type PageOpportunity = {
  pageOpportunityId: string;
  ventureId: string;
  topic: string;
  primaryIntent: PageIntent;
  secondaryIntent: PageIntent | null;
  persona: string;
  funnelStage: FunnelStage;
  parentTopic: string | null;
  recommendedPageType: PageRole;
  searchOpportunity: SearchOpportunity;
  geoOpportunity: GeoOpportunity;
  commercialValue: "HIGH" | "MEDIUM" | "LOW";
  informationValue: "HIGH" | "MEDIUM" | "LOW";
  contentDepthRequirement: "BRIEF" | "STANDARD" | "DEEP";
  internalLinkRole: "HUB" | "SPOKE" | "COMMERCIAL" | "LEGAL" | "SYSTEM";
  evidenceRequirement: "REQUIRED" | "USEFUL" | "NONE";
  priority: number;
  status: OpportunityStatus;
  route: string;
  indexable: boolean;
};

export type SiteArchitectureInput = {
  ventureId: string;
  ventureName: string;
  thesis: string;
  offer: string;
  market: string;
  persona: string;
  productType: string;
  businessModel: string;
  researchEvidence: string[];
  searchOpportunities: SearchOpportunity[];
  geoQuestions: GeoOpportunity[];
  pricing: string[];
  availableProof: string[];
  unavailableProof: string[];
  validationStage: string;
  brandProfile?: BrandMediaProfile | null;
  existingPages: string[];
  performanceData: null;
  qualityTarget: QualityTarget;
  economicsJustifySimplerArtifact?: boolean;
};

export type PlannedPage = {
  route: string;
  role: PageRole;
  primaryIntent: PageIntent;
  parentHub: string | null;
  title: string;
  metaDescription: string;
  canonical: string;
  indexable: boolean;
  schemaTypes: SchemaType[];
  patternId: string;
  ctaStrength: CtaStrength;
  topicCluster: string;
  pageOpportunityId: string;
};

export type VentureSiteArchitecture = {
  planner: typeof import("./constants").VENTURE_SITE_ARCHITECTURE_PLANNER;
  version: string;
  qualityTarget: QualityTarget;
  rationale: string;
  hierarchy: Array<{ hub: string; spokes: string[] }>;
  pages: PlannedPage[];
  conversionPaths: Array<{ from: string; to: string; reason: string }>;
  schemaPlan: Array<{ route: string; types: SchemaType[]; reason: string }>;
  creativeRequirements: Array<{ route: string; necessity: "REQUIRED" | "USEFUL" | "NOT_REQUIRED"; reason: string }>;
  rejectedOpportunities: PageOpportunity[];
  massLowValueGenerationPermitted: false;
};

export type KnowledgeGraphNode = {
  nodeId: string;
  kind: "page" | "topic" | "entity";
  label: string;
  route?: string;
  entityId?: string;
};

export type KnowledgeGraphEdge = {
  edgeId: string;
  from: string;
  to: string;
  type: GraphEdgeType;
  anchor: string;
};

export type SiteKnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  orphans: string[];
  brokenEdges: string[];
};

export type ContentEvidence = {
  claim: string;
  source: string;
  sourceType: "ACADEMIC" | "INDUSTRY" | "GOVERNMENT" | "ACCOUNTING" | "FINANCE_REFERENCE" | "PRIMARY";
  observedAt: string;
  support: string;
  page: string;
  section: string;
  model: "deterministic_writer_v1";
  provider: "infinity-native";
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type PagePattern = {
  patternId: string;
  purpose: string;
  bestUse: string;
  requiredBlocks: string[];
  optionalBlocks: string[];
  expectedDepth: "BRIEF" | "STANDARD" | "DEEP";
  conversionBehavior: string;
  schemaRecommendations: SchemaType[];
  internalLinkExpectations: string[];
  visualRequirements: string[];
  qualityChecks: string[];
};

export type SchemaPattern = {
  schemaType: SchemaType;
  when: string;
  forbiddenUnless: string;
};

export type SiteAiRoleContract = {
  role: SiteAiRole;
  responsibilities: string[];
  capability: string;
  providerBound: false;
};

export type ThinPageAssessment = {
  route: string;
  uniqueInformationalValue: Gate;
  intentFulfillment: Gate;
  contentDepth: Gate;
  sourceGrounding: Gate;
  semanticDifferentiation: Gate;
  internalLinkRole: Gate;
  decision: "PASS" | "REJECT" | "MERGE";
  reasons: string[];
};

export type CannibalizationDecision = {
  left: string;
  right: string;
  action: "MERGE" | "CHANGE_INTENT" | "HUB_AND_SPOKE" | "REJECT_DUPLICATE" | "KEEP";
  reason: string;
};

export type SiteExpansionOpportunity = {
  topic: string;
  recommendedPageType: PageRole;
  reason: string;
  status: "FUTURE_EXPANSION";
  autoPublish: false;
};

export type PublicRouteInventoryItem = {
  route: string;
  pageRole: PageRole;
  primaryIntent: PageIntent;
  parentHub: string | null;
  schema: SchemaType[];
  indexable: boolean;
};

export type PageContentReport = {
  route: string;
  title: string;
  pageRole: PageRole;
  primaryPurpose: string;
  wordCount: number;
  sourceCount: number;
  inboundLinks: number;
  outboundLinks: number;
  schemaTypes: SchemaType[];
  designPattern: string;
  quality: Gate;
};

export type SitePerformanceIdentity = {
  pageId: string;
  pageType: PageRole;
  pagePattern: string;
  sectionPattern?: string;
  ctaPattern?: string;
  designArchetype: string;
  topicCluster: string;
  contentDepthBand: string;
  trafficSource: "UNKNOWN";
};

export type SearchPerformanceAdapterContract = {
  adapter: "google_search_console" | "ga4" | "other_search_performance";
  status: "CONTRACT_ONLY";
  live: false;
};

export type AuthoritySiteAudit = {
  premiumDesign: Gate;
  geoSeo: Gate;
  internalLinks: Gate;
  schema: Gate;
  metadata: Gate;
  sitemap: Gate;
  robots: Gate;
  accessibility: Gate;
  thinPages: number;
  duplicateIntentPages: number;
  indexableOrphans: number;
  brokenInternalLinks: number;
  invalidSchemaBlocks: number;
  fakeRatingsReviews: "YES" | "NO";
  fakeOffers: "YES" | "NO";
  classification: QualityTarget | "FUNCTIONALLY_INVALID" | "FUNCTIONALLY_VALID" | "FUNCTIONALLY_VALID_VISUALLY_BELOW_VALIDATION_GRADE" | "PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD" | "PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD";
  premiumAuthorityOverall: Gate;
};

export type ComposeAuthorityInput = {
  context: SiteArchitectureInput;
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  experimentId: string;
  ventureId: string;
  candidateId: string;
  predecessorArtifactId: string;
  predecessorDigest?: string | null;
  architecture: VentureSiteArchitecture;
  graph: SiteKnowledgeGraph;
  evidence: ContentEvidence[];
  tokens: VentureDesignTokens;
  creative: CreativeAssetPlan;
};
