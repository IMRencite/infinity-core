import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvProductionDnsVercelSslExecutionV4Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_PRODUCTION_DNS_VERCEL_SSL_EXECUTION_V4 live", () => {
  it("binds occupancynpv.com production DNS, Vercel, and SSL without rebuilding", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvProductionDnsVercelSslExecutionV4Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-production-dns-vercel-ssl-v4-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.tokenCapability.registrarTokenUsed).toBe(false);
    expect(result.purchases).toBe(0);
    expect(result.vercelPurchases).toBe(0);
    expect(result.deployments).toBe(0);
    expect(result.stripeWrites).toBe(0);
    expect(result.customerCharges).toBe(0);
    expect(result.searchSubmissions).toBe(0);
    expect(result.publiclyLaunched).toBe("NO");
    expect(result.artifact.rebuilt).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 240_000);
});
