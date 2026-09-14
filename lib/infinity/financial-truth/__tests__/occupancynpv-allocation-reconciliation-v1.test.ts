import { afterEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  applyOccupancyNpvFounderIntentCorrection,
  evaluateFinancialQCTestIsolationGate,
  FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD,
  OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY,
  reconstructOccupancyNpvAllocationLineage,
} from "../allocation-reconciliation";
import { emptyCapitalLedger, resetCapitalLedger, saveCapitalLedger, type CapitalLedger } from "../capital-ledger";
import { evaluateTreasuryAllocationIdempotencyGate, evaluateTreasuryBudgetMutationIdempotencyGate } from "../treasury-payload-contracts";
import { mutateVentureBudgetPolicy, mutateVentureCapitalAllocation } from "../treasury-mutations";

function thirtyFiveLedger(): CapitalLedger {
  const ledger = emptyCapitalLedger();
  ledger.allocations = [
    {
      venture_id: CRE_VENTURE_ID,
      display_name: "OccupancyNPV",
      lifecycle_state: "PUBLICLY_LAUNCHED",
      allocated_amount: 35,
      reserved_amount: 0,
      committed_amount: 0,
      spent_amount: 0,
      remaining: 35,
      purpose: "",
      allocation_source: "FOUNDER_DIRECT_ALLOCATION",
      status: "ALLOCATED",
      review_condition: null,
      created_at: "2026-09-13T10:03:29.062Z",
      updated_at: "2026-09-13T10:05:58.670Z",
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
      id: "audit:6:ALLOCATE_VENTURE_CAPITAL",
      at: "2026-09-13T10:03:29.062Z",
      action: "ALLOCATE_VENTURE_CAPITAL",
      actor: "6338447c-5fe9-43f4-bdae-af13a1243a54",
      payload: { venture_id: CRE_VENTURE_ID, amountUsd: 25, source: "FOUNDER_DIRECT_ALLOCATION", money_moved: false },
    },
    {
      id: "audit:7:ALLOCATE_VENTURE_CAPITAL",
      at: "2026-09-13T10:03:35.733Z",
      action: "ALLOCATE_VENTURE_CAPITAL",
      actor: "6338447c-5fe9-43f4-bdae-af13a1243a54",
      payload: { venture_id: CRE_VENTURE_ID, amountUsd: 5, source: "FOUNDER_DIRECT_ALLOCATION", money_moved: false },
    },
    {
      id: "audit:9:ALLOCATE_VENTURE_CAPITAL",
      at: "2026-09-13T10:05:58.670Z",
      action: "ALLOCATE_VENTURE_CAPITAL",
      actor: "6338447c-5fe9-43f4-bdae-af13a1243a54",
      payload: { venture_id: CRE_VENTURE_ID, amountUsd: 5, source: "FOUNDER_DIRECT_ALLOCATION", money_moved: false },
    },
  ];
  ledger.idempotency = {
    "7c4f0634-4170-4e72-84cd-b4d9f1759137": { at: "2026-09-13T10:03:29.062Z", action: "allocate" },
    "92a34111-6b01-407f-9089-91517504d1a5": { at: "2026-09-13T10:03:35.732Z", action: "allocate" },
    "35469613-2a19-4532-9a6e-9cd8a52f8692": { at: "2026-09-13T10:05:58.670Z", action: "allocate" },
  };
  return ledger;
}

afterEach(() => {
  resetCapitalLedger();
});

describe("OccupancyNPV $35 allocation reconciliation v1", () => {
  it("reconstructs $25 + $5 + $5 and does not treat budget as allocation", () => {
    const lineage = reconstructOccupancyNpvAllocationLineage(thirtyFiveLedger());
    expect(lineage.contributing_allocate_events).toHaveLength(3);
    expect(lineage.contributing_allocate_events.map((row) => row.amount)).toEqual([25, 5, 5]);
    expect(lineage.current_active_amount).toBe(35);
    expect(lineage.erroneous_excess).toBe(10);
    expect(lineage.budget_counted_as_allocation).toBe(false);
    expect(lineage.retry_or_duplicate).toBe(true);
    expect(lineage.qc_test_mutation).toBe(false);
    expect(lineage.exact_reason).toContain("25 + 5 + 5");
  });

  it("corrects active allocation to $25 without erasing allocate audits", () => {
    const corrected = applyOccupancyNpvFounderIntentCorrection(thirtyFiveLedger());
    const occupancy = corrected.allocations.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.allocated_amount).toBe(FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD);
    expect(occupancy?.committed_amount).toBe(0);
    expect(occupancy?.spent_amount).toBe(0);
    expect(corrected.audit.filter((row) => row.action === "ALLOCATE_VENTURE_CAPITAL")).toHaveLength(3);
    expect(corrected.audit.some((row) => row.action === "CORRECT_VENTURE_CAPITAL_ALLOCATION")).toBe(true);
    expect(corrected.idempotency[OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY]).toBeTruthy();
    expect(corrected.venture_budgets[0]?.venture_budget_ceiling).toBe(5);
    const again = applyOccupancyNpvFounderIntentCorrection(corrected);
    expect(again.audit.filter((row) => row.action === "CORRECT_VENTURE_CAPITAL_ALLOCATION")).toHaveLength(1);
  });

  it("rejects retry increments and keeps same-key allocate idempotent", () => {
    const first = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 25,
      purpose: "founder intent",
      idempotencyKey: "intent-25",
    });
    expect(first.ok).toBe(true);
    const retrySameKey = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 25,
      purpose: "founder intent",
      idempotencyKey: "intent-25",
    });
    expect(retrySameKey.ok).toBe(true);
    const allocated = retrySameKey.ok ? retrySameKey.ledger.allocations[0]?.allocated_amount : 0;
    expect(allocated).toBe(25);
    expect(
      evaluateTreasuryAllocationIdempotencyGate({
        first: { ok: true, allocated: 25 },
        retry: { ok: true, allocated: allocated ?? 0 },
      }).result,
    ).toBe("PASS");
    const debugFive = mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 5,
      purpose: "debug",
      idempotencyKey: "debug-5",
    });
    expect(debugFive.ok).toBe(false);
    if (!debugFive.ok) expect(debugFive.reason).toBe("VENTURE_ALREADY_ALLOCATED");
  });

  it("budget retries stay idempotent and do not change allocation", () => {
    mutateVentureCapitalAllocation({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      amountUsd: 25,
      purpose: "founder intent",
      idempotencyKey: "intent-25b",
    });
    const first = mutateVentureBudgetPolicy({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      ceiling: 5,
      idempotencyKey: "budget-5",
    });
    const retry = mutateVentureBudgetPolicy({
      actor: "founder",
      authorizedActor: true,
      ventureId: CRE_VENTURE_ID,
      ceiling: 5,
      idempotencyKey: "budget-5",
    });
    expect(first.ok && retry.ok).toBe(true);
    const ceiling = retry.ok ? retry.ledger.venture_budgets[0]?.venture_budget_ceiling : "NOT_SET";
    expect(ceiling).toBe(5);
    expect(
      evaluateTreasuryBudgetMutationIdempotencyGate({
        first: { ok: true, ceiling: 5 },
        retry: { ok: true, ceiling: ceiling ?? "NOT_SET" },
      }).result,
    ).toBe("PASS");
    expect(retry.ok ? retry.ledger.allocations[0]?.allocated_amount : 0).toBe(25);
  });

  it("FinancialQCTestIsolationGate fails if tests persist canonical founder capital", () => {
    expect(
      evaluateFinancialQCTestIsolationGate({
        vitest: true,
        persistCanonicalLedger: false,
        writesCanonicalFounderCapital: false,
        usesIsolatedFixture: true,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateFinancialQCTestIsolationGate({
        vitest: true,
        persistCanonicalLedger: true,
        writesCanonicalFounderCapital: true,
        usesIsolatedFixture: false,
      }).result,
    ).toBe("FAIL");
    expect(Boolean(process.env.VITEST)).toBe(true);
    saveCapitalLedger(thirtyFiveLedger());
    expect(process.env.INFINITY_FINANCIAL_TRUTH_PERSIST).not.toBe("1");
  });
});
