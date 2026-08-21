import type { ConnectWriteReadinessReport, PaymentArchitectureHqReadModel, PaymentArchitectureSelection } from "../types";

export function buildPaymentArchitectureHqReadModel(
  selection: PaymentArchitectureSelection,
  readiness: ConnectWriteReadinessReport,
): PaymentArchitectureHqReadModel {
  return {
    businessModel: selection.businessModel,
    architecture: selection.selectedArchitecture,
    marketplacePaymentReadiness: readiness.marketplacePaymentReadiness,
    requiredCapabilities: selection.requiredCapabilities,
    unresolvedPolicyDecisions: selection.unresolvedPolicy.map((item) => item.code),
    liveWriteAuthority: false,
  };
}

export function explainPaymentArchitecture(selection: PaymentArchitectureSelection): string {
  const capabilities = selection.requiredCapabilities.join(", ");
  const policy = selection.unresolvedPolicy.length
    ? ` Unresolved policy decisions remain: ${selection.unresolvedPolicy.map((item) => item.code).join(", ")}.`
    : "";
  return `This venture is classified as ${selection.businessModel.toLowerCase().replace(/_/g, " ")} and currently requires ${
    selection.architectureKind === "MARKETPLACE_MULTI_PARTY"
      ? "multi-party marketplace payments"
      : selection.architectureKind.toLowerCase().replace(/_/g, " ")
  }. The selected architecture is ${selection.selectedArchitecture.replace(/_/g, " ")}. Required capabilities: ${capabilities || "none"}. Live write authority is not granted.${policy}`;
}
