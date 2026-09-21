import { unknownRange, type EconomicRange } from "../comparable-economics/provenance";
import type {
  BandRevenueScenario,
  BreakEvenRevenue,
  CustomerCountScenario,
  ModeledArpu,
  RevenueMix,
  RevenuePerCustomer,
} from "./types";

const DEFAULT_COUNTS = [10, 25, 50, 100];

function mul(value: number | null, n: number): number | null {
  return value == null ? null : value * n;
}

export function composeRevenuePerCustomer(input: {
  monthly: EconomicRange;
  setup: EconomicRange;
  upsellMonthly: EconomicRange;
  grossMargin: EconomicRange;
  provenance: RevenuePerCustomer["provenance"];
  arpuModel?: ModeledArpu;
}): RevenuePerCustomer {
  const monthly = input.monthly.base ?? input.monthly.low;
  const setup = input.setup.base ?? input.setup.low;
  const upsell = input.upsellMonthly.base ?? input.upsellMonthly.low;
  const firstYear =
    monthly != null ? monthly * 12 + (setup ?? 0) + (upsell ?? 0) * 12 : setup != null ? setup : null;
  const margin = input.grossMargin.base ?? input.grossMargin.low;
  const firstYearGp = firstYear != null && margin != null ? firstYear * margin : null;
  const firstYearRecurring = {
    low: mul(input.monthly.low, 12),
    base: mul(input.monthly.base, 12),
    high: mul(input.monthly.high, 12),
  };
  const firstYearAddOn = {
    low: mul(input.upsellMonthly.low, 12),
    base: mul(input.upsellMonthly.base, 12),
    high: mul(input.upsellMonthly.high, 12),
  };
  return {
    monthlyRecurring: input.monthly,
    annualRecurring: firstYearRecurring,
    firstYearRecurring,
    firstYearSetup: input.setup,
    firstYearAddOn,
    firstYearRevenue: {
      low: firstYear,
      base: firstYear,
      high: firstYear,
    },
    firstYearGrossProfit: firstYearGp == null ? unknownRange() : { low: firstYearGp, base: firstYearGp, high: firstYearGp },
    recurring: input.monthly,
    oneTime: input.setup,
    upsell: input.upsellMonthly,
    coreRecurringARPU: input.arpuModel?.core ?? input.monthly,
    managedServiceARPU: input.arpuModel?.managedService ?? unknownRange(),
    addOnARPU: input.arpuModel?.addOn ?? input.upsellMonthly,
    totalModeledMonthlyRevenuePerCustomer: unknownRange(),
    provenance: monthly != null || setup != null ? input.provenance : "UNKNOWN",
    arpuModel: input.arpuModel ?? {
      range: input.monthly,
      core: input.monthly,
      managedService: unknownRange(),
      addOn: input.upsellMonthly,
      total: unknownRange(),
      selfServe: unknownRange(),
      managedVertical: unknownRange(),
      observations: [],
      aggregationMethod: input.monthly.base != null || input.monthly.low != null ? "monthly_range" : "none",
      confidence: input.monthly.base != null ? "MEDIUM" : input.monthly.low != null ? "LOW" : "NONE",
      provenance: monthly != null ? input.provenance : "UNKNOWN",
      ventureObserved: "UNKNOWN",
      falsePrecision: false,
      recommendedPricingCluster: null,
      selectedPricingCluster: null,
      clusterReason: "No priced observations for cluster selection.",
      clusterConfidence: "NONE",
      sampleCount: 0,
      sourceQuality: "NONE",
      independenceState: "INDEPENDENCE_UNKNOWN",
      qualityReplacementRequired: false,
    },
  };
}

export function composeCustomerCountScenarios(input: {
  monthly: number | null;
  setup: number | null;
  addOnMonthly: number | null;
  counts?: number[];
}): CustomerCountScenario[] {
  return (input.counts ?? DEFAULT_COUNTS).map((customers) => {
    const mrr = mul(input.monthly, customers);
    const arr = mul(mrr, 12);
    const setupRevenue = mul(input.setup, customers);
    const addOnRevenue = mul(input.addOnMonthly, customers * 12);
    const total =
      mrr == null && setupRevenue == null && addOnRevenue == null
        ? null
        : (arr ?? 0) + (setupRevenue ?? 0) + (addOnRevenue ?? 0);
    return {
      customers,
      mrr,
      arr,
      setupRevenue,
      addOnRevenue,
      totalFirstYearRevenue: total,
      provenance: "SCENARIO_MODEL",
      notAForecast: true,
    };
  });
}

export function composeBandScenarios(input: {
  monthly: EconomicRange;
  setup: EconomicRange;
  addOnMonthly: number | null;
}): BandRevenueScenario[] {
  const rows: Array<{ id: BandRevenueScenario["id"]; customers: number; price: number | null; setup: number | null }> = [
    { id: "CONSERVATIVE", customers: 10, price: input.monthly.low, setup: input.setup.low },
    { id: "BASE", customers: 25, price: input.monthly.base ?? input.monthly.low, setup: input.setup.base ?? input.setup.low },
    { id: "UPSIDE", customers: 50, price: input.monthly.high ?? input.monthly.base, setup: input.setup.high ?? input.setup.base },
  ];
  return rows.map((row) => {
    const mrr = mul(row.price, row.customers);
    const arr = mul(mrr, 12);
    const setupRevenue = mul(row.setup, row.customers);
    const addOnRevenue = mul(input.addOnMonthly, row.customers * 12);
    const total =
      mrr == null && setupRevenue == null && addOnRevenue == null ? null : (arr ?? 0) + (setupRevenue ?? 0) + (addOnRevenue ?? 0);
    return {
      id: row.id,
      customers: row.customers,
      mrr,
      arr,
      setupRevenue,
      addOnRevenue,
      totalFirstYearRevenue: total,
      provenance: "SCENARIO_MODEL",
      notAForecast: true,
    };
  });
}

export function composeRevenueMix(input: {
  monthly: number | null;
  setup: number | null;
  addOnMonthly: number | null;
  serviceMonthly: number | null;
  transactional: boolean;
}): RevenueMix {
  const recurringYear = input.monthly == null ? 0 : input.monthly * 12;
  const addOnYear = input.addOnMonthly == null ? 0 : input.addOnMonthly * 12;
  const serviceYear = input.serviceMonthly == null ? 0 : input.serviceMonthly * 12;
  const oneTime = input.setup ?? 0;
  const total = recurringYear + addOnYear + serviceYear + oneTime;
  if (total <= 0 || (input.monthly == null && input.setup == null)) {
    return {
      percentRecurring: null,
      percentOneTime: null,
      percentService: null,
      percentAddOn: null,
      percentTransaction: input.transactional ? null : null,
    };
  }
  return {
    percentRecurring: Math.round((recurringYear / total) * 100),
    percentOneTime: Math.round((oneTime / total) * 100),
    percentService: Math.round((serviceYear / total) * 100),
    percentAddOn: Math.round((addOnYear / total) * 100),
    percentTransaction: input.transactional ? null : 0,
  };
}

export function composeBreakEven(input: {
  monthlyFixedCost: number | null;
  monthlyContribution: number | null;
}): BreakEvenRevenue {
  if (input.monthlyFixedCost == null || input.monthlyContribution == null || input.monthlyContribution <= 0) {
    return { customers: null, mrr: null, arr: null, known: false };
  }
  const customers = Math.ceil(input.monthlyFixedCost / input.monthlyContribution);
  const mrr = customers * (input.monthlyContribution);
  return { customers, mrr, arr: mrr * 12, known: true };
}
