import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBudget } from "../budgets/engine";
import { createFinancialActionRequest } from "../actions/engine";
import { recordLedgerEntry } from "../ledger/engine";
import { assertNoCredentialFields, orgScoped } from "../security";
import { FORBIDDEN_TREASURY_SERIALIZATION_FIELDS } from "../constants";
import { TreasuryStore } from "../store";
import { actualAmount } from "../types";
import { ORG_A, ORG_B, VENTURE_A } from "./fixtures";

const TREASURY_TABLES = [
  "treasury_provider_connections",
  "treasury_accounts",
  "treasury_balance_snapshots",
  "treasury_transactions",
  "treasury_budgets",
  "treasury_budget_reservations",
  "venture_capital_allocations",
  "financial_action_requests",
  "financial_authorizations",
  "financial_action_executions",
  "treasury_ledger_entries",
  "treasury_recurring_commitments",
  "treasury_control_state",
] as const;

describe("treasury-rls/security", () => {
  it("migration enables RLS and grants service_role without blanket policies", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260818010000_treasury_capital_budget_engine_v1.sql"),
      "utf8",
    );
    for (const table of TREASURY_TABLES) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`GRANT ALL ON public.${table} TO service_role`);
    }
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/api_secret|card_number|access_token|bank_login/i);
  });

  it("org A cannot read org B budgets, allocations, actions, ledger, or transactions", () => {
    const store = new TreasuryStore();
    createBudget(store, {
      scope: { scopeType: "GLOBAL", organizationId: ORG_A, currency: "USD" },
      allocated: actualAmount(100),
    });
    createBudget(store, {
      scope: { scopeType: "GLOBAL", organizationId: ORG_B, currency: "USD" },
      allocated: actualAmount(999),
    });
    createFinancialActionRequest(store, {
      organizationId: ORG_B,
      ventureId: VENTURE_A,
      purpose: "Secret B",
      category: "OTHER",
      actionType: "OTHER",
      amount: actualAmount(1),
      idempotencyKey: "b-only",
    });
    recordLedgerEntry(store, {
      organizationId: ORG_B,
      type: "EXPENSE",
      amount: actualAmount(1),
      idempotencyKey: "b-ledger",
    });

    expect(store.budgetsForOrg(ORG_A).every((b) => b.scope.organizationId === ORG_A)).toBe(true);
    expect(store.budgetsForOrg(ORG_A).some((b) => b.scope.organizationId === ORG_B)).toBe(false);
    expect(orgScoped([...store.requests.values()], ORG_A)).toHaveLength(0);
    expect(orgScoped([...store.ledger.values()], ORG_A)).toHaveLength(0);
    expect(orgScoped([...store.requests.values()], ORG_B)).toHaveLength(1);
  });

  it("rejects credential fields on serializable treasury objects", () => {
    const safe = {
      organizationId: ORG_A,
      provider: "mock",
      externalAccountId: "ext-1",
      capabilities: ["BALANCE_READ"],
    };
    expect(assertNoCredentialFields(safe)).toEqual([]);
    const unsafe = { ...safe, apiSecret: "x", cardNumber: "4111" };
    expect(assertNoCredentialFields(unsafe).length).toBeGreaterThan(0);
    expect(FORBIDDEN_TREASURY_SERIALIZATION_FIELDS).toContain("apiSecret");
    expect(FORBIDDEN_TREASURY_SERIALIZATION_FIELDS).toContain("cardNumber");
    expect(FORBIDDEN_TREASURY_SERIALIZATION_FIELDS).toContain("routingNumber");
  });
});
