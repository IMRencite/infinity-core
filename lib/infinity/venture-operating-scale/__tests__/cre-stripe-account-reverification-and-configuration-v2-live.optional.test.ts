import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreStripeAccountReverificationAndConfigurationV2Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2 live Stripe", () => {
  it("reloads the updated restricted key, verifies identity, and configures canonical offers", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreStripeAccountReverificationAndConfigurationV2Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-stripe-account-reverification-and-configuration-v2-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          env: result.env,
          identity: result.identity,
          reads: result.reads,
          preexisting: result.preexisting,
          writes: result.writes,
          professional: result.professional,
          perDeal: result.perDeal,
          idempotency: result.idempotency,
          paymentGate: result.paymentGate,
          configurationComplete: result.configurationComplete,
          activationReady: result.activationReady,
          remainingBlockers: result.remainingBlockers,
          record: {
            paymentProvider: result.record.payment_provider,
            binding: result.record.payment_account_binding,
            products: result.record.payment_products,
            prices: result.record.payment_prices,
            domainRegistration: result.record.domain_registration_state,
            legal: result.record.legal_configuration_state,
            experiment: result.record.current_experiment,
            observer: result.record.inbound_observer_state,
            launch: result.record.public_launch_state,
            blocked: result.record.blocked_actions,
          },
          experiment: result.experiment,
          namecheap: result.namecheap,
          nextState: result.nextState,
          nextAuthorizations: result.nextAuthorizations,
          hq: result.hqMission,
        },
        null,
        2,
      )}\n`,
    );
    expect(result.mission).toBe("CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2");
    expect(result.env.updatedKeyLoaded).toBe("YES");
    expect(result.writes.customers).toBe(0);
    expect(result.writes.checkoutSessions).toBe(0);
    expect(result.writes.webhooksCreated).toBe(0);
    expect(result.writes.charges).toBe(0);
    expect(result.writes.productsCreated).toBeLessThanOrEqual(2);
    expect(result.writes.pricesCreated).toBeLessThanOrEqual(2);
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(result.namecheap).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_live_[A-Za-z0-9]{8,}/);
  }, 180_000);
});
