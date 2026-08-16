import { assembleVentureBlueprint, assembleBuildPackage } from "@/lib/infinity/company-builder/blueprint/assemble";
import type { LoadedBuildPackage } from "../types";
import type { LoadedVentureSelectionHandoff } from "@/lib/infinity/company-builder/types";

function buildSyntheticHandoff(): LoadedVentureSelectionHandoff {
  return {
    id: null,
    organizationId: "synthetic-org",
    ventureSelectionRunId: null,
    candidateSelectionEvaluationId: null,
    opportunityCandidateId: "synthetic-pab-venture",
    discoveryRunId: null,
    monetizationRunId: null,
    businessConcept: "Synthetic Micro SaaS for PAB V1",
    targetCustomer: "Small teams",
    problem: "Need lightweight task tracking",
    solution: "Minimal SaaS task board with subscription billing architecture",
    primaryMonetizationModel: "saas_subscription",
    secondaryRevenueStreams: [],
    pricingStrategy: "$19/mo starter tier",
    distributionStrategy: "Product-led growth",
    recommendedProductType: "saas",
    requiredCapabilities: ["software_development"],
    mvpRequirements: ["Dashboard", "Billing stub", "Auth"],
    futureFeatures: ["Teams"],
    economicTargets: { expected12MonthProfit: 50000, expectedRoi: 1.5, estimatedCapitalRequired: 20000 },
    budgetEnvelope: { startupCapital: 20000, monthlyOperatingBudget: 2000 },
    riskConstraints: {},
    validationState: "simulation",
    sourceEvidenceRefs: [],
    handoffStatus: null,
    decision: "SIMULATION",
    simulationOnly: true,
    candidateTitle: "Synthetic Micro SaaS",
    candidateSummary: "Minimal SaaS for Product Asset Builder V1 verification",
    businessModelCandidates: ["saas"],
  };
}

export function createSyntheticBuildPackage(organizationId: string): LoadedBuildPackage {
  const handoff = { ...buildSyntheticHandoff(), organizationId };
  const blueprint = assembleVentureBlueprint({
    handoff,
    simulationOnly: true,
    sourceLineage: { opportunityCandidateId: handoff.opportunityCandidateId, inputMode: "simulation" },
  });
  const buildPackage = assembleBuildPackage(blueprint, "synthetic-blueprint-id");
  return {
    packageId: null,
    blueprintId: null,
    organizationId,
    buildPackage,
    blueprint,
    buildGraph: blueprint.buildGraph,
    simulationOnly: true,
  };
}

export function assertBuildPackageReady(loaded: LoadedBuildPackage): void {
  if (loaded.buildPackage.status !== "READY") {
    throw new Error(`BuildPackage not READY: ${loaded.buildPackage.status} — ${loaded.buildPackage.blockedReasons.join("; ")}`);
  }
  if (!loaded.buildPackage.readinessReport.passed) {
    throw new Error(`BuildPackage readiness failed: ${loaded.buildPackage.readinessReport.blockedReasons.join("; ")}`);
  }
}
