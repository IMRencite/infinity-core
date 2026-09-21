import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvPaymentSafetyRollbackV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1 live", () => {
  it("disables OccupancyNPV checkout without mutating Stripe payment objects or launching", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvPaymentSafetyRollbackV1Mission({
      reloadEnv: true,
      deploy: true,
      persistRecord: true,
      validateAllRoutes: true,
    });
    writeFileSync(
      ".infinity/venture-operating-scale/occupancynpv-payment-safety-rollback-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.writes.stripeWrites).toBe(0);
    expect(result.writes.refunds).toBe(0);
    expect(result.writes.newCustomers).toBe(0);
    expect(result.writes.newCheckoutSessions).toBe(0);
    expect(result.writes.newPaymentIntents).toBe(0);
    expect(result.writes.newCharges).toBe(0);
    expect(result.writes.newSubscriptions).toBe(0);
    expect(result.writes.dnsWrites).toBe(0);
    expect(result.writes.publicLaunch).toBe(0);
    expect(result.commercialization.publiclyLaunched).toBe("NO");
    expect(result.customerSafety.automaticRefundPerformed).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_(live|test)_[A-Za-z0-9.]{8,}/);
    expect(JSON.stringify(result)).not.toMatch(/whsec_[A-Za-z0-9]{8,}/);
  }, 600_000);
});
