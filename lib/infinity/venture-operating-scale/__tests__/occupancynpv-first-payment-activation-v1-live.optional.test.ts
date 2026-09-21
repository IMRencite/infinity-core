import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvFirstPaymentActivationV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1 live", () => {
  it("activates OccupancyNPV live payments without creating customer payment state or launching", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvFirstPaymentActivationV1Mission({
      reloadEnv: true,
      deploy: true,
      persistRecord: true,
      validateAllRoutes: true,
    });
    writeFileSync(
      ".infinity/venture-operating-scale/occupancynpv-first-payment-activation-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(result.writes.customersManuallyCreated).toBe(0);
    expect(result.writes.checkoutSessionsManuallyCreated).toBe(0);
    expect(result.writes.paymentIntentsManuallyCreated).toBe(0);
    expect(result.writes.chargesManuallyCreated).toBe(0);
    expect(result.writes.subscriptionsManuallyCreated).toBe(0);
    expect(result.writes.webhookEndpointsCreated).toBe(0);
    expect(result.writes.dnsWrites).toBe(0);
    expect(result.writes.searchSubmissions).toBe(0);
    expect(result.writes.outreach).toBe(0);
    expect(result.writes.publicLaunch).toBe(0);
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_(live|test)_[A-Za-z0-9.]{8,}/);
    expect(JSON.stringify(result)).not.toMatch(/whsec_[A-Za-z0-9]{8,}/);
    expect(["OCCUPANCYNPV_PAYMENT_ACTIVATED", "OCCUPANCYNPV_PAYMENT_ACTIVATION_BLOCKED", "OCCUPANCYNPV_PAYMENT_ACTIVATION_FAILED", "STRIPE_ACCOUNT_IDENTITY_MISMATCH", "CANONICAL_PAYMENT_OBJECT_MISMATCH", "WEBHOOK_ACTIVATION_BLOCKED", "PAYMENT_ACTIVATED_BACKEND_PURCHASE_SURFACE_REQUIRED"]).toContain(result.nextState);
  }, 600_000);
});
