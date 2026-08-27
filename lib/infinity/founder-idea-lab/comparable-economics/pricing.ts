import type { FounderResearchFinding } from "../research-packet";
import { bandAround, midpointRange, unknownRange, type EconomicRange } from "./provenance";
import type { NormalizedPrice } from "./types";

const MONEY = /\$\s*([\d,]+(?:\.\d+)?)/g;
const RANGE = /\$\s*([\d,]+(?:\.\d+)?)\s*(?:[-–—]|to)\s*\$?\s*([\d,]+(?:\.\d+)?)/i;

function parseMoney(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

export function parseMoneyRange(claim: string): EconomicRange {
  const range = claim.match(RANGE);
  if (range) return midpointRange(parseMoney(range[1]!), parseMoney(range[2]!));
  const singles: number[] = [];
  for (const match of claim.matchAll(MONEY)) {
    const value = parseMoney(match[1]!);
    if (Number.isFinite(value)) singles.push(value);
  }
  if (singles.length === 0) return unknownRange();
  if (singles.length === 1) return bandAround(singles[0]!);
  return midpointRange(Math.min(...singles), Math.max(...singles));
}

export function isMonthlyPriceClaim(claim: string): boolean {
  return /per month|\/\s*mo|monthly subscription/i.test(claim);
}

export function isSetupPriceClaim(claim: string): boolean {
  return /setup|onboarding|implementation fee|one[- ]time/i.test(claim);
}

export function normalizePricingObservation(finding: FounderResearchFinding): NormalizedPrice | null {
  const range = parseMoneyRange(finding.claim);
  if (range.base == null && range.low == null && range.high == null) return null;
  const monthly = isMonthlyPriceClaim(finding.claim) ? range.base : /annual|per year|\/\s*yr/i.test(finding.claim) ? (range.base != null ? Math.round(range.base / 12) : null) : isSetupPriceClaim(finding.claim) ? null : range.base;
  const setup = isSetupPriceClaim(finding.claim) ? range.base : null;
  const annual =
    monthly != null ? monthly * 12 : /annual|per year/i.test(finding.claim) ? range.base : null;
  return {
    original: finding.claim,
    monthlyRecurringEquivalent: monthly,
    setupFee: setup,
    annualEquivalent: annual,
    minimumCommitment: /annual/i.test(finding.claim) ? "annual" : null,
    variableCharges: /usage|per location|per seat|commission/i.test(finding.claim) ? finding.claim : null,
    includedServices: /seo|content|hosting|support/i.test(finding.claim) ? ["see source claim"] : [],
    premiumFeatures: /premium|add-on|addon/i.test(finding.claim) ? ["see source claim"] : [],
    sourceRef: finding.sourceUrls[0] ?? finding.findingId,
  };
}

export function missingPriceIsNotFree(claim: string): boolean {
  return !/free\b/i.test(claim);
}
