import {
  formatRange,
  isKnownNumber,
  unknownRange,
  type EconomicEvidenceClass,
  type EconomicRange,
} from "./provenance";
import type {
  EconomicHealthState,
  SensitivityDriver,
  UnitEconomicsScenario,
} from "./types";

function ratio(ltv: number | null, cac: number | null): number | null {
  if (!isKnownNumber(ltv) || !isKnownNumber(cac) || cac === 0) return null;
  return Math.round((ltv / cac) * 100) / 100;
}

function payback(cac: number | null, monthlyContribution: number | null): number | null {
  if (!isKnownNumber(cac) || !isKnownNumber(monthlyContribution) || monthlyContribution <= 0) return null;
  return Math.round((cac / monthlyContribution) * 10) / 10;
}

export function ltvCacRange(ltv: EconomicRange, cac: EconomicRange): EconomicRange {
  return {
    low: ratio(ltv.low, cac.high),
    base: ratio(ltv.base, cac.base),
    high: ratio(ltv.high, cac.low),
  };
}

export function paybackRange(input: {
  cac: EconomicRange;
  monthlyRevenue: EconomicRange;
  grossMarginPercent: EconomicRange;
}): EconomicRange {
  const contribution = (price: number | null, margin: number | null) =>
    isKnownNumber(price) && isKnownNumber(margin) ? price * margin : null;
  return {
    low: payback(input.cac.low, contribution(input.monthlyRevenue.high, input.grossMarginPercent.high)),
    base: payback(input.cac.base, contribution(input.monthlyRevenue.base, input.grossMarginPercent.base)),
    high: payback(input.cac.high, contribution(input.monthlyRevenue.low, input.grossMarginPercent.low)),
  };
}

export function breakEvenCustomers(input: {
  monthlyFixedCost: number | null;
  monthlyContribution: number | null;
}): number | null {
  if (!isKnownNumber(input.monthlyFixedCost) || !isKnownNumber(input.monthlyContribution) || input.monthlyContribution <= 0) {
    return null;
  }
  return Math.ceil(input.monthlyFixedCost / input.monthlyContribution);
}

export function breakEvenRange(input: {
  monthlyFixedCost: number | null;
  monthlyRevenue: EconomicRange;
  grossMarginPercent: EconomicRange;
}): EconomicRange {
  if (!isKnownNumber(input.monthlyFixedCost)) return unknownRange();
  const customers = (price: number | null, margin: number | null) =>
    breakEvenCustomers({
      monthlyFixedCost: input.monthlyFixedCost,
      monthlyContribution: isKnownNumber(price) && isKnownNumber(margin) ? price * margin : null,
    });
  return {
    low: customers(input.monthlyRevenue.high, input.grossMarginPercent.high),
    base: customers(input.monthlyRevenue.base, input.grossMarginPercent.base),
    high: customers(input.monthlyRevenue.low, input.grossMarginPercent.low),
  };
}

export function buildScenarios(input: {
  monthly: EconomicRange;
  setup: EconomicRange;
  cac: EconomicRange;
  ltv: EconomicRange;
  margin: EconomicRange;
  churn: EconomicRange;
  lifetime: EconomicRange;
  ltvCac: EconomicRange;
  payback: EconomicRange;
  breakEven: EconomicRange;
  provenance: EconomicEvidenceClass;
}): UnitEconomicsScenario[] {
  const pick = (range: EconomicRange, id: UnitEconomicsScenario["id"]) =>
    id === "CONSERVATIVE" ? range.low : id === "UPSIDE" ? range.high : range.base;
  return (["CONSERVATIVE", "BASE", "UPSIDE"] as const).map((id) => ({
    id,
    pricingMonthly: pick(input.monthly, id),
    setup: pick(input.setup, id),
    arpu: pick(input.monthly, id),
    cac: pick(input.cac, id),
    ltv: pick(input.ltv, id),
    grossMarginPercent: pick(input.margin, id),
    monthlyChurn: pick(input.churn, id),
    lifetimeMonths: pick(input.lifetime, id),
    ltvCac: pick(input.ltvCac, id),
    paybackMonths: pick(input.payback, id),
    breakEvenCustomers: pick(input.breakEven, id),
    provenance: input.provenance,
  }));
}

export function assessEconomicHealth(input: {
  ltvCac: EconomicRange;
  provenance: EconomicEvidenceClass;
}): { health: EconomicHealthState; why: string } {
  if (!isKnownNumber(input.ltvCac.base) && !isKnownNumber(input.ltvCac.low)) {
    return { health: "INSUFFICIENT_DATA", why: "Modeled LTV/CAC is UNKNOWN; unknown is not zero." };
  }
  const base = input.ltvCac.base ?? input.ltvCac.low!;
  const modeledNote =
    input.provenance === "COMPARABLE_MODELED"
      ? " This is COMPARABLE_MODELED, not OBSERVED operating history."
      : input.provenance === "VALIDATION_ESTIMATE"
        ? " This is VALIDATION_ESTIMATE, not OBSERVED."
        : "";
  if (base < 1) return { health: "UNATTRACTIVE", why: `Modeled LTV/CAC base ${base} is below 1.${modeledNote}` };
  if (base < 2) return { health: "MARGINAL", why: `Modeled LTV/CAC base ${base} is below 2.${modeledNote}` };
  if (input.provenance !== "OBSERVED") {
    return {
      health: "PROMISING_BUT_UNVALIDATED",
      why: `Modeled LTV/CAC base ${base} is ${formatRange(input.ltvCac)}.${modeledNote} It cannot grant BUILD.`,
    };
  }
  return { health: "ATTRACTIVE", why: `Observed LTV/CAC base ${base} meets attractiveness threshold.` };
}

export function sensitivityDrivers(input: {
  churnKnown: boolean;
  cacKnown: boolean;
  priceKnown: boolean;
  marginKnown: boolean;
}): SensitivityDriver[] {
  const drivers: SensitivityDriver[] = [];
  if (!input.churnKnown) {
    drivers.push({ name: "churn", direction: "downside", why: "Lifetime and LTV scale with 1/churn; churn is UNKNOWN." });
    drivers.push({ name: "retention", direction: "upside", why: "Lower churn would raise LTV and LTV/CAC if CAC is known." });
  }
  if (!input.cacKnown) {
    drivers.push({ name: "CAC", direction: "downside", why: "Acquisition cost is UNKNOWN and blocks BUILD economics." });
    drivers.push({ name: "CAC", direction: "upside", why: "A measured low CAC would raise LTV/CAC if LTV is known." });
  }
  if (!input.priceKnown) {
    drivers.push({ name: "price", direction: "downside", why: "Monthly price is UNKNOWN, so ARPU and LTV cannot close." });
  }
  if (!input.marginKnown) {
    drivers.push({ name: "gross margin", direction: "downside", why: "Contribution margin is UNKNOWN; generic SaaS 80% is not assumed." });
  }
  return drivers;
}
