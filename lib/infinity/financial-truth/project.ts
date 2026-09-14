import { displayMoney, displayNotSet, freshnessFromAge } from "./amounts";
import { computePortfolioCashPosition } from "./cash-position";
import { computePortfolioCapitalPosition } from "./capital-position";
import { evaluateFinancialDataFreshnessGate, ledgerFreshness } from "./freshness";
import {
  evaluateFinancialAccountReconciliationGate,
  evaluateFounderCapitalPolicyFinancialTruthGate,
  evaluateHQLiveFinancialRefreshGate,
  evaluatePortfolioCapitalAllocationGate,
  evaluateVerifiedCashCompletenessGate,
} from "./gates";
import { shouldRefreshMercury } from "./live-cadence";
import { evaluateFinancialReconciliationAnomalyGate } from "./anomalies";
import { accountPayoutsForSettlement, reconcileStripeMercury } from "./reconciliation";
import { infinityAttributedPayouts, isInfinityAttributedStripeTxn } from "./stripe-attribution";
import { buildFinancialSourceRegistry } from "./registry";
import {
  CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE,
  PARENT_OPERATING_ENTITY,
  buildSharedProcessorAccount,
} from "./parent-infrastructure";
import {
  buildSettlementDestination,
  classifySettlementDestination,
  hqSettlementDestinationLabel,
  hqSettlementStatusLabel,
} from "./settlement-destination";
import { hqFinancialSyncDisplay, hqReconciliationDisplay } from "./machine-state-presentation";
import { buildMercuryTreasuryStructure } from "./mercury-treasury";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { allocatedCapitalTotal, loadCapitalLedger, reloadCapitalLedgerIfDiskChanged } from "./capital-ledger";
import { ensureFirstGovernedAllocationDecision } from "./venture-capital-allocation-decision";
import { portfolioVentureSlug, projectPortfolioActualEconomics } from "./portfolio-actual-economics";
import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "./founder-capital-policy";
import { ledgerAllocationsForHq, projectCanonicalTreasury } from "./treasury-projection";
import { evaluateTreasuryControlGates } from "./treasury-gates";
import { displaySpendCeiling, projectOccupancyNpvSpendAuthority, projectVentureSpendAuthority } from "./spend-authority";
import type {
  FinancialProvenance,
  FinancialTruthSnapshot,
  HqFinancialMetric,
  HqFinancialTruthView,
  VentureEconomicsProjection,
} from "./types";

function provenance(source: string, verifiedAt: string | null, verification: "VERIFIED" | "UNVERIFIED" | "UNKNOWN"): FinancialProvenance {
  return {
    source,
    verified_at: verifiedAt,
    freshness: freshnessFromAge(verifiedAt),
    verification_status: verification,
  };
}

function displaySpendAuthorityMetric(ledger: ReturnType<typeof loadCapitalLedger>, actualSpend: number): string {
  const authority = projectOccupancyNpvSpendAuthority(ledger, actualSpend);
  return displaySpendCeiling(authority.authorized_spend_ceiling);
}

function metric(
  id: string,
  label: string,
  display: string,
  layer: HqFinancialMetric["layer"],
  prov: FinancialProvenance,
  canonicalState?: string | null,
): HqFinancialMetric {
  return { id, label, display, canonical_state: canonicalState ?? null, layer, provenance: prov };
}

export function projectHqFinancialTruth(snapshot: FinancialTruthSnapshot, now = new Date().toISOString()): HqFinancialTruthView {
  reloadCapitalLedgerIfDiskChanged();
  ensureFirstGovernedAllocationDecision();
  const cash = computePortfolioCashPosition({
    mercury: snapshot.mercury,
    stripe: snapshot.stripe,
    verifiedAt: snapshot.stripe.last_verified ?? snapshot.mercury.last_verified ?? snapshot.captured_at,
  });
  const ledger = loadCapitalLedger();
  const allocated = allocatedCapitalTotal(ledger);
  const policy = {
    ...CANONICAL_FOUNDER_CAPITAL_POLICY,
    portfolio_capital_ceiling: Math.min(
      CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital,
      ledger.portfolio_budget.portfolio_capital_ceiling,
    ),
    monthly_burn_cap: ledger.portfolio_budget.monthly_burn_cap,
    paid_advertising_budget: ledger.portfolio_budget.paid_acquisition_budget,
  };
  const capital = computePortfolioCapitalPosition({
    cash,
    committed_capital: snapshot.committed_capital,
    spent_capital: snapshot.spent_capital,
    current_month_known_burn: snapshot.current_month_known_burn,
    unknown_cost_state: snapshot.unknown_cost_state,
    allocated_capital: allocated,
    policy,
  });
  const destinationClassification =
    snapshot.stripe.settlement_destination_classification ??
    classifySettlementDestination(snapshot.stripe.payout_destination);
  const reconciliation = reconcileStripeMercury({
    payouts: infinityAttributedPayouts(snapshot.stripe.payouts, snapshot.stripe.balance_transactions),
    mercuryTxns: snapshot.mercury.transactions,
    mercuryConnected: snapshot.mercury.connection === "LIVE",
    ledgerGross: snapshot.actual.gross_revenue,
    stripeChargeGross: snapshot.stripe.balance_transactions
      .filter((row) => (row.type === "charge" || row.type === "payment") && isInfinityAttributedStripeTxn(row))
      .reduce((sum, row) => sum + row.amount, 0),
    destinationClassification,
    accountPayouts: accountPayoutsForSettlement({
      payouts: snapshot.stripe.payouts,
      recentAmount: snapshot.stripe.recent_payout_amount,
      recentId: snapshot.stripe.recent_payout_id,
      recentStatus: snapshot.stripe.recent_payout_status,
      currency: snapshot.stripe.currency,
    }),
  });
  reconciliation.anomalies = [...reconciliation.anomalies, ...snapshot.anomalies];
  const registry = snapshot.registry.length
    ? snapshot.registry
    : buildFinancialSourceRegistry({
        mercury: snapshot.mercury,
        stripe: snapshot.stripe,
        ledgerVerifiedAt: snapshot.captured_at,
      });
  const mercuryProv = provenance(
    "MERCURY",
    snapshot.mercury.last_verified,
    snapshot.mercury.connection === "LIVE" ? "VERIFIED" : "UNVERIFIED",
  );
  const stripeProv = provenance(
    "STRIPE",
    snapshot.stripe.last_verified,
    snapshot.stripe.connection === "LIVE" ? "VERIFIED" : "UNVERIFIED",
  );
  const ledgerProv = provenance("INFINITY_LEDGER", snapshot.captured_at, "VERIFIED");
  const modeledProv = provenance("MODELED", snapshot.captured_at, "UNVERIFIED");
  const capitalProv = provenance("FOUNDER_EXPLICIT_AUTHORIZATION", snapshot.captured_at, "VERIFIED");
  const unknownCosts = snapshot.actual.unknown_cost_categories.join(", ") || "NONE";
  const metrics: HqFinancialMetric[] = [
    metric("verified_liquid_cash", "Verified treasury cash", displayMoney(cash.verified_liquid_cash), "LIVE_CASH", stripeProv),
    metric("mercury_cash", "Mercury cash", snapshot.mercury.connection === "LIVE" ? displayMoney(snapshot.mercury.available ?? snapshot.mercury.current) : "UNKNOWN", "LIVE_CASH", mercuryProv),
    metric("stripe_available", "Stripe available", displayMoney(snapshot.stripe.available), "LIVE_CASH", stripeProv),
    metric("stripe_pending", "Stripe pending", displayMoney(snapshot.stripe.pending), "LIVE_CASH", stripeProv),
    metric("gross_revenue", "Current month gross revenue", displayMoney(snapshot.actual.current_month_gross_revenue), "ACTUAL", ledgerProv),
    metric("refunds", "Refunds", displayMoney(snapshot.actual.refunds), "ACTUAL", ledgerProv),
    metric("processor_fees", "Processor fees", displayMoney(snapshot.actual.processor_fees), "ACTUAL", ledgerProv),
    metric("known_spend", "Known spend", displayMoney(snapshot.actual.known_costs), "ACTUAL", ledgerProv),
    metric("unknown_cost_state", "Unknown cost state", unknownCosts === "NONE" ? "NONE" : "UNKNOWN", "ACTUAL", ledgerProv),
    metric("actual_contribution", "Actual contribution", displayMoney(snapshot.actual.contribution), "ACTUAL", ledgerProv),
    metric("modeled_revenue", "Modeled revenue", displayMoney(snapshot.modeled.modeled_revenue), "MODELED", modeledProv),
    metric("modeled_costs", "Modeled costs", displayMoney(snapshot.modeled.modeled_costs), "MODELED", modeledProv),
    metric("modeled_contribution", "Modeled contribution", displayMoney(snapshot.modeled.modeled_contribution), "MODELED", modeledProv),
    metric("authorized_capital", "Portfolio authorized capital", displayNotSet(capital.authorized_capital), "CAPITAL", capitalProv),
    metric("remaining_authorized_capital", "Remaining authorized capital", displayNotSet(capital.remaining_authorized_capital), "CAPITAL", capitalProv),
    metric("unallocated_authorized_capital", "Unallocated authorized capital", displayNotSet(capital.unallocated_authorized_capital), "CAPITAL", capitalProv),
    metric("committed_capital", "Committed capital", displayMoney(capital.committed_capital), "CAPITAL", capitalProv),
    metric("monthly_burn_cap", "Monthly burn cap", displayNotSet(capital.monthly_burn_cap), "CAPITAL", capitalProv),
    metric("mercury_access", "Mercury access", "READ ONLY", "CAPITAL", mercuryProv),
    metric("paid_advertising_budget", "Paid advertising budget", displayMoney(capital.paid_advertising_budget), "CAPITAL", capitalProv),
    metric("settlement_destination", "Settlement destination", hqSettlementDestinationLabel(destinationClassification), "RECONCILIATION", stripeProv),
    metric("settlement_status", "Settlement reconciliation", hqSettlementStatusLabel(reconciliation.settlement_reconciliation_status), "RECONCILIATION", stripeProv),
    metric(
      "reconciliation",
      "Financial reconciliation",
      hqReconciliationDisplay(reconciliation.stripe_to_ledger, reconciliation.settlement_reconciliation_status),
      "RECONCILIATION",
      ledgerProv,
      `${reconciliation.stripe_to_ledger} / ${reconciliation.settlement_reconciliation_status}`,
    ),
    metric(
      "last_financial_sync",
      "Last financial sync",
      hqFinancialSyncDisplay(snapshot.captured_at),
      "RECONCILIATION",
      ledgerProv,
      snapshot.captured_at,
    ),
    metric("allocated_capital", "Allocated capital", displayMoney(capital.allocated_capital), "VENTURE", capitalProv),
    metric(
      "authorized_spend",
      "OccupancyNPV spend authority",
      displaySpendAuthorityMetric(ledger, capital.spent_capital ?? 0),
      "VENTURE",
      capitalProv,
    ),
    metric("actual_spend", "Actual spend", displayMoney(capital.spent_capital), "VENTURE", ledgerProv),
  ];
  const settlementDestination = buildSettlementDestination(
    destinationClassification,
    destinationClassification === "KNOWN_EXTERNAL_BANK" ? "Known non-Mercury bank" : hqSettlementDestinationLabel(destinationClassification),
  );
  const sharedProcessor = buildSharedProcessorAccount({
    classification: destinationClassification,
    lastVerifiedAt: snapshot.stripe.last_verified,
    status: snapshot.stripe.connection,
  });
  const treasury = buildMercuryTreasuryStructure({
    safeAccountReference: snapshot.mercury.safe_account_reference,
  });
  const allocations = ledgerAllocationsForHq(ledger, snapshot.mercury.currency || "USD");
  const portfolioEconomics = projectPortfolioActualEconomics(snapshot.captured_at);
  const ventureEconomics: VentureEconomicsProjection[] = portfolioEconomics.ventures.map((row) => ({
    venture_id: row.venture_id,
    venture_slug: portfolioVentureSlug(row.display_name, row.venture_id),
    display_name: row.display_name,
    gross_revenue: row.lifetime_gross_revenue,
    refunds: row.refunds,
    processor_fees: row.processor_fees,
    net_processor_revenue: row.lifetime_gross_revenue - row.refunds,
    fulfillment_costs: null,
    other_actual_costs: row.known_actual_cost,
    contribution: row.actual_contribution,
    current_month_gross_revenue: row.current_month_gross_revenue,
    settlement_status: row.venture_id === CRE_VENTURE_ID
      ? reconciliation.settlement_reconciliation_status
      : "UNKNOWN",
    allocated_capital: allocations.find((item) => item.venture_id === row.venture_id)?.allocated_amount ?? 0,
    authorized_spend: projectVentureSpendAuthority(ledger, row.venture_id, snapshot.spent_capital ?? 0).authorized_spend_ceiling,
    actual_spend: row.venture_id === CRE_VENTURE_ID ? snapshot.spent_capital : null,
  }));
  const view: HqFinancialTruthView = {
    contract: "HqFinancialTruthView",
    version: [
      snapshot.captured_at,
      snapshot.mercury.connection,
      snapshot.stripe.connection,
      String(cash.verified_liquid_cash),
      snapshot.actual.gross_revenue ?? "u",
      String(capital.allocated_capital),
      ledger.revision,
    ].join(":"),
    mercury: snapshot.mercury,
    stripe: snapshot.stripe,
    cash,
    capital,
    actual: snapshot.actual,
    modeled: snapshot.modeled,
    reconciliation,
    registry,
    metrics,
    gates: {
      cash_completeness: evaluateVerifiedCashCompletenessGate(cash),
      freshness: evaluateFinancialDataFreshnessGate({
        mercury: snapshot.mercury.freshness,
        stripe: snapshot.stripe.freshness,
        ledger: ledgerFreshness(snapshot.captured_at),
      }),
      anomaly: evaluateFinancialReconciliationAnomalyGate(reconciliation.anomalies),
      account_reconciliation: evaluateFinancialAccountReconciliationGate(reconciliation),
      founder_capital_policy_truth: {
        gate: "FounderCapitalPolicyFinancialTruthGate",
        result: "FAIL",
        reasons: [],
      },
      hq_live_financial_refresh: {
        gate: "HQLiveFinancialRefreshGate",
        result: "FAIL",
        reasons: [],
      },
      portfolio_capital_allocation: evaluatePortfolioCapitalAllocationGate({
        authorized: typeof capital.authorized_capital === "number" ? capital.authorized_capital : 0,
        allocated: capital.allocated_capital,
        committed: capital.committed_capital ?? 0,
      }),
      canonical_treasury_projection: { gate: "CanonicalTreasuryProjectionGate", result: "FAIL", reasons: [] },
      hq_treasury_consistency: { gate: "HQTreasuryFinancialConsistencyGate", result: "FAIL", reasons: [] },
      treasury_bank_cash_truth: { gate: "TreasuryBankCashTruthGate", result: "FAIL", reasons: [] },
      budget_within_capital_authority: { gate: "BudgetWithinCapitalAuthorityGate", result: "FAIL", reasons: [] },
      venture_allocation_identity: { gate: "VentureAllocationIdentityGate", result: "FAIL", reasons: [] },
      allocation_vs_spend_separation: { gate: "AllocationVsSpendSeparationGate", result: "FAIL", reasons: [] },
      treasury_live_update: { gate: "TreasuryLiveUpdateGate", result: "FAIL", reasons: [] },
      founder_budget_policy_mutation: { gate: "FounderBudgetPolicyMutationGate", result: "FAIL", reasons: [] },
      founder_capital_allocation_mutation: { gate: "FounderCapitalAllocationMutationGate", result: "FAIL", reasons: [] },
      venture_capital_eligibility: { gate: "VentureCapitalEligibilityGate", result: "FAIL", reasons: [] },
      capital_use_evidence: { gate: "CapitalUseEvidenceGate", result: "FAIL", reasons: [] },
      capital_efficiency: { gate: "CapitalEfficiencyGate", result: "FAIL", reasons: [] },
      portfolio_reserve_integrity: { gate: "PortfolioReserveIntegrityGate", result: "FAIL", reasons: [] },
      capital_allocation_explainability: { gate: "CapitalAllocationExplainabilityGate", result: "FAIL", reasons: [] },
    },
    treasury_control: projectCanonicalTreasury({
      contract: "HqFinancialTruthView",
      version: "",
      mercury: snapshot.mercury,
      stripe: snapshot.stripe,
      cash,
      capital,
      actual: snapshot.actual,
      modeled: snapshot.modeled,
      reconciliation,
      registry,
      metrics,
      last_financial_sync: snapshot.captured_at,
      layers_separated: true,
      read_only_bank_access: true,
      founder_estimate_used: false,
      infrastructure_mode: CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE,
      parent_entity: PARENT_OPERATING_ENTITY,
      shared_processor: sharedProcessor,
      settlement_destination: settlementDestination,
      treasury,
      allocations,
      venture_economics: ventureEconomics,
      portfolio_economics: portfolioEconomics,
      mutation_adapter_status: "NOT_ACTIVE",
    }),
    last_financial_sync: snapshot.captured_at,
    layers_separated: true,
    read_only_bank_access: true,
    founder_estimate_used: false,
    infrastructure_mode: CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE,
    parent_entity: PARENT_OPERATING_ENTITY,
    shared_processor: sharedProcessor,
    settlement_destination: settlementDestination,
    treasury,
    allocations,
    venture_economics: ventureEconomics,
    portfolio_economics: portfolioEconomics,
    mutation_adapter_status: "NOT_ACTIVE",
  };
  view.treasury_control = projectCanonicalTreasury(view, ledger);
  Object.assign(view.gates, evaluateTreasuryControlGates(view, view.treasury_control));
  view.gates.founder_capital_policy_truth = evaluateFounderCapitalPolicyFinancialTruthGate(view);
  view.gates.hq_live_financial_refresh = evaluateHQLiveFinancialRefreshGate({
    mercuryConnection: snapshot.mercury.connection,
    financialTruthProjected: true,
    mercuryMetricVisible: Boolean(metrics.find((row) => row.id === "mercury_cash")),
    liquidMetricVisible: Boolean(metrics.find((row) => row.id === "verified_liquid_cash")),
    stripeAvailableVisible: Boolean(metrics.find((row) => row.id === "stripe_available")),
    stripePendingVisible: Boolean(metrics.find((row) => row.id === "stripe_pending")),
    freshnessVisible: Boolean(metrics.find((row) => row.id === "last_financial_sync") && view.last_financial_sync),
    liveStateAttachesFinancialTruth: true,
    pollRefreshesProviders: false,
    catchUpRefreshesWhenUnverified: shouldRefreshMercury({
      lastVerified: null,
      reason: "catch-up",
      connection: snapshot.mercury.connection === "LIVE" ? "LIVE" : snapshot.mercury.connection,
    }),
    mercuryValueLive: snapshot.mercury.connection === "LIVE",
    verifiedLiquidRecalculated: cash.verified_liquid_cash != null || snapshot.mercury.connection === "LIVE",
  });
  void now;
  return view;
}

export function unknownCostMustNotDisplayZero(view: HqFinancialTruthView): boolean {
  if (view.actual.unknown_cost_categories.includes("INFRASTRUCTURE")) {
    const known = view.metrics.find((row) => row.id === "known_spend")?.display;
    return known !== "$0" || view.actual.contribution == null;
  }
  return true;
}
