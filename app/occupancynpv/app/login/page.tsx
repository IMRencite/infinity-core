"use client";

import { useState } from "react";

export default function OccupancynpvLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/occupancynpv/auth/${mode === "signin" ? "signin" : "signup"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { ok?: boolean; reason?: string };
    if (!json.ok) {
      setMessage(json.reason === "INVALID_CREDENTIALS" ? "Email or password is incorrect." : "Could not complete account setup.");
      return;
    }
    const intent = new URLSearchParams(window.location.search).get("intent");
    if (intent === "trial") {
      await fetch("/api/trial/start", { method: "POST" });
    }
    window.location.href = "/occupancynpv/app";
  }

  return (
    <main className="onpv-page onpv-page--auth mx-auto max-w-md py-10">
      <a className="onpv-appbar-brand onpv-brand" href="/occupancynpv/app" aria-label="OccupancyNPV home" data-venture-brand="occupancynpv">
        <span className="onpv-brand-mark" aria-hidden="true" data-venture-logo="compact">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28">
            <rect width="32" height="32" rx="7" fill="#1d4e78"/>
            <circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="4.5"/>
          </svg>
        </span>
        <span className="onpv-brand-wordmark" data-venture-wordmark="true">OccupancyNPV</span>
      </a>
      <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="onpv-muted mt-2 text-sm text-zinc-600">Account access opens your DealWorkspaces. A 3-day free trial uses the same sign-in path and does not collect a card. Email and password stay on this form. If sign-in fails, the form shows the error. OccupancyNPV does not sell or publish your login. Support: infinitemediaresources@gmail.com. Use Suggest an Improvement in the page footer without creating an account.</p>
      <form className="mt-6 space-y-3" onSubmit={submit}>
        <input className="w-full rounded border px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" />
        <input className="w-full rounded border px-3 py-2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="onpv-btn-primary w-full rounded bg-zinc-900 px-3 py-2 text-white" type="submit">{mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      {message ? <p className="onpv-error mt-3 text-sm text-red-700">{message}</p> : null}
      <button className="onpv-link mt-4 text-sm underline" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Need an account?" : "Already have an account?"}
      </button>
    </main>
  );
}
