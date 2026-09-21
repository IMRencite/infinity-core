export type RuntimeCostObservability = {
  founderRuntimeCeilingUsd: number | null;
  providerNativeCostTelemetryAvailable: false;
  automaticDollarThresholdEnforcementPossible: false;
  runtimeCostObservabilityLimited: true;
  status: "RUNTIME_COST_OBSERVABILITY_LIMITED";
  reason: string;
};

export function inspectRuntimeCostObservability(input: {
  founderRuntimeCeilingUsd?: number | null;
} = {}): RuntimeCostObservability {
  return {
    founderRuntimeCeilingUsd: input.founderRuntimeCeilingUsd ?? null,
    providerNativeCostTelemetryAvailable: false,
    automaticDollarThresholdEnforcementPossible: false,
    runtimeCostObservabilityLimited: true,
    status: "RUNTIME_COST_OBSERVABILITY_LIMITED",
    reason:
      "A founder-approved runtime ceiling may exist as an authorization boundary, but provider-native continuous cost telemetry is unavailable. Infinity cannot claim automatic hard-stop-on-dollar-threshold enforcement from data it cannot observe.",
  };
}
