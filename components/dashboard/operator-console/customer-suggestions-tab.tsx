"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CustomerSuggestionFilter,
  CustomerSuggestionRow,
  CustomerSuggestionsHqView,
} from "@/lib/infinity/product-improvement-loop/suggestions";

const FILTERS: Array<{ id: CustomerSuggestionFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "real", label: "Real" },
  { id: "synthetic", label: "Synthetic/QC" },
  { id: "new", label: "New" },
  { id: "repeated", label: "Repeated" },
  { id: "under_evaluation", label: "Under Evaluation" },
  { id: "building", label: "Building" },
  { id: "deployed", label: "Deployed" },
  { id: "measuring", label: "Measuring" },
  { id: "validated", label: "Validated" },
];

function matchesFilter(row: CustomerSuggestionRow, filter: CustomerSuggestionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "real") return !row.synthetic;
  if (filter === "synthetic") return row.synthetic;
  if (filter === "new") return row.lifecycle_state === "New";
  if (filter === "repeated") return row.lifecycle_state === "Repeated" || row.repeat_count >= 2;
  if (filter === "under_evaluation") return row.lifecycle_state === "Under Evaluation";
  if (filter === "building") return row.lifecycle_state === "Building";
  if (filter === "deployed") return row.lifecycle_state === "Deployed";
  if (filter === "measuring") return row.lifecycle_state === "Measuring";
  if (filter === "validated") return row.lifecycle_state === "Validated";
  return true;
}

function formatWhen(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="hq-suggestion-count">
      <p className="hq-suggestion-count-label">{label}</p>
      <p className="hq-suggestion-count-value">{value}</p>
    </div>
  );
}

export function CustomerSuggestionsTab({ ventureId }: { ventureId: string }) {
  const [view, setView] = useState<CustomerSuggestionsHqView | null>(null);
  const [filter, setFilter] = useState<CustomerSuggestionFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/hq/ventures/${encodeURIComponent(ventureId)}/improvement`);
      const json = await res.json() as { ok?: boolean; suggestions?: CustomerSuggestionsHqView };
      if (!cancelled && json.ok && json.suggestions) {
        setView(json.suggestions);
        setSelectedId((current) => current ?? json.suggestions?.rows[0]?.feedback_id ?? null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ventureId]);

  const rows = useMemo(() => (view?.rows ?? []).filter((row) => matchesFilter(row, filter)), [view, filter]);
  const selected = rows.find((row) => row.feedback_id === selectedId) ?? view?.rows.find((row) => row.feedback_id === selectedId) ?? null;

  return (
    <section
      className="hq-customer-suggestions"
      data-hq-customer-suggestions-surface="true"
      data-hq-region="customer-suggestions"
      aria-label="Customer Suggestions"
    >
      <div className="hq-suggestion-counts" data-hq-suggestion-counts="true">
        <Count label="Real Suggestions" value={view?.counts.real ?? 0} />
        <Count label="Synthetic/QC" value={view?.counts.synthetic ?? 0} />
        <Count label="Repeated Requests" value={view?.counts.repeated ?? 0} />
        <Count label="Open Improvement Opportunities" value={view?.counts.open_opportunities ?? 0} />
        <Count label="Validated Improvements" value={view?.counts.validated ?? 0} />
      </div>
      <div className="hq-suggestion-filters" role="tablist" aria-label="Suggestion filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`hq-suggestion-filter ${filter === item.id ? "hq-suggestion-filter--active" : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!view ? (
        <p className="hq-suggestion-empty" data-hq-suggestion-loading="true">
          Loading customer suggestions…
        </p>
      ) : view.rows.length === 0 ? (
        <p className="hq-suggestion-empty" data-hq-suggestion-empty="true">
          No customer suggestions have been recorded yet.
        </p>
      ) : (
        <div className="hq-suggestion-layout">
          <div className="hq-suggestion-table-wrap infinity-data-grid infinity-holographic-surface infinity-table-shell">
            <table className="hq-suggestion-table">
              <thead>
                <tr>
                  <th scope="col">Submitted</th>
                  <th scope="col">Suggestion</th>
                  <th scope="col">Goal / Context</th>
                  <th scope="col">Email</th>
                  <th scope="col">Classification</th>
                  <th scope="col">Repeat Count</th>
                  <th scope="col">Status</th>
                  <th scope="col">Source</th>
                  <th scope="col">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.feedback_id}
                    data-hq-suggestion-row={row.feedback_id}
                    data-suggestion-type={row.type}
                    className={selected?.feedback_id === row.feedback_id ? "is-selected" : ""}
                    onClick={() => setSelectedId(row.feedback_id)}
                  >
                    <td>{formatWhen(row.submitted_at)}</td>
                    <td>{row.suggestion}</td>
                    <td>{row.goal_or_context ?? "—"}</td>
                    <td>{row.email ?? "—"}</td>
                    <td>{row.classification}</td>
                    <td>{row.repeat_count}</td>
                    <td>{row.lifecycle_state}</td>
                    <td>{row.source}</td>
                    <td>{row.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected ? (
            <aside className="hq-suggestion-detail" data-hq-suggestion-detail={selected.feedback_id}>
              <p className="hq-inspector-section-label">Suggestion detail</p>
              <dl className="hq-suggestion-detail-grid">
                <div><dt>Full suggestion</dt><dd>{selected.suggestion}</dd></div>
                <div><dt>Goal / context</dt><dd>{selected.goal_or_context ?? "NONE"}</dd></div>
                <div><dt>Email / contact</dt><dd>{selected.email ?? "NONE"}</dd></div>
                <div><dt>Submitted</dt><dd>{formatWhen(selected.submitted_at)}</dd></div>
                <div><dt>Source</dt><dd>{selected.source}</dd></div>
                <div><dt>Classification</dt><dd>{selected.classification}</dd></div>
                <div><dt>Labels</dt><dd>{selected.labels.join(", ") || "NONE"}</dd></div>
                <div><dt>Type</dt><dd>{selected.type}</dd></div>
                <div><dt>Customer identity</dt><dd>{selected.customer_ref ?? "NONE"}</dd></div>
                <div><dt>Repeat / cluster</dt><dd>{selected.repeat_count} · {selected.cluster_key ?? "NONE"}</dd></div>
                <div><dt>Lifecycle</dt><dd>{selected.lifecycle_state} · {selected.status}</dd></div>
                <div><dt>ProductImprovementOpportunity</dt><dd>{selected.opportunity_id ?? "NONE"}</dd></div>
                <div><dt>CanonicalVentureImprovement</dt><dd>{selected.improvement_id ?? "NONE"}</dd></div>
                <div><dt>CustomerFeedbackRecord</dt><dd className="font-mono text-xs">{selected.feedback_id}</dd></div>
                <div><dt>VentureImprovementIntakeContract</dt><dd className="font-mono text-xs">{selected.intake_submission_id ?? "NONE"}</dd></div>
                <div>
                  <dt>Evidence lineage</dt>
                  <dd>
                    <ul>
                      {selected.evidence_lineage.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}
