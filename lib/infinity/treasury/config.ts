import { DEFAULT_CURRENCY, TREASURY_POLICY_VERSION } from "./constants";
import type { TreasuryBudgetCategory } from "./constants";

export const TREASURY_STALE_AFTER_MS = 15 * 60 * 1000;

export type TreasuryPolicyConfig = {
  policyVersion: string;
  currency: string;
  /** V1 default: false — no real spend. */
  financialAutonomyEnabledDefault: boolean;
  /** Distinguishes emergency freeze from normal disabled autonomy. */
  emergencyFinancialFreezeDefault: boolean;
  maximumSingleAutonomousPurchase: number | null;
  dailySpendingCeiling: number | null;
  monthlySpendingCeiling: number | null;
  categoryLimits: Partial<Record<TreasuryBudgetCategory, number | null>>;
  merchantAllowlist: string[] | null;
  providerAllowlist: string[] | null;
  categoryRestrictions: TreasuryBudgetCategory[];
  unknownCostDecision: "BLOCK" | "REQUIRE_POLICY_ESCALATION";
  staleAfterMs: number;
};

export const DEFAULT_TREASURY_POLICY: TreasuryPolicyConfig = {
  policyVersion: TREASURY_POLICY_VERSION,
  currency: DEFAULT_CURRENCY,
  financialAutonomyEnabledDefault: false,
  emergencyFinancialFreezeDefault: false,
  maximumSingleAutonomousPurchase: 50,
  dailySpendingCeiling: 100,
  monthlySpendingCeiling: 500,
  categoryLimits: {
    AI_API: 200,
    HOSTING: 100,
    DOMAINS: 40,
    MARKETING: 0,
    CREATIVE_MEDIA: 25,
    SOFTWARE_TOOLS: 50,
    DATA: 50,
    VENDORS_CONTRACTORS: 0,
    CONTINGENCY: 50,
    PAYMENT_PROCESSING: 25,
    OTHER: 25,
  },
  merchantAllowlist: null,
  providerAllowlist: null,
  categoryRestrictions: [],
  unknownCostDecision: "BLOCK",
  staleAfterMs: TREASURY_STALE_AFTER_MS,
};

export function resolveTreasuryPolicy(overrides?: Partial<TreasuryPolicyConfig>): TreasuryPolicyConfig {
  return {
    ...DEFAULT_TREASURY_POLICY,
    ...overrides,
    categoryLimits: {
      ...DEFAULT_TREASURY_POLICY.categoryLimits,
      ...overrides?.categoryLimits,
    },
  };
}
