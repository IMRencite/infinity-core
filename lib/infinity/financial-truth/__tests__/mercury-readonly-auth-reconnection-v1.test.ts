import { afterEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { emptyCapitalLedger, resetCapitalLedger, saveCapitalLedger } from "../capital-ledger";
import { projectModeledEconomics } from "../economics";
import { projectHqFinancialTruth } from "../project";
import { overlayCanonicalTreasuryOnHqReadModel } from "../treasury-overlay";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { MercuryFinancialAccountAdapter } from "../adapters/mercury";
import { MercuryTreasuryMutationAdapter } from "../adapters/mercury-mutation";
import { founderMercuryDegradedMessage } from "../mercury-founder-presentation";
import type { FinancialTruthSnapshot } from "../types";

function snapshot(connection: "LIVE" | "FAIL", error?: string, cash?: number): FinancialTruthSnapshot {
  return {
    mercury: {
      ...emptyMercurySnapshot(connection),
      connection,
      operating_account_verified: connection === "LIVE",
      current: connection === "LIVE" ? (cash ?? 50) : null,
      available: connection === "LIVE" ? (cash ?? 50) : null,
      last_verified: connection === "LIVE" ? "2026-09-14T07:00:00.000Z" : null,
      freshness: connection === "LIVE" ? "FRESH" : "UNKNOWN",
      provider_error: connection === "LIVE" ? null : error ?? "AUTH_FAILED",
      failure_stage: connection === "LIVE" ? null : "auth/session/config",
      mutation_capability: false,
      money_movement_capability: false,
      read_only: true,
    },
    stripe: {
      ...emptyStripeSnapshot("LIVE"),
      connection: "LIVE",
      available: 0,
      pending: 0,
      last_verified: "2026-09-14T07:00:00.000Z",
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
    captured_at: "2026-09-14T07:05:00.000Z",
  };
}

function seedOccupancy(): void {
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
      payload: { policy: { venture_id: CRE_VENTURE_ID, venture_budget_ceiling: 5 } },
    },
  ];
  saveCapitalLedger(ledger);
}

afterEach(() => {
  resetCapitalLedger();
});

describe("Mercury read-only auth reconnection v1", () => {
  it("1-2: auth failure degrades Mercury and keeps cash UNKNOWN", () => {
    const view = projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED"));
    expect(view.treasury_control.treasury_status).toBe("DEGRADED");
    expect(view.mercury.connection).toBe("FAIL");
    expect(view.treasury_control.verified_treasury_cash.display).toBe("UNKNOWN");
    expect(view.treasury_control.verified_treasury_cash.value).toBeNull();
  });

  it("3-5: successful read-only auth restores LIVE cash and clears warning", () => {
    const degraded = overlayCanonicalTreasuryOnHqReadModel(
      emptyTreasuryHqReadModel("org"),
      projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED")).treasury_control,
    );
    const live = overlayCanonicalTreasuryOnHqReadModel(
      emptyTreasuryHqReadModel("org"),
      projectHqFinancialTruth(snapshot("LIVE", undefined, 50)).treasury_control,
    );
    expect(degraded.mercury.founder.message).toBe("Mercury authentication needs to be refreshed.");
    expect(live.mercury.founder.message).toBeNull();
    expect(live.mercury.founder.mercury_state).toBe("LIVE");
    expect(live.cards.totalCash.display).toBe("$50");
  });

  it("6: raw AUTH_FAILED is not the founder-facing warning", () => {
    expect(founderMercuryDegradedMessage("AUTH_FAILED")).not.toBe("AUTH_FAILED");
    const founder = overlayCanonicalTreasuryOnHqReadModel(
      emptyTreasuryHqReadModel("org"),
      projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED")).treasury_control,
    ).mercury.founder;
    expect(founder.message).toBe("Mercury authentication needs to be refreshed.");
    expect(founder.message).not.toContain("AUTH_FAILED");
  });

  it("7-10: allocation and spend authority stay intact through auth failure", () => {
    seedOccupancy();
    const view = projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED"));
    expect(view.treasury_control.authorized_capital.value).toBe(50);
    expect(view.treasury_control.allocated_capital.value).toBe(25);
    const occupancy = view.treasury_control.spend_authorities.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.effective_spend_authority).toBe(5);
    expect(view.treasury_control.committed_capital.value).toBe(0);
    expect(view.treasury_control.actual_spend.value).toBe(0);
    expect(view.treasury_control.paid_acquisition_budget.value).toBe(0);
  });

  it("11-12: Mercury mutation capability stays disabled and write is not introduced", async () => {
    const adapter = new MercuryTreasuryMutationAdapter();
    expect(adapter.write_access).toBe(false);
    expect(adapter.money_movement).toBe(false);
    expect(adapter.status).toBe("NOT_ACTIVE");
    await expect(adapter.mutate()).rejects.toThrow("MERCURY_MUTATION_NOT_ACTIVE");
    const mercury = new MercuryFinancialAccountAdapter({
      env: {
        MERCURY_ENABLED: "true",
        MERCURY_ENV: "production",
        MERCURY_API_TOKEN: "readonly-test-token-not-a-secret",
      },
      fetchImpl: async () => new Response("unauthorized", { status: 401 }),
    });
    const traced = await mercury.snapshotWithTrace();
    expect(traced.failing_stage).toBe("auth/session/config");
    expect(traced.snapshot.provider_error).toBe("AUTH_FAILED");
    expect(traced.snapshot.read_only).toBe(true);
    expect(traced.snapshot.mutation_capability).toBe(false);
    expect(traced.snapshot.money_movement_capability).toBe(false);
  });
});
