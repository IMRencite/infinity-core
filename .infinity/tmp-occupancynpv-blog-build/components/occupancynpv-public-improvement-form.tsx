"use client";

import { useId, useState } from "react";

export function OccupancynpvPublicImprovementForm() {
  const titleId = useId();
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
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
          source: "PUBLIC_SITE_FEEDBACK",
          message,
          goal_or_context: goal || null,
          contact_email: email || null,
          submission_id: crypto.randomUUID(),
          page_url_or_route: "/suggest-improvement",
          workflow_context: "public marketing / help",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.reason === "string" ? json.reason : "We could not send that suggestion. Try again.");
        return;
      }
      setSuccess(typeof json.acknowledgement === "string" ? json.acknowledgement : "Thanks — your suggestion has been received and will be evaluated as product feedback.");
      setMessage("");
      setGoal("");
    } catch {
      setError("We could not send that suggestion. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-labelledby={titleId} className="pv-surface vg-form occupancynpv-improvement-form" data-venture-form="improvement-intake">
      <h2 id={titleId} className="sr-only">Suggest an Improvement</h2>
      <label className="vg-form-field" htmlFor="occupancynpv-improvement-message">
        <span>What would make this product work better for you?</span>
        <textarea id="occupancynpv-improvement-message" className="vg-textarea" required value={message} onChange={(event) => setMessage(event.target.value)} rows={5} />
      </label>
      <label className="vg-form-field" htmlFor="occupancynpv-improvement-goal">
        <span>What are you trying to accomplish? <span className="pv-muted">(optional)</span></span>
        <textarea id="occupancynpv-improvement-goal" className="vg-textarea" value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} />
      </label>
      <label className="vg-form-field" htmlFor="occupancynpv-improvement-email">
        <span>Email <span className="pv-muted">(optional)</span></span>
        <input id="occupancynpv-improvement-email" className="vg-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      </label>
      {error ? <p role="alert" className="vg-form-error">{error}</p> : null}
      {success ? <p role="status" className="vg-form-success">{success}</p> : null}
      <button type="submit" className="vg-cta vg-cta--primary" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</button>
    </form>
  );
}
