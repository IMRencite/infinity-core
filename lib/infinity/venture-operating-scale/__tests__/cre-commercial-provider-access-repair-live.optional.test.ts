import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { executeCreCommercialProviderAccessRepairMission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1 live providers", () => {
  it("re-verifies Namecheap and Stripe as read-only provider access", async () => {
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    loadServerEnvFromLocalFile();
    const result = await executeCreCommercialProviderAccessRepairMission({ observeInbound: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-commercial-provider-access-repair-v1-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          classification: result.classification,
          namecheap: {
            config: result.namecheap.config,
            providerResponse: result.namecheap.providerResponse,
            repair: result.namecheap.repair,
            capabilities: result.namecheap.capabilities,
            preferred: result.namecheap.verification.preferred,
            availabilityVerification: result.namecheap.verification.availabilityVerification,
            pricingVerification: result.namecheap.verification.pricingVerification,
            checked: result.namecheap.verification.checked,
            purchases: result.namecheap.verification.purchases,
          },
          stripe: {
            keyPresent: result.stripe.inspection.keyPresent,
            keyType: result.stripe.inspection.keyType,
            environment: result.stripe.inspection.environment,
            livemode: result.stripe.inspection.livemode,
            permissions: result.stripe.inspection.permissions,
            statuses: result.stripe.inspection.statuses,
            account: result.stripe.inspection.account,
            accountIdentityVerified: result.stripe.accountIdentityVerified,
            wrongAccountProtection: result.stripe.wrongAccountProtection,
            objects: result.stripe.objects,
            writeHttpCalls: result.stripe.inspection.writeHttpCalls,
            postCalls: result.stripe.inspection.postCalls,
            repair: result.stripe.repair,
          },
          legal: result.legal,
          legalFacts: result.legalFacts,
          record: {
            domain: result.record.primary_domain,
            domainRegistration: result.record.domain_registration_state,
            history: result.record.domain_history,
            legal: result.record.legal_configuration_state,
            stripeBinding: result.record.payment_account_binding,
            experiment: result.record.current_experiment,
            observer: result.record.inbound_observer_state,
            launch: result.record.public_launch_state,
            blocked: result.record.blocked_actions,
          },
          readiness: result.readiness,
          daily: {
            result: result.daily.snapshot.dailyResult,
            next: result.daily.snapshot.nextGovernedWork,
            providerAccess: result.daily.providerAccessBlockerRecognized,
            commercialization: result.daily.commercializationWorkRecognized,
            externalWaiting: result.daily.externalWaitingRecognized,
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
    expect(result.external.stripeProductWrites).toBe(0);
    expect(result.external.charges).toBe(0);
    expect(result.external.websiteDeployments).toBe(0);
    expect(result.external.publiclyLaunched).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(result)).not.toMatch(/\b[rs]k_live_[A-Za-z0-9]{8,}/);
  }, 180_000);
});
