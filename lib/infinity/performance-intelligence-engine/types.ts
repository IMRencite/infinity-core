import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  AttributionConfidence,
  DataQualityStatus,
  DiagnosisCategory,
  EconomicPriorityDecision,
  IngestionMode,
  LearningDecisionStatus,
  LearningDecisionType,
  OptimizationActionType,
  PerformanceSourceType,
  TimeWindow,
  ValueClassification,
  VentureModelType,
} from "./constants";

export type PerformanceSource = {
  id: string;
  ventureId?: string;
  sourceType: PerformanceSourceType;
  provider: string;
  ingestionMode: IngestionMode;
  externalAccountRef?: string;
  capabilities: string[];
  status: string;
  health: string;
  lastSuccessfulSyncAt?: string;
  lastFailureAt?: string;
  metadata?: Record<string, unknown>;
};

export type PerformanceObservation = {
  observationId: string;
  sourceId: string;
  ventureId?: string;
  sourceReference: string;
  idempotencyKey: string;
  observedAt: string;
  rawMetric: string;
  rawValue: number;
  rawUnit: string;
  description: string;
  artifactId?: string;
  mediaAssetId?: string;
  pageId?: string;
  externalActionId?: string;
  dimensions?: Record<string, string | number | boolean>;
  provenance: Record<string, unknown>;
  corrected?: boolean;
  supersedesReference?: string;
};

export type NormalizedPerformanceEvent = {
  id: string;
  ventureId?: string;
  artifactId?: string;
  mediaAssetId?: string;
  pageId?: string;
  campaignId?: string;
  externalActionId?: string;
  eventType: string;
  channel?: string;
  metric: string;
  value: number;
  unit: string;
  occurredAt: string;
  observedAt: string;
  sourceId: string;
  sourceReference: string;
  dimensions?: Record<string, string | number | boolean>;
  confidence?: number;
  provenance: Record<string, unknown>;
};

export type MetricDefinition = {
  name: string;
  canonicalUnit: string;
  aggregationMethod: "sum" | "avg" | "ratio" | "last";
  directionality: "higher_better" | "lower_better" | "neutral";
  applicableVentureTypes: VentureModelType[];
  formula?: string;
};

export type MetricAggregate = {
  aggregateId: string;
  ventureId?: string;
  metric: string;
  window: TimeWindow;
  value: number;
  unit: string;
  sampleSize: number;
  dataQuality: DataQualityStatus;
  dimensions?: Record<string, string | number | boolean>;
  computedAt: string;
};

export type VentureKPIModel = {
  modelId: string;
  ventureId: string;
  ventureModelType: VentureModelType;
  primaryMetrics: string[];
  secondaryMetrics: string[];
  guardrailMetrics: string[];
  rationale: string[];
};

export type KPIAssessment = {
  assessmentId: string;
  ventureId: string;
  metric: string;
  expectedValue: number | null;
  actualValue: number | null;
  variance: number | null;
  variancePercent: number | null;
  window: TimeWindow;
  expectationSource: string;
  actualSource: string;
  expectationClassification: ValueClassification;
  actualClassification: ValueClassification;
  confidence: number;
  dataQuality: DataQualityStatus;
  status: "above_plan" | "below_plan" | "on_plan" | "insufficient_data";
};

export type PerformanceHypothesis = {
  hypothesisId: string;
  statement: string;
  confidence: number;
  supportingEvidenceIds: string[];
  counterEvidence: string[];
  status: "proposed" | "supported" | "rejected" | "inconclusive";
};

export type PerformanceDiagnosis = {
  diagnosisId: string;
  ventureId: string;
  category: DiagnosisCategory;
  observation: string;
  hypotheses: PerformanceHypothesis[];
  confidence: number;
  dataQuality: DataQualityStatus;
  supportingEventIds: string[];
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sufficientEvidence: boolean;
};

export type OptimizationOpportunity = {
  opportunityId: string;
  diagnosisId: string;
  ventureId: string;
  target: string;
  actionType: OptimizationActionType;
  expectedUpsideUsd: number;
  estimatedCostUsd: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reversibility: "HIGH" | "MEDIUM" | "LOW";
  urgency: number;
  requiredCapabilities: string[];
  supportingEvidence: string[];
  economicDecision: EconomicPriorityDecision;
  upsideClassification: ValueClassification;
  costClassification: ValueClassification;
};

export type Experiment = {
  experimentId: string;
  ventureId: string;
  hypothesis: string;
  baselineVariant: string;
  testVariant: string;
  successMetric: string;
  guardrailMetrics: string[];
  window: TimeWindow;
  status: "planned" | "running" | "completed";
  result?: ExperimentResult;
};

export type ExperimentResult = {
  baselineValue: number;
  variantValue: number;
  outcome: "win" | "loss" | "inconclusive";
  confidence: number;
};

export type LearningDecision = {
  decisionId: string;
  ventureId: string;
  decisionType: LearningDecisionType;
  status: LearningDecisionStatus;
  diagnosisId?: string;
  opportunityId?: string;
  evidence: string[];
  economicAnalysis: string[];
  confidence: number;
  expectedOutcome?: string;
  missionId?: string;
  missionTargetEngine?: string;
  attributionConfidence: AttributionConfidence;
  intelligenceCostUsd: number;
};

export type TraceabilityLink = {
  linkType: string;
  sourceRef: string;
  targetRef: string;
};

export type PerformanceIntelligenceBuildPackage = {
  ventureId: string;
  performanceSources: PerformanceSource[];
  observations: PerformanceObservation[];
  normalizedEvents: NormalizedPerformanceEvent[];
  metricAggregates: MetricAggregate[];
  kpiModel: VentureKPIModel;
  kpiAssessments: KPIAssessment[];
  diagnoses: PerformanceDiagnosis[];
  optimizationOpportunities: OptimizationOpportunity[];
  experiments: Experiment[];
  learningDecisions: LearningDecision[];
  traceabilityLinks: TraceabilityLink[];
  sourceLineage: SourceLineage;
  feedbackContracts: {
    organic?: OrganicFeedbackContract;
    creative?: CreativeFeedbackContract;
    pab?: PabFeedbackContract;
  };
};

export type SourceLineage = {
  performanceIntelligenceRunId?: string;
  capabilityTest?: boolean;
  inputMode?: "simulation" | "live" | "internal";
  upstreamRunIds?: string[];
};

export type OrganicFeedbackContract = {
  ventureId: string;
  recommendations: Array<{ action: string; targetPageId?: string; rationale: string }>;
};

export type CreativeFeedbackContract = {
  ventureId: string;
  recommendations: Array<{ action: string; targetAssetId?: string; rationale: string }>;
};

export type PabFeedbackContract = {
  ventureId: string;
  recommendations: Array<{ action: string; targetFeature?: string; rationale: string }>;
};

export type VenturePerformanceContext = {
  ventureId: string;
  ventureModelType: VentureModelType;
  ventureTitle?: string;
  monetizationPlanId?: string;
  expectedConversionRate?: number;
  expectedCac?: number;
  expectedRevenue?: number;
  expectedOrganicTraffic?: number;
  expectedMediaCtr?: number;
  expectationProvenance?: string;
  organicContentContractIds?: string[];
  mediaAssetIds?: string[];
  productionArtifactIds?: string[];
};

export type PerformanceIntelligenceEngineReport = {
  engineVersion: string;
  venturesProcessed: number;
  buildPackagesCreated: number;
  observationsIngested: number;
  eventsNormalized: number;
  aggregatesComputed: number;
  diagnosesCreated: number;
  opportunitiesCreated: number;
  learningDecisionsCreated: number;
  missionsHandedOff: number;
  totalIntelligenceCostUsd: number;
};

export type RunPerformanceIntelligenceInput = {
  organizationId: string;
  idempotencyKey: string;
  simulationOnly?: boolean;
  capabilityTest?: boolean;
  ventureContexts?: VenturePerformanceContext[];
  enableMissionHandoff?: boolean;
  executeMissions?: boolean;
};

export type RunPerformanceIntelligenceOutput = {
  ok: boolean;
  performanceIntelligenceRunId: string;
  report: PerformanceIntelligenceEngineReport;
  buildPackages: PerformanceIntelligenceBuildPackage[];
};

export type SourceHealth = {
  status: "healthy" | "degraded" | "unavailable";
  message?: string;
  lastCheckedAt: string;
};

export type PerformanceSourceAdapter = {
  providerId: string;
  sourceType: PerformanceSourceType;
  ingestionMode: IngestionMode;
  capabilities: string[];
  healthCheck(): Promise<SourceHealth>;
  fetchObservations(input: {
    organizationId: string;
    ventureId?: string;
    since?: string;
  }): Promise<PerformanceObservation[]>;
  normalize(observation: PerformanceObservation): NormalizedPerformanceEvent[];
};

export type IngestResult = {
  observation: PerformanceObservation;
  events: NormalizedPerformanceEvent[];
  duplicate: boolean;
  corrected: boolean;
};

export type PerformanceIntelligenceEngineConfig = {
  enabled: boolean;
  simulationOnly: boolean;
  engineVersion: string;
  maxAiDiagnosisCostUsd: number;
  minOpportunityValueUsd: number;
  enableMissionHandoff: boolean;
  executeMissions: boolean;
};

export type ProcessVentureResult = {
  buildPackage: PerformanceIntelligenceBuildPackage;
  stats: Record<string, number>;
};

export type AdminClient = AdminSupabaseClient;
