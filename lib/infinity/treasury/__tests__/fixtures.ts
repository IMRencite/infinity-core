import { createBudget } from "../budgets/engine";
import { resolveTreasuryPolicy } from "../config";
import { setFinancialAutonomy } from "../freeze/control";
import { TreasuryStore } from "../store";
import { actualAmount } from "../types";
import { createVentureAllocation } from "../allocations/venture";

export const ORG_A = "11111111-1111-4111-8111-111111111111";
export const ORG_B = "22222222-2222-4222-8222-222222222222";
export const VENTURE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const MISSION_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export function createGovernedStore(input?: {
  autonomy?: boolean;
  globalAllocated?: number;
  ventureAllocated?: number;
  domainAllocated?: number;
  creativeAllocated?: number;
  dailyAllocated?: number;
  monthlyAllocated?: number;
  monthlyCeiling?: number;
  dailyCeiling?: number;
  singleLimit?: number;
}) {
  const store = new TreasuryStore();
  store.policyByOrg.set(
    ORG_A,
    resolveTreasuryPolicy({
      maximumSingleAutonomousPurchase: input?.singleLimit ?? 10_000,
      dailySpendingCeiling: input?.dailyCeiling ?? 50_000,
      monthlySpendingCeiling: input?.monthlyCeiling ?? 100_000,
      categoryLimits: {
        AI_API: 10_000,
        HOSTING: 10_000,
        DOMAINS: 10_000,
        MARKETING: 10_000,
        CREATIVE_MEDIA: 10_000,
        SOFTWARE_TOOLS: 10_000,
        DATA: 10_000,
        VENDORS_CONTRACTORS: 10_000,
        CONTINGENCY: 10_000,
        PAYMENT_PROCESSING: 10_000,
        OTHER: 10_000,
      },
    }),
  );
  if (input?.autonomy) setFinancialAutonomy(store, ORG_A, true);

  const global = createBudget(store, {
    scope: { scopeType: "GLOBAL", organizationId: ORG_A, currency: "USD" },
    allocated: actualAmount(input?.globalAllocated ?? 10_000),
  });
  const venture = createBudget(store, {
    scope: { scopeType: "VENTURE", organizationId: ORG_A, ventureId: VENTURE_A, currency: "USD" },
    allocated: actualAmount(input?.ventureAllocated ?? 1_000),
  });
  createVentureAllocation(store, {
    organizationId: ORG_A,
    ventureId: VENTURE_A,
    capitalAllocated: actualAmount(input?.ventureAllocated ?? 1_000),
    stage: "VALIDATION",
  });
  if (input?.domainAllocated != null) {
    createBudget(store, {
      scope: { scopeType: "CATEGORY", organizationId: ORG_A, category: "DOMAINS", currency: "USD" },
      allocated: actualAmount(input.domainAllocated),
    });
  }
  if (input?.creativeAllocated != null) {
    createBudget(store, {
      scope: { scopeType: "CATEGORY", organizationId: ORG_A, category: "CREATIVE_MEDIA", currency: "USD" },
      allocated: actualAmount(input.creativeAllocated),
    });
  }
  if (input?.dailyAllocated != null) {
    createBudget(store, {
      scope: { scopeType: "DAILY", organizationId: ORG_A, period: "DAILY", currency: "USD" },
      allocated: actualAmount(input.dailyAllocated),
    });
  }
  if (input?.monthlyAllocated != null) {
    createBudget(store, {
      scope: { scopeType: "MONTHLY", organizationId: ORG_A, period: "MONTHLY", currency: "USD" },
      allocated: actualAmount(input.monthlyAllocated),
    });
  }

  return { store, global, venture };
}
