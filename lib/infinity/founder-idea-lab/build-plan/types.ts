export const BUILD_PLAN_READINESS = [
  "READY_NOW",
  "ALREADY_BUILT",
  "PARTIALLY_AVAILABLE",
  "NEEDS_BUILD",
  "NEEDS_VALIDATION",
  "BLOCKED_BY_EVIDENCE",
] as const;
export type BuildPlanReadiness = (typeof BUILD_PLAN_READINESS)[number];

export const BUILD_PLAN_SEQUENCE = ["MVP", "NEXT", "LATER"] as const;
export type BuildPlanSequence = (typeof BUILD_PLAN_SEQUENCE)[number];

export const BUILD_PLAN_EFFORT = ["LOW", "MEDIUM", "HIGH"] as const;
export type BuildPlanEffort = (typeof BUILD_PLAN_EFFORT)[number];

export const CANONICAL_INFINITY_SYSTEMS = [
  "Research / Validation",
  "Monetization Engine",
  "Venture Selection",
  "Company Builder",
  "Venture Systems Architecture",
  "Payment Architecture",
  "Product / Asset Builder",
  "Organic Growth",
  "Creative Media",
  "Production Artifact Handoff",
  "Deployment Readiness",
  "Deployment Execution",
  "Commercialization Control Plane",
  "Performance Intelligence",
  "Treasury / Economic Authorization",
] as const;
export type CanonicalInfinitySystem = (typeof CANONICAL_INFINITY_SYSTEMS)[number];

export const ZERO_TO_PRODUCTION_STEPS = [
  "IDEA",
  "VALIDATE",
  "DESIGN",
  "BUILD",
  "LAUNCH",
  "ACQUIRE",
  "LEARN",
  "SCALE",
] as const;
export type ZeroToProductionStep = (typeof ZERO_TO_PRODUCTION_STEPS)[number];

export const SYSTEM_COVERAGE = ["AVAILABLE", "PARTIAL", "NEEDS_WORK", "BLOCKED"] as const;
export type SystemCoverage = (typeof SYSTEM_COVERAGE)[number];

export type FounderRequiredSystem = {
  system: CanonicalInfinitySystem;
  stripId: string;
  stripLabel: string;
  whyNeeded: string;
  readiness: BuildPlanReadiness;
  coverage: SystemCoverage;
  coverageLabel: string;
  remains: string;
};

export const BUILD_PLAN_AUTHORITY = {
  canCreateMissions: false,
  canAssignAgents: false,
  canMutateRoadmap: false,
  canApproveBuild: false,
  canDeploy: false,
  canSpend: false,
  canPurchase: false,
  canModifyVentureState: false,
} as const;

export type FounderBuildPlanPhase = {
  id: string;
  order: number;
  name: string;
  whatInfinityWouldDo: string;
  whyItMatters: string;
  systems: CanonicalInfinitySystem[];
  readiness: BuildPlanReadiness;
  readinessLabel: string;
  gate: string;
  output: string;
};

export type FounderMvpRecommendation = {
  coreProblem: string;
  idealCustomer: string;
  corePromise: string;
  mustHaveFeatures: string[];
  differentiators: string[];
  thingsToLeaveOut: string[];
  validationGoal: string;
};

export type SuggestedSequenceItem = {
  sequence: BuildPlanSequence;
  feature: string;
  capabilityStatus: string;
  capabilityLabel: string;
};

export type FounderVentureBuildPlan = {
  heading: "How Infinity Could Build This";
  summary: string;
  estimatedPath: string;
  existingCoverage: string;
  newCapabilitiesRequired: string;
  mainDependency: string;
  firstValidation: string;
  effort: BuildPlanEffort;
  effortConfidence: "Weak" | "Moderate" | "Strong";
  currentPosition: string;
  path: Array<{ id: ZeroToProductionStep; complete: boolean; current: boolean }>;
  phases: FounderBuildPlanPhase[];
  mvp: FounderMvpRecommendation;
  sequence: SuggestedSequenceItem[];
  economicChecks: string[];
  requiredSystems: FounderRequiredSystem[];
  systemsReady: number;
  systemsPartial: number;
  systemsMissing: number;
  systemsBlocked: number;
  coverageSummary: string;
  nextRequiredSystems: string[];
  alreadyAvailable: string[];
  productSpecificWork: string[];
  next3Phases: FounderBuildPlanPhase[];
  ifBuiltToday: {
    whatItWouldBuild: string;
    whoItWouldSellTo: string;
    howItWouldCharge: string;
    whatItWouldDoDifferently: string;
    howItWouldAcquire: string;
    whatItWouldMeasure: string;
  };
  authority: typeof BUILD_PLAN_AUTHORITY;
  grantsBuild: false;
};
