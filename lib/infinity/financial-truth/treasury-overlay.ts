import { displayMoney, displayNotSet } from "./amounts";
import { projectMercuryFounderPresentationFromTreasury } from "./mercury-founder-presentation";
import type { CanonicalTreasuryProjection } from "./types";
import type { TreasuryHqReadModel, TruthfulHqValue } from "@/lib/infinity/treasury/hq/read-model";
import { unknownAmount } from "@/lib/infinity/treasury/types";

function actual(display: string): TruthfulHqValue {
  return { display, actuality: display === "UNKNOWN" ? "UNKNOWN" : "ACTUAL", stale: false };
}

export function overlayCanonicalTreasuryOnHqReadModel(
  model: TreasuryHqReadModel,
  projection: CanonicalTreasuryProjection,
): TreasuryHqReadModel {
  return {
    ...model,
    cards: {
      ...model.cards,
      totalCash: actual(projection.verified_treasury_cash.display),
      internalCapital: actual(projection.authorized_capital.display),
      availableCapital: actual(projection.remaining_authorization.display),
      infinityAllocatedCapital: actual(projection.allocated_capital.display),
      unallocatedCapital: actual(projection.unallocated_authorized_capital.display),
      reservedCapital: actual(displayMoney(projection.allocations.reduce((sum, row) => sum + row.reserved_amount, 0))),
      committedCapital: actual(projection.committed_capital.display),
      monthlyBudget: actual(projection.monthly_burn_cap.display),
      monthlySpend: actual(projection.actual_spend.display),
      revenue: actual(displayMoney(0)),
    },
    state: {
      ...model.state,
      providerFreshness:
        projection.treasury_status === "LIVE"
          ? "FRESH"
          : projection.cash_completeness === "PARTIAL" || projection.treasury_status === "DEGRADED"
            ? "UNAVAILABLE"
            : model.state.providerFreshness === "NOT_CONFIGURED"
              ? "UNAVAILABLE"
              : model.state.providerFreshness,
    },
    treasurySource: "CANONICAL FINANCIAL TRUTH",
    bankingProvider: "Mercury",
    freshnessLabel:
      projection.treasury_status === "LIVE"
        ? "TREASURY POLICY OPERATIONAL"
        : "MERCURY VERIFICATION DEGRADED",
    constraints: [
      {
        label: "Portfolio capital ceiling",
        category: null,
        spent: actual(projection.actual_spend.display),
        reserved: actual(displayMoney(projection.allocations.reduce((sum, row) => sum + row.reserved_amount, 0))),
        committed: actual(projection.committed_capital.display),
        available: actual(projection.unallocated_authorized_capital.display),
        ceiling: actual(displayMoney(projection.portfolio_budget.portfolio_capital_ceiling)),
      },
      {
        label: "Monthly burn cap",
        category: null,
        spent: actual(projection.actual_spend.display),
        reserved: actual("$0"),
        committed: actual(projection.committed_capital.display),
        available: actual(displayNotSet(projection.portfolio_budget.monthly_burn_cap)),
        ceiling: actual(displayNotSet(projection.portfolio_budget.monthly_burn_cap)),
      },
    ],
    transactions: projection.transactions.map((txn) => ({
      date: txn.date,
      amount: actual(txn.amount),
      merchant: txn.description,
      category: txn.classification,
      ventureId: txn.venture_attribution,
      purpose: txn.classification,
      provider: "Mercury",
      financialActionId: txn.safe_transaction_id,
      authorizationSource: "READ_ONLY",
      status: txn.status,
      transactionId: txn.safe_transaction_id,
    })),
    commitments: projection.commitments.map((row) => ({
      commitmentId: row.commitment_id,
      organizationId: model.organizationId,
      ventureId: row.venture,
      vendor: row.provider,
      provider: row.provider,
      purpose: row.purpose,
      category: "OTHER" as const,
      amount: unknownAmount("USD"),
      currency: "USD",
      frequency: "MONTHLY" as const,
      monthlyEquivalent: unknownAmount("USD"),
      annualEquivalent: unknownAmount("USD"),
      nextExpectedCharge: row.expected_settlement,
      lastUsedAt: null,
      businessValue: null,
      cancellationMechanism: null,
      status: row.status === "ACTIVE" || row.status === "PAUSED" || row.status === "CANCELLED" || row.status === "EXPIRED"
        ? row.status
        : ("PAUSED" as const),
      financialActionRequestId: null,
      createdAt: row.created,
    })),
    monthlyRecurring: actual("$0"),
    annualizedRecurring: actual("$0"),
    ventures: projection.allocations.map((row) => ({
      ventureId: row.venture_id,
      stage: row.lifecycle_state,
      origin: row.allocation_source ?? "UNALLOCATED",
      allocated: actual(displayMoney(row.allocated_amount)),
      spent: actual(displayMoney(row.spent_amount)),
      reserved: actual(displayMoney(row.reserved_amount)),
      committed: actual(displayMoney(row.committed_amount)),
      available: actual(displayMoney(row.remaining)),
      expectedRevenue: actual("$0"),
      actualRevenue: actual("$0"),
      expectedProfit: actual("$0"),
      actualProfit: actual("$0"),
      revenue: actual("$0"),
      profit: actual("$0"),
      roi: actual("NOT_SET"),
      monthlyBurn: actual(displayNotSet(projection.monthly_burn_cap.value)),
      status: row.status,
      updatedAt: row.updated_at ?? projection.last_financial_sync ?? "",
    })),
    mercury: {
      ...model.mercury,
      statusLabel: projection.treasury_status === "LIVE" ? "LIVE · READ ONLY" : "DEGRADED",
      lastSuccessfulSync: projection.mercury_last_verified_at ?? null,
      providerBalance: actual(projection.mercury_available.display),
      founder: projectMercuryFounderPresentationFromTreasury(projection, {
        accountCount: model.mercury.accountCount,
        environment: model.mercury.environment,
      }),
    },
  };
}
