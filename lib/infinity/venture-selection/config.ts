import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
  VENTURE_SELECTION_LIMITS,
  VENTURE_SELECTION_SCORING_VERSION,
  VENTURE_SELECTION_VERSION,
} from "./constants";

export type VentureSelectionConfig = ReturnType<typeof loadVentureSelectionConfig>;

export function loadVentureSelectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): {
  enabled: boolean;
  engineVersion: string;
  scoringVersion: string;
  maxCandidatesPerRun: number;
  maxAdversarialReviewsPerRun: number;
  maxEstimatedCostUsd: number;
  resourceConstraints: {
    availableVentureCapital: number;
    monthlyOperatingBudget: number;
    aiApiBudget: number;
    buildCapacity: number;
    maxSimultaneousBuilds: number;
    maxSimultaneousValidations: number;
    riskTolerance: number;
  };
  buildGateThresholds: typeof DEFAULT_BUILD_GATE_THRESHOLDS;
  decisionThresholds: typeof DEFAULT_DECISION_THRESHOLDS;
  runAdversarialReview: boolean;
} {
  return {
    enabled: env.VENTURE_SELECTION_ENABLED !== "false",
    engineVersion: VENTURE_SELECTION_VERSION,
    scoringVersion: VENTURE_SELECTION_SCORING_VERSION,
    maxCandidatesPerRun: Number(
      env.VENTURE_SELECTION_MAX_CANDIDATES ?? VENTURE_SELECTION_LIMITS.maxCandidatesPerRun,
    ),
    maxAdversarialReviewsPerRun: Number(
      env.VENTURE_SELECTION_MAX_ADVERSARIAL_REVIEWS ?? VENTURE_SELECTION_LIMITS.maxAdversarialReviewsPerRun,
    ),
    maxEstimatedCostUsd: Number(
      env.VENTURE_SELECTION_MAX_ESTIMATED_COST_USD ?? VENTURE_SELECTION_LIMITS.maxEstimatedCostUsd,
    ),
    resourceConstraints: {
      ...DEFAULT_RESOURCE_CONSTRAINTS,
      availableVentureCapital: Number(
        env.VENTURE_SELECTION_AVAILABLE_CAPITAL ?? DEFAULT_RESOURCE_CONSTRAINTS.availableVentureCapital,
      ),
      monthlyOperatingBudget: Number(
        env.VENTURE_SELECTION_MONTHLY_BUDGET ?? DEFAULT_RESOURCE_CONSTRAINTS.monthlyOperatingBudget,
      ),
      maxSimultaneousBuilds: Number(
        env.VENTURE_SELECTION_MAX_BUILDS ?? DEFAULT_RESOURCE_CONSTRAINTS.maxSimultaneousBuilds,
      ),
      maxSimultaneousValidations: Number(
        env.VENTURE_SELECTION_MAX_VALIDATIONS ?? DEFAULT_RESOURCE_CONSTRAINTS.maxSimultaneousValidations,
      ),
    },
    buildGateThresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
    runAdversarialReview: env.VENTURE_SELECTION_RUN_ADVERSARIAL !== "false",
  };
}

export function assertVentureSelectionExecutable(config: VentureSelectionConfig): void {
  if (!config.enabled) {
    throw new Error("Venture Selection is disabled (VENTURE_SELECTION_ENABLED=false).");
  }
}
