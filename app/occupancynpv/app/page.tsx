"use client";

import { useCallback, useEffect, useState } from "react";
import { OccupancynpvImprovementChrome } from "./occupancynpv-improvement-chrome";

type Entitlement = { offer: string; status: string; quantityRemaining: number | null; expiresAt: string | null };
type Workspace = {
  id: string;
  name: string;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  scenarioCount?: number;
  analysisStatus?: string;
};
type Me = {
  ok: boolean;
  customer?: { email: string; customer_id: string };
  entitlements?: Entitlement[];
  workspaceCounts?: { total: number; active: number; archived: number };
};
type CollectionPage = {
  ok?: boolean;
  items?: Workspace[];
  total?: number;
  page?: number;
  pageSize?: number;
};

function accessLabel(row: Entitlement): { title: string; detail: string } {
  const status = row.status === "ACTIVE" ? "Active" : row.status === "CONSUMED" ? "Consumed" : row.status === "PAST_DUE" ? "Past due" : row.status;
  if (row.offer === "INTERNAL_QA") return { title: "Internal QA Access", detail: status };
  if (row.offer === "PROFESSIONAL") {
    if (row.expiresAt) {
      const expired = new Date(row.expiresAt).getTime() <= Date.now();
      return {
        title: expired ? "Trial ended" : "3-day free trial",
        detail: expired
          ? "Choose Professional $290/year or Per-Deal $149"
          : `Ends ${new Date(row.expiresAt).toLocaleString()} · one workspace`,
      };
    }
    return { title: "Professional Access", detail: status };
  }
  if (row.offer === "PER_DEAL") {
    const remaining = row.quantityRemaining;
    const detail = row.status === "CONSUMED"
      ? "Consumed"
      : remaining == null
        ? status
        : remaining === 1
          ? "1 workspace remaining"
          : `${remaining} workspaces remaining`;
    return { title: "Per-Deal Access", detail };
  }
  return { title: "Access", detail: status };
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OccupancynpvDashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("Lease comparison");
  const [tab, setTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<CollectionPage | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const loadCollection = useCallback(async (status: "ACTIVE" | "ARCHIVED", nextPage: number, q: string) => {
    const params = new URLSearchParams({ status, page: String(nextPage), pageSize: "10", q });
    const res = await fetch(`/api/occupancynpv/workspaces?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = "/occupancynpv/app/login";
      return;
    }
    setCollection(await res.json() as CollectionPage);
  }, []);

  useEffect(() => {
    void fetch("/api/occupancynpv/me").then(async (res) => {
      if (res.status === 401) {
        window.location.href = "/occupancynpv/app/login";
        return;
      }
      setMe(await res.json() as Me);
    });
  }, []);

  useEffect(() => {
    void loadCollection(tab, page, query);
  }, [loadCollection, page, query, tab]);

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/occupancynpv/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json() as { ok?: boolean; workspace?: { workspace_id: string } };
    if (json.ok && json.workspace) window.location.href = `/occupancynpv/app/workspaces/${json.workspace.workspace_id}`;
  }

  async function patchWorkspace(id: string, body: { name?: string; status?: "ACTIVE" | "ARCHIVED" }) {
    await fetch(`/api/occupancynpv/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMenuId(null);
    setRenameId(null);
    await loadCollection(tab, page, query);
    const refreshed = await fetch("/api/occupancynpv/me");
    if (refreshed.ok) setMe(await refreshed.json() as Me);
  }

  if (!me) return <main className="onpv-page onpv-page--dash onpv-dash">Loading…</main>;

  const entitlements = me.entitlements ?? [];
  const workspaces = collection?.items ?? [];
  const total = collection?.total ?? 0;
  const pageSize = collection?.pageSize ?? 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const counts = me.workspaceCounts ?? { total: 0, active: 0, archived: 0 };
  const emptyActive = tab === "ACTIVE" && total === 0 && !query;
  const entitled = entitlements.length > 0;

  return (
    <main className="onpv-page onpv-page--dash onpv-dash" data-product-dashboard="occupancynpv" data-dashboard-state={counts.total === 0 ? "empty" : "populated"}>
      <header className="onpv-dash-header" data-product-context="true">
        <p className="onpv-kicker">OccupancyNPV</p>
        <h1>Lease Comparison Workspace</h1>
        <p className="onpv-lede">Compare lease options using cash flow, NPV, occupancy costs, and sensitivity analysis. Create a DealWorkspace, enter lease scenarios, then compare results. OccupancyNPV is not a CRM. Rename or archive saved work from this list. Next: open a workspace or start a new comparison.</p>
      </header>

      <section className="onpv-card onpv-access" data-access-summary="true">
        <div>
          <h2>Account</h2>
          <p className="onpv-muted">{me.customer?.email}</p>
        </div>
        <div>
          <h2>Access</h2>
          {entitled ? (
            <ul className="onpv-access-list">
              {entitlements.map((row) => {
                const copy = accessLabel(row);
                return (
                  <li key={`${row.offer}-${row.status}`}>
                    <strong>{copy.title}</strong>
                    <span>{copy.detail}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="onpv-access-empty">
              <p>No paid access is on this account yet.</p>
              <div className="onpv-access-actions">
                <form action="/api/checkout/start" method="post">
                  <input type="hidden" name="offer" value="PROFESSIONAL" />
                  <button className="onpv-btn-primary" type="submit">Professional checkout — $290/year</button>
                </form>
                <form action="/api/checkout/start" method="post">
                  <input type="hidden" name="offer" value="PER_DEAL" />
                  <button className="onpv-btn-secondary" type="submit">Per-Deal checkout — $149</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="onpv-card onpv-primary-panel">
        <div>
          <h2>Next step</h2>
          <p className="onpv-muted">{counts.active === 0 ? "Create a deal workspace to start a lease comparison." : `${counts.active} active workspace${counts.active === 1 ? "" : "s"} on this account.`}</p>
        </div>
        <form className="onpv-create" onSubmit={createWorkspace} data-primary-action="create-workspace">
          <label className="onpv-muted" htmlFor="onpv-workspace-name">Workspace name</label>
          <div className="onpv-row">
            <input id="onpv-workspace-name" value={name} onChange={(event) => setName(event.target.value)} />
            <button className="onpv-btn-primary" type="submit">Create New Deal Workspace</button>
          </div>
        </form>
      </section>

      <section
        className="onpv-workspaces"
        data-workspace-list="true"
        data-collection="workspaces"
        data-collection-bounded="true"
        data-collection-page-size="10"
        data-collection-tab={tab.toLowerCase()}
      >
        <div className="onpv-section-head">
          <h2>Workspaces</h2>
          <p className="onpv-muted">{total} {tab === "ACTIVE" ? "active" : "archived"}</p>
        </div>
        <div className="onpv-collection-toolbar">
          <div className="onpv-tabs" role="tablist" aria-label="Workspace status">
            <button className={tab === "ACTIVE" ? "onpv-tab onpv-tab--active" : "onpv-tab"} type="button" role="tab" aria-selected={tab === "ACTIVE"} onClick={() => { setTab("ACTIVE"); setPage(1); }}>Active</button>
            <button className={tab === "ARCHIVED" ? "onpv-tab onpv-tab--active" : "onpv-tab"} type="button" role="tab" aria-selected={tab === "ARCHIVED"} onClick={() => { setTab("ARCHIVED"); setPage(1); }}>Archived</button>
          </div>
          <label className="onpv-search">
            <span className="onpv-sr-only">Search workspaces</span>
            <input
              type="search"
              placeholder="Search by name"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            />
          </label>
        </div>

        {emptyActive ? (
          <section className="onpv-card onpv-empty" data-empty-state="true">
            <h2>Getting started</h2>
            <p>OccupancyNPV compares competing leases in one workspace. Create a workspace, enter two scenarios, and review NPV and sensitivity.</p>
            <ol>
              <li>Create a workspace</li>
              <li>Add lease scenarios</li>
              <li>Enter economic terms</li>
              <li>Review NPV and sensitivity results</li>
            </ol>
          </section>
        ) : workspaces.length === 0 ? (
          <section className="onpv-card onpv-empty" data-empty-state="true" data-empty-archived="true">
            <h2>{tab === "ARCHIVED" ? "No archived workspaces" : "No matching workspaces"}</h2>
            <p>{tab === "ARCHIVED" ? "Archive a workspace to move it here. Restore returns it to Active without using another purchase." : "Try another name or clear the search."}</p>
          </section>
        ) : (
          <ul className="onpv-workspace-grid">
            {workspaces.map((row) => (
              <li key={row.id} className="onpv-card onpv-workspace-card" data-workspace-card="true">
                <div>
                  {renameId === row.id ? (
                    <form
                      className="onpv-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void patchWorkspace(row.id, { name: renameValue });
                      }}
                    >
                      <label>
                        Workspace name
                        <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                      </label>
                      <div className="onpv-inline-actions">
                        <button className="onpv-btn-primary" type="submit">Save name</button>
                        <button className="onpv-btn-tertiary" type="button" onClick={() => setRenameId(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3>{row.name}</h3>
                      <p className="onpv-muted">
                        {row.scenarioCount != null ? `${row.scenarioCount} scenario${row.scenarioCount === 1 ? "" : "s"}` : "Deal workspace"}
                        {row.analysisStatus ? ` · ${row.analysisStatus}` : ""}
                        {formatDate(row.updatedAt ?? row.createdAt) ? ` · Updated ${formatDate(row.updatedAt ?? row.createdAt)}` : ""}
                      </p>
                    </>
                  )}
                </div>
                <div className="onpv-card-actions">
                  <a className="onpv-btn-secondary" href={`/occupancynpv/app/workspaces/${row.id}`}>Continue workspace</a>
                  <div className="onpv-menu">
                    <button className="onpv-btn-tertiary" type="button" aria-expanded={menuId === row.id} aria-haspopup="menu" onClick={() => setMenuId(menuId === row.id ? null : row.id)}>Manage</button>
                    {menuId === row.id ? (
                      <div className="onpv-menu-panel" role="menu">
                        <button className="onpv-link" type="button" role="menuitem" onClick={() => { setRenameId(row.id); setRenameValue(row.name); setMenuId(null); }}>Rename</button>
                        {tab === "ACTIVE" ? (
                          <button className="onpv-link" type="button" role="menuitem" onClick={() => void patchWorkspace(row.id, { status: "ARCHIVED" })}>Archive</button>
                        ) : (
                          <button className="onpv-link" type="button" role="menuitem" onClick={() => void patchWorkspace(row.id, { status: "ACTIVE" })}>Restore</button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > pageSize ? (
          <nav className="onpv-pagination" aria-label="Workspace pages" data-pagination="true">
            <p className="onpv-muted">Page {page} of {pageCount}</p>
            <div className="onpv-inline-actions">
              <button className="onpv-btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <button className="onpv-btn-secondary" type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </nav>
        ) : null}
      </section>

      <section className="onpv-card onpv-capabilities">
        <h2>What you can do</h2>
        <ul>
          <li>Compare lease scenarios</li>
          <li>Model rent steps and free rent</li>
          <li>Include occupancy costs</li>
          <li>Calculate NPV</li>
          <li>Run sensitivity analysis</li>
        </ul>
      </section>

      <section className="onpv-card onpv-help" id="onpv-help" data-support="true">
        <h2>Help and support</h2>
        <p>Need help with a workspace or access? Email <a href="mailto:infinitemediaresources@gmail.com">infinitemediaresources@gmail.com</a>.</p>
        <p className="onpv-muted"><OccupancynpvImprovementChrome /></p>
      </section>

      <form
        className="onpv-signout"
        action="/api/occupancynpv/auth/signout"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault();
          await fetch("/api/occupancynpv/auth/signout", { method: "POST" });
          window.location.href = "/occupancynpv/app/login";
        }}
      >
        <button className="onpv-link onpv-btn-tertiary" type="submit">Sign out</button>
      </form>
    </main>
  );
}
