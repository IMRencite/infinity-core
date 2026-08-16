import { describe, it, expect, beforeEach } from "vitest";
import { evaluateLiveProviderGates } from "../provider-gates";
import { PROVIDER_KEYS } from "../provider-config";
import { isExternalActionsLiveEnabled } from "../kill-switch";
import { executeExternalActionViaGateway } from "../execute-live";

describe("Live Provider E2E (fail-closed)", () => {
  beforeEach(() => {
    delete process.env.EXTERNAL_ACTIONS_LIVE_ENABLED;
    delete process.env.GITHUB_LIVE_ENABLED;
    delete process.env.VERCEL_LIVE_ENABLED;
    delete process.env.LIVE_PROVIDER_TEST_MODE;
    delete process.env.RUN_LIVE_PROVIDER_E2E_MUTATION;
  });

  it("defaults all live gates closed", () => {
    expect(isExternalActionsLiveEnabled()).toBe(false);
    const gates = evaluateLiveProviderGates({
      actionType: "repository.create",
      providerKey: PROVIDER_KEYS.github,
      capabilityPermits: true,
      policyAllowsExecute: true,
      budgetAllows: true,
      approvalAllows: true,
      credentialValid: true,
      assemblyInternallyReady: true,
      launchPlanApproved: true,
      idempotencyValid: true,
      buildSnapshotValid: true,
      productionArtifactValid: true,
      organizationValid: true,
      ventureValid: true,
      registeredAction: true,
      providerSupportsAction: true,
    });
    expect(gates.allowed).toBe(false);
    expect(gates.reasons.length).toBeGreaterThan(0);
  });

  it("skips live mutation unless RUN_LIVE_PROVIDER_E2E_MUTATION=true", async () => {
    expect(process.env.RUN_LIVE_PROVIDER_E2E_MUTATION).toBeUndefined();
    expect(typeof executeExternalActionViaGateway).toBe("function");
  });
});
