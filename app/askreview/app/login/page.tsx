"use client";

import { useState } from "react";

export default function AskReviewLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/askreview/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { ok?: boolean; reason?: string };
    if (!json.ok) {
      setMessage(json.reason === "RATE_LIMITED"
        ? "Too many attempts. Try again later."
        : json.reason === "INVALID_CREDENTIALS"
          ? "Email or password is incorrect."
          : "Could not complete account setup.");
      return;
    }
    window.location.href = "/askreview/app";
  }

  return (
    <main className="askreview-main">
      <div className="askreview-card" style={{ maxWidth: 420 }}>
        <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p>Returning customers sign in here. This is not pricing and not checkout. Payment is not activated.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
          <input className="askreview-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" autoComplete="username" />
          <input className="askreview-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          <button className="askreview-btn" type="submit">{mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        {message ? <p className="askreview-error">{message}</p> : null}
        <button className="askreview-btn askreview-btn--ghost" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Need an account?" : "Already have an account?"}
        </button>
        <p>Password reset is not self-serve in this version. Email infinitemediaresources@gmail.com from the account address.</p>
      </div>
    </main>
  );
}
