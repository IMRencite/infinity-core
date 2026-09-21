"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function inferContext(pathname: string | null): { source: string; workflow: string; route: string } {
  const route = pathname || "/occupancynpv/app";
  if (route.includes("/login") || route.includes("/checkout")) {
    return { source: "PUBLIC_SITE_FEEDBACK", workflow: route.includes("/checkout") ? "pricing/public page" : "account", route };
  }
  if (route.includes("/workspaces")) {
    return { source: "IN_APP_FEEDBACK", workflow: "calculator/input workflow", route };
  }
  return { source: "IN_APP_FEEDBACK", workflow: "account/dashboard", route };
}

export function OccupancynpvImprovementChrome({
  contextual = false,
  label,
  workflow,
  route,
}: {
  contextual?: boolean;
  label?: string;
  workflow?: string;
  route?: string;
}) {
  const pathname = usePathname();
  const inferred = inferContext(pathname);
  const title = label ?? (contextual ? "Have an idea to make this better?" : "Suggest an Improvement");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [submissionId] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}`));
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    void fetch("/api/occupancynpv/me")
      .then((res) => res.json())
      .then((json: { customer?: { email?: string } }) => setEmail(json.customer?.email ?? null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((el) => !el.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/occupancynpv/improvement-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          source: inferred.source,
          message,
          goal_or_context: goal || null,
          contact_email: email ? undefined : contact || null,
          page_url_or_route: route ?? inferred.route,
          workflow_context: workflow ?? inferred.workflow,
          product_area: "OccupancyNPV",
        }),
      });
      const json = await res.json() as { ok?: boolean; acknowledgement?: string; reason?: string };
      if (!json.ok) {
        setError(json.reason === "MESSAGE_REQUIRED" ? "Please describe the improvement." : "Could not send suggestion.");
        return;
      }
      setSuccess(json.acknowledgement ?? "Thanks — your suggestion has been received and will be evaluated as product feedback.");
      setMessage("");
      setGoal("");
    } catch {
      setError("Could not send suggestion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span data-venture-improvement-trigger="true" data-intake-theme="occupancynpv">
      <button className="onpv-link" type="button" onClick={() => setOpen(true)}>{title}</button>
      {open ? (
        <div className="onpv-dialog-root onpv-intake-dialog-root" data-venture-improvement-dialog="true">
          <div className="onpv-dialog-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <div ref={dialogRef} className="onpv-dialog onpv-intake-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="onpv-dialog-header">
              <h2 id={titleId}>{title}</h2>
              <button className="onpv-btn-secondary" type="button" onClick={() => setOpen(false)}>Close</button>
            </header>
            <form className="venture-improvement-form" onSubmit={submit} noValidate>
              <label className="onpv-intake-label" htmlFor={`onpv-improve-message-${submissionId}`}>
                What would make this product work better for you?
              </label>
              <textarea id={`onpv-improve-message-${submissionId}`} className="onpv-intake-textarea" required rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
              <label className="onpv-intake-label" htmlFor={`onpv-improve-goal-${submissionId}`}>
                What are you trying to accomplish? (optional)
              </label>
              <textarea id={`onpv-improve-goal-${submissionId}`} className="onpv-intake-textarea" rows={2} value={goal} onChange={(event) => setGoal(event.target.value)} />
              {email ? <p className="onpv-muted">Signed in as {email}</p> : (
                <>
                  <label className="onpv-intake-label" htmlFor={`onpv-improve-email-${submissionId}`}>Email (optional)</label>
                  <input id={`onpv-improve-email-${submissionId}`} type="email" value={contact} onChange={(event) => setContact(event.target.value)} autoComplete="email" />
                </>
              )}
              <div className="onpv-dialog-actions">
                <button className="onpv-btn-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</button>
              </div>
              {error ? <p className="onpv-error" role="alert">{error}</p> : null}
              {success ? <p className="onpv-muted" role="status">{success}</p> : null}
              <p className="onpv-muted">Suggest an Improvement is evaluated as product feedback. This is not a promise it will be built.</p>
            </form>
          </div>
        </div>
      ) : null}
    </span>
  );
}
