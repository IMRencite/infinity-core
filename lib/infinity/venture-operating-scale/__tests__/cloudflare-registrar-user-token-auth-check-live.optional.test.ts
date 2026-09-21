import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCloudflareRegistrarUserTokenAuthCheck } from "../cloudflare-registrar-user-token-auth-check";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("Cloudflare Registrar user-token live auth check", () => {
  it("reloads the user-owned registrar token and probes leasenpv.com without purchasing", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    const result = await executeCloudflareRegistrarUserTokenAuthCheck({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cloudflare-registrar-user-token-auth-check-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.purchases).toBe(0);
    expect(result.dnsWrites).toBe(0);
    expect(result.deployments).toBe(0);
    expect(result.stripeWrites).toBe(0);
    expect(result.realCharges).toBe(0);
    expect(result.publiclyLaunched).toBe("NO");
    expect(result.registrationPosts).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 120_000);
});
