import type { RiskClass, SideEffectClass } from "./constants";

export type ActionTypeDefinition = {
  actionType: string;
  sideEffectClass: SideEffectClass;
  defaultRisk: RiskClass;
  estimatedCostUsd: number | null;
  requiredPermission: string | null;
  supportsRollback: boolean;
  retryable: boolean;
  credentialScope: string | null;
};

export const ACTION_TYPE_REGISTRY_V1: Record<string, ActionTypeDefinition> = {
  "domain.search": {
    actionType: "domain.search",
    sideEffectClass: "read_only",
    defaultRisk: "low",
    estimatedCostUsd: 0,
    requiredPermission: "network.read",
    supportsRollback: true,
    retryable: true,
    credentialScope: null,
  },
  "domain.register": {
    actionType: "domain.register",
    sideEffectClass: "irreversible_or_high_risk",
    defaultRisk: "high",
    estimatedCostUsd: 12,
    requiredPermission: "domain.register",
    supportsRollback: false,
    retryable: false,
    credentialScope: "domain.registrar",
  },
  "hosting.create_project": {
    actionType: "hosting.create_project",
    sideEffectClass: "external_account_change",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "network.write",
    supportsRollback: true,
    retryable: true,
    credentialScope: "hosting.provider",
  },
  "hosting.deploy": {
    actionType: "hosting.deploy",
    sideEffectClass: "public_publish",
    defaultRisk: "high",
    estimatedCostUsd: 0,
    requiredPermission: "publish.website",
    supportsRollback: true,
    retryable: false,
    credentialScope: "hosting.provider",
  },
  "repository.create": {
    actionType: "repository.create",
    sideEffectClass: "external_account_change",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "repository.create",
    supportsRollback: false,
    retryable: false,
    credentialScope: "git.provider",
  },
  "repository.push": {
    actionType: "repository.push",
    sideEffectClass: "reversible_external",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "repository.create",
    supportsRollback: false,
    retryable: true,
    credentialScope: "git.provider",
  },
  "hosting.verify_deployment": {
    actionType: "hosting.verify_deployment",
    sideEffectClass: "read_only",
    defaultRisk: "low",
    estimatedCostUsd: 0,
    requiredPermission: "publish.website",
    supportsRollback: false,
    retryable: true,
    credentialScope: "hosting.provider",
  },
  "dns.configure": {
    actionType: "dns.configure",
    sideEffectClass: "reversible_external",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "network.write",
    supportsRollback: true,
    retryable: true,
    credentialScope: "dns.provider",
  },
  "analytics.configure": {
    actionType: "analytics.configure",
    sideEffectClass: "reversible_external",
    defaultRisk: "low",
    estimatedCostUsd: 0,
    requiredPermission: "network.write",
    supportsRollback: true,
    retryable: true,
    credentialScope: "analytics.provider",
  },
};

export function resolveActionType(actionType: string): ActionTypeDefinition | null {
  return ACTION_TYPE_REGISTRY_V1[actionType] ?? null;
}

export function classifyRisk(def: ActionTypeDefinition, estimatedCost: number | null): RiskClass {
  if (def.defaultRisk === "critical") return "critical";
  if (def.sideEffectClass === "financial" || def.sideEffectClass === "legal_identity") {
    return "critical";
  }
  if (def.sideEffectClass === "irreversible_or_high_risk" || def.sideEffectClass === "public_publish") {
    return estimatedCost && estimatedCost > 100 ? "critical" : "high";
  }
  if (def.sideEffectClass === "external_account_change") return "moderate";
  return def.defaultRisk;
}
