"use client";

import { useState } from "react";

export function OrganicHoldDecisionForm() {
  const [status, setStatus] = useState<string>("");
  const [comment, setComment] = useState("");

  async function decide(decision: "CLEAR" | "KEEP") {
    setStatus("submitting");
    const res = await fetch("/api/runtime/organic-hold", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, comment }),
    });
    const json = await res.json().catch(() => ({}));
    setStatus(`${res.status} ${json.reason ?? json.ok}`);
  }

  return (
    <section>
      <h2>Founder decision</h2>
      <p>This action requires a founder HQ session. A runtime, CI, or Cursor secret cannot approve this hold.</p>
      <label>
        Optional KEEP reason
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} style={{ display: "block", width: "100%" }} />
      </label>
      <p>
        <button type="button" onClick={() => decide("CLEAR")}>CLEAR HOLD</button>
        {" "}
        <button type="button" onClick={() => decide("KEEP")}>KEEP HOLD</button>
      </p>
      <p>Last response: {status || "none"}</p>
    </section>
  );
}
