import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvDomainPurchaseRetryAfterCloudflarePrerequisitesV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_RETRY_AFTER_CLOUDFLARE_PREREQUISITES_V1 live", () => {
  it("retries the authorized occupancynpv.com purchase after founder-confirmed dashboard prerequisites", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvDomainPurchaseRetryAfterCloudflarePrerequisitesV1Mission({
      reloadEnv: true,
    });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-domain-purchase-retry-after-cloudflare-prerequisites-v1-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          prePurchase: result.prePurchase,
          prerequisites: result.prerequisites,
          governance: result.governance,
          purchase: result.purchase,
          ownership: result.ownership,
          hosting: result.hosting,
          record: {
            domain: result.record.primary_domain,
            history: result.record.domain_history,
            provider: result.record.domain_provider,
            registration: result.record.domain_registration_state,
            dns: result.record.dns_state,
            ssl: result.record.ssl_state,
            launch: result.record.public_launch_state,
            authorizations: result.record.active_authorizations,
            observer: result.record.inbound_observer_state,
          },
          remainingBlockers: result.remainingBlockers,
          experiment: result.experiment,
          purchases: result.purchases,
          registrationPosts: result.registrationPosts,
          financialPolicyException: result.financialPolicyException,
          nextState: result.nextState,
          nextGovernedAction: result.nextGovernedAction,
          hq: result.hqMission,
        },
        null,
        2,
      )}\n`,
    );
    expect(result.otherPurchases).toBe(0);
    expect(result.vercelPurchases).toBe(0);
    expect(result.dnsWrites).toBe(0);
    expect(result.domainBindings).toBe(0);
    expect(result.deployments).toBe(0);
    expect(result.stripeWrites).toBe(0);
    expect(result.customerCharges).toBe(0);
    expect(result.publiclyLaunched).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(result.registrationPosts).toBeLessThanOrEqual(1);
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 180_000);
});
