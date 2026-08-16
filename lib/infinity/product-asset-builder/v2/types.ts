import type { FeatureContractStatus } from "./constants";

export type FeatureContract = {
  featureId: string;
  featureName: string;
  businessPurpose: string;
  userRoles: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  dependencies: string[];
  requiredRoutes: string[];
  requiredDataEntities: string[];
  requiredAPIs: string[];
  requiredUIStates: string[];
  requiredErrorStates: string[];
  requiredAnalyticsEvents: string[];
  requiredTests: string[];
  acceptanceCriteria: string[];
  revenueRelationship: string;
  status: FeatureContractStatus;
};

export type TraceabilityLink = {
  linkType: string;
  sourceRef: string;
  targetRef: string;
  metadata?: Record<string, unknown>;
};

export type RepositoryMapEntry = {
  relativePath: string;
  moduleKind: string;
  exports: string[];
  routes: string[];
  entities: string[];
  featureIds: string[];
  dependencies: string[];
  contentHash?: string;
};

export type BuildIntelligenceReport = {
  engineVersion: string;
  providers: Record<
    string,
    {
      configured: boolean;
      authentication: string;
      tasks: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }
  >;
  multiBrain: {
    complexTasksRouted: number;
    multiProviderCollaborations: number;
    independentReviews: number;
    disagreements: number;
    fallbacks: number;
    repairs: number;
    routingLog: Array<{ task: string; provider: string; model: string; role: string; strategy: string }>;
  };
  featureContracts: { total: number; passed: number; failed: number; blocked: number };
  qualityGates: Record<string, boolean>;
  totalAICostUsd: number;
  totalDurationMs: number;
};

export type ProductionArtifactV2 = {
  artifactId: string;
  status: "ready" | "blocked" | "failed";
  featureContractCoverage: { total: number; passed: number; failed: number };
  testCoverageSummary: Record<string, unknown>;
  monetizationVerification: Record<string, unknown>;
  securityVerification: Record<string, unknown>;
  reviewVerification: Record<string, unknown>;
  providerProvenance: Array<{ provider: string; model: string; task: string; role: string }>;
  buildCostUsd: number;
  knownLimitations: string[];
  deploymentPrerequisites: string[];
};

export type RunPabV2Input = {
  organizationId: string;
  idempotencyKey: string;
  correlationId?: string;
  liveMode?: boolean;
  simulatedProviderOutage?: string;
  limits?: Partial<typeof import("./constants").DEFAULT_V2_BUDGET>;
};

export type RunPabV2Output = {
  ok: boolean;
  buildRunId: string;
  artifactStatus: string;
  artifactId: string | null;
  intelligenceReport: BuildIntelligenceReport;
  preflight: import("./providers/preflight").ProviderPreflightResult[];
  blockedReasons: string[];
};
