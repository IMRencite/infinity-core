"use client";

import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { resolveTreasuryVentureLabel } from "@/lib/infinity/operator-console/resolve-venture-display-name";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { treasuryAttentionLabel, treasuryPresentation } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";

type Props = {
  model: TreasuryHqReadModel;
  inspectArtifact?: HqWorkArtifact | null;
  ventureOptions?: OperatorVentureListItem[];
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
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Mercury · {model.mercury.statusLabel}
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
        <Cell label="Authorized capital" value={model.cards.internalCapital.display} />
        <Cell label="Remaining authorization" value={model.cards.availableCapital.display} />
        <Cell label="Allocated capital" value={model.cards.infinityAllocatedCapital.display} />
        <Cell label="Unallocated capital" value={model.cards.unallocatedCapital.display} />
      </div>
      {presentation === "EXPANDED" ? (
        <div className="relative grid grid-cols-2 gap-px border-t border-zinc-800/60 bg-zinc-800/40 md:grid-cols-4 xl:grid-cols-7">
          <Cell
            label="Verified treasury cash"
            value={model.cards.totalCash.display}
            hint={stale ? "Provider state not current" : model.treasurySource === "CANONICAL FINANCIAL TRUTH" ? "Source: Mercury" : null}
          />
          <Cell
            label="Mercury"
            value={model.mercury.statusLabel}
            hint={`${model.mercury.environment} · last sync ${model.mercury.lastSuccessfulSync ?? "NONE"} · accounts ${model.mercury.accountCount} · ${model.mercury.providerBalance.display}`}
          />
          <Cell label="Reserved capital" value={model.cards.reservedCapital.display} />
          <Cell label="Committed capital" value={model.cards.committedCapital.display} />
          <Cell label="Monthly budget" value={model.cards.monthlyBudget.display} />
          <Cell label="Monthly spend" value={model.cards.monthlySpend.display} />
          <Cell label="Revenue" value={model.cards.revenue.display} />
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
      <div className="hq-reflow-table-wrap mt-3">
        <table className="hq-reflow-table text-left text-xs text-zinc-300">
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
                <td className="py-1.5" data-label="Constraint">{row.label}</td>
                <td data-label="Spent">{row.spent.display}</td>
                <td data-label="Reserved">{row.reserved.display}</td>
                <td data-label="Committed">{row.committed.display}</td>
                <td data-label="Available">{row.available.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TreasuryVentureAllocationsPanel({ model, ventureOptions = [] }: Props) {
  return (
    <section aria-label="Venture Allocations" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Venture Allocations</h2>
      {model.ventures.length === 0 ? (
        <p className="mt-2 text-sm italic text-zinc-500">NOT YET MEASURED</p>
      ) : (
        <div className="hq-reflow-table-wrap mt-3">
          <table className="hq-reflow-table text-left text-xs text-zinc-300">
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
                  <td className="py-1.5" data-label="Venture" title={resolveTreasuryVentureLabel(ventureOptions, row.ventureId)}>
                    {resolveTreasuryVentureLabel(ventureOptions, row.ventureId)}
                  </td>
                  <td data-label="Stage">{row.stage}</td>
                  <td data-label="Allocated">{row.allocated.display}</td>
                  <td data-label="Spent">{row.spent.display}</td>
                  <td data-label="Reserved">{row.reserved.display}</td>
                  <td data-label="Committed">{row.committed.display}</td>
                  <td data-label="Available">{row.available.display}</td>
                  <td data-label="Revenue">{row.revenue.display}</td>
                  <td data-label="Profit">{row.profit.display}</td>
                  <td data-label="ROI">{row.roi.display}</td>
                  <td data-label="Status">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TreasuryTransactionsPanel({ model, ventureOptions = [] }: Props) {
  return (
    <section aria-label="Treasury Transactions" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Transactions</h2>
      {model.transactions.length === 0 ? (
        <p className="mt-2 text-sm italic text-zinc-500">No Mercury transactions retrieved.</p>
      ) : (
        <div className="hq-reflow-table-wrap mt-3">
          <table className="hq-reflow-table text-left text-xs text-zinc-300">
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
                  <td className="py-1.5" data-label="Date">{row.date}</td>
                  <td data-label="Amount">{row.amount.display}</td>
                  <td data-label="Merchant">{row.merchant}</td>
                  <td data-label="Category">{row.category}</td>
                  <td data-label="Venture" title={resolveTreasuryVentureLabel(ventureOptions, row.ventureId)}>
                    {resolveTreasuryVentureLabel(ventureOptions, row.ventureId)}
                  </td>
                  <td data-label="Purpose">{row.purpose}</td>
                  <td data-label="Provider">{row.provider}</td>
                  <td data-label="Financial action">{row.financialActionId}</td>
                  <td data-label="Authorization">{row.authorizationSource}</td>
                  <td data-label="Status">{row.status}</td>
                  <td data-label="Transaction ID">{row.transactionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TreasuryCommitmentsPanel({ model, emptyLabel = "No active commitments." }: Props & { emptyLabel?: string }) {
  return (
    <section aria-label="Treasury Commitments" className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Commitments</h2>
      <p className="mt-2 text-xs text-zinc-400">
        Monthly recurring {model.monthlyRecurring.display} · Annualized {model.annualizedRecurring.display}
      </p>
      {model.commitments.length === 0 ? (
        <p className="mt-2 text-sm italic text-zinc-500">{emptyLabel}</p>
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
