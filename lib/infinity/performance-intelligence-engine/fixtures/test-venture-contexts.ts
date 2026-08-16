import type { VenturePerformanceContext } from "../types";

export const TEST_VENTURE_HIGH_VALUE: VenturePerformanceContext = {
  ventureId: "venture-ecommerce-fraud",
  ventureModelType: "lead_gen",
  ventureTitle: "Ecommerce Reverse Logistics & Fraud Prevention",
  expectedConversionRate: 0.04,
  expectedCac: 120,
  expectedRevenue: 5000,
  expectedOrganicTraffic: 500,
  expectedMediaCtr: 0.035,
  expectationProvenance: "monetization_plan:test",
};

export const TEST_VENTURE_SUBSCRIPTION: VenturePerformanceContext = {
  ventureId: "venture-saas-subscription",
  ventureModelType: "subscription",
  expectedConversionRate: 0.03,
  expectedCac: 200,
  expectedRevenue: 8000,
  expectationProvenance: "monetization_plan:subscription",
};

export const TEST_VENTURE_MARKETPLACE: VenturePerformanceContext = {
  ventureId: "venture-marketplace",
  ventureModelType: "marketplace",
  expectedConversionRate: 0.025,
  expectedRevenue: 12000,
  expectationProvenance: "monetization_plan:marketplace",
};

export const TEST_VENTURE_LOW_VALUE: VenturePerformanceContext = {
  ventureId: "venture-low-value",
  ventureModelType: "generic",
  expectedConversionRate: 0.01,
  expectedCac: 50,
  expectedRevenue: 5,
  expectationProvenance: "monetization_plan:low",
};

export const TEST_VENTURE_CONTEXTS: VenturePerformanceContext[] = [
  TEST_VENTURE_HIGH_VALUE,
  TEST_VENTURE_SUBSCRIPTION,
  TEST_VENTURE_MARKETPLACE,
];
