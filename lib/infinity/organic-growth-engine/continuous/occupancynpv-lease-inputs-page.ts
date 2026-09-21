import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import {
  buildConnectedSchemaGraph,
  occupancynpvOrganization,
  type SchemaFaqItem,
} from "./schema-standard";
import { FIRST_LEASE_INPUTS_QUESTION, FIRST_LEASE_INPUTS_ROUTE } from "../obligation/opportunity";
import type { OrganicDraft } from "./quality";

export const OCCUPANCYNPV_LEASE_INPUTS_QUESTION = FIRST_LEASE_INPUTS_QUESTION;
export const OCCUPANCYNPV_LEASE_INPUTS_PATH = FIRST_LEASE_INPUTS_ROUTE;
export const OCCUPANCYNPV_LEASE_INPUTS_DIRECT_ANSWER =
  "Collect the same cash figures from each lease: starting rent, term, increases, free rent, tenant-improvement money, extras the tenant still pays, and any move or downtime cost. Rent alone is not a comparison." as const;

export function occupancynpvLeaseInputsPage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_LEASE_INPUTS_PATH.replace(/\/+$/, ""),
    role: "QUESTION_PAGE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/lease-comparison",
    title: "What numbers do you need to compare two commercial leases?",
    metaDescription:
      "A working input list for comparing two commercial leases: rent, term, increases, concessions, extras, move costs, and what to take from the lease itself.",
    canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "lease-comparison",
    pageOpportunityId: "organic-v2-live-lease-inputs",
  };
}

export function occupancynpvLeaseInputsFaqs(): SchemaFaqItem[] {
  return [
    {
      question: "Can OccupancyNPV compare two real lease proposals?",
      answer: "Yes, after you enter the same occupancy-cost fields from each proposal. OccupancyNPV puts both paths on one timeline. It does not invent a missing bid and does not replace reading the lease.",
    },
    {
      question: "Is this legal or financial advice?",
      answer: "No. Use the figures in the lease proposals and confirm final terms against the actual lease documents with counsel or your accountant when needed.",
    },
  ];
}

export function occupancynpvLeaseInputsCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Lease comparison", item: "/lease-comparison/" },
    { name: OCCUPANCYNPV_LEASE_INPUTS_QUESTION, item: OCCUPANCYNPV_LEASE_INPUTS_PATH },
  ];
}

export function occupancynpvLeaseInputsSchema() {
  const page = occupancynpvLeaseInputsPage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "EVERGREEN_RESOURCE",
      url: OCCUPANCYNPV_LEASE_INPUTS_PATH,
      canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_LEASE_INPUTS_QUESTION,
      breadcrumbs: occupancynpvLeaseInputsCrumbs(),
      visible_breadcrumbs: occupancynpvLeaseInputsCrumbs(),
      speakable_css_selectors: ["#direct-answer", "#only-rent", "#from-the-lease", "#key-takeaways"],
      faqs: occupancynpvLeaseInputsFaqs(),
      visible_faqs: occupancynpvLeaseInputsFaqs(),
      date_published: "2026-09-20",
      date_modified: "2026-09-20",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["commercial lease comparison", "occupancy cost inputs"],
      mentions: ["base rent", "CAM", "tenant improvement", "move costs", "commercial lease NPV"],
      article_section: "Lease comparison",
      link_canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
    },
  });
}

export function occupancynpvLeaseInputsPageSource(): string {
  const page = occupancynpvLeaseInputsPage();
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/lease-comparison", label: "Lease comparison" },
    { href: page.route, label: OCCUPANCYNPV_LEASE_INPUTS_QUESTION },
  ];
  const sources = [
    { href: "https://www.gsa.gov/real-estate/real-estate-services/leasing-policy", label: "GSA — leasing policy" },
    { href: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space", label: "SBA — renting commercial space" },
    { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "How do you compare two commercial lease options?" },
  ];
  const body = `
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as page context. Not a customer photo." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">Lease comparison</p>
            <h1 className="pv-display">${OCCUPANCYNPV_LEASE_INPUTS_QUESTION}</h1>
            <div id="direct-answer" data-question-id="what-numbers-do-you-need-to-compare-two-commercial-leases" data-answer-chunk-id="lease-inputs_chunk" data-citation-ready="true">
              <p>${OCCUPANCYNPV_LEASE_INPUTS_DIRECT_ANSWER}</p>
            </div>
            <p>If the two proposals are already on your desk, gather the same fields from both before you argue about which one is cheaper.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p>Use the same input list on both options, then put the cash on one timeline.</p>
              <p><PrimaryCTA href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">See how the comparison is built</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <nav className="pv-toc pv-section" aria-label="On this page" data-section-type="NAVIGATION" data-section-id="toc">
          <div className="vg-container pv-reading">
            <p className="pv-toc-label">On this page</p>
            <ol className="pv-toc-list">
              <li><a href="#inputs">Input checklist</a></li>
              <li><a href="#only-rent">Do you only need rent?</a></li>
              <li><a href="#recurring-vs-onetime">Recurring vs one-time</a></li>
              <li><a href="#missing-number">Missing numbers</a></li>
              <li><a href="#lower-rent-higher-cost">Why lower rent can cost more</a></li>
              <li><a href="#occupancynpv-needs">What OccupancyNPV needs</a></li>
            </ol>
          </div>
        </nav>
        <section className="pv-section" data-section-type="CHECKLIST" data-section-id="inputs" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="inputs">Quick lease input checklist</h2>
            <p>Use this as a working sheet. Add two columns in your own note for Lease A and Lease B. Leave a cell blank if the document does not state the number. Do not invent a market average to finish the row.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="INPUT_CHECKLIST">
              <table className="pv-fin-table">
                <caption className="pv-caption">Inputs to gather from each commercial lease proposal</caption>
                <thead>
                  <tr><th scope="col">Input</th><th scope="col">Recurring / One-time</th><th scope="col">Where to find it</th><th scope="col">Why it matters</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Starting rent</th><td>Recurring</td><td>Rent exhibit or term sheet</td><td>First cash line. Not the whole story.</td></tr>
                  <tr><th scope="row">Term start and end</th><td>Sets the window</td><td>Commencement and expiration clauses</td><td>How many years of cash sit on the timeline.</td></tr>
                  <tr><th scope="row">Increase rule</th><td>Recurring change</td><td>Rent adjustment clause</td><td>Steps, percent, or CPI change later rent.</td></tr>
                  <tr><th scope="row">Free rent / abatement</th><td>Timing of a skip</td><td>Concession exhibit</td><td>When rent is skipped changes present cost.</td></tr>
                  <tr><th scope="row">Tenant-improvement money</th><td>One-time concession</td><td>Work letter or TI exhibit</td><td>Who pays buildout changes net cash out.</td></tr>
                  <tr><th scope="row">CAM / extras tenant pays</th><td>Recurring</td><td>Expense or net-lease article</td><td>Net leases hide cost if you stop at face rent.</td></tr>
                  <tr><th scope="row">Taxes and insurance share</th><td>Recurring if tenant pays</td><td>Tax and insurance clauses</td><td>Include only when the tenant is responsible.</td></tr>
                  <tr><th scope="row">Move / buildout / downtime</th><td>One-time</td><td>Mover bid, contractor bid, your calendar</td><td>One-time cash can flip a cheaper-looking rent.</td></tr>
                </tbody>
              </table>
            </div>
            <aside className="pv-callout" id="key-takeaways" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>Fill the same rows for both leases. A missing move-cost cell is more honest than a guessed one.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="only-rent" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="only-rent">Do you only need rent to compare two commercial leases?</h2>
            <p data-citation-ready="true">No. Base rent is only one cash line in a commercial lease comparison. Rent increases, operating extras the tenant pays, concessions, moving costs, buildout costs, and downtime can change which option costs less over the term.</p>
            <p>Base rent is the starting occupancy payment. Total occupancy cost is that payment plus the other cash that belongs on the same timeline. The checklist below this answer is the working list. The comparison process page ranks the two completed timelines; this page is what those timelines need.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="rent" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="starting-rent">What starting or base rent should you gather?</h2>
            <p data-citation-ready="true">Write the starting rent as it appears on the proposal: monthly or annual, per square foot or lump sum. Convert both options to the same unit before you compare.</p>
            <p>Find it on the rent exhibit or the broker term sheet. If one proposal quotes rentable square feet and the other quotes usable, do not add those two rents until the unit of space matches.</p>
            <p>Later concessions and extras sit on top of this line. If rent changes by suite or by year one versus later years, capture the schedule, not a single “about $X” headline. The common mistake is treating face rent as the comparison.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="term" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="lease-term">What lease terms should you gather before comparing options?</h2>
            <p data-citation-ready="true">Record commencement, expiration, and any early-occupancy or holdover period you are actually using. Term is the window of cash, not a label on the cover page.</p>
            <p>Those dates live in the commencement and expiration clauses. A five-year stay and a seven-year stay are different cash streams even when month-one rent looks similar.</p>
            <p>If you will only occupy three years of a five-year paper term, say so on the sheet. The unused years should not silently sit in the model. The common mistake is ranking a longer paper term as if you will pay every year.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="increases" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2 id="rent-increases">How do annual rent increases affect the comparison?</h2>
            <p data-citation-ready="true">Copy the increase rule from the lease: a fixed step, a stated percent each year, or a CPI-based adjustment. An option that looks cheaper in year one can cost more later if the step is steeper.</p>
            <p>Find it in the rent-adjustment clause. Do not treat “increases annually” as 3 percent unless the document says so. An option that looks cheaper in year one can cost more later if the step is steeper.</p>
            <p>This page does not interpret legal clauses. If the CPI language is unclear, mark the cell as unresolved and get the number from the proposal or counsel before you rank the options.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="free-rent" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="free-rent">How should free rent or rent abatement be treated?</h2>
            <p data-citation-ready="true">Write the number of free months and when they occur. Three free months at the start is not the same as three free months in year four. The later skip is worth less in today’s dollars because the cash is farther away.</p>
            <p>Find the dates on the concession exhibit. If free rent applies only to base rent and not to CAM, say that. Mixing a “gross-looking” free period with a net expense stop will understate occupancy cost.</p>
            <p>The common mistake is subtracting three months of rent from the total and stopping, without placing the skip on the timeline.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="ti" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="ti">Do tenant improvement allowances affect the comparison?</h2>
            <p data-citation-ready="true">Yes, when the allowance changes cash you would otherwise pay. Record the amount, what work it covers, and who pays overages. A higher face rent with a larger TI check can still be cheaper if you would have paid for that work yourself.</p>
            <p>Find it in the work letter or TI exhibit. OccupancyNPV compares occupancy-cost cash. It does not replace a contractor bid. If the buildout cost is unknown, leave the overage cell blank and treat TI as the stated landlord check only.</p>
            <p>Other landlord concessions belong on the same sheet when they change cash: moving allowances, unused free-rent conversion, or a waived restoration obligation. Do not count a concession twice.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="cam" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="cam">Should CAM or operating expenses be included?</h2>
            <p data-citation-ready="true">Yes, when the tenant pays common-area maintenance, utilities, or a share of operating expenses. Those lines belong on the same timeline as rent. A lower face rent on a net deal can lose to a higher full-service rent once extras are included.</p>
            <p>Find the language in the expense or net-lease article. See <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">what CAM means in a commercial lease</a> when the proposal uses that term. Do not drop CAM because it is “not rent.”</p>
            <p>If last year’s CAM is stated and next year’s is not, copy the stated figure and label the later years as unresolved. Do not grow CAM by a guessed percent to finish the model.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="taxes" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2 id="tax-insurance">Should taxes and insurance be included?</h2>
            <p data-citation-ready="true">Include real-estate taxes and insurance only when the tenant is responsible for them. If both options are full-service and those costs sit with the landlord, you do not need a separate tax row.</p>
            <p>Find the obligation in the tax and insurance clauses. If one option is net and the other is gross, put the tenant-paid extras on the net option before you compare. Skipping that step is how a “cheaper” net rent wins on paper and loses in cash.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="upfront" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="one-time-costs">What one-time costs should you include?</h2>
            <p data-citation-ready="true">Include deposits, tenant-paid buildout above the allowance, furniture, technology relocation, and one-time professional fees when you will actually spend them to occupy the space. Security deposits belong as cash out; do not assume a refund date unless the lease states it.</p>
            <p>Put only the costs that differ between the two options, or that you would not spend if you stayed. If you do not have the bid, leave the cell empty. Do not invent a furniture line.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="move" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="moving-costs">Should moving costs be included?</h2>
            <p data-citation-ready="true">Yes, when a move is required to take the space. Write the mover bid, duplicate-occupancy overlap, furniture and technology relocation if they are real bids, and any landlord-required restoration on the current space.</p>
            <p>If you are staying, those cells are usually zero. If you are relocating, they belong on the new option even when the rent sheet looks cheaper. Leaving move cost off because it is “not rent” is a comparison error.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="downtime" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="downtime">How does downtime affect a relocation comparison?</h2>
            <p data-citation-ready="true">Downtime is a financial assumption: lost use of the space, delayed opening, or paying rent in two places. If the move will take the shop offline, estimate that cost and label it as an assumption. It is not a legal conclusion.</p>
            <p>If both options keep you open the whole time, skip the row. Optional fields stay optional. Do not treat downtime as a guaranteed result.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="renew-relocate" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2 id="renewal-vs-relocation">How do you compare a renewal against a relocation?</h2>
            <p data-citation-ready="true">Use the same input list on both paths, then add stay-specific or move-specific cash. A renewal may add a restoration waiver or a lower tenant-improvement check. A relocation adds move cost, downtime, and any remaining obligation on the current lease.</p>
            <p>This page is the input list. The ranking steps live on the <a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">comparison process page</a>.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="timing" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="timing">Does the timing of lease payments matter?</h2>
            <p data-citation-ready="true">Yes. Money paid in month one is not the same as money paid in year five. Free rent, tenant-improvement checks, and move bids usually hit early. Escalations hit later. That is why a lower rent can still be the worse option after year-one cash is counted.</p>
            <p>This checklist does not teach the full NPV method. For the calculation, use <a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">What is NPV in a commercial lease?</a>.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="CHECKLIST" data-section-id="recurring" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="recurring-vs-onetime">How should recurring costs differ from one-time costs?</h2>
            <p data-citation-ready="true">Separate the lines that repeat from the lines that happen once. Recurring cost, such as rent or tenant-paid CAM, changes the whole term. One-time cost, such as a move bid or deposit, can dominate year one and then disappear.</p>
            <div className="pv-table-shell pv-wide-module" data-visualization="RECURRING_VS_ONETIME">
              <table className="pv-fin-table">
                <caption className="pv-caption">How to classify the usual occupancy lines</caption>
                <thead><tr><th scope="col">Line</th><th scope="col">Kind</th><th scope="col">How it affects cash flow</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Starting rent, CAM, tenant-paid tax or insurance</th><td>Recurring</td><td>Hits every period you occupy.</td></tr>
                  <tr><th scope="row">Increases</th><td>Recurring change</td><td>Raises later periods.</td></tr>
                  <tr><th scope="row">Free rent</th><td>Timing of a skip</td><td>Removes selected recurring payments.</td></tr>
                  <tr><th scope="row">TI, move, buildout overage, furniture, professional fees</th><td>One-time</td><td>Usually paid near commencement.</td></tr>
                  <tr><th scope="row">Downtime or duplicate occupancy</th><td>One-time assumption</td><td>Label it. Do not treat it as a lease fact.</td></tr>
                  <tr><th scope="row">Deposits</th><td>One-time, sometimes returned</td><td>Count the cash out. Do not assume the refund date unless the lease states it.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="missing" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="missing-number">What should you do if one proposal leaves out a number?</h2>
            <p data-citation-ready="true">Leave the cell blank. Do not invent a market average, a standard 3 percent increase, or a typical move cost to finish the sheet. A blank cell shows the ranking is incomplete. A guessed cell hides that.</p>
            <p>If the missing item is small and identical on both options, you can omit it from the comparison. If it differs, or if only one option has it, you cannot rank until you have the figure or you explicitly hold the ranking as unresolved.</p>
            <p>Do not ask OccupancyNPV to invent the missing bid. Enter what you have. Label assumptions. Confirm the rest against the actual lease documents.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="lower-rent" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2 id="lower-rent-higher-cost">Why can the lease with the lower rent still cost more?</h2>
            <p data-citation-ready="true">A lower monthly rent can still be the more expensive occupancy path once increases, extras the tenant pays, move costs, buildout, or downtime sit on the same timeline. Year-one cash can be higher even when the rent line looks cheaper.</p>
            <p>The teaching sample below keeps the arithmetic visible. It is labeled fictional. It does not name a discounted winner.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="DEFAULT">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked teaching sample</h2>
              <p>This is a labeled fictional sample. It is not a market average and not a customer result. OccupancyNPV does not guarantee which option wins.</p>
              <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE">
                <table className="pv-fin-table">
                  <caption className="pv-caption">Fictional two-lease input set</caption>
                  <thead><tr><th scope="col">Input</th><th scope="col">Lease A stay</th><th scope="col">Lease B move</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Starting rent</th><td>$8,000 / month</td><td>$7,000 / month</td></tr>
                    <tr><th scope="row">Term</th><td>5 years</td><td>5 years</td></tr>
                    <tr><th scope="row">Annual increase</th><td>3 percent</td><td>3 percent</td></tr>
                    <tr><th scope="row">Move / buildout</th><td>$0</td><td>$40,000</td></tr>
                    <tr><th scope="row">Downtime assumption</th><td>None</td><td>Some lost use during the move</td></tr>
                  </tbody>
                </table>
              </div>
              <p>If you only compare monthly rent, Lease B looks cheaper: $7,000 versus $8,000. Five-year rent before increases is $8,000 × 12 × 5 = $480,000 on Lease A and $7,000 × 12 × 5 = $420,000 on Lease B. The rent gap is $60,000.</p>
              <p>Lease B also pays $40,000 to move. Undiscounted occupancy cash before downtime is then $480,000 on A and $460,000 on B. Year-one cash is $96,000 on A and $84,000 + $40,000 = $124,000 on B. Lease B spends more in year one even though the monthly rent is lower.</p>
              <p>A later occupancy-cost comparison still has to place those dollars on a timeline and include any downtime assumption. This sample does not name a winner after discounting. It shows why monthly rent alone can mislead.</p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="mistakes">What are common mistakes when comparing leases?</h2>
            <ul>
              <li>Comparing face rent and stopping.</li>
              <li>Using different space units on the two proposals.</li>
              <li>Ignoring when free rent occurs.</li>
              <li>Leaving CAM off a net deal.</li>
              <li>Guessing a move cost instead of leaving the cell blank.</li>
              <li>Counting a landlord concession twice.</li>
              <li>Treating a property cap rate as the lease comparison.</li>
            </ul>
            <p>Each of those mistakes can make a cheaper-looking rent win on paper and lose once the same cash is on one timeline.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="CHECKLIST" data-section-id="verify" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="from-the-lease">What numbers should come directly from the lease proposal?</h2>
            <p data-citation-ready="true">Take starting rent, term dates, increase language, free-rent dates, tenant-improvement amounts, and who pays taxes, insurance, and CAM from the proposals or the signed lease. Estimate only items the documents do not state, and label those estimates.</p>
            <p>Confirm the proposal rent, the increase clause, the free-rent dates, the TI exhibit, and the expense-stop language against the actual lease documents before you decide.</p>
            <p>This resource is not legal advice, tax advice, or a substitute for reading the lease with counsel or your accountant.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="PRODUCT" data-section-id="product" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2 id="occupancynpv-needs">What information does OccupancyNPV need?</h2>
            <p data-citation-ready="true">OccupancyNPV needs the same cash fields you would put on one timeline: rent, term, increases, concessions, extras the tenant pays, and one-time occupancy costs such as moving or downtime. It does not invent missing bids. The live offer is a 3-day free trial with no credit card and no automatic billing.</p>
            <p>The live offer is a 3-day free trial with no credit card and no automatic billing. Start here: <a href="/pricing">occupancynpv.com/pricing</a>.</p>
            <RelatedContent items={[
              { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "How do you compare two commercial lease options?" },
              { href: "/compare-commercial-leases", label: "Compare commercial leases" },
              { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV in a commercial lease?" },
              { href: "/occupancy-costs/what-is-cam-in-a-commercial-lease/", label: "What is CAM in a commercial lease?" },
              { href: "/pricing", label: "OccupancyNPV pricing and trial" },
            ]} />
            <p><PrimaryCTA href="/pricing">Start free trial</PrimaryCTA></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="FAQ" data-section-id="faq" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>FAQ</h2>
            ${occupancynpvLeaseInputsFaqs().map((row) => `<div><h3>${row.question}</h3><p>${row.answer}</p></div>`).join("\n            ")}
          </div>
        </section>
        <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
          <h2>Trusted sources</h2>
          <p>These are public references for commercial occupancy decisions. They are not endorsements and not customer results.</p>
          <AuthorityRefs items={${JSON.stringify(sources)}} />
        </section>
        <Disclosure>Use the figures in your lease proposals and confirm final terms against the actual lease documents.</Disclosure>`;
  return innerPageShell({ page, importDepth: "../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvLeaseInputsDraftText(): string {
  return [
    OCCUPANCYNPV_LEASE_INPUTS_DIRECT_ANSWER,
    "Quick checklist rows: starting rent, term, increase rule, free rent, tenant-improvement money, CAM or extras, taxes and insurance if the tenant pays them, and move or downtime costs. Separate recurring from one-time. Copy this sheet and leave a cell blank if the document does not state the number. Do not invent a market average.",
    "Write the starting rent as it appears on the proposal in matching units. Record commencement and expiration. Copy the increase rule instead of assuming 3 percent. Write the number of free months and when they occur. Record the allowance and who pays overages.",
    "CAM belongs on a net deal. Include real-estate taxes and insurance only when the tenant is responsible. Put only the upfront costs that differ. Write the mover bid. Estimate downtime and label it as an assumption.",
    "Two leases can pay the same dollars and still rank differently once you place those dollars on a timeline. Recurring cost hits every period. One-time cost can dominate year one.",
    "Leave the cell blank when a number is missing. Do not invent and do not guess. Confirm final terms against the actual lease documents.",
    "Fictional sample: $8,000 stay versus $7,000 move plus $40,000 of move cost. Five-year rent before increases is $480,000 versus $420,000. Year-one cash is $96,000 versus $124,000. Monthly rent alone can mislead. OccupancyNPV does not guarantee a winner.",
    "Common mistakes include rent-only comparison, mixed space units, ignored free-rent timing, leaving CAM off, counting a concession twice, and guessing a move cost.",
    "OccupancyNPV puts both occupancy-cost paths on one timeline. It does not invent missing bids. The 3-day free trial has no credit card and no automatic billing. Start at /pricing.",
    "This is not a full property valuation. NOI, vacancy, operating expenses, property value, and interest-rate assumptions belong in a building screen, not in the first occupancy-cost checklist.",
    "Related pages: the comparison process, lease NPV, CAM, and pricing.",
  ].join(" ");
}

export function occupancynpvLeaseInputsDraft(): OrganicDraft {
  const page = occupancynpvLeaseInputsPage();
  const body = occupancynpvLeaseInputsDraftText();
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_LEASE_INPUTS_QUESTION,
    headings: [
      "Do you only need rent to compare two commercial leases?",
      "What lease terms should you gather before comparing options?",
      "How do annual rent increases affect the comparison?",
      "How should free rent or rent abatement be treated?",
      "Do tenant improvement allowances affect the comparison?",
      "Should CAM or operating expenses be included?",
      "What one-time costs should you include?",
      "Should moving costs be included?",
      "How does downtime affect a relocation comparison?",
      "What should you do if one proposal leaves out a number?",
      "What numbers should come directly from the lease proposal?",
      "Why can the lease with the lower rent still cost more?",
      "What information does OccupancyNPV need?",
      "What are common mistakes when comparing leases?",
    ],
    body,
    direct_answer: OCCUPANCYNPV_LEASE_INPUTS_DIRECT_ANSWER,
    citations: [
      {
        source: "https://www.gsa.gov/real-estate/real-estate-services/leasing-policy",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-20",
        claim: "Commercial lease decisions depend on documented occupancy terms",
      },
      {
        source: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-20",
        claim: "Renting commercial space requires comparing occupancy terms, not rent alone",
      },
    ],
    schema: page.schemaTypes,
    canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
    breadcrumbs: ["Home", "Lease comparison", OCCUPANCYNPV_LEASE_INPUTS_QUESTION],
    internal_links: [
      "/lease-comparison/",
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
      "/compare-commercial-leases",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
      "/pricing",
    ],
    word_count: body.split(/\s+/).length,
    visible_faqs: occupancynpvLeaseInputsFaqs(),
    speakable_selectors: ["#direct-answer", "#only-rent", "#from-the-lease", "#key-takeaways"],
    date_published: "2026-09-20",
    date_modified: "2026-09-20",
    page_kind: "EVERGREEN_RESOURCE",
    origin: "https://occupancynpv.com",
    about: ["commercial lease comparison", "occupancy cost inputs"],
    mentions: ["base rent", "CAM", "move costs", "commercial lease NPV"],
  };
}
