import type { CostCategory, NamedGate, VentureCostEvent } from "./types";
import { SHARED_COST_ALLOCATION_CONTRACT, VENTURE_COST_EVENT_CONTRACT } from "./types";
import { mutateFinancialGovernance, inspectFinancialGovernance } from "./store";

export function ingestCanonicalCostEvent(input: {
  venture_id?: string | null;
  category: CostCategory;
  amount?: number | null;
  provider?: string | null;
  source: string;
  occurred_at?: string;
  committed_or_spent?: VentureCostEvent["committed_or_spent"];
  actual_or_estimated?: VentureCostEvent["actual_or_estimated"];
  allocation?: VentureCostEvent["allocation"];
  campaign_id?: string | null;
  event_id?: string;
  provenance?: string;
}): { ingested: boolean; event: VentureCostEvent | null; reason: string } {
  const key = input.event_id ?? `cost:${input.source}:${input.occurred_at ?? ""}:${input.category}:${input.venture_id ?? "shared"}`;
  const existing = inspectFinancialGovernance().costs.find((row) => row.idempotency_key === key);
  if (existing) return { ingested: false, event: existing, reason: "DUPLICATE_IGNORED" };
  const unknown = input.amount == null || input.actual_or_estimated === "UNKNOWN";
  const event: VentureCostEvent = {
    contract: VENTURE_COST_EVENT_CONTRACT,
    event_id: key,
    idempotency_key: key,
    venture_id: input.venture_id ?? null,
    category: input.category,
    amount: unknown ? null : input.amount ?? null,
    currency: "USD",
    provider: input.provider ?? null,
    source: input.source,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    committed_or_spent: input.committed_or_spent ?? "SPENT",
    actual_or_estimated: unknown ? "UNKNOWN" : input.actual_or_estimated ?? "ACTUAL",
    allocation: input.allocation ?? (input.venture_id ? "DIRECT" : "UNALLOCATED_SHARED"),
    campaign_id: input.campaign_id ?? null,
    provenance: input.provenance ?? "canonical-cost-ingest",
    synthetic: false,
  };
  mutateFinancialGovernance((state) => {
    state.costs.push(event);
    state.last_cost_sync = event.occurred_at;
    state.last_ledger_calc = event.occurred_at;
  });
  return { ingested: true, event, reason: "INGESTED" };
}

export function cancelCommitment(eventId: string): { released: boolean } {
  let released = false;
  mutateFinancialGovernance((state) => {
    const row = state.costs.find((cost) => cost.event_id === eventId && (cost.committed_or_spent === "COMMITTED" || cost.committed_or_spent === "RESERVED"));
    if (!row) return;
    row.committed_or_spent = "CANCELLED";
    released = true;
  });
  return { released };
}

export function evaluateVentureCostEventContract(event: VentureCostEvent | null): NamedGate {
  return {
    gate: VENTURE_COST_EVENT_CONTRACT,
    result: event?.contract === VENTURE_COST_EVENT_CONTRACT && event.synthetic === false ? "PASS" : "FAIL",
    reasons: event ? [] : ["MISSING"],
  };
}

export function evaluateSharedCostAllocationContract(event: VentureCostEvent): NamedGate {
  const valid = event.allocation === "DIRECT" || event.allocation === "USAGE_BASED" || event.allocation === "PROPORTIONAL" || event.allocation === "UNALLOCATED_SHARED";
  const reasons: string[] = [];
  if (!event.venture_id && event.allocation !== "UNALLOCATED_SHARED" && event.allocation !== "PROPORTIONAL" && event.allocation !== "USAGE_BASED") {
    reasons.push("SHARED_MUST_NOT_BE_ARBITRARY_DIRECT");
  }
  return {
    gate: SHARED_COST_ALLOCATION_CONTRACT,
    result: valid && reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
