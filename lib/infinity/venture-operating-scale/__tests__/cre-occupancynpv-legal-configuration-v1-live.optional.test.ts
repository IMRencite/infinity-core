import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvLegalConfigurationV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1 live", () => {
  it("persists founder legal facts and publishes OccupancyNPV Privacy and Terms", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvLegalConfigurationV1Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-legal-configuration-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.legalFacts.founderConfirmed).toBe("YES");
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.actions.stripeProductsCreated).toBe(0);
    expect(result.actions.stripePricesCreated).toBe(0);
    expect(result.actions.checkoutSessions).toBe(0);
    expect(result.actions.charges).toBe(0);
    expect(result.actions.searchSubmissions).toBe(0);
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_(live|test)_[A-Za-z0-9.]{8,}/);
  }, 420_000);
});
