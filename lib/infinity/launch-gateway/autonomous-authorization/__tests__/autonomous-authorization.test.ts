import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTONOMOUS_ELIGIBLE_ACTION_TYPES,
  AUTONOMOUS_ACTION_RISK,
  parseAutonomousCostEnv,
  AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_ENV,
} from "@/lib/infinity/launch-gateway/autonomous-authorization/constants";
import { wouldExceedAutonomousBudget } from "@/lib/infinity/launch-gateway/autonomous-authorization/budget";
import { evaluateActionCost } from "@/lib/infinity/launch-gateway/policy";
import { hashPayloadManifest } from "@/lib/infinity/launch-gateway/resource-registry";

describe("Autonomous External Action Authorization v1", () => {
  beforeEach(() => {
    delete process.env[AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_ENV];
  });

  it("allowlists only repository/hosting v1 actions", () => {
    expect(AUTONOMOUS_ELIGIBLE_ACTION_TYPES).toContain("repository.create");
    expect(AUTONOMOUS_ELIGIBLE_ACTION_TYPES).toContain("hosting.verify_deployment");
    expect(AUTONOMOUS_ELIGIBLE_ACTION_TYPES).not.toContain("domain.register");
  });

  it("assigns deterministic autonomous risk (not worker-selected)", () => {
    expect(AUTONOMOUS_ACTION_RISK["hosting.deploy"]).toBe("moderate");
    expect(AUTONOMOUS_ACTION_RISK["hosting.verify_deployment"]).toBe("low");
  });

  it("defaults autonomous max action cost to 0 USD", () => {
    expect(parseAutonomousCostEnv(AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_ENV, 0)).toBe(0);
  });

  it("requires human approval for unknown cost", () => {
    const cost = evaluateActionCost({
      estimatedCost: null,
      registryDefault: null,
      maxAuthorizedCost: 0,
    });
    expect(cost.gate).toBe("requires_approval");
    expect(cost.confidence).toBe("unknown");
  });

  it("requires human approval for non-zero cost under zero threshold", () => {
    const cost = evaluateActionCost({
      estimatedCost: 15,
      registryDefault: null,
      maxAuthorizedCost: 0,
    });
    expect(cost.withinBudget).toBe(false);
  });

  it("enforces aggregate daily budget at zero", () => {
    expect(
      wouldExceedAutonomousBudget({
        spendTodayUsd: 0,
        spendVentureUsd: 0,
        pendingEstimatedUsd: 0,
        actionCostUsd: 1,
        maxDailyCostUsd: 0,
        maxVentureCostUsd: 0,
      }),
    ).toBe(true);
  });

  it("invalidates authorization when payload hash changes", () => {
    const a = hashPayloadManifest({ production_artifact_id: "1", content_hash: "abc" });
    const b = hashPayloadManifest({ production_artifact_id: "1", content_hash: "def" });
    expect(a).not.toBe(b);
  });

  it("domain.register is outside autonomous allowlist", () => {
    expect(AUTONOMOUS_ELIGIBLE_ACTION_TYPES.includes("domain.register" as never)).toBe(false);
  });

  it("email.send is outside autonomous allowlist", () => {
    expect(AUTONOMOUS_ELIGIBLE_ACTION_TYPES.includes("email.send" as never)).toBe(false);
  });

  it("purchase.create is outside autonomous allowlist", () => {
    expect(AUTONOMOUS_ELIGIBLE_ACTION_TYPES.includes("purchase.create" as never)).toBe(false);
  });
});
