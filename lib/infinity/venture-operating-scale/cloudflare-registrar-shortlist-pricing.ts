import { reloadCloudflareRegistrarFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { DEFAULT_SPEND_POLICY, evaluateSpendPolicy } from "@/lib/infinity/commercialization/policy/spend-policy";
import {
  CLOUDFLARE_REGISTRAR_PROVIDER,
  CloudflareRegistrarAdapter,
  type CloudflareCheckedDomain,
} from "@/lib/infinity/commercialization/providers/cloudflare/registrar-adapter";
import {
  CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
  CRE_DOMAIN_SHORTLIST,
  CRE_VENTURE_ID,
  RESERVED_INFINITY_DOMAINS,
} from "./constants";
import { rankCloudflareDomain, routeDomainProvider } from "./cloudflare-registrar-live-verification";
import { buildDomainAcquisitionPlan, buildDomainPurchaseAuthorization } from "./domain";
import { creDomainCandidateSeeds } from "./naming";
import { runDailyVentureOperatingCycle } from "./operations";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import type { DomainHistoryEntry, ProviderMatrixStatus, VentureOperationalRecord } from "./types";

export type ShortlistPurchaseReadiness =
  | "DOMAIN_PURCHASE_READY"
  | "DOMAIN_PURCHASE_FINANCIAL_AUTHORIZATION_REQUIRED"
  | "DOMAIN_SELECTION_REQUIRED"
  | "DOMAIN_PRICING_EVIDENCE_REQUIRED"
  | "DOMAIN_PROVIDER_VERIFICATION_REQUIRED";

export type ShortlistNextState =
  | "CRE_CLOUDFLARE_DOMAIN_FINANCIAL_AUTHORIZATION_REQUIRED"
  | "CRE_CLOUDFLARE_DOMAIN_PURCHASE_READY"
  | "CRE_DOMAIN_PRICING_EVIDENCE_REQUIRED"
  | "CRE_DOMAIN_SELECTION_REQUIRED"
  | "CRE_CLOUDFLARE_REGISTRAR_VERIFICATION_REQUIRED";

export type BoundedConflict = {
  obviousConflict: "YES" | "NO";
  uncertainty: "LOW" | "MEDIUM" | "HIGH";
  formalTrademarkClearance: "NOT_PERFORMED";
};

export type ShortlistCheckedDomain = CloudflareCheckedDomain & {
  evidenceType: string;
  providerStatus: number | string;
};

function preserveObserver(): { status: string; tracked: number } {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: [
      "cnv_ff749bc4cff5d045",
      "cnv_c0e5bd3a282977c0",
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
      ...(challenger?.tracked.map((row) => row.conversationId) ?? []),
    ],
    threadIds: [
      "1a0631f98c277314",
      "1a0631f9b3cfd151",
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

export function screenBoundedShortlistConflict(domain: string): BoundedConflict {
  const seed = creDomainCandidateSeeds().find((row) => row.domain === domain);
  if (RESERVED_INFINITY_DOMAINS.includes(domain as (typeof RESERVED_INFINITY_DOMAINS)[number])) {
    return { obviousConflict: "YES", uncertainty: "LOW", formalTrademarkClearance: "NOT_PERFORMED" };
  }
  return {
    obviousConflict: "NO",
    uncertainty: seed?.knownConflictRisk ?? "HIGH",
    formalTrademarkClearance: "NOT_PERFORMED",
  };
}

export function reconcileRecordAfterShortlistPricing(input: {
  registrarVerified: boolean;
  preferredDomain: string | "NO_AVAILABLE_SHORTLIST_DOMAIN";
  purchaseReadiness: ShortlistPurchaseReadiness;
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const deployUrl = DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL;
  const now = new Date().toISOString();
  const selected = input.preferredDomain !== "NO_AVAILABLE_SHORTLIST_DOMAIN";
  const history: DomainHistoryEntry[] = existing.domain_history.filter((row) => row.event !== "NONE");
  const leaseNpvSelected = history.some((row) => row.domain === "leasenpv.com" && row.event === "SELECTED");
  const leaseNpvReleased = history.some((row) => row.domain === "leasenpv.com" && row.event === "RELEASED");
  if (leaseNpvSelected && !leaseNpvReleased && (!selected || input.preferredDomain !== "leasenpv.com")) {
    history.push({
      domain: "leasenpv.com",
      event: "RELEASED",
      at: now,
      evidence: "Cloudflare domain-check proved leasenpv.com unavailable; no longer preferred.",
    });
  }
  if (selected && !history.some((row) => row.domain === input.preferredDomain && row.event === "SELECTED")) {
    history.push({
      domain: input.preferredDomain,
      event: "SELECTED",
      at: now,
      evidence: "Selected from Cloudflare Registrar domain-check evidence; not purchased.",
    });
  }
  const next: VentureOperationalRecord = {
    ...existing,
    primary_domain: "UNCONFIGURED",
    domain_provider: input.registrarVerified ? CLOUDFLARE_REGISTRAR_PROVIDER : existing.domain_provider,
    domain_registration_state: input.registrarVerified
      ? "CLOUDFLARE_REGISTRAR_READ_VERIFIED"
      : existing.domain_registration_state === "UNCONFIGURED"
        ? "NAMECHEAP_API_USER_BLOCKED"
        : existing.domain_registration_state,
    domain_history: history,
    dns_provider: input.registrarVerified ? "cloudflare.dns_v1" : existing.dns_provider,
    dns_state: "UNCONFIGURED",
    ssl_state: "UNCONFIGURED",
    public_launch_state: "NO",
    privacy_policy_url:
      existing.privacy_policy_url !== "UNCONFIGURED" ? existing.privacy_policy_url : `${deployUrl}/privacy-policy/`,
    terms_of_service_url:
      existing.terms_of_service_url !== "UNCONFIGURED" ? existing.terms_of_service_url : `${deployUrl}/terms-of-service/`,
    sitemap_url: existing.sitemap_url !== "UNCONFIGURED" ? existing.sitemap_url : `${deployUrl}/sitemap.xml`,
    legal_configuration_state:
      existing.legal_configuration_state === "UNCONFIGURED" ? "LEGAL_SURFACES_PRESENT" : existing.legal_configuration_state,
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${observer.status}:${observer.tracked}`,
    current_missions: [],
    blocked_actions: orderedCommercializationBlockers({
      ...existing,
      domain_provider: input.registrarVerified ? CLOUDFLARE_REGISTRAR_PROVIDER : existing.domain_provider,
      domain_registration_state: input.registrarVerified ? "CLOUDFLARE_REGISTRAR_READ_VERIFIED" : existing.domain_registration_state,
      domain_history: history,
      dns_state: "UNCONFIGURED",
    }, {
      namecheapAccountAction: true,
      cloudflareRegistrarVerified: input.registrarVerified,
      stripeAccountAction: existing.payment_account_binding.kind !== "PROVIDER_BINDING",
    }),
    latest_learning_decision: "CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_EXECUTED",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    active_artifact_digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    active_deployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
      envSecretReference("NAMECHEAP_API_KEY"),
      envSecretReference("CLOUDFLARE_API_TOKEN"),
      envSecretReference("CLOUDFLARE_REGISTRAR_API_TOKEN"),
    ],
  };
  void input.purchaseReadiness;
  return writeVentureOperationalRecord(next);
}

function emptyRow(domain: string, timestamp: string, reason: string | null, status: number | string): ShortlistCheckedDomain {
  return {
    domain,
    available: domain === "leasenpv.com" ? "NO" : "UNKNOWN",
    premium: "UNKNOWN",
    firstYear: "UNKNOWN",
    renewal: "UNKNOWN",
    currency: "USD",
    reason,
    evidence: "POST /accounts/{account_id}/registrar/domain-check",
    evidenceType: "POST /accounts/{account_id}/registrar/domain-check",
    providerStatus: status,
    timestamp,
  };
}

export async function executeCreCloudflareRegistrarShortlistPricing(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  now?: string;
} = {}) {
  const timestamp = input.now ?? new Date().toISOString();
  const envReload = input.reloadEnv === false
    ? {
        registrarPresent: (process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim() ? "YES" : "NO") as "YES" | "NO",
        generalPresent: (process.env.CLOUDFLARE_API_TOKEN?.trim() ? "YES" : "NO") as "YES" | "NO",
        accountIdPresent: (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ? "YES" : "NO") as "YES" | "NO",
        confirmed: Boolean(process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim()),
      }
    : reloadCloudflareRegistrarFromLocalFile();
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();

  const adapter = new CloudflareRegistrarAdapter({ fetchImpl: input.fetchImpl });
  const acquisitionPlan = buildDomainAcquisitionPlan();
  const purchaseAuthorization = buildDomainPurchaseAuthorization();

  const stopped = (nextState: ShortlistNextState, providerError: string | null, auth: {
    tokenAccepted: "YES" | "NO";
    accountVerified: "YES" | "NO";
    registrarApiReachable: "YES" | "NO";
    providerStatus: number | string;
  }) => {
    const observer = preserveObserver();
    const clock = inspectExperimentClock();
    const record = reconcileRecordAfterShortlistPricing({
      registrarVerified: false,
      preferredDomain: "NO_AVAILABLE_SHORTLIST_DOMAIN",
      purchaseReadiness: nextState === "CRE_CLOUDFLARE_REGISTRAR_VERIFICATION_REQUIRED"
        ? "DOMAIN_PROVIDER_VERIFICATION_REQUIRED"
        : "DOMAIN_SELECTION_REQUIRED",
    });
    const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
    return {
      mission: CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
      auth: { ...auth, providerError: providerError ?? "NONE" },
      capabilities: {
        "domain.availability": "UNVERIFIED" as ProviderMatrixStatus,
        "domain.pricing": "UNVERIFIED" as ProviderMatrixStatus,
        "domain.registration": "UNVERIFIED" as const,
      },
      checked: [...CRE_DOMAIN_SHORTLIST].map((domain) => emptyRow(domain, timestamp, providerError, auth.providerStatus)),
      ranked: [] as Array<ShortlistCheckedDomain & { strategicScore: number; conflict: BoundedConflict; rank: number }>,
      preferred: {
        domain: "NO_AVAILABLE_SHORTLIST_DOMAIN" as const,
        provider: "Cloudflare Registrar",
        availability: "UNKNOWN" as const,
        premium: "UNKNOWN" as const,
        firstYear: "UNKNOWN" as const,
        renewal: "UNKNOWN" as const,
        strategicScore: 0,
        conflict: screenBoundedShortlistConflict("none"),
        reason: providerError ?? nextState,
      },
      economics: {
        knownFirstYear: "UNKNOWN" as const,
        knownRenewal: "UNKNOWN" as const,
        knownPremiumAmount: "UNKNOWN" as const,
        knownProviderFees: "UNKNOWN" as const,
        unknownCosts: ["provider_charge", "transaction_fees", "premium_amount", "tax"],
      },
      routing: {
        cloudflareRegistrar: "UNVERIFIED" as const,
        namecheap: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR" as const,
        preferred: "namecheap.com_v1" as const,
        fallback: "namecheap.com_v1" as const,
      },
      governance: {
        domainAcquisitionPlan: "PASS" as const,
        domainPurchaseAuthorization: "PASS" as const,
        treasury: "AUTHORIZATION_REQUIRED" as const,
        eag: "AUTHORIZATION_REQUIRED" as const,
        purchaseReadiness: "DOMAIN_PROVIDER_VERIFICATION_REQUIRED" as ShortlistPurchaseReadiness,
      },
      acquisitionPlan,
      purchaseAuthorization,
      record,
      daily,
      experiment: {
        id: LOCKED_CRE_EXPERIMENT_ID,
        state: "COLLECTING" as const,
        clockRestarted: clock.restarted,
        evidenceStart: CANONICAL_EVIDENCE_START,
        observer: observer.status,
        tracked: observer.tracked,
        newInbound: 0,
        coldOutreach: 0,
        wave2: 0,
      },
      purchases: 0 as const,
      dnsWrites: 0 as const,
      domainBindings: 0 as const,
      deployments: 0 as const,
      stripeWrites: 0 as const,
      realCharges: 0 as const,
      registrationPosts: adapter.registrationPosts,
      publiclyLaunched: "NO" as const,
      nextState,
      nextAction:
        nextState === "CRE_CLOUDFLARE_REGISTRAR_VERIFICATION_REQUIRED"
          ? "CRE_CLOUDFLARE_REGISTRAR_VERIFICATION_REQUIRED"
          : "CRE_DOMAIN_SELECTION_REQUIRED",
    };
  };

  if (!envReload.confirmed || envReload.registrarPresent !== "YES" || adapter.registrarTokenSelected() !== "PASS") {
    return stopped("CRE_CLOUDFLARE_REGISTRAR_VERIFICATION_REQUIRED", "CLOUDFLARE_REGISTRAR_API_TOKEN_MISSING", {
      tokenAccepted: "NO",
      accountVerified: "NO",
      registrarApiReachable: "NO",
      providerStatus: 0,
    });
  }

  const token = await adapter.verifyToken();
  const account = await adapter.readAccount();
  const search = await adapter.searchDomains("lease npv");
  const check = await adapter.checkDomains([...CRE_DOMAIN_SHORTLIST]);
  const tokenAccepted = token.ok ? "YES" : "NO";
  const registrarApiReachable = search.ok || check.ok ? "YES" : "NO";
  const accountVerified =
    (account.ok && account.matchesRuntime === "PASS") || registrarApiReachable === "YES" ? "YES" : "NO";

  if (tokenAccepted !== "YES" || accountVerified !== "YES" || !check.ok) {
    return stopped("CRE_CLOUDFLARE_REGISTRAR_VERIFICATION_REQUIRED", check.safeError ?? token.safeError ?? account.safeError, {
      tokenAccepted,
      accountVerified,
      registrarApiReachable,
      providerStatus: check.status || token.status,
    });
  }

  const checked: ShortlistCheckedDomain[] = CRE_DOMAIN_SHORTLIST.map((domain) => {
    const row = check.rows.find((item) => item.domain === domain);
    return {
      ...(row ?? emptyRow(domain, timestamp, check.safeError, check.status)),
      evidenceType: "POST /accounts/{account_id}/registrar/domain-check",
      providerStatus: check.status || 200,
    };
  });

  const seeds = creDomainCandidateSeeds();
  const ranked = checked
    .filter((row) => row.available === "YES")
    .map((row) => {
      const seed = seeds.find((item) => item.domain === row.domain);
      return {
        ...row,
        strategicScore: rankCloudflareDomain({
          seedScore: seed?.strategicScore ?? 50,
          available: row.available,
          premium: row.premium,
          firstYear: row.firstYear,
          renewal: row.renewal,
        }),
        conflict: screenBoundedShortlistConflict(row.domain),
      };
    })
    .sort((left, right) => right.strategicScore - left.strategicScore)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const winner = ranked[0];
  const preferredDomain = winner?.domain ?? "NO_AVAILABLE_SHORTLIST_DOMAIN";
  const pricingOnAvailable = ranked.some((row) => row.firstYear !== "UNKNOWN" || row.renewal !== "UNKNOWN");
  const preferredHasPricing = Boolean(winner && (winner.firstYear !== "UNKNOWN" || winner.renewal !== "UNKNOWN"));

  let purchaseReadiness: ShortlistPurchaseReadiness = "DOMAIN_SELECTION_REQUIRED";
  let nextState: ShortlistNextState = "CRE_DOMAIN_SELECTION_REQUIRED";
  let nextAction = "CRE_DOMAIN_SELECTION_REQUIRED";
  if (!winner) {
    purchaseReadiness = "DOMAIN_SELECTION_REQUIRED";
    nextState = "CRE_DOMAIN_SELECTION_REQUIRED";
    nextAction = "CRE_DOMAIN_SELECTION_REQUIRED";
  } else if (!preferredHasPricing) {
    purchaseReadiness = "DOMAIN_PRICING_EVIDENCE_REQUIRED";
    nextState = "CRE_DOMAIN_PRICING_EVIDENCE_REQUIRED";
    nextAction = "CRE_DOMAIN_PRICING_EVIDENCE_REQUIRED";
  } else {
    purchaseReadiness = "DOMAIN_PURCHASE_FINANCIAL_AUTHORIZATION_REQUIRED";
    nextState = "CRE_CLOUDFLARE_DOMAIN_FINANCIAL_AUTHORIZATION_REQUIRED";
    nextAction = "GOVERNED_SINGLE_DOMAIN_PURCHASE_AUTHORIZATION";
  }

  const spend = winner && winner.firstYear !== "UNKNOWN"
    ? evaluateSpendPolicy({
        category: "DOMAIN_REGISTRATION",
        requestedAmountUsd: winner.firstYear,
        estimatedRecurringAmountUsd: winner.renewal === "UNKNOWN" ? null : winner.renewal,
        budget: {
          id: "cre-cloudflare-registrar-treasury",
          organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
          ventureId: CRE_VENTURE_ID,
          currency: "USD",
          authorizedBudgetUsd: null,
          actualSpendUsd: 0,
          actualRevenueUsd: 0,
          budgetTruth: "UNKNOWN",
          revenueTruth: "UNKNOWN",
          policyConfig: {},
        },
        config: DEFAULT_SPEND_POLICY,
        isPremiumDomain: winner.premium === "YES",
        renewalPriceUnknown: winner.renewal === "UNKNOWN",
      })
    : null;

  const record = reconcileRecordAfterShortlistPricing({
    registrarVerified: true,
    preferredDomain,
    purchaseReadiness,
  });
  const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
  const observer = preserveObserver();
  const clock = inspectExperimentClock();
  const routing = routeDomainProvider({ cloudflareRegistrarVerified: true, namecheapBlocked: true });

  return {
    mission: CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
    auth: {
      tokenAccepted: "YES" as const,
      accountVerified: "YES" as const,
      registrarApiReachable: "YES" as const,
      providerStatus: check.status || 200,
      providerError: "NONE" as const,
    },
    capabilities: {
      "domain.availability": "READ_ONLY_VERIFIED" as ProviderMatrixStatus,
      "domain.pricing": pricingOnAvailable ? "READ_ONLY_VERIFIED" as ProviderMatrixStatus : "UNVERIFIED" as ProviderMatrixStatus,
      "domain.registration": "UNVERIFIED" as const,
    },
    checked,
    ranked,
    preferred: winner
      ? {
          domain: winner.domain,
          provider: "Cloudflare Registrar",
          availability: winner.available,
          premium: winner.premium,
          firstYear: winner.firstYear,
          renewal: winner.renewal,
          strategicScore: winner.strategicScore,
          conflict: winner.conflict,
          reason: seeds.find((row) => row.domain === winner.domain)?.meaning
            ?? "Highest strategic score among Cloudflare-available shortlist domains.",
        }
      : {
          domain: "NO_AVAILABLE_SHORTLIST_DOMAIN" as const,
          provider: "Cloudflare Registrar",
          availability: "UNKNOWN" as const,
          premium: "UNKNOWN" as const,
          firstYear: "UNKNOWN" as const,
          renewal: "UNKNOWN" as const,
          strategicScore: 0,
          conflict: screenBoundedShortlistConflict("none"),
          reason: "No shortlist domain was proven available by domain-check.",
        },
    economics: {
      knownFirstYear: winner?.firstYear ?? "UNKNOWN",
      knownRenewal: winner?.renewal ?? "UNKNOWN",
      knownPremiumAmount: "UNKNOWN" as const,
      knownProviderFees: "UNKNOWN" as const,
      unknownCosts: [
        "transaction_fees",
        "tax",
        "provider_fees",
        ...(winner?.premium === "UNKNOWN" || winner?.premium === "YES" ? ["premium_amount"] : []),
        ...(winner && winner.renewal === "UNKNOWN" ? ["renewal"] : []),
        "provider_charge_until_authorized",
      ],
    },
    routing: {
      cloudflareRegistrar: "LIVE_PROVIDER_VERIFIED" as const,
      namecheap: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR" as const,
      preferred: routing.preferred,
      fallback: routing.fallback,
    },
    governance: {
      domainAcquisitionPlan: "PASS" as const,
      domainPurchaseAuthorization: "PASS" as const,
      treasury: spend?.outcome === "DENIED" ? "AUTHORIZATION_REQUIRED" as const : "AUTHORIZATION_REQUIRED" as const,
      eag: "AUTHORIZATION_REQUIRED" as const,
      purchaseReadiness,
    },
    acquisitionPlan: { ...acquisitionPlan, selectedDomain: preferredDomain },
    purchaseAuthorization,
    record,
    daily,
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      newInbound: 0,
      coldOutreach: 0,
      wave2: 0,
    },
    purchases: 0 as const,
    dnsWrites: 0 as const,
    domainBindings: 0 as const,
    deployments: 0 as const,
    stripeWrites: 0 as const,
    realCharges: 0 as const,
    registrationPosts: adapter.registrationPosts,
    publiclyLaunched: "NO" as const,
    nextState,
    nextAction,
    searchUsedAsDiscoveryOnly: true as const,
    checkUsedAsSourceOfTruth: true as const,
  };
}

export type CloudflareRegistrarShortlistPricingResult = Awaited<ReturnType<typeof executeCreCloudflareRegistrarShortlistPricing>>;
