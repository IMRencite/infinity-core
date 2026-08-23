import { providerCategoryForFamily } from "@/lib/infinity/venture-systems-architecture/selector";
import type { SystemFamily } from "@/lib/infinity/venture-systems-architecture/constants";
import type { VendorProcurementRequirement, VentureSystemRequirement } from "@/lib/infinity/venture-systems-architecture/types";
import { paymentArchitectureKind, paymentsFamilyRequired } from "./bind-contract";
import {
  EXTERNAL_CHANNEL_FAMILIES,
  VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY,
  type BoundVentureSystemsBuildInput,
  type VentureSystemsBuildCoveragePlan,
  type VentureSystemsBuildFailureCode,
  type VentureSystemsCoverageRow,
  type VentureSystemsExternalDependency,
} from "./types";

function vendorForFamily(
  family: SystemFamily,
  vendors: VendorProcurementRequirement[],
): VendorProcurementRequirement | null {
  const category = providerCategoryForFamily(family);
  if (!category) return null;
  return vendors.find((item) => item.providerCategory === category) ?? null;
}

function unknownPaidCost(vendor: VendorProcurementRequirement | null): boolean {
  if (!vendor) return false;
  if (vendor.procurementStatus === "NOT_REQUIRED" || vendor.procurementStatus === "FREE_TIER" || vendor.procurementStatus === "DEFERRED") {
    return false;
  }
  return vendor.monthlyCost.actuality === "UNKNOWN" || vendor.monthlyCost.value == null;
}

function paymentArchitectureMissing(input: BoundVentureSystemsBuildInput): boolean {
  return paymentsFamilyRequired(input.contract) && !paymentArchitectureKind(input.contract);
}

function complianceBlocked(requirement: VentureSystemRequirement, input: BoundVentureSystemsBuildInput): boolean {
  if (requirement.family !== "LEGAL_AND_COMPLIANCE" && requirement.family !== "SECURITY_AND_RISK") return false;
  return (
    requirement.unresolvedPolicies.includes("REGULATED_INDUSTRY_COMPLIANCE") ||
    requirement.unresolvedPolicies.includes("LEGAL_ENTITY_OBLIGATIONS") ||
    input.contract.unresolvedPolicies.some(
      (item) => item.code === "REGULATED_INDUSTRY_COMPLIANCE" || item.code === "LEGAL_ENTITY_OBLIGATIONS",
    )
  );
}

function classifyRequired(
  requirement: VentureSystemRequirement,
  input: BoundVentureSystemsBuildInput,
): Pick<VentureSystemsCoverageRow, "disposition" | "failureCodes" | "reason" | "authorizedForImplementation" | "externalDependency"> {
  const vendor = vendorForFamily(requirement.family, input.contract.vendorProcurementRequirements);
  const failures: VentureSystemsBuildFailureCode[] = [];

  if (requirement.family === "PAYMENTS" && paymentArchitectureMissing(input)) {
    failures.push("VENTURE_SYSTEM_PAYMENT_ARCHITECTURE_MISSING");
    return {
      disposition: "BLOCKED",
      failureCodes: failures,
      reason: "Payments are required but Payment Architecture is absent.",
      authorizedForImplementation: false,
      externalDependency: null,
    };
  }

  if (complianceBlocked(requirement, input)) {
    failures.push("VENTURE_SYSTEM_COMPLIANCE_BLOCKED");
    return {
      disposition: "BLOCKED",
      failureCodes: failures,
      reason: "Unresolved compliance or legal policy blocks implementation.",
      authorizedForImplementation: false,
      externalDependency: null,
    };
  }

  if (requirement.tenancyRequirement === "DEFERRED") {
    return {
      disposition: "DEFERRED",
      failureCodes: [],
      reason: "Canonical architecture deferred this required system.",
      authorizedForImplementation: false,
      externalDependency: null,
    };
  }

  if (unknownPaidCost(vendor)) {
    failures.push("VENTURE_SYSTEM_UNKNOWN_COST");
    const estimatedCost = vendor?.monthlyCost ?? { value: null, actuality: "UNKNOWN" as const, currency: "USD" as const };
    const external: VentureSystemsExternalDependency = {
      systemFamily: requirement.family,
      requiredCapabilities: requirement.requiredCapabilities,
      providerStatus: "UNRESOLVED",
      tenancyRequirement: requirement.tenancyRequirement,
      procurementRequired: true,
      credentialRequired: true,
      writeAuthorityRequired: false,
      estimatedCost,
      costKnown: false,
      blockingStatus: "UNKNOWN_COST",
    };
    return {
      disposition: "BLOCKED",
      failureCodes: failures,
      reason: "Paid provider cost is unknown and must not be treated as zero.",
      authorizedForImplementation: false,
      externalDependency: external,
    };
  }

  const paidProcurement =
    vendor &&
    (vendor.procurementStatus === "BUDGET_REVIEW_REQUIRED" ||
      vendor.procurementStatus === "TREASURY_ELIGIBLE" ||
      vendor.procurementStatus === "LIVE_PURCHASE_GATED");

  if (EXTERNAL_CHANNEL_FAMILIES.includes(requirement.family) || paidProcurement) {
    const estimatedCost = vendor?.monthlyCost ?? { value: null, actuality: "UNKNOWN" as const, currency: "USD" as const };
    const costKnown = estimatedCost.actuality !== "UNKNOWN" && estimatedCost.value != null;
    return {
      disposition: "EXTERNAL_PROVIDER_DEPENDENCY",
      failureCodes: [],
      reason: "Architecture requires this capability as a provider-neutral external dependency, not an invented vendor purchase.",
      authorizedForImplementation: false,
      externalDependency: {
        systemFamily: requirement.family,
        requiredCapabilities: requirement.requiredCapabilities,
        providerStatus: vendor?.providerId ? "CANDIDATE" : "NOT_SELECTED",
        tenancyRequirement: requirement.tenancyRequirement,
        procurementRequired: Boolean(paidProcurement),
        credentialRequired: Boolean(paidProcurement),
        writeAuthorityRequired: false,
        estimatedCost,
        costKnown,
        blockingStatus: paidProcurement ? "PROCUREMENT_REQUIRED" : "NONE",
      },
    };
  }

  return {
    disposition: "INTERNAL_BUILD",
    failureCodes: [],
    reason: requirement.reason,
    authorizedForImplementation: true,
    externalDependency: null,
  };
}

export function planVentureSystemsBuildCoverage(input: BoundVentureSystemsBuildInput): VentureSystemsBuildCoveragePlan {
  const rows: VentureSystemsCoverageRow[] = input.contract.systemRequirements.map((requirement) => {
    if (!requirement.required) {
      const deferred = requirement.tenancyRequirement === "DEFERRED";
      return {
        family: requirement.family,
        required: false,
        disposition: deferred ? "DEFERRED" : "OPTIONAL_EXCLUDED",
        requiredCapabilities: requirement.requiredCapabilities,
        tenancyRequirement: requirement.tenancyRequirement,
        providerNeeded: requirement.providerNeeded,
        externalDependency: null,
        authorizedForImplementation: false,
        failureCodes: [],
        reason: deferred
          ? "System remains deferred until canonical architecture changes."
          : "Optional system excluded from the initial build.",
      };
    }
    const classified = classifyRequired(requirement, input);
    return {
      family: requirement.family,
      required: true,
      disposition: classified.disposition,
      requiredCapabilities: requirement.requiredCapabilities,
      tenancyRequirement: requirement.tenancyRequirement,
      providerNeeded: requirement.providerNeeded,
      externalDependency: classified.externalDependency,
      authorizedForImplementation: classified.authorizedForImplementation,
      failureCodes: classified.failureCodes,
      reason: classified.reason,
    };
  });

  return {
    input,
    rows,
    paymentArchitecture: paymentArchitectureKind(input.contract) ? input.contract.paymentArchitecture : null,
    writeBoundary: VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY,
  };
}

export function coverageHqView(plan: VentureSystemsBuildCoveragePlan) {
  const required = plan.rows.filter((row) => row.required);
  return {
    requiredSystems: required.length,
    plannedInternally: required.filter((row) => row.disposition === "INTERNAL_BUILD").length,
    externalDependencies: required.filter((row) => row.disposition === "EXTERNAL_PROVIDER_DEPENDENCY").length,
    deferred: required.filter((row) => row.disposition === "DEFERRED").length,
    blocked: required.filter((row) => row.disposition === "BLOCKED").length,
    optionalExcluded: plan.rows.filter((row) => row.disposition === "OPTIONAL_EXCLUDED").length,
  };
}
