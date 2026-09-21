import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreCloudflareRegistrarShortlistPricingV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1 live Cloudflare Registrar", () => {
  it("checks the CRE shortlist and prices without purchasing", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreCloudflareRegistrarShortlistPricingV1Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-cloudflare-registrar-shortlist-pricing-v1-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          auth: result.auth,
          capabilities: result.capabilities,
          checked: result.checked,
          ranked: result.ranked,
          preferred: result.preferred,
          economics: result.economics,
          routing: result.routing,
          governance: result.governance,
          record: {
            domain: result.record.primary_domain,
            history: result.record.domain_history,
            provider: result.record.domain_provider,
            registration: result.record.domain_registration_state,
            dns: result.record.dns_state,
            ssl: result.record.ssl_state,
            launch: result.record.public_launch_state,
            experiment: result.record.current_experiment,
            observer: result.record.inbound_observer_state,
          },
          experiment: result.experiment,
          purchases: result.purchases,
          dnsWrites: result.dnsWrites,
          registrationPosts: result.registrationPosts,
          nextState: result.nextState,
          nextAction: result.nextAction,
          hq: result.hqMission,
        },
        null,
        2,
      )}\n`,
    );
    expect(result.purchases).toBe(0);
    expect(result.dnsWrites).toBe(0);
    expect(result.deployments).toBe(0);
    expect(result.stripeWrites).toBe(0);
    expect(result.realCharges).toBe(0);
    expect(result.registrationPosts).toBe(0);
    expect(result.publiclyLaunched).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(result.routing.namecheap).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 180_000);
});
