import { newId } from "../store";
import type { DomainCandidate, DomainCandidateScoreBreakdown, DomainRequirement, FinancialTruth } from "../types";
import type { DomainSearchResult, RegistrarCapability } from "../providers/contracts";
import { normalizeDomainSearchResult } from "../providers/normalize-search";

function slugifyBrand(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

function scoreCandidate(input: {
  domain: string;
  tld: string;
  brandName: string;
  keywords: string[];
  requirement: DomainRequirement;
  availability: DomainSearchResult;
}): { total: number; breakdown: DomainCandidateScoreBreakdown } {
  const base = slugifyBrand(input.brandName);
  const label = input.domain.replace(input.tld, "");
  const len = label.length;

  const brandFit = label.includes(base) || base.includes(label) ? 0.9 : label.includes(base.slice(0, 4)) ? 0.6 : 0.35;
  const memorability = len <= 12 ? 0.85 : len <= 18 ? 0.6 : 0.35;
  const spellingClarity = /[^a-z0-9-]/.test(label) ? 0.2 : input.requirement.avoidHyphens && label.includes("-") ? 0.45 : 0.8;
  const lengthScore = len <= (input.requirement.maxLength ?? 16) ? 0.85 : 0.4;
  const customerRelevance = input.keywords.some((k) => label.includes(k.toLowerCase())) ? 0.75 : 0.45;
  const tldQuality = input.tld === ".com" ? 0.95 : input.tld === ".io" ? 0.75 : 0.55;
  const businessRelevance = brandFit;
  const price =
    input.availability.registrationPriceUsd != null &&
    input.requirement.maximumPurchasePriceUsd != null &&
    input.availability.registrationPriceUsd <= input.requirement.maximumPurchasePriceUsd
      ? 0.9
      : input.availability.registrationPriceUsd != null
        ? 0.5
        : 0.3;
  const renewalCost =
    input.availability.renewalPriceUsd != null ? 0.7 : input.availability.priceTruth === "UNKNOWN" ? 0.35 : 0.5;
  const confusionRisk = label.length > 20 ? 0.3 : 0.75;
  const trademarkRiskSignal = label.includes("google") || label.includes("apple") ? 0.2 : 0.8;

  const weights = {
    brandFit: 0.16,
    memorability: 0.1,
    spellingClarity: 0.08,
    length: 0.08,
    customerRelevance: 0.08,
    tldQuality: 0.1,
    businessRelevance: 0.1,
    price: 0.12,
    renewalCost: 0.08,
    confusionRisk: 0.05,
    trademarkRiskSignal: 0.05,
  };

  const breakdown: DomainCandidateScoreBreakdown = {
    brandFit,
    memorability,
    spellingClarity,
    length: lengthScore,
    customerRelevance,
    tldQuality,
    businessRelevance,
    price,
    renewalCost,
    confusionRisk,
    trademarkRiskSignal,
  };

  const total =
    brandFit * weights.brandFit +
    memorability * weights.memorability +
    spellingClarity * weights.spellingClarity +
    lengthScore * weights.length +
    customerRelevance * weights.customerRelevance +
    tldQuality * weights.tldQuality +
    businessRelevance * weights.businessRelevance +
    price * weights.price +
    renewalCost * weights.renewalCost +
    confusionRisk * weights.confusionRisk +
    trademarkRiskSignal * weights.trademarkRiskSignal;

  return { total: Math.round(total * 1000) / 1000, breakdown };
}

export function generateDomainCandidates(requirement: DomainRequirement): string[] {
  const base = slugifyBrand(requirement.brandName);
  const keywords = requirement.preferredKeywords.map((k) => k.toLowerCase().replace(/\s+/g, ""));
  const stems = [base, ...keywords.slice(0, 2).map((k) => `${base}${k}`), `${base}hq`, `${base}app`];
  const domains: string[] = [];

  for (const tld of requirement.preferredTlds) {
    for (const stem of stems) {
      if (requirement.avoidHyphens) domains.push(`${stem}${tld}`);
      else domains.push(`${stem}${tld}`, `${stem}-app${tld}`);
    }
  }

  return [...new Set(domains)].slice(0, 12);
}

export async function buildDomainCandidates(input: {
  requirement: DomainRequirement;
  registrar: RegistrarCapability;
}): Promise<DomainCandidate[]> {
  const queries = generateDomainCandidates(input.requirement);
  const results = await input.registrar.searchDomains(queries);

  return results.map((raw) => {
    const availability = normalizeDomainSearchResult(raw);
    const tld = input.requirement.preferredTlds.find((t) => availability.domain.endsWith(t)) ?? ".com";
    const scored = scoreCandidate({
      domain: availability.domain,
      tld,
      brandName: input.requirement.brandName,
      keywords: input.requirement.preferredKeywords,
      requirement: input.requirement,
      availability,
    });

    return {
      id: newId(),
      organizationId: input.requirement.organizationId,
      domainRequirementId: input.requirement.id,
      domain: availability.domain,
      tld,
      available: availability.available,
      registrationPriceUsd: availability.registrationPriceUsd,
      renewalPriceUsd: availability.renewalPriceUsd,
      priceTruth: availability.priceTruth,
      totalScore: scored.total,
      scoreBreakdown: scored.breakdown,
      selected: false,
    } satisfies DomainCandidate;
  }).sort((a, b) => b.totalScore - a.totalScore);
}

export function selectTopDomainCandidate(candidates: DomainCandidate[]): DomainCandidate | null {
  const available = candidates.filter((c) => c.available);
  if (available.length === 0) return null;
  available[0]!.selected = true;
  return available[0]!;
}

export function renewalPriceUnknown(candidate: DomainCandidate): boolean {
  return candidate.renewalPriceUsd == null || candidate.priceTruth === "UNKNOWN";
}

export function priceTruthForCandidate(candidate: DomainCandidate): FinancialTruth {
  return candidate.priceTruth;
}
