export function premiumVenturePrimitivesSource(): string {
  return `"use client";

import type { ReactNode } from "react";

export function IconMark({ label }: { label: string }) {
  return (
    <svg className="pv-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <title>{label}</title>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 15l3-3 3 2 4-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ProductUiFrame({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="pv-product-frame" data-visualization="PRODUCT_UI_FRAME">
      <figcaption className="pv-caption">{title}</figcaption>
      {children}
      <p className="pv-caption">{caption}</p>
    </figure>
  );
}
`;
}

export function premiumCreLandingSource(input: {
  artifactId: string;
  experimentId: string;
  ventureId: string;
  candidateId: string;
}): string {
  const lineage = (sectionId: string, sectionType: string, patternId: string) =>
    `data-artifact-id="${input.artifactId}" data-section-id="${sectionId}" data-section-type="${sectionType}" data-pattern-id="${patternId}" data-experiment-id="${input.experimentId}" data-venture-id="${input.ventureId}" data-candidate-id="${input.candidateId}"`;
  return `import { VentureFooter } from "../components/venture-footer";
import { Disclosure, PageShell, PricingCard, PrimaryCTA, ValidationBadge } from "../components/validation-grade";
import { ProductUiFrame } from "../components/premium-venture";
import { ViewBeacon } from "./view-beacon";

export default function Page() {
  return (
    <PageShell tone="cre">
      <ViewBeacon />
      <header className="vg-hero pv-hero pv-hero--split" data-design-archetype="FINANCIAL_B2B_ANALYTICAL" data-hero-variant="PRODUCT_SPLIT_HERO" ${lineage("sec_hero", "HERO", "FOCUSED_HERO")}>
        <div className="vg-container pv-hero-grid">
          <div>
            <ValidationBadge>Pilot / early access — in validation, not generally available</ValidationBadge>
            <p className="pv-eyebrow">For tenant-rep and boutique CRE brokers</p>
            <h1 className="pv-display">Commercial lease decisions, without rebuilding the spreadsheet.</h1>
            <p className="vg-lede pv-lede">A focused workflow for comparing commercial lease economics — step-ups, CAM, percentage rent, TI, free rent, NPV, and discount-rate sensitivity. This is an early validation / pilot concept, not a finished product.</p>
            <p>
              <PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA>
              {" "}
              <a className="pv-cta pv-cta--ghost" href="#proposed-workflow">See the proposed workflow</a>
            </p>
          </div>
          <ProductUiFrame title="Proposed lease comparison" caption="Illustrative sample — not customer data. Proposed workflow visualization, not a production screenshot.">
            <div className="pv-compare" data-visualization="LEASE_OPTION_COMPARISON">
              <table>
                <caption className="pv-caption">Lease A vs Lease B — illustrative sample</caption>
                <thead>
                  <tr><th scope="col">Metric</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,000</td></tr>
                  <tr><th scope="row">Step-ups</th><td>3% / yr</td><td>5% / yr</td></tr>
                  <tr><th scope="row">TI</th><td>$18 / sf</td><td>$12 / sf</td></tr>
                  <tr><th scope="row">Free rent</th><td>2 months</td><td>1 month</td></tr>
                  <tr><th scope="row">CAM</th><td>$8.40 / sf</td><td>$9.10 / sf</td></tr>
                  <tr><th scope="row">NPV @ 8%</th><td data-visualization="NPV_COMPARISON">$186,400</td><td>$191,220</td></tr>
                </tbody>
              </table>
              <p className="pv-caption">Lower illustrative NPV: Lease A</p>
              <div className="pv-bar" aria-hidden="true"><span style={{ width: "78%" }} /></div>
            </div>
          </ProductUiFrame>
        </div>
      </header>

      <section className="pv-section vg-section" id="proposed-workflow" ${lineage("sec_workflow", "WORKFLOW", "PRODUCT_FIRST_VISUALIZATION")} data-section-variant="WORKFLOW_TRANSFORMATION">
        <div className="vg-container">
          <p className="pv-eyebrow">Workflow</p>
          <h2>From rebuilt workbook to a shareable comparison</h2>
          <div className="pv-workflow" data-visualization="WORKFLOW_DIAGRAM">
            <article className="pv-surface">
              <h3>Before</h3>
              <p>Brokers rebuild step-ups, CAM, TI, free rent, and discount-rate cases in a new spreadsheet for each deal.</p>
            </article>
            <p aria-hidden="true">→</p>
            <article className="pv-surface">
              <h3>Proposed after</h3>
              <p>One comparison workspace that keeps cash-flow, NPV, and sensitivity next to the client summary.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="pv-section vg-section" ${lineage("sec_preview", "PRODUCT_PREVIEW", "DATA_DENSITY_WITH_CLARITY")} data-section-variant="PRODUCT_UI_PREVIEW">
        <div className="vg-container">
          <p className="pv-eyebrow">Product visualization</p>
          <h2>Discount-rate sensitivity stays visible</h2>
          <p className="pv-lede">Illustrative sample. Changing the discount rate should move both NPVs without hiding the lease terms.</p>
          <div className="pv-data-panel" data-visualization="DISCOUNT_RATE_SENSITIVITY">
            <table className="pv-compare">
              <caption className="pv-caption">NPV sensitivity — illustrative sample</caption>
              <thead>
                <tr><th scope="col">Rate</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">6%</th><td>$198,100</td><td>$204,400</td></tr>
                <tr><th scope="row">8%</th><td>$186,400</td><td>$191,220</td></tr>
                <tr><th scope="row">10%</th><td>$175,900</td><td>$179,050</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pv-section vg-section" ${lineage("sec_features", "FEATURES", "MODULAR_COMMERCE_STRUCTURE")} data-section-variant="PRODUCT_DETAIL_SPLIT">
        <div className="vg-container">
          <p className="pv-eyebrow">Scope</p>
          <h2>Built for lease economics, not a brokerage suite</h2>
          <div className="pv-metric-strip" data-visualization="METRIC_STRIP">
            <article className="pv-surface"><h3>Cash-flow compare</h3><p>Side-by-side occupancy cost, not a CRM.</p></article>
            <article className="pv-surface"><h3>NPV + sensitivity</h3><p>Discount-rate cases stay next to the terms.</p></article>
            <article className="pv-surface"><h3>Client summary</h3><p>A shareable view of the comparison, not a PMS.</p></article>
            <article className="pv-surface"><h3>What this is not</h3><p>Not enterprise lease admin. Not a finished product.</p></article>
          </div>
        </div>
      </section>

      <section className="pv-section vg-section" ${lineage("sec_pricing", "PRICING", "TRUST_NEAR_DECISION")} data-section-variant="PRICING_HYPOTHESIS">
        <div className="vg-container">
          <p className="pv-eyebrow">Interest only — not a purchase</p>
          <h2>Pricing hypotheses</h2>
          <div className="pv-pricing-split">
            <PricingCard title="Professional annual access" price="$290 / year">
              Pricing hypothesis — selecting this indicates interest. Payment is not collected.
            </PricingCard>
            <PricingCard title="Per-deal comparison report" price="$149 / deal">
              Pricing hypothesis — selecting this indicates interest. Payment is not collected.
            </PricingCard>
          </div>
          <Disclosure>
            Pricing is being tested. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven. No discounts or savings are claimed.
          </Disclosure>
          <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
        </div>
      </section>

      <section className="pv-section vg-section pv-cta-band" ${lineage("sec_cta", "CTA", "REPEATED_CONVERSION_ANCHORS")} data-section-variant="CTA_BAND" data-cta="Request Pilot Access">
        <div className="vg-container">
          <h2>Request a validation pilot</h2>
          <p className="pv-lede">Pilot / early access. In validation. Not generally available. No payment is collected.</p>
          <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
        </div>
      </section>

      <section className="pv-section vg-section" ${lineage("sec_disclosure", "DISCLOSURE", "TRUST_NEAR_DECISION")} data-section-variant="VALIDATION_DISCLOSURE">
        <div className="vg-container">
          <h2>Important context</h2>
          <Disclosure>
            Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed. No customer quotes, reviews, adoption metrics, or certifications are claimed. This is a proposed workflow visualization for market validation.
          </Disclosure>
        </div>
      </section>
      <VentureFooter />
    </PageShell>
  );
}
`;
}
