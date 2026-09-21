import type { FounderResearchFinding } from "../research-packet";
import { bandAround, midpointRange, unknownRange, type EconomicRange } from "./provenance";
import type { NormalizedPrice } from "./types";
import { extractMoneyObservations, isVagueNonNumericLanguage } from "../revenue-model-research/extract";

export function parseMoneyRange(claim: string): EconomicRange {
  if (isVagueNonNumericLanguage(claim)) return unknownRange();
  const observations = extractMoneyObservations(claim).filter((item) => item.unit === "USD" && !item.vagueLanguage);
  const amounts = observations.flatMap((item) => [item.amountLow, item.amountHigh, item.amount]).filter((item): item is number => item != null);
  if (!amounts.length) return unknownRange();
  if (amounts.length === 1) return bandAround(amounts[0]!);
  return midpointRange(Math.min(...amounts), Math.max(...amounts));
}

export function isMonthlyPriceClaim(claim: string): boolean {
  if (isVagueNonNumericLanguage(claim)) return false;
  return extractMoneyObservations(claim).some(
    (item) => item.monthlyRecurringEquivalent != null && item.kind !== "SETUP_FEE" && item.kind !== "QUALITATIVE_ONLY",
  );
}

export function isSetupPriceClaim(claim: string): boolean {
  if (isVagueNonNumericLanguage(claim)) return false;
  return extractMoneyObservations(claim).some((item) => item.kind === "SETUP_FEE");
}

export function normalizePricingObservation(finding: FounderResearchFinding): NormalizedPrice | null {
  if (isVagueNonNumericLanguage(finding.claim)) return null;
  const observations = extractMoneyObservations(finding.claim).filter((item) => !item.vagueLanguage && item.kind !== "QUALITATIVE_ONLY");
  if (!observations.length) return null;
  const monthlyObs = observations.filter((item) => item.monthlyRecurringEquivalent != null);
  const setupObs = observations.filter((item) => item.kind === "SETUP_FEE");
  const monthly = monthlyObs.length ? monthlyObs.map((item) => item.monthlyRecurringEquivalent as number).reduce((a, b) => a + b, 0) / monthlyObs.length : null;
  const setup = setupObs.length ? setupObs.map((item) => item.amount as number).reduce((a, b) => a + b, 0) / setupObs.length : null;
  const annual = monthly != null ? monthly * 12 : observations.find((item) => item.kind === "ANNUAL_PRICE")?.amount ?? null;
  if (monthly == null && setup == null && annual == null && !observations.some((item) => item.kind === "COMMISSION")) return null;
  return {
    original: finding.claim,
    monthlyRecurringEquivalent: monthly,
    setupFee: setup,
    annualEquivalent: annual,
    minimumCommitment: /annual/i.test(finding.claim) ? "annual" : null,
    variableCharges: observations.some((item) => item.perSeat || item.perLocation || item.kind === "COMMISSION") ? finding.claim : null,
    includedServices: /seo|content|hosting|support/i.test(finding.claim) ? ["see source claim"] : [],
    premiumFeatures: /premium|add-on|addon/i.test(finding.claim) ? ["see source claim"] : [],
    sourceRef: finding.sourceUrls[0] ?? finding.findingId,
  };
}

export function missingPriceIsNotFree(claim: string): boolean {
  return !/free\b/i.test(claim);
}
