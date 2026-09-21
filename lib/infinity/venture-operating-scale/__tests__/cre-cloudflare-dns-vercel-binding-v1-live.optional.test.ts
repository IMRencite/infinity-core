import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreCloudflareDnsVercelBindingV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1 live", () => {
  it("binds occupancynpv.com to the existing Vercel Pro deployment through Cloudflare DNS", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreCloudflareDnsVercelBindingV1Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-cloudflare-dns-vercel-binding-v1-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          ownership: result.ownership,
          cloudflare: result.cloudflare,
          vercel: {
            team: result.vercel.team,
            plan: result.vercel.plan,
            project: result.vercel.project,
            existingDeployment: result.vercel.existingDeployment,
            customDomainAdded: result.vercel.customDomainAdded,
            primaryDomain: result.vercel.primaryDomain,
            wwwConfiguration: result.vercel.wwwConfiguration,
            requiredDns: result.vercel.requiredDns,
          },
          dnsRecords: result.dnsRecords,
          verification: result.verification,
          ssl: result.ssl,
          artifact: result.artifact,
          routes: result.routes,
          productionHost: result.productionHost,
          footer: result.footer,
          record: {
            domain: result.record.primary_domain,
            dns: result.record.dns_state,
            zone: result.record.dns_zone,
            ssl: result.record.ssl_state,
            canonical: result.record.canonical_url,
            publicUrl: result.record.public_url,
            launch: result.record.public_launch_state,
            observer: result.record.inbound_observer_state,
          },
          clearedBlockers: result.clearedBlockers,
          remainingBlockers: result.remainingBlockers,
          experiment: result.experiment,
          dnsWrites: result.dnsWrites,
          domainBindings: result.domainBindings,
          nextState: result.nextState,
          nextGovernedAction: result.nextGovernedAction,
          hq: result.hqMission,
        },
        null,
        2,
      )}\n`,
    );
    expect(result.purchases).toBe(0);
    expect(result.vercelPurchases).toBe(0);
    expect(result.deployments).toBe(0);
    expect(result.stripeWrites).toBe(0);
    expect(result.customerCharges).toBe(0);
    expect(result.searchSubmissions).toBe(0);
    expect(result.publiclyLaunched).toBe("NO");
    expect(result.artifact.rebuilt).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 240_000);
});
