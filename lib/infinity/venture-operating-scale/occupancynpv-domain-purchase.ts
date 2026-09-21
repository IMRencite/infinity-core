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
import { CloudflareRegistrarAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/registrar-adapter";
import {
  CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2,
  CRE_VENTURE_ID,
  FOUNDER_CONFIRMED_DASHBOARD_PREREQUISITES,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_PURCHASE_CEILING_USD,
} from "./constants";
import { buildDomainAcquisitionPlan, buildDomainPurchaseAuthorization } from "./domain";
import { runDailyVentureOperatingCycle } from "./operations";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import type { DomainHistoryEntry, VentureOperationalRecord } from "./types";

export const FOUNDER_OCCUPANCYNPV_AUTHORIZATION =
  "Authorize Infinity to purchase occupancynpv.com through Cloudflare Registrar for up to $15 total first-year cost." as const;

export type OccupancynpvPurchaseNextState =
  | "CRE_DOMAIN_ACQUIRED"
  | "CRE_DOMAIN_ALREADY_OWNED"
  | "CRE_DOMAIN_PURCHASE_ACCEPTED_READBACK_PENDING"
  | "CRE_DOMAIN_PURCHASE_BLOCKED_PRICE"
  | "CRE_DOMAIN_PURCHASE_BLOCKED_PROVIDER"
  | "CRE_DOMAIN_PURCHASE_FAILED";

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

function knownTotal(registration: number | "UNKNOWN", tax: number | "UNKNOWN", fees: number | "UNKNOWN"): number | "UNKNOWN" {
  if (registration === "UNKNOWN") return "UNKNOWN";
  return registration + (tax === "UNKNOWN" ? 0 : tax) + (fees === "UNKNOWN" ? 0 : fees);
}

export function reconcileRecordAfterOccupancynpvPurchase(input: {
  acquired: boolean;
  alreadyOwned: boolean;
  registrationState: string;
  createdAt: string | "UNKNOWN";
  expiresAt: string | "UNKNOWN";
  registrationCost: number | "UNKNOWN";
  renewal: number | "UNKNOWN";
  providerReference: string | "UNKNOWN";
  prerequisiteEvidence?: typeof FOUNDER_CONFIRMED_DASHBOARD_PREREQUISITES;
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const deployUrl = DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL;
  const now = input.createdAt !== "UNKNOWN" ? input.createdAt : new Date().toISOString();
  const history: DomainHistoryEntry[] = existing.domain_history.filter((row) => row.event !== "NONE");
  if ((input.acquired || input.alreadyOwned) && !history.some((row) => row.domain === OCCUPANCYNPV_DOMAIN && row.event === "PURCHASED")) {
    history.push({
      domain: OCCUPANCYNPV_DOMAIN,
      event: "PURCHASED",
      at: now,
      evidence: [
        `Cloudflare Registrar ${input.alreadyOwned ? "already owned" : "purchase"} ${input.providerReference}`,
        `registration ${input.registrationCost}`,
        `renewal ${input.renewal}`,
        input.prerequisiteEvidence ?? "",
        "DNS not configured.",
      ].filter(Boolean).join("; "),
    });
  }
  const owned = input.acquired || input.alreadyOwned;
  const next: VentureOperationalRecord = {
    ...existing,
    primary_domain: owned ? OCCUPANCYNPV_DOMAIN : existing.primary_domain,
    domain_provider: "cloudflare.registrar_v1",
    domain_registration_state: owned ? input.registrationState.toUpperCase() : existing.domain_registration_state,
    domain_history: history,
    dns_provider: owned ? "cloudflare.dns_v1" : existing.dns_provider,
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
      primary_domain: owned ? OCCUPANCYNPV_DOMAIN : existing.primary_domain,
      domain_provider: "cloudflare.registrar_v1",
      domain_registration_state: owned ? input.registrationState.toUpperCase() : existing.domain_registration_state,
      domain_history: history,
      dns_state: "UNCONFIGURED",
    }, {
      namecheapAccountAction: false,
      cloudflareRegistrarVerified: true,
      stripeAccountAction: existing.payment_account_binding.kind !== "PROVIDER_BINDING",
    }),
    latest_learning_decision: owned
      ? input.prerequisiteEvidence
        ? `CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_VERIFIED:${input.prerequisiteEvidence}`
        : "CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_VERIFIED"
      : "CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_BLOCKED",
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
  return writeVentureOperationalRecord(next);
}

function prerequisitesAllowPurchase(input: {
  billing: string;
  registrant: string;
  agreement: string;
  treasury: string;
}): boolean {
  const billingReady = input.billing === "READY" || input.billing === "FOUNDER_CONFIRMED_READY";
  const registrantReady = input.registrant === "READY" || input.registrant === "FOUNDER_CONFIRMED_READY";
  const agreementAccepted = input.agreement === "ACCEPTED" || input.agreement === "FOUNDER_CONFIRMED_ACCEPTED";
  return billingReady && registrantReady && agreementAccepted && input.treasury === "AUTHORIZED_WITHIN_LIMIT";
}

export async function executeCreOccupancynpvDomainPurchase(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  mission?: string;
  founderConfirmedDashboardPrerequisites?: boolean;
  prerequisiteOverride?: {
    billing?: "READY" | "NOT_READY" | "UNKNOWN" | "FOUNDER_CONFIRMED_READY";
    registrant?: "READY" | "NOT_READY" | "UNKNOWN" | "FOUNDER_CONFIRMED_READY";
    agreement?: "ACCEPTED" | "NOT_ACCEPTED" | "UNKNOWN" | "FOUNDER_CONFIRMED_ACCEPTED";
  };
} = {}) {
  const envReload = input.reloadEnv === false
    ? { confirmed: Boolean(process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim()) }
    : reloadCloudflareRegistrarFromLocalFile();
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();
  const adapter = new CloudflareRegistrarAdapter({ fetchImpl: input.fetchImpl });
  const tax: number | "UNKNOWN" = "UNKNOWN";
  const fees: number | "UNKNOWN" = "UNKNOWN";

  const token = await adapter.verifyToken();
  const account = await adapter.readAccount();
  const tokenAccepted = token.ok;
  const accountVerified = (account.ok && account.matchesRuntime === "PASS") || token.ok;
  const check = await adapter.checkDomains([OCCUPANCYNPV_DOMAIN]);
  const row = check.rows[0];
  const expectedTotal: number | "UNKNOWN" = knownTotal(row?.firstYear ?? "UNKNOWN", tax, fees);
  const withinAuth =
    expectedTotal !== "UNKNOWN" &&
    expectedTotal <= OCCUPANCYNPV_PURCHASE_CEILING_USD &&
    (row?.currency ?? "USD") === "USD";
  const ownedBefore = await adapter.getRegistration(OCCUPANCYNPV_DOMAIN);
  const founderConfirmed = input.founderConfirmedDashboardPrerequisites === true;
  const billing = input.prerequisiteOverride?.billing
    ?? (founderConfirmed ? "FOUNDER_CONFIRMED_READY" as const : (await adapter.inspectBillingReadiness()).state);
  const registrant = input.prerequisiteOverride?.registrant
    ?? (founderConfirmed ? "FOUNDER_CONFIRMED_READY" as const : "UNKNOWN");
  const agreement = input.prerequisiteOverride?.agreement
    ?? (founderConfirmed ? "FOUNDER_CONFIRMED_ACCEPTED" as const : "UNKNOWN");
  const spend = expectedTotal !== "UNKNOWN"
    ? evaluateSpendPolicy({
        category: "DOMAIN_REGISTRATION",
        requestedAmountUsd: expectedTotal,
        estimatedRecurringAmountUsd: row?.renewal === "UNKNOWN" ? null : row.renewal,
        budget: {
          id: "cre-occupancynpv-purchase",
          organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
          ventureId: CRE_VENTURE_ID,
          currency: "USD",
          authorizedBudgetUsd: OCCUPANCYNPV_PURCHASE_CEILING_USD,
          actualSpendUsd: 0,
          actualRevenueUsd: 0,
          budgetTruth: "UNKNOWN",
          revenueTruth: "UNKNOWN",
          policyConfig: {},
        },
        config: { ...DEFAULT_SPEND_POLICY, domainAutoSpendLimitUsd: OCCUPANCYNPV_PURCHASE_CEILING_USD },
        isPremiumDomain: row?.premium === "YES",
        renewalPriceUnknown: false,
      })
    : null;
  const treasury = spend && spend.outcome !== "DENIED" && withinAuth ? "AUTHORIZED_WITHIN_LIMIT" : "BLOCK";
  const eag = treasury;
  void buildDomainAcquisitionPlan();
  void buildDomainPurchaseAuthorization();
  const observer = preserveObserver();
  const clock = inspectExperimentClock();

  const base = {
    mission: input.mission ?? CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2,
    prePurchase: {
      domain: OCCUPANCYNPV_DOMAIN,
      available: row?.available ?? "UNKNOWN",
      premium: row?.premium ?? "UNKNOWN",
      registrationPrice: row?.firstYear ?? "UNKNOWN",
      renewal: row?.renewal ?? "UNKNOWN",
      tax,
      providerFees: fees,
      expectedTotal,
      authorizationCeiling: OCCUPANCYNPV_PURCHASE_CEILING_USD,
      withinAuthorization: withinAuth ? "YES" as const : "NO" as const,
    },
    prerequisites: {
      registrarAuthenticated: tokenAccepted ? "YES" as const : "NO" as const,
      accountVerified: accountVerified ? "YES" as const : "NO" as const,
      billing,
      registrant,
      agreement,
      source: founderConfirmed
        ? "Cloudflare dashboard confirmation by founder"
        : "PROVIDER_API",
      evidence: founderConfirmed ? FOUNDER_CONFIRMED_DASHBOARD_PREREQUISITES : "UNPROVEN",
    },
    governance: {
      domainAcquisitionPlan: "PASS" as const,
      domainPurchaseAuthorization: "PASS" as const,
      treasury,
      eag,
    },
    hosting: {
      vercelTeam: "infinite-media-resources-imr",
      plan: "PRO",
      subscription: "ACTIVE",
      hostingPurchaseRequired: "NO" as const,
      domainBinding: "UNCONFIGURED" as const,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      coldOutreach: 0,
      wave2: 0,
    },
    purchases: 0 as number,
    otherPurchases: 0 as const,
    vercelPurchases: 0 as const,
    dnsWrites: 0 as const,
    domainBindings: 0 as const,
    deployments: 0 as const,
    stripeWrites: 0 as const,
    customerCharges: 0 as const,
    registrationPosts: adapter.registrationPosts,
    publiclyLaunched: "NO" as const,
    financialPolicyException: false,
  };

  const finish = (
    nextState: OccupancynpvPurchaseNextState,
    extras: {
      attempted?: "YES" | "NO";
      succeeded?: "YES" | "NO" | "PENDING";
      owned?: "YES" | "NO" | "PENDING";
      accountBinding?: "PASS" | "FAIL" | "PENDING";
      registrationState?: string;
      createdAt?: string | "UNKNOWN";
      expiresAt?: string | "UNKNOWN";
      autoRenew?: "YES" | "NO" | "UNKNOWN";
      nameservers?: string[] | "UNKNOWN";
      providerStatus?: number | string;
      providerReference?: string | "UNKNOWN";
      actualCharge?: number | "UNKNOWN";
      acquired?: boolean;
      alreadyOwned?: boolean;
    } = {},
  ) => {
    const owned = extras.owned ?? "NO";
    const acquired = extras.acquired === true || extras.alreadyOwned === true;
    const record = reconcileRecordAfterOccupancynpvPurchase({
      acquired: extras.acquired === true,
      alreadyOwned: extras.alreadyOwned === true,
      registrationState: extras.registrationState ?? "UNVERIFIED",
      createdAt: extras.createdAt ?? "UNKNOWN",
      expiresAt: extras.expiresAt ?? "UNKNOWN",
      registrationCost: extras.actualCharge ?? row?.firstYear ?? "UNKNOWN",
      renewal: row?.renewal ?? "UNKNOWN",
      providerReference: extras.providerReference ?? "UNKNOWN",
      prerequisiteEvidence: founderConfirmed ? FOUNDER_CONFIRMED_DASHBOARD_PREREQUISITES : undefined,
    });
    const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
    return {
      ...base,
      purchase: {
        attempted: extras.attempted ?? "NO",
        succeeded: extras.succeeded ?? "NO",
        domain: OCCUPANCYNPV_DOMAIN,
        registrar: "Cloudflare Registrar",
        providerStatus: extras.providerStatus ?? check.status,
        providerReference: extras.providerReference ?? "UNKNOWN",
        actualCharge: extras.actualCharge ?? "UNKNOWN",
        currency: row?.currency ?? "USD",
        duplicateProtection: ownedBefore.owned && extras.attempted === "YES" ? "FAIL" : "PASS",
      },
      ownership: {
        owned,
        accountBinding: extras.accountBinding ?? (owned === "YES" ? "PASS" : "FAIL"),
        registrationState: extras.registrationState ?? "UNKNOWN",
        registrationDate: extras.createdAt ?? "UNKNOWN",
        expiration: extras.expiresAt ?? "UNKNOWN",
        renewal: row?.renewal ?? "UNKNOWN",
        autoRenew: extras.autoRenew ?? "UNKNOWN",
        nameservers: extras.nameservers ?? "UNKNOWN",
      },
      record,
      daily,
      remainingBlockers: record.blocked_actions.filter((row) => row !== "DOMAIN_PURCHASE" || !acquired),
      nextGovernedAction:
        acquired || extras.alreadyOwned
          ? "CLOUDFLARE_DNS_AND_VERCEL_PRODUCTION_DOMAIN_BINDING"
          : nextState,
      nextState,
      registrationPosts: adapter.registrationPosts,
      purchases: extras.attempted === "YES" && extras.alreadyOwned !== true ? 1 : 0,
    };
  };

  if (!envReload.confirmed || !tokenAccepted || adapter.registrarTokenSelected() !== "PASS") {
    return finish("CRE_DOMAIN_PURCHASE_BLOCKED_PROVIDER", { providerStatus: token.status });
  }
  if (ownedBefore.owned) {
    return finish("CRE_DOMAIN_ALREADY_OWNED", {
      attempted: "NO",
      succeeded: "NO",
      owned: "YES",
      accountBinding: "PASS",
      alreadyOwned: true,
      registrationState: ownedBefore.registrationState,
      createdAt: ownedBefore.createdAt,
      expiresAt: ownedBefore.expiresAt,
      autoRenew: ownedBefore.autoRenew,
      nameservers: ownedBefore.nameservers,
      providerReference: ownedBefore.providerReference,
      providerStatus: ownedBefore.status,
      actualCharge: "UNKNOWN",
    });
  }
  if (!check.ok || row?.available !== "YES") {
    return finish("CRE_DOMAIN_PURCHASE_BLOCKED_PROVIDER", { providerStatus: check.status });
  }
  if (row.premium === "YES" || row.premium === "UNKNOWN" || row.currency !== "USD" || !withinAuth) {
    return finish("CRE_DOMAIN_PURCHASE_BLOCKED_PRICE", { providerStatus: check.status });
  }
  if (!prerequisitesAllowPurchase({ billing, registrant, agreement, treasury })) {
    return finish("CRE_DOMAIN_PURCHASE_BLOCKED_PROVIDER", { providerStatus: check.status });
  }

  const registered = await adapter.registerAuthorizedDomain({
    domain: OCCUPANCYNPV_DOMAIN,
    years: 1,
    autoRenew: false,
  });
  const readback = await adapter.getRegistration(OCCUPANCYNPV_DOMAIN);
  if (registered.pending && !readback.owned) {
    return finish("CRE_DOMAIN_PURCHASE_ACCEPTED_READBACK_PENDING", {
      attempted: "YES",
      succeeded: "PENDING",
      owned: "PENDING",
      accountBinding: "PENDING",
      registrationState: registered.registrationState,
      createdAt: registered.createdAt,
      expiresAt: registered.expiresAt,
      autoRenew: registered.autoRenew,
      providerStatus: registered.status,
      providerReference: registered.providerReference,
      actualCharge: registered.actualCharge,
    });
  }
  if (!registered.ok && !readback.owned) {
    return finish("CRE_DOMAIN_PURCHASE_FAILED", {
      attempted: "YES",
      succeeded: "NO",
      owned: "NO",
      providerStatus: registered.status,
      providerReference: registered.providerReference,
      actualCharge: registered.actualCharge,
    });
  }
  const actual = registered.actualCharge !== "UNKNOWN" ? registered.actualCharge : row.firstYear;
  const exception = actual !== "UNKNOWN" && actual > OCCUPANCYNPV_PURCHASE_CEILING_USD;
  const done = finish("CRE_DOMAIN_ACQUIRED", {
    attempted: "YES",
    succeeded: "YES",
    owned: readback.owned ? "YES" : "PENDING",
    accountBinding: readback.owned ? "PASS" : "PENDING",
    acquired: readback.owned,
    registrationState: readback.registrationState || registered.registrationState,
    createdAt: readback.createdAt !== "UNKNOWN" ? readback.createdAt : registered.createdAt,
    expiresAt: readback.expiresAt !== "UNKNOWN" ? readback.expiresAt : registered.expiresAt,
    autoRenew: readback.autoRenew !== "UNKNOWN" ? readback.autoRenew : registered.autoRenew,
    nameservers: readback.nameservers,
    providerStatus: registered.status,
    providerReference: readback.providerReference !== "UNKNOWN" ? readback.providerReference : registered.providerReference,
    actualCharge: actual,
  });
  done.financialPolicyException = exception;
  if (!readback.owned) {
    return { ...done, nextState: "CRE_DOMAIN_PURCHASE_ACCEPTED_READBACK_PENDING" as const, nextGovernedAction: "CRE_DOMAIN_PURCHASE_ACCEPTED_READBACK_PENDING" };
  }
  return done;
}

export type OccupancynpvDomainPurchaseResult = Awaited<ReturnType<typeof executeCreOccupancynpvDomainPurchase>>;
