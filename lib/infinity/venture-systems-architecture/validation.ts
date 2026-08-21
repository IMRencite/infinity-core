import type { VentureSystemRequirement, VentureSystemsBuildContract, VentureSystemsEvidence } from "./types";

export type VentureSystemsValidationGap = {
  code:
    | "AMBIGUOUS_OVERBUILD"
    | "SIMPLE_VENTURE_OVERBUILD"
    | "UNKNOWN_COST_TREATED_AS_ZERO"
    | "LIVE_PURCHASE_AUTHORITY_GRANTED"
    | "CURSOR_CHOOSES_SYSTEMS"
    | "MISSING_PAYMENT_CONTRACT"
    | "HUBSPOT_HARD_CODED";
  message: string;
};

const SIMPLE_FORBIDDEN_WHEN_DIGITAL: VentureSystemRequirement["family"][] = [
  "CRM",
  "SMS",
  "SCHEDULING",
];

export function validateVentureSystems(
  evidence: VentureSystemsEvidence,
  contract: VentureSystemsBuildContract,
): VentureSystemsValidationGap[] {
  const gaps: VentureSystemsValidationGap[] = [];
  if (contract.ventureType === "AMBIGUOUS") {
    const invented = contract.systemRequirements.filter(
      (item) => item.required && item.family !== "LEGAL_AND_COMPLIANCE" && item.family !== "SECURITY_AND_RISK",
    );
    if (invented.length) {
      gaps.push({
        code: "AMBIGUOUS_OVERBUILD",
        message: `Ambiguous ventures must not invent ${invented.map((item) => item.family).join(", ")}`,
      });
    }
  }
  if (contract.ventureType === "DIGITAL_PRODUCT") {
    const extra = contract.systemRequirements.filter((item) => item.required && SIMPLE_FORBIDDEN_WHEN_DIGITAL.includes(item.family));
    if (extra.length) {
      gaps.push({
        code: "SIMPLE_VENTURE_OVERBUILD",
        message: `Simple digital products must not require ${extra.map((item) => item.family).join(", ")}`,
      });
    }
    if (contract.supportArchitecture.complexStackRequired) {
      gaps.push({
        code: "SIMPLE_VENTURE_OVERBUILD",
        message: "Simple digital products must not require a complex support stack",
      });
    }
  }
  for (const item of contract.vendorProcurementRequirements) {
    if (item.monthlyCost.actuality === "UNKNOWN" && item.monthlyCost.value === 0) {
      gaps.push({
        code: "UNKNOWN_COST_TREATED_AS_ZERO",
        message: `${item.providerCategory} unknown cost was coerced to zero`,
      });
    }
    if (item.livePurchaseAuthority) {
      gaps.push({
        code: "LIVE_PURCHASE_AUTHORITY_GRANTED",
        message: `${item.providerCategory} incorrectly granted live purchase authority`,
      });
    }
  }
  if (contract.liveAuthorityRequirements.cursorChoosesSystemsIndependently) {
    gaps.push({
      code: "CURSOR_CHOOSES_SYSTEMS",
      message: "Cursor must consume the systems contract, not choose systems independently",
    });
  }
  if (!contract.paymentArchitecture) {
    gaps.push({ code: "MISSING_PAYMENT_CONTRACT", message: "Payment Architecture contract is required" });
  }
  if (contract.crmArchitecture.required && contract.vendorProcurementRequirements.every((item) => item.providerId === "hubspot")) {
    gaps.push({ code: "HUBSPOT_HARD_CODED", message: "CRM requirement must remain provider-neutral" });
  }
  void evidence;
  return gaps;
}
