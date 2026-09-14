import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { evaluateOccupancynpvFulfillmentReadiness, occupancynpvCommercializationBlockers } from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { occupancynpvPaymentActivationEnabled } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { appendTreasuryAudit, loadCapitalLedger, saveCapitalLedger } from "./capital-ledger";
import { canonicalTreasuryVentures } from "./canonical-treasury-ventures";
import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "./founder-capital-policy";
import {
  VENTURE_CAPITAL_ALLOCATION_DECISION,
  type AllocationDecisionOutcome,
  type VentureCapitalAllocationDecision,
  type VentureCapitalAllocationDecisionRow,
} from "./types";

export const FIRST_GOVERNED_VENTURE_ALLOCATION_DECISION_ID = "decision:first-governed-venture-allocation-v1" as const;

export type VentureCapitalRefresh = {
  venture_id: string;
  display_name: string;
  lifecycle_state: string;
  production_state: string | null;
  payment_ready: boolean;
  fulfillment_ready: boolean;
  publicly_launched: boolean;
  actual_revenue: number;
  actual_spend: number;
  known_costs: number | null;
  unknown_costs: boolean;
  paid_acquisition_budget: number;
  blockers: string[];
  capital_dependent_next_action: string | null;
  requested_amount: number | null;
  minimum_viable_amount: number | null;
  maximum_useful_amount: number | null;
  use_case: string | null;
  spend_category: string | null;
  expected_outcome: string | null;
  expected_evidence: string | null;
  time_horizon: string | null;
  reversibility: string | null;
  risk: string | null;
  reserve_only: boolean;
  allocatable: boolean;
};

const PORTFOLIO_RESERVE_REASON =
  "Founder authorized $50 at portfolio level only. No venture currently has a qualified capital-dependent use case, so the full $50 remains unallocated reserve.";

function occupancyNpvRefresh(overrides?: Partial<VentureCapitalRefresh>): VentureCapitalRefresh {
  const catalog = canonicalTreasuryVentures().find((row) => row.venture_id === CRE_VENTURE_ID);
  const launched = occupancynpvPubliclyLaunched();
  const paymentReady = occupancynpvPaymentActivationEnabled();
  const fulfillmentReady = evaluateOccupancynpvFulfillmentReadiness().result === "PASS";
  const blockers = occupancynpvCommercializationBlockers();
  const defaults: VentureCapitalRefresh = {
    venture_id: CRE_VENTURE_ID,
    display_name: catalog?.display_name ?? "OccupancyNPV",
    lifecycle_state: catalog?.lifecycle_state ?? (launched ? "PUBLICLY_LAUNCHED" : "SELECTED"),
    production_state: catalog?.production_state ?? (launched ? "LIVE" : null),
    payment_ready: paymentReady,
    fulfillment_ready: fulfillmentReady,
    publicly_launched: launched,
    actual_revenue: 0,
    actual_spend: 0,
    known_costs: null,
    unknown_costs: true,
    paid_acquisition_budget: CANONICAL_FOUNDER_CAPITAL_POLICY.paid_advertising_budget,
    blockers,
    capital_dependent_next_action: null,
    requested_amount: null,
    minimum_viable_amount: null,
    maximum_useful_amount: null,
    use_case: null,
    spend_category: null,
    expected_outcome: null,
    expected_evidence: null,
    time_horizon: null,
    reversibility: null,
    risk: null,
    reserve_only: false,
    allocatable: catalog?.allocatable ?? true,
  };
  return {
    ...defaults,
    ...overrides,
    venture_id: CRE_VENTURE_ID,
  };
}

function askReviewRefresh(overrides?: Partial<VentureCapitalRefresh>): VentureCapitalRefresh {
  const catalog = canonicalTreasuryVentures().find((row) => row.venture_id === ASKREVIEW_VENTURE_ID);
  const defaults: VentureCapitalRefresh = {
    venture_id: ASKREVIEW_VENTURE_ID,
    display_name: catalog?.display_name ?? "AskReview",
    lifecycle_state: catalog?.lifecycle_state ?? "SELECTION_UNDER_REVIEW",
    production_state: catalog?.production_state ?? "PRODUCTION PAUSED",
    payment_ready: false,
    fulfillment_ready: false,
    publicly_launched: false,
    actual_revenue: 0,
    actual_spend: 0,
    known_costs: null,
    unknown_costs: true,
    paid_acquisition_budget: 0,
    blockers: ["SELECTION_UNDER_REVIEW", "PRODUCTION_PAUSED"],
    capital_dependent_next_action: null,
    requested_amount: null,
    minimum_viable_amount: null,
    maximum_useful_amount: null,
    use_case: null,
    spend_category: null,
    expected_outcome: null,
    expected_evidence: null,
    time_horizon: null,
    reversibility: null,
    risk: null,
    reserve_only: true,
    allocatable: catalog?.allocatable ?? true,
  };
  return {
    ...defaults,
    ...overrides,
    venture_id: ASKREVIEW_VENTURE_ID,
    reserve_only: true,
  };
}

export function refreshCanonicalVenturesForAllocation(overrides?: {
  occupancyNpv?: Partial<VentureCapitalRefresh>;
  askReview?: Partial<VentureCapitalRefresh>;
}): VentureCapitalRefresh[] {
  return [occupancyNpvRefresh(overrides?.occupancyNpv), askReviewRefresh(overrides?.askReview)];
}

function decideVenture(refresh: VentureCapitalRefresh, remainingAuthorized: number): VentureCapitalAllocationDecisionRow {
  const ads =
    refresh.spend_category === "MARKETING" ||
    /paid.?acquisition|ads?/i.test(refresh.use_case ?? "") ||
    /paid.?acquisition|ads?/i.test(refresh.capital_dependent_next_action ?? "");

  if (refresh.venture_id === ASKREVIEW_VENTURE_ID || refresh.reserve_only) {
    const paused =
      refresh.lifecycle_state === "SELECTION_UNDER_REVIEW" ||
      /PAUSED/i.test(refresh.production_state ?? "");
    if (paused && !refresh.use_case) {
      return {
        venture_id: refresh.venture_id,
        display_name: refresh.display_name,
        lifecycle_state: refresh.lifecycle_state,
        production_state: refresh.production_state,
        eligible: false,
        decision: "NOT_ELIGIBLE",
        amount: 0,
        purpose: null,
        reason:
          "AskReview remains SELECTION_UNDER_REVIEW / PRODUCTION PAUSED. No justified reserved-allocation use case exists. Lifecycle, domain, payments, and launch stay unchanged.",
        expected_evidence: null,
        review_condition: null,
        capital_dependent_next_action: null,
        use_case: null,
        spend_category: null,
      };
    }
  }

  if (!refresh.allocatable) {
    return row(refresh, "NOT_ELIGIBLE", 0, "Venture is not allocatable.", null);
  }

  if (ads || refresh.paid_acquisition_budget > 0 && refresh.spend_category === "MARKETING") {
    return row(
      refresh,
      "REJECT",
      0,
      "Paid acquisition budget is $0. Ads are not a permitted use of this authorization.",
      null,
    );
  }

  const minViable = refresh.minimum_viable_amount;
  const requested = refresh.requested_amount;
  const action = refresh.capital_dependent_next_action?.trim() || null;

  if (!action || requested == null || requested <= 0) {
    return row(
      refresh,
      "DEFER",
      0,
      refresh.publicly_launched
        ? "OccupancyNPV is publicly launched with payment and fulfillment ready. Best next actions are $0 organic/outbound work. Launch state does not create a spending need."
        : "No capital-dependent next action is evidenced. Capital stays unallocated.",
      action,
    );
  }

  if (minViable != null && minViable > remainingAuthorized) {
    return row(
      refresh,
      "DEFER",
      0,
      `DEFER_INSUFFICIENT_CAPITAL: minimum viable amount $${minViable} exceeds remaining authorized capital $${remainingAuthorized}.`,
      action,
    );
  }

  if (requested > remainingAuthorized) {
    return row(
      refresh,
      "DEFER",
      0,
      `Requested $${requested} exceeds remaining authorized capital $${remainingAuthorized}.`,
      action,
    );
  }

  if (!refresh.use_case || !refresh.expected_evidence || !refresh.spend_category) {
    return row(
      refresh,
      "DEFER",
      0,
      "A spend amount was proposed without a complete capital-use contract. Need was not manufactured.",
      action,
    );
  }

  return {
    venture_id: refresh.venture_id,
    display_name: refresh.display_name,
    lifecycle_state: refresh.lifecycle_state,
    production_state: refresh.production_state,
    eligible: true,
    decision: "ALLOCATE",
    amount: requested,
    purpose: refresh.use_case,
    reason: refresh.expected_outcome ?? refresh.use_case,
    expected_evidence: refresh.expected_evidence,
    review_condition: `Review after ${refresh.time_horizon ?? "the stated evidence window"}`,
    capital_dependent_next_action: action,
    use_case: refresh.use_case,
    spend_category: refresh.spend_category,
  };
}

function row(
  refresh: VentureCapitalRefresh,
  decision: AllocationDecisionOutcome,
  amount: number,
  reason: string,
  action: string | null,
): VentureCapitalAllocationDecisionRow {
  return {
    venture_id: refresh.venture_id,
    display_name: refresh.display_name,
    lifecycle_state: refresh.lifecycle_state,
    production_state: refresh.production_state,
    eligible: decision === "ALLOCATE" || decision === "DEFER",
    decision,
    amount,
    purpose: null,
    reason,
    expected_evidence: null,
    review_condition: null,
    capital_dependent_next_action: action,
    use_case: null,
    spend_category: null,
  };
}

export function evaluateVentureCapitalAllocationDecision(
  refreshes: VentureCapitalRefresh[] = refreshCanonicalVenturesForAllocation(),
  authorizedCapital = CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital,
): VentureCapitalAllocationDecision {
  let remaining = authorizedCapital;
  const ventures: VentureCapitalAllocationDecisionRow[] = [];
  for (const refresh of refreshes) {
    const decided = decideVenture(refresh, remaining);
    if (decided.decision === "ALLOCATE") remaining -= decided.amount;
    ventures.push(decided);
  }
  const allocated = ventures.reduce((sum, item) => sum + item.amount, 0);
  return {
    contract: VENTURE_CAPITAL_ALLOCATION_DECISION,
    decision_id: FIRST_GOVERNED_VENTURE_ALLOCATION_DECISION_ID,
    decided_at: new Date().toISOString(),
    source: "AUTONOMOUS_ALLOCATION_DECISION",
    authorized_capital: authorizedCapital,
    allocated_capital: allocated,
    unallocated_authorized_capital: authorizedCapital - allocated,
    committed_capital: 0,
    actual_spend: 0,
    paid_acquisition_budget: 0,
    money_moved: false,
    mercury_write_access: false,
    reserve_reason: allocated === 0 ? PORTFOLIO_RESERVE_REASON : `Unallocated reserve $${authorizedCapital - allocated} retained after justified allocations.`,
    ventures,
  };
}

export function latestAllocationDecision(): VentureCapitalAllocationDecision | null {
  const decisions = loadCapitalLedger().allocation_decisions;
  return decisions[decisions.length - 1] ?? null;
}

export function ensureFirstGovernedAllocationDecision(): VentureCapitalAllocationDecision {
  const ledger = loadCapitalLedger();
  const existing = ledger.allocation_decisions.find(
    (row) => row.decision_id === FIRST_GOVERNED_VENTURE_ALLOCATION_DECISION_ID,
  );
  if (existing) return existing;
  const decision = evaluateVentureCapitalAllocationDecision();
  const now = decision.decided_at;
  for (const row of decision.ventures) {
    if (row.decision !== "ALLOCATE" || row.amount <= 0) continue;
    ledger.allocations = [
      ...ledger.allocations.filter((item) => item.venture_id !== row.venture_id),
      {
        venture_id: row.venture_id,
        display_name: row.display_name,
        lifecycle_state: row.lifecycle_state,
        allocated_amount: row.amount,
        reserved_amount: 0,
        committed_amount: 0,
        spent_amount: 0,
        remaining: row.amount,
        purpose: row.purpose,
        allocation_source: "AUTONOMOUS_ALLOCATION_DECISION",
        status: "ALLOCATED",
        review_condition: row.review_condition,
        created_at: now,
        updated_at: now,
      },
    ];
  }
  ledger.allocation_decisions = [...ledger.allocation_decisions, decision];
  appendTreasuryAudit(ledger, "FIRST_GOVERNED_ALLOCATION_DECISION", "infinity", {
    decision_id: decision.decision_id,
    allocated_capital: decision.allocated_capital,
    unallocated_authorized_capital: decision.unallocated_authorized_capital,
    money_moved: false,
    mercury_write_access: false,
    paid_acquisition_budget: 0,
  });
  saveCapitalLedger(ledger);
  return decision;
}
