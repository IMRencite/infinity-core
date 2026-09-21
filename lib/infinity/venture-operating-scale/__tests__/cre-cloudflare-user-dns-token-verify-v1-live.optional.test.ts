import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreCloudflareUserDnsTokenVerifyV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1 live", () => {
  it("verifies the loaded user-owned Cloudflare DNS token without production writes", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    const result = await executeCreCloudflareUserDnsTokenVerifyV1Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-cloudflare-user-dns-token-verify-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.usedRegistrarToken).toBe(false);
    expect(result.actions.productionDnsWrites).toBe(0);
    expect(result.actions.vercelMutations).toBe(0);
    expect(result.actions.domainPurchases).toBe(0);
    expect(result.actions.stripeWrites).toBe(0);
    expect(result.actions.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 120_000);
});
