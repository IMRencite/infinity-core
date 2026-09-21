import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvSslFinalizationCheckV2Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2 live", () => {
  it("rechecks occupancynpv.com SSL and production host without rewriting DNS", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvSslFinalizationCheckV2Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-ssl-finalization-check-v2-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.dns.writes).toBe(0);
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.actions.vercelMutations).toBe(0);
    expect(result.actions.deployments).toBe(0);
    expect(result.actions.stripeWrites).toBe(0);
    expect(result.artifact.rebuilt).toBe("NO");
    expect(result.actions.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 180_000);
});
