import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreCloudflareDns403RootCauseDiagnosticV1Mission } from "..";
type DiagnosticView = {
  usedRegistrarToken: boolean;
  runtimeAuthentication: { credentialSource: string };
  actions: {
    productionDnsWrites: number;
    vercelMutations: number;
    domainPurchases: number;
    stripeWrites: number;
    publiclyLaunched: string;
  };
};

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1 live", () => {
  it("diagnoses the occupancynpv.com 403/10000 write failure without production DNS", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    const result = (await executeCreCloudflareDns403RootCauseDiagnosticV1Mission({
      reloadEnv: true,
    })) as unknown as DiagnosticView;
    writeFileSync(
      ".infinity/venture-operating-scale/cre-cloudflare-dns-403-root-cause-diagnostic-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.usedRegistrarToken).toBe(false);
    expect(result.runtimeAuthentication.credentialSource).toBe("CLOUDFLARE_API_TOKEN");
    expect(result.actions.productionDnsWrites).toBe(0);
    expect(result.actions.vercelMutations).toBe(0);
    expect(result.actions.domainPurchases).toBe(0);
    expect(result.actions.stripeWrites).toBe(0);
    expect(result.actions.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 120_000);
});
