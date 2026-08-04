import type {
  AiWebsiteGenerationMode,
  AI_WEBSITE_GENERATION_SCHEMA_VERSION,
  AI_WEBSITE_PROMPT_VERSION,
} from "./constants";

export type WebsiteSectionPlan = {
  sectionKey: string;
  sectionType: string;
  purpose: string;
  headingRecommendation: string;
  contentBrief: string;
  requiredFacts: string[];
  approvedEvidenceReferenceIds: string[];
  CTA?: string;
  componentType: string;
  designNotes: string;
  accessibilityNotes: string;
  SEORequirements: string[];
  missingInformation: string[];
  prohibitedClaims: string[];
};

export type WebsitePagePlan = {
  pageKey: string;
  slug: string;
  pageType: string;
  titleRecommendation: string;
  purpose: string;
  primaryAudience: string;
  searchIntent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  primaryCTA: string;
  secondaryCTA?: string;
  sectionPlan: WebsiteSectionPlan[];
  requiredComponents: string[];
  internalLinkTargets: string[];
  metadataRecommendation: Record<string, string>;
  schemaTypes: string[];
  trustElements: string[];
  evidenceRequirements: string[];
  missingContentMarkers: string[];
  prohibitedClaims: string[];
  validationRequirements: string[];
};

export type WebsiteContentRecord = {
  contentKey: string;
  pageKey: string;
  sectionKey: string;
  contentType: string;
  content: string;
  evidenceReferenceIds: string[];
  confidence: number;
  assumptions: string[];
  missingInformation: string[];
  requiresHumanReview: boolean;
  policyFlags: string[];
};

export type WebsiteGenerationPlanPayload = {
  schemaVersion: typeof AI_WEBSITE_GENERATION_SCHEMA_VERSION;
  siteStrategy: string;
  audienceSummary: string;
  positioning: string;
  brandDirection: string;
  designDirection: string;
  informationArchitecture: string;
  navigationPlan: { label: string; href: string }[];
  pagePlans: WebsitePagePlan[];
  componentPlan: string[];
  contentPlan: WebsiteContentRecord[];
  conversionPlan: string;
  SEOPlan: string;
  schemaPlan: string;
  accessibilityPlan: string;
  trustRequirements: string[];
  missingInformation: string[];
  assumptions: string[];
  prohibitedClaims: string[];
  requiredPlaceholders: string[];
  executiveQuestions: string[];
  risks: { title: string; severity: string; rationale: string }[];
  recommendation: string;
  recommendationConfidence: number;
  conciseRationale: string[];
};

export type WebsiteGenerationPlan = {
  id: string;
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  ventureBlueprintId: string;
  buildId: string;
  buildSpecificationId: string;
  provider: string;
  model: string;
  mode: AiWebsiteGenerationMode | string;
  planVersion: string;
  promptVersion: typeof AI_WEBSITE_PROMPT_VERSION;
  schemaVersion: typeof AI_WEBSITE_GENERATION_SCHEMA_VERSION;
  status: string;
  reviewStatus: string;
  contextManifest: unknown;
  contextHash: string;
  structuredPlan: WebsiteGenerationPlanPayload | null;
  outputHash: string | null;
  recommendation: string | null;
  confidence: number | null;
  usage: Record<string, unknown> | null;
  estimatedCost: number;
  latencyMs: number | null;
  correlationId: string | null;
  reasoningSessionId: string | null;
  translationHash: string | null;
  createdAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
};

export type TranslatedWebsiteModel = {
  schemaVersion: typeof import("./constants").AI_WEBSITE_TRANSLATION_SCHEMA_VERSION;
  planId: string;
  contextHash: string;
  outputHash: string;
  translationHash: string;
  pageDefinitions: import("@/lib/infinity/website-builder/types").WebsitePageDefinition[];
  contentRecords: WebsiteContentRecord[];
  navigation: { label: string; href: string }[];
  provenance: { evidenceReferenceIds: string[]; planId: string };
};
