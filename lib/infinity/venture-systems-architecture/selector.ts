import { BUILD_DEPENDENCY_ORDER, type ProviderCategory, type SystemFamily } from "./constants";
import { classifyVentureOperatingModel } from "./classifier";
import { dedicatedRequiredForTenancy, selectTenancyStrategy } from "./provider-tenancy";
import { cheapestAdequateQuote, mergeQuotes } from "./provider-capabilities";
import { requirementsForOperatingModel, unresolvedPoliciesForEvidence } from "./requirements";
import { familyPriorityRank } from "./system-families";
import { buildProviderRequirement, buildVendorProcurement } from "./vendor-procurement";
import type {
  BuildDependencyNode,
  VentureProviderRequirement,
  VentureSystemRequirement,
  VentureSystemsEvidence,
  VendorProcurementRequirement,
} from "./types";

const FAMILY_PROVIDER_CATEGORY: Partial<Record<SystemFamily, ProviderCategory>> = {
  CRM: "CRM",
  TRANSACTIONAL_EMAIL: "EMAIL",
  MARKETING_EMAIL: "EMAIL",
  SMS: "SMS",
  ANALYTICS: "ANALYTICS",
  ATTRIBUTION: "ANALYTICS",
  CUSTOMER_SUPPORT: "SUPPORT",
  SCHEDULING: "SCHEDULING",
  PAYMENTS: "PAYMENTS",
  SEO: "SEO",
  IDENTITY_AND_ACCOUNTS: "IDENTITY",
};

export function overlayTenancy(
  requirements: VentureSystemRequirement[],
  evidence: VentureSystemsEvidence,
): VentureSystemRequirement[] {
  return requirements.map((requirement) => {
    const category = FAMILY_PROVIDER_CATEGORY[requirement.family];
    const quotes = category ? mergeQuotes(category, evidence.providerQuotes) : [];
    const quote = cheapestAdequateQuote(quotes);
    const tenancy = selectTenancyStrategy({
      stage: evidence.ventureStage ?? "EXPERIMENTAL",
      sensitivity: evidence.regulatedIndustry ? "REGULATED" : (evidence.dataSensitivity ?? "STANDARD"),
      spinoutLikelihood: evidence.spinoutLikelihood,
      dedicatedIsolationValuable: evidence.dedicatedIsolationValuable,
      paidMonthlyCostUsd: quote?.estimatedMonthlyCostUsd ?? null,
      freeAlternativeExists: quotes.some((item) => item.freeTierAdequate),
      expectedScale: evidence.expectedScale,
    });
    return { ...requirement, tenancyRequirement: requirement.providerNeeded ? tenancy : "DEFERRED" };
  });
}

export function buildDependencyGraph(requirements: VentureSystemRequirement[]): BuildDependencyNode[] {
  const required = new Set(requirements.filter((item) => item.required).map((item) => item.family));
  const byFamily = new Map(requirements.map((item) => [item.family, item]));
  return BUILD_DEPENDENCY_ORDER.filter((family) => required.has(family)).map((family) => {
    const declared = byFamily.get(family)?.dependencies ?? [];
    const index = BUILD_DEPENDENCY_ORDER.indexOf(family);
    const implicit = BUILD_DEPENDENCY_ORDER.slice(0, index).filter((item) => required.has(item));
    const dependsOn = [...new Set([...declared, ...implicit])].filter((item) => item !== family && required.has(item));
    return { family, dependsOn };
  });
}

export function selectVentureSystems(evidence: VentureSystemsEvidence): {
  operatingModel: ReturnType<typeof classifyVentureOperatingModel>;
  requirements: VentureSystemRequirement[];
  unresolvedPolicies: ReturnType<typeof unresolvedPoliciesForEvidence>;
  providerRequirements: VentureProviderRequirement[];
  vendorProcurement: VendorProcurementRequirement[];
  tenancy: ReturnType<typeof selectTenancyStrategy>;
  buildDependencies: BuildDependencyNode[];
} {
  const operatingModel = classifyVentureOperatingModel(evidence);
  const requirements = overlayTenancy(requirementsForOperatingModel(evidence), evidence).sort(
    (a, b) => familyPriorityRank(a.family) - familyPriorityRank(b.family),
  );
  const unresolvedPolicies = unresolvedPoliciesForEvidence(evidence);
  const providerRequirements: VentureProviderRequirement[] = [];
  const vendorProcurement: VendorProcurementRequirement[] = [];

  for (const requirement of requirements.filter((item) => item.required && item.providerNeeded)) {
    const category = FAMILY_PROVIDER_CATEGORY[requirement.family];
    if (!category) continue;
    const quotes = mergeQuotes(category, evidence.providerQuotes);
    const quote = cheapestAdequateQuote(quotes);
    providerRequirements.push(
      buildProviderRequirement({
        evidence,
        category,
        requiredCapabilities: requirement.requiredCapabilities,
        quote,
        reason: requirement.reason,
      }),
    );
    vendorProcurement.push(
      buildVendorProcurement({
        evidence,
        category,
        required: true,
        requiredCapabilities: requirement.requiredCapabilities,
        expectedValue: requirement.reason,
      }),
    );
  }

  const tenancy = selectTenancyStrategy({
    stage: evidence.ventureStage ?? "EXPERIMENTAL",
    sensitivity: evidence.regulatedIndustry ? "REGULATED" : (evidence.dataSensitivity ?? "STANDARD"),
    spinoutLikelihood: evidence.spinoutLikelihood,
    dedicatedIsolationValuable: evidence.dedicatedIsolationValuable,
    paidMonthlyCostUsd: vendorProcurement.find((item) => item.monthlyCost.value != null && item.monthlyCost.value > 0)?.monthlyCost.value ?? null,
    freeAlternativeExists: vendorProcurement.some((item) => item.procurementStatus === "FREE_TIER"),
    expectedScale: evidence.expectedScale,
  });

  if (dedicatedRequiredForTenancy(tenancy) && unresolvedPolicies.every((item) => item.code !== "PROVIDER_TENANCY_POLICY")) {
    // Tenancy is resolved by stage/sensitivity, not left as an automatic HubSpot decision.
  }

  return {
    operatingModel,
    requirements,
    unresolvedPolicies,
    providerRequirements,
    vendorProcurement,
    tenancy,
    buildDependencies: buildDependencyGraph(requirements),
  };
}
