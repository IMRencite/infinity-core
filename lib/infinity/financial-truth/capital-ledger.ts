import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "./founder-capital-policy";
import type {
  CanonicalAllocationEvent,
  CanonicalAllocationRecord,
  CanonicalTreasuryCommitment,
  ManualAccountingEvent,
  PortfolioBudgetPolicy,
  VentureBudgetPolicy,
  VentureCapitalAllocationDecision,
} from "./types";
import type { VentureFinancialCommitment, VentureSpendAuthority } from "./spend-authority";

export const CAPITAL_LEDGER_PATH = ".infinity/financial-truth/capital-ledger.json" as const;

export type TreasuryAuditEvent = {
  id: string;
  at: string;
  action: string;
  actor: string;
  payload: Record<string, unknown>;
};

export type CapitalLedger = {
  revision: string;
  allocations: CanonicalAllocationRecord[];
  allocation_events: CanonicalAllocationEvent[];
  portfolio_budget: PortfolioBudgetPolicy;
  venture_budgets: VentureBudgetPolicy[];
  accounting_events: ManualAccountingEvent[];
  commitments: CanonicalTreasuryCommitment[];
  spend_authorities: VentureSpendAuthority[];
  venture_financial_commitments: VentureFinancialCommitment[];
  audit: TreasuryAuditEvent[];
  idempotency: Record<string, { at: string; action: string }>;
  allocation_decisions: VentureCapitalAllocationDecision[];
};

export function defaultPortfolioBudgetPolicy(): PortfolioBudgetPolicy {
  return {
    classification: "CANONICAL_POLICY",
    portfolio_capital_ceiling: CANONICAL_FOUNDER_CAPITAL_POLICY.portfolio_capital_ceiling,
    monthly_burn_cap: "NOT_SET",
    maximum_single_autonomous_purchase: "NOT_SET",
    daily_spending_ceiling: "NOT_SET",
    reserve_requirement: "NOT_SET",
    paid_acquisition_budget: CANONICAL_FOUNDER_CAPITAL_POLICY.paid_advertising_budget,
    category_limits: {
      AI_API: "NOT_SET",
      HOSTING: "NOT_SET",
      DOMAINS: "NOT_SET",
      CREATIVE_MEDIA: "NOT_SET",
      SOFTWARE_TOOLS: "NOT_SET",
      VENDORS_CONTRACTORS: "NOT_SET",
      MARKETING: "NOT_SET",
    },
    updated_at: null,
  };
}

export function emptyCapitalLedger(): CapitalLedger {
  return {
    revision: "0",
    allocations: [],
    allocation_events: [],
    portfolio_budget: defaultPortfolioBudgetPolicy(),
    venture_budgets: [],
    accounting_events: [],
    commitments: [],
    spend_authorities: [],
    venture_financial_commitments: [],
    audit: [],
    idempotency: {},
    allocation_decisions: [],
  };
}

let memory: CapitalLedger | null = null;
let diskMtimeMs = 0;
let diskSize = -1;

function persistEnabled(): boolean {
  if (process.env.VITEST) return false;
  return true;
}

export function capitalLedgerPersistEnabled(): boolean {
  return persistEnabled();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeCapitalLedger(raw: Partial<CapitalLedger> | null | undefined): CapitalLedger {
  const empty = emptyCapitalLedger();
  if (!raw) return empty;
  return {
    ...empty,
    ...raw,
    allocations: raw.allocations ?? [],
    allocation_events: raw.allocation_events ?? [],
    venture_budgets: raw.venture_budgets ?? [],
    accounting_events: raw.accounting_events ?? [],
    commitments: raw.commitments ?? [],
    spend_authorities: raw.spend_authorities ?? [],
    venture_financial_commitments: raw.venture_financial_commitments ?? [],
    audit: raw.audit ?? [],
    idempotency: raw.idempotency ?? {},
    allocation_decisions: raw.allocation_decisions ?? [],
    portfolio_budget: { ...empty.portfolio_budget, ...raw.portfolio_budget },
  };
}

function rememberDiskStat(): void {
  if (!persistEnabled() || !existsSync(CAPITAL_LEDGER_PATH)) {
    diskMtimeMs = 0;
    diskSize = -1;
    return;
  }
  const stat = statSync(CAPITAL_LEDGER_PATH);
  diskMtimeMs = stat.mtimeMs;
  diskSize = stat.size;
}

export function reloadCapitalLedgerIfDiskChanged(): boolean {
  if (!persistEnabled() || !existsSync(CAPITAL_LEDGER_PATH)) return false;
  const stat = statSync(CAPITAL_LEDGER_PATH);
  if (memory && stat.mtimeMs === diskMtimeMs && stat.size === diskSize) return false;
  memory = null;
  diskMtimeMs = stat.mtimeMs;
  diskSize = stat.size;
  loadCapitalLedger();
  return true;
}

export function loadCapitalLedger(): CapitalLedger {
  if (persistEnabled() && existsSync(CAPITAL_LEDGER_PATH)) {
    const stat = statSync(CAPITAL_LEDGER_PATH);
    if (!memory || stat.mtimeMs !== diskMtimeMs || stat.size !== diskSize) {
      try {
        memory = normalizeCapitalLedger(JSON.parse(readFileSync(CAPITAL_LEDGER_PATH, "utf8")) as Partial<CapitalLedger>);
        rememberDiskStat();
        return clone(memory);
      } catch {
        memory = emptyCapitalLedger();
        return clone(memory);
      }
    }
  }
  if (memory) return clone(normalizeCapitalLedger(memory));
  if (!persistEnabled() || !existsSync(CAPITAL_LEDGER_PATH)) {
    memory = emptyCapitalLedger();
    return clone(memory);
  }
  try {
    memory = normalizeCapitalLedger(JSON.parse(readFileSync(CAPITAL_LEDGER_PATH, "utf8")) as Partial<CapitalLedger>);
    rememberDiskStat();
    return clone(memory);
  } catch {
    memory = emptyCapitalLedger();
    return clone(memory);
  }
}

export function saveCapitalLedger(next: CapitalLedger): CapitalLedger {
  memory = clone({
    ...next,
    revision: String(Number(next.revision || "0") + 1),
  });
  if (persistEnabled()) {
    try {
      mkdirSync(dirname(CAPITAL_LEDGER_PATH), { recursive: true });
      writeFileSync(CAPITAL_LEDGER_PATH, `${JSON.stringify(memory)}\n`);
    } catch {
      /* read-only */
    }
  }
  return clone(memory);
}

export function resetCapitalLedger(): void {
  memory = null;
  diskMtimeMs = 0;
  diskSize = -1;
}

export function allocatedCapitalTotal(ledger: CapitalLedger = loadCapitalLedger()): number {
  return ledger.allocations.reduce((sum, row) => sum + row.allocated_amount + row.reserved_amount, 0);
}

export function reservedCapitalTotal(ledger: CapitalLedger = loadCapitalLedger()): number {
  return ledger.allocations.reduce((sum, row) => sum + row.reserved_amount, 0);
}

export function appendTreasuryAudit(
  ledger: CapitalLedger,
  action: string,
  actor: string,
  payload: Record<string, unknown>,
): CapitalLedger {
  ledger.audit = [
    ...ledger.audit,
    {
      id: `audit:${ledger.audit.length + 1}:${action}`,
      at: new Date().toISOString(),
      action,
      actor,
      payload,
    },
  ].slice(-200);
  return ledger;
}
