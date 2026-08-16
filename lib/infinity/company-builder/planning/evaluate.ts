import { DEFAULT_READINESS_THRESHOLDS } from "../constants";
import type {
  BuildGraph,
  BuildPackageDraft,
  EconomicGuardrails,
  ReadinessReport,
  SourceLineage,
  VentureBlueprintDraft,
} from "../types";
import { validateBuildGraphDag } from "../build-graph/generate";

export function evaluateEconomicGuardrails(input: {
  buildGraph: BuildGraph;
  budgetEnvelope: Record<string, number | null>;
  economicTargets: Record<string, number | null>;
  integrationMonthlyCost: number;
}): EconomicGuardrails {
  const startupCapital = input.budgetEnvelope.startupCapital ?? input.budgetEnvelope.availableVentureCapital ?? 100000;
  const monthlyOperating = input.budgetEnvelope.monthlyOperatingBudget ?? 5000;
  const estimatedBuildCost = input.buildGraph.estimatedTotalCost;
  const estimatedLaunchCost = Math.round(estimatedBuildCost * 0.15);
  const estimatedMonthlyOperatingCost = monthlyOperating + input.integrationMonthlyCost;
  const estimatedFirst90DayCost = Math.round(
    estimatedBuildCost + estimatedLaunchCost + estimatedMonthlyOperatingCost * 3,
  );

  const notes: string[] = [];
  let complianceResult: EconomicGuardrails["complianceResult"] = "PASS";

  const maxBuild = DEFAULT_READINESS_THRESHOLDS.maxEstimatedBuildCostUsd;
  const max90 = DEFAULT_READINESS_THRESHOLDS.maxEstimatedFirst90DayCostUsd;
  const overrunRatio = startupCapital > 0 ? estimatedFirst90DayCost / startupCapital : 999;

  if (estimatedBuildCost > maxBuild || estimatedFirst90DayCost > max90) {
    complianceResult = "FAIL";
    notes.push("Estimated architecture/build cost exceeds configured hard limits.");
  } else if (overrunRatio > DEFAULT_READINESS_THRESHOLDS.maxBudgetOverrunRatio) {
    complianceResult = "WARNING";
    notes.push("Estimated first-90-day cost exceeds budget envelope ratio threshold.");
  } else if (estimatedBuildCost > startupCapital * 0.8) {
    complianceResult = "WARNING";
    notes.push("Build cost consumes majority of startup capital envelope.");
  }

  return {
    estimatedBuildCost,
    estimatedMonthlyOperatingCost,
    estimatedLaunchCost,
    estimatedFirst90DayCost,
    budgetEnvelope: input.budgetEnvelope,
    expected12MonthProfit: input.economicTargets.expected12MonthProfit ?? null,
    expectedRoi: input.economicTargets.expectedRoi ?? null,
    expectedTimeToRevenueDays: input.economicTargets.expectedTimeToRevenue ?? null,
    complianceResult,
    complianceNotes: notes,
  };
}

export function evaluateArchitectureFeedback(input: {
  handoffBuildabilityScore?: number | null;
  automationCoverageScore: number;
  buildGraph: BuildGraph;
  budgetEnvelope: Record<string, number | null>;
  economicGuardrails: EconomicGuardrails;
  integrationDependencyRiskMax: number;
}): import("../types").ArchitectureFeedbackItem[] {
  const feedback: import("../types").ArchitectureFeedbackItem[] = [];
  const startupCapital = Number(input.budgetEnvelope.startupCapital ?? 100000);

  if (input.economicGuardrails.complianceResult === "FAIL") {
    feedback.push({
      finding: "COST_OVERRUN_RISK",
      originalAssumption: `Startup capital envelope ~$${startupCapital}`,
      newEstimate: `Estimated first-90-day cost ~$${input.economicGuardrails.estimatedFirst90DayCost}`,
      impact: "Business case may be destroyed before launch if costs are not rescoped.",
      recommendedAction: "REVALIDATE",
    });
  } else if (input.economicGuardrails.complianceResult === "WARNING") {
    feedback.push({
      finding: "COST_OVERRUN_RISK",
      originalAssumption: `Startup capital envelope ~$${startupCapital}`,
      newEstimate: `Estimated first-90-day cost ~$${input.economicGuardrails.estimatedFirst90DayCost}`,
      impact: "Architecture cost may consume too much of the available envelope.",
      recommendedAction: "RESCORE",
    });
  }

  if (input.buildGraph.estimatedTotalDurationDays > 120) {
    feedback.push({
      finding: "TIME_TO_MARKET_HIGHER",
      originalAssumption: "Venture Selection speed-to-revenue estimates",
      newEstimate: `${input.buildGraph.estimatedTotalDurationDays} days estimated build graph duration`,
      impact: "Delayed revenue feedback and higher burn.",
      recommendedAction: "RESCORE",
    });
  }

  if (input.automationCoverageScore < 0.55) {
    feedback.push({
      finding: "AUTOMATION_LOWER_THAN_EXPECTED",
      originalAssumption: "High Infinity automation potential",
      newEstimate: `Automation coverage score ${input.automationCoverageScore}`,
      impact: "More human/vendor involvement than selection assumed.",
      recommendedAction: "HOLD",
    });
  }

  if (input.integrationDependencyRiskMax >= 0.6) {
    feedback.push({
      finding: "EXTERNAL_DEPENDENCY_HIGHER",
      originalAssumption: "Moderate external platform dependency",
      newEstimate: `Integration dependency risk up to ${input.integrationDependencyRiskMax}`,
      impact: "Provider access/pricing/terms may block launch.",
      recommendedAction: "REVALIDATE",
    });
  }

  if (feedback.length === 0) {
    feedback.push({
      finding: "NO_MAJOR_CHANGE",
      originalAssumption: "Venture Selection buildability/economics",
      newEstimate: "Architecture within expected bounds",
      impact: "No major rescoring required at blueprint stage.",
      recommendedAction: "CONTINUE",
    });
  }

  return feedback;
}

export function defineMvp(input: {
  productArchitecture: VentureBlueprintDraft["productArchitecture"];
  revenueArchitecture: VentureBlueprintDraft["revenueArchitecture"];
  businessArchitecture: VentureBlueprintDraft["businessArchitecture"];
}): import("../types").MVPDefinition {
  const included = input.productArchitecture.features.filter((f) => f.mvpRequired).map((f) => f.featureName);
  const excluded = input.productArchitecture.features.filter((f) => !f.mvpRequired && f.priority === "SHOULD_HAVE").map((f) => f.featureName);
  const deferred = input.productArchitecture.features.filter((f) => f.priority === "LATER" || f.priority === "EXPERIMENTAL").map((f) => f.featureName);

  return {
    objective: "Smallest launchable venture that validates the primary monetization mechanism and core customer outcome",
    includedFeatures: included,
    excludedFeatures: excluded,
    deferredFeatures: deferred,
    mvpRevenuePath: `${input.revenueArchitecture.monetizationModelType}: ${input.businessArchitecture.revenueEvent}`,
    mvpUserJourney: input.businessArchitecture.customerJourney.slice(0, 5),
    mvpValidationGoals: [
      "Prove activation event occurs for target segment",
      "Measure conversion to revenue event",
      "Confirm primary acquisition channel produces signal",
    ],
  };
}

export function evaluateBuildPackageReadiness(input: {
  blueprint: VentureBlueprintDraft;
  buildGraph: BuildGraph;
  mvpDefinition: VentureBlueprintDraft["mvpDefinition"];
  sourceLineage: SourceLineage;
  thresholds?: Partial<typeof DEFAULT_READINESS_THRESHOLDS>;
}): ReadinessReport {
  const thresholds = { ...DEFAULT_READINESS_THRESHOLDS, ...input.thresholds };
  const checks: ReadinessReport["checks"] = [];
  const blockedReasons: string[] = [];

  const dag = validateBuildGraphDag(input.buildGraph);
  checks.push({ check: "build_graph_dag_valid", passed: dag.valid, reason: dag.cycles.join("; ") || undefined });
  if (!dag.valid) blockedReasons.push("Build graph contains dependency cycles.");

  const hasRevenuePath = input.mvpDefinition.mvpRevenuePath.trim().length > 0;
  checks.push({ check: "mvp_revenue_path_present", passed: hasRevenuePath });
  if (!hasRevenuePath) blockedReasons.push("MVP revenue path missing.");

  const mvpFeatureCount = input.mvpDefinition.includedFeatures.length;
  checks.push({ check: "mvp_feature_count", passed: mvpFeatureCount >= thresholds.minMvpFeatureCount });
  if (mvpFeatureCount < thresholds.minMvpFeatureCount) blockedReasons.push("Insufficient MVP features defined.");

  const hasAnalytics = input.blueprint.analyticsArchitecture.eventCatalog.length >= 5;
  checks.push({ check: "analytics_architecture_present", passed: !thresholds.requireAnalyticsArchitecture || hasAnalytics });
  if (thresholds.requireAnalyticsArchitecture && !hasAnalytics) blockedReasons.push("Analytics architecture incomplete.");

  const hasDataModel = input.blueprint.dataModel.entities.length >= 3;
  checks.push({ check: "data_model_present", passed: !thresholds.requireDataModel || hasDataModel });
  if (thresholds.requireDataModel && !hasDataModel) blockedReasons.push("Conceptual data model incomplete.");

  const hasLineage = Boolean(
    input.sourceLineage.opportunityCandidateId ||
      input.sourceLineage.ventureSelectionHandoffId ||
      input.sourceLineage.capabilityTest,
  );
  checks.push({ check: "source_lineage_present", passed: !thresholds.requireSourceLineage || hasLineage });
  if (thresholds.requireSourceLineage && !hasLineage) blockedReasons.push("Source lineage missing.");

  if (thresholds.blockOnEconomicsFail && input.blueprint.economicGuardrails.complianceResult === "FAIL") {
    checks.push({ check: "economics_compliance", passed: false, reason: "Economics compliance FAIL" });
    blockedReasons.push("Estimated costs exceed economic guardrails.");
  } else {
    checks.push({ check: "economics_compliance", passed: input.blueprint.economicGuardrails.complianceResult !== "FAIL" });
  }

  const fatalCompliance = input.blueprint.core.complianceRequirements.some((r) => /blocked|prohibited|license required before launch/i.test(r));
  checks.push({ check: "no_fatal_compliance_blocker", passed: !thresholds.blockOnFatalCompliance || !fatalCompliance });
  if (thresholds.blockOnFatalCompliance && fatalCompliance) blockedReasons.push("Fatal compliance blocker documented.");

  return { passed: blockedReasons.length === 0, checks, blockedReasons };
}

export function createBuildPackage(input: {
  blueprint: VentureBlueprintDraft;
  blueprintId: string;
  readinessReport: ReadinessReport;
  packageVersion?: number;
}): BuildPackageDraft {
  const status = input.readinessReport.passed
    ? input.blueprint.economicGuardrails.complianceResult === "WARNING"
      ? "READY"
      : "READY"
    : "BLOCKED";

  return {
    simulationOnly: input.blueprint.simulationOnly,
    packageVersion: input.packageVersion ?? 1,
    status,
    buildGraphReference: {
      blueprintId: input.blueprintId,
      taskCount: input.blueprint.buildGraph.tasks.length,
      criticalPath: input.blueprint.buildGraph.criticalPath,
    },
    mvpReference: {
      blueprintId: input.blueprintId,
      includedFeatures: input.blueprint.mvpDefinition.includedFeatures,
      revenuePath: input.blueprint.mvpDefinition.mvpRevenuePath,
    },
    technicalArchitectureReference: {
      blueprintId: input.blueprintId,
      applicationType: input.blueprint.technicalArchitecture.applicationType,
      recommendedStack: input.blueprint.technicalArchitecture.recommendedStack,
    },
    economicConstraintsReference: {
      blueprintId: input.blueprintId,
      complianceResult: input.blueprint.economicGuardrails.complianceResult,
      estimatedBuildCost: input.blueprint.economicGuardrails.estimatedBuildCost,
    },
    verificationRequirements: input.readinessReport.checks.map((c) => `${c.check}:${c.passed ? "pass" : "fail"}`),
    sourceLineage: input.blueprint.sourceLineage,
    readinessReport: input.readinessReport,
    blockedReasons: input.readinessReport.blockedReasons,
  };
}
