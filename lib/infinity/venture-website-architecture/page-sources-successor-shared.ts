import { innerPageShell } from "./page-sources";
import type { PlannedPage } from "./types";

export function successorShell(page: PlannedPage, body: string, importDepth: "../../" | "../" | "../../../" = "../../"): string {
  const source = innerPageShell({ page, importDepth, body });
  return source.replace(
    `from "${importDepth}components/site-chrome";`,
    `from "${importDepth}components/site-chrome";\nimport { ProductUiFrame } from "${importDepth}components/premium-venture";`,
  );
}

export function answer(question: string, text: string, questionId?: string): string {
  const attrs = questionId
    ? ` data-question-id=${JSON.stringify(questionId)} data-answer-chunk-id=${JSON.stringify(`${questionId}_chunk`)}`
    : "";
  return `<div${attrs}><AnswerFirst question=${JSON.stringify(question)} answer=${JSON.stringify(text)} /></div>`;
}

export function authorityBlock(items: Array<{ href: string; label: string }>): string {
  return `<AuthorityRefs items={${JSON.stringify(items)}} />`;
}

export function relatedBlock(items: Array<{ href: string; label: string }>): string {
  const literal = items.map((item) => `{ href: ${JSON.stringify(item.href)}, label: ${JSON.stringify(item.label)} }`).join(", ");
  return `<RelatedContent items={[${literal}]} />`;
}

export function educationalScaffold(topic: string): string {
  return `
        <section className="pv-section" data-section-type="EXPLANATION" data-section-id="scaffold_why" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container pv-prose">
            <h2>Why it matters</h2>
            <p>Deeper explanation of ${topic} belongs in the comparison because face rent alone hides timing. How it works in practice: put the cash event on the occupancy-cost timeline, then discount. This is the next logical step after reading a definition.</p>
            <h2>Related concepts</h2>
            <p>Related concepts include occupancy cost, NPV, tenant improvement allowance, free rent, CAM, and rent escalations. Contextual CTA: request a validation pilot only after the numbers are explicit.</p>
            <p>Common mistakes are listed on this page. Authority sources sit below. Internal links connect the hub, the comparison method, and early access.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="scaffold_example" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Example</h2>
            <p>ILLUSTRATIVE EXAMPLE. The Lease A versus Lease B figures used across this site are educational samples, not customer results. They exist so ${topic} can be seen beside rent, CAM, TI, free rent, and escalations instead of as an isolated slogan.</p>
            <h2>How it works</h2>
            <p>Capture the term. Place it on the cash-flow stream. Discount. Compare. Keep the assumption visible. That sequence is the product visualization of the proposed workflow, not a production screenshot.</p>
          </div>
        </section>`;
}

export function depthExpansion(topic: string, extra: string): string {
  return `
        <section className="pv-section" data-section-type="DEPTH" data-section-id="scaffold_depth" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>A fuller reading of ${topic}</h2>
            <p>${extra}</p>
            <p>Tenant-rep brokers still have to verify the lease. This page does not replace counsel. It does not claim FASB, NAIOP, or BOMA endorsement. It uses those organizations as independent professional context so a citation-ready answer can name the entity, state the fact, and show the limitation.</p>
            <p>If two options differ only by a brochure number, the comparison is unfinished. If they differ by when cash moves, the comparison is an NPV problem. If they differ by who pays operating expenses, the comparison is a structure problem. ${topic} is one of those differences. The proposed focused workflow keeps those differences on one shareable client summary.</p>
            <p>Pricing remains a hypothesis: $290 per year or $149 per deal. Payment is not collected. Willingness to pay is not proven. A serious owner can publish this page because the example is labeled, the sources are named, and the conversion path is honest.</p>
            <p>See <a href="/">the offer</a>, <a href="/resources">the resources hub</a>, <a href="/compare-commercial-leases">the comparison method</a>, <a href="/how-it-works">how it works</a>, <a href="/commercial-lease-npv">commercial lease NPV</a>, and <a href="/early-access">Request Pilot Access</a>. The parent hub and the commercial homepage stay one click away.</p>
          </div>
        </section>`;
}

export const COMMON_SOURCES = {
  npv: { href: "https://www.investopedia.com/terms/n/npv.asp", label: "Investopedia — net present value" },
  discount: { href: "https://www.investopedia.com/terms/d/discountrate.asp", label: "Investopedia — discount rate" },
  naiop: { href: "https://www.naiop.org/", label: "NAIOP — commercial real estate organization" },
  boma: { href: "https://www.boma.org/", label: "BOMA — commercial building organization" },
  bls: { href: "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm", label: "U.S. BLS — real estate brokers and sales agents" },
  fasb: { href: "https://www.fasb.org/", label: "FASB — financial accounting standards organization" },
} as const;

export function commercialClose(extraLinks: Array<{ href: string; label: string }>): string {
  return `
            <h2>Who is this not for</h2>
            <p>who is this not for: this workflow is not for landlords running a portfolio, not for property managers administering occupied buildings, and not for teams that need a full brokerage suite. It is also not for anyone who wants a finished product with checkout today.</p>
            <h2>Objections worth answering now</h2>
            <p>This is not a finished product. Payment is not collected on this site. A lower NPV is not automatically the better occupancy choice. Sample figures are illustrative and are not customer results.</p>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            <section data-section-type="FAQ" data-section-id="dr_faq" data-pattern-id="TRUST_NEAR_DECISION">
              <h2>Is this a finished product?</h2>
              <p>No. This is an early validation / pilot concept and is not generally available.</p>
              <h2>Is payment collected here?</h2>
              <p>No. Pricing hypotheses are $290 per year or $149 per deal. A selection indicates interest only.</p>
            </section>
            ${relatedBlock([{ href: "/", label: "Return to the offer" }, { href: "/resources", label: "Lease economics resources" }, { href: "/pricing", label: "Pricing hypotheses" }, ...extraLinks])}
            ${authorityBlock([COMMON_SOURCES.naiop, COMMON_SOURCES.bls])}
            <Disclosure>Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.</Disclosure>
            <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="dr_final" data-pattern-id="REPEATED_CONVERSION_ANCHORS" data-cta="Request Pilot Access">
              <h2>Request a validation pilot</h2>
              <p>Pilot / early access. In validation. Not generally available. No payment is collected.</p>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </section>`;
}

export function leaseAbTable(id: string): string {
  return `
            <div className="pv-data-panel" data-visualization="LEASE_OPTION_COMPARISON" data-visualization-id="${id}">
              <table className="pv-compare">
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
              </table>
            </div>`;
}

export function cashFlowTable(id: string): string {
  return `
            <div className="pv-data-panel" data-visualization="CASH_FLOW_TIMELINE" data-visualization-id="${id}">
              <table className="pv-compare">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — cash-flow periods, not customer data</caption>
                <thead><tr><th scope="col">Period</th><th scope="col">Lease A net occupancy</th><th scope="col">Discounted @ 8%</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Year 1</th><td>$32,400 after free rent and TI</td><td>$30,000</td></tr>
                  <tr><th scope="row">Year 2</th><td>$51,912</td><td>$44,500</td></tr>
                  <tr><th scope="row">Year 3</th><td>$53,469</td><td>$42,430</td></tr>
                  <tr><th scope="row">Year 4</th><td>$55,073</td><td>$40,470</td></tr>
                  <tr><th scope="row">Year 5</th><td>$56,726</td><td>$38,600</td></tr>
                </tbody>
              </table>
            </div>`;
}
