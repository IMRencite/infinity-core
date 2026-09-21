"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Location = { locationId: string; name: string; updatedAt: string; status: "ACTIVE" | "ARCHIVED" };

export default function AskReviewAppPage() {
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [items, setItems] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qa, setQa] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function load(nextStatus = status, nextQ = q, nextPage = page) {
    const res = await fetch(`/api/askreview/locations?status=${nextStatus}&q=${encodeURIComponent(nextQ)}&page=${nextPage}`);
    if (res.status === 401) {
      window.location.href = "/askreview/app/login";
      return;
    }
    const json = await res.json() as { items?: Location[]; total?: number; page?: number; pageSize?: number; qaAccess?: boolean };
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    setPage(json.page ?? 1);
    setPageSize(json.pageSize ?? 10);
    setQa(Boolean(json.qaAccess));
  }

  useEffect(() => { void load(); }, []);

  async function createLocation(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/askreview/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, placeId, mapsUrl }),
    });
    const json = await res.json() as { ok?: boolean; reason?: string };
    if (!json.ok) {
      setError(json.reason === "UNSUPPORTED_MAPS_URL"
        ? "That Maps link cannot be resolved. Paste a Place ID or a Maps URL that includes placeid."
        : "Enter a valid Google Place ID or a Maps URL that contains one. A business name alone is not enough.");
      return;
    }
    setName("");
    setPlaceId("");
    setMapsUrl("");
    setError("");
    await load();
  }

  async function archive(locationId: string, next: "ACTIVE" | "ARCHIVED") {
    await fetch(`/api/askreview/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
  }

  async function rename(locationId: string) {
    if (!renameValue.trim()) return;
    await fetch(`/api/askreview/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    setRenameId(null);
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="askreview-main" data-product-dashboard="true">
      <h1>Review-request locations</h1>
      <p>What can I do here: save a business location and generate a Google review-request kit.</p>
      <p data-access-summary="true">
        Account access: authenticated kit generation. Payment is not activated.
        {qa ? " Internal QA access — this account is not a paid subscription and is excluded from paid metrics." : null}
      </p>
      <p data-product-context="true">Each kit includes a Google review link, QR mark, and request copy. AskReview does not send messages.</p>
      <div style={{ display: "flex", gap: "0.5rem", margin: "1rem 0", flexWrap: "wrap" }}>
        <button className="askreview-btn" type="button" aria-pressed={status === "ACTIVE"} onClick={() => { setStatus("ACTIVE"); void load("ACTIVE", q, 1); }}>Active</button>
        <button className="askreview-btn askreview-btn--ghost" type="button" aria-pressed={status === "ARCHIVED"} onClick={() => { setStatus("ARCHIVED"); void load("ARCHIVED", q, 1); }}>Archived</button>
        <input className="askreview-input" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => void load(status, q, 1)} placeholder="Search locations" />
      </div>
      <form className="askreview-card" onSubmit={createLocation} style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <h2>Add a location</h2>
        <input className="askreview-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Business name" />
        <input className="askreview-input" value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="Google Place ID (ChIJ…)" />
        <input className="askreview-input" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Optional Maps URL that includes placeid" />
        <button className="askreview-btn" type="submit" data-primary-action="add-location">Add a location</button>
        {error ? <p className="askreview-error">{error}</p> : null}
      </form>
      <section data-collection="locations" data-collection-bounded="true" data-collection-page-size={pageSize} data-collection-order="updated_at">
        <p>{total} {status.toLowerCase()} locations</p>
        {items.length === 0 ? (
          <div className="askreview-empty" data-empty-state="true">
            No {status.toLowerCase()} locations yet. Add a Google Place ID to generate your first review-request kit.
            AskReview does not send texts or emails.
          </div>
        ) : (
          <ul className="askreview-list">
            {items.map((row) => {
              const active = selectedId === row.locationId;
              return (
                <li key={row.locationId}>
                  <div
                    className={`askreview-item${active ? " askreview-item--active" : ""}`}
                    data-location-card="true"
                    data-active={active ? "true" : "false"}
                    data-selected-item={active ? row.locationId : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    <strong>{row.name}</strong>
                    {active ? <span className="askreview-badge" data-selected-badge="true">Selected</span> : null}
                    <p>Updated {row.updatedAt.slice(0, 10)}</p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <Link className="askreview-btn" href={`/askreview/app/locations/${row.locationId}`} onClick={() => setSelectedId(row.locationId)}>Open location</Link>
                      <button className="askreview-btn askreview-btn--ghost" type="button" onClick={() => { setRenameId(row.locationId); setRenameValue(row.name); }}>Rename</button>
                      <button className="askreview-btn askreview-btn--ghost" type="button" onClick={() => void archive(row.locationId, row.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED")}>
                        {row.status === "ARCHIVED" ? "Restore" : "Archive"}
                      </button>
                    </div>
                    {renameId === row.locationId ? (
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <input className="askreview-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                        <button className="askreview-btn" type="button" onClick={() => void rename(row.locationId)}>Save name</button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 ? (
          <nav data-pagination="true">
            Page {page} of {pages}
            {" "}
            <button className="askreview-btn askreview-btn--ghost" type="button" disabled={page <= 1} onClick={() => void load(status, q, page - 1)}>Previous</button>
            <button className="askreview-btn askreview-btn--ghost" type="button" disabled={page >= pages} onClick={() => void load(status, q, page + 1)}>Next</button>
          </nav>
        ) : null}
      </section>
      <p data-support="true">Help and support: <Link href="/askreview/support">infinitemediaresources@gmail.com</Link></p>
      <button className="askreview-btn askreview-btn--ghost" type="button" onClick={() => {
        void fetch("/api/askreview/auth/signout", { method: "POST" }).then(() => {
          window.location.href = "/askreview";
        });
      }}>Sign out</button>
    </main>
  );
}
