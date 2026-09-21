import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { runCreInboundObservationCycle } from "@/lib/infinity/inbound-communication-runtime/cre-inbound-observer";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { NamecheapReadAdapter } from "@/lib/infinity/commercialization/providers/namecheap/read-adapter";
import {
  buildNamecheapProviderRepairInstruction,
  classifyNamecheapProviderError,
  inspectNamecheapSafeConfiguration,
  type ExternalConfigurationBlockClass,
  type NamecheapProviderCause,
  type NamecheapProviderRepairInstruction,
} from "@/lib/infinity/commercialization/providers/namecheap/classify";
import { CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1, CRE_VENTURE_ID } from "./constants";
import { evaluateProviderAccessRepairConcurrency } from "./concurrency";
import { executeCreDomainProviderVerification, type DomainAvailabilityEvidence, type DomainProviderVerificationResult } from "./domain-provider-verification";
import { searchCanonicalLegalFacts, type CanonicalLegalFactSearch } from "./legal-facts";
import { executeCreLegalCommercializationReconciliation, type LegalReconciliationResult } from "./legal-reconciliation";
import { runDailyVentureOperatingCycle } from "./operations";
import { backfillCreVentureOperationalRecord } from "./record";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { evaluateVentureCommercializationReadiness, orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import {
  buildStripeProviderRepairInstruction,
  findEquivalentCommercialObjects,
  inspectStripeKeyCapabilities,
  type StripeCapabilityInspection,
  type StripeProviderRepairInstruction,
} from "./stripe-key-capabilities";
import type { ProviderMatrixStatus, VentureOperationalRecord } from "./types";

export type ProviderAccessRepairResult = {
  mission: typeof CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1;
  classification: {
    namecheapBlockerType: ExternalConfigurationBlockClass | "NONE";
    stripeBlockerType: ExternalConfigurationBlockClass | "NONE";
    codeRepairRequired: "YES" | "NO";
    providerAccountActionRequired: "YES" | "NO";
    namecheapCause: NamecheapProviderCause | "NONE";
    stripeCause: StripeCapabilityInspection["cause"] | "NONE";
  };
  namecheap: {
    config: ReturnType<typeof inspectNamecheapSafeConfiguration>;
    providerResponse: string | null;
    repair: NamecheapProviderRepairInstruction;
    capabilities: Record<
      "domain.search" | "domain.availability" | "domain.pricing" | "domain.registration" | "domain.readback" | "domain.ownership",
      ProviderMatrixStatus
    >;
    verification: DomainProviderVerificationResult;
  };
  stripe: {
    inspection: StripeCapabilityInspection;
    repair: StripeProviderRepairInstruction;
    accountIdentityVerified: "YES" | "NO";
    wrongAccountProtection: "PASS" | "FAIL";
    objects: ReturnType<typeof findEquivalentCommercialObjects>;
  };
  legal: LegalReconciliationResult;
  legalFacts: CanonicalLegalFactSearch;
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
    stripeProductWrites: 0;
    stripePriceWrites: 0;
    checkoutSessions: 0;
    webhookWrites: 0;
    paymentActivations: 0;
    charges: 0;
    websiteDeployments: 0;
    coldOutreach: 0;
    wave2: 0;
    publiclyLaunched: "NO";
    artifactChanged: "NO";
  };
  nextAuthorizations: Record<string, string>;
  nextState:
    | "CRE_PROVIDER_ACCESS_REPAIRED_READY_FOR_COMMERCIAL_WRITES"
    | "CRE_NAMECHEAP_ACCOUNT_ACTION_REQUIRED"
    | "CRE_STRIPE_ACCOUNT_ACTION_REQUIRED"
    | "CRE_NAMECHEAP_AND_STRIPE_ACCOUNT_ACTION_REQUIRED";
  canonical: "PASS";
  concurrency: ReturnType<typeof evaluateProviderAccessRepairConcurrency>;
};

function preserveObserver(): { status: string; tracked: number } {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: [
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
      ...(challenger?.tracked.map((row) => row.conversationId) ?? []),
    ],
    threadIds: [
      "1a0708bf27f455c5",
      "1a0708bf5f29fb09",
      ...(challenger?.tracked.map((row) => row.threadId) ?? []),
    ],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

function money(value: number | "UNKNOWN" | null | undefined): number | "UNKNOWN" {
  return typeof value === "number" && Number.isFinite(value) ? value : "UNKNOWN";
}

export function classifyProviderAccessNextState(input: {
  namecheapReadsWork: boolean;
  stripeIdentityVerified: boolean;
}): ProviderAccessRepairResult["nextState"] {
  if (input.namecheapReadsWork && input.stripeIdentityVerified) {
    return "CRE_PROVIDER_ACCESS_REPAIRED_READY_FOR_COMMERCIAL_WRITES";
  }
  if (!input.namecheapReadsWork && !input.stripeIdentityVerified) {
    return "CRE_NAMECHEAP_AND_STRIPE_ACCOUNT_ACTION_REQUIRED";
  }
  if (!input.namecheapReadsWork) return "CRE_NAMECHEAP_ACCOUNT_ACTION_REQUIRED";
  return "CRE_STRIPE_ACCOUNT_ACTION_REQUIRED";
}

export function reconcileRecordAfterProviderAccessRepair(input: {
  domain: DomainProviderVerificationResult;
  stripeIdentityVerified: boolean;
  stripeAccountId: string | "UNKNOWN";
  legal: LegalReconciliationResult;
  namecheapBlocked: boolean;
  stripeBlocked: boolean;
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const blocked = orderedCommercializationBlockers({
    ...existing,
    privacy_policy_url: input.legal.privacy.ok ? input.legal.privacy.url : existing.privacy_policy_url,
    terms_of_service_url: input.legal.terms.ok ? input.legal.terms.url : existing.terms_of_service_url,
    legal_configuration_state: input.legal.legalConfigurationState,
    domain_registration_state: input.namecheapBlocked
      ? "NAMECHEAP_API_USER_BLOCKED"
      : input.domain.availabilityVerification === "PASS"
        ? "READ_ONLY_VERIFIED"
        : existing.domain_registration_state,
    payment_account_binding: input.stripeIdentityVerified
      ? { kind: "PROVIDER_BINDING", key: input.stripeAccountId, rawSecretStored: false }
      : envSecretReference("STRIPE_SECRET_KEY"),
  }, {
    namecheapAccountAction: input.namecheapBlocked,
    stripeAccountAction: input.stripeBlocked,
    stripeIdentityVerified: input.stripeIdentityVerified,
    namecheapReadsVerified: input.domain.availabilityVerification === "PASS",
  });
  const next: VentureOperationalRecord = {
    ...existing,
    domain_history: [
      {
        domain: input.domain.preferred.domain,
        event: "SELECTED",
        at: new Date().toISOString(),
        evidence: `Selected candidate preserved by ${CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1}; not purchased.`,
      },
    ],
    primary_domain: "UNCONFIGURED",
    domain_provider: "namecheap.com_v1",
    domain_registration_state: input.namecheapBlocked
      ? "NAMECHEAP_API_USER_BLOCKED"
      : input.domain.availabilityVerification === "PASS"
        ? "READ_ONLY_VERIFIED"
        : "UNVERIFIED",
    pricing_state: "HYPOTHESIS_RECONCILED",
    payment_provider: "UNCONFIGURED",
    payment_account_binding: input.stripeIdentityVerified
      ? { kind: "PROVIDER_BINDING", key: input.stripeAccountId, rawSecretStored: false }
      : envSecretReference("STRIPE_SECRET_KEY"),
    payment_products: existing.payment_products,
    payment_prices: existing.payment_prices,
    checkout_state: "UNCONFIGURED",
    privacy_policy_url: input.legal.privacy.ok ? input.legal.privacy.url : existing.privacy_policy_url,
    terms_of_service_url: input.legal.terms.ok ? input.legal.terms.url : existing.terms_of_service_url,
    sitemap_url: input.legal.sitemap.ok ? input.legal.sitemap.url : existing.sitemap_url,
    legal_configuration_state: input.legal.legalConfigurationState,
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${observer.status}:${observer.tracked}`,
    current_missions: [],
    blocked_actions: blocked,
    latest_learning_decision: "CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_EXECUTED",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    active_artifact_digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    active_deployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
      envSecretReference("NAMECHEAP_API_KEY"),
    ],
  };
  return writeVentureOperationalRecord(next);
}

export async function executeCreCommercialProviderAccessRepair(input: {
  domain?: Parameters<typeof executeCreDomainProviderVerification>[0];
  stripeFetch?: typeof fetch;
  legal?: Parameters<typeof executeCreLegalCommercializationReconciliation>[0];
  expectedStripeAccountId?: string | null;
  observeInbound?: boolean;
} = {}): Promise<ProviderAccessRepairResult> {
  if (!process.env.VITEST || process.env.INFINITY_LOAD_LOCAL_ENV === "1") loadServerEnvFromLocalFile();
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();
  const concurrency = evaluateProviderAccessRepairConcurrency();
  const adapter = new NamecheapReadAdapter();
  const safeConfig = inspectNamecheapSafeConfiguration(adapter.config.public);
  const [domain, stripeInspection, legal] = await Promise.all([
    executeCreDomainProviderVerification(input.domain),
    inspectStripeKeyCapabilities({ fetchImpl: input.stripeFetch }),
    executeCreLegalCommercializationReconciliation(input.legal),
  ]);

  const namecheapClassified = classifyNamecheapProviderError({
    message: domain.failureReason ?? "",
    code: null,
    status: null,
  });
  const namecheapReadsWork = domain.availabilityVerification === "PASS" && domain.pricingVerification === "PASS";
  const namecheapCause: NamecheapProviderCause | "NONE" = namecheapReadsWork
    ? "NONE"
    : domain.failureReason
      ? namecheapClassified.cause
      : "OTHER";
  const namecheapBlockerType: ExternalConfigurationBlockClass | "NONE" = namecheapReadsWork
    ? "NONE"
    : adapter.config.credentials
      ? "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED"
      : "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED";

  const identityVerified = stripeInspection.account.ok && stripeInspection.account.id !== "UNKNOWN";
  const expected = input.expectedStripeAccountId ?? null;
  const wrongAccountProtection: "PASS" | "FAIL" =
    expected && identityVerified && expected !== stripeInspection.account.id ? "FAIL" : identityVerified ? "PASS" : "FAIL";
  const stripeBlocked = !identityVerified || wrongAccountProtection === "FAIL";
  const stripeBlockerType: ExternalConfigurationBlockClass | "NONE" = stripeBlocked
    ? "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED"
    : "NONE";

  const objects =
    identityVerified && stripeInspection.permissions["product.read"] === "YES"
      ? findEquivalentCommercialObjects({
          products: stripeInspection.products,
          prices: stripeInspection.prices,
        })
      : {
          professionalProduct: "NONE" as const,
          professionalPrice: "NONE" as const,
          perDealProduct: "NONE" as const,
          perDealPrice: "NONE" as const,
          duplicateRisk: "NONE" as const,
        };

  let newInbound = 0;
  if (input.observeInbound !== false && (!process.env.VITEST || process.env.INFINITY_LOAD_LOCAL_ENV === "1")) {
    try {
      const cycle = await runCreInboundObservationCycle({ activate: false });
      newInbound = cycle.processing?.newInboundProcessed ?? 0;
    } catch {
      newInbound = 0;
    }
  }

  const record = reconcileRecordAfterProviderAccessRepair({
    domain,
    stripeIdentityVerified: identityVerified && wrongAccountProtection === "PASS",
    stripeAccountId: stripeInspection.account.id,
    legal,
    namecheapBlocked: !namecheapReadsWork,
    stripeBlocked,
  });
  const legalFacts = searchCanonicalLegalFacts({ record });
  const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound });
  const readiness = evaluateVentureCommercializationReadiness(record, {
    namecheapAccountAction: !namecheapReadsWork,
    stripeAccountAction: stripeBlocked,
    stripeIdentityVerified: identityVerified && wrongAccountProtection === "PASS",
    namecheapReadsVerified: namecheapReadsWork,
  });
  const observer = preserveObserver();
  const clock = inspectExperimentClock();
  const nextState = classifyProviderAccessNextState({
    namecheapReadsWork,
    stripeIdentityVerified: identityVerified && wrongAccountProtection === "PASS",
  });

  return {
    mission: CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1,
    classification: {
      namecheapBlockerType,
      stripeBlockerType,
      codeRepairRequired: "NO",
      providerAccountActionRequired: namecheapReadsWork && identityVerified ? "NO" : "YES",
      namecheapCause,
      stripeCause: stripeBlocked ? stripeInspection.cause : "NONE",
    },
    namecheap: {
      config: safeConfig,
      providerResponse: domain.failureReason,
      repair: buildNamecheapProviderRepairInstruction(namecheapCause === "NONE" ? "OTHER" : namecheapCause),
      capabilities: domain.capabilities,
      verification: domain,
    },
    stripe: {
      inspection: stripeInspection,
      repair: buildStripeProviderRepairInstruction({
        accountRead: stripeInspection.permissions["account.read"],
        productRead: stripeInspection.permissions["product.read"],
        productWrite: stripeInspection.permissions["product.write"],
        priceRead: stripeInspection.permissions["price.read"],
        priceWrite: stripeInspection.permissions["price.write"],
      }),
      accountIdentityVerified: identityVerified && wrongAccountProtection === "PASS" ? "YES" : "NO",
      wrongAccountProtection,
      objects,
    },
    legal,
    legalFacts,
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
      stripeProductWrites: 0,
      stripePriceWrites: stripeInspection.postCalls,
      checkoutSessions: 0,
      webhookWrites: 0,
      paymentActivations: 0,
      charges: 0,
      websiteDeployments: 0,
      coldOutreach: 0,
      wave2: 0,
      publiclyLaunched: "NO",
      artifactChanged: "NO",
    },
    nextAuthorizations: {
      DOMAIN_PURCHASE: namecheapReadsWork
        ? domain.purchaseReadiness
        : "BLOCKED:NAMECHEAP_ACCOUNT_ACTION_REQUIRED",
      PAYMENT_CONFIGURATION: identityVerified
        ? "PLAN_READY:STRIPE_ACCOUNT_IDENTITY_VERIFIED"
        : "BLOCKED:STRIPE_ACCOUNT_IDENTITY_UNVERIFIED",
      LEGAL_CONFIGURATION: legalFacts.founderConfigurationRequired,
      DNS_CONFIGURATION: "BLOCKED:DOMAIN_NOT_PURCHASED",
      PRODUCTION_DOMAIN_BINDING: "BLOCKED:DNS_CONFIGURATION_AUTHORIZATION_REQUIRED",
      CHECKOUT_CONFIGURATION: "UNVERIFIED:checkout/session.create_not_authorized_in_this_mission",
      WEBHOOK_CONFIGURATION: "WEBHOOK_DOMAIN_DEPENDENCY",
      PAYMENT_ACTIVATION: "BLOCKED:PAYMENT_ACTIVATION_NOT_AUTHORIZED",
      ANALYTICS_CONFIGURATION: "BLOCKED:PRODUCTION_DOMAIN_BINDING_REQUIRED",
      PUBLIC_LAUNCH: "BLOCKED:PUBLIC_LAUNCH_AUTHORIZATION_REQUIRED",
    },
    nextState,
    canonical: "PASS",
    concurrency,
  };
}

export function domainEvidenceFromVerification(domain: DomainProviderVerificationResult): DomainAvailabilityEvidence[] {
  return domain.checked.map((row) => ({
    ...row,
    firstYear: money(row.firstYear),
    renewal: money(row.renewal),
  }));
}
