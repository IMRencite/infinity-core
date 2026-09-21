import { premiumCreLandingSource } from "@/lib/infinity/public-venture-design";
import type { PlannedPage } from "./types";

export function semanticPageTitle(title: string): string {
  return title
    .replace(/\s*[—–\-·|]\s*OccupancyNPV(?:\s*[·•]\s*OccupancyNPV)*\s*$/i, "")
    .replace(/\s*OccupancyNPV\s*$/i, "")
    .trim();
}

function metadataBlock(page: PlannedPage): string {
  const title = semanticPageTitle(page.title);
  return `export const metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(page.metaDescription)},
  alternates: { canonical: ${JSON.stringify(page.canonical)} },
  robots: { index: ${page.indexable}, follow: ${page.indexable} },
  openGraph: { title: ${JSON.stringify(title)}, description: ${JSON.stringify(page.metaDescription)} },
};
`;
}

function breadcrumbs(page: PlannedPage): string {
  const items = [{ href: "/", label: "Home" }];
  if (page.parentHub && page.parentHub !== "/") items.push({ href: page.parentHub, label: page.parentHub === "/resources" ? "Resources" : "Overview" });
  if (page.route !== "/") items.push({ href: page.route, label: page.title });
  return `<SiteBreadcrumb items={${JSON.stringify(items)}} />`;
}

export function authorityHomepageSource(input: {
  artifactId: string;
  experimentId: string;
  ventureId: string;
  candidateId: string;
  page: PlannedPage;
}): string {
  const base = premiumCreLandingSource(input);
  const extra = `
      <section className="pv-section vg-section" data-section-type="RELATED_CONTENT" data-section-id="sec_related" data-pattern-id="PROGRESSIVE_DISCLOSURE">
        <div className="vg-container">
          <p className="pv-eyebrow">Lease economics</p>
          <h2>Read the comparison concepts before you request a pilot</h2>
          <div className="pv-related">
            <p className="pv-surface"><a href="/commercial-lease-npv">What NPV means in a commercial lease</a></p>
            <p className="pv-surface"><a href="/compare-commercial-leases">How to compare two lease options</a></p>
            <p className="pv-surface"><a href="/tenant-improvement-allowance">Tenant improvement allowance and occupancy cost</a></p>
            <p className="pv-surface"><a href="/discount-rate-sensitivity">Why discount-rate sensitivity belongs beside the terms</a></p>
          </div>
          <p><a href="/how-it-works">See how the proposed workflow works</a> · <a href="/resources">Browse the resources hub</a> · <a href="/pricing">Review pricing hypotheses</a> · <a href="/faq">Read pilot questions</a></p>
        </div>
      </section>`;
  return `import { JsonLdBlock, PageIdentity, SiteBreadcrumb } from "../components/site-chrome";
import { SITE_SCHEMA } from "../lib/site-schema";
${metadataBlock(input.page)}
${base
  .replace(
    `export default function Page() {
  return (
    <PageShell tone="cre">
      <ViewBeacon />`,
    `export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/" role="HOMEPAGE" pattern="COMMERCIAL_HOMEPAGE" cluster="Product">
      <JsonLdBlock data={SITE_SCHEMA["/"]} />
      ${breadcrumbs(input.page)}
      <ViewBeacon />`,
  )
  .replace("<VentureFooter />", `${extra}
      <VentureFooter />
      </PageIdentity>`)}
`;
}

export function innerPageShell(input: {
  page: PlannedPage;
  importDepth: "../../" | "../" | "../../../" | "../../../../";
  body: string;
}): string {
  const chrome = `${input.importDepth}components/site-chrome`;
  const schema = `${input.importDepth}lib/site-schema`;
  const vg = `${input.importDepth}components/validation-grade`;
  const footer = `${input.importDepth}components/venture-footer`;
  return `import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "${chrome}";
import { Disclosure, PageShell, PrimaryCTA } from "${vg}";
import { VentureFooter } from "${footer}";
import { SITE_SCHEMA } from "${schema}";
${metadataBlock(input.page)}
export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route=${JSON.stringify(input.page.route)} role=${JSON.stringify(input.page.role)} pattern=${JSON.stringify(input.page.patternId)} cluster=${JSON.stringify(input.page.topicCluster)}>
        <JsonLdBlock data={SITE_SCHEMA[${JSON.stringify(input.page.route)}]} />
        ${breadcrumbs(input.page)}
        ${input.body}
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
`;
}

export function howItWorksPageSource(page: PlannedPage): string {
  return innerPageShell({
    page,
    importDepth: "../../",
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="HERO" data-section-id="hiw_hero" data-pattern-id="FOCUSED_HERO">
          <div className="vg-container">
            <p className="pv-eyebrow">How it works</p>
            <h1 className="pv-display">Four steps from scattered terms to a shareable comparison</h1>
            <AnswerFirst question="How does the proposed workflow compare commercial leases?" answer="The proposed workflow captures each option’s rent schedule and incentives, places them on one cash-flow timeline, discounts that stream to NPV at an explicit rate, and keeps a client summary next to the sensitivity cases. This is an early-validation concept, not a finished product." />
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
          </div>
        </header>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="hiw_steps" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-visualization="WORKFLOW_DIAGRAM">
          <div className="vg-container pv-prose">
            <h2>The proposed steps</h2>
            <ol>
              <li><strong>Capture terms.</strong> Record start rent, term, escalations, tenant improvement allowance, free rent, and CAM for each option. Missing fields stay visible instead of disappearing into a hidden cell.</li>
              <li><strong>Normalize cash flows.</strong> Convert those terms into a shared occupancy-cost timeline so a two-month rent abatement and a larger TI check are not compared as slogans.</li>
              <li><strong>Discount to NPV.</strong> Apply one stated discount rate so later step-ups are not treated as equal to cash due this year.</li>
              <li><strong>Review sensitivity and the client summary.</strong> Change the rate, keep the lease terms in view, and share an illustrative summary. Sample figures are not customer results.</li>
            </ol>
            <div className="pv-workflow">
              <article className="pv-surface"><h3>Before</h3><p>Each deal rebuilds a workbook. Discount-rate cases live in a separate tab, if they exist at all.</p></article>
              <p aria-hidden="true">→</p>
              <article className="pv-surface"><h3>Proposed after</h3><p>One comparison workspace. NPV, sensitivity, and the client summary stay together.</p></article>
            </div>
            <h2>What this is not</h2>
            <p>This is not a property-management system, a full brokerage suite, or a live calculator product. Educational examples on this site are labeled illustrative and are not a substitute for building the application.</p>
            <p>Next: <a href="/compare-commercial-leases">walk through a two-option comparison</a> or <a href="/pricing">review the pricing hypotheses</a>.</p>
            <RelatedContent items={[{ href: "/compare-commercial-leases", label: "Compare two commercial leases" }, { href: "/commercial-lease-npv", label: "What NPV means in a commercial lease" }, { href: "/resources", label: "Lease economics resources" }]} />
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="hiw_cta" data-pattern-id="REPEATED_CONVERSION_ANCHORS">
          <div className="vg-container">
            <h2>Request a validation pilot</h2>
            <p className="pv-lede">Pilot / early access. In validation. Not generally available. No payment is collected.</p>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
          </div>
        </section>`,
  });
}

export function comparePageSource(page: PlannedPage): string {
  return innerPageShell({
    page,
    importDepth: "../../",
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="HERO" data-section-id="cmp_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Comparison</p>
            <h1 className="pv-display">Compare commercial leases on one occupancy-cost basis</h1>
            <AnswerFirst question="How should two commercial leases be compared?" answer="Compare options on a shared occupancy-cost timeline: rent, escalations, tenant improvement allowance, free rent, and CAM, then discount that stream to NPV at an explicit rate. Face rent alone hides timing and incentive differences." />
          </div>
        </header>
        <section className="pv-section" data-section-type="COMPARISON" data-section-id="cmp_table" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <h2>Illustrative Lease A versus Lease B</h2>
            <p className="pv-lede">These figures are an educational sample. They are not customer data and not a production screenshot.</p>
            <div className="pv-data-panel" data-visualization="LEASE_OPTION_COMPARISON">
              <table className="pv-compare">
                <caption className="pv-caption">Illustrative sample — not customer data</caption>
                <thead><tr><th scope="col">Input</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Start rent</th><td>$42,000</td><td>$39,000</td></tr>
                  <tr><th scope="row">Annual step-up</th><td>3%</td><td>5%</td></tr>
                  <tr><th scope="row">TI allowance</th><td>$18 / sf</td><td>$12 / sf</td></tr>
                  <tr><th scope="row">Free rent</th><td>2 months</td><td>1 month</td></tr>
                  <tr><th scope="row">CAM</th><td>$8.40 / sf</td><td>$9.10 / sf</td></tr>
                  <tr><th scope="row">NPV @ 8%</th><td>$186,400</td><td>$191,220</td></tr>
                </tbody>
              </table>
            </div>
            <div className="pv-prose">
              <h2>Why face rent is a weak primary metric</h2>
              <p>Lease B starts cheaper. After faster step-ups, a smaller improvement allowance, and less free rent, its illustrative NPV is higher. Tenant-representation work often fails when those pieces live in separate emails.</p>
              <h2>A practical comparison sequence</h2>
              <p>First lock the same measurement period. Then place incentives on the timeline instead of subtracting them as a slogan. Then choose a discount rate you can explain to the client. Then show what happens at nearby rates so the ranking is not an artifact of one assumption.</p>
              <p>Related concepts: <a href="/commercial-lease-npv">commercial lease NPV</a>, <a href="/tenant-improvement-allowance">tenant improvement allowance</a>, and <a href="/discount-rate-sensitivity">discount-rate sensitivity</a>.</p>
              <h2>Common questions</h2>
              <h3>Should percentage rent be in the same model?</h3>
              <p>If the lease includes it, yes — as an explicit scenario, not a hidden plug. This validation concept treats it as an input, not as a claim that every retail deal is already modeled.</p>
              <h3>Is a lower NPV always the better occupancy choice?</h3>
              <p>No. NPV is a consistency tool. Operations, flexibility, and unmodeled terms still matter. This site does not give legal or investment advice.</p>
              <Disclosure>U.S. occupational context for real estate brokers is published by the Bureau of Labor Statistics. That reference describes the profession; it is not demand volume and not an endorsement.</Disclosure>
              <AuthorityRefs items={[{ href: "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm", label: "U.S. BLS — real estate brokers and sales agents" }]} />
              <RelatedContent items={[{ href: "/how-it-works", label: "How the proposed workflow works" }, { href: "/pricing", label: "Early validation pricing" }, { href: "/resources", label: "Resources hub" }]} />
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
          </div>
        </section>`,
  });
}

export function pricingPageSource(page: PlannedPage): string {
  return innerPageShell({
    page,
    importDepth: "../../",
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="PRICING" data-section-id="pr_hero" data-pattern-id="TRUST_NEAR_DECISION">
          <div className="vg-container">
            <p className="pv-eyebrow">Interest only — not a purchase</p>
            <h1 className="pv-display">Early validation pricing hypotheses</h1>
            <AnswerFirst question="What does this proposed workflow cost?" answer="Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven." />
          </div>
        </header>
        <section className="pv-section" data-section-type="PRICING" data-section-id="pr_cards" data-pattern-id="TRUST_NEAR_DECISION">
          <div className="vg-container">
            <div className="pv-pricing-split">
              <article className="vg-pricing-card pv-surface"><h2>Professional annual access</h2><p className="vg-price">$290 / year</p><p>Pricing hypothesis for brokers who would use a focused comparison workspace across deals. No subscription is sold on this page.</p></article>
              <article className="vg-pricing-card pv-surface"><h2>Per-deal comparison report</h2><p className="vg-price">$149 / deal</p><p>Pricing hypothesis for occasional use. No checkout runs here. A selection is an interest signal only.</p></article>
            </div>
            <div className="pv-prose">
              <h2>What you would be reacting to</h2>
              <p>A bounded commercial lease comparison and NPV workflow — not a CRM, not lease administration, and not a generally available product. The offer is a validation / pilot concept.</p>
              <h2>What is not included</h2>
              <p>No payment processing, no refund schedule, no volume discount, and no claim that anyone already pays these prices. Those would require a later governed commercial offer.</p>
              <Disclosure>Pricing is being tested. Selecting an option on the pilot form indicates interest. Payment is not collected.</Disclosure>
              <p><a href="/how-it-works">Read the proposed workflow</a> before you decide whether a pilot is relevant.</p>
              <RelatedContent items={[{ href: "/how-it-works", label: "How it works" }, { href: "/faq", label: "Pilot questions" }, { href: "/early-access", label: "Request Pilot Access" }]} />
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            </div>
          </div>
        </section>`,
  });
}

export function resourcesPageSource(page: PlannedPage): string {
  return innerPageShell({
    page,
    importDepth: "../../",
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="res_hero" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container">
            <p className="pv-eyebrow">Resources</p>
            <h1 className="pv-display">Commercial lease economics, grouped by how decisions are made</h1>
            <AnswerFirst question="Which topics matter when comparing commercial leases?" answer="The smallest useful cluster is occupancy-cost comparison, NPV, discount-rate sensitivity, and tenant improvement allowance. Other incentives such as CAM detail, free rent, and escalations can be expanded later when they add unique value." />
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="res_hub" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container pv-prose">
            <h2>Lease economics</h2>
            <p><a href="/commercial-lease-npv">Commercial lease NPV</a> — convert future occupancy costs into today’s dollars so timing is explicit.</p>
            <p><a href="/discount-rate-sensitivity">Discount-rate sensitivity</a> — keep the assumption visible so a ranking is not an artifact of one rate.</p>
            <p><a href="/tenant-improvement-allowance">Tenant improvement allowance</a> — treat TI as a timed cash event, not a brochure number.</p>
            <h2>Comparison workflow</h2>
            <p><a href="/compare-commercial-leases">Compare commercial leases</a> — a two-option method using rent, incentives, and NPV together.</p>
            <p><a href="/how-it-works">How it works</a> — the proposed product steps from capture to client summary.</p>
            <h2>Key questions this hub answers</h2>
            <ul>
              <li>Why two leases with different free rent and TI cannot be ranked by start rent.</li>
              <li>What NPV does and does not decide for a tenant-rep conversation.</li>
              <li>When a standalone page is not justified yet — CAM, free rent, and escalations remain expansion candidates.</li>
            </ul>
            <p>Industry terminology context: <a href="https://www.naiop.org/" rel="noopener noreferrer">NAIOP</a>. That link is organizational context, not a competitor citation and not a ranking claim.</p>
            <AuthorityRefs items={[{ href: "https://www.naiop.org/", label: "NAIOP — commercial real estate organization" }]} />
            <RelatedContent items={[{ href: "/pricing", label: "Pricing hypotheses" }, { href: "/faq", label: "Pilot questions" }, { href: "/", label: "Return to the offer" }]} />
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  });
}

export function faqPageSource(page: PlannedPage): string {
  return innerPageShell({
    page,
    importDepth: "../../",
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="FAQ" data-section-id="faq_hero" data-pattern-id="TRUST_NEAR_DECISION">
          <div className="vg-container">
            <h1 className="pv-display">Questions about this lease comparison pilot</h1>
            <AnswerFirst question="Is this a finished product?" answer="No. This is an early validation / pilot concept. It is not generally available, and this site does not collect payment." />
          </div>
        </header>
        <section className="pv-section" data-section-type="FAQ" data-section-id="faq_list" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container pv-prose">
            <h2>Is payment collected here?</h2>
            <p>No. Pricing shown is a hypothesis. A form selection indicates interest only.</p>
            <h2>Are the sample lease numbers customer results?</h2>
            <p>No. Tables and NPV figures are illustrative samples, not customer data and not a production screenshot.</p>
            <h2>Who is the intended user?</h2>
            <p>Tenant-representation brokers, independent CRE brokers, and boutique advisory teams who currently rebuild lease workbooks deal by deal.</p>
            <h2>Is this legal or investment advice?</h2>
            <p>No. Calculations described here would be informational. Lease terms should be independently verified. No attorney review is claimed.</p>
            <h2>Where can I read the economics?</h2>
            <p>Start with <a href="/resources">the resources hub</a>, then <a href="/commercial-lease-npv">NPV</a> and <a href="/compare-commercial-leases">the comparison method</a>.</p>
            <RelatedContent items={[{ href: "/pricing", label: "Pricing hypotheses" }, { href: "/how-it-works", label: "How it works" }, { href: "/early-access", label: "Request Pilot Access" }]} />
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
          </div>
        </section>`,
  });
}

export function educationalPageSource(page: PlannedPage, spec: EducationalSpec): string {
  return innerPageShell({
    page,
    importDepth: "../../",
    body: spec.body,
  });
}

export type EducationalSpec = { body: string };

export function npvPageBody(): EducationalSpec {
  return {
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="npv_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">What is NPV in a commercial lease?</h1>
            <div data-answer-first="true">
              <AnswerFirst question="What is NPV in a commercial lease?" answer="A commercial lease NPV calculation converts future lease costs into today’s dollars using a discount rate. It helps brokers and tenants compare lease options with different rent schedules, incentives, and timing on a more consistent basis." />
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="npv_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Why it matters</h2>
            <p>Commercial options rarely differ by a single rent number. One lease may offer free rent now and steeper step-ups later. Another may look expensive in year one because a tenant improvement allowance arrives as a landlord payment rather than a lower face rent. NPV is a way to keep those differences on one timeline.</p>
            <h2>Deeper explanation</h2>
            <p>Net present value is a standard finance idea: future cash flows are discounted because money due later is not the same as money due now. In a lease comparison, the relevant flows are occupancy costs and incentives attributed to the tenant’s decision — rent, CAM where modeled, abatements, and improvement funding — not a claim that every lease accounting standard has been implemented.</p>
            <p>Finance references describe NPV as the discounted value of future cash flows. See Investopedia’s NPV definition. Accounting standard setters publish related literature; this page does not claim FASB endorsement or a completed ASC 842 product.</p>
            <h2>How it works in a comparison</h2>
            <p>Build the cash-flow stream for each option. Choose a discount rate you can explain. Discount the stream. Compare the results, then test nearby rates so the ranking is not fragile.</p>
            <div className="pv-data-panel" data-visualization="NPV_COMPARISON">
              <table className="pv-compare">
                <caption className="pv-caption">Illustrative cash-flow idea — not customer data</caption>
                <thead><tr><th scope="col">Year</th><th scope="col">Lease A occupancy</th><th scope="col">Present value @ 8%</th></tr></thead>
                <tbody>
                  <tr><th scope="row">1</th><td>$38,000 after free rent</td><td>$35,185</td></tr>
                  <tr><th scope="row">2</th><td>$43,260</td><td>$37,090</td></tr>
                  <tr><th scope="row">3</th><td>$44,558</td><td>$35,360</td></tr>
                </tbody>
              </table>
              <p className="pv-caption">Partial sample only. A full NPV sums every modeled period. Figures are illustrative.</p>
            </div>
            <h2>Example</h2>
            <p>If Lease A has two months of free rent and Lease B has none, year-one cash out the door is not the same even when year-two face rent looks close. NPV makes that timing visible instead of arguing about the starting headline.</p>
            <h2>Common mistakes</h2>
            <ul>
              <li>Discounting rent but ignoring TI and free rent.</li>
              <li>Using a rate nobody can explain to the client.</li>
              <li>Treating the lower NPV as automatic advice to sign.</li>
            </ul>
            <h2>Related concepts</h2>
            <p><a href="/discount-rate-sensitivity">Discount-rate sensitivity</a> and <a href="/compare-commercial-leases">the two-option comparison method</a> are the next steps after the definition.</p>
            <h2>Questions</h2>
            <h3>Is NPV the same as a cap rate?</h3>
            <p>No. A cap rate is a different market shorthand. NPV here is a discounted occupancy-cost tool for comparing specified alternatives.</p>
            <h3>Can I skip NPV and add the years?</h3>
            <p>Undiscounted totals treat a dollar in year five as equal to a dollar this year. That is a different question.</p>
            <AuthorityRefs items={[{ href: "https://www.investopedia.com/terms/n/npv.asp", label: "Investopedia — net present value" }, { href: "https://www.fasb.org/", label: "FASB — financial accounting standards organization" }]} />
            <RelatedContent items={[{ href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/discount-rate-sensitivity", label: "Discount-rate sensitivity" }, { href: "/resources", label: "Resources hub" }]} />
            <p>If you want this comparison in a reusable workspace rather than another spreadsheet, <a href="/how-it-works">see the proposed workflow</a>.</p>
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  };
}

export function tiPageBody(): EducationalSpec {
  return {
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="ti_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">Tenant improvement allowance and occupancy cost</h1>
            <AnswerFirst question="How does a tenant improvement allowance change lease economics?" answer="A tenant improvement allowance is landlord funding for space work. It can lower the tenant’s net cash outlay even when face rent is higher. The allowance should be placed on the same timeline as rent, free rent, and CAM before anyone ranks the options." />
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="ti_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Why it matters</h2>
            <p>Brokers often hear “we will give you $18 per foot.” That sentence is incomplete until you know when the money moves, what it covers, and how the rent schedule changed to fund it. A smaller allowance with cheaper rent can still lose on a present-value basis.</p>
            <h2>Deeper explanation</h2>
            <p>TI is not a trophy number. It is a cash event, sometimes reimbursed after invoices, sometimes applied as a rent credit. If the unused portion expires, the headline allowance overstates the benefit. Industry organizations discuss commercial building practice; this page uses that as context, not as a copied standard.</p>
            <h2>How it belongs in a comparison</h2>
            <p>Put the expected TI cash (or credit) in the period it is likely to occur. Do not subtract it from year-one rent unless that is the actual deal structure. Then recompute occupancy cost and NPV.</p>
            <div className="pv-data-panel" data-visualization="CALCULATION_EXAMPLE">
              <table className="pv-compare">
                <caption className="pv-caption">Illustrative TI versus rent trade — not a customer case</caption>
                <thead><tr><th scope="col">Structure</th><th scope="col">Year-1 rent</th><th scope="col">TI in year 1</th><th scope="col">Net year-1 cash idea</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Higher TI</th><td>$44,000</td><td>$18,000 credit</td><td>$26,000</td></tr>
                  <tr><th scope="row">Lower TI</th><td>$39,000</td><td>$8,000 credit</td><td>$31,000</td></tr>
                </tbody>
              </table>
              <p className="pv-caption">Partial year-one sketch only. Later step-ups can reverse the story. Illustrative — not customer data.</p>
            </div>
            <h2>Common mistakes</h2>
            <ul>
              <li>Advertising the allowance and hiding the rent that funds it.</li>
              <li>Assuming unused TI is kept.</li>
              <li>Comparing TI per square foot across spaces with different usable areas without saying so.</li>
            </ul>
            <p>Next: <a href="/compare-commercial-leases">put TI beside free rent and CAM in one table</a>.</p>
            <AuthorityRefs items={[{ href: "https://www.boma.org/", label: "BOMA — commercial building organization" }]} />
            <RelatedContent items={[{ href: "/commercial-lease-npv", label: "Commercial lease NPV" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/resources", label: "Resources hub" }]} />
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  };
}

export function discountPageBody(): EducationalSpec {
  return {
    body: `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="dr_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">Discount-rate sensitivity in lease NPV</h1>
            <AnswerFirst question="Why does the discount rate change a commercial lease NPV?" answer="The discount rate converts later occupancy costs into today’s dollars. A higher rate reduces the present weight of future step-ups and late incentives, which can change which lease looks cheaper. The rate should stay visible next to the terms." />
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="dr_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Why it matters</h2>
            <p>Two honest models can rank the same pair of leases differently if they silently use different rates. Clients deserve to see the assumption. A sensitivity table is often more useful than a single heroic NPV.</p>
            <h2>Deeper explanation</h2>
            <p>In finance, a discount rate is the rate used to translate future amounts into present value. That is not the Federal Reserve policy rate, and this page does not treat monetary-policy headlines as a lease input. Choose a rate that matches the decision — for example a cost of capital the client already uses — and say so.</p>
            <h2>How to keep the assumption honest</h2>
            <p>Compute NPV at a base rate and at nearby rates. If the ranking flips, the conversation is about risk and timing, not about a single cell.</p>
            <div className="pv-data-panel" data-visualization="DISCOUNT_RATE_SENSITIVITY">
              <table className="pv-compare">
                <caption className="pv-caption">NPV sensitivity — illustrative sample, not customer data</caption>
                <thead><tr><th scope="col">Rate</th><th scope="col">Lease A</th><th scope="col">Lease B</th></tr></thead>
                <tbody>
                  <tr><th scope="row">6%</th><td>$198,100</td><td>$204,400</td></tr>
                  <tr><th scope="row">8%</th><td>$186,400</td><td>$191,220</td></tr>
                  <tr><th scope="row">10%</th><td>$175,900</td><td>$179,050</td></tr>
                </tbody>
              </table>
            </div>
            <h2>Common mistakes</h2>
            <ul>
              <li>Hiding the rate in a named range nobody opens.</li>
              <li>Using an inflated rate to make a preferred building win.</li>
              <li>Confusing this rate with a mortgage interest quote.</li>
            </ul>
            <AuthorityRefs items={[{ href: "https://www.investopedia.com/terms/d/discountrate.asp", label: "Investopedia — discount rate" }]} />
            <RelatedContent items={[{ href: "/commercial-lease-npv", label: "Commercial lease NPV" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/resources", label: "Resources hub" }]} />
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  };
}

export function legalMetadataSource(page: PlannedPage, existing: string): string {
  if (existing.includes("export const metadata")) return existing;
  return `${metadataBlock(page)}\n${existing}`;
}

export function conversionLayoutSource(page: PlannedPage): string {
  return `${metadataBlock(page)}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
`;
}
