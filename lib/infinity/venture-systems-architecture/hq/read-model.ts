import { catalogProviderCandidates } from "../provider-capabilities";
import { sumKnownRecurringCost } from "../vendor-procurement";
import type { VentureSystemsBuildContract, VentureSystemsHqReadModel } from "../types";

export function buildVentureSystemsHqReadModel(contract: VentureSystemsBuildContract): VentureSystemsHqReadModel {
  const requiredSystems = contract.systemRequirements.filter((item) => item.required).map((item) => item.family);
  const missingSystems = contract.systemRequirements.filter((item) => !item.required && item.priority !== "OPTIONAL").map((item) => item.family);
  return {
    businessSystemBlueprint: `${contract.businessModel} operating system with ${requiredSystems.join(", ") || "no extra systems"}`,
    requiredSystems,
    missingSystems,
    providerCandidates: [
      ...catalogProviderCandidates("CRM"),
      ...catalogProviderCandidates("EMAIL"),
      ...catalogProviderCandidates("SMS"),
      ...catalogProviderCandidates("ANALYTICS"),
      ...catalogProviderCandidates("SUPPORT"),
    ],
    tenancyStrategy: contract.providerTenancy,
    paidProviderRequirements: contract.vendorProcurementRequirements.filter(
      (item) => item.procurementStatus !== "NOT_REQUIRED" && item.procurementStatus !== "FREE_TIER" && item.procurementStatus !== "DEFERRED",
    ),
    estimatedRecurringSoftwareCost: sumKnownRecurringCost(contract.vendorProcurementRequirements.map((item) => item.monthlyCost)),
    unresolvedPolicyGaps: contract.unresolvedPolicies.map((item) => item.code),
    liveProvisioningAuthority: false,
  };
}

export function explainVentureSystems(contract: VentureSystemsBuildContract): string {
  const required = contract.systemRequirements.filter((item) => item.required).map((item) => item.family);
  const crm = contract.crmArchitecture.required ? " A CRM is required, without selecting HubSpot." : " A full CRM is not required.";
  const tenancy = ` Provider tenancy is ${contract.providerTenancy.replace(/_/g, " ").toLowerCase()}.`;
  const live = " Live provisioning authority is not granted.";
  return `This venture is classified as ${contract.businessModel.toLowerCase().replace(/_/g, " ")}. Required systems: ${required.join(", ") || "none"}.${crm}${tenancy}${live}`;
}
