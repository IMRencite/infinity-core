import Link from "next/link";
import type {
  CanonicalOpportunityRecord,
  OpportunityAttentionSignal,
  OpportunityDiscoveryRunProjection,
  OpportunityHqCounts,
  OpportunityRankingSnapshot,
  OpportunityShortlist,
  OpportunityShortlistDiff,
} from "@/lib/infinity/opportunity-universe-hq";

function score(value: number | "UNKNOWN"): string {
  return value === "UNKNOWN" ? "UNKNOWN" : value.toFixed(2);
}

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function OpportunityCenter({
  counts,
  attention,
  top,
  page,
  currentShortlist,
  previousShortlist,
  diff,
  snapshots,
  runs,
  q,
  lifecycle,
  decision,
  category,
  sort,
  top10,
  selected,
  validating,
  view,
}: {
  counts: OpportunityHqCounts;
  attention: OpportunityAttentionSignal;
  top: CanonicalOpportunityRecord[];
  page: { items: CanonicalOpportunityRecord[]; total: number; page: number; pageSize: number; pageCount: number };
  currentShortlist: OpportunityShortlist | null;
  previousShortlist: OpportunityShortlist | null;
  diff: OpportunityShortlistDiff | null;
  snapshots: OpportunityRankingSnapshot[];
  runs: OpportunityDiscoveryRunProjection[];
  q: string;
  lifecycle: string;
  decision: string;
  category: string;
  sort: string;
  top10: boolean;
  selected: boolean;
  validating: boolean;
  view: string;
}) {
  const allQuery = {
    view: "all",
    q,
    lifecycle,
    decision,
    category,
    sort,
    top10: top10 ? "1" : undefined,
    selected: selected ? "1" : undefined,
    validating: validating ? "1" : undefined,
  };

  return (
    <div data-opportunity-center="true" data-live-ranking="true" className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">HQ → Opportunities</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-white">Opportunity universe</h1>
        <p className="mt-2 max-w-3xl text-[14px] text-zinc-400">
          Live Top 10 is a projection of current canonical evidence. Historical shortlists are immutable snapshots and do not freeze ranking.
          Discovery-run output is not the current universe.
        </p>
      </header>

      {attention.kind !== "NONE" ? (
        <aside data-opportunity-attention="true" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100">
          {attention.message}
        </aside>
      ) : null}

      <section aria-label="Opportunity counts" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Total canonical", counts.total],
          ["Current Top 10", counts.currentTop10],
          ["Validating", counts.validating],
          ["Selected", counts.selected],
          ["Deferred", counts.deferred],
          ["Rejected", counts.rejected],
          ["New since last discovery", counts.newSinceLastDiscovery],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </section>

      <nav className="flex flex-wrap gap-3 text-[13px]">
        {[
          ["overview", "Overview"],
          ["top", "Live Top 10"],
          ["all", "All Opportunities"],
          ["shortlists", "Historical snapshots"],
          ["runs", "Discovery Runs"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={`/dashboard/opportunities?view=${id}`}
            className={`rounded-full border px-3 py-1 ${view === id ? "border-white/30 text-white" : "border-white/10 text-zinc-500"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {(view === "overview" || view === "top") && (
        <section data-top-opportunities="true" data-live-top-10="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Current Top 10 opportunities</h2>
          <p className="mt-1 text-[12px] text-zinc-600">
            Live ranking from current eligible canonical records. {counts.total} canonical opportunities exist in All Opportunities.
            Selected ventures stay visible with badges and do not freeze weaker ideas in the list.
          </p>
          <OpportunityTable records={top} dense />
        </section>
      )}

      {(view === "overview" || view === "all") && (
        <section data-all-opportunities="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">All Opportunities</h2>
          <form className="mt-3 flex flex-wrap gap-2" method="get">
            <input type="hidden" name="view" value="all" />
            <input name="q" defaultValue={q} placeholder="Search name, problem, customer" className="min-w-[16rem] rounded border border-white/10 bg-black px-3 py-2 text-[13px] text-white" />
            <select name="lifecycle" defaultValue={lifecycle} className="rounded border border-white/10 bg-black px-3 py-2 text-[13px] text-white">
              {["ALL", "DISCOVERED", "SCORED", "SHORTLISTED", "VALIDATING", "SELECTED", "DEFERRED", "REJECTED", "ARCHIVED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select name="decision" defaultValue={decision} className="rounded border border-white/10 bg-black px-3 py-2 text-[13px] text-white">
              {["ALL", "BUILD", "VALIDATE", "HOLD", "REJECT"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <input name="category" defaultValue={category} placeholder="Category" className="w-40 rounded border border-white/10 bg-black px-3 py-2 text-[13px] text-white" />
            <select name="sort" defaultValue={sort} className="rounded border border-white/10 bg-black px-3 py-2 text-[13px] text-white">
              <option value="rank">Live rank</option>
              <option value="opportunityScore">Opportunity score</option>
              <option value="monetizationScore">Monetization score</option>
              <option value="updated">Latest updated</option>
            </select>
            <label className="flex items-center gap-1 text-[12px] text-zinc-400">
              <input type="checkbox" name="top10" value="1" defaultChecked={top10} /> Top 10
            </label>
            <label className="flex items-center gap-1 text-[12px] text-zinc-400">
              <input type="checkbox" name="selected" value="1" defaultChecked={selected} /> Selected
            </label>
            <label className="flex items-center gap-1 text-[12px] text-zinc-400">
              <input type="checkbox" name="validating" value="1" defaultChecked={validating} /> Validating
            </label>
            <button className="rounded border border-white/15 px-3 py-2 text-[13px] text-zinc-200" type="submit">Filter</button>
          </form>
          <p className="mt-3 text-[12px] text-zinc-500">{page.total} matching · page {page.page} of {page.pageCount} · page size {page.pageSize} · default sort live rank</p>
          <OpportunityTable records={page.items} />
          {page.pageCount > 1 ? (
            <nav data-pagination="true" className="mt-4 flex gap-2 text-[13px]">
              {page.page > 1 ? <Link href={`/dashboard/opportunities${qs({ ...allQuery, page: String(page.page - 1) })}`}>Previous</Link> : null}
              {page.page < page.pageCount ? <Link href={`/dashboard/opportunities${qs({ ...allQuery, page: String(page.page + 1) })}`}>Next</Link> : null}
            </nav>
          ) : null}
        </section>
      )}

      {(view === "overview" || view === "shortlists") && (
        <section data-shortlist-history="true" data-historical-snapshots="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Historical shortlists / ranking snapshots</h2>
          <p className="mt-1 text-[12px] text-zinc-600">
            Immutable point-in-time views for traceability. They are not the current live ranking source.
          </p>
          {currentShortlist ? (
            <div className="mt-3">
              <p className="text-[13px] text-zinc-300">Latest historical shortlist: {currentShortlist.shortlistId} v{currentShortlist.version}</p>
              <p className="text-[12px] text-zinc-500">{currentShortlist.selectionCriteria}</p>
              <p className="mt-1 text-[12px] text-zinc-500">Candidates: {currentShortlist.members.map((row) => `#${row.rank} ${row.name}`).join(" · ")}</p>
            </div>
          ) : <p className="mt-3 text-[13px] text-zinc-500">No historical shortlist.</p>}
          {previousShortlist ? (
            <div className="mt-4">
              <p className="text-[13px] text-zinc-300">Original / prior snapshot: {previousShortlist.shortlistId} v{previousShortlist.version}</p>
              <p className="text-[12px] text-zinc-500">{previousShortlist.selectionCriteria}</p>
              <p className="mt-1 text-[12px] text-zinc-500">Candidates: {previousShortlist.members.map((row) => `#${row.rank} ${row.name}`).join(" · ")}</p>
            </div>
          ) : null}
          {diff ? (
            <div className="mt-4 text-[12px] text-zinc-400">
              <p>Added between snapshots: {diff.added.length ? diff.added.join(", ") : "none"}</p>
              <p>Removed between snapshots: {diff.removed.length ? diff.removed.join(", ") : "none"}</p>
              <p>Rank changes: {diff.rankChanges.length}</p>
            </div>
          ) : null}
          <div className="mt-4">
            <p className="text-[13px] text-zinc-300">Live ranking snapshots: {snapshots.length}</p>
            <ul className="mt-2 space-y-1 text-[12px] text-zinc-500">
              {snapshots.slice(-8).reverse().map((snapshot) => (
                <li key={snapshot.snapshotId}>
                  {snapshot.snapshotId} · {snapshot.timestamp} · {snapshot.source} · eligible {snapshot.eligibleCount} · top {snapshot.members.filter((row) => row.rank <= 10).map((row) => row.name).slice(0, 3).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(view === "overview" || view === "runs") && (
        <section data-discovery-runs="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Discovery runs</h2>
          <p className="mt-1 text-[12px] text-zinc-600">Run output is not the current opportunity universe.</p>
          <ul className="mt-3 space-y-2 text-[13px] text-zinc-300">
            {runs.map((run) => (
              <li key={run.runId}>
                <span className="text-zinc-100">{run.runId}</span>
                {" · "}{run.timestamp}{" · "}{run.candidateCount} persisted{" · cap/output, not live ranking · "}{run.scannerVersion}{" · "}{run.result}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OpportunityTable({ records, dense = false }: { records: CanonicalOpportunityRecord[]; dense?: boolean }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className={`w-full text-left text-[13px] ${dense ? "min-w-[64rem]" : "min-w-[78rem]"}`}>
        <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="py-2">Rank</th>
            <th>Opportunity</th>
            <th>Opp score</th>
            <th>Monetization</th>
            <th>Confidence</th>
            <th>Status</th>
            <th>Decision</th>
            <th>Validation</th>
            <th>Evidence</th>
            <th>Updated</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {records.map((row) => (
            <tr key={row.candidateId} data-opportunity-row="true" data-live-rank={row.liveRank ?? "ineligible"} className="border-t border-white/[0.04] text-zinc-300">
              <td className="py-2 tabular-nums">{row.liveRank != null ? `#${row.liveRank}` : "INELIGIBLE"}</td>
              <td className="max-w-[18rem]">
                <Link className="text-zinc-100 underline-offset-2 hover:underline" href={row.detailRoute} title={row.name}>
                  {row.name}
                </Link>
                <p className="truncate text-[11px] text-zinc-600" title={row.candidateId}>{row.candidateId}</p>
              </td>
              <td>{score(row.opportunityScore)}</td>
              <td>
                {score(row.monetizationScore)}
                <p className="text-[11px] text-zinc-600">{row.businessModel} · {row.hypothesizedPrice}</p>
              </td>
              <td>{row.confidence}</td>
              <td>{row.lifecycle}</td>
              <td>{row.currentDecision}</td>
              <td>{row.validationState}</td>
              <td>
                {row.evidenceCount === "UNKNOWN" ? "UNKNOWN" : `${row.evidenceCount} evidence`}
                <p className="text-[11px] text-zinc-600">{row.evidenceFreshness === "UNKNOWN" ? "freshness UNKNOWN" : row.evidenceFreshness}</p>
              </td>
              <td className="whitespace-nowrap text-[12px]">{row.updatedAt ?? row.createdAt ?? "UNKNOWN"}</td>
              <td className="text-[11px]">
                {row.inLiveTop10 ? "TOP 10" : ""}
                {row.selectedVenture ? " · VENTURE" : ""}
                {row.movement ? ` · ${row.movement.label}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
