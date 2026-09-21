/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { ProductUiFrame } from "../../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Early validation pricing hypotheses",
  description: "Early validation pricing hypotheses: $290 per year or $149 per deal. Interest only. Payment is not collected.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
  openGraph: { title: "Early validation pricing hypotheses", description: "Early validation pricing hypotheses: $290 per year or $149 per deal. Interest only. Payment is not collected." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/pricing" role="PRICING" pattern="PRICING_HYPOTHESIS_PAGE" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/pricing"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/pricing","label":"Early validation pricing hypotheses"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="PRICING" data-section-id="pr_hero" data-pattern-id="TRUST_NEAR_DECISION" data-surface="EDITORIAL">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="A commercial office building exterior. Editorial setting only." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container">
            <p className="pv-eyebrow">Interest only — not a purchase</p>
            <h1 className="pv-display">Early validation pricing hypotheses</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <div data-question-id="q_8a2976152f6f1aac" data-answer-chunk-id="q_8a2976152f6f1aac_chunk"><AnswerFirst question="What pricing is being tested for the pilot?" answer="Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven." /></div>
          </div>
        </header>
        <section className="pv-section" data-section-type="PRICING" data-section-id="pr_cards" data-pattern-id="TRUST_NEAR_DECISION" data-surface="EDITORIAL">
          <div className="vg-container pv-prose pv-authority-shell">
            <p>These prices are being tested because tenant-rep brokers currently rebuild a workbook deal by deal. Face rent, a separate tab, and separate emails are the current method. The hypothesis is that a focused workflow for compare commercial lease economics — cash-flow and NPV without rebuilding the spreadsheet — is worth a bounded annual or per-deal amount. That is not a claim that anyone already pays these prices.</p>
            <div className="pv-pricing-split">
              <article className="vg-pricing-card pv-surface"><h2>Professional annual access</h2><p className="vg-price">$290 / year</p><p>Intended for tenant-rep and boutique CRE brokers who would use a focused comparison workspace across deals. The hypothesis includes access to the proposed cash-flow compare, NPV + sensitivity, and client summary workflow if the product is built. It does not include a CRM, lease administration, or a finished product today.</p></article>
              <article className="vg-pricing-card pv-surface"><h2>Per-deal comparison report</h2><p className="vg-price">$149 / deal</p><p>Intended for occasional use. The hypothesis includes one comparison report if the product is built. It does not include unlimited seats, a start free trial, or checkout on this page.</p></article>
            </div>
            <h2>Why pricing is being tested</h2>
            <p>This is a pilot context. The hidden cell cost of rebuilding a workbook is real; whether brokers will pay $290 or $149 is not proven. Payment is not collected. A selection is an interest signal only.</p>
            <h2>Who should not use it</h2>
            <p>Who is this not for: not for landlords, not for property managers, and not for teams that need enterprise lease admin. It is also not for anyone who expects a finished product or believes a lower NPV is automatically the better lease.</p>
            
            <div className="vg-container pv-close-well"><h2>Who is this not for</h2>
            <p>who is this not for: this workflow is not for landlords running a portfolio, not for property managers administering occupied buildings, and not for teams that need a full brokerage suite. It is also not for anyone who wants a finished product with checkout today.</p>
            <h2>Objections worth answering now</h2>
            <p>This is not a finished product. Payment is not collected on this site. A lower NPV is not automatically the better occupancy choice. Sample figures are illustrative and are not customer results.</p>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <section data-section-type="FAQ" data-section-id="dr_faq" data-pattern-id="TRUST_NEAR_DECISION" data-surface="DEFAULT">
              <h2>Is this a finished product?</h2>
              <p>No. This is an early validation / pilot concept and is not generally available.</p>
              <h2>Is payment collected here?</h2>
              <p>No. Pricing hypotheses are $290 per year or $149 per deal. A selection indicates interest only.</p>
            </section>
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/resources", label: "Lease economics resources" }, { href: "/pricing", label: "Pricing hypotheses" }, { href: "/how-it-works", label: "How it works" }, { href: "/faq", label: "Pilot questions" }]} />
            <div className="pv-source-block" data-composition="source-block"><AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP — commercial real estate organization"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers and sales agents"}]} /></div>
            <Disclosure>Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.</Disclosure>
            
        <section className="pv-section" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container">
          <nav className="sn-block pv-wide-module" data-semantic-navigation="USE_THE_TOOL" aria-label="Related product paths">
            <div className="sn-block-head pv-wide-module">
              <span className="sn-kicker">USE THE TOOL</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. See the shared timeline before you pick.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Four steps from scattered terms to a summary.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Workflow</span><strong>See the workflow</strong><span className="sn-desc">Follow the steps before you pick a number.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/occupancy-costs/" data-relationship="related" aria-label="Occupancy costs. Face rent is not the full bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Occupancy costs</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/commercial-lease-npv/" data-relationship="related" aria-label="Commercial lease NPV. Learn why later cash is not equal to cash today.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            </div>
          </nav>
        </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="dr_final" data-pattern-id="REPEATED_CONVERSION_ANCHORS" data-cta="Request Pilot Access" data-surface="EMPHASIS">
              <h2>Request a validation pilot</h2>
              <p>Pilot / early access. In validation. Not generally available. No payment is collected.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </section></div>
          </div>
        </section>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
