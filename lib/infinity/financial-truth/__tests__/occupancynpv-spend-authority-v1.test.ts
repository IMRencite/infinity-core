import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD } from "../allocation-reconciliation";
import { emptyCapitalLedger, resetCapitalLedger, saveCapitalLedger, type CapitalLedger } from "../capital-ledger";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { projectModeledEconomics } from "../economics";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import { projectHqFinancialTruth } from "../project";
import {
  auditVentureBudgetCeiling,
  calculateSpendAuthorityMath,
  projectVentureSpendAuthority,
} from "../spend-authority";
import {
  evaluateAllocationBudgetCommitmentSeparationGate,
  evaluateAllocationReductionAgainstAuthorityGate,
  evaluateCommitmentWithinSpendAuthorityGate,
  evaluateEconomicActionGate,
  evaluatePaidAcquisitionAuthorityGate,
  evaluateSpendAuthorityIdempotencyGate,
  evaluateSpendAuthorityReductionSafetyGate,
  evaluateSpendAuthorityWithinAllocationGate,
  evaluateTreasurySpendAuthorityConsistencyGate,
  evaluateVentureSpendAuthorityGate,
} from "../spend-authority-gates";
import { createVentureFinancialCommitment, mutateVentureSpendAuthority } from "../spend-authority-mutations";
import { evaluateTreasurySpendAuthorityPayloadSecurityGate } from "../treasury-payload-contracts";
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
    {
      id: "audit:10:CORRECT_VENTURE_CAPITAL_ALLOCATION",
      at: "2026-09-13T21:22:02.941Z",
      action: "CORRECT_VENTURE_CAPITAL_ALLOCATION",
      actor: "infinity:allocation-reconciliation-v1",
      payload: { previous_active_amount: 35, target_active_amount: 25 },
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

afterEach(() => {
  resetCapitalLedger();
});

describe("OccupancyNPV governed venture spend authority v1", () => {
  it("1: allocation $25 does not imply spend authority $25", () => {
    const math = calculateSpendAuthorityMath({ allocationAmount: 25, spendCeiling: "NOT_SET" });
    expect(math.effective_spend_authority).toBe(0);
    expect(math.unused_allocation).toBe(25);
    expect(math.authorized_spend_ceiling).toBe("NOT_SET");
  });

  it("2: current founder $5 budget resolves to $5 authority", () => {
    const ledger = occupancyLedger();
    const audit = auditVentureBudgetCeiling(ledger, CRE_VENTURE_ID);
    expect(audit.observed_ceiling).toBe(5);
    expect(audit.state).toBe("FOUNDER_CONFIGURED");
    expect(audit.should_control_spend_authority).toBe(true);
    const authority = projectVentureSpendAuthority(ledger, CRE_VENTURE_ID);
    expect(authority.allocation_amount).toBe(25);
    expect(authority.authorized_spend_ceiling).toBe(5);
    expect(authority.effective_spend_authority).toBe(5);
    expect(authority.remaining_spend_authority).toBe(5);
    expect(authority.unused_allocation).toBe(20);
    expect(evaluateVentureSpendAuthorityGate(authority).result).toBe("PASS");
  });

  it("3: stale/unknown budget resolves to NOT_SET / effective $0", () => {
    const ledger = occupancyLedger({
      venture_budgets: [
        {
          venture_id: CRE_VENTURE_ID,
          venture_budget_ceiling: 40,
          monthly_spend_limit: "NOT_SET",
          maximum_single_purchase: "NOT_SET",
          category_limits: {},
          updated_at: "2026-09-13T09:00:00.000Z",
        },
      ],
      audit: [],
    });
    const audit = auditVentureBudgetCeiling(ledger, CRE_VENTURE_ID);
    expect(audit.should_control_spend_authority).toBe(false);
    expect(["STALE", "UNKNOWN", "TEST"]).toContain(audit.state);
    const authority = projectVentureSpendAuthority(ledger, CRE_VENTURE_ID);
    expect(authority.status).toBe("NOT_SET");
    expect(authority.effective_spend_authority).toBe(0);
  });

  it("4: spend authority cannot exceed allocation", () => {
    expect(
      evaluateSpendAuthorityWithinAllocationGate({ allocationAmount: 25, requestedCeiling: 30 }).result,
    ).toBe("FAIL");
    saveCapitalLedger(occupancyLedger());
    const denied = mutateVentureSpendAuthority({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 30,
      idempotencyKey: "too-high",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("AUTHORITY_EXCEEDS_ALLOCATION");
  });

  it("5-6: paid acquisition stays $0 and general authority cannot fund ads", () => {
    const authority = projectVentureSpendAuthority(occupancyLedger(), CRE_VENTURE_ID);
    expect(authority.paid_acquisition_authority).toBe(0);
    expect(
      evaluatePaidAcquisitionAuthorityGate({
        generalAuthority: authority.effective_spend_authority,
        paidAcquisitionAuthority: 0,
      }).result,
    ).toBe("PASS");
    expect(
      evaluatePaidAcquisitionAuthorityGate({
        generalAuthority: 5,
        paidAcquisitionAuthority: 0,
        requestedCategory: "PAID_ACQUISITION",
      }).result,
    ).toBe("FAIL");
  });

  it("7-9: commitment cannot exceed remaining authority and changes committed only", () => {
    saveCapitalLedger(occupancyLedger());
    const before = projectVentureSpendAuthority(occupancyLedger(), CRE_VENTURE_ID);
    expect(
      evaluateCommitmentWithinSpendAuthorityGate({
        remainingAuthority: before.remaining_spend_authority,
        requestedAmount: 6,
        category: "HOSTING",
      }).result,
    ).toBe("FAIL");
    const created = createVentureFinancialCommitment({
      actor: "test",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 4,
      category: "HOSTING",
      purpose: "isolated fixture only",
      idempotencyKey: "commit-4",
    });
    expect(created.ok).toBe(true);
    const after = projectVentureSpendAuthority(created.ok ? created.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(after.committed_amount).toBe(4);
    expect(after.actual_spend_amount).toBe(0);
    expect(after.remaining_spend_authority).toBe(1);
    expect(after.allocation_amount).toBe(25);
  });

  it("10: actual spend does not change allocation", () => {
    const math = calculateSpendAuthorityMath({
      allocationAmount: 25,
      spendCeiling: 5,
      actualSpendAmount: 2,
    });
    expect(math.allocation_amount).toBe(25);
    expect(math.actual_spend_amount).toBe(2);
    expect(math.remaining_spend_authority).toBe(3);
  });

  it("11-12: reduction below commitment is blocked; $0 is allowed without commitments", () => {
    expect(
      evaluateSpendAuthorityReductionSafetyGate({
        nextCeiling: 3,
        committedAmount: 4,
        unreconciledActualSpend: 0,
      }).result,
    ).toBe("FAIL");
    saveCapitalLedger(occupancyLedger());
    const zero = mutateVentureSpendAuthority({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 0,
      purpose: "disable new commitments",
      idempotencyKey: "zero-authority",
    });
    expect(zero.ok).toBe(true);
    const authority = projectVentureSpendAuthority(zero.ok ? zero.ledger : occupancyLedger(), CRE_VENTURE_ID);
    expect(authority.effective_spend_authority).toBe(0);
    expect(authority.allocation_amount).toBe(25);
  });

  it("13: retries are idempotent", () => {
    saveCapitalLedger(occupancyLedger());
    const first = mutateVentureSpendAuthority({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 5,
      idempotencyKey: "auth-5",
    });
    const retry = mutateVentureSpendAuthority({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 5,
      idempotencyKey: "auth-5",
    });
    expect(first.ok && retry.ok).toBe(true);
    const ceiling = retry.ok
      ? retry.ledger.spend_authorities[0]?.authorized_spend_ceiling
      : "NOT_SET";
    expect(
      evaluateSpendAuthorityIdempotencyGate({
        first: { ok: true, ceiling: 5 },
        retry: { ok: true, ceiling: ceiling ?? "NOT_SET" },
      }).result,
    ).toBe("PASS");
  });

  it("14: HQ and Treasury projections agree", () => {
    saveCapitalLedger(occupancyLedger());
    const view = projectHqFinancialTruth(snapshot());
    const occupancy = view.treasury_control.spend_authorities.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.allocation_amount).toBe(FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD);
    expect(occupancy?.effective_spend_authority).toBe(5);
    expect(view.treasury_control.allocated_capital.value).toBe(25);
    expect(view.capital.allocated_capital).toBe(25);
    expect(
      evaluateTreasurySpendAuthorityConsistencyGate({
        hqAllocation: view.capital.allocated_capital,
        treasuryAllocation: Number(view.treasury_control.allocated_capital.value),
        hqAuthority: occupancy?.effective_spend_authority ?? -1,
        treasuryAuthority: occupancy?.effective_spend_authority ?? -1,
        mercuryWriteAccess: view.treasury_control.mercury_write_access,
        moneyMovementEnabled: view.treasury_control.money_movement_enabled,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateAllocationBudgetCommitmentSeparationGate({
        allocation: 25,
        spendAuthority: 5,
        committed: 0,
        actualSpend: 0,
        paidAcquisition: 0,
      }).result,
    ).toBe("PASS");
  });

  it("15-16: live update path and $25 allocation are preserved", () => {
    saveCapitalLedger(occupancyLedger());
    const before = projectHqFinancialTruth(snapshot());
    mutateVentureSpendAuthority({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 4,
      idempotencyKey: "live-4",
    });
    const after = projectHqFinancialTruth(snapshot());
    expect(before.version).not.toBe(after.version);
    expect(after.treasury_control.allocated_capital.value).toBe(25);
    expect(after.treasury_control.spend_authorities[0]?.effective_spend_authority).toBe(4);
  });

  it("17-19: Mercury stays read-only and credentials are refused", () => {
    const adapter = new MercuryTreasuryMutationAdapter();
    expect(adapter.write_access).toBe(false);
    expect(adapter.money_movement).toBe(false);
    expect(adapter.status).toBe("NOT_ACTIVE");
    const route = readFileSync(join(process.cwd(), "app/api/operator-console/treasury/route.ts"), "utf8");
    expect(route).toContain("update_spend_authority");
    expect(route).not.toMatch(/mercury_write_access:\s*true/);
    expect(route).not.toContain("createRecipient");
    expect(route).not.toContain("createTransfer");
    expect(
      evaluateTreasurySpendAuthorityPayloadSecurityGate({
        action: "update_spend_authority",
        ventureId: CRE_VENTURE_ID,
        amountUsd: 5,
        apiKey: "sk_live_forbidden",
        idempotencyKey: "x",
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateEconomicActionGate({
        execute: true,
        spendAuthorityValid: true,
        commitmentValid: true,
        mercuryWriteAccess: false,
      }).result,
    ).toBe("FAIL");
  });

  it("20: checkpoint HQ cash/allocation behavior does not regress", () => {
    saveCapitalLedger(occupancyLedger());
    const view = projectHqFinancialTruth(snapshot());
    expect(view.treasury_control.verified_treasury_cash.value).toBe(50);
    expect(view.treasury_control.authorized_capital.value).toBe(50);
    expect(view.treasury_control.allocated_capital.value).toBe(25);
    expect(view.treasury_control.unallocated_authorized_capital.value).toBe(25);
    expect(view.treasury_control.committed_capital.value).toBe(0);
    expect(view.treasury_control.actual_spend.value).toBe(0);
    expect(view.treasury_control.paid_acquisition_budget.value).toBe(0);
    expect(view.treasury_control.bank_connection).toBe("READ_ONLY");
    expect(view.treasury_control.mercury_write_access).toBe(false);
    expect(view.mutation_adapter_status).toBe("NOT_ACTIVE");
    expect(
      evaluateAllocationReductionAgainstAuthorityGate({
        nextAllocation: 3,
        spendCeiling: 5,
        openCommitments: 0,
      }).result,
    ).toBe("FAIL");
    const allocated = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 5,
      idempotencyKey: "no-extra-alloc",
    });
    expect(allocated.ok).toBe(false);
  });

  it("UI keeps allocated, authorized spend, committed, and spent distinct", () => {
    const center = readFileSync(join(process.cwd(), "components/dashboard/operator-console/treasury-control-center.tsx"), "utf8");
    expect(center).toContain("Spend authority");
    expect(center).toContain("Remaining spend authority");
    expect(center).toContain("Unused allocation");
    expect(center).toContain("Paid acquisition");
    expect(center).toContain("update_spend_authority");
    expect(center).not.toContain("create_commitment");
  });
});
