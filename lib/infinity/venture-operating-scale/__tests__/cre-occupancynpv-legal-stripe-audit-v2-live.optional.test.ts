import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2 live", () => {
  it("audits occupancynpv.com legal and Stripe commercialization without activating payments", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-legal-stripe-commercialization-audit-v2-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.actions.deployments).toBe(0);
    expect(result.actions.vercelMutations).toBe(0);
    expect(result.actions.customers).toBe(0);
    expect(result.actions.checkoutSessions).toBe(0);
    expect(result.actions.charges).toBe(0);
    expect(result.checkout.activation).toBe("NO");
    expect(result.webhook.mutation).toBe("NO");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.artifact.redeployed).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_(live|test)_[A-Za-z0-9.]{8,}/);
  }, 180_000);
});
