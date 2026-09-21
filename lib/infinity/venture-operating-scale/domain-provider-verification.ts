import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { CloudflareReadAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/read-adapter";
import { NamecheapReadAdapter } from "@/lib/infinity/commercialization/providers/namecheap/read-adapter";
import { DEFAULT_SPEND_POLICY, evaluateSpendPolicy } from "@/lib/infinity/commercialization/policy/spend-policy";
import { CRE_DOMAIN_SHORTLIST, CRE_VENTURE_ID } from "./constants";
import { creDomainCandidateSeeds } from "./naming";
import { buildDomainAcquisitionPlan, buildDomainPurchaseAuthorization } from "./domain";
import type { ProviderMatrixStatus } from "./types";

export type DomainCapabilityClass =
  | "domain.search"
  | "domain.availability"
  | "domain.pricing"
  | "domain.registration"
  | "domain.readback"
  | "domain.ownership";

export type DomainAvailabilityEvidence = {
  domain: string;
  available: "YES" | "NO" | "UNKNOWN";
  premium: "YES" | "NO" | "UNKNOWN";
  firstYear: number | "UNKNOWN";
  renewal: number | "UNKNOWN";
  currency: "USD";
  providerResponseId: string | null;
  evidence: string;
  timestamp: string;
};

export type DomainPurchaseReadiness =
  | "DOMAIN_PURCHASE_READY"
  | "DOMAIN_PURCHASE_PROVIDER_WRITE_VERIFICATION_REQUIRED"
  | "DOMAIN_PURCHASE_FINANCIAL_AUTHORIZATION_REQUIRED"
  | "DOMAIN_SELECTION_REQUIRED";

export type DomainProviderVerificationResult = {
  mission: "CRE_DOMAIN_PROVIDER_VERIFICATION_V1";
  Namecheap: ProviderMatrixStatus;
  capabilities: Record<DomainCapabilityClass, ProviderMatrixStatus>;
  cloudflareDns: ProviderMatrixStatus;
  availabilityVerification: "PASS" | "FAIL";
  pricingVerification: "PASS" | "FAIL";
  failureReason: string | null;
  checked: DomainAvailabilityEvidence[];
  preferred: {
    domain: string;
    strategicScore: number;
    firstYear: number | "UNKNOWN";
    renewal: number | "UNKNOWN";
    available: "YES" | "NO" | "UNKNOWN";
  };
  conflict: {
    obviousConflictFound: "YES" | "NO";
    conflictUncertainty: string;
    trademarkReviewRequired: "YES" | "NO";
  };
  registrationWriteAuthority: "REGISTRATION_WRITE_AUTHORITY_UNVERIFIED";
  purchaseReadiness: DomainPurchaseReadiness;
  treasury: "PASS" | "FAIL" | "NOT_APPLICABLE";
  eag: "PASS" | "FAIL" | "AUTHORIZATION_REQUIRED";
  purchaseAuthorization: "NOT_GRANTED";
  purchases: 0;
  unknownCosts: string[];
};

function asStatus(value: string | undefined): ProviderMatrixStatus {
  if (value === "LIVE_WRITE_VERIFIED" || value === "READ_ONLY_VERIFIED" || value === "UNAVAILABLE" || value === "UNVERIFIED") {
    return value;
  }
  return "UNVERIFIED";
}

function money(value: number | null | undefined): number | "UNKNOWN" {
  return typeof value === "number" && Number.isFinite(value) ? value : "UNKNOWN";
}

function rankScore(input: {
  seedScore: number;
  available: "YES" | "NO" | "UNKNOWN";
  premium: "YES" | "NO" | "UNKNOWN";
  firstYear: number | "UNKNOWN";
  renewal: number | "UNKNOWN";
}): number {
  let score = input.seedScore;
  if (input.available === "YES") score += 12;
  if (input.available === "NO") score -= 40;
  if (input.premium === "YES") score -= 15;
  if (input.firstYear !== "UNKNOWN") score += 4;
  if (input.renewal !== "UNKNOWN") score += 3;
  if (input.firstYear !== "UNKNOWN" && input.firstYear > 80) score -= 8;
  return score;
}

export function screenDomainConflicts(domain: string): {
  obviousConflictFound: "YES" | "NO";
  conflictUncertainty: string;
  trademarkReviewRequired: "YES" | "NO";
} {
  void domain;
  return {
    obviousConflictFound: "NO",
    conflictUncertainty: "HIGH — no trademark register search was executed; CRE generic-term collision remains possible.",
    trademarkReviewRequired: "YES",
  };
}

export async function executeCreDomainProviderVerification(input: {
  checkAvailability?: (domains: string[]) => Promise<
    Array<{
      domain: string;
      available: boolean | null;
      registrationPriceUsd: number | null;
      renewalPriceUsd: number | null;
      premium: boolean | null;
      failureReason?: string | null;
    }>
  >;
  getPricing?: (tld: string) => Promise<{ registrationPriceUsd: number | null; renewalPriceUsd: number | null; status: string }>;
  verifyNamecheap?: () => Promise<{ status: string; failureReason?: string | null; domains?: Array<{ domain: string }> }>;
  verifyCloudflare?: () => Promise<{ status: string }>;
  now?: string;
} = {}): Promise<DomainProviderVerificationResult> {
  const now = input.now ?? new Date().toISOString();
  const namecheap = new NamecheapReadAdapter();
  const cloudflare = new CloudflareReadAdapter();
  const namecheapRead = input.verifyNamecheap
    ? await input.verifyNamecheap()
    : await namecheap.verifyReadOnly();
  const cloudflareRead = input.verifyCloudflare
    ? await input.verifyCloudflare()
    : await cloudflare.verifyReadOnly();

  let checkedLive: {
    rows: Array<{
      domain: string;
      available: boolean | null;
      registrationPriceUsd: number | null;
      renewalPriceUsd: number | null;
      premium: boolean | null;
      failureReason?: string | null;
    }>;
    failureReason: string | null;
    status: string;
  };
  try {
    checkedLive = input.checkAvailability
      ? { rows: await input.checkAvailability([...CRE_DOMAIN_SHORTLIST]), failureReason: null, status: "READ_ONLY_VERIFIED" }
      : await namecheap.checkAvailability([...CRE_DOMAIN_SHORTLIST]).then((row) => ({
          rows: row.rows,
          failureReason: row.failureReason,
          status: row.status,
        }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checkedLive = { rows: [], failureReason: message, status: "FAILED" };
  }
  let pricing: { registrationPriceUsd: number | null; renewalPriceUsd: number | null; status: string };
  try {
    pricing = input.getPricing
      ? await input.getPricing("com")
      : await namecheap.getStandardTldPricing("com");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pricing = { registrationPriceUsd: null, renewalPriceUsd: null, status: "FAILED" };
    if (!checkedLive.failureReason) checkedLive.failureReason = message;
  }

  const seeds = creDomainCandidateSeeds();
  const bySeed = new Map(seeds.map((row) => [row.domain, row]));
  const checked: DomainAvailabilityEvidence[] = CRE_DOMAIN_SHORTLIST.map((domain) => {
    const evidence = checkedLive.rows.find((row) => row.domain.toLowerCase() === domain);
    const available = evidence?.available === true ? "YES" : evidence?.available === false ? "NO" : "UNKNOWN";
    const firstYear = money(evidence?.registrationPriceUsd ?? (available === "YES" ? pricing.registrationPriceUsd : null));
    const renewal = money(evidence?.renewalPriceUsd ?? (available === "YES" ? pricing.renewalPriceUsd : null));
    return {
      domain,
      available,
      premium: evidence?.premium === true ? "YES" : evidence?.premium === false ? "NO" : "UNKNOWN",
      firstYear,
      renewal,
      currency: "USD",
      providerResponseId: evidence ? `namecheap.domains.check:${domain}` : null,
      evidence: evidence
        ? "LIVE_NAMECHEAP_DOMAINS_CHECK"
        : checkedLive.failureReason ?? "NO_PROVIDER_AVAILABILITY_ROW",
      timestamp: now,
    };
  });

  const availabilityVerification = checked.some((row) => row.available !== "UNKNOWN") ? "PASS" : "FAIL";
  const pricingVerification =
    checked.some((row) => row.firstYear !== "UNKNOWN" || row.renewal !== "UNKNOWN") || pricing.status === "READ_ONLY_VERIFIED"
      ? "PASS"
      : "FAIL";

  const ranked = checked
    .map((row) => {
      const seed = bySeed.get(row.domain);
      return {
        ...row,
        strategicScore: rankScore({
          seedScore: seed?.strategicScore ?? 50,
          available: row.available,
          premium: row.premium,
          firstYear: row.firstYear,
          renewal: row.renewal,
        }),
      };
    })
    .sort((a, b) => b.strategicScore - a.strategicScore);
  const preferred = ranked.find((row) => row.available === "YES") ?? ranked[0]!;
  const conflict = screenDomainConflicts(preferred.domain);

  const namecheapAvailability: ProviderMatrixStatus = availabilityVerification === "PASS" ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
  const namecheapPricing: ProviderMatrixStatus = pricingVerification === "PASS" ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
  const namecheapReadback: ProviderMatrixStatus = asStatus(namecheapRead.status) === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
  const capabilities: Record<DomainCapabilityClass, ProviderMatrixStatus> = {
    "domain.search": namecheapAvailability,
    "domain.availability": namecheapAvailability,
    "domain.pricing": namecheapPricing,
    "domain.registration": "UNVERIFIED",
    "domain.readback": namecheapReadback,
    "domain.ownership": namecheapReadback,
  };
  const namecheapOverall: ProviderMatrixStatus =
    namecheapAvailability === "READ_ONLY_VERIFIED" || namecheapReadback === "READ_ONLY_VERIFIED"
      ? "READ_ONLY_VERIFIED"
      : "UNVERIFIED";

  const unknownCosts = [
    preferred.firstYear === "UNKNOWN" ? "first_year_cost" : null,
    preferred.renewal === "UNKNOWN" ? "renewal_cost" : null,
    "transaction_fees",
    "icann_fee",
    "switching_cost",
  ].filter((row): row is string => row != null);

  const amount = preferred.firstYear === "UNKNOWN" ? Number.NaN : preferred.firstYear;
  const spend = evaluateSpendPolicy({
    category: "DOMAIN_REGISTRATION",
    requestedAmountUsd: amount,
    estimatedRecurringAmountUsd: preferred.renewal === "UNKNOWN" ? null : preferred.renewal,
    budget: {
      id: "cre-domain-verify-treasury",
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
    renewalPriceUnknown: preferred.renewal === "UNKNOWN",
  });
  void buildDomainAcquisitionPlan(CRE_VENTURE_ID);
  void buildDomainPurchaseAuthorization();

  const purchaseReadiness: DomainPurchaseReadiness =
    availabilityVerification === "FAIL"
      ? "DOMAIN_PURCHASE_PROVIDER_WRITE_VERIFICATION_REQUIRED"
      : preferred.available !== "YES"
        ? "DOMAIN_SELECTION_REQUIRED"
        : "DOMAIN_PURCHASE_PROVIDER_WRITE_VERIFICATION_REQUIRED";

  return {
    mission: "CRE_DOMAIN_PROVIDER_VERIFICATION_V1",
    Namecheap: namecheapOverall,
    capabilities,
    cloudflareDns: asStatus(cloudflareRead.status),
    availabilityVerification,
    pricingVerification,
    failureReason: checkedLive.failureReason ?? (availabilityVerification === "FAIL" ? "NAMECHEAP_AVAILABILITY_UNVERIFIED" : null),
    checked,
    preferred: {
      domain: preferred.domain,
      strategicScore: preferred.strategicScore,
      firstYear: preferred.firstYear,
      renewal: preferred.renewal,
      available: preferred.available,
    },
    conflict,
    registrationWriteAuthority: "REGISTRATION_WRITE_AUTHORITY_UNVERIFIED",
    purchaseReadiness,
    treasury: Number.isFinite(amount) || spend.outcome === "DENIED" ? "PASS" : "NOT_APPLICABLE",
    eag: "AUTHORIZATION_REQUIRED",
    purchaseAuthorization: "NOT_GRANTED",
    purchases: 0,
    unknownCosts,
  };
}
