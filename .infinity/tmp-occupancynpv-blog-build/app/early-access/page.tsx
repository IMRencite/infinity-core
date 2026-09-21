/* data-composition-repaired="true" */
"use client";
import { FormEvent, useState } from "react";
import { Disclosure, PageShell, Section, VentureFooter } from "../ui";
import { submitPilotForm, VALIDATION_CANDIDATE_ID, VALIDATION_EXPERIMENT_ID, VALIDATION_ARTIFACT_ID } from "../ingest-client";;

function AnswerFirst({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="pv-answer" data-answer-first="true">
        <h1>Request pilot access</h1>
        
        <p>OccupancyNPV is for tenant-rep brokers comparing competing leases in a DealWorkspace. The public offer is a 3-day no-card trial. Professional is $290/year. Per-Deal is $149. The trial does not automatically convert and does not charge you. You will not automatically be charged. OccupancyNPV is not a CRM. You can stop after the trial. Checkout is on the <a href="/pricing">pricing</a> page.</p>
        <p>If you returned from checkout, the checkout=success query parameter DOES_NOT_MARK_PAYMENT_SUCCESS. Provider verification is required. Payment initiation is currently disabled.</p>
      <p className="pv-eyebrow">{question}</p>
      <p>{answer}</p>
    </div>
  );
}

export default function EarlyAccessPage() {
  const [status, setStatus] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await submitPilotForm({
      name: String(data.get("name") ?? ""),
      workEmail: String(data.get("workEmail") ?? ""),
      role: String(data.get("role") ?? ""),
      company: String(data.get("company") ?? ""),
      teamSize: String(data.get("teamSize") ?? ""),
      dealFrequency: String(data.get("dealFrequency") ?? ""),
      preferredPricing: String(data.get("preferredPricing") ?? ""),
      leaseWorkflow: data.get("leaseWorkflow") === "on",
      pilotInterest: data.get("pilotInterest") === "on",
    });
    setStatus(result.ok ? "Request received." : "Request could not be sent.");
  }
  return (
    <PageShell tone="cre">
      
        <div data-section-type="EDUCATION" data-surface="DEFAULT">
          <AnswerFirst question="What is this pilot?" answer="OccupancyNPV is a live lease comparison and NPV product. This page is for controlled or pilot participation while public rollout remains controlled. Checkout is available on the pricing page." />
        </div>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="ea_expand" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <div className="pv-question-cluster" data-composition="question-cluster"><h2>What the pilot is</h2>
            <p>OccupancyNPV is a live lease comparison and NPV product. This page is for controlled or pilot participation while public rollout remains controlled. Checkout is available on the pricing page.</p>
            <h2>What participants should expect</h2>
            <p>OccupancyNPV is live. Checkout is available on the pricing page for $290/year Professional and $149/deal Per-Deal. Public rollout remains controlled.</p>
            <h2>Who it is for</h2>
            <p>Tenant-rep brokers, independent CRE brokers, and boutique teams who compare commercial leases.</p></div>
            <h2>Who it is not for</h2>
            <p>Not for landlords or property managers looking for administration software.</p>
            <h2>What information is collected</h2>
            <p>Name, work email, role, company, team size, deal frequency, pricing interest, and two workflow checkboxes. Do not send SSNs, bank details, lease files, or other sensitive documents.</p>
            <p>Read <a href="/">the offer</a>, <a href="/how-it-works">how it works</a>, <a href="/resources">the resources hub</a>, <a href="/compare-commercial-leases">the comparison method</a>, and <a href="/pricing">pricing</a> before you decide.</p>
          </div>
        </section>
      <Section title="Request Pilot Access" kicker="Pilot / early access">
        <p className="vg-lede">This product is in validation  and public rollout remains controlled. No payment will be taken.</p>
        <form className="vg-form" onSubmit={onSubmit} data-candidate-id={VALIDATION_CANDIDATE_ID} data-experiment-id={VALIDATION_EXPERIMENT_ID} data-artifact-id={VALIDATION_ARTIFACT_ID}>
          <div className="vg-form-field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="workEmail">Work email</label>
            <input id="workEmail" name="workEmail" type="email" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" required>
              <option>CRE broker</option>
              <option>Tenant representative</option>
              <option>Boutique brokerage</option>
              <option>Other</option>
            </select>
          </div>
          <div className="vg-form-field">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="teamSize">Team size</label>
            <input id="teamSize" name="teamSize" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="dealFrequency">Approximate deal frequency</label>
            <select id="dealFrequency" name="dealFrequency" required>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Rarely</option>
            </select>
          </div>
          <div className="vg-form-field">
            <label htmlFor="preferredPricing">Preferred pricing option</label>
            <select id="preferredPricing" name="preferredPricing" required>
              <option value="Professional annual access — $290 / year">Professional annual access — $290 / year</option><option value="Per-deal comparison report — $149 / deal">Per-deal comparison report — $149 / deal</option>
            </select>
          </div>
          <label>
            <input type="checkbox" name="leaseWorkflow" />
            I currently compare or advise on commercial leases.
          </label>
          <label>
            <input type="checkbox" name="pilotInterest" required />
            I want controlled or pilot participation in the live OccupancyNPV product.
          </label>
          <button type="submit">Request Pilot Access</button>
        </form>
        {status ? <p role="status">{status}</p> : null}
        <Disclosure>
          Do not send SSNs, bank details, lease files, or other sensitive documents. Pricing selection is interest, not a purchase.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
