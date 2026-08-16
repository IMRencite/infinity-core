export function isExternalActionsLiveEnabled(): boolean {
  const raw = process.env.EXTERNAL_ACTIONS_LIVE_ENABLED;
  if (raw === undefined || raw === "") return false;
  return raw === "true" || raw === "1";
}

export type LiveExecutionGateResult = {
  allowed: false;
  reasons: string[];
};

export function evaluateLiveExecutionGates(input: {
  providerLiveEnabled: boolean;
  policyAllowsExecute: boolean;
  capabilityPermits: boolean;
  credentialsValid: boolean;
  budgetAllows: boolean;
  approvalAllows: boolean;
  ventureAllows: boolean;
}): LiveExecutionGateResult {
  const reasons: string[] = [];
  if (!isExternalActionsLiveEnabled()) {
    reasons.push("global_live_disabled");
  }
  if (!input.providerLiveEnabled) reasons.push("provider_live_disabled");
  if (!input.policyAllowsExecute) reasons.push("policy_blocks_execute");
  if (!input.capabilityPermits) reasons.push("capability_permission_denied");
  if (!input.credentialsValid) reasons.push("credentials_invalid");
  if (!input.budgetAllows) reasons.push("budget_exceeded");
  if (!input.approvalAllows) reasons.push("approval_missing");
  if (!input.ventureAllows) reasons.push("venture_state_blocks");

  return { allowed: false, reasons };
}

/** v1: live execution is always blocked regardless of flags. */
export function assertLiveExecutionBlockedV1(): void {
  const gates = evaluateLiveExecutionGates({
    providerLiveEnabled: false,
    policyAllowsExecute: false,
    capabilityPermits: false,
    credentialsValid: false,
    budgetAllows: false,
    approvalAllows: false,
    ventureAllows: false,
  });
  if (gates.reasons.length === 0) {
    throw new Error("Live execution gate invariant violated");
  }
}
