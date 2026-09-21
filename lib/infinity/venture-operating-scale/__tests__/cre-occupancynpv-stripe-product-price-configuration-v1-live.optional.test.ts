import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvStripeProductPriceConfigurationV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1 live", () => {
  it("configures OccupancyNPV Professional and Per-Deal products and prices without charging", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvStripeProductPriceConfigurationV1Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-stripe-product-price-configuration-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.writes.customers).toBe(0);
    expect(result.writes.checkoutSessions).toBe(0);
    expect(result.writes.paymentIntents).toBe(0);
    expect(result.writes.charges).toBe(0);
    expect(result.writes.subscriptions).toBe(0);
    expect(result.writes.webhookMutations).toBe(0);
    expect(result.writes.productsCreated).toBeLessThanOrEqual(2);
    expect(result.writes.pricesCreated).toBeLessThanOrEqual(2);
    expect(result.checkout.activation).toBe("NO");
    expect(result.webhook.mutation).toBe("NO");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.actions.vercelMutations).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_(live|test)_[A-Za-z0-9.]{8,}/);
  }, 180_000);
});
