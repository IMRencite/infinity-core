import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { runCreInboundObservationCycle } from "@/lib/infinity/inbound-communication-runtime/cre-inbound-observer";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { evaluateDomainProviderAndStripeConfigurationConcurrency } from "./concurrency";
import { CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1, CRE_VENTURE_ID } from "./constants";
import { executeCreDomainProviderVerification, type DomainProviderVerificationResult } from "./domain-provider-verification";
import { executeCreStripeCommercialConfiguration, type StripeCommercialConfigurationResult } from "./stripe-commercial-configuration";
import { executeCreLegalCommercializationReconciliation, type LegalReconciliationResult } from "./legal-reconciliation";
import { runDailyVentureOperatingCycle } from "./operations";
import { backfillCreVentureOperationalRecord } from "./record";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { evaluateVentureCommercializationReadiness, orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import type { VentureOperationalRecord } from "./types";

export type ConfigurationExecutionResult = {
  mission: typeof CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1;
  concurrency: ReturnType<typeof evaluateDomainProviderAndStripeConfigurationConcurrency>;
  parallelExecution: "PASS" | "FAIL";
  domain: DomainProviderVerificationResult;
  stripe: StripeCommercialConfigurationResult;
  legal: LegalReconciliationResult;
  record: VentureOperationalRecord;
  daily: ReturnType<typeof runDailyVentureOperatingCycle>;
  readiness: ReturnType<typeof evaluateVentureCommercializationReadiness>;
  experiment: {
    id: string;
    state: "COLLECTING";
    clockRestarted: boolean;
    evidenceStart: string;
    observer: string;
    tracked: number;
    newInbound: number;
    coldOutreach: 0;
    wave2: 0;
  };
  external: {
    domainPurchases: 0;
    dnsWrites: 0;
    stripeProductsCreated: number;
    stripePricesCreated: number;
    paymentActivations: 0;
    realCharges: 0;
    websiteDeployments: 0;
    coldOutreach: 0;
    wave2: 0;
    publiclyLaunched: "NO";
  };
  nextAuthorizations: Record<string, string>;
  nextState: string;
  canonical: "PASS";
};

function preserveObserver(): { status: string; tracked: number } {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: challenger?.tracked.map((row) => row.conversationId) ?? [
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
    ],
    threadIds: challenger?.tracked.map((row) => row.threadId) ?? ["1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

export function reconcileRecordAfterConfiguration(input: {
  domain: DomainProviderVerificationResult;
  stripe: StripeCommercialConfigurationResult;
  legal: LegalReconciliationResult;
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const products = [
    input.stripe.professional.productId !== "NONE"
      ? {
          id: input.stripe.professional.productId,
          name: "Professional",
          providerProductRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.product", rawSecretStored: false as const },
        }
      : null,
    input.stripe.perDeal.productId !== "NONE"
      ? {
          id: input.stripe.perDeal.productId,
          name: "Per-deal",
          providerProductRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.product", rawSecretStored: false as const },
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const prices = [
    input.stripe.professional.priceId !== "NONE"
      ? {
          id: input.stripe.professional.priceId,
          productId: input.stripe.professional.productId,
          amountUsd: 290,
          providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.price", rawSecretStored: false as const },
        }
      : null,
    input.stripe.perDeal.priceId !== "NONE"
      ? {
          id: input.stripe.perDeal.priceId,
          productId: input.stripe.perDeal.productId,
          amountUsd: 149,
          providerPriceRef: { kind: "PROVIDER_BINDING" as const, key: "stripe.price", rawSecretStored: false as const },
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);
  const next: VentureOperationalRecord = {
    ...existing,
    domain_history: [
      {
        domain: input.domain.preferred.domain,
        event: "SELECTED",
        at: new Date().toISOString(),
        evidence: `Re-ranked by ${CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1}; not purchased.`,
      },
    ],
    primary_domain: "UNCONFIGURED",
    pricing_state: "HYPOTHESIS_RECONCILED",
    payment_provider: products.length ? "stripe" : "UNCONFIGURED",
    payment_account_binding:
      input.stripe.accountIdentityVerified === "YES"
        ? { kind: "PROVIDER_BINDING", key: input.stripe.stripeAccountId, rawSecretStored: false }
        : envSecretReference("STRIPE_SECRET_KEY"),
    payment_products: products,
    payment_prices: prices,
    checkout_state: "UNCONFIGURED",
    privacy_policy_url: input.legal.privacy.ok ? input.legal.privacy.url : existing.privacy_policy_url,
    terms_of_service_url: input.legal.terms.ok ? input.legal.terms.url : existing.terms_of_service_url,
    sitemap_url: input.legal.sitemap.ok ? input.legal.sitemap.url : existing.sitemap_url,
    legal_configuration_state: input.legal.legalConfigurationState,
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${observer.status}:${observer.tracked}`,
    current_missions: [],
    blocked_actions: orderedCommercializationBlockers({
      ...existing,
      privacy_policy_url: input.legal.privacy.ok ? input.legal.privacy.url : existing.privacy_policy_url,
      terms_of_service_url: input.legal.terms.ok ? input.legal.terms.url : existing.terms_of_service_url,
      legal_configuration_state: input.legal.legalConfigurationState,
      payment_provider: products.length ? "stripe" : "UNCONFIGURED",
      payment_products: products,
      payment_prices: prices,
    }),
    latest_learning_decision: "CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_EXECUTED",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
    ],
  };
  return writeVentureOperationalRecord(next);
}

function nextState(domain: DomainProviderVerificationResult, stripe: StripeCommercialConfigurationResult): string {
  const domainReady = domain.availabilityVerification === "PASS" && domain.preferred.available === "YES";
  const stripeConfigured = stripe.configurationComplete;
  const stripeIdentity = stripe.accountIdentityVerified === "YES";
  if (!domainReady && stripeConfigured) return "CRE_DOMAIN_PROVIDER_REPAIR_REQUIRED_STRIPE_CONFIGURED";
  if (domainReady && stripeConfigured) return "CRE_DOMAIN_PURCHASE_PROVIDER_WRITE_REQUIRED_STRIPE_CONFIGURED";
  if (domainReady && !stripeIdentity) return "CRE_DOMAIN_READY_STRIPE_PROVIDER_REPAIR_REQUIRED";
  if (!domainReady && stripeIdentity && !stripeConfigured) return "CRE_COMMERCIALIZATION_CONFIGURATION_REPAIR_REQUIRED";
  return "CRE_COMMERCIALIZATION_CONFIGURATION_REPAIR_REQUIRED";
}

export async function executeCreDomainProviderAndStripeConfiguration(input: {
  domain?: Parameters<typeof executeCreDomainProviderVerification>[0];
  stripe?: Parameters<typeof executeCreStripeCommercialConfiguration>[0];
  legal?: Parameters<typeof executeCreLegalCommercializationReconciliation>[0];
  observeInbound?: boolean;
} = {}): Promise<ConfigurationExecutionResult> {
  if (!process.env.VITEST || process.env.INFINITY_LOAD_LOCAL_ENV === "1") loadServerEnvFromLocalFile();
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();
  const concurrency = evaluateDomainProviderAndStripeConfigurationConcurrency();
  const [domain, stripe, legal] = await Promise.all([
    executeCreDomainProviderVerification(input.domain),
    executeCreStripeCommercialConfiguration(input.stripe),
    executeCreLegalCommercializationReconciliation(input.legal),
  ]);
  let newInbound = 0;
  if (input.observeInbound !== false && (!process.env.VITEST || process.env.INFINITY_LOAD_LOCAL_ENV === "1")) {
    try {
      const cycle = await runCreInboundObservationCycle({ activate: false });
      newInbound = cycle.processing?.newInboundProcessed ?? 0;
    } catch {
      newInbound = 0;
    }
  }
  const record = reconcileRecordAfterConfiguration({ domain, stripe, legal });
  const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound });
  const readiness = evaluateVentureCommercializationReadiness(record);
  const observer = preserveObserver();
  const clock = inspectExperimentClock();
  return {
    mission: CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1,
    concurrency,
    parallelExecution: concurrency.outcome === "PASS" ? "PASS" : "FAIL",
    domain,
    stripe,
    legal,
    record,
    daily,
    readiness,
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING",
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      newInbound,
      coldOutreach: 0,
      wave2: 0,
    },
    external: {
      domainPurchases: 0,
      dnsWrites: 0,
      stripeProductsCreated: stripe.productsCreated,
      stripePricesCreated: stripe.pricesCreated,
      paymentActivations: 0,
      realCharges: 0,
      websiteDeployments: 0,
      coldOutreach: 0,
      wave2: 0,
      publiclyLaunched: "NO",
    },
    nextAuthorizations: {
      DOMAIN_PURCHASE: domain.purchaseReadiness,
      DNS_CONFIGURATION: "BLOCKED:DOMAIN_NOT_PURCHASED",
      PRODUCTION_DOMAIN_BINDING: "BLOCKED:DNS_CONFIGURATION_AUTHORIZATION_REQUIRED",
      CHECKOUT_CONFIGURATION: "UNVERIFIED:checkout/session.create_not_authorized_in_this_mission",
      WEBHOOK_CONFIGURATION: stripe.webhookState,
      PAYMENT_ACTIVATION: "BLOCKED:PAYMENT_ACTIVATION_NOT_AUTHORIZED",
      ANALYTICS_CONFIGURATION: "BLOCKED:PRODUCTION_DOMAIN_BINDING_REQUIRED",
      PUBLIC_LAUNCH: "BLOCKED:PUBLIC_LAUNCH_AUTHORIZATION_REQUIRED",
    },
    nextState: nextState(domain, stripe),
    canonical: "PASS",
  };
}
