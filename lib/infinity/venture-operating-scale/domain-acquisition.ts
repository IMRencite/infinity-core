import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { CloudflareReadAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/read-adapter";
import { NamecheapReadAdapter } from "@/lib/infinity/commercialization/providers/namecheap/read-adapter";
import { DEFAULT_SPEND_POLICY, evaluateSpendPolicy } from "@/lib/infinity/commercialization/policy/spend-policy";
import { CRE_VENTURE_ID, RESERVED_INFINITY_DOMAINS } from "./constants";
import { creDomainCandidateSeeds, inspectCreVentureNaming, isForbiddenVentureDomain } from "./naming";
import type { ProviderMatrixStatus } from "./types";

export type DomainAvailabilityRow = {
  domain: string;
  available: boolean | null;
  registrationPriceUsd: number | null;
  renewalPriceUsd: number | null;
  premium: boolean | null;
  provider: string;
  evidenceTimestamp: string;
};

export type DomainProviderCapabilityClass =
  | "domain.search"
  | "domain.availability"
  | "domain.registration"
  | "domain.readback"
  | "domain.ownership";

export type DomainAcquisitionDecision = {
  gate: "DomainAcquisitionDecision";
  candidate: string | "UNCONFIGURED";
  firstYearCost: number | "UNKNOWN";
  renewalCost: number | "UNKNOWN";
  premiumCost: number | "UNKNOWN";
  transactionFees: "UNKNOWN";
  expectedHoldingCost: number | "UNKNOWN";
  switchingCost: "UNKNOWN";
  risk: string[];
  strategicFit: number | "UNKNOWN";
  unknownCosts: string[];
};

export type DomainChildResult = {
  mission: "CRE_PRODUCTION_DOMAIN_ACQUISITION_V1";
  naming: ReturnType<typeof inspectCreVentureNaming>;
  candidatesEvaluated: number;
  finalists: Array<{
    name: string;
    domain: string;
    tld: string;
    meaning: string;
    brandability: number;
    relevance: number;
    expansionFlexibility: number;
    ambiguityRisk: string;
    knownConflictRisk: string;
    available: "YES" | "NO" | "UNKNOWN";
    provider: string;
    firstYearCost: number | "UNKNOWN";
    renewalCost: number | "UNKNOWN";
    premium: "YES" | "NO" | "UNKNOWN";
    strategicScore: number;
    evidenceTimestamp: string;
  }>;
  providers: {
    Namecheap: ProviderMatrixStatus;
    Cloudflare: ProviderMatrixStatus;
    other: string | null;
    availabilityVerification: "PASS" | "FAIL";
    registrationCapability: ProviderMatrixStatus;
    capabilities: Record<string, Record<DomainProviderCapabilityClass, ProviderMatrixStatus>>;
  };
  decision: DomainAcquisitionDecision;
  treasury: "PASS" | "FAIL" | "NOT_APPLICABLE";
  eag: "PASS" | "FAIL" | "AUTHORIZATION_REQUIRED";
  purchaseAuthorizedByExistingPolicy: false;
  purchaseAttempted: false;
  purchaseCount: 0;
  purchasedDomain: "NONE";
  registrar: "NONE";
  actualCost: "NONE";
  ownershipReadback: "NOT_APPLICABLE";
  nextState:
    | "DOMAIN_ACQUIRED"
    | "DOMAIN_SELECTION_READY_FINANCIAL_AUTHORIZATION_REQUIRED"
    | "DOMAIN_PROVIDER_VERIFICATION_REQUIRED"
    | "DOMAIN_ACQUISITION_FAILED";
  dnsWrites: 0;
  dnsNextAuthorization: string;
};

function asStatus(value: ProviderMatrixStatus | string | undefined): ProviderMatrixStatus {
  if (value === "LIVE_WRITE_VERIFIED" || value === "READ_ONLY_VERIFIED" || value === "UNAVAILABLE" || value === "UNVERIFIED") {
    return value;
  }
  if (value === "NOT_CONFIGURED" || value === "UNKNOWN") return "UNVERIFIED";
  if (value === "FAILED" || value === "DEGRADED") return "UNVERIFIED";
  return "UNVERIFIED";
}

function money(value: number | null | undefined): number | "UNKNOWN" {
  return typeof value === "number" && Number.isFinite(value) ? value : "UNKNOWN";
}

export async function executeCreProductionDomainAcquisition(input: {
  checkAvailability?: (domains: string[]) => Promise<DomainAvailabilityRow[]>;
  verifyNamecheap?: () => Promise<{ status: string; realProviderCall: boolean; domains?: Array<{ domain: string }> }>;
  verifyCloudflare?: () => Promise<{ status: string; realProviderCall: boolean }>;
  now?: string;
} = {}): Promise<DomainChildResult> {
  const now = input.now ?? new Date().toISOString();
  const naming = inspectCreVentureNaming(CRE_VENTURE_ID);
  const seeds = creDomainCandidateSeeds();
  const reserved = new Set<string>(RESERVED_INFINITY_DOMAINS);

  const namecheap = new NamecheapReadAdapter();
  const cloudflare = new CloudflareReadAdapter();
  const namecheapRead = input.verifyNamecheap
    ? await input.verifyNamecheap()
    : await namecheap.verifyReadOnly();
  const cloudflareRead = input.verifyCloudflare
    ? await input.verifyCloudflare()
    : await cloudflare.verifyReadOnly();

  const availabilityRows = input.checkAvailability
    ? await input.checkAvailability(seeds.map((row) => row.domain))
    : (await namecheap.checkAvailability(seeds.map((row) => row.domain))).rows.map((row) => ({
        domain: row.domain,
        available: row.available,
        registrationPriceUsd: row.registrationPriceUsd,
        renewalPriceUsd: row.renewalPriceUsd,
        premium: row.premium,
        provider: "namecheap.com_v1",
        evidenceTimestamp: now,
      }));

  const byDomain = new Map(availabilityRows.map((row) => [row.domain.toLowerCase(), row]));
  const owned = new Set((namecheapRead.domains ?? []).map((row) => row.domain.toLowerCase()));
  const availabilityVerification = availabilityRows.some((row) => row.available !== null) ? "PASS" : "FAIL";

  const namecheapStatus = asStatus(
    availabilityVerification === "PASS" || namecheapRead.status === "READ_ONLY_VERIFIED"
      ? "READ_ONLY_VERIFIED"
      : namecheapRead.status,
  );
  const cloudflareStatus = asStatus(cloudflareRead.status);
  const registrationCapability: ProviderMatrixStatus = "UNVERIFIED";

  const namecheapCapabilities: Record<DomainProviderCapabilityClass, ProviderMatrixStatus> = {
    "domain.search": availabilityVerification === "PASS" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "domain.availability": availabilityVerification === "PASS" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "domain.registration": "UNVERIFIED",
    "domain.readback": namecheapRead.status === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    "domain.ownership": namecheapRead.status === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
  };
  const cloudflareCapabilities: Record<DomainProviderCapabilityClass, ProviderMatrixStatus> = {
    "domain.search": "UNAVAILABLE",
    "domain.availability": "UNAVAILABLE",
    "domain.registration": "UNAVAILABLE",
    "domain.readback": "UNAVAILABLE",
    "domain.ownership": "UNAVAILABLE",
  };

  const finalists: DomainChildResult["finalists"] = seeds.map((seed) => {
    const evidence = byDomain.get(seed.domain);
    const available =
      evidence?.available === true ? "YES" : evidence?.available === false ? "NO" : "UNKNOWN";
    return {
      name: seed.brand,
      domain: seed.domain,
      tld: seed.tld,
      meaning: seed.meaning,
      brandability: seed.brandability,
      relevance: seed.relevance,
      expansionFlexibility: seed.expansionFlexibility,
      ambiguityRisk: seed.ambiguityRisk,
      knownConflictRisk: seed.knownConflictRisk,
      available,
      provider: evidence?.provider ?? "namecheap.com_v1",
      firstYearCost: money(evidence?.registrationPriceUsd),
      renewalCost: money(evidence?.renewalPriceUsd),
      premium: evidence?.premium === true ? "YES" : evidence?.premium === false ? "NO" : "UNKNOWN",
      strategicScore: seed.strategicScore,
      evidenceTimestamp: evidence?.evidenceTimestamp ?? now,
    };
  });

  const purchasable = finalists.filter(
    (row) =>
      row.available === "YES" &&
      !isForbiddenVentureDomain(row.domain) &&
      !reserved.has(row.domain) &&
      !owned.has(row.domain),
  );
  const preferred =
    [...purchasable].sort((a, b) => {
      const aKnown = a.firstYearCost === "UNKNOWN" ? 0 : 1;
      const bKnown = b.firstYearCost === "UNKNOWN" ? 0 : 1;
      if (a.premium !== b.premium) return a.premium === "NO" ? -1 : 1;
      if (aKnown !== bKnown) return bKnown - aKnown;
      return b.strategicScore - a.strategicScore;
    })[0] ?? finalists.slice().sort((a, b) => b.strategicScore - a.strategicScore)[0]!;

  const unknownCosts = [
    preferred.firstYearCost === "UNKNOWN" ? "first_year_cost" : null,
    preferred.renewalCost === "UNKNOWN" ? "renewal_cost" : null,
    "transaction_fees",
    "switching_cost",
    preferred.premium === "UNKNOWN" ? "premium_cost" : null,
  ].filter((row): row is string => row != null);

  const decision: DomainAcquisitionDecision = {
    gate: "DomainAcquisitionDecision",
    candidate: preferred.domain,
    firstYearCost: preferred.firstYearCost,
    renewalCost: preferred.renewalCost,
    premiumCost: preferred.premium === "YES" && preferred.firstYearCost !== "UNKNOWN" ? preferred.firstYearCost : preferred.premium === "NO" ? 0 : "UNKNOWN",
    transactionFees: "UNKNOWN",
    expectedHoldingCost: preferred.renewalCost,
    switchingCost: "UNKNOWN",
    risk: [
      "no_live_write_registrar",
      "no_autonomous_spend_ceiling",
      ...(preferred.available !== "YES" ? ["preferred_not_available"] : []),
      ...unknownCosts.map((row) => `unknown_${row}`),
    ],
    strategicFit: preferred.strategicScore,
    unknownCosts,
  };

  const amount = preferred.firstYearCost === "UNKNOWN" ? Number.NaN : preferred.firstYearCost;
  const spend = evaluateSpendPolicy({
    category: "DOMAIN_REGISTRATION",
    requestedAmountUsd: amount,
    estimatedRecurringAmountUsd: preferred.renewalCost === "UNKNOWN" ? null : preferred.renewalCost,
    budget: {
      id: "cre-treasury-eval",
      organizationId: LIVE_ORG,
      ventureId: CRE_VENTURE_ID,
      currency: "USD",
      authorizedBudgetUsd: null,
      actualSpendUsd: 0,
      actualRevenueUsd: 0,
      budgetTruth: "UNKNOWN",
      revenueTruth: "UNKNOWN",
      policyConfig: { ...DEFAULT_SPEND_POLICY },
    },
    config: DEFAULT_SPEND_POLICY,
    isPremiumDomain: preferred.premium === "YES",
    renewalPriceUnknown: preferred.renewalCost === "UNKNOWN",
  });

  const autoCeilingExists = DEFAULT_SPEND_POLICY.domainAutoSpendLimitUsd != null;
  const purchaseAuthorizedByExistingPolicy = false as const;
  void autoCeilingExists;
  void spend;
  void purchaseAuthorizedByExistingPolicy;

  const nextState: DomainChildResult["nextState"] =
    availabilityVerification === "FAIL"
      ? "DOMAIN_PROVIDER_VERIFICATION_REQUIRED"
      : preferred.available === "YES"
        ? "DOMAIN_SELECTION_READY_FINANCIAL_AUTHORIZATION_REQUIRED"
        : "DOMAIN_ACQUISITION_FAILED";

  return {
    mission: "CRE_PRODUCTION_DOMAIN_ACQUISITION_V1",
    naming,
    candidatesEvaluated: finalists.length,
    finalists,
    providers: {
      Namecheap: namecheapStatus,
      Cloudflare: cloudflareStatus === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : cloudflareStatus,
      other: null,
      availabilityVerification,
      registrationCapability,
      capabilities: {
        Namecheap: namecheapCapabilities,
        Cloudflare: cloudflareCapabilities,
      },
    },
    decision,
    treasury: Number.isFinite(amount) || spend.outcome === "DENIED" ? "PASS" : "NOT_APPLICABLE",
    eag: "AUTHORIZATION_REQUIRED",
    purchaseAuthorizedByExistingPolicy: false,
    purchaseAttempted: false,
    purchaseCount: 0,
    purchasedDomain: "NONE",
    registrar: "NONE",
    actualCost: "NONE",
    ownershipReadback: "NOT_APPLICABLE",
    nextState,
    dnsWrites: 0,
    dnsNextAuthorization:
      nextState === "DOMAIN_SELECTION_READY_FINANCIAL_AUTHORIZATION_REQUIRED"
        ? "DOMAIN_PURCHASE_FINANCIAL_AUTHORIZATION_REQUIRED"
        : nextState,
  };
}
