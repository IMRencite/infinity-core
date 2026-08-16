import { isExternalActionsLiveEnabled } from "./kill-switch";
import {
  isGithubLiveEnabled,
  isVercelLiveEnabled,
  isLiveProviderTestMode,
  PROVIDER_KEYS,
  GITHUB_TOKEN_ENV,
  VERCEL_TOKEN_ENV,
} from "./provider-config";
import type { LiveProviderAction } from "./provider-config";

export type LiveGateEvaluation = {
  allowed: boolean;
  reasons: string[];
};

export function resolveProviderForAction(actionType: string): string | null {
  if (actionType.startsWith("repository.")) return PROVIDER_KEYS.github;
  if (actionType.startsWith("hosting.")) return PROVIDER_KEYS.vercel;
  if (actionType === "hosting.verify_deployment") return PROVIDER_KEYS.vercel;
  return null;
}

export function isProviderLiveEnabled(providerKey: string): boolean {
  if (providerKey === PROVIDER_KEYS.github) return isGithubLiveEnabled();
  if (providerKey === PROVIDER_KEYS.vercel) return isVercelLiveEnabled();
  return false;
}

export function evaluateLiveProviderGates(input: {
  actionType: LiveProviderAction;
  providerKey: string;
  capabilityPermits: boolean;
  policyAllowsExecute: boolean;
  budgetAllows: boolean;
  approvalAllows: boolean;
  credentialValid: boolean;
  assemblyInternallyReady: boolean;
  launchPlanApproved: boolean;
  idempotencyValid: boolean;
  buildSnapshotValid: boolean;
  productionArtifactValid: boolean;
  vercelDeploymentReadinessValid?: boolean;
  organizationValid: boolean;
  ventureValid: boolean;
  registeredAction: boolean;
  providerSupportsAction: boolean;
}): LiveGateEvaluation {
  const reasons: string[] = [];

  if (!isExternalActionsLiveEnabled()) reasons.push("global_live_disabled");
  if (!isProviderLiveEnabled(input.providerKey)) reasons.push("provider_live_disabled");
  if (!input.registeredAction) reasons.push("action_not_registered");
  if (!input.providerSupportsAction) reasons.push("provider_unsupported_action");
  if (!input.capabilityPermits) reasons.push("capability_permission_denied");
  if (!input.organizationValid) reasons.push("organization_invalid");
  if (!input.ventureValid) reasons.push("venture_invalid");
  if (!input.assemblyInternallyReady) reasons.push("assembly_not_internally_ready");
  if (!input.launchPlanApproved) reasons.push("launch_plan_not_ready");
  if (!input.policyAllowsExecute) reasons.push("policy_blocks_execute");
  if (!input.budgetAllows) reasons.push("budget_exceeded");
  if (!input.approvalAllows) reasons.push("live_approval_missing");
  if (!input.credentialValid) reasons.push("credentials_invalid");
  if (!input.idempotencyValid) reasons.push("idempotency_invalid");
  if (!input.buildSnapshotValid) reasons.push("build_snapshot_invalid");
  if (!input.productionArtifactValid) reasons.push("production_artifact_invalid");
  if (
    input.actionType === "hosting.deploy" &&
    input.vercelDeploymentReadinessValid === false
  ) {
    reasons.push("vercel_deployment_readiness_blocked");
  }

  if (!isLiveProviderTestMode() && reasons.length === 0) {
    reasons.push("live_provider_test_mode_required");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function resolveCredentialFromEnv(providerKey: string): {
  valid: boolean;
  reference: string;
} {
  if (providerKey === PROVIDER_KEYS.github) {
    const token = process.env[GITHUB_TOKEN_ENV];
    return {
      valid: Boolean(token && token.length > 10),
      reference: "env:GITHUB_TOKEN",
    };
  }
  if (providerKey === PROVIDER_KEYS.vercel) {
    const token = process.env[VERCEL_TOKEN_ENV];
    return {
      valid: Boolean(token && token.length > 10),
      reference: "env:VERCEL_TOKEN",
    };
  }
  return { valid: false, reference: "unknown" };
}
