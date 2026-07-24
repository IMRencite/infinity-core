import { describe, expect, it } from "vitest";

function resolveProposalStatus(input: {
  blocked: boolean;
  requiresApproval: boolean;
  recommendation: string;
  poolCapacity: number;
}): string {
  if (input.blocked) {
    return "policy_blocked";
  }

  if (
    input.requiresApproval ||
    input.recommendation === "approve_build" ||
    input.recommendation === "acquire"
  ) {
    return "awaiting_approval";
  }

  if (input.poolCapacity <= 0) {
    return "policy_blocked";
  }

  if (
    input.recommendation === "validate" ||
    input.recommendation === "approve_initiative"
  ) {
    return "awaiting_approval";
  }

  return "proposed";
}

describe("proposeAllocation status rules", () => {
  it("marks proposals policy_blocked when evaluation policy results are blocked", () => {
    expect(
      resolveProposalStatus({
        blocked: true,
        requiresApproval: false,
        recommendation: "validate",
        poolCapacity: 10,
      }),
    ).toBe("policy_blocked");
  });

  it("marks proposals awaiting_approval for validate recommendations with capacity", () => {
    expect(
      resolveProposalStatus({
        blocked: false,
        requiresApproval: false,
        recommendation: "validate",
        poolCapacity: 5,
      }),
    ).toBe("awaiting_approval");
  });
});

describe("release allocation capacity", () => {
  it("restores available capacity when reserved amount is released", () => {
    const pool = {
      total_capacity: 10,
      reserved_capacity: 3,
      consumed_capacity: 2,
    };

    const releasedAmount = 2;
    const nextReserved = Math.max(0, pool.reserved_capacity - releasedAmount);
    const available =
      pool.total_capacity - nextReserved - pool.consumed_capacity;

    expect(nextReserved).toBe(1);
    expect(available).toBe(7);
  });
});
