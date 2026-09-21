import { CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT, CUSTOMER_IMPROVEMENT_CTA } from "./types";
import { universalVentureImprovementIntakeRequirement } from "./readiness";

export function generatedVentureImprovementIntakeComponentSource(): string {
  return `"use client";

import { useEffect, useId, useRef, useState } from "react";

export function GeneratedVentureImprovementTrigger({
  ventureId,
  source = "PUBLIC_SITE_FEEDBACK",
}: {
  ventureId?: string;
  source?: "PUBLIC_SITE_FEEDBACK" | "IN_APP_FEEDBACK";
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  return (
    <div data-venture-improvement-intake="true" data-intake-theme="venture">
      <button type="button" className="vg-link" onClick={() => setOpen(true)}>
        ${CUSTOMER_IMPROVEMENT_CTA}
      </button>
      {open ? (
        <GeneratedVentureImprovementDialog
          titleId={titleId}
          dialogRef={dialogRef}
          ventureId={ventureId}
          source={source}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function GeneratedVentureImprovementDialog({
  titleId,
  dialogRef,
  ventureId,
  source,
  onClose,
}: {
  titleId: string;
  dialogRef: { current: HTMLDivElement | null };
  ventureId?: string;
  source: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>("textarea, button");
    first?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialogRef, onClose]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/improvement-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ventureId,
        source,
        message,
        goal_or_context: goal || null,
        contact_email: email || null,
        submission_id: crypto.randomUUID(),
        page_url_or_route: typeof location !== "undefined" ? location.pathname : null,
      }),
    });
    const json = await res.json() as { ok?: boolean; acknowledgement?: string; reason?: string };
    if (!json.ok) {
      setError(json.reason === "MESSAGE_REQUIRED" ? "Please describe the improvement." : "Could not send suggestion.");
      return;
    }
    setStatus(json.acknowledgement ?? ${JSON.stringify(CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT)});
    setMessage("");
    setGoal("");
  }
  return (
    <div className="vg-dialog-root">
      <div className="vg-dialog-backdrop" onClick={onClose} />
      <div ref={dialogRef} className="vg-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>${CUSTOMER_IMPROVEMENT_CTA}</h2>
        <form onSubmit={submit}>
          <label htmlFor="vg-improve-message">What would make this product work better for you?</label>
          <textarea id="vg-improve-message" required value={message} onChange={(event) => setMessage(event.target.value)} rows={4} />
          <label htmlFor="vg-improve-goal">What are you trying to accomplish? (optional)</label>
          <textarea id="vg-improve-goal" value={goal} onChange={(event) => setGoal(event.target.value)} rows={2} />
          <label htmlFor="vg-improve-email">Email (optional)</label>
          <input id="vg-improve-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <div className="vg-dialog-actions">
            <button type="submit">Send suggestion</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </form>
        {error ? <p role="alert">{error}</p> : null}
        {status ? <p role="status">{status}</p> : null}
      </div>
    </div>
  );
}
`;
}

export function generatedVentureImprovementIntakeRouteSource(ventureId: string): string {
  return `import { NextResponse } from "next/server";

const ACK = ${JSON.stringify(CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT)};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    source?: string;
    submission_id?: string;
    goal_or_context?: string | null;
    contact_email?: string | null;
    page_url_or_route?: string | null;
  };
  if (!String(body.message ?? "").trim()) {
    return NextResponse.json({ ok: false, reason: "MESSAGE_REQUIRED" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    acknowledgement: ACK,
    contract: "VentureImprovementIntakeContract",
    venture_id: ${JSON.stringify(ventureId)},
    canonical_loop: "CustomerFeedbackRecord",
  });
}
`;
}

export function factoryIncludesUniversalImprovementIntake(files: Array<{ path: string; content: string }>): boolean {
  const blob = files.map((file) => file.content).join("\n");
  return (
    files.some((file) => file.path.includes("venture-improvement-intake") || file.path.includes("improvement-intake"))
    && blob.includes(CUSTOMER_IMPROVEMENT_CTA)
    && blob.includes("VentureImprovementIntakeContract")
  );
}

export function universalIntakeFactorySurfaces(): ReturnType<typeof universalVentureImprovementIntakeRequirement> {
  return universalVentureImprovementIntakeRequirement();
}
