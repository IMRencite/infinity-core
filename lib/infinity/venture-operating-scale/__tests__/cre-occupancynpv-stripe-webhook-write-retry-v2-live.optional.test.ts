import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvStripeWebhookWriteRetryV2Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2 live", () => {
  it("retries OccupancyNPV webhook create after restricted-key write permission", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvStripeWebhookWriteRetryV2Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-stripe-webhook-write-retry-v2-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.writes.customers).toBe(0);
    expect(result.writes.checkoutSessions).toBe(0);
    expect(result.writes.paymentIntents).toBe(0);
    expect(result.writes.charges).toBe(0);
    expect(result.writes.subscriptions).toBe(0);
    expect(result.writes.webhookEndpointsCreated).toBeLessThanOrEqual(1);
    expect(result.writes.webhookEndpointsUpdated).toBeLessThanOrEqual(1);
    expect(result.secret.secretExposed).toBe("NO");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_(live|test)_[A-Za-z0-9.]{8,}/);
    expect(JSON.stringify(result)).not.toMatch(/whsec_[A-Za-z0-9]{8,}/);
  }, 180_000);
});
