import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { executeCreDomainProviderAndStripeConfigurationMission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1 live providers", () => {
  it("executes live domain verification, gated Stripe configuration, and legal reconciliation", async () => {
    loadServerEnvFromLocalFile();
    const result = await executeCreDomainProviderAndStripeConfigurationMission({ observeInbound: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-domain-provider-and-stripe-configuration-v1-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          concurrency: result.concurrency.outcome,
          parallelExecution: result.parallelExecution,
          domain: result.domain,
          stripe: {
            connected: result.stripe.connected,
            accountIdentityVerified: result.stripe.accountIdentityVerified,
            stripeAccountId: result.stripe.stripeAccountId,
            environment: result.stripe.environment,
            wrongAccountProtection: result.stripe.wrongAccountProtection,
            reads: result.stripe.reads,
            equivalentProductsFound: result.stripe.equivalentProductsFound,
            equivalentPricesFound: result.stripe.equivalentPricesFound,
            duplicatesAvoided: result.stripe.duplicatesAvoided,
            productsCreated: result.stripe.productsCreated,
            pricesCreated: result.stripe.pricesCreated,
            customers: result.stripe.customers,
            checkoutSessions: result.stripe.checkoutSessions,
            webhooksCreated: result.stripe.webhooksCreated,
            paymentIntents: result.stripe.paymentIntents,
            professional: result.stripe.professional,
            perDeal: result.stripe.perDeal,
            writes: result.stripe.writes,
            paymentGate: result.stripe.paymentGate,
            configurationComplete: result.stripe.configurationComplete,
            activationReady: result.stripe.activationReady,
            activationBlockers: result.stripe.activationBlockers,
            writeStoppedReason: result.stripe.writeStoppedReason,
            webhookState: result.stripe.webhookState,
          },
          legal: result.legal,
          record: {
            domain: result.record.primary_domain,
            history: result.record.domain_history,
            dns: result.record.dns_state,
            ssl: result.record.ssl_state,
            legal: result.record.legal_configuration_state,
            privacy: result.record.privacy_policy_url,
            terms: result.record.terms_of_service_url,
            sitemap: result.record.sitemap_url,
            stripeAccount: result.record.payment_account_binding,
            products: result.record.payment_products,
            prices: result.record.payment_prices,
            checkout: result.record.checkout_state,
            webhooks: result.record.payment_webhooks,
            revenue: result.record.revenue_state,
            experiment: result.record.current_experiment,
            observer: result.record.inbound_observer_state,
            launch: result.record.public_launch_state,
          },
          readiness: result.readiness,
          daily: {
            result: result.daily.snapshot.dailyResult,
            next: result.daily.snapshot.nextGovernedWork,
          },
          hq: result.hqMission,
          experiment: result.experiment,
          external: result.external,
          nextAuthorizations: result.nextAuthorizations,
          nextState: result.nextState,
        },
        null,
        2,
      )}\n`,
    );
    expect(result.external.domainPurchases).toBe(0);
    expect(result.external.dnsWrites).toBe(0);
    expect(result.external.publiclyLaunched).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
  }, 180_000);
});
