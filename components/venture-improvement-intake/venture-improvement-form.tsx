"use client";

import { useState } from "react";
import type { IntakeSource } from "@/lib/infinity/venture-improvement-intake/types";
import { CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT, CUSTOMER_IMPROVEMENT_CTA } from "@/lib/infinity/venture-improvement-intake/types";
import type { VentureImprovementTheme } from "./themes";

export function VentureImprovementForm({
  ventureId,
  source,
  theme,
  workflow,
  route,
  productArea,
  authenticatedEmail,
  customerRef,
  actionUrl,
  onSubmitted,
}: {
  ventureId: string;
  source: IntakeSource;
  theme: VentureImprovementTheme;
  workflow?: string | null;
  route?: string | null;
  productArea?: string | null;
  authenticatedEmail?: string | null;
  customerRef?: string | null;
  actionUrl?: string;
  onSubmitted?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [submissionId] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}`));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch(actionUrl ?? `/api/ventures/${encodeURIComponent(ventureId)}/improvement-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          source,
          message,
          goal_or_context: goal || null,
          contact_email: authenticatedEmail ? undefined : email || null,
          page_url_or_route: route ?? (typeof location !== "undefined" ? location.pathname : null),
          workflow_context: workflow ?? null,
          product_area: productArea ?? null,
          customer_ref: customerRef ?? null,
        }),
      });
      const json = await res.json() as { ok?: boolean; acknowledgement?: string; reason?: string };
      if (!json.ok) {
        setError(json.reason === "MESSAGE_REQUIRED" ? "Please describe the improvement." : "Could not send suggestion.");
        return;
      }
      setSuccess(json.acknowledgement ?? CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT);
      setMessage("");
      setGoal("");
      onSubmitted?.();
    } catch {
      setError("Could not send suggestion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="venture-improvement-form" data-intake-theme={theme.name} onSubmit={submit} noValidate>
      <label className={theme.label} htmlFor={`improve-message-${submissionId}`}>
        What would make this product work better for you?
      </label>
      <textarea
        id={`improve-message-${submissionId}`}
        className={theme.textarea}
        required
        rows={4}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <label className={theme.label} htmlFor={`improve-goal-${submissionId}`}>
        What are you trying to accomplish? (optional)
      </label>
      <textarea
        id={`improve-goal-${submissionId}`}
        className={theme.textarea}
        rows={2}
        value={goal}
        onChange={(event) => setGoal(event.target.value)}
      />
      {authenticatedEmail ? (
        <p className={theme.muted}>Signed in as {authenticatedEmail}</p>
      ) : (
        <>
          <label className={theme.label} htmlFor={`improve-email-${submissionId}`}>Email (optional)</label>
          <input
            id={`improve-email-${submissionId}`}
            className={theme.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </>
      )}
      <div className={theme.actions}>
        <button className={theme.primary} type="submit" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</button>
      </div>
      {error ? <p className={theme.error} role="alert">{error}</p> : null}
      {success ? <p className={theme.success} role="status">{success}</p> : null}
      <p className={theme.muted}>{CUSTOMER_IMPROVEMENT_CTA} is evaluated as product feedback. This is not a promise it will be built.</p>
    </form>
  );
}
