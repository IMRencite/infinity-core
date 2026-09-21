"use client";

import { useState } from "react";

export default function OccupancyNpvAffiliateApplyPage() {
  const [status, setStatus] = useState<string | null>(null);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/occupancynpv/affiliates/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        organization: form.get("organization"),
        website: form.get("website"),
        social_url: form.get("social_url"),
        audience: form.get("audience"),
        promotion_method: form.get("promotion_method"),
        country: form.get("country"),
        agreement_accepted: form.get("agreement") === "on",
        production: false,
      }),
    });
    const json = await res.json() as { ok?: boolean; reason?: string };
    setStatus(json.ok ? "Application recorded as an isolated fixture. No production affiliate was created." : json.reason ?? "Application rejected");
  }

  return (
    <main className="onpv-page onpv-page--dash" data-occupancynpv-affiliate-apply="true">
      <p className="onpv-kicker">Affiliate application</p>
      <h1>Apply to the OccupancyNPV affiliate program</h1>
      <p className="onpv-lede">
        Applications are reviewed. Approval is not automatic. Do not submit bank or tax credentials here.
      </p>
      <form className="onpv-card" onSubmit={onSubmit}>
        <label>Name <input name="name" required autoComplete="name" /></label>
        <label>Email <input name="email" type="email" required autoComplete="email" /></label>
        <label>Organization <input name="organization" /></label>
        <label>Website <input name="website" type="url" /></label>
        <label>Social or profile URL <input name="social_url" type="url" /></label>
        <label>Audience or channel <input name="audience" /></label>
        <label>Promotion method <input name="promotion_method" /></label>
        <label>Country <input name="country" autoComplete="country-name" /></label>
        <label>
          <input name="agreement" type="checkbox" required /> I accept the Affiliate Program Terms and will disclose compensated relationships.
        </label>
        <button className="onpv-btn-primary" type="submit">Submit application</button>
      </form>
      {status ? <p data-affiliate-apply-status="true">{status}</p> : null}
      <p><a className="onpv-link" href="/occupancynpv/affiliates/terms">Read Affiliate Terms</a></p>
    </main>
  );
}
