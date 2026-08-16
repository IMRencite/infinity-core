import type { PolicyOutcome, RiskClass, SideEffectClass } from "./constants";
import { LAUNCH_GATEWAY_POLICY_VERSION } from "./constants";
import type { ActionTypeDefinition } from "./action-registry";
import { LIVE_PROVIDER_ACTIONS, type LiveProviderAction } from "./provider-config";

export type PolicyEvaluationInput = {
  organizationId: string;
  actionType: string;
  actionDef: ActionTypeDefinition | null;
  sideEffectClass: SideEffectClass | null;
  riskClass: RiskClass | null;
  estimatedCost: number | null;
  maxAuthorizedCost: number;
  capabilityPermissionGranted: boolean;
  assemblyInternallyReady: boolean;
  intent: "simulate" | "execute";
};

export type PolicyEvaluationResult = {
  outcome: PolicyOutcome;
  reasons: string[];
  policyVersion: string;
};

export function evaluateExternalActionPolicy(
  input: PolicyEvaluationInput,
): PolicyEvaluationResult {
  const reasons: string[] = [];

  if (!input.actionDef || !input.sideEffectClass || !input.riskClass) {
    return {
      outcome: "blocked",
      reasons: ["unknown_action_type"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  if (!input.assemblyInternallyReady) {
    return {
      outcome: "blocked",
      reasons: ["venture_assembly_not_internally_ready"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  if (!input.capabilityPermissionGranted) {
    return {
      outcome: "blocked",
      reasons: ["capability_external_permission_denied"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  if (input.estimatedCost === null && input.actionDef.estimatedCostUsd === null) {
    return {
      outcome: "requires_approval",
      reasons: ["unknown_cost_requires_approval"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  const cost = input.estimatedCost ?? input.actionDef.estimatedCostUsd ?? 0;
  if (cost > input.maxAuthorizedCost) {
    return {
      outcome: "blocked",
      reasons: ["cost_above_authorization"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  if (input.intent === "execute") {
    if (!LIVE_PROVIDER_ACTIONS.includes(input.actionType as LiveProviderAction)) {
      return {
        outcome: "blocked",
        reasons: ["live_action_out_of_v1_scope"],
        policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
      };
    }
    return {
      outcome: "execution_eligible",
      reasons: ["live_provider_v1_scope_pending_gates"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  if (input.riskClass === "critical" || input.sideEffectClass === "irreversible_or_high_risk") {
    return {
      outcome: "allow_simulation",
      reasons: ["simulation_only_high_risk"],
      policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
    };
  }

  if (cost > 0) {
    reasons.push("non_zero_cost_simulation_auto_approved");
  }

  return {
    outcome: "allow_simulation",
    reasons: reasons.length ? reasons : ["simulation_permitted"],
    policyVersion: LAUNCH_GATEWAY_POLICY_VERSION,
  };
}

export type CostEvaluationResult = {
  estimatedCost: number;
  currency: string;
  confidence: "known" | "estimated" | "unknown";
  withinBudget: boolean;
  gate: "zero_cost" | "within_pre_approved" | "requires_approval" | "blocked";
};

export function evaluateActionCost(input: {
  estimatedCost: number | null;
  registryDefault: number | null;
  maxAuthorizedCost: number;
}): CostEvaluationResult {
  if (input.estimatedCost === null && input.registryDefault === null) {
    return {
      estimatedCost: 0,
      currency: "USD",
      confidence: "unknown",
      withinBudget: false,
      gate: "requires_approval",
    };
  }
  const cost = input.estimatedCost ?? input.registryDefault ?? 0;
  if (cost === 0) {
    return {
      estimatedCost: 0,
      currency: "USD",
      confidence: "known",
      withinBudget: true,
      gate: "zero_cost",
    };
  }
  if (cost <= input.maxAuthorizedCost) {
    return {
      estimatedCost: cost,
      currency: "USD",
      confidence: input.estimatedCost !== null ? "estimated" : "known",
      withinBudget: true,
      gate: "within_pre_approved",
    };
  }
  return {
    estimatedCost: cost,
    currency: "USD",
    confidence: "estimated",
    withinBudget: false,
    gate: "blocked",
  };
}
