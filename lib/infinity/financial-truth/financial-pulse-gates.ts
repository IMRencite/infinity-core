import {
  ACTUAL_CONTRIBUTION_TRUTH_GATE,
  CARD_TEXT_CONTAINMENT_GATE,
  CROSS_VENTURE_REVENUE_ATTRIBUTION_GATE,
  HQ_ECONOMIC_PULSE_CONSISTENCY_GATE,
  HQ_EXECUTIVE_ECONOMIC_PULSE_GATE,
  HQ_FINANCIAL_PULSE_CONSISTENCY_GATE,
  HQ_FINANCIAL_PULSE_CONTRACT,
  HQ_FINANCIAL_PULSE_GATE,
  HQ_INFORMATION_HIERARCHY_GATE,
  HQ_LIVE_ECONOMIC_REFRESH_GATE,
  HQ_LIVE_FINANCIAL_REFRESH_GATE,
  HQ_OPERATIONAL_ROOMS_PROMINENCE_GATE,
  HQ_TOP_INFORMATION_HIERARCHY_GATE,
  HORIZONTAL_OVERFLOW_GATE,
  PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION,
  PORTFOLIO_REVENUE_TRUTH_GATE,
  RESPONSIVE_FINANCIAL_PULSE_GATE,
  TOP_REVENUE_VENTURE_TRUTH_GATE,
  type CanonicalTreasuryProjection,
  type HqFinancialTruthView,
  type NamedFinancialGate,
  type PortfolioActualEconomicsProjection,
} from "./types";
import { pulseMetric, type HqFinancialPulse } from "./financial-pulse";

function pass(gate: string, reason: string): NamedFinancialGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedFinancialGate {
  return { gate, result: "FAIL", reasons };
}

const PULSE_METRIC_IDS = [
  "treasury_cash",
  "authorized_capital",
  "allocated_capital",
  "actual_spend",
  "month_revenue",
  "lifetime_revenue",
  "actual_contribution",
  "top_revenue_venture",
] as const;

const FORBIDDEN_PULSE_DETAIL = [
  "settlement_destination",
  "settlement_reconciliation",
  "modeled_revenue",
  "modeled_costs",
  "modeled_contribution",
  "last_financial_sync",
] as const;

export function evaluateHQFinancialPulseGate(input: {
  pulse: HqFinancialPulse | null;
  compact: boolean;
  containsForbiddenDetail: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.pulse) reasons.push("PULSE_MISSING");
  if (input.pulse && input.pulse.contract !== HQ_FINANCIAL_PULSE_CONTRACT) reasons.push("PULSE_CONTRACT_INVALID");
  if (input.pulse && input.pulse.source_contract !== "CanonicalTreasuryProjection") {
    reasons.push("PULSE_NOT_CANONICAL_TREASURY");
  }
  if (input.pulse && input.pulse.economics_contract !== PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION) {
    reasons.push("PULSE_NOT_PORTFOLIO_ECONOMICS");
  }
  for (const id of PULSE_METRIC_IDS) {
    if (!pulseMetric(input.pulse, id)) reasons.push(`PULSE_METRIC_MISSING_${id.toUpperCase()}`);
  }
  if (!input.compact) reasons.push("PULSE_NOT_COMPACT");
  if (input.containsForbiddenDetail) reasons.push("PULSE_CONTAINS_FULL_TREASURY_DETAIL");
  return reasons.length ? fail(HQ_FINANCIAL_PULSE_GATE, reasons) : pass(HQ_FINANCIAL_PULSE_GATE, "COMPACT_CANONICAL_PULSE");
}

export function evaluateHQFinancialPulseConsistencyGate(input: {
  pulse: HqFinancialPulse | null;
  treasury: CanonicalTreasuryProjection | null | undefined;
  hq: HqFinancialTruthView | null | undefined;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.pulse || !input.treasury || !input.hq) return fail(HQ_FINANCIAL_PULSE_CONSISTENCY_GATE, ["MISSING_CANONICAL_STATE"]);
  if (input.hq.treasury_control?.contract !== input.treasury.contract) {
    reasons.push("HQ_TREASURY_CONTRACT_DIVERGED");
  }
  const cash = pulseMetric(input.pulse, "treasury_cash");
  const authorized = pulseMetric(input.pulse, "authorized_capital");
  const allocated = pulseMetric(input.pulse, "allocated_capital");
  const spent = pulseMetric(input.pulse, "actual_spend");
  if (cash?.value !== input.treasury.verified_treasury_cash.value || cash?.value !== input.hq.cash.verified_liquid_cash) {
    reasons.push("TREASURY_CASH_DIVERGED");
  }
  if (authorized?.value !== input.treasury.authorized_capital.value || authorized?.value !== input.hq.capital.authorized_capital) {
    reasons.push("AUTHORIZED_DIVERGED");
  }
  if (allocated?.value !== input.treasury.allocated_capital.value || allocated?.value !== input.hq.capital.allocated_capital) {
    reasons.push("ALLOCATED_DIVERGED");
  }
  if (spent?.value !== input.treasury.actual_spend.value || spent?.value !== input.hq.capital.spent_capital) {
    reasons.push("SPEND_DIVERGED");
  }
  if (cash?.display !== input.treasury.verified_treasury_cash.display) reasons.push("TREASURY_CASH_DISPLAY_DIVERGED");
  if (input.pulse.source_contract !== "CanonicalTreasuryProjection") reasons.push("INDEPENDENT_PULSE_SOURCE");
  return reasons.length
    ? fail(HQ_FINANCIAL_PULSE_CONSISTENCY_GATE, reasons)
    : pass(HQ_FINANCIAL_PULSE_CONSISTENCY_GATE, "PULSE == CANONICAL_TREASURY == HQ_FINANCIAL_TRUTH");
}

export function evaluateHQEconomicPulseConsistencyGate(input: {
  pulse: HqFinancialPulse | null;
  portfolio: PortfolioActualEconomicsProjection | null | undefined;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.pulse || !input.portfolio) return fail(HQ_ECONOMIC_PULSE_CONSISTENCY_GATE, ["MISSING_PORTFOLIO_ECONOMICS"]);
  if (input.pulse.economics_contract !== input.portfolio.contract) reasons.push("ECONOMICS_CONTRACT_DIVERGED");
  if (pulseMetric(input.pulse, "month_revenue")?.value !== input.portfolio.current_month_gross_revenue) {
    reasons.push("MONTH_REVENUE_DIVERGED");
  }
  if (pulseMetric(input.pulse, "lifetime_revenue")?.value !== input.portfolio.lifetime_gross_revenue) {
    reasons.push("LIFETIME_REVENUE_DIVERGED");
  }
  if (pulseMetric(input.pulse, "actual_contribution")?.display !== input.portfolio.contribution_display) {
    reasons.push("CONTRIBUTION_DISPLAY_DIVERGED");
  }
  if (pulseMetric(input.pulse, "top_revenue_venture")?.display !== input.portfolio.top_revenue_venture.display) {
    reasons.push("TOP_VENTURE_DIVERGED");
  }
  return reasons.length
    ? fail(HQ_ECONOMIC_PULSE_CONSISTENCY_GATE, reasons)
    : pass(HQ_ECONOMIC_PULSE_CONSISTENCY_GATE, "PULSE == PORTFOLIO_ACTUAL_ECONOMICS");
}

export function evaluateHQExecutiveEconomicPulseGate(input: {
  pulse: HqFinancialPulse | null;
  hasMonthRevenue: boolean;
  hasLifetimeRevenue: boolean;
  hasContribution: boolean;
  hasTopVenture: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.pulse) reasons.push("PULSE_MISSING");
  if (!input.hasMonthRevenue) reasons.push("MONTH_REVENUE_MISSING");
  if (!input.hasLifetimeRevenue) reasons.push("LIFETIME_REVENUE_MISSING");
  if (!input.hasContribution) reasons.push("CONTRIBUTION_MISSING");
  if (!input.hasTopVenture) reasons.push("TOP_VENTURE_MISSING");
  return reasons.length
    ? fail(HQ_EXECUTIVE_ECONOMIC_PULSE_GATE, reasons)
    : pass(HQ_EXECUTIVE_ECONOMIC_PULSE_GATE, "HOT_ECONOMICS_VISIBLE");
}

export function evaluatePortfolioRevenueTruthGate(input: {
  founderDepositsExcluded: boolean;
  stripePayoutsExcluded: boolean;
  mercurySettlementsExcluded: boolean;
  syntheticExcluded: boolean;
  modeledExcluded: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.founderDepositsExcluded) reasons.push("FOUNDER_DEPOSITS_COUNTED");
  if (!input.stripePayoutsExcluded) reasons.push("STRIPE_PAYOUTS_COUNTED");
  if (!input.mercurySettlementsExcluded) reasons.push("MERCURY_SETTLEMENTS_COUNTED");
  if (!input.syntheticExcluded) reasons.push("SYNTHETIC_COUNTED");
  if (!input.modeledExcluded) reasons.push("MODELED_COUNTED");
  return reasons.length
    ? fail(PORTFOLIO_REVENUE_TRUTH_GATE, reasons)
    : pass(PORTFOLIO_REVENUE_TRUTH_GATE, "REAL_VENTURE_REVENUE_ONLY");
}

export function evaluateCrossVentureRevenueAttributionGate(input: {
  sharedStripeIsNotPortfolioRevenue: boolean;
  ventureRowsAttributed: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.sharedStripeIsNotPortfolioRevenue) reasons.push("SHARED_STRIPE_TREATED_AS_PORTFOLIO_REVENUE");
  if (!input.ventureRowsAttributed) reasons.push("VENTURE_ATTRIBUTION_MISSING");
  return reasons.length
    ? fail(CROSS_VENTURE_REVENUE_ATTRIBUTION_GATE, reasons)
    : pass(CROSS_VENTURE_REVENUE_ATTRIBUTION_GATE, "SHARED_STRIPE_SEPARATE_FROM_VENTURE_REVENUE");
}

export function evaluateActualContributionTruthGate(input: {
  unknownCostState: PortfolioActualEconomicsProjection["unknown_cost_state"] | null;
  contribution: number | null;
  contributionDisplay: string | null;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.unknownCostState) reasons.push("COST_STATE_MISSING");
  if (input.unknownCostState && input.unknownCostState !== "KNOWN") {
    if (input.contribution != null) reasons.push("NUMERIC_CONTRIBUTION_WITH_UNKNOWN_COST");
    if (input.contributionDisplay === "$0" || input.contributionDisplay === "$0.00") {
      reasons.push("UNKNOWN_COST_SHOWN_AS_ZERO");
    }
    if (input.contributionDisplay !== "UNKNOWN" && input.contributionDisplay !== "PARTIAL") {
      reasons.push("UNKNOWN_COST_NOT_LABELED");
    }
  }
  return reasons.length
    ? fail(ACTUAL_CONTRIBUTION_TRUTH_GATE, reasons)
    : pass(ACTUAL_CONTRIBUTION_TRUTH_GATE, "UNKNOWN_COST_NOT_ZERO");
}

export function evaluateTopRevenueVentureTruthGate(input: {
  rankingBasis: string | null;
  topDisplay: string | null;
  monthRevenue: number | null;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.rankingBasis !== "CURRENT_MONTH_REVENUE") reasons.push("RANKING_BASIS_INVALID");
  if ((input.monthRevenue ?? 0) <= 0 && input.topDisplay !== "NONE YET") reasons.push("ZERO_REVENUE_NOT_NONE_YET");
  if ((input.monthRevenue ?? 0) > 0 && (!input.topDisplay || input.topDisplay === "NONE YET")) {
    reasons.push("REVENUE_WITHOUT_TOP_VENTURE");
  }
  return reasons.length
    ? fail(TOP_REVENUE_VENTURE_TRUTH_GATE, reasons)
    : pass(TOP_REVENUE_VENTURE_TRUTH_GATE, "CURRENT_MONTH_REVENUE_RANKING");
}

export function evaluateHQOperationalRoomsProminenceGate(input: {
  commandBeforeRooms: boolean;
  roomsBeforeFullTreasury: boolean;
  fullTreasuryBetweenCommandAndRooms: boolean;
  pulseCompact: boolean;
  pulseMateriallyBuriesRooms: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.commandBeforeRooms) reasons.push("ROOMS_BEFORE_COMMAND");
  if (!input.roomsBeforeFullTreasury) reasons.push("FULL_TREASURY_BEFORE_ROOMS");
  if (input.fullTreasuryBetweenCommandAndRooms) reasons.push("FULL_TREASURY_BETWEEN_COMMAND_AND_ROOMS");
  if (!input.pulseCompact) reasons.push("PULSE_NOT_COMPACT");
  if (input.pulseMateriallyBuriesRooms) reasons.push("PULSE_BURIES_ROOMS");
  return reasons.length
    ? fail(HQ_OPERATIONAL_ROOMS_PROMINENCE_GATE, reasons)
    : pass(HQ_OPERATIONAL_ROOMS_PROMINENCE_GATE, "ROOMS_PROMINENT_BEFORE_FULL_TREASURY");
}

export function evaluateHQInformationHierarchyGate(input: {
  homeSurfaceOrder: string[];
}): NamedFinancialGate {
  const reasons: string[] = [];
  const order = input.homeSurfaceOrder;
  const compact = order.indexOf("compact-operating-summary");
  const pulse = order.indexOf("financial-pulse");
  const command = order.indexOf("command");
  const rooms = order.indexOf("operating-floor");
  const truth = order.indexOf("financial-truth");
  if (pulse < 0) reasons.push("FINANCIAL_PULSE_MISSING");
  if (command < 0) reasons.push("COMMAND_MISSING");
  if (rooms < 0) reasons.push("ROOMS_MISSING");
  if (truth < 0) reasons.push("FULL_FINANCIAL_TRUTH_MISSING");
  if (pulse >= 0 && command >= 0 && pulse > command) reasons.push("PULSE_BELOW_COMMAND");
  if (compact >= 0 && command >= 0 && compact < command) reasons.push("STATUS_BETWEEN_HEADER_AND_COMMAND");
  if (command >= 0 && rooms >= 0 && command > rooms) reasons.push("COMMAND_BELOW_ROOMS");
  if (rooms >= 0 && truth >= 0 && rooms > truth) reasons.push("ROOMS_BELOW_FULL_TREASURY");
  if (command >= 0 && truth >= 0 && command > truth) reasons.push("COMMAND_BELOW_FULL_TREASURY");
  if (pulse >= 0 && truth >= 0 && rooms >= 0 && pulse > rooms && pulse < truth) {
    reasons.push("PULSE_IN_FULL_TREASURY_ZONE");
  }
  return reasons.length
    ? fail(HQ_INFORMATION_HIERARCHY_GATE, reasons)
    : pass(HQ_INFORMATION_HIERARCHY_GATE, "PULSE_COMMAND_STATUS_ROOMS_THEN_FULL_TREASURY");
}

export function evaluateHQTopInformationHierarchyGate(input: {
  homeSurfaceOrder: string[];
}): NamedFinancialGate {
  const hierarchy = evaluateHQInformationHierarchyGate(input);
  if (hierarchy.result !== "PASS") {
    return { gate: HQ_TOP_INFORMATION_HIERARCHY_GATE, result: "FAIL", reasons: hierarchy.reasons };
  }
  return pass(HQ_TOP_INFORMATION_HIERARCHY_GATE, "HEADER_PULSE_COMMAND_STATUS_ROOMS");
}

export function evaluateResponsiveFinancialPulseGate(input: {
  desktopRow: boolean;
  mobileCompact: boolean;
  overflowHidden: boolean;
  noForcedHorizontalScroll: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.desktopRow) reasons.push("DESKTOP_NOT_COMPACT_ROW");
  if (!input.mobileCompact) reasons.push("MOBILE_NOT_COMPACT");
  if (!input.overflowHidden) reasons.push("OVERFLOW_NOT_CONTAINED");
  if (!input.noForcedHorizontalScroll) reasons.push("HORIZONTAL_OVERFLOW");
  return reasons.length
    ? fail(RESPONSIVE_FINANCIAL_PULSE_GATE, reasons)
    : pass(RESPONSIVE_FINANCIAL_PULSE_GATE, "COMPACT_RESPONSIVE_PULSE");
}

export function evaluateCardTextContainmentGate(input: {
  overflowHidden: boolean;
  ellipsis: boolean;
  noTimestampWrap: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.overflowHidden) reasons.push("OVERFLOW_VISIBLE");
  if (!input.ellipsis) reasons.push("NO_ELLIPSIS");
  if (!input.noTimestampWrap) reasons.push("TIMESTAMP_WRAP");
  return reasons.length ? fail(CARD_TEXT_CONTAINMENT_GATE, reasons) : pass(CARD_TEXT_CONTAINMENT_GATE, "TEXT_CONTAINED");
}

export function evaluateHorizontalOverflowGate(input: {
  pageOverflowHidden: boolean;
  pulseNoForcedScroll: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.pageOverflowHidden) reasons.push("PAGE_OVERFLOW");
  if (!input.pulseNoForcedScroll) reasons.push("PULSE_HORIZONTAL_SCROLL");
  return reasons.length ? fail(HORIZONTAL_OVERFLOW_GATE, reasons) : pass(HORIZONTAL_OVERFLOW_GATE, "NO_HORIZONTAL_OVERFLOW");
}

export function pulseContainsForbiddenDetail(source: string): boolean {
  return FORBIDDEN_PULSE_DETAIL.some((token) => source.includes(token));
}

export function evaluateExistingLiveFinancialRefresh(gate: NamedFinancialGate | undefined): NamedFinancialGate {
  if (!gate) return fail(HQ_LIVE_FINANCIAL_REFRESH_GATE, ["LIVE_REFRESH_GATE_MISSING"]);
  return gate;
}

export function evaluateHQLiveEconomicRefreshGate(input: {
  usesExistingLiveFinancialPath: boolean;
  noNewPollLoop: boolean;
  pulseReadsFinancialTruth: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.usesExistingLiveFinancialPath) reasons.push("INDEPENDENT_ECONOMIC_REFRESH");
  if (!input.noNewPollLoop) reasons.push("NEW_POLL_LOOP");
  if (!input.pulseReadsFinancialTruth) reasons.push("PULSE_NOT_BOUND_TO_LIVE_TRUTH");
  return reasons.length
    ? fail(HQ_LIVE_ECONOMIC_REFRESH_GATE, reasons)
    : pass(HQ_LIVE_ECONOMIC_REFRESH_GATE, "EXISTING_CANONICAL_LIVE_PATH");
}
