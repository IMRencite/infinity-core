import { describe, it, expect } from "vitest";
import { resolveActionType } from "@/lib/infinity/launch-gateway/action-registry";
import { evaluateExternalActionPolicy, evaluateActionCost } from "@/lib/infinity/launch-gateway/policy";
import { isExternalActionsLiveEnabled, evaluateLiveExecutionGates } from "@/lib/infinity/launch-gateway/kill-switch";
import { mockInfinityAdapter } from "@/lib/infinity/launch-gateway/adapters/mock-provider";
import { stablePayloadHash } from "@/lib/infinity/launch-gateway/idempotency";

describe("Launch Gateway Foundation v1", () => {
  it("fail-closes unknown action types", () => {
    const policy = evaluateExternalActionPolicy({
      organizationId: "org",
      actionType: "unknown.action",
      actionDef: null,
      sideEffectClass: null,
      riskClass: null,
      estimatedCost: null,
      maxAuthorizedCost: 50,
      capabilityPermissionGranted: true,
      assemblyInternallyReady: true,
      intent: "simulate",
    });
    expect(policy.outcome).toBe("blocked");
  });

  it("scopes live execute intent to v1 provider actions", () => {
    const def = resolveActionType("hosting.deploy");
    expect(def).toBeTruthy();
    const policy = evaluateExternalActionPolicy({
      organizationId: "org",
      actionType: "hosting.deploy",
      actionDef: def,
      sideEffectClass: def!.sideEffectClass,
      riskClass: "high",
      estimatedCost: 0,
      maxAuthorizedCost: 50,
      capabilityPermissionGranted: true,
      assemblyInternallyReady: true,
      intent: "execute",
    });
    expect(policy.outcome).toBe("execution_eligible");
    const blocked = evaluateExternalActionPolicy({
      organizationId: "org",
      actionType: "domain.register",
      actionDef: resolveActionType("domain.register"),
      sideEffectClass: "irreversible_or_high_risk",
      riskClass: "high",
      estimatedCost: 12,
      maxAuthorizedCost: 50,
      capabilityPermissionGranted: true,
      assemblyInternallyReady: true,
      intent: "execute",
    });
    expect(blocked.outcome).toBe("blocked");
    expect(blocked.reasons).toContain("live_action_out_of_v1_scope");
  });

  it("treats unknown cost as requires approval", () => {
    const cost = evaluateActionCost({
      estimatedCost: null,
      registryDefault: null,
      maxAuthorizedCost: 10,
    });
    expect(cost.gate).toBe("requires_approval");
  });

  it("kill switch defaults false", () => {
    const prev = process.env.EXTERNAL_ACTIONS_LIVE_ENABLED;
    delete process.env.EXTERNAL_ACTIONS_LIVE_ENABLED;
    expect(isExternalActionsLiveEnabled()).toBe(false);
    const gates = evaluateLiveExecutionGates({
      providerLiveEnabled: true,
      policyAllowsExecute: true,
      capabilityPermits: true,
      credentialsValid: true,
      budgetAllows: true,
      approvalAllows: true,
      ventureAllows: true,
    });
    expect(gates.allowed).toBe(false);
    expect(gates.reasons).toContain("global_live_disabled");
    if (prev !== undefined) process.env.EXTERNAL_ACTIONS_LIVE_ENABLED = prev;
  });

  it("mock adapter simulates without network and blocks execute", async () => {
    const ctx = {
      organizationId: "org",
      actionType: "domain.register",
      target: "example.mock",
      payload: {},
      correlationId: null,
    };
    const sim = await mockInfinityAdapter.simulate(ctx);
    expect(sim.simulated).toBe(true);
    expect(sim.externalIds.domain_id).toContain(".mock");
    await expect(mockInfinityAdapter.execute(ctx)).rejects.toThrow(/disabled/);
  });

  it("stable payload hash is deterministic", () => {
    const a = stablePayloadHash({ b: 1, a: 2 });
    const b = stablePayloadHash({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it("denies simulation without capability permission", () => {
    const def = resolveActionType("domain.register");
    const policy = evaluateExternalActionPolicy({
      organizationId: "org",
      actionType: "domain.register",
      actionDef: def,
      sideEffectClass: def!.sideEffectClass,
      riskClass: "high",
      estimatedCost: 12,
      maxAuthorizedCost: 50,
      capabilityPermissionGranted: false,
      assemblyInternallyReady: true,
      intent: "simulate",
    });
    expect(policy.outcome).toBe("blocked");
  });
});
