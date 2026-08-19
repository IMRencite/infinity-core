import type {
  AutomationLevel,
  BuildPackageStatus,
  BuildVsBuyDecision,
  EconomicsComplianceState,
  FeaturePriority,
} from "./constants";
import type { VentureType } from "./constants";

export type SourceLineage = {
  researchRunIds?: string[];
  discoveryRunId?: string | null;
  opportunityCandidateId?: string | null;
  monetizationRunId?: string | null;
  monetizationAnalysisId?: string | null;
  ventureSelectionRunId?: string | null;
  candidateSelectionEvaluationId?: string | null;
  ventureSelectionHandoffId?: string | null;
  companyBuilderRunId?: string | null;
  ventureBlueprintId?: string | null;
  founderIdeaSubmissionId?: string | null;
  ventureOrigin?: "AUTONOMOUS_DISCOVERY" | "FOUNDER_SUBMITTED" | "FOUNDER_OVERRIDE" | null;
  capabilityTest?: boolean;
  inputMode?: "handoff" | "simulation";
};

export type LoadedVentureSelectionHandoff = {
  id: string | null;
  organizationId: string;
  ventureSelectionRunId: string | null;
  candidateSelectionEvaluationId: string | null;
  opportunityCandidateId: string | null;
  discoveryRunId: string | null;
  monetizationRunId: string | null;
  businessConcept: string;
  targetCustomer: string;
  problem: string;
  solution: string;
  primaryMonetizationModel: string;
  secondaryRevenueStreams: string[];
  pricingStrategy: string;
  distributionStrategy: string;
  recommendedProductType: string;
  requiredCapabilities: string[];
  mvpRequirements: string[];
  futureFeatures: string[];
  economicTargets: Record<string, number | null>;
  budgetEnvelope: Record<string, number | null>;
  riskConstraints: Record<string, unknown>;
  validationState: string;
  sourceEvidenceRefs: string[];
  handoffStatus: string | null;
  decision: string | null;
  simulationOnly: boolean;
  candidateTitle?: string;
  candidateSummary?: string;
  businessModelCandidates?: string[];
  monetizationScore?: number | null;
};

export type VentureBlueprintCore = {
  ventureNameWorking: string;
  ventureType: VentureType;
  secondaryVentureTypes: VentureType[];
  businessSummary: string;
  problem: string;
  solution: string;
  targetCustomer: string;
  customerSegments: string[];
  payer: string;
  beneficiary: string;
  primaryValueProposition: string;
  primaryMonetizationModel: string;
  secondaryRevenueStreams: string[];
  pricingStrategy: string;
  customerAcquisitionStrategy: string;
  distributionChannels: string[];
  competitivePositioning: string;
  differentiation: string;
  brandRequirements: string[];
  productRequirements: string[];
  technicalRequirements: string[];
  operationalRequirements: string[];
  contentRequirements: string[];
  dataRequirements: string[];
  integrationRequirements: string[];
  complianceRequirements: string[];
  analyticsRequirements: string[];
  growthRequirements: string[];
  supportRequirements: string[];
  securityRequirements: string[];
  economicTargets: Record<string, number | null>;
  budgetEnvelope: Record<string, number | null>;
  riskConstraints: Record<string, unknown>;
  successMetrics: string[];
  failureConditions: string[];
};

export type BusinessArchitecture = {
  businessModel: string;
  customerJourney: string[];
  acquisitionFunnel: string[];
  activationEvent: string;
  coreValueEvent: string;
  conversionEvent: string;
  revenueEvent: string;
  retentionMechanism: string;
  referralMechanism: string;
  upsellMechanism: string;
  crossSellMechanism: string;
  economicLoop: string[];
};

export type RevenueImplementationArchitecture = {
  monetizationModelType: string;
  implementationRequirements: Record<string, unknown>;
  billingRequirements: string[];
  transactionRequirements: string[];
  attributionRequirements: string[];
  complianceNotes: string[];
};

export type ProductFeature = {
  featureName: string;
  description: string;
  userRole: string;
  priority: FeaturePriority;
  mvpRequired: boolean;
  dependencies: string[];
  complexity: "low" | "medium" | "high";
  businessPurpose: string;
  revenueRelationship: string;
  successMetric: string;
};

export type ProductArchitecture = {
  coreProduct: string;
  coreUserOutcome: string;
  userRoles: string[];
  userStories: string[];
  features: ProductFeature[];
};

export type SystemComponent = {
  name: string;
  purpose: string;
  responsibilities: string[];
  dependencies: string[];
};

export type TechnicalArchitecture = {
  applicationType: string;
  frontendRequirements: string[];
  backendRequirements: string[];
  databaseRequirements: string[];
  authenticationRequirements: string[];
  authorizationRequirements: string[];
  storageRequirements: string[];
  searchRequirements: string[];
  queueRequirements: string[];
  backgroundJobRequirements: string[];
  aiRequirements: string[];
  emailRequirements: string[];
  notificationRequirements: string[];
  paymentRequirements: string[];
  analyticsRequirements: string[];
  observabilityRequirements: string[];
  securityRequirements: string[];
  deploymentRequirements: string[];
  scalingRequirements: string[];
  recommendedStack: Record<string, string>;
  alternativesConsidered: string[];
  selectionReasons: string[];
  tradeoffs: string[];
  systemComponents: SystemComponent[];
  dataFlows: string[];
  serviceBoundaries: string[];
  externalIntegrations: string[];
};

export type DataEntity = {
  name: string;
  purpose: string;
  keyFields: string[];
  relationships: string[];
  sensitivity: "public" | "internal" | "confidential" | "pii";
  retentionRequirements: string;
};

export type DataModel = {
  entities: DataEntity[];
  relationships: string[];
  importantIndexes: string[];
  dataOwnership: string;
  dataRetentionRequirements: string[];
  privacyConsiderations: string[];
};

export type IntegrationRequirement = {
  capability: string;
  requiredOrOptional: "required" | "optional";
  possibleProviders: string[];
  recommendedProvider: string;
  reason: string;
  estimatedCost: number | null;
  dependencyRisk: number;
  credentialsRequired: boolean;
  externalAccountRequired: boolean;
};

export type BuildVsBuyItem = {
  component: string;
  decision: BuildVsBuyDecision;
  rationale: string;
  costEstimate: number | null;
  buildTimeEstimateDays: number | null;
  maintenanceBurden: "low" | "medium" | "high";
  strategicDifferentiation: "low" | "medium" | "high";
  vendorLockInRisk: "low" | "medium" | "high";
};

export type ProcessAutomationAssessment = {
  process: string;
  automationLevel: AutomationLevel;
  notes: string;
};

export type AutomationArchitecture = {
  processAssessments: ProcessAutomationAssessment[];
  automationCoverageScore: number;
  humanDependencyScore: number;
  externalVendorDependencyScore: number;
  futureAgentsRequired: string[];
};

export type BuildTask = {
  taskId: string;
  name: string;
  description: string;
  category: string;
  dependencies: string[];
  requiredCapabilities: string[];
  estimatedComplexity: "low" | "medium" | "high";
  estimatedCost: number;
  estimatedDurationDays: number;
  parallelizable: boolean;
  blocking: boolean;
  deliverables: string[];
  verificationCriteria: string[];
};

export type BuildGraph = {
  tasks: BuildTask[];
  criticalPath: string[];
  estimatedTotalCost: number;
  estimatedTotalDurationDays: number;
};

export type BuildPhase = {
  phaseName: string;
  objective: string;
  tasks: string[];
  entryCriteria: string[];
  exitCriteria: string[];
  dependencies: string[];
  estimatedCost: number;
  estimatedDurationDays: number;
};

export type MVPDefinition = {
  objective: string;
  includedFeatures: string[];
  excludedFeatures: string[];
  deferredFeatures: string[];
  mvpRevenuePath: string;
  mvpUserJourney: string[];
  mvpValidationGoals: string[];
};

export type EconomicGuardrails = {
  estimatedBuildCost: number;
  estimatedMonthlyOperatingCost: number;
  estimatedLaunchCost: number;
  estimatedFirst90DayCost: number;
  budgetEnvelope: Record<string, number | null>;
  expected12MonthProfit: number | null;
  expectedRoi: number | null;
  expectedTimeToRevenueDays: number | null;
  complianceResult: EconomicsComplianceState;
  complianceNotes: string[];
};

export type ArchitectureFeedbackItem = {
  finding:
    | "BUILDABILITY_OVERESTIMATED"
    | "COST_OVERRUN_RISK"
    | "TECHNICAL_COMPLEXITY_HIGHER"
    | "EXTERNAL_DEPENDENCY_HIGHER"
    | "REGULATORY_REQUIREMENTS_DISCOVERED"
    | "TIME_TO_MARKET_HIGHER"
    | "AUTOMATION_LOWER_THAN_EXPECTED"
    | "MONETIZATION_IMPLEMENTATION_COMPLEXITY"
    | "NO_MAJOR_CHANGE";
  originalAssumption: string;
  newEstimate: string;
  impact: string;
  recommendedAction: "CONTINUE" | "RESCORE" | "REVALIDATE" | "HOLD" | "REJECT";
};

export type BrandArchitecture = {
  workingName: string;
  brandPosition: string;
  audience: string;
  tone: string;
  brandAttributes: string[];
  trustRequirements: string[];
  visualDirection: string;
  namingConstraints: string[];
  domainRequirements: string[];
};

export type ContentArchitecture = {
  contentTypes: string[];
  contentPurpose: string;
  contentFunnelMapping: Record<string, string>;
  programmaticContentPotential: "low" | "medium" | "high";
  aiContentPotential: "low" | "medium" | "high";
  humanReviewRequirement: "none" | "sampled" | "required";
  initialContentRequirements: string[];
  ongoingContentRequirements: string[];
};

export type AcquisitionChannelArchitecture = {
  channel: string;
  role: string;
  funnelStage: string;
  requiredAssets: string[];
  trackingRequirements: string[];
  estimatedCost: number | null;
  expectedTimeToSignalDays: number;
  automationPotential: AutomationLevel;
  dependencies: string[];
};

export type AcquisitionArchitecture = {
  channels: AcquisitionChannelArchitecture[];
  primaryChannel: string;
  supportingChannels: string[];
};

export type AnalyticsArchitecture = {
  northStarMetric: string;
  leadingIndicators: string[];
  revenueMetrics: string[];
  acquisitionMetrics: string[];
  activationMetrics: string[];
  retentionMetrics: string[];
  unitEconomicMetrics: string[];
  failureSignals: string[];
  eventCatalog: string[];
};

export type FailureCriterion = {
  metric: string;
  threshold: string;
  evaluationWindow: string;
  action: string;
};

export type VentureBlueprintDraft = {
  simulationOnly: boolean;
  core: VentureBlueprintCore;
  businessArchitecture: BusinessArchitecture;
  revenueArchitecture: RevenueImplementationArchitecture;
  productArchitecture: ProductArchitecture;
  technicalArchitecture: TechnicalArchitecture;
  dataModel: DataModel;
  integrationPlan: IntegrationRequirement[];
  buildVsBuy: BuildVsBuyItem[];
  automationArchitecture: AutomationArchitecture;
  buildGraph: BuildGraph;
  buildPhases: BuildPhase[];
  mvpDefinition: MVPDefinition;
  economicGuardrails: EconomicGuardrails;
  architectureFeedback: ArchitectureFeedbackItem[];
  brandArchitecture: BrandArchitecture;
  contentArchitecture: ContentArchitecture | null;
  acquisitionArchitecture: AcquisitionArchitecture;
  analyticsArchitecture: AnalyticsArchitecture;
  failureCriteria: FailureCriterion[];
  sourceLineage: SourceLineage;
};

export type ReadinessReport = {
  passed: boolean;
  checks: Array<{ check: string; passed: boolean; reason?: string }>;
  blockedReasons: string[];
};

export type BuildPackageDraft = {
  simulationOnly: boolean;
  packageVersion: number;
  status: BuildPackageStatus;
  buildGraphReference: { blueprintId: string; taskCount: number; criticalPath: string[] };
  mvpReference: { blueprintId: string; includedFeatures: string[]; revenuePath: string };
  technicalArchitectureReference: { blueprintId: string; applicationType: string; recommendedStack: Record<string, string> };
  economicConstraintsReference: { blueprintId: string; complianceResult: EconomicsComplianceState; estimatedBuildCost: number };
  verificationRequirements: string[];
  sourceLineage: SourceLineage;
  readinessReport: ReadinessReport;
  blockedReasons: string[];
};

export type CompanyBuilderReport = {
  engineVersion: string;
  blueprintVersion: string;
  simulationOnly: boolean;
  handoffsConsumed: number;
  blueprintsCreated: number;
  buildPackagesCreated: number;
  readyPackages: number;
  blockedPackages: number;
  ventureTypes: string[];
  economicsCompliance: Record<string, EconomicsComplianceState>;
  architectureFeedbackSummary: string[];
  costSummary: {
    aiEnrichmentCount: number;
    tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
    estimatedCostUsd: number | null;
  };
  completedAt: string;
};

export type RunCompanyBuilderInput = {
  organizationId: string;
  idempotencyKey: string;
  handoffIds?: string[];
  simulationInputs?: Array<{ opportunityCandidateId: string; label?: string }>;
  includeComplexityCapabilityTest?: boolean;
  runAiEnrichment?: boolean;
  runPurpose?: string;
};

export type RunCompanyBuilderOutput =
  | {
      ok: true;
      companyBuilderRunId: string;
      report: CompanyBuilderReport;
      blueprints: VentureBlueprintDraft[];
      buildPackages: BuildPackageDraft[];
    }
  | {
      ok: false;
      companyBuilderRunId: string;
      status: string;
      failureClassification: string;
      message: string;
    };
