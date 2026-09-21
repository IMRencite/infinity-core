export const REPOSITORY_TYPE_HEALTH_GATE = "RepositoryTypeHealthGate" as const;
export const PRODUCTION_BUILD_HEALTH_GATE = "ProductionBuildHealthGate" as const;
export const CHANGED_MODULE_TYPE_SAFETY_GATE = "ChangedModuleTypeSafetyGate" as const;

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
