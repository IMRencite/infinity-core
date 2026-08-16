import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { validateProductionArtifactForExternalDeploy } from "../build-snapshot-gate";
import { resolveActionType } from "../action-registry";
import { evaluateActionCost } from "../policy";
import { isExternalActionsLiveEnabled } from "../kill-switch";
import {
  isLiveProviderTestMode,
  LIVE_PROVIDER_ACTIONS,
} from "../provider-config";
import { evaluateLiveProviderGates, resolveCredentialFromEnv, resolveProviderForAction } from "../provider-gates";
import { adapterSupportsAction } from "../adapters/registry";
import { hashPayloadManifest } from "../resource-registry";
import {
  AUTONOMOUS_ACTION_RISK,
  AUTONOMOUS_ELIGIBLE_ACTION_TYPES,
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY,
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION,
  type PolicyDecision,
} from "./constants";
import { loadOrganizationAutonomyPolicy } from "./organization-policy";
import {
  loadAutonomousSpendSnapshot,
  wouldExceedAutonomousBudget,
} from "./budget";

const RISK_ORDER = ["low", "moderate", "high", "critical"] as const;

function riskWithinThreshold(actionRisk: string, maxAutoRisk: string): boolean {
  const a = RISK_ORDER.indexOf(actionRisk as (typeof RISK_ORDER)[number]);
  const m = RISK_ORDER.indexOf(maxAutoRisk as (typeof RISK_ORDER)[number]);
  if (a === -1 || m === -1) return false;
  return a <= m;
}

export type AuthorizationEvaluationEvidence = {
  explanations: string[];
  riskClass: string | null;
  sideEffectClass: string | null;
  costEvaluation: Record<string, unknown>;
  capabilityEvaluation: Record<string, unknown>;
  credentialEvaluation: Record<string, unknown>;
  artifactEvaluation: Record<string, unknown>;
  payloadHash: string | null;
};

export type AuthorizationEvaluationResult = {
  decision: PolicyDecision;
  policyKey: string;
  policyVersion: string;
  evidence: AuthorizationEvaluationEvidence;
};

function makeResult(
  decision: PolicyDecision,
  explanations: string[],
  partial: Partial<AuthorizationEvaluationEvidence> & { payloadHash?: string | null },
): AuthorizationEvaluationResult {
  return {
    decision,
    policyKey: AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY,
    policyVersion: AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION,
    evidence: {
      explanations,
      riskClass: partial.riskClass ?? null,
      sideEffectClass: partial.sideEffectClass ?? null,
      costEvaluation: partial.costEvaluation ?? {},
      capabilityEvaluation: partial.capabilityEvaluation ?? {},
      credentialEvaluation: partial.credentialEvaluation ?? {},
      artifactEvaluation: partial.artifactEvaluation ?? {},
      payloadHash: partial.payloadHash ?? null,
    },
  };
}

export async function evaluateAutonomousExternalAuthorization(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    externalActionId: string;
    intent: "simulate" | "execute";
    requestingCapabilityKey: string;
    grantedExternalPermissions: string[];
    correlationId?: string | null;
  },
): Promise<AuthorizationEvaluationResult> {
  const explanations: string[] = [];

  const { data: actionRow } = await admin
    .from("external_actions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.externalActionId)
    .maybeSingle();

  if (!actionRow) {
    explanations.push("block:unknown_external_action");
    return makeResult("BLOCK", explanations, {});
  }
  if (actionRow.mission_id !== input.missionId) {
    explanations.push("block:organization_mission_mismatch");
    return makeResult("BLOCK", explanations, {});
  }

  const actionType = String(actionRow.action_type);
  const payload = (actionRow.payload_manifest ?? {}) as Record<string, unknown>;
  const payloadHash = hashPayloadManifest(payload);
  const def = resolveActionType(actionType);

  if (!def) {
    explanations.push("block:unknown_action_type");
    return makeResult("BLOCK", explanations, { payloadHash });
  }

  const orgPolicy = await loadOrganizationAutonomyPolicy(admin, input.organizationId);

  if (!orgPolicy.externalAutonomyEnabled) {
    explanations.push("escalate:organization_autonomy_disabled");
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
    });
  }

  if (
    orgPolicy.prohibitedActionTypes.includes(actionType) ||
    orgPolicy.humanApprovalActionTypes.includes(actionType)
  ) {
    explanations.push(`escalate:action_type_requires_human:${actionType}`);
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
    });
  }

  if (
    !AUTONOMOUS_ELIGIBLE_ACTION_TYPES.includes(
      actionType as (typeof AUTONOMOUS_ELIGIBLE_ACTION_TYPES)[number],
    )
  ) {
    explanations.push("escalate:action_not_in_autonomous_allowlist");
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
    });
  }

  if (!orgPolicy.allowedActionTypes.includes(actionType)) {
    explanations.push("escalate:action_type_not_allowed_by_org_policy");
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
    });
  }

  const providerKey = resolveProviderForAction(actionType) ?? String(actionRow.adapter_key);
  if (!orgPolicy.allowedProviders.includes(providerKey)) {
    explanations.push("block:provider_not_approved");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }
  if (!adapterSupportsAction(providerKey, actionType)) {
    explanations.push("block:unsupported_provider_action");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }

  const assembly = actionRow.venture_assembly_id
    ? await loadVentureAssemblyById(admin, input.organizationId, String(actionRow.venture_assembly_id))
    : null;

  if (!assembly?.companyId) {
    explanations.push("block:venture_invalid");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }
  if (assembly.status !== "internally_ready") {
    explanations.push("block:assembly_not_internally_ready");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }
  if (assembly.supersededBy) {
    explanations.push("block:assembly_superseded");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }

  if (!actionRow.launch_plan_id) {
    explanations.push("block:launch_plan_missing");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }

  const { data: launchPlan } = await admin
    .from("launch_plans")
    .select("id, status, superseded_by")
    .eq("id", actionRow.launch_plan_id)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!launchPlan || launchPlan.superseded_by) {
    explanations.push("block:launch_plan_invalid_or_superseded");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: def.defaultRisk, sideEffectClass: def.sideEffectClass });
  }

  const approvedArtifactHash = String(
    payload.content_hash ?? payload.artifact_hash ?? payload.snapshot_hash ?? "",
  );
  const productionArtifactId =
    (payload.production_artifact_id as string | undefined) ?? assembly.productionArtifactId ?? null;

  const artifactGate = await validateProductionArtifactForExternalDeploy(admin, {
    organizationId: input.organizationId,
    ventureAssemblyId: assembly.id,
    productionArtifactId,
    buildSnapshotId: assembly.buildSnapshotId,
    approvedArtifactHash: approvedArtifactHash || null,
  });

  const artifactEvaluation = {
    valid: artifactGate.valid,
    reasons: artifactGate.reasons,
    contentHash: artifactGate.contentHash,
    productionArtifactId,
  };

  if (!artifactGate.valid) {
    explanations.push(...artifactGate.reasons.map((r) => `block:${r}`));
    return makeResult("BLOCK", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
      artifactEvaluation,
    });
  }

  const costEval = evaluateActionCost({
    estimatedCost: actionRow.estimated_cost != null ? Number(actionRow.estimated_cost) : null,
    registryDefault: def.estimatedCostUsd,
    maxAuthorizedCost: orgPolicy.maxActionCostUsd,
  });

  const costEvaluation = {
    estimatedCostUsd: costEval.estimatedCost,
    confidence: costEval.confidence,
    gate: costEval.gate,
    withinBudget: costEval.withinBudget,
    maxActionCostUsd: orgPolicy.maxActionCostUsd,
  };

  if (costEval.confidence === "unknown" || costEval.gate === "requires_approval") {
    explanations.push("escalate:unknown_cost_requires_human_approval");
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
      costEvaluation,
      artifactEvaluation,
    });
  }

  if (costEval.estimatedCost > orgPolicy.maxActionCostUsd) {
    explanations.push(
      `escalate:cost_above_threshold:${costEval.estimatedCost}>${orgPolicy.maxActionCostUsd}`,
    );
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
      costEvaluation,
      artifactEvaluation,
    });
  }

  const spend = await loadAutonomousSpendSnapshot(admin, {
    organizationId: input.organizationId,
    ventureId: assembly.companyId,
  });
  if (
    wouldExceedAutonomousBudget({
      spendTodayUsd: spend.spendTodayUsd,
      spendVentureUsd: spend.spendByVentureUsd,
      pendingEstimatedUsd: spend.pendingEstimatedUsd,
      actionCostUsd: costEval.estimatedCost,
      maxDailyCostUsd: orgPolicy.maxDailyCostUsd,
      maxVentureCostUsd: orgPolicy.maxVentureCostUsd,
    })
  ) {
    explanations.push("escalate:aggregate_daily_or_venture_budget_exceeded");
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: def.defaultRisk,
      sideEffectClass: def.sideEffectClass,
      costEvaluation,
      artifactEvaluation,
    });
  }

  const autonomousRisk =
    AUTONOMOUS_ACTION_RISK[actionType as keyof typeof AUTONOMOUS_ACTION_RISK] ?? def.defaultRisk;
  if (!riskWithinThreshold(autonomousRisk, orgPolicy.maxAutoRisk)) {
    explanations.push(`escalate:risk_above_threshold:${autonomousRisk}>${orgPolicy.maxAutoRisk}`);
    return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
      payloadHash,
      riskClass: autonomousRisk,
      sideEffectClass: def.sideEffectClass,
      costEvaluation,
      artifactEvaluation,
    });
  }

  const permissionOk =
    !def.requiredPermission || input.grantedExternalPermissions.includes(def.requiredPermission);
  const capabilityEvaluation = {
    capability: input.requestingCapabilityKey,
    permissionGranted: permissionOk,
    requiredPermission: def.requiredPermission,
  };
  if (!permissionOk) {
    explanations.push("block:missing_required_capability");
    return makeResult("BLOCK", explanations, {
      payloadHash,
      riskClass: autonomousRisk,
      sideEffectClass: def.sideEffectClass,
      capabilityEvaluation,
    });
  }

  const cred = resolveCredentialFromEnv(providerKey);
  const credentialEvaluation = { valid: cred.valid, reference: cred.reference };
  if (input.intent === "execute" && !cred.valid) {
    explanations.push("block:credentials_invalid");
    return makeResult("BLOCK", explanations, {
      payloadHash,
      riskClass: autonomousRisk,
      sideEffectClass: def.sideEffectClass,
      credentialEvaluation,
    });
  }

  if (input.intent === "execute") {
    if (!isExternalActionsLiveEnabled()) {
      explanations.push("block:global_live_disabled");
      return makeResult("BLOCK", explanations, { payloadHash, riskClass: autonomousRisk, sideEffectClass: def.sideEffectClass });
    }
    if (!orgPolicy.controlledDevelopmentOrg) {
      explanations.push("escalate:live_autonomy_outside_controlled_org");
      return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
        payloadHash,
        riskClass: autonomousRisk,
        sideEffectClass: def.sideEffectClass,
        costEvaluation,
        artifactEvaluation,
      });
    }
    if (!isLiveProviderTestMode()) {
      explanations.push("escalate:live_autonomy_requires_test_mode");
      return makeResult("REQUIRE_HUMAN_APPROVAL", explanations, {
        payloadHash,
        riskClass: autonomousRisk,
        sideEffectClass: def.sideEffectClass,
        costEvaluation,
        artifactEvaluation,
      });
    }

    const liveGates = evaluateLiveProviderGates({
      actionType: actionType as (typeof LIVE_PROVIDER_ACTIONS)[number],
      providerKey,
      capabilityPermits: permissionOk,
      policyAllowsExecute: true,
      budgetAllows: costEval.withinBudget,
      approvalAllows: true,
      credentialValid: cred.valid,
      assemblyInternallyReady: true,
      launchPlanApproved: true,
      idempotencyValid: true,
      buildSnapshotValid: true,
      productionArtifactValid: artifactGate.valid,
      organizationValid: true,
      ventureValid: true,
      registeredAction: true,
      providerSupportsAction: true,
    });
    if (!liveGates.allowed) {
      const decision = liveGates.reasons.some((r) =>
        ["credentials_invalid", "build_snapshot_invalid", "production_artifact_invalid"].includes(r),
      )
        ? "BLOCK"
        : "REQUIRE_HUMAN_APPROVAL";
      explanations.push(...liveGates.reasons.map((r) => `${decision === "BLOCK" ? "block" : "escalate"}:${r}`));
      return makeResult(decision, explanations, {
        payloadHash,
        riskClass: autonomousRisk,
        sideEffectClass: def.sideEffectClass,
        costEvaluation,
        artifactEvaluation,
        credentialEvaluation,
      });
    }
  }

  if (actionRow.approved_payload_hash && actionRow.approved_payload_hash !== payloadHash) {
    explanations.push("block:payload_hash_mismatch");
    return makeResult("BLOCK", explanations, { payloadHash, riskClass: autonomousRisk, sideEffectClass: def.sideEffectClass });
  }

  explanations.push("action_allowed");
  explanations.push(`risk_${autonomousRisk}_within_${orgPolicy.maxAutoRisk}`);
  explanations.push(`cost_${costEval.estimatedCost}_within_${orgPolicy.maxActionCostUsd}`);
  explanations.push("provider_approved");
  explanations.push("artifact_verified");
  explanations.push("capability_authorized");
  explanations.push("payload_immutable");
  if (input.intent === "execute") {
    explanations.push("launch_test_mode_active");
  }

  return makeResult("AUTO_AUTHORIZE", explanations, {
    payloadHash,
    riskClass: autonomousRisk,
    sideEffectClass: def.sideEffectClass,
    costEvaluation,
    capabilityEvaluation,
    credentialEvaluation,
    artifactEvaluation,
  });
}
