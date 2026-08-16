import type {
  EconomicsSource,
  MediaAssetType,
  MediaCapability,
  MediaGenerationTaskType,
  MediaJobStatus,
  MediaOpportunityDecision,
  ProductionMediaStatus,
  QualityGateType,
  RepairActionType,
  ReviewSeverity,
} from "./constants";

export type SourceLineage = {
  creativeMediaRunId?: string;
  opportunityCandidateId?: string | null;
  monetizationPlanId?: string | null;
  monetizationRunId?: string | null;
  ventureBlueprintId?: string | null;
  companyBuilderBuildPackageId?: string | null;
  organicGrowthRunId?: string | null;
  organicGrowthBuildPackageId?: string | null;
  organicContentContractId?: string | null;
  inputMode?: "simulation" | "live" | "blueprint";
  capabilityTest?: boolean;
};

export type MediaChannel =
  | "website"
  | "youtube"
  | "youtube_short"
  | "social"
  | "organic_page"
  | "product"
  | "email"
  | "ads";

export type MediaPurpose =
  | "hero_image"
  | "thumbnail"
  | "diagram"
  | "product_shot"
  | "explainer_video"
  | "short_form_clip"
  | "long_form_video"
  | "social_promo"
  | "b_roll"
  | "tutorial";

export type MediaOpportunity = {
  id: string;
  ventureId: string;
  opportunityCandidateId?: string | null;
  monetizationPlanId?: string | null;
  ventureBlueprintId?: string | null;
  buildPackageId?: string | null;
  organicGrowthBuildPackageId?: string | null;
  organicContentContractId?: string | null;
  assetType: MediaAssetType;
  purpose: MediaPurpose;
  targetChannel?: MediaChannel;
  expectedValueScore: number;
  estimatedCost?: number;
  economicScore?: number;
  decision: MediaOpportunityDecision;
  rationale: string[];
  requiredCapabilities: MediaCapability[];
  reuseAssetId?: string | null;
};

export type BrandMediaProfile = {
  brandColors?: string[];
  typographyGuidance?: string;
  visualStyle?: string;
  logoRules?: string[];
  logoExclusions?: string[];
  photographyDirection?: string;
  illustrationDirection?: string;
  compositionGuidance?: string;
  prohibitedStyles?: string[];
  tone?: string;
  brandSafetyConstraints?: string[];
};

export type SubjectConsistencyProfile = {
  referenceAssetIds?: string[];
  identityConstraints?: string[];
  productAppearanceConstraints?: string[];
  wardrobeRequirements?: string[];
  physicalFeatureConstraints?: string[];
  visualContinuity?: string[];
  sceneContinuity?: string[];
  disallowedTransformations?: string[];
  confidence?: number;
};

export type CreativeBrief = {
  briefId: string;
  mediaOpportunityId: string;
  purpose: MediaPurpose;
  audience: string;
  message: string;
  targetChannel?: MediaChannel;
  assetType: MediaAssetType;
  visualDirection: string;
  brandRequirements: string[];
  subjectRequirements: string[];
  referenceAssetIds: string[];
  aspectRatio?: string;
  resolution?: string;
  durationSec?: number;
  composition?: string;
  cameraGuidance?: string;
  shotRequirements?: string[];
  audioRequirements?: string[];
  captionRequirements?: string[];
  textRequirements?: string[];
  factualConstraints: string[];
  accuracyRequirements: string[];
  prohibitedElements: string[];
  qualityThreshold: number;
  budgetUsd?: number;
  latencyPreference?: "low" | "balanced" | "quality";
  brandProfile?: BrandMediaProfile;
  subjectProfile?: SubjectConsistencyProfile;
};

export type MediaAssetPlan = {
  planId: string;
  ventureId: string;
  briefId: string;
  planType: "single_asset" | "variant_set" | "storyboard" | "shot_sequence";
  assetCount: number;
  description: string;
  mediaOpportunityIds: string[];
};

export type StoryboardScene = {
  sceneId: string;
  storyboardId: string;
  order: number;
  title: string;
  purpose: string;
  durationSec?: number;
};

export type ShotPlan = {
  shotPlanId: string;
  sceneId: string;
  order: number;
  shotType: string;
  cameraNotes?: string;
  durationSec?: number;
};

export type Shot = {
  shotId: string;
  shotPlanId: string;
  sceneId: string;
  briefId: string;
  order: number;
  objective: string;
  requiredCapabilities: MediaCapability[];
  durationSec?: number;
};

export type Storyboard = {
  storyboardId: string;
  ventureId: string;
  briefId: string;
  title: string;
  scenes: StoryboardScene[];
  shotPlans: ShotPlan[];
  shots: Shot[];
};

export type MediaGenerationTask = {
  taskId: string;
  ventureId: string;
  briefId: string;
  mediaOpportunityId: string;
  shotId?: string;
  taskType: MediaGenerationTaskType;
  requiredCapabilities: MediaCapability[];
  prompt: string;
  negativeConstraints: string[];
  referenceAssetIds: string[];
  aspectRatio?: string;
  resolution?: string;
  durationSec?: number;
  qualityTier: "premium" | "standard" | "economy" | "deterministic";
  maxCostUsd?: number;
  status: "pending" | "routed" | "submitted" | "completed" | "failed" | "blocked";
};

export type MediaRoutingCandidate = {
  provider: string;
  model: string;
  capabilityFit: number;
  qualityScore?: number;
  reliabilityScore?: number;
  estimatedCost?: number;
  latencyScore?: number;
  accepted: boolean;
  reasons: string[];
};

export type MediaRoutingDecision = {
  id: string;
  taskId: string;
  selectedProvider: string;
  selectedModel: string;
  candidates: MediaRoutingCandidate[];
  decisionReasons: string[];
};

export type MediaGenerationJob = {
  id: string;
  taskId: string;
  provider: string;
  model: string;
  providerJobId?: string | null;
  status: MediaJobStatus;
  submittedAt?: string | null;
  lastPolledAt?: string | null;
  completedAt?: string | null;
  attemptCount: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  outputAssetIds: string[];
  failureCode?: string | null;
  failureMessage?: string | null;
  providerMetadata?: Record<string, unknown>;
};

export type GeneratedMediaAsset = {
  assetId: string;
  parentAssetId?: string | null;
  variantOfAssetId?: string | null;
  mediaType: MediaAssetType;
  mimeType: string;
  filePath: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  frameRate?: number | null;
  fileSizeBytes?: number | null;
  checksum?: string | null;
  sourceType: "generated" | "processed" | "reused" | "fixture";
  provider?: string | null;
  model?: string | null;
  providerJobId?: string | null;
  generationAttempt: number;
  creativeBriefId: string;
  generationTaskId: string;
  routingDecisionId?: string | null;
  prompt?: string | null;
  negativeConstraints?: string[];
  referenceAssetIds?: string[];
  generationParameters?: Record<string, unknown>;
  createdAt: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  qualityStatus: "pending" | "passed" | "repair" | "blocked";
  productionStatus: ProductionMediaStatus;
  usageRights: "UNKNOWN" | "LICENSED" | "OWNED";
};

export type MediaQualityFinding = {
  gate: QualityGateType;
  severity: ReviewSeverity;
  description: string;
  score?: number;
};

export type MediaQualityReview = {
  reviewId: string;
  assetId: string;
  outcome: "PASS" | "REPAIR_REQUIRED" | "BLOCKED";
  findings: MediaQualityFinding[];
  gateScores: Partial<Record<QualityGateType, number>>;
};

export type MediaRepairAction = {
  actionId: string;
  assetId: string;
  action: RepairActionType;
  reason: string;
  attemptNumber: number;
  success: boolean;
};

export type MediaCostRecord = {
  recordId: string;
  assetId?: string | null;
  taskId?: string | null;
  jobId?: string | null;
  provider: string;
  model: string;
  estimatedCostUsd?: number | null;
  actualCostUsd?: number | null;
  usageSource: EconomicsSource | "NOT_REPORTED";
  metadata?: Record<string, unknown>;
};

export type ProductionMediaArtifact = {
  artifactId: string;
  ventureId: string;
  briefId: string;
  assetIds: string[];
  status: ProductionMediaStatus;
  mediaType: MediaAssetType;
  qualityReviewId?: string | null;
  unresolvedHighCount: number;
  unresolvedCriticalCount: number;
  feedbackReadyMetrics?: FeedbackReadyMetricsContract;
};

export type FeedbackReadyMetricsContract = {
  assetId: string;
  metricSlots: string[];
  baselineRecorded: boolean;
};

export type TraceabilityLink = {
  linkType: string;
  sourceRef: string;
  targetRef: string;
};

export type MediaEconomicsContext = {
  expectedAssetValue: number;
  expectedTrafficValue: number;
  expectedConversionValue: number;
  expectedReuseValue: number;
  generationCostEstimate: number;
  reviewCostEstimate: number;
  assemblyCostEstimate: number;
  minMarginalAssetValue: number;
  sources: Record<string, EconomicsSource>;
};

export type CreativeMediaBuildPackage = {
  ventureId: string;
  mediaOpportunities: MediaOpportunity[];
  creativeBriefs: CreativeBrief[];
  mediaAssetPlans: MediaAssetPlan[];
  storyboards: Storyboard[];
  generationTasks: MediaGenerationTask[];
  routingDecisions: MediaRoutingDecision[];
  generationJobs: MediaGenerationJob[];
  generatedAssets: GeneratedMediaAsset[];
  qualityReviews: MediaQualityReview[];
  repairActions: MediaRepairAction[];
  costRecords: MediaCostRecord[];
  productionArtifacts: ProductionMediaArtifact[];
  traceabilityLinks: TraceabilityLink[];
  sourceLineage: SourceLineage;
  blockedReasons: string[];
};

export type CreativeMediaEngineReport = {
  engineVersion: string;
  venturesProcessed: number;
  buildPackagesCreated: number;
  opportunitiesEvaluated: number;
  opportunitiesApproved: number;
  tasksCreated: number;
  jobsCompleted: number;
  assetsGenerated: number;
  productionReady: number;
  totalEstimatedCostUsd: number;
  totalActualCostUsd: number;
  autonomyBoundary: {
    publicPublishing: number;
    externalDeployments: number;
  };
};

export type RunCreativeMediaEngineInput = {
  organizationId: string;
  idempotencyKey: string;
  simulationOnly?: boolean;
  capabilityTest?: boolean;
  ventureContexts?: MediaVentureContext[];
  organicGrowthBuildPackageIds?: string[];
  maxAssetsPerRun?: number;
  enableLiveProviders?: boolean;
};

export type RunCreativeMediaEngineOutput = {
  ok: boolean;
  creativeMediaRunId: string;
  report: CreativeMediaEngineReport;
  buildPackages: CreativeMediaBuildPackage[];
};

export type MediaVentureContext = {
  ventureId: string;
  ventureName: string;
  ventureType: string;
  businessSummary: string;
  targetCustomer: string;
  monetizationModel?: string;
  brandProfile?: BrandMediaProfile;
  organicContentContractId?: string;
  mediaRequirements?: Array<{
    purpose: MediaPurpose;
    assetType: MediaAssetType;
    channel?: MediaChannel;
    priority?: number;
  }>;
};

export type MediaProviderCallResult = {
  success: boolean;
  provider: string;
  model: string;
  providerJobId?: string;
  sync: boolean;
  outputPath?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  fileSizeBytes?: number;
  checksum?: string;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  usageSource: EconomicsSource | "NOT_REPORTED";
  inputUsage?: Record<string, unknown>;
  outputUsage?: Record<string, unknown>;
  error?: string;
  providerMetadata?: Record<string, unknown>;
};

export type MediaProviderAdapter = {
  providerId: string;
  capabilities: MediaCapability[];
  isConfigured(): boolean;
  healthScore(): number;
  estimateCost(input: { taskType: MediaGenerationTaskType; durationSec?: number }): number;
  submitJob(input: {
    task: MediaGenerationTask;
    brief: CreativeBrief;
    model: string;
    outputDir: string;
  }): Promise<MediaProviderCallResult>;
  pollJob?(input: {
    providerJobId: string;
    model: string;
    outputDir: string;
  }): Promise<MediaProviderCallResult>;
};

export type VideoProductionContracts = {
  videoOpportunityId?: string;
  scriptContractRef?: string;
  storyboardId?: string;
  voicePlan?: { required: boolean; notes?: string };
  audioPlan?: { music?: boolean; sfx?: boolean };
  assemblyPlan?: { deterministicPreferred: boolean };
  captionPlan?: { required: boolean };
  thumbnailBriefId?: string;
};
