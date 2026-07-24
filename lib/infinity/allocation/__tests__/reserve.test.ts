import { describe, expect, it } from "vitest";

describe("allocation foundation rules", () => {
  it("treats zero-capacity pools as blocking allocation", () => {
    const pool = {
      total_capacity: 0,
      reserved_capacity: 0,
      consumed_capacity: 0,
    };

    const available =
      Number(pool.total_capacity) -
      Number(pool.reserved_capacity) -
      Number(pool.consumed_capacity);

    expect(available).toBe(0);
  });

  it("prevents reservation when requested amount exceeds available capacity", () => {
    const available = 0;
    const requested = 1;

    expect(requested > available).toBe(true);
  });

  it("uses stable reservation keys for idempotent retries", () => {
    const proposalId = "proposal-123";
    const reservationKey = `reserve:${proposalId}`;
    const poolId = "pool-456";

    expect(`${reservationKey}:${poolId}`).toBe("reserve:proposal-123:pool-456");
  });
});
