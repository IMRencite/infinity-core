"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type CopyVariants = { counter: string; sms: string; email: string };
type Kit = { kitId: string; reviewUrl: string; requestCopy: string; copyVariants?: CopyVariants; qrSvg: string; createdAt: string };
type Location = { locationId: string; name: string; status: "ACTIVE" | "ARCHIVED" };

export default function AskReviewLocationPage() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function load() {
    const res = await fetch(`/api/askreview/locations/${params.id}`);
    if (res.status === 401) {
      window.location.href = "/askreview/app/login";
      return;
    }
    const json = await res.json() as { location?: Location; kits?: Kit[] };
    setLocation(json.location ?? null);
    setKits(json.kits ?? []);
    setSelectedKitId(json.kits?.[0]?.kitId ?? null);
  }

  useEffect(() => { void load(); }, [params.id]);

  async function generate() {
    const res = await fetch(`/api/askreview/locations/${params.id}/kits`, { method: "POST" });
    const json = await res.json() as { ok?: boolean; reason?: string };
    if (!json.ok) {
      setError(json.reason === "UNSUPPORTED_MAPS_URL"
        ? "This location’s Maps URL is unsupported. Edit the location with a Place ID."
        : json.reason === "INVALID_LOCATION_INPUT"
          ? "This location cannot produce a review link."
          : "Kit generation failed. Try again.");
      return;
    }
    setError("");
    await load();
  }

  async function archive() {
    await fetch(`/api/askreview/locations/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: location?.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED" }),
    });
    await load();
  }

  const selected = kits.find((row) => row.kitId === selectedKitId) ?? kits[0] ?? null;
  const variants = selected?.copyVariants ?? {
    counter: selected?.requestCopy ?? "",
    sms: selected?.requestCopy ?? "",
    email: selected?.requestCopy ?? "",
  };

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  function downloadQr() {
    if (!selected) return;
    const blob = new Blob([selected.qrSvg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${location?.name ?? "askreview"}-review-qr.svg`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="askreview-main">
      <p><Link className="askreview-btn askreview-btn--ghost" href="/askreview/app">Back to locations</Link></p>
      <h1>{location?.name ?? "Location"}</h1>
      <p>Primary action: generate a review-request kit. Latest kit is shown first. Prior kits stay listed.</p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button className="askreview-btn" type="button" onClick={() => void generate()}>Generate kit</button>
        <button className="askreview-btn askreview-btn--ghost" type="button" onClick={() => void archive()}>
          {location?.status === "ARCHIVED" ? "Restore" : "Archive"}
        </button>
      </div>
      {error ? <p className="askreview-error">{error}</p> : null}
      {kits.length === 0 ? (
        <div className="askreview-empty" data-empty-state="true">No kits yet. Generate one to get a review link, QR, and request copy. AskReview does not send the message.</div>
      ) : (
        <div className="askreview-kit">
          <section data-kit-history="true">
            <h2>Kit history</h2>
            <ul className="askreview-list">
              {kits.map((row, index) => {
                const active = selected?.kitId === row.kitId;
                return (
                  <li key={row.kitId}>
                    <button
                      type="button"
                      className={`askreview-item${active ? " askreview-item--active" : ""} askreview-btn askreview-btn--ghost`}
                      aria-pressed={active}
                      aria-current={active ? "true" : undefined}
                      data-kit-item="true"
                      data-active={active ? "true" : "false"}
                      data-selected-item={active ? row.kitId : undefined}
                      onClick={() => setSelectedKitId(row.kitId)}
                    >
                      {index === 0 ? "Latest kit" : "Kit"} {row.createdAt.slice(0, 16)}
                      {active ? <span className="askreview-badge" data-selected-badge="true">Selected</span> : null}
                      {" "}Open kit
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          {selected ? (
            <section
              className="askreview-card"
              data-product-result="true"
              data-editor-item={selected.kitId}
              role="region"
              aria-labelledby="askreview-kit-title"
            >
              <h2 id="askreview-kit-title">Review-request kit</h2>
              <p data-result-outcome="true">Review link ready</p>
              <div data-result-metric="true"><dt>Business</dt><dd>{location?.name}</dd></div>
              <div data-result-metric="true"><dt>Review URL</dt><dd>{selected.reviewUrl}</dd></div>
              <div dangerouslySetInnerHTML={{ __html: selected.qrSvg }} />
              <div data-result-actions="true" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="askreview-btn" type="button" data-primary-action="copy-review-url" onClick={() => void copyText("link", selected.reviewUrl)}>Copy review link</button>
                <a className="askreview-btn askreview-btn--ghost" href={selected.reviewUrl} target="_blank" rel="noreferrer">Open review link</a>
                <button className="askreview-btn askreview-btn--ghost" type="button" onClick={() => window.print()}>Print kit</button>
                <button className="askreview-btn askreview-btn--ghost" type="button" onClick={downloadQr}>Download QR</button>
              </div>
              {copied ? <p>Copied {copied}.</p> : null}
              <label>Counter-card copy<textarea className="askreview-input" rows={3} defaultValue={variants.counter} key={`${selected.kitId}-counter`} /></label>
              <label>Text-message copy<textarea className="askreview-input" rows={3} defaultValue={variants.sms} key={`${selected.kitId}-sms`} /></label>
              <label>Email copy<textarea className="askreview-input" rows={5} defaultValue={variants.email} key={`${selected.kitId}-email`} /></label>
              <p>These fields are editable for your use. AskReview does not send them.</p>
              <p data-result-disclaimer="true">AskReview is independent software. It is not a Google partner product and does not send SMS or email.</p>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
