import { describe, it, expect, beforeEach } from "vitest";
import { evaluateLiveProviderGates } from "@/lib/infinity/launch-gateway/provider-gates";
import { PROVIDER_KEYS } from "@/lib/infinity/launch-gateway/provider-config";
import { redactUnknown, assertNoSecretsInPayload } from "@/lib/infinity/launch-gateway/redaction";

describe("Live Provider Adapter Foundation v1", () => {
  const baseGates = {
    actionType: "repository.create" as const,
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
  };

  beforeEach(() => {
    delete process.env.EXTERNAL_ACTIONS_LIVE_ENABLED;
    delete process.env.GITHUB_LIVE_ENABLED;
    delete process.env.VERCEL_LIVE_ENABLED;
    delete process.env.LIVE_PROVIDER_TEST_MODE;
  });

  it("fail-closes when global live disabled", () => {
    const result = evaluateLiveProviderGates(baseGates);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("global_live_disabled");
  });

  it("fail-closes when all flags set but test mode missing", () => {
    process.env.EXTERNAL_ACTIONS_LIVE_ENABLED = "true";
    process.env.GITHUB_LIVE_ENABLED = "true";
    process.env.LIVE_PROVIDER_TEST_MODE = "false";
    const result = evaluateLiveProviderGates(baseGates);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("live_provider_test_mode_required");
  });

  it("still requires provider live flag", () => {
    process.env.EXTERNAL_ACTIONS_LIVE_ENABLED = "true";
    process.env.LIVE_PROVIDER_TEST_MODE = "true";
    const result = evaluateLiveProviderGates(baseGates);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("provider_live_disabled");
  });

  it("redacts fake secrets from nested payloads", () => {
    const fake = {
      note: "ok",
      token: "ghp_FAKESECRET1234567890123456789012345678",
      nested: { api_key: "sk-live-FAKESECRET999999999999999999" },
    };
    const redacted = redactUnknown(fake) as Record<string, unknown>;
    expect(JSON.stringify(redacted)).not.toContain("ghp_FAKE");
    expect(JSON.stringify(redacted)).not.toContain("sk-live-FAKE");
    expect(() => assertNoSecretsInPayload(fake)).toThrow();
  });
});
