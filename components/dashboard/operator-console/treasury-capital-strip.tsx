"use client";

import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { treasuryAttentionLabel, treasuryPresentation } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";

type Props = {
  model: TreasuryHqReadModel;
  inspectArtifact?: HqWorkArtifact | null;
};

function Cell({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="bg-zinc-950/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-100">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-amber-200/80">{hint}</p> : null}
    </div>
  );
}

export function TreasuryCapitalStrip({ model, inspectArtifact = null }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const presentation = treasuryPresentation(model);
  const stale = model.state.providerFreshness !== "FRESH" && model.state.providerFreshness !== "NOT_CONFIGURED";
  const attention = treasuryAttentionLabel(model);
  const statusLabel = attention ?? model.freshnessLabel;
  const onInspect =
    inspectArtifact && inspector
      ? () => inspector.openInspector(inspectArtifact)
      : undefined;

  return (
    <section
      aria-label="Treasury & Capital"
      data-infrastructure-presentation={presentation}
      className="relative overflow-hidden border border-zinc-700/35 bg-gradient-to-r from-zinc-950/80 via-[#070709] to-zinc-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(167,139,250,0.05),transparent)]" aria-hidden />
      <div className="relative flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Treasury &amp; Capital</h2>
          <p className={attention || stale ? "text-[11px] uppercase tracking-[0.16em] text-amber-200" : "text-[11px] uppercase tracking-[0.16em] text-zinc-500"}>
            {statusLabel}
          </p>
        </div>
        {onInspect ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onInspect();
            }}
            className="shrink-0 rounded border border-zinc-700/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:border-violet-400/40 hover:text-violet-100"
          >
            View Treasury
          </button>
        ) : null}
      </div>
      <div className="relative grid grid-cols-2 gap-px bg-zinc-800/40 md:grid-cols-4">
        <Cell label="Total cash" value={model.cards.totalCash.display} hint={stale ? "Provider state not current" : null} />
        <Cell label="Available capital" value={model.cards.availableCapital.display} />
        <Cell label="Monthly budget" value={model.cards.monthlyBudget.display} />
        <Cell label="Monthly spend" value={model.cards.monthlySpend.display} />
      </div>
      {presentation === "EXPANDED" ? (
        <div className="relative grid grid-cols-2 gap-px border-t border-zinc-800/60 bg-zinc-800/40 md:grid-cols-4 xl:grid-cols-7">
          <Cell label="Infinity allocated capital" value={model.cards.infinityAllocatedCapital.display} />
          <Cell label="Reserved capital" value={model.cards.reservedCapital.display} />
          <Cell label="Committed capital" value={model.cards.committedCapital.display} />
          <Cell label="Today's spend" value={model.cards.todaySpend.display} />
          <Cell label="Revenue" value={model.cards.revenue.display} />
          <Cell label="Expenses" value={model.cards.expenses.display} />
          <Cell label="Net profit" value={model.cards.netProfit.display} />
        </div>
      ) : null}
    </section>
  );
}

export function TreasuryBudgetConstraintsPanel({ model }: Props) {
  return (
    <section aria-label="Budget Constraints" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Budget Constraints</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs text-zinc-300">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="pb-2 font-medium">Constraint</th>
              <th className="pb-2 font-medium">Spent</th>
              <th className="pb-2 font-medium">Reserved</th>
              <th className="pb-2 font-medium">Committed</th>
              <th className="pb-2 font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {model.constraints.map((row) => (
              <tr key={row.label} className="border-t border-zinc-800/80">
                <td className="py-1.5">{row.label}</td>
                <td>{row.spent.display}</td>
                <td>{row.reserved.display}</td>
                <td>{row.committed.display}</td>
                <td>{row.available.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TreasuryVentureAllocationsPanel({ model }: Props) {
  return (
    <section aria-label="Venture Allocations" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Venture Allocations</h2>
      {model.ventures.length === 0 ? (
        <p className="mt-2 text-sm italic text-zinc-500">NOT YET MEASURED</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs text-zinc-300">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="pb-2 font-medium">Venture</th>
                <th className="pb-2 font-medium">Stage</th>
                <th className="pb-2 font-medium">Allocated</th>
                <th className="pb-2 font-medium">Spent</th>
                <th className="pb-2 font-medium">Reserved</th>
                <th className="pb-2 font-medium">Committed</th>
                <th className="pb-2 font-medium">Available</th>
                <th className="pb-2 font-medium">Revenue</th>
                <th className="pb-2 font-medium">Profit</th>
                <th className="pb-2 font-medium">ROI</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {model.ventures.map((row) => (
                <tr key={row.ventureId} className="border-t border-zinc-800/80">
                  <td className="py-1.5">{row.ventureId}</td>
                  <td>{row.stage}</td>
                  <td>{row.allocated.display}</td>
                  <td>{row.spent.display}</td>
                  <td>{row.reserved.display}</td>
                  <td>{row.committed.display}</td>
                  <td>{row.available.display}</td>
                  <td>{row.revenue.display}</td>
                  <td>{row.profit.display}</td>
                  <td>{row.roi.display}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TreasuryTransactionsPanel({ model }: Props) {
  return (
    <section aria-label="Treasury Transactions" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Transactions</h2>
      {model.transactions.length === 0 ? (
        <p className="mt-2 text-sm italic text-zinc-500">UNKNOWN</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs text-zinc-300">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Venture</th>
                <th className="pb-2 font-medium">Purpose</th>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 font-medium">Financial action</th>
                <th className="pb-2 font-medium">Authorization</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {model.transactions.map((row) => (
                <tr key={row.transactionId} className="border-t border-zinc-800/80">
                  <td className="py-1.5">{row.date}</td>
                  <td>{row.amount.display}</td>
                  <td>{row.merchant}</td>
                  <td>{row.category}</td>
                  <td>{row.ventureId}</td>
                  <td>{row.purpose}</td>
                  <td>{row.provider}</td>
                  <td>{row.financialActionId}</td>
                  <td>{row.authorizationSource}</td>
                  <td>{row.status}</td>
                  <td>{row.transactionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TreasuryCommitmentsPanel({ model }: Props) {
  return (
    <section aria-label="Treasury Commitments" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Commitments</h2>
      <p className="mt-2 text-xs text-zinc-400">
        Monthly recurring {model.monthlyRecurring.display} · Annualized {model.annualizedRecurring.display}
      </p>
      {model.commitments.length === 0 ? (
        <p className="mt-2 text-sm italic text-zinc-500">UNKNOWN</p>
      ) : (
        <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
          {model.commitments.map((commitment) => (
            <li key={commitment.commitmentId}>
              {commitment.vendor} · {commitment.category} · next {commitment.nextExpectedCharge ?? "UNKNOWN"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
