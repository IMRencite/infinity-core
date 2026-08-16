import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assembleBuildPackage, assembleVentureBlueprint } from "@/lib/infinity/company-builder/blueprint/assemble";
import { validateBuildGraphDag } from "@/lib/infinity/company-builder/build-graph/generate";
import { classifyVentureTypes } from "@/lib/infinity/company-builder/classify/venture-type";
import { buildComplexityTestSimulationHandoff } from "@/lib/infinity/company-builder/load/load-handoffs";
import { evaluateBuildPackageReadiness } from "@/lib/infinity/company-builder/planning/evaluate";
import type { LoadedVentureSelectionHandoff } from "@/lib/infinity/company-builder/types";
import { redactSecrets } from "@/lib/infinity/research/redaction";

function buildSaasHandoff(): LoadedVentureSelectionHandoff {
  return {
    id: null,
    organizationId: "org-1",
    ventureSelectionRunId: null,
    candidateSelectionEvaluationId: null,
    opportunityCandidateId: "candidate-saas",
    discoveryRunId: "discovery-1",
    monetizationRunId: "mon-1",
    businessConcept: "GEO Analytics SaaS",
    targetCustomer: "Marketing teams",
    problem: "Teams cannot measure AI search visibility",
    solution: "GEO visibility analytics platform",
    primaryMonetizationModel: "saas_subscription",
    secondaryRevenueStreams: ["data_exports"],
    pricingStrategy: "Tiered monthly subscription starting at $99/mo",
    distributionStrategy: "SEO + outbound to marketing directors",
    recommendedProductType: "saas",
    requiredCapabilities: ["software_development", "automated_acquisition"],
    mvpRequirements: ["Dashboard", "Billing", "Analytics"],
    futureFeatures: ["Team seats", "API access"],
    economicTargets: { expected12MonthProfit: 100000, expectedRoi: 2, estimatedCapitalRequired: 50000 },
    budgetEnvelope: { startupCapital: 50000, monthlyOperatingBudget: 5000 },
    riskConstraints: {},
    validationState: "simulation",
    sourceEvidenceRefs: ["https://example.com/evidence"],
    handoffStatus: null,
    decision: "SIMULATION",
    simulationOnly: true,
    candidateTitle: "GEO Analytics SaaS",
    candidateSummary: "Analytics platform for AI search visibility",
    businessModelCandidates: ["saas"],
  };
}

function buildLeadGenHandoff(): LoadedVentureSelectionHandoff {
  return {
    ...buildSaasHandoff(),
    opportunityCandidateId: "candidate-leadgen",
    businessConcept: "B2B Lead Comparison Site",
    primaryMonetizationModel: "lead_generation",
    recommendedProductType: "lead_generation",
    solution: "Comparison pages with qualified lead capture",
    businessModelCandidates: ["lead_generation", "content_site"],
    distributionStrategy: "SEO comparison pages + paid search tests",
  };
}

describe("Company Builder v1", () => {
  it("classifies venture types for multi-model ventures", () => {
    const classified = classifyVentureTypes(buildLeadGenHandoff());
    expect(classified.primary).toBe("lead_generation");
    expect(classified.secondary.length).toBeGreaterThanOrEqual(0);
  });

  it("generates a specific SaaS blueprint with revenue and product architecture", () => {
    const blueprint = assembleVentureBlueprint({
      handoff: buildSaasHandoff(),
      simulationOnly: true,
      sourceLineage: { opportunityCandidateId: "candidate-saas" },
    });

    expect(blueprint.core.ventureType).toBe("saas");
    expect(blueprint.revenueArchitecture.monetizationModelType).toContain("subscription");
    expect(blueprint.productArchitecture.features.some((f) => f.mvpRequired)).toBe(true);
    expect(blueprint.productArchitecture.features.some((f) => /billing|subscription/i.test(f.featureName))).toBe(true);
    expect(blueprint.technicalArchitecture.recommendedStack.frontend).toContain("Next.js");
    expect(blueprint.dataModel.entities.some((e) => e.name === "subscriptions")).toBe(true);
    expect(blueprint.analyticsArchitecture.northStarMetric.length).toBeGreaterThan(0);
    expect(blueprint.mvpDefinition.includedFeatures.length).toBeGreaterThanOrEqual(3);
  });

  it("produces valid build graph DAG", () => {
    const blueprint = assembleVentureBlueprint({
      handoff: buildSaasHandoff(),
      simulationOnly: true,
      sourceLineage: {},
    });
    const dag = validateBuildGraphDag(blueprint.buildGraph);
    expect(dag.valid).toBe(true);
    expect(blueprint.buildGraph.tasks.length).toBeGreaterThan(3);
  });

  it("supports complex marketplace capability architecture", () => {
    const blueprint = assembleVentureBlueprint({
      handoff: buildComplexityTestSimulationHandoff("org-1"),
      simulationOnly: true,
      sourceLineage: { opportunityCandidateId: null, validationState: "simulation_capability_test" },
      useComplexMarketplaceCapabilityTest: true,
    });

    const roles = blueprint.productArchitecture.userRoles;
    expect(roles).toEqual(expect.arrayContaining(["artist", "collector", "moderator", "admin"]));
    expect(blueprint.productArchitecture.features.some((f) => /moderation|feed|transaction|storefront/i.test(f.featureName))).toBe(true);
    expect(blueprint.core.ventureType).toBe("creator_marketplace");
  });

  it("evaluates readiness gate and build package status", () => {
    const blueprint = assembleVentureBlueprint({
      handoff: buildSaasHandoff(),
      simulationOnly: true,
      sourceLineage: { opportunityCandidateId: "candidate-saas" },
    });
    const buildPackage = assembleBuildPackage(blueprint, "blueprint-1");
    expect(["READY", "BLOCKED"]).toContain(buildPackage.status);
    expect(buildPackage.simulationOnly).toBe(true);
    expect(buildPackage.readinessReport.checks.length).toBeGreaterThan(0);
  });

  it("flags economics when build cost exceeds envelope", () => {
    const handoff = buildSaasHandoff();
    handoff.budgetEnvelope = { startupCapital: 5000, monthlyOperatingBudget: 500 };
    const blueprint = assembleVentureBlueprint({
      handoff,
      simulationOnly: true,
      sourceLineage: {},
    });
    expect(["WARNING", "FAIL"]).toContain(blueprint.economicGuardrails.complianceResult);
    expect(blueprint.architectureFeedback.some((f) => f.finding !== "NO_MAJOR_CHANGE")).toBe(true);
  });

  it("redacts secrets from blueprint payloads", () => {
    const redacted = redactSecrets("OPENAI_API_KEY=super-secret-key-value");
    expect(redacted).not.toContain("super-secret-key-value");
  });

  it("does not import launch-gateway or production deploy execution modules", () => {
    const root = join(process.cwd(), "lib/infinity/company-builder");
    const files = readdirSync(root, { recursive: true }).filter(
      (file): file is string =>
        typeof file === "string" && file.endsWith(".ts") && !file.includes("__tests__"),
    );
    for (const file of files) {
      const content = readFileSync(join(root, file), "utf8");
      expect(content).not.toMatch(/launch-gateway\/execute-live/);
      expect(content).not.toMatch(/execute-live-launch/);
    }
  });
});
