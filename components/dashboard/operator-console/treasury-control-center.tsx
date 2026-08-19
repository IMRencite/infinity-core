"use client";

import { useMemo, useState } from "react";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import {
  formatVentureIdPreview,
  resolveTreasuryVentureLabel,
} from "@/lib/infinity/operator-console/resolve-venture-display-name";
import { filterTreasuryAllocatableVentures } from "@/lib/infinity/operator-console/allocatable-ventures";
import {
  MANUAL_FUNDING_SOURCES,
  TREASURY_BUDGET_CATEGORIES,
  type ManualFundingSource,
} from "@/lib/infinity/treasury/constants";
import { buildTreasuryHqArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";
import { handleCardKeyboardInspect } from "./infinity-room/room-keyboard";

type Props = {
  model: TreasuryHqReadModel;
  ventureOptions: OperatorVentureListItem[];
  onModelChange: (model: TreasuryHqReadModel) => void;
};

type FormStatus = { state: "idle" | "loading" | "success" | "error"; message: string | null };

const SOURCE_LABELS: Record<ManualFundingSource, string> = {
  founder_contribution: "Founder contribution",
  operator_funding: "Operator funding",
  manual_treasury_adjustment: "Manual treasury adjustment",
};

function newKey(): string {
  return crypto.randomUUID();
}

export function TreasuryControlCenter({ model, ventureOptions, onModelChange }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const allocatableVentures = useMemo(
    () => filterTreasuryAllocatableVentures(ventureOptions),
    [ventureOptions],
  );

  const [fundAmount, setFundAmount] = useState("");
  const [fundSource, setFundSource] = useState<ManualFundingSource>("founder_contribution");
  const [fundMemo, setFundMemo] = useState("");
  const [fundStatus, setFundStatus] = useState<FormStatus>({ state: "idle", message: null });

  const [allocVenture, setAllocVenture] = useState(allocatableVentures[0]?.ventureAssemblyId ?? "");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocNote, setAllocNote] = useState("");
  const [allocStatus, setAllocStatus] = useState<FormStatus>({ state: "idle", message: null });

  const [budgetVenture, setBudgetVenture] = useState(allocatableVentures[0]?.ventureAssemblyId ?? "");
  const [budgetScope, setBudgetScope] = useState<"VENTURE" | "MONTHLY" | "CATEGORY">("VENTURE");
  const [budgetCategory, setBudgetCategory] = useState<(typeof TREASURY_BUDGET_CATEGORIES)[number]>("OTHER");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetStatus, setBudgetStatus] = useState<FormStatus>({ state: "idle", message: null });

  const displayNameForVenture = (ventureId: string, index?: number) =>
    resolveTreasuryVentureLabel(allocatableVentures, ventureId, index);
  const lineageForVenture = (ventureId: string) => {
    const row = allocatableVentures.find((venture) => venture.ventureAssemblyId === ventureId);
    return { candidateId: row?.candidateId ?? null, blueprintId: row?.blueprintId ?? null };
  };

  async function mutate(body: Record<string, unknown>, setStatus: (next: FormStatus) => void): Promise<void> {
    setStatus({ state: "loading", message: null });
    try {
      const res = await fetch("/api/operator-console/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { model?: TreasuryHqReadModel; error?: string };
      if (!res.ok || !payload.model) {
        setStatus({ state: "error", message: payload.error ?? "Treasury update failed" });
        return;
      }
      onModelChange(payload.model);
      setStatus({ state: "success", message: "Recorded in internal treasury ledger" });
    } catch {
      setStatus({ state: "error", message: "Treasury update failed" });
    }
  }

  const allocationArtifacts =
    buildTreasuryHqArtifacts(model, { displayNameForVenture, lineageForVenture }).strategy_finance ?? [];

  return (
    <section aria-label="Treasury control center" className="hq-treasury-console space-y-3">
      <div className="hq-treasury-console__grid">
        <div className="space-y-3">
          <article className="hq-treasury-panel" aria-label="Fund Treasury">
            <header className="hq-treasury-panel__header">
              <h3>Fund Treasury</h3>
              <p>INTERNAL / MANUAL / NON-BANK</p>
            </header>
            <p className="hq-treasury-panel__note">
              Records owner-injected internal capital. This does not create a bank transfer and is not revenue.
            </p>
            <form
              className="hq-treasury-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (fundStatus.state === "loading") return;
                void mutate(
                  {
                    action: "fund",
                    amountUsd: Number(fundAmount),
                    source: fundSource,
                    memo: fundMemo,
                    idempotencyKey: newKey(),
                  },
                  setFundStatus,
                );
              }}
            >
              <label>
                Amount (USD)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  required
                />
              </label>
              <label>
                Source
                <select value={fundSource} onChange={(event) => setFundSource(event.target.value as ManualFundingSource)}>
                  {MANUAL_FUNDING_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hq-treasury-form__full">
                Notes / memo
                <input value={fundMemo} onChange={(event) => setFundMemo(event.target.value)} placeholder="Optional lineage note" />
              </label>
              <button type="submit" disabled={fundStatus.state === "loading"}>
                {fundStatus.state === "loading" ? "Recording…" : "Record manual funding"}
              </button>
              <StatusLine status={fundStatus} />
            </form>
          </article>

          <article className="hq-treasury-panel" aria-label="Allocate Capital">
            <header className="hq-treasury-panel__header">
              <h3>Allocate Capital</h3>
              <p>Assigns internal capital · not spend</p>
            </header>
            <form
              className="hq-treasury-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (allocStatus.state === "loading") return;
                void mutate(
                  {
                    action: "allocate",
                    ventureId: allocVenture,
                    amountUsd: Number(allocAmount),
                    note: allocNote,
                    idempotencyKey: newKey(),
                  },
                  setAllocStatus,
                );
              }}
            >
              <label>
                Venture
                {allocatableVentures.length === 0 ? (
                  <p className="hq-treasury-panel__note">No allocatable ventures yet.</p>
                ) : (
                  <VentureSelect
                    value={allocVenture}
                    ventures={allocatableVentures}
                    onChange={setAllocVenture}
                    emptyLabel="No allocatable ventures yet."
                  />
                )}
              </label>
              <label>
                Amount (USD)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={allocAmount}
                  onChange={(event) => setAllocAmount(event.target.value)}
                  required
                />
              </label>
              <label className="hq-treasury-form__full">
                Reason / note
                <input value={allocNote} onChange={(event) => setAllocNote(event.target.value)} placeholder="Optional allocation note" />
              </label>
              <p className="hq-treasury-panel__note hq-treasury-form__full">
                Available capital {model.cards.availableCapital.display}. Over-allocation is blocked.
              </p>
              <button type="submit" disabled={allocStatus.state === "loading" || !allocVenture}>
                {allocStatus.state === "loading" ? "Allocating…" : "Allocate to venture"}
              </button>
              <StatusLine status={allocStatus} />
            </form>
          </article>
        </div>

        <div className="space-y-3">
          <article className="hq-treasury-panel" aria-label="Capital Overview">
            <header className="hq-treasury-panel__header">
              <h3>Capital Overview</h3>
              <p>Canonical treasury position</p>
            </header>
            <dl className="hq-treasury-overview">
              <OverviewItem label="Internal capital" value={model.cards.internalCapital.display} />
              <OverviewItem label="Available capital" value={model.cards.availableCapital.display} />
              <OverviewItem label="Allocated capital" value={model.cards.infinityAllocatedCapital.display} />
              <OverviewItem label="Unallocated capital" value={model.cards.unallocatedCapital.display} />
              <OverviewItem label="Reserved capital" value={model.cards.reservedCapital.display} />
              <OverviewItem label="Committed capital" value={model.cards.committedCapital.display} />
              <OverviewItem label="Monthly budget" value={model.cards.monthlyBudget.display} />
              <OverviewItem label="Monthly spend" value={model.cards.monthlySpend.display} />
              <OverviewItem label="Bank cash" value={model.cards.totalCash.display} />
              <OverviewItem label="Revenue" value={model.cards.revenue.display} />
            </dl>
            <p className="hq-treasury-panel__note">
              Treasury source: {model.treasurySource}. Banking provider: {model.bankingProvider}. Bank cash is not a bank-synced balance.
            </p>
          </article>

          <article className="hq-treasury-panel" aria-label="Budget Controls">
            <header className="hq-treasury-panel__header">
              <h3>Budget Controls</h3>
              <p>Spending limit · not allocation</p>
            </header>
            <form
              className="hq-treasury-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (budgetStatus.state === "loading") return;
                void mutate(
                  {
                    action: "update_budget",
                    ventureId: budgetVenture,
                    amountUsd: Number(budgetAmount),
                    period: budgetScope === "MONTHLY" ? "MONTHLY" : "LIFETIME",
                    category: budgetScope === "CATEGORY" ? budgetCategory : undefined,
                  },
                  setBudgetStatus,
                );
              }}
            >
              <label>
                Venture
                {allocatableVentures.length === 0 ? (
                  <p className="hq-treasury-panel__note">No allocatable ventures yet.</p>
                ) : (
                  <VentureSelect value={budgetVenture} ventures={allocatableVentures} onChange={setBudgetVenture} />
                )}
              </label>
              <label>
                Budget scope
                <select
                  value={budgetScope}
                  onChange={(event) => setBudgetScope(event.target.value as "VENTURE" | "MONTHLY" | "CATEGORY")}
                >
                  <option value="VENTURE">Venture budget limit</option>
                  <option value="MONTHLY">Monthly budget limit</option>
                  <option value="CATEGORY">Category budget limit</option>
                </select>
              </label>
              {budgetScope === "CATEGORY" ? (
                <label className="hq-treasury-form__full">
                  Category
                  <select
                    value={budgetCategory}
                    onChange={(event) => setBudgetCategory(event.target.value as (typeof TREASURY_BUDGET_CATEGORIES)[number])}
                  >
                    {TREASURY_BUDGET_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Budget limit (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  required
                />
              </label>
              <CurrentBudgetHint model={model} ventureId={budgetVenture} scope={budgetScope} category={budgetCategory} />
              <button type="submit" disabled={budgetStatus.state === "loading" || !budgetVenture}>
                {budgetStatus.state === "loading" ? "Updating…" : "Update budget limit"}
              </button>
              <StatusLine status={budgetStatus} />
            </form>
          </article>
        </div>
      </div>

      <article className="hq-treasury-panel" aria-label="Venture Allocations">
        <header className="hq-treasury-panel__header">
          <h3>Venture Allocations</h3>
          <p>Click a venture to inspect treasury detail</p>
        </header>
        {model.ventures.length === 0 ? (
          <p className="hq-treasury-panel__note">No venture allocations recorded.</p>
        ) : (
          <div className="hq-treasury-allocation-grid">
            {model.ventures.map((row) => {
              const artifact =
                allocationArtifacts.find(
                  (item) => item.artifactType === "venture_capital_allocation" && item.sourceRecordId === row.ventureId,
                ) ?? null;
              return (
                <AllocationCard
                  key={row.ventureId}
                  title={displayNameForVenture(row.ventureId)}
                  row={row}
                  artifact={artifact}
                  onInspect={artifact && inspector ? () => inspector.openInspector(artifact) : undefined}
                />
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}

function VentureSelect({
  value,
  ventures,
  onChange,
  emptyLabel,
}: {
  value: string;
  ventures: OperatorVentureListItem[];
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const selectedLabel = resolveTreasuryVentureLabel(ventures, value);
  return (
    <select
      className="hq-treasury-venture-select"
      value={value}
      title={selectedLabel}
      onChange={(event) => onChange(event.target.value)}
      required
    >
      {ventures.length === 0 && emptyLabel ? <option value="">{emptyLabel}</option> : null}
      {ventures.map((venture, index) => {
        const label = resolveTreasuryVentureLabel(ventures, venture.ventureAssemblyId, index);
        return (
          <option key={venture.ventureAssemblyId} value={venture.ventureAssemblyId} title={label}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusLine({ status }: { status: FormStatus }) {
  if (status.state === "idle" && !status.message) return null;
  const tone =
    status.state === "error" ? "text-amber-200" : status.state === "success" ? "text-emerald-200" : "text-zinc-400";
  return (
    <p className={`hq-treasury-form__full text-[11px] uppercase tracking-[0.14em] ${tone}`} role={status.state === "error" ? "alert" : undefined}>
      {status.state === "loading" ? "Working…" : status.message}
    </p>
  );
}

function CurrentBudgetHint({
  model,
  ventureId,
  scope,
  category,
}: {
  model: TreasuryHqReadModel;
  ventureId: string;
  scope: "VENTURE" | "MONTHLY" | "CATEGORY";
  category: string;
}) {
  const match = model.ventureBudgets.find((budget) => {
    if (budget.ventureId !== ventureId) return false;
    if (scope === "CATEGORY") return budget.scopeType === "CATEGORY" && budget.category === category;
    if (scope === "MONTHLY") return budget.scopeType === "MONTHLY" || budget.period === "MONTHLY";
    return budget.scopeType === "VENTURE";
  });
  return (
    <p className="hq-treasury-panel__note hq-treasury-form__full">
      Current budget limit {match?.allocated.display ?? "UNKNOWN"} · available {match?.available.display ?? "UNKNOWN"}
    </p>
  );
}

function AllocationCard({
  title,
  row,
  artifact,
  onInspect,
}: {
  title: string;
  row: TreasuryHqReadModel["ventures"][number];
  artifact: HqWorkArtifact | null;
  onInspect?: () => void;
}) {
  return (
    <div
      role={onInspect ? "button" : undefined}
      tabIndex={onInspect ? 0 : undefined}
      onClick={
        onInspect
          ? (event) => {
              event.stopPropagation();
              onInspect();
            }
          : undefined
      }
      onKeyDown={onInspect ? (event) => handleCardKeyboardInspect(event, onInspect) : undefined}
      className="hq-treasury-allocation-card"
      data-artifact-id={artifact?.id}
    >
      <p className="hq-treasury-allocation-card__name" title={title}>
        {title}
      </p>
      <p className="hq-treasury-allocation-card__meta">
        Origin: {row.origin}
        {formatVentureIdPreview(row.ventureId) ? ` · ID: ${formatVentureIdPreview(row.ventureId)}` : ""}
        {` · Status: ${row.stage !== "UNKNOWN" ? row.stage : row.status}`}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-300">
        <div>
          <dt className="text-zinc-500">Allocated</dt>
          <dd>{row.allocated.display}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Available</dt>
          <dd>{row.available.display}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Reserved</dt>
          <dd>{row.reserved.display}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Committed</dt>
          <dd>{row.committed.display}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Spent</dt>
          <dd>{row.spent.display}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Expected / actual</dt>
          <dd>
            {row.expectedRevenue.display} / {row.actualRevenue.display}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">Updated {row.updatedAt}</p>
    </div>
  );
}
