import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyMercurySnapshot, emptyStripeSnapshot } from "../cash-position";
import { projectModeledEconomics } from "../economics";
import { emptyCapitalLedger, resetCapitalLedger, saveCapitalLedger } from "../capital-ledger";
import { projectHqFinancialTruth } from "../project";
import { overlayCanonicalTreasuryOnHqReadModel } from "../treasury-overlay";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  founderMercuryDegradedMessage,
  formatFounderVerifiedAt,
  primaryMercuryWarningContainsDiagnostics,
  projectMercuryFounderPresentation,
  sanitizeMercuryFounderValue,
} from "../mercury-founder-presentation";
import type { FinancialTruthSnapshot } from "../types";

function snapshot(connection: "LIVE" | "FAIL" | "CREDENTIALS_REQUIRED", error?: string): FinancialTruthSnapshot {
  return {
    mercury: {
      ...emptyMercurySnapshot(connection),
      connection,
      operating_account_verified: connection === "LIVE",
      current: connection === "LIVE" ? 50 : null,
      available: connection === "LIVE" ? 50 : null,
      last_verified: connection === "LIVE" ? "2026-09-14T04:33:00.000Z" : null,
      freshness: connection === "LIVE" ? "FRESH" : "UNKNOWN",
      provider_error: connection === "LIVE" ? null : error ?? "AUTH_FAILED",
    },
    stripe: {
      ...emptyStripeSnapshot("LIVE"),
      connection: "LIVE",
      available: 0,
      pending: 0,
      last_verified: "2026-09-14T04:33:00.000Z",
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
    captured_at: "2026-09-14T06:20:00.000Z",
  };
}

function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

function seedOccupancyCapital(): void {
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
        },
      },
    },
  ];
  saveCapitalLedger(ledger);
}

afterEach(() => {
  resetCapitalLedger();
});

describe("Founder-readable Mercury degraded state v1", () => {
  it("1: Mercury DEGRADED renders founder-readable warning", () => {
    const view = projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED"));
    const founder = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), view.treasury_control).mercury.founder;
    expect(view.treasury_control.treasury_status).toBe("DEGRADED");
    expect(founder.mercury_state).toBe("DEGRADED");
    expect(founder.headline).toBe("MERCURY VERIFICATION DEGRADED");
    expect(founder.message).toBe("Mercury authentication needs to be refreshed.");
    expect(founder.message).not.toMatch(/AUTH_FAILED|PRODUCTION ·|last sync/);
  });

  it("2: raw diagnostic concatenation is absent from primary UI", () => {
    const strip = source("components/dashboard/operator-console/treasury-capital-strip.tsx");
    expect(strip).not.toContain("last sync ${");
    expect(strip).not.toContain("accounts ${");
    expect(strip).toContain("data-hq-mercury-warning");
    expect(strip).toContain("View source / details");
    expect(primaryMercuryWarningContainsDiagnostics("PRODUCTION · last sync 2026-09-14T06:17:57.832Z · accounts 0 · NOT_SET")).toBe(true);
    expect(primaryMercuryWarningContainsDiagnostics("Live Mercury verification is temporarily unavailable.")).toBe(false);
  });

  it("3-4: UNKNOWN cash remains UNKNOWN and historical $50 is never current", () => {
    const view = projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED"));
    expect(view.treasury_control.verified_treasury_cash.display).toBe("UNKNOWN");
    expect(view.treasury_control.verified_treasury_cash.display).not.toBe("$50");
    expect(view.treasury_control.verified_treasury_cash.display).not.toBe("$0");
    const founder = projectMercuryFounderPresentation({
      treasuryStatus: "DEGRADED",
      verifiedCashDisplay: "UNKNOWN",
      verifiedCashValue: null,
      lastVerifiedAvailable: 50,
      lastVerifiedAt: "2026-09-14T04:33:00.000Z",
      providerError: "AUTH_FAILED",
    });
    expect(founder.last_verified_balance_display).toBe("$50");
    expect(founder.last_verified_balance_historical).toBe(true);
    expect(view.treasury_control.verified_treasury_cash.display).not.toBe(founder.last_verified_balance_display);
  });

  it("5: last verified amount can be labeled historical if shown", () => {
    const strip = source("components/dashboard/operator-console/treasury-capital-strip.tsx");
    expect(strip).toContain("Last verified balance — not current");
  });

  it("6: AUTH_FAILED gets human-readable message", () => {
    expect(founderMercuryDegradedMessage("AUTH_FAILED")).toBe("Mercury authentication needs to be refreshed.");
    expect(founderMercuryDegradedMessage("CREDENTIALS_REQUIRED")).toBe("Mercury authentication needs to be refreshed.");
  });

  it("7: TIMEOUT gets human-readable message", () => {
    expect(founderMercuryDegradedMessage("PROVIDER_TIMEOUT")).toBe("Mercury did not respond in time.");
  });

  it("8: generic provider failure gets safe fallback message", () => {
    expect(founderMercuryDegradedMessage("PROVIDER_RESPONSE_FAILURE")).toBe(
      "Live Mercury verification is temporarily unavailable.",
    );
    expect(founderMercuryDegradedMessage(null)).toBe("Live Mercury verification is temporarily unavailable.");
  });

  it("9: raw secrets are never rendered", () => {
    expect(sanitizeMercuryFounderValue("sk_live_forbidden_token_value")).toBe("REDACTED");
    expect(sanitizeMercuryFounderValue("Bearer abcdef123")).toBe("REDACTED");
    const founder = projectMercuryFounderPresentation({
      treasuryStatus: "DEGRADED",
      verifiedCashDisplay: "UNKNOWN",
      verifiedCashValue: null,
      providerError: "Bearer secret-token",
      failureStage: "authorization: sk_live_abc",
    });
    expect(founder.message).not.toMatch(/sk_live_|Bearer /);
    expect(founder.details.every((row) => !/sk_live_|Bearer /.test(row.value))).toBe(true);
  });

  it("10-11: live recovery clears warning and restores cash", () => {
    const degraded = projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED"));
    const live = projectHqFinancialTruth(snapshot("LIVE"));
    const degradedFounder = overlayCanonicalTreasuryOnHqReadModel(
      emptyTreasuryHqReadModel("org"),
      degraded.treasury_control,
    ).mercury.founder;
    const liveFounder = overlayCanonicalTreasuryOnHqReadModel(
      emptyTreasuryHqReadModel("org"),
      live.treasury_control,
    ).mercury.founder;
    expect(degradedFounder.message).toBeTruthy();
    expect(liveFounder.message).toBeNull();
    expect(liveFounder.headline).toBeNull();
    expect(live.treasury_control.verified_treasury_cash.display).toBe("$50");
    expect(live.treasury_control.treasury_status).toBe("LIVE");
  });

  it("12-14: allocation, spend authority, committed, and spend stay distinct", () => {
    seedOccupancyCapital();
    const view = projectHqFinancialTruth(snapshot("FAIL", "AUTH_FAILED"));
    expect(view.treasury_control.authorized_capital.value).toBe(50);
    expect(view.treasury_control.allocated_capital.value).toBe(25);
    const occupancy = view.treasury_control.spend_authorities.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.effective_spend_authority).toBe(5);
    expect(view.treasury_control.committed_capital.value).toBe(0);
    expect(view.treasury_control.actual_spend.value).toBe(0);
    expect(view.treasury_control.paid_acquisition_budget.value).toBe(0);
  });

  it("15: desktop/tablet/mobile contain the warning cleanly", () => {
    const css = source("app/globals.css");
    expect(css).toContain(".hq-treasury-mercury-warning");
    expect(css).toContain("overflow-wrap: anywhere");
    const strip = source("components/dashboard/operator-console/treasury-capital-strip.tsx");
    expect(strip).toContain("hq-treasury-mercury-warning");
    expect(strip).not.toContain("min-w-[640px]");
    expect(formatFounderVerifiedAt("2026-09-14T04:33:00.000Z")).toMatch(/Sep 14, 2026/);
    expect(formatFounderVerifiedAt("2026-09-14T04:33:00.000Z")).not.toContain("2026-09-14T04:33:00.000Z");
  });
});
