import type { CanonicalAllocationEvent } from "./types";
import { FINANCIAL_QC_TEST_ISOLATION_GATE } from "./types";
import { appendTreasuryAudit, type CapitalLedger, type TreasuryAuditEvent } from "./capital-ledger";

export const OCCUPANCYNPV_VENTURE_ID = "candidate:7e7e924e-0741-4155-a729-8d529da77ea9" as const;
export const FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD = 25 as const;
export const OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY = "occupancynpv-correct-35-to-25-v1" as const;
export const OCCUPANCYNPV_ALLOCATION_CORRECTION_ACTOR = "infinity:allocation-reconciliation-v1" as const;

export type OccupancyNpvAllocationLineage = {
  venture_id: string;
  current_active_amount: number;
  contributing_allocate_events: Array<{
    allocation_id: string;
    venture_id: string;
    amount: number;
    source: string;
    status: "ACTIVE" | "SUPERSEDED" | "REVERSED";
    created_at: string;
    created_by: string;
    idempotency_key: string | null;
    purpose: string | null;
    committed_amount: number;
    spent_amount: number;
    audit_id: string;
  }>;
  exact_reason: string;
  budget_counted_as_allocation: boolean;
  retry_or_duplicate: boolean;
  qc_test_mutation: boolean;
  founder_intended_amount: number;
  erroneous_excess: number;
};

function allocateAudits(ledger: CapitalLedger): TreasuryAuditEvent[] {
  return ledger.audit.filter(
    (row) =>
      row.action === "ALLOCATE_VENTURE_CAPITAL" &&
      row.payload?.venture_id === OCCUPANCYNPV_VENTURE_ID,
  );
}

export function reconstructOccupancyNpvAllocationLineage(ledger: CapitalLedger): OccupancyNpvAllocationLineage {
  const events = allocateAudits(ledger);
  const contributing = events.map((row, index) => ({
    allocation_id: `alloc:${row.id}`,
    venture_id: OCCUPANCYNPV_VENTURE_ID,
    amount: Number(row.payload.amountUsd ?? 0),
    source: String(row.payload.source ?? "FOUNDER_DIRECT_ALLOCATION"),
    status: "ACTIVE" as const,
    created_at: row.at,
    created_by: row.actor,
    idempotency_key:
      Object.entries(ledger.idempotency).find(([, value]) => value.at === row.at || value.at.startsWith(row.at.slice(0, 19)))?.[0] ??
      null,
    purpose: typeof row.payload.purpose === "string" ? row.payload.purpose : null,
    committed_amount: 0,
    spent_amount: 0,
    audit_id: row.id,
    sequence: index + 1,
  }));
  const sum = contributing.reduce((total, row) => total + row.amount, 0);
  const active =
    ledger.allocations.find((row) => row.venture_id === OCCUPANCYNPV_VENTURE_ID)?.allocated_amount ?? sum;
  const keys = contributing.map((row) => row.idempotency_key).filter(Boolean);
  const uniqueKeys = new Set(keys);
  const amounts = contributing.map((row) => row.amount).join(" + ");
  return {
    venture_id: OCCUPANCYNPV_VENTURE_ID,
    current_active_amount: active,
    contributing_allocate_events: contributing,
    exact_reason:
      contributing.length === 0
        ? "NO_OCCUPANCYNPV_ALLOCATE_EVENTS"
        : `${contributing.length} ALLOCATE_VENTURE_CAPITAL events (${amounts}) summed into one rolled-up OccupancyNPV row. Each click used a distinct idempotency UUID, so retries were treated as new increments.`,
    budget_counted_as_allocation: false,
    retry_or_duplicate: uniqueKeys.size === keys.length && contributing.length > 1,
    qc_test_mutation: contributing.every((row) => row.created_by === "founder" || row.created_by.startsWith("infinity:")),
    founder_intended_amount: FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD,
    erroneous_excess: Math.max(0, active - FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD),
  };
}

export function allocationSemanticKey(ventureId: string, amountUsd: number, source: string): string {
  return `semantic:allocate:${ventureId}:${amountUsd}:${source}`;
}

export function evaluateFinancialQCTestIsolationGate(input: {
  vitest: boolean;
  persistCanonicalLedger: boolean;
  writesCanonicalFounderCapital: boolean;
  usesIsolatedFixture: boolean;
}): { gate: "FinancialQCTestIsolationGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.writesCanonicalFounderCapital && !input.usesIsolatedFixture) {
    reasons.push("CANONICAL_FOUNDER_CAPITAL_WRITTEN_WITHOUT_FIXTURE");
  }
  if (input.vitest && input.persistCanonicalLedger) {
    reasons.push("VITEST_CAN_PERSIST_CANONICAL_LEDGER");
  }
  return {
    gate: FINANCIAL_QC_TEST_ISOLATION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["FINANCIAL_QC_ISOLATED"],
  };
}

export function applyOccupancyNpvFounderIntentCorrection(ledger: CapitalLedger): CapitalLedger {
  if (ledger.idempotency[OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY]) return ledger;
  const lineage = reconstructOccupancyNpvAllocationLineage(ledger);
  const existing = ledger.allocations.find((row) => row.venture_id === OCCUPANCYNPV_VENTURE_ID);
  if (!existing) return ledger;
  const now = new Date().toISOString();
  const reversed = lineage.contributing_allocate_events.filter((row) => row.amount !== FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD);
  const preserved = lineage.contributing_allocate_events.find((row) => row.amount === FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD);
  const events: CanonicalAllocationEvent[] = [
    ...lineage.contributing_allocate_events.map((row) => ({
      allocation_id: row.allocation_id,
      venture_id: row.venture_id,
      amount: row.amount,
      source: row.source,
      status: row.amount === FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD ? ("ACTIVE" as const) : ("REVERSED" as const),
      kind: "ALLOCATE" as const,
      created_at: row.created_at,
      created_by: row.created_by,
      idempotency_key: row.idempotency_key,
      purpose: row.purpose,
      committed_amount: 0,
      spent_amount: 0,
      supersedes: null,
      correction_of: null,
    })),
    {
      allocation_id: `alloc:${OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY}`,
      venture_id: OCCUPANCYNPV_VENTURE_ID,
      amount: -lineage.erroneous_excess,
      source: "FOUNDER_DIRECT_ALLOCATION",
      status: "ACTIVE",
      kind: "CORRECT",
      created_at: now,
      created_by: OCCUPANCYNPV_ALLOCATION_CORRECTION_ACTOR,
      idempotency_key: OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY,
      purpose: "Reverse troubleshooting increments. Restore founder-intended $25 OccupancyNPV allocation.",
      committed_amount: 0,
      spent_amount: 0,
      supersedes: existing.allocation_id ?? preserved?.allocation_id ?? null,
      correction_of: reversed.map((row) => row.allocation_id),
    },
  ];
  ledger.allocation_events = [
    ...ledger.allocation_events.filter((row) => row.venture_id !== OCCUPANCYNPV_VENTURE_ID),
    ...events,
  ];
  const nextAmount = FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD;
  ledger.allocations = ledger.allocations.map((row) =>
    row.venture_id === OCCUPANCYNPV_VENTURE_ID
      ? {
          ...row,
          allocated_amount: nextAmount,
          remaining: nextAmount + row.reserved_amount - row.committed_amount - row.spent_amount,
          updated_at: now,
          allocation_id: `alloc:active:${OCCUPANCYNPV_VENTURE_ID}`,
          correction_lineage: reversed.map((item) => item.audit_id),
          supersedes: preserved?.allocation_id ?? null,
          created_by: preserved?.created_by ?? row.created_by ?? null,
          idempotency_key: preserved?.idempotency_key ?? row.idempotency_key ?? null,
        }
      : row,
  );
  ledger.idempotency[OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY] = {
    at: now,
    action: "correct_venture_allocation",
  };
  appendTreasuryAudit(ledger, "CORRECT_VENTURE_CAPITAL_ALLOCATION", OCCUPANCYNPV_ALLOCATION_CORRECTION_ACTOR, {
    venture_id: OCCUPANCYNPV_VENTURE_ID,
    previous_active_amount: lineage.current_active_amount,
    target_active_amount: nextAmount,
    reversed_amount: lineage.erroneous_excess,
    reversed_audit_ids: reversed.map((row) => row.audit_id),
    preserved_audit_id: preserved?.audit_id ?? null,
    reason: "TROUBLESHOOTING_CLICKS_NOT_FOUNDER_CAPITAL_INTENT",
    money_moved: false,
    mercury_write_access: false,
  });
  return ledger;
}
