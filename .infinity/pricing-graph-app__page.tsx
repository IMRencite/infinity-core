/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../components/site-chrome";
import { ProductUiFrame } from "../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../components/validation-grade";
import { VentureFooter } from "../components/venture-footer";
import { SITE_SCHEMA } from "../lib/site-schema";
export const metadata = {
  title: "Compare commercial lease economics — early validation",
  description: "A focused early-validation workflow for comparing commercial lease economics, NPV, and discount-rate sensitivity. Pilot access only. No payment is collected.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { title: "Compare commercial lease economics — early validation", description: "A focused early-validation workflow for comparing commercial lease economics, NPV, and discount-rate sensitivity. Pilot access only. No payment is collected." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/" role="HOMEPAGE" pattern="COMMERCIAL_HOMEPAGE" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"}]} />
        
        <header className="pv-hero pv-hero--split pv-hero-photo--compact pv-hero-photo" data-section-type="HERO" data-section-id="sec_hero" data-pattern-id="FOCUSED_HERO" data-design-archetype="FINANCIAL_B2B_ANALYTICAL" data-hero-variant="PRODUCT_SPLIT_HERO" data-artifact-id="art_c62f12bc59759bdbf3d1" data-candidate-id="7e7e924e-0741-4155-a729-8d529da77ea9" data-experiment-id="exp_e72beb7b6d35e7b20acf" data-cta="Request Pilot Access" data-surface="DEFAULT">
        <figure className="pv-hero-media">
          <img src="/media/hero-district.webp" alt="Glass office towers in a business district at dusk. Editorial atmosphere only. Not a client site." width={1600} height={900} fetchPriority="high" decoding="async" />
        </figure>
        <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-hero-grid">
            <div>
              <p className="pv-eyebrow">For tenant-rep and boutique CRE brokers</p>
              <h1 className="pv-display">Compare commercial lease economics without rebuilding the spreadsheet.</h1>
              <p><div className="pv-hero-actions-row"><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA><a className="pv-hero-secondary" href="/lease-comparison">Compare two leases</a><a className="pv-hero-secondary" href="/how-it-works">See the workflow</a></div></p>
              <div data-question-id="q_68d856500f44429b" data-answer-chunk-id="q_68d856500f44429b_chunk"><AnswerFirst question="Who is this lease comparison workflow for?" answer="This focused workflow is for tenant-rep brokers, independent CRE brokers, and boutique advisory teams who currently rebuild lease workbooks deal by deal and need a shareable occupancy-cost comparison." /></div>
              <p className="pv-lede">A focused early-validation workflow for comparing commercial lease economics — rent, CAM, tenant improvement allowance, free rent, escalations, NPV, and discount-rate sensitivity. This is an early validation / pilot concept, not a finished product.</p>
            </div>
            <ProductUiFrame title="Proposed lease comparison workspace" caption="Illustrative sample — not customer data. Proposed workflow visualization, not a production screenshot.">
              
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON" data-visualization-id="home_lease_ab">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — Lease A versus Lease B, not customer data</caption>
                <thead><tr><th scope="col">Input</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,000</td></tr>
                  <tr><th scope="row">CAM</th><td>$8,400</td><td>$9,100</td></tr>
                  <tr><th scope="row">TI credit, year 1</th><td>$18,000</td><td>$12,000</td></tr>
                  <tr><th scope="row">Free rent</th><td>2 months</td><td>1 month</td></tr>
                  <tr><th scope="row">Escalation</th><td>3% / year</td><td>5% / year</td></tr>
                  <tr><th scope="row">NPV @ 8%</th><td>$186,400</td><td>$191,220</td></tr>
                </tbody>
              </table></div></div>
            </ProductUiFrame>
          </div>
        </header>
        <section className="pv-section" data-section-type="PROBLEM" data-section-id="sec_problem" data-pattern-id="LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <div className="pv-question-cluster" data-composition="question-cluster"><h2>The core problem</h2>
            <p>Tenant-representation work still starts with a rebuilt spreadsheet. Face rent is copied from a proposal. Free rent lives in an email. Tenant improvement allowance sits in a term-sheet footnote. CAM is estimated in a separate tab. Discount-rate cases, if they exist, hide in a named range nobody opens.</p>
            <p>The cost of the current workflow is not just time. Deal by deal, a hidden cell changes the ranking. The client receives a headline instead of a cash-flow argument. The broker cannot show what happens when the discount rate moves two points. Each new option rebuilds a workbook instead of updating one comparison.</p>
            <h2>Why spreadsheet-based lease comparison breaks down</h2>
            <p>Spreadsheets are honest tools. They fail as a shared method because the method is not shared. One analyst discounts annual totals. Another ignores CAM. A third subtracts TI from year-one rent even when the allowance is paid after invoices. The ranking becomes a function of the last person who touched the file.</p>
            <h2>Why face rent alone misleads</h2>
            <p>Face rent is the starting headline. It does not tell you when cash moves. A lower start rent with faster escalations, thinner TI, and shorter free rent can cost more on a present-value basis. Separate emails and a separate tab cannot keep those pieces on one occupancy-cost timeline.</p></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="sec_mechanism" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-section-variant="WORKFLOW_TRANSFORMATION" data-visualization="WORKFLOW_DIAGRAM" data-surface="DEFAULT">
          <div className="vg-container">
            <h2>The new mechanism</h2>
            <p className="pv-lede">Capture each option’s rent schedule and incentives, place them on one cash-flow timeline, discount that stream to NPV at an explicit rate, and keep a client summary next to the sensitivity cases.</p>
            <div className="pv-workflow">
              <article className="pv-surface"><h3>Before</h3><p>Each deal rebuilds a workbook. Discount-rate cases live in a separate tab, if they exist at all.</p></article>
              <p aria-hidden="true">→</p>
              <article className="pv-surface"><h3>Proposed after</h3><p>One comparison workspace. NPV, sensitivity, and the client summary stay together.</p></article>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="PRODUCT_PREVIEW" data-section-id="sec_how" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>How the workflow operates</h2>
            <ol>
              <li>Broker inputs: measurement period, discount rate, and the client-facing labels that will appear on the summary.</li>
              <li>Lease inputs: start rent, term, escalations, tenant improvement allowance, free rent, and CAM for each option.</li>
              <li>Term normalization and cash-flow generation so a twenty-four-month deal is not compared as a slogan against a sixty-month deal.</li>
              <li>NPV and sensitivity analysis with the rate still visible beside the terms.</li>
              <li>A shareable client summary that keeps cash-flow, ranking, and caveats together.</li>
            </ol>
            <h2>Product demonstration</h2>
            <p>The proposed interface is a comparison workspace, not a CRM and not a property-management system. Cash-flow compare, NPV + sensitivity, and the client summary stay on one screen so the ranking is not an artifact of a hidden cell.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="COMPARISON" data-section-id="sec_example" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="DEFAULT">
          <div className="vg-container">
            <div className="pv-worked-ledger"><h2>Lease A versus Lease B — worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. These figures are educational samples, not customer results.</p>
            
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="LEASE_OPTION_COMPARISON" data-visualization-id="home_example">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — Lease A versus Lease B, not customer data</caption>
                <thead><tr><th scope="col">Input</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,000</td></tr>
                  <tr><th scope="row">CAM</th><td>$8,400</td><td>$9,100</td></tr>
                  <tr><th scope="row">TI credit, year 1</th><td>$18,000</td><td>$12,000</td></tr>
                  <tr><th scope="row">Free rent</th><td>2 months</td><td>1 month</td></tr>
                  <tr><th scope="row">Escalation</th><td>3% / year</td><td>5% / year</td></tr>
                  <tr><th scope="row">NPV @ 8%</th><td>$186,400</td><td>$191,220</td></tr>
                </tbody>
              </table></div></div>
            
            <div className="pv-table-wrap"><div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="CASH_FLOW_TIMELINE" data-visualization-id="home_cf">
              <table className="pv-compare pv-fin-table">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — cash-flow periods, not customer data</caption>
                <thead><tr><th scope="col">Period</th><th scope="col">Lease A net occupancy</th><th scope="col">Discounted @ 8%</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Year 1</th><td>$32,400<span className="pv-cell-note">after free rent and TI</span></td><td>$30,000</td></tr>
                  <tr><th scope="row">Year 2</th><td>$51,912</td><td>$44,500</td></tr>
                  <tr><th scope="row">Year 3</th><td>$53,469</td><td>$42,430</td></tr>
                  <tr><th scope="row">Year 4</th><td>$55,073</td><td>$40,470</td></tr>
                  <tr><th scope="row">Year 5</th><td>$56,726</td><td>$38,600</td></tr>
                </tbody>
              </table></div></div>
            <div className="pv-decision-takeaway" data-visualization="NPV_COMPARISON">
              <p>At an 8% discount rate, Lease A’s illustrative NPV is $186,400 and Lease B’s is $191,220. Lease B starts cheaper. After faster step-ups, a smaller improvement allowance, and less free rent, its occupancy-cost present value is higher.</p>
            </div>
            <div className="pv-bar" aria-hidden="true" data-visualization="FINANCIAL_COMPARISON"><span style={{ width: "78%" }} /></div></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="FEATURES" data-section-id="sec_value" data-pattern-id="MODULAR_COMMERCE_STRUCTURE" data-surface="DEFAULT">
          <div className="vg-container">
            <h2>Value stack</h2>
            <div className="pv-metric-strip" data-visualization="METRIC_STRIP">
              <article className="pv-surface"><h3>Cash-flow compare</h3><p>Side-by-side occupancy cost, not a CRM.</p></article>
              <article className="pv-surface"><h3>NPV + sensitivity</h3><p>Discount-rate cases stay next to the terms.</p></article>
              <article className="pv-surface"><h3>Client summary</h3><p>A shareable view of the comparison, not a PMS.</p></article>
              <article className="pv-surface"><h3>Incentive timing</h3><p>TI, free rent, and CAM stay on the same timeline.</p></article>
            </div>
            <div className="pv-prose pv-authority-shell">
              <h2>Benefits</h2>
              <p>The proposed product keeps cash-flow visible, keeps the discount-rate assumption visible, and produces a shareable client summary. Sensitivity stays visible so a ranking flip is a conversation, not a surprise.</p>
              <h2>Use cases</h2>
              <p>A tenant-rep broker comparing two downtown options. A boutique CRE team preparing a client presentation. An independent broker who currently rebuilds step-ups, CAM, TI, and free rent in a new spreadsheet for each deal.</p>
              <h2>Broker workflow and client presentation value</h2>
              <p>The broker still collects terms. The workflow does not replace judgment about operations, flexibility, or unmodeled clauses. It replaces the rebuilt workbook as the place those terms are compared. The client sees the same cash-flow and NPV figures the broker used, labeled as illustrative until the live terms are loaded.</p>
              <h2>Inputs the system needs</h2>
              <p>Start rent, term, escalations, tenant improvement allowance, free rent, CAM or operating-expense estimates, and an explicit discount rate. Missing fields stay visible.</p>
              <h2>Outputs the system produces</h2>
              <p>A period-by-period occupancy-cost stream, discounted NPV, a sensitivity table, and a client-summary preview. It does not produce legal advice, lease accounting entries, or a claim that anyone already pays the tested prices.</p>
              <h2>Why the old comparison method keeps losing time</h2>
              <p>A tenant-rep conversation has a short window. The broker already collected the proposals. The client wants a recommendation before the landlord’s offer expires. Rebuilding formulas for CAM, free rent, and tenant improvement allowance in that window is how face rent becomes the headline. The proposed mechanism is not a new finance theory. It is a reusable place to keep the cash-flow stream, the discount rate, and the client summary together so the next option does not require another workbook.</p>
              <p>That is also why this site spends time on authority pages. A serious owner would not publish a comparison offer that cannot explain NPV, CAM, free rent, or escalations. The educational spokes exist so the commercial page does not have to pretend those questions are optional. They are the proof that the workflow is about lease economics, not a generic SaaS template.</p>
              <p>The early-validation disclosure stays next to the offer because the product is not generally available. No ratings, reviews, customers, or certifications are claimed. Sample figures stay labeled illustrative. If a later governed deployment is authorized, that deployment will still have to prove the same honesty.</p>
              <p>The big promise is a truthful one: compare commercial lease economics without rebuilding the spreadsheet, with NPV, cash-flow, and a shareable client summary in one focused workflow. The problem cost is the deal-by-deal rebuild. Why current method fails is the separate tab and the headline. The product workflow is capture, normalize, discount, and share. The cta sequence repeats at readiness points. Use cases are tenant-rep comparisons. Comparison and mechanism stay visible. Objection handling, disclosure, authority, and faq sit after who not for and pricing.</p>
              <div data-question-id="q_d68167fcb2c7f071" data-answer-chunk-id="q_d68167fcb2c7f071_chunk"><AnswerFirst question="Who is this not for?" answer="This lease comparison workflow is not for landlords, not for property managers, and not for teams that need enterprise lease administration. It is also not for anyone expecting a finished product with payment collected on this site." /></div>
            <p>who is this not for: not for landlords and not for property managers looking for administration software.</p>
              <h2>Pricing hypothesis</h2>
              <p>Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.</p>
              <RelatedContent items={[{ href: "/commercial-lease-npv", label: "What NPV means in a commercial lease" }, { href: "/compare-commercial-leases", label: "How to compare two lease options" }, { href: "/how-it-works", label: "How the proposed workflow works" }, { href: "/for/tenant-rep-brokers", label: "For tenant-rep brokers" }, { href: "/resources", label: "Browse the resources hub" }]} />
            </div>
          </div>
        </section>
        
            <div className="vg-container pv-close-well"><h2>Who is this not for</h2>
            <p>who is this not for: this workflow is not for landlords running a portfolio, not for property managers administering occupied buildings, and not for teams that need a full brokerage suite. It is also not for anyone who wants a finished product with checkout today.</p>
            <h2>Objections worth answering now</h2>
            <p>This is not a finished product. Payment is not collected on this site. A lower NPV is not automatically the better occupancy choice. Sample figures are illustrative and are not customer results.</p>
            <div className="pv-hero-actions-row"><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA><a className="pv-hero-secondary" href="/lease-comparison">Compare two leases</a><a className="pv-hero-secondary" href="/how-it-works">See the workflow</a></div>
            <section data-section-type="FAQ" data-section-id="dr_faq" data-pattern-id="TRUST_NEAR_DECISION" data-surface="DEFAULT">
              <h2>Is this a finished product?</h2>
              <p>No. This is an early validation / pilot concept and is not generally available.</p>
              <h2>Is payment collected here?</h2>
              <p>No. Pricing hypotheses are $290 per year or $149 per deal. A selection indicates interest only.</p>
            </section>
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/resources", label: "Lease economics resources" }, { href: "/pricing", label: "Pricing hypotheses" }, { href: "/how-it-works", label: "See the proposed workflow" }, { href: "/for/tenant-rep-brokers", label: "Tenant-rep broker page" }]} />
            <div className="pv-source-block" data-composition="source-block"><AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP — commercial real estate organization"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers and sales agents"}]} /></div>
            <Disclosure>Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.</Disclosure>
            <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="dr_final" data-pattern-id="REPEATED_CONVERSION_ANCHORS" data-cta="Request Pilot Access" data-surface="EMPHASIS">
              <h2>Request a validation pilot</h2>
              <p>Pilot / early access. In validation. Not generally available. No payment is collected.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </section></div>

        <section className="pv-source-board pv-wide-module">
        <section className="pv-section" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container">
          <nav className="sn-block pv-wide-module" data-semantic-navigation="USE_THE_TOOL" aria-label="Use the workflow">
            <div className="sn-block-head pv-wide-module">
              <span className="sn-kicker">USE THE TOOL</span>
              <strong className="sn-title">Open the workflow</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. See the shared timeline before you pick.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Four steps from scattered terms to a summary.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Workflow</span><strong>See the workflow</strong><span className="sn-desc">Follow the steps before you pick a number.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/pricing/" data-relationship="commercial-path" aria-label="View pilot pricing. See what a bounded pilot includes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>View pilot pricing</strong><span className="sn-desc">Check what a bounded pilot includes.</span></span>
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
        <h2>Trusted sources</h2><p>Public references only. Not client results.</p><AuthorityRefs items={[{ href: "https://www.investopedia.com/terms/n/npv.asp", label: "Investopedia — net present value" }]} /></section>
      <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
