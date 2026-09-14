"use client";

import type { HqFinancialMetric, HqFinancialTruthView } from "@/lib/infinity/financial-truth/types";

function MetricCard({ row, emphasize = false }: { row: HqFinancialMetric; emphasize?: boolean }) {
  return (
    <article
      className={`hq-financial-truth__metric${emphasize ? " is-hero" : ""}`}
      data-hq-financial-metric={row.id}
      data-hq-financial-layer={row.layer}
      data-hq-financial-source={row.provenance.source}
      data-hq-financial-freshness={row.provenance.freshness}
      data-hq-financial-verification={row.provenance.verification_status}
      data-hq-canonical-state={row.canonical_state ?? ""}
    >
      <p className="hq-financial-truth__label">{row.label}</p>
      <p className="hq-financial-truth__value">
        {row.display.split("\n").map((line) => (
          <span key={line} className="hq-financial-truth__value-line">
            {line}
          </span>
        ))}
      </p>
      <details className="hq-financial-truth__provenance">
        <summary>Source</summary>
        <p>
          {row.provenance.source} · {row.provenance.verification_status} · {row.provenance.freshness}
          {row.provenance.verified_at ? ` · ${row.provenance.verified_at}` : ""}
        </p>
        {row.canonical_state ? <p data-hq-canonical-inspect="true">Canonical {row.canonical_state}</p> : null}
      </details>
    </article>
  );
}

function pick(view: HqFinancialTruthView, id: string): HqFinancialMetric | undefined {
  return view.metrics.find((row) => row.id === id);
}

export function HqFinancialTruthStrip({ view }: { view: HqFinancialTruthView | null | undefined }) {
  if (!view) return null;
  const liquid = pick(view, "verified_liquid_cash");
  const mercury = pick(view, "mercury_cash");
  const stripeAvail = pick(view, "stripe_available");
  const stripePending = pick(view, "stripe_pending");
  const destination = pick(view, "settlement_destination");
  const settlement = pick(view, "settlement_status");
  const gross = pick(view, "gross_revenue");
  const refunds = pick(view, "refunds");
  const fees = pick(view, "processor_fees");
  const known = pick(view, "known_spend");
  const unknown = pick(view, "unknown_cost_state");
  const contribution = pick(view, "actual_contribution");
  const modeled = pick(view, "modeled_revenue");
  const authorized = pick(view, "authorized_capital");
  const remaining = pick(view, "remaining_authorized_capital");
  const unallocated = pick(view, "unallocated_authorized_capital");
  const committed = pick(view, "committed_capital");
  const monthlyBurn = pick(view, "monthly_burn_cap");
  const mercuryAccess = pick(view, "mercury_access");
  const allocated = pick(view, "allocated_capital");
  const authorizedSpend = pick(view, "authorized_spend");
  const actualSpend = pick(view, "actual_spend");
  const reconciliation = pick(view, "reconciliation");
  const sync = pick(view, "last_financial_sync");
  const settlementTone =
    view.reconciliation.settlement_reconciliation_status === "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED"
      ? "neutral"
      : view.reconciliation.settlement_reconciliation_status === "FAILED"
        ? "error"
        : "neutral";
  return (
    <section className="hq-financial-truth" data-hq-financial-truth="true" aria-label="Infinity financial truth">
      <header className="hq-financial-truth__header">
        <div>
          <p className="hq-command-kicker">Financial truth</p>
          <h2>Parent treasury · venture economics · capital authority</h2>
        </div>
        <p className="hq-financial-truth__status" data-hq-financial-completeness={view.cash.cash_completeness}>
          Completeness {view.cash.cash_completeness} · Mercury {view.mercury.connection} · Stripe {view.stripe.connection} ·{" "}
          {view.infrastructure_mode === "SHARED_PARENT_FINANCIAL_INFRASTRUCTURE" ? "Shared parent" : "Separate entity"}
        </p>
      </header>
      <div className="hq-financial-truth__layers">
        <div data-hq-financial-layer-group="PARENT">
          <div data-hq-financial-layer-group="LIVE_CASH" />
          <p className="hq-financial-truth__layer-title">Portfolio / parent treasury</p>
          <div className="hq-financial-truth__grid">
            {liquid ? <MetricCard row={liquid} emphasize /> : null}
            {mercury ? <MetricCard row={mercury} /> : null}
            {stripeAvail ? <MetricCard row={stripeAvail} /> : null}
            {stripePending ? <MetricCard row={stripePending} /> : null}
            {destination ? <MetricCard row={destination} /> : null}
            {settlement ? <MetricCard row={settlement} /> : null}
            {authorized ? <MetricCard row={authorized} /> : null}
          </div>
          <p
            className="hq-financial-truth__settlement-note"
            data-hq-settlement-tone={settlementTone}
            data-hq-settlement-not-error={settlementTone !== "error" ? "true" : "false"}
          >
            Stripe settlement does not have to land in Mercury. Processor cash is not treasury cash.
          </p>
        </div>
        <div data-hq-financial-layer-group="ACTUAL">
          <p className="hq-financial-truth__layer-title">Venture economics</p>
          <div data-hq-financial-layer-group="VENTURE" />
          <div className="hq-financial-truth__grid">
            {gross ? <MetricCard row={gross} /> : null}
            {refunds ? <MetricCard row={refunds} /> : null}
            {fees ? <MetricCard row={fees} /> : null}
            {known ? <MetricCard row={known} /> : null}
            {unknown ? <MetricCard row={unknown} /> : null}
            {contribution ? <MetricCard row={contribution} /> : null}
            {allocated ? <MetricCard row={allocated} /> : null}
            {authorizedSpend ? <MetricCard row={authorizedSpend} /> : null}
            {actualSpend ? <MetricCard row={actualSpend} /> : null}
          </div>
        </div>
        <div data-hq-financial-layer-group="MODELED">
          <p className="hq-financial-truth__layer-title">Modeled economics</p>
          <div className="hq-financial-truth__grid">
            {modeled ? <MetricCard row={modeled} /> : null}
            {pick(view, "modeled_costs") ? <MetricCard row={pick(view, "modeled_costs")!} /> : null}
            {pick(view, "modeled_contribution") ? <MetricCard row={pick(view, "modeled_contribution")!} /> : null}
          </div>
        </div>
        <div data-hq-financial-layer-group="CAPITAL">
          <p className="hq-financial-truth__layer-title">Capital authority</p>
          <p className="hq-financial-truth__settlement-note">
            Cash is not authorization. Authorization is not allocation. Allocation is not spend authority. Spend authority is not spend.
          </p>
          <div className="hq-financial-truth__grid">
            {authorized ? <MetricCard row={authorized} emphasize /> : null}
            {allocated ? <MetricCard row={allocated} /> : null}
            {committed ? <MetricCard row={committed} /> : null}
            {actualSpend ? <MetricCard row={actualSpend} /> : null}
            {remaining ? <MetricCard row={remaining} /> : null}
            {unallocated ? <MetricCard row={unallocated} /> : null}
            {monthlyBurn ? <MetricCard row={monthlyBurn} /> : null}
            {mercuryAccess ? <MetricCard row={mercuryAccess} /> : null}
            {reconciliation ? <MetricCard row={reconciliation} /> : null}
            {sync ? <MetricCard row={sync} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
