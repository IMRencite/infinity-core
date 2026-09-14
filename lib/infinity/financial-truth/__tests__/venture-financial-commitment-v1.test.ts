import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import {
  CAPITAL_LEDGER_PATH,
  capitalLedgerPersistEnabled,
  emptyCapitalLedger,
  resetCapitalLedger,
  saveCapitalLedger,
  type CapitalLedger,
} from "../capital-ledger";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { projectModeledEconomics } from "../economics";
import {
  evaluateAllocationCommitmentCompatibilityGate,
  evaluateAutonomousCommitmentEnablementGate,
  evaluateCommitmentSettlementReconciliationGate,
  evaluateFinancialCommitmentQCTestIsolationGate,
  evaluateHQTreasuryFinancialConsistencyGate,
  evaluateNoMoneyMovementGate,
  evaluateRecurringCommitmentExposureGate,
  evaluateTreasuryLiveUpdateGate,
  evaluateVentureCommitmentGate,
  evaluateVentureCommitmentIdempotencyGate,
} from "../financial-commitment-gates";
import { projectHqFinancialTruth } from "../project";
import {
  AUTONOMOUS_COMMITMENT_CREATION_ENABLED,
  calculateSpendAuthorityMath,
  COMMITMENT_STATUSES,
  persistedCommitments,
  projectVentureSpendAuthority,
} from "../spend-authority";
import {
  evaluateCommitmentWithinSpendAuthorityGate,
  evaluatePaidAcquisitionAuthorityGate,
  evaluateSpendAuthorityReductionSafetyGate,
  evaluateTreasurySpendAuthorityConsistencyGate,
} from "../spend-authority-gates";
import {
  cancelVentureFinancialCommitment,
  createVentureFinancialCommitment,
  expireDueVentureFinancialCommitments,
  mutateVentureSpendAuthority,
  settleVentureFinancialCommitment,
} from "../spend-authority-mutations";
import { evaluateTreasuryCommitmentPayloadSecurityGate } from "../treasury-payload-contracts";
import { mutateVentureCapitalAllocation } from "../treasury-mutations";
import type { FinancialTruthSnapshot } from "../types";

function occupancyLedger(overrides: Partial<CapitalLedger> = {}): CapitalLedger {
  const ledger = emptyCapitalLedger();
  ledger.allocations = [
    {
      venture_id: CRE_VENTURE_ID,
      display_name: "OccupancyNPV",
      lifecycle_state: "PUBLICLY_LAUNCHED",
      allocated_amount: 25,
      reserved_amount: 0,
      committed_amount: 0,
      spent_amount: 0,
      remaining: 25,
      purpose: "founder intent",
      allocation_source: "FOUNDER_DIRECT_ALLOCATION",
      status: "ALLOCATED",
      review_condition: null,
      created_at: "2026-09-13T10:03:29.062Z",
      updated_at: "2026-09-13T21:22:02.940Z",
    },
  ];
  ledger.venture_budgets = [
    {
      venture_id: CRE_VENTURE_ID,
      venture_budget_ceiling: 5,
      monthly_spend_limit: "NOT_SET",
      maximum_single_purchase: "NOT_SET",
      category_limits: {},
      updated_at: "2026-09-13T10:05:55.108Z",
    },
  ];
  ledger.audit = [
    {
      id: "audit:8:UPDATE_VENTURE_BUDGET",
      at: "2026-09-13T10:05:55.108Z",
      action: "UPDATE_VENTURE_BUDGET",
      actor: "founder",
      payload: {
        policy: {
          venture_id: CRE_VENTURE_ID,
          venture_budget_ceiling: 5,
          monthly_spend_limit: "NOT_SET",
          maximum_single_purchase: "NOT_SET",
          category_limits: {},
          updated_at: "2026-09-13T10:05:55.108Z",
        },
      },
    },
  ];
  return { ...ledger, ...overrides, allocations: overrides.allocations ?? ledger.allocations };
}

function snapshot(): FinancialTruthSnapshot {
  return {
    mercury: {
      ...emptyMercurySnapshot("LIVE"),
      connection: "LIVE",
      operating_account_verified: true,
      current: 50,
      available: 50,
      last_verified: "2026-09-14T05:00:00.000Z",
      freshness: "FRESH",
    },
    stripe: {
      ...emptyStripeSnapshot("LIVE"),
      connection: "LIVE",
      available: 0,
      pending: 0,
      last_verified: "2026-09-14T05:00:00.000Z",
      freshness: "FRESH",
    },
    actual: {
      layer: "ACTUAL",
      gross_revenue: 0,
      refunds: 0,
      processor_fees: 0,
      net_revenue: 0,
      known_costs: null,
      unknown_cost_categories: ["INFRASTRUCTURE"],
      contribution: null,
      current_month_gross_revenue: 0,
    },
    modeled: projectModeledEconomics({ modeled_revenue: null }),
    committed_capital: 0,
    spent_capital: 0,
    current_month_known_burn: 0,
    unknown_cost_state: "UNKNOWN",
    lineages: [],
    anomalies: [],
    registry: [],
    captured_at: "2026-09-14T05:10:00.000Z",
  };
}

function createHosting(amount: number, key: string) {
  return createVentureFinancialCommitment({
    actor: "fixture",
    authorizedActor: true,
    ventureId: CRE_VENTURE_ID,
    amountUsd: amount,
    category: "HOSTING",
    purpose: "isolated fixture only",
    vendorOrProvider: "fixture-host",
    idempotencyKey: key,
  });
}

describe("Venture Financial Commitment V1", () => {
  afterEach(() => {
    resetCapitalLedger();
  });

  it("1-3: commitment is bounded by remaining authority and $5 authority is not $5 committed", () => {
    saveCapitalLedger(occupancyLedger());
    const before = projectVentureSpendAuthority(occupancyLedger(), CRE_VENTURE_ID);
    expect(before.effective_spend_authority).toBe(5);
    expect(before.committed_amount).toBe(0);
    expect(before.remaining_spend_authority).toBe(5);
    expect(
      evaluateCommitmentWithinSpendAuthorityGate({
        remainingAuthority: before.remaining_spend_authority,
        requestedAmount: 2,
        category: "HOSTING",
      }).result,
    ).toBe("PASS");
    expect(
      evaluateCommitmentWithinSpendAuthorityGate({
        remainingAuthority: before.remaining_spend_authority,
        requestedAmount: 6,
        category: "HOSTING",
      }).result,
    ).toBe("FAIL");
    const over = createHosting(6, "over-6");
    expect(over.ok).toBe(false);
    const created = createHosting(2, "ok-2");
    expect(created.ok).toBe(true);
    const after = projectVentureSpendAuthority(created.ok ? created.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(after.committed_amount).toBe(2);
    expect(after.effective_spend_authority).toBe(5);
    expect(after.remaining_spend_authority).toBe(3);
    expect(after.actual_spend_amount).toBe(0);
  });

  it("4-6: commitment changes committed amount only", () => {
    saveCapitalLedger(occupancyLedger());
    const created = createHosting(2, "commit-only");
    expect(created.ok).toBe(true);
    const after = projectVentureSpendAuthority(created.ok ? created.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(after.committed_amount).toBe(2);
    expect(after.actual_spend_amount).toBe(0);
    expect(after.allocation_amount).toBe(25);
    expect(after.unused_allocation).toBe(20);
    const row = persistedCommitments(created.ok ? created.ledger : occupancyLedger())[0];
    expect(evaluateVentureCommitmentGate(row).result).toBe("PASS");
    expect(row.money_moved).toBe(false);
    expect(row.execution_enabled).toBe(false);
    expect(row.status).toBe("COMMITTED");
  });

  it("7: cancellation releases authority and does not change actual spend", () => {
    saveCapitalLedger(occupancyLedger());
    const created = createHosting(3, "cancel-3");
    expect(created.ok).toBe(true);
    const cancelled = cancelVentureFinancialCommitment({
      actor: "fixture",
      authorizedActor: true,
      commitmentId: "commitment:cancel-3",
      idempotencyKey: "cancel-3-once",
    });
    expect(cancelled.ok).toBe(true);
    const after = projectVentureSpendAuthority(cancelled.ok ? cancelled.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(after.committed_amount).toBe(0);
    expect(after.remaining_spend_authority).toBe(5);
    expect(after.actual_spend_amount).toBe(0);
    expect(after.allocation_amount).toBe(25);
  });

  it("8-9: full and partial settlement convert without double-count", () => {
    saveCapitalLedger(occupancyLedger());
    expect(createHosting(3, "settle-3").ok).toBe(true);
    const settled = settleVentureFinancialCommitment({
      actor: "fixture",
      authorizedActor: true,
      commitmentId: "commitment:settle-3",
      amountUsd: 3,
      idempotencyKey: "settle-3-full",
    });
    expect(settled.ok).toBe(true);
    const full = projectVentureSpendAuthority(settled.ok ? settled.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(full.committed_amount).toBe(0);
    expect(full.actual_spend_amount).toBe(3);
    expect(full.remaining_spend_authority).toBe(2);
    expect(
      evaluateCommitmentSettlementReconciliationGate({
        beforeCommitted: 3,
        afterCommitted: full.committed_amount,
        beforeActual: 0,
        afterActual: full.actual_spend_amount,
        settledDelta: 3,
      }).result,
    ).toBe("PASS");

    saveCapitalLedger(occupancyLedger());
    expect(createHosting(5, "partial-5").ok).toBe(true);
    const partial = settleVentureFinancialCommitment({
      actor: "fixture",
      authorizedActor: true,
      commitmentId: "commitment:partial-5",
      amountUsd: 2,
      idempotencyKey: "partial-5-2",
    });
    expect(partial.ok).toBe(true);
    const afterPartial = projectVentureSpendAuthority(partial.ok ? partial.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(afterPartial.committed_amount).toBe(3);
    expect(afterPartial.actual_spend_amount).toBe(2);
    expect(afterPartial.remaining_spend_authority).toBe(0);
    expect(persistedCommitments(partial.ok ? partial.ledger : occupancyLedger())[0]?.status).toBe("PARTIALLY_SETTLED");
    expect(
      evaluateCommitmentSettlementReconciliationGate({
        beforeCommitted: 5,
        afterCommitted: afterPartial.committed_amount,
        beforeActual: 0,
        afterActual: afterPartial.actual_spend_amount,
        settledDelta: 2,
      }).result,
    ).toBe("PASS");
  });

  it("10: expired commitment releases remaining obligation", () => {
    saveCapitalLedger(occupancyLedger());
    expect(
      createVentureFinancialCommitment({
        actor: "fixture",
        authorizedActor: true,
        ventureId: CRE_VENTURE_ID,
        amountUsd: 4,
        category: "SOFTWARE",
        expiresAt: "2020-01-01T00:00:00.000Z",
        idempotencyKey: "expire-4",
      }).ok,
    ).toBe(true);
    const expired = expireDueVentureFinancialCommitments({ now: "2026-09-14T00:00:00.000Z" });
    expect(expired.ok).toBe(true);
    const after = projectVentureSpendAuthority(expired.ok ? expired.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(after.committed_amount).toBe(0);
    expect(after.remaining_spend_authority).toBe(5);
    expect(after.actual_spend_amount).toBe(0);
    expect(persistedCommitments(expired.ok ? expired.ledger : occupancyLedger())[0]?.status).toBe("EXPIRED");
  });

  it("11: duplicate submission is idempotent", () => {
    saveCapitalLedger(occupancyLedger());
    const first = createHosting(2, "dup-2");
    const retry = createHosting(2, "dup-2");
    expect(first.ok && retry.ok).toBe(true);
    const count = persistedCommitments(retry.ok ? retry.ledger : occupancyLedger()).length;
    expect(count).toBe(1);
    expect(
      evaluateVentureCommitmentIdempotencyGate({
        firstId: "commitment:dup-2",
        retryId: persistedCommitments(retry.ok ? retry.ledger : occupancyLedger())[0]?.commitment_id ?? null,
        firstCount: 1,
        retryCount: count,
      }).result,
    ).toBe("PASS");
  });

  it("12: paid acquisition commitment fails at $0 ad authority", () => {
    saveCapitalLedger(occupancyLedger());
    const ads = createVentureFinancialCommitment({
      actor: "fixture",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 1,
      category: "PAID_ACQUISITION",
      idempotencyKey: "ads-1",
    });
    expect(ads.ok).toBe(false);
    expect(
      evaluatePaidAcquisitionAuthorityGate({
        generalAuthority: 5,
        paidAcquisitionAuthority: 0,
        requestedCategory: "PAID_ACQUISITION",
      }).result,
    ).toBe("FAIL");
  });

  it("13: recurring obligation requires bounded max exposure", () => {
    expect(
      evaluateRecurringCommitmentExposureGate({
        obligationType: "RECURRING",
        amount: 5,
        remainingAuthority: 5,
      }).result,
    ).toBe("FAIL");
    saveCapitalLedger(occupancyLedger());
    const unbounded = createVentureFinancialCommitment({
      actor: "fixture",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 1,
      category: "SOFTWARE",
      obligationType: "RECURRING",
      idempotencyKey: "recur-unbounded",
    });
    expect(unbounded.ok).toBe(false);
    const bounded = createVentureFinancialCommitment({
      actor: "fixture",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 1,
      category: "SOFTWARE",
      obligationType: "RECURRING",
      periodAmount: 1,
      billingCadence: "MONTHLY",
      maxAuthorizedExposure: 3,
      reviewAt: "2026-10-01T00:00:00.000Z",
      idempotencyKey: "recur-bounded",
    });
    expect(bounded.ok).toBe(true);
    const row = persistedCommitments(bounded.ok ? bounded.ledger : occupancyLedger())[0];
    expect(row.amount).toBe(3);
    expect(row.max_authorized_exposure).toBe(3);
    expect(row.obligation_type).toBe("RECURRING");
  });

  it("14-15: spend authority and allocation cannot reduce below commitments", () => {
    saveCapitalLedger(occupancyLedger());
    expect(createHosting(4, "floor-4").ok).toBe(true);
    expect(
      evaluateSpendAuthorityReductionSafetyGate({
        nextCeiling: 3,
        committedAmount: 4,
        unreconciledActualSpend: 0,
      }).result,
    ).toBe("FAIL");
    const reducedAuthority = mutateVentureSpendAuthority({
      actor: "fixture",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 3,
      idempotencyKey: "reduce-auth-3",
    });
    expect(reducedAuthority.ok).toBe(false);
    expect(
      evaluateAllocationCommitmentCompatibilityGate({
        nextAllocation: 3,
        spendCeiling: 5,
        openCommitments: 4,
      }).result,
    ).toBe("FAIL");
    const reducedAllocation = mutateVentureCapitalAllocation({
      actor: "fixture",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 0,
      targetAllocatedAmount: 3,
      idempotencyKey: "reduce-alloc-3",
    });
    expect(reducedAllocation.ok).toBe(false);
  });

  it("16-17: HQ/Treasury projections agree and live update changes version", () => {
    saveCapitalLedger(occupancyLedger());
    const before = projectHqFinancialTruth(snapshot());
    const occupancy = before.treasury_control.spend_authorities.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.committed_amount).toBe(0);
    expect(before.treasury_control.venture_financial_commitments).toEqual([]);
    expect(
      evaluateHQTreasuryFinancialConsistencyGate({
        hqAllocation: occupancy?.allocation_amount ?? -1,
        treasuryAllocation: occupancy?.allocation_amount ?? -1,
        hqAuthority: occupancy?.effective_spend_authority ?? -1,
        treasuryAuthority: occupancy?.effective_spend_authority ?? -1,
        hqCommitted: occupancy?.committed_amount ?? -1,
        treasuryCommitted: occupancy?.committed_amount ?? -1,
        hqActual: occupancy?.actual_spend_amount ?? -1,
        treasuryActual: occupancy?.actual_spend_amount ?? -1,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateTreasurySpendAuthorityConsistencyGate({
        hqAllocation: before.capital.allocated_capital,
        treasuryAllocation: Number(before.treasury_control.allocated_capital.value),
        hqAuthority: occupancy?.effective_spend_authority ?? -1,
        treasuryAuthority: occupancy?.effective_spend_authority ?? -1,
        mercuryWriteAccess: before.treasury_control.mercury_write_access,
        moneyMovementEnabled: before.treasury_control.money_movement_enabled,
      }).result,
    ).toBe("PASS");
    createHosting(2, "live-2");
    const after = projectHqFinancialTruth(snapshot());
    expect(after.treasury_control.spend_authorities[0]?.committed_amount).toBe(2);
    expect(after.treasury_control.venture_financial_commitments).toHaveLength(1);
    expect(after.treasury_control.allocated_capital.value).toBe(25);
    expect(after.version).not.toBe(before.version);
    expect(
      evaluateTreasuryLiveUpdateGate({
        beforeVersion: before.version,
        afterVersion: after.version,
        eventPublished: true,
      }).result,
    ).toBe("PASS");
  });

  it("18-19: no money movement endpoint is enabled and Mercury stays read-only", () => {
    const adapter = new MercuryTreasuryMutationAdapter();
    expect(adapter.write_access).toBe(false);
    expect(adapter.money_movement).toBe(false);
    const route = readFileSync(join(process.cwd(), "app/api/operator-console/treasury/route.ts"), "utf8");
    expect(route).toContain("create_commitment");
    expect(route).toContain("cancel_commitment");
    expect(route).not.toContain("settle_commitment");
    expect(route).not.toMatch(/mercury_write_access:\s*true/);
    expect(route).not.toContain("createRecipient");
    expect(route).not.toContain("createTransfer");
    expect(route).not.toContain("createCard");
    expect(
      evaluateNoMoneyMovementGate({
        mercuryWriteAccess: false,
        moneyMovementEnabled: false,
        achEnabled: false,
        wireEnabled: false,
        cardsEnabled: false,
        recipientCreationEnabled: false,
        externalPurchaseEnabled: false,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateTreasuryCommitmentPayloadSecurityGate({
        action: "create_commitment",
        ventureId: CRE_VENTURE_ID,
        amountUsd: 2,
        apiKey: "sk_live_forbidden",
        idempotencyKey: "x",
      }).result,
    ).toBe("FAIL");
  });

  it("20: fixture commitment tests cannot mutate canonical founder capital", () => {
    expect(process.env.VITEST).toBeTruthy();
    expect(capitalLedgerPersistEnabled()).toBe(false);
    saveCapitalLedger(occupancyLedger());
    createHosting(2, "iso-2");
    expect(
      evaluateFinancialCommitmentQCTestIsolationGate({
        vitest: Boolean(process.env.VITEST),
        persistEnabled: capitalLedgerPersistEnabled(),
        wroteCanonicalLedger: capitalLedgerPersistEnabled() && existsSync(CAPITAL_LEDGER_PATH),
      }).result,
    ).toBe("PASS");
  });

  it("autonomous real creation stays disabled and statuses stay explicit", () => {
    expect(AUTONOMOUS_COMMITMENT_CREATION_ENABLED).toBe(false);
    expect(evaluateAutonomousCommitmentEnablementGate({ autonomous: true }).result).toBe("FAIL");
    expect(COMMITMENT_STATUSES).toEqual([
      "PROPOSED",
      "AUTHORIZED",
      "COMMITTED",
      "PARTIALLY_SETTLED",
      "SETTLED",
      "CANCELLED",
      "EXPIRED",
      "BLOCKED",
      "FAILED",
    ]);
    expect(calculateSpendAuthorityMath({ allocationAmount: 25, spendCeiling: 5 }).committed_amount).toBe(0);
  });

  it("UI and mission surfaces keep commitment separate from spend", () => {
    const center = readFileSync(join(process.cwd(), "components/dashboard/operator-console/treasury-control-center.tsx"), "utf8");
    expect(center).toContain("data-hq-commitment-panel");
    expect(center).toContain("Available Spend Authority");
    expect(center).toContain("No payment is sent");
    expect(center).toContain("create_commitment");
    expect(center).not.toContain("settle_commitment");
    const seed = readFileSync(join(process.cwd(), "lib/infinity/canonical-work/seed.ts"), "utf8");
    expect(seed).toContain("Venture Financial Commitment V1");
    expect(seed).toContain("work:occupancynpv:venture-financial-commitment-v1");
  });
});
