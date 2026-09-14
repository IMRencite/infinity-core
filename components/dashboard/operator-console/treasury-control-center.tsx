"use client";

import { useMemo, useState } from "react";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { formatVentureIdPreview } from "@/lib/infinity/operator-console/resolve-venture-display-name";
import { filterTreasuryAllocatableVentures } from "@/lib/infinity/operator-console/allocatable-ventures";
import { buildTreasuryHqArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import type { CanonicalTreasuryProjection, HqFinancialTruthView, SupportedBudgetCategory } from "@/lib/infinity/financial-truth/types";
import { overlayCanonicalTreasuryOnHqReadModel } from "@/lib/infinity/financial-truth/treasury-overlay";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";
import { handleCardKeyboardInspect } from "./infinity-room/room-keyboard";

type Props = {
  model: TreasuryHqReadModel;
  ventureOptions: OperatorVentureListItem[];
  financialTruth?: HqFinancialTruthView | null;
  onModelChange: (model: TreasuryHqReadModel, financialTruth?: HqFinancialTruthView) => void;
};

type FormStatus = { state: "idle" | "loading" | "success" | "error"; message: string | null };

const PORTFOLIO_FIELDS = [
  { id: "portfolio_capital_ceiling", label: "Portfolio capital ceiling" },
  { id: "monthly_burn_cap", label: "Monthly burn cap" },
  { id: "maximum_single_autonomous_purchase", label: "Maximum single autonomous purchase" },
  { id: "daily_spending_ceiling", label: "Daily spending ceiling" },
  { id: "reserve_requirement", label: "Reserve requirement" },
  { id: "paid_acquisition_budget", label: "Paid acquisition budget" },
] as const;

const VENTURE_FIELDS = [
  { id: "venture_budget_ceiling", label: "Venture budget ceiling" },
  { id: "monthly_spend_limit", label: "Monthly spend limit" },
  { id: "maximum_single_purchase", label: "Maximum single purchase" },
] as const;

const CATEGORY_FIELDS: Array<{ id: SupportedBudgetCategory; label: string }> = [
  { id: "AI_API", label: "AI/API limit" },
  { id: "HOSTING", label: "Hosting limit" },
  { id: "DOMAINS", label: "Domain limit" },
  { id: "CREATIVE_MEDIA", label: "Creative media limit" },
  { id: "SOFTWARE_TOOLS", label: "Tools/software limit" },
  { id: "VENDORS_CONTRACTORS", label: "Vendor/contractor limit" },
  { id: "MARKETING", label: "Marketing limit" },
];

function newKey(): string {
  return crypto.randomUUID();
}

export function TreasuryControlCenter({ model, ventureOptions, financialTruth = null, onModelChange }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const projection = financialTruth?.treasury_control ?? null;
  const displayModel = useMemo(
    () => (projection ? overlayCanonicalTreasuryOnHqReadModel(model, projection) : model),
    [model, projection],
  );
  const ventures = projection?.ventures ?? [];
  const allocatableVentures = useMemo(
    () => filterTreasuryAllocatableVentures(ventureOptions),
    [ventureOptions],
  );
  void allocatableVentures;

  const [fundAmount, setFundAmount] = useState("");
  const [fundMemo, setFundMemo] = useState("");
  const [fundStatus, setFundStatus] = useState<FormStatus>({ state: "idle", message: null });

  const [allocVenture, setAllocVenture] = useState(ventures[0]?.venture_id ?? "");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocNote, setAllocNote] = useState("");
  const [allocReview, setAllocReview] = useState("");
  const [allocStatus, setAllocStatus] = useState<FormStatus>({ state: "idle", message: null });
  const [increaseExisting, setIncreaseExisting] = useState(false);

  const [budgetScope, setBudgetScope] = useState<"PORTFOLIO" | "VENTURE">("PORTFOLIO");
  const [budgetVenture, setBudgetVenture] = useState(ventures[0]?.venture_id ?? "");
  const [budgetField, setBudgetField] = useState<string>("monthly_burn_cap");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetStatus, setBudgetStatus] = useState<FormStatus>({ state: "idle", message: null });

  const selectedVenture = ventures.find((row) => row.venture_id === allocVenture) ?? ventures[0] ?? null;
  const selectedAllocation = projection?.allocations.find((row) => row.venture_id === allocVenture) ?? null;
  const selectedActiveAllocation =
    (selectedAllocation?.allocated_amount ?? 0) + (selectedAllocation?.reserved_amount ?? 0);

  async function mutate(body: Record<string, unknown>, setStatus: (next: FormStatus) => void, success: string): Promise<void> {
    setStatus({ state: "loading", message: null });
    try {
      const res = await fetch("/api/operator-console/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as {
        model?: TreasuryHqReadModel;
        financialTruth?: HqFinancialTruthView;
        error?: string;
        result?: { message?: string; money_moved?: boolean };
      };
      if (!res.ok || !payload.model) {
        setStatus({
          state: "error",
          message:
            payload.error === "Treasury model refused credential fields"
              ? "Treasury response contained a real credential field and was blocked. Policy fields were not the cause."
              : (payload.error ?? "Treasury update failed"),
        });
        return;
      }
      onModelChange(payload.model, payload.financialTruth);
      setStatus({ state: "success", message: payload.result?.message ?? success });
    } catch {
      setStatus({ state: "error", message: "Treasury update failed" });
    }
  }

  const allocationArtifacts =
    buildTreasuryHqArtifacts(displayModel, {
      displayNameForVenture: (ventureId) =>
        ventures.find((row) => row.venture_id === ventureId)?.display_name ?? ventureId,
      lineageForVenture: () => ({ candidateId: null, blueprintId: null }),
    }).strategy_finance ?? [];

  return (
    <section aria-label="Treasury control center" className="hq-treasury-console space-y-3">
      <article className="hq-treasury-panel" aria-label="Live Treasury">
        <header className="hq-treasury-panel__header">
          <h3>Live Treasury</h3>
          <p>Mercury connected · Shared parent financial infrastructure</p>
        </header>
        <div className="hq-treasury-status">
          <StatusChip label="Treasury status" value={projection?.treasury_status ?? "LIVE"} />
          <StatusChip label="Bank provider" value="Mercury" />
          <StatusChip label="Bank connection" value="READ ONLY" />
          <StatusChip label="Last financial sync" value={projection?.last_financial_sync ?? displayModel.freshnessLabel} />
          <StatusChip label="Cash completeness" value={projection?.cash_completeness ?? "COMPLETE"} />
        </div>
      </article>

      <div className="hq-treasury-console__grid">
        <div className="space-y-3">
          <article className="hq-treasury-panel" aria-label="Treasury Funding">
            <header className="hq-treasury-panel__header">
              <h3>Treasury Funding</h3>
              <p>Live bank cash · Mercury read only</p>
            </header>
            <dl className="hq-treasury-overview">
              <SourcedItem label="Live bank cash" amount={projection?.verified_treasury_cash} fallback={displayModel.cards.totalCash.display} />
              <OverviewItem label="Bank" value="Mercury" />
            </dl>
            <p className="hq-treasury-panel__note">
              Recording an external capital event is a MANUAL_ACCOUNTING_EVENT. It does not change Mercury or verified treasury cash.
            </p>
            <form
              className="hq-treasury-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (fundStatus.state === "loading") return;
                void mutate(
                  {
                    action: "record_accounting",
                    amountUsd: Number(fundAmount),
                    source: "founder_contribution",
                    memo: fundMemo,
                    idempotencyKey: newKey(),
                  },
                  setFundStatus,
                  "Recorded MANUAL_ACCOUNTING_EVENT · bank cash unchanged",
                );
              }}
            >
              <label>
                Accounting amount (USD)
                <input type="number" min="0.01" step="0.01" value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} required />
              </label>
              <label className="hq-treasury-form__full">
                Lineage note
                <input value={fundMemo} onChange={(event) => setFundMemo(event.target.value)} placeholder="Optional accounting lineage" />
              </label>
              <button type="submit" disabled={fundStatus.state === "loading"}>
                {fundStatus.state === "loading" ? "Recording…" : "Record external capital event"}
              </button>
              <StatusLine status={fundStatus} />
            </form>
          </article>

          <article className="hq-treasury-panel" aria-label="Allocate Capital">
            <header className="hq-treasury-panel__header">
              <h3>Allocate Capital</h3>
              <p>Founder direct allocation · not spend · not a bank transfer</p>
            </header>
            <dl className="hq-treasury-overview">
              <SourcedItem label="Portfolio authorized" amount={projection?.authorized_capital} fallback="UNKNOWN" />
              <SourcedItem label="Currently allocated" amount={projection?.allocated_capital} fallback="UNKNOWN" />
              <SourcedItem label="Available to allocate" amount={projection?.unallocated_authorized_capital} fallback="UNKNOWN" />
              <OverviewItem label="Selected venture current allocation" value={selectedAllocation ? `$${selectedAllocation.allocated_amount + selectedAllocation.reserved_amount}` : "$0"} />
            </dl>
            <form
              className="hq-treasury-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (allocStatus.state === "loading") return;
                if (selectedActiveAllocation > 0 && !increaseExisting) {
                  setAllocStatus({
                    state: "error",
                    message: "This venture already has an active allocation. Check “Increase existing allocation” only if you intend to add more capital.",
                  });
                  return;
                }
                void mutate(
                  {
                    action: "allocate",
                    ventureId: allocVenture,
                    amountUsd: Number(allocAmount),
                    purpose: allocNote,
                    reviewCondition: allocReview || undefined,
                    source: "FOUNDER_DIRECT_ALLOCATION",
                    idempotencyKey: newKey(),
                    increaseAllocation: selectedActiveAllocation > 0 && increaseExisting,
                  },
                  setAllocStatus,
                  selectedVenture?.reserve_only
                    ? "Reserved allocation recorded · AskReview remains paused"
                    : "Founder direct allocation recorded · not spend",
                );
              }}
            >
              <label>
                Venture
                {ventures.length === 0 ? (
                  <p className="hq-treasury-panel__note">No allocatable ventures yet. Canonical identities remain OccupancyNPV and AskReview.</p>
                ) : (
                  <select className="hq-treasury-venture-select" value={allocVenture} onChange={(event) => setAllocVenture(event.target.value)} required>
                    {ventures.map((venture) => (
                      <option key={venture.venture_id} value={venture.venture_id}>
                        {venture.display_name} · {venture.lifecycle_state}
                        {venture.production_state ? ` / ${venture.production_state}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label>
                Amount (USD)
                <input type="number" min="0.01" step="0.01" value={allocAmount} onChange={(event) => setAllocAmount(event.target.value)} required />
              </label>
              <label className="hq-treasury-form__full">
                Purpose / reason
                <input value={allocNote} onChange={(event) => setAllocNote(event.target.value)} placeholder="Why this allocation exists" />
              </label>
              <label className="hq-treasury-form__full">
                Review condition
                <input value={allocReview} onChange={(event) => setAllocReview(event.target.value)} placeholder="Optional review condition" />
              </label>
              {selectedVenture?.reserve_only ? (
                <p className="hq-treasury-panel__note hq-treasury-form__full">
                  AskReview may receive a reserved allocation only. This will not launch, migrate, buy a domain, activate payments, or move money.
                </p>
              ) : null}
              {selectedActiveAllocation > 0 ? (
                <label className="hq-treasury-form__full">
                  <input
                    type="checkbox"
                    checked={increaseExisting}
                    onChange={(event) => setIncreaseExisting(event.target.checked)}
                  />{" "}
                  Increase existing ${selectedActiveAllocation} allocation. Unchecked retries will not add capital.
                </label>
              ) : null}
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
              <p>Cash · authority · allocation · spend are different</p>
            </header>
            <dl className="hq-treasury-overview">
              <SourcedItem label="Verified treasury cash" amount={projection?.verified_treasury_cash} fallback={displayModel.cards.totalCash.display} />
              <SourcedItem label="Mercury available" amount={projection?.mercury_available} fallback={displayModel.cards.totalCash.display} />
              <SourcedItem label="Authorized capital" amount={projection?.authorized_capital} fallback={displayModel.cards.internalCapital.display} />
              <SourcedItem label="Allocated capital" amount={projection?.allocated_capital} fallback={displayModel.cards.infinityAllocatedCapital.display} />
              <SourcedItem label="Committed capital" amount={projection?.committed_capital} fallback={displayModel.cards.committedCapital.display} />
              <SourcedItem label="Actual spend" amount={projection?.actual_spend} fallback={displayModel.cards.monthlySpend.display} />
              <SourcedItem label="Remaining authorization" amount={projection?.remaining_authorization} fallback={displayModel.cards.availableCapital.display} />
              <SourcedItem label="Unallocated authorized capital" amount={projection?.unallocated_authorized_capital} fallback={displayModel.cards.unallocatedCapital.display} />
              <SourcedItem label="Monthly burn cap" amount={projection?.monthly_burn_cap} fallback="NOT_SET" />
              <SourcedItem label="Stripe available" amount={projection?.stripe_available} fallback="$0" />
              <SourcedItem label="Stripe pending" amount={projection?.stripe_pending} fallback="$0" />
              <SourcedItem label="Paid acquisition budget" amount={projection?.paid_acquisition_budget} fallback="$0" />
            </dl>
          </article>

          <article className="hq-treasury-panel" aria-label="Budget Controls">
            <header className="hq-treasury-panel__header">
              <h3>Budget Controls</h3>
              <p>Policy only · not allocation · not spend · not bank cash</p>
            </header>
            <form
              className="hq-treasury-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (budgetStatus.state === "loading") return;
                const category = CATEGORY_FIELDS.some((row) => row.id === budgetField);
                void mutate(
                  {
                    action: "update_budget",
                    scope: budgetScope,
                    ventureId: budgetScope === "VENTURE" ? budgetVenture : undefined,
                    field: category ? undefined : budgetField,
                    category: category ? budgetField : undefined,
                    amountUsd: Number(budgetAmount),
                    idempotencyKey: newKey(),
                  },
                  setBudgetStatus,
                  "Canonical budget policy updated",
                );
              }}
            >
              <label>
                Scope
                <select
                  value={budgetScope}
                  onChange={(event) => {
                    const next = event.target.value as "PORTFOLIO" | "VENTURE";
                    setBudgetScope(next);
                    setBudgetField(next === "PORTFOLIO" ? "monthly_burn_cap" : "venture_budget_ceiling");
                  }}
                >
                  <option value="PORTFOLIO">Portfolio</option>
                  <option value="VENTURE">Venture</option>
                </select>
              </label>
              {budgetScope === "VENTURE" ? (
                <label>
                  Venture
                  <select className="hq-treasury-venture-select" value={budgetVenture} onChange={(event) => setBudgetVenture(event.target.value)} required>
                    {ventures.map((venture) => (
                      <option key={venture.venture_id} value={venture.venture_id}>
                        {venture.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <OverviewItem label="Active ceiling" value={projection ? `$${projection.portfolio_budget.portfolio_capital_ceiling}` : "$50"} />
              )}
              <label className="hq-treasury-form__full">
                Policy field
                <select value={budgetField} onChange={(event) => setBudgetField(event.target.value)}>
                  {(budgetScope === "PORTFOLIO" ? PORTFOLIO_FIELDS : VENTURE_FIELDS).map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                  {CATEGORY_FIELDS.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Budget limit (USD)
                <input type="number" min="0" step="0.01" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} required />
              </label>
              <p className="hq-treasury-panel__note hq-treasury-form__full">
                Current monthly burn cap {projection?.monthly_burn_cap.display ?? "NOT_SET"} · paid acquisition{" "}
                {projection?.paid_acquisition_budget.display ?? "$0"} · stale $500 monthly policy is not active
              </p>
              <button type="submit" disabled={budgetStatus.state === "loading"}>
                {budgetStatus.state === "loading" ? "Updating…" : "Update budget limit"}
              </button>
              <StatusLine status={budgetStatus} />
            </form>
          </article>
        </div>
      </div>

      <article className="hq-treasury-panel" aria-label="Governed allocation decision">
        <header className="hq-treasury-panel__header">
          <h3>Governed allocation decision</h3>
          <p>Autonomous · not spend · Mercury read only</p>
        </header>
        {projection?.latest_allocation_decision ? (
          <div className="space-y-3">
            <dl className="hq-treasury-overview">
              <OverviewItem label="Decision" value={projection.latest_allocation_decision.decision_id} />
              <OverviewItem label="Allocated" value={`$${projection.latest_allocation_decision.allocated_capital}`} />
              <OverviewItem label="Unallocated reserve" value={`$${projection.latest_allocation_decision.unallocated_authorized_capital}`} />
              <OverviewItem label="Committed" value={`$${projection.latest_allocation_decision.committed_capital}`} />
              <OverviewItem label="Actual spend" value={`$${projection.latest_allocation_decision.actual_spend}`} />
              <OverviewItem label="Paid acquisition" value={`$${projection.latest_allocation_decision.paid_acquisition_budget}`} />
            </dl>
            <p className="hq-treasury-panel__note">{projection.latest_allocation_decision.reserve_reason}</p>
            <div className="hq-treasury-allocation-grid">
              {projection.latest_allocation_decision.ventures.map((row) => (
                <div key={row.venture_id} className="hq-treasury-allocation-card">
                  <p className="hq-treasury-allocation-card__name">{row.display_name}</p>
                  <p className="hq-treasury-allocation-card__meta">
                    {row.lifecycle_state}
                    {row.production_state ? ` · ${row.production_state}` : ""}
                    {` · ${row.decision} · $${row.amount}`}
                  </p>
                  <p className="mt-2 text-[11px] text-zinc-300">{row.reason}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Purpose {row.purpose ?? "NONE"} · Evidence {row.expected_evidence ?? "NONE"} · Review{" "}
                    {row.review_condition ?? "NONE"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="hq-treasury-panel__note">No governed allocation decision has been persisted yet.</p>
        )}
      </article>

      <article className="hq-treasury-panel" aria-label="Venture Allocations">
        <header className="hq-treasury-panel__header">
          <h3>Venture Allocations</h3>
          <p>Click a venture to inspect treasury detail</p>
        </header>
        <div className="hq-treasury-allocation-grid">
          {(projection?.allocations ?? []).map((row) => {
            const artifact =
              allocationArtifacts.find(
                (item) => item.artifactType === "venture_capital_allocation" && item.sourceRecordId === row.venture_id,
              ) ?? null;
            return (
              <AllocationCard
                key={row.venture_id}
                title={row.display_name}
                row={row}
                artifact={artifact}
                onInspect={artifact && inspector ? () => inspector.openInspector(artifact) : undefined}
              />
            );
          })}
        </div>
      </article>

      <article className="hq-treasury-panel" aria-label="Future bank execution">
        <header className="hq-treasury-panel__header">
          <h3>Governed money movement</h3>
          <p>Prepared · not enabled</p>
        </header>
        <button type="button" disabled data-kind="future">
          Execute approved payment
        </button>
        <p className="hq-treasury-panel__note">
          Future path: spend request → EAG → treasury policy → allocation → category → recipient → risk → idempotency →
          MercuryTreasuryMutationAdapter → bank execution → reconciliation. Mercury remains read only.
        </p>
      </article>
    </section>
  );
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="hq-treasury-status__chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function SourcedItem({
  label,
  amount,
  fallback,
}: {
  label: string;
  amount?: CanonicalTreasuryProjection["verified_treasury_cash"] | null;
  fallback: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {amount?.display ?? fallback}
        {amount ? (
          <small>
            Source: {amount.source}
            {amount.sync ? ` · Sync: ${amount.sync}` : ""}
          </small>
        ) : null}
      </dd>
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

function AllocationCard({
  title,
  row,
  artifact,
  onInspect,
}: {
  title: string;
  row: NonNullable<CanonicalTreasuryProjection["allocations"]>[number];
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
        {row.lifecycle_state}
        {formatVentureIdPreview(row.venture_id) ? ` · ID: ${formatVentureIdPreview(row.venture_id)}` : ""}
        {` · ${row.allocation_source ?? "UNALLOCATED"} · ${row.status}`}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-300">
        <div>
          <dt className="text-zinc-500">Allocated</dt>
          <dd>${row.allocated_amount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Reserved</dt>
          <dd>${row.reserved_amount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Committed</dt>
          <dd>${row.committed_amount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Spent</dt>
          <dd>${row.spent_amount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Remaining</dt>
          <dd>${row.remaining}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Purpose</dt>
          <dd>{row.purpose ?? "NONE"}</dd>
        </div>
      </dl>
      {row.review_condition ? <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">{row.review_condition}</p> : null}
    </div>
  );
}
