import type { PlannedPage } from "./types";
import {
  answer,
  authorityBlock,
  cashFlowTable,
  commercialClose,
  COMMON_SOURCES,
  depthExpansion,
  educationalScaffold,
  leaseAbTable,
  relatedBlock,
  successorShell,
} from "./page-sources-successor-shared";

export function successorHomepageSource(page: PlannedPage, lineage: { artifactId: string; experimentId: string }): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-hero--split" data-section-type="HERO" data-section-id="sec_hero" data-pattern-id="FOCUSED_HERO" data-design-archetype="FINANCIAL_B2B_ANALYTICAL" data-hero-variant="PRODUCT_SPLIT_HERO" data-artifact-id="${lineage.artifactId}" data-experiment-id="${lineage.experimentId}" data-cta="Request Pilot Access">
          <div className="vg-container pv-hero-grid">
            <div>
              <p className="pv-eyebrow">For tenant-rep and boutique CRE brokers</p>
              <h1 className="pv-display">Compare commercial lease economics without rebuilding the spreadsheet.</h1>
              <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
              ${answer("Who is this lease comparison workflow for?", "This focused workflow is for tenant-rep brokers, independent CRE brokers, and boutique advisory teams who currently rebuild lease workbooks deal by deal and need a shareable occupancy-cost comparison.")}
              <p className="pv-lede">A focused early-validation workflow for comparing commercial lease economics — rent, CAM, tenant improvement allowance, free rent, escalations, NPV, and discount-rate sensitivity. This is an early validation / pilot concept, not a finished product.</p>
            </div>
            <ProductUiFrame title="Proposed lease comparison workspace" caption="Illustrative sample — not customer data. Proposed workflow visualization, not a production screenshot.">
              ${leaseAbTable("home_lease_ab")}
            </ProductUiFrame>
          </div>
        </header>
        <section className="pv-section" data-section-type="PROBLEM" data-section-id="sec_problem" data-pattern-id="LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE">
          <div className="vg-container pv-prose">
            <h2>The core problem</h2>
            <p>Tenant-representation work still starts with a rebuilt spreadsheet. Face rent is copied from a proposal. Free rent lives in an email. Tenant improvement allowance sits in a term-sheet footnote. CAM is estimated in a separate tab. Discount-rate cases, if they exist, hide in a named range nobody opens.</p>
            <p>The cost of the current workflow is not just time. Deal by deal, a hidden cell changes the ranking. The client receives a headline instead of a cash-flow argument. The broker cannot show what happens when the discount rate moves two points. Each new option rebuilds a workbook instead of updating one comparison.</p>
            <h2>Why spreadsheet-based lease comparison breaks down</h2>
            <p>Spreadsheets are honest tools. They fail as a shared method because the method is not shared. One analyst discounts annual totals. Another ignores CAM. A third subtracts TI from year-one rent even when the allowance is paid after invoices. The ranking becomes a function of the last person who touched the file.</p>
            <h2>Why face rent alone misleads</h2>
            <p>Face rent is the starting headline. It does not tell you when cash moves. A lower start rent with faster escalations, thinner TI, and shorter free rent can cost more on a present-value basis. Separate emails and a separate tab cannot keep those pieces on one occupancy-cost timeline.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="sec_mechanism" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-section-variant="WORKFLOW_TRANSFORMATION" data-visualization="WORKFLOW_DIAGRAM">
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
        <section className="pv-section" data-section-type="PRODUCT_PREVIEW" data-section-id="sec_how" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>How the workflow operates</h2>
            <ol>
              <li>Broker inputs: measurement period, discount rate, and the client-facing labels that will appear on the summary.</li>
              <li>Lease inputs: start rent, term, escalations, tenant improvement allowance, free rent, and CAM for each option.</li>
              <li>Term normalization and cash-flow generation so a twenty-four-month deal is not compared as a slogan against a sixty-month deal.</li>
              <li>NPV and sensitivity analysis with the rate still visible beside the terms.</li>
              <li>A client-facing summary that keeps cash-flow, ranking, and caveats together.</li>
            </ol>
            <h2>Product demonstration</h2>
            <p>The proposed interface is a comparison workspace, not a CRM and not a property-management system. Cash-flow compare, NPV + sensitivity, and the client summary stay on one screen so the ranking is not an artifact of a hidden cell.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="COMPARISON" data-section-id="sec_example" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <h2>Lease A versus Lease B — worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. These figures are educational samples, not customer results.</p>
            ${leaseAbTable("home_example")}
            ${cashFlowTable("home_cf")}
            <div className="pv-data-panel" data-visualization="NPV_COMPARISON">
              <p>At an 8% discount rate, Lease A’s illustrative NPV is $186,400 and Lease B’s is $191,220. Lease B starts cheaper. After faster step-ups, a smaller improvement allowance, and less free rent, its occupancy-cost present value is higher.</p>
            </div>
            <div className="pv-bar" aria-hidden="true" data-visualization="FINANCIAL_COMPARISON"><span style={{ width: "78%" }} /></div>
          </div>
        </section>
        <section className="pv-section" data-section-type="FEATURES" data-section-id="sec_value" data-pattern-id="MODULAR_COMMERCE_STRUCTURE">
          <div className="vg-container">
            <h2>Value stack</h2>
            <div className="pv-metric-strip" data-visualization="METRIC_STRIP">
              <article className="pv-surface"><h3>Cash-flow compare</h3><p>Side-by-side occupancy cost, not a CRM.</p></article>
              <article className="pv-surface"><h3>NPV + sensitivity</h3><p>Discount-rate cases stay next to the terms.</p></article>
              <article className="pv-surface"><h3>Client summary</h3><p>A shareable view of the comparison, not a PMS.</p></article>
              <article className="pv-surface"><h3>Incentive timing</h3><p>TI, free rent, and CAM stay on the same timeline.</p></article>
            </div>
            <div className="pv-prose">
              <h2>Benefits</h2>
              <p>The proposed product keeps cash-flow visible, keeps the discount-rate assumption visible, and produces a client-facing summary. Sensitivity stays visible so a ranking flip is a conversation, not a surprise.</p>
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
              <p>The big promise is a truthful one: compare commercial lease economics without rebuilding the spreadsheet, with NPV, cash-flow, and a client-facing summary in one focused workflow. The problem cost is the deal-by-deal rebuild. Why current method fails is the separate tab and the headline. The product workflow is capture, normalize, discount, and share. The cta sequence repeats at readiness points. Use cases are tenant-rep comparisons. Comparison and mechanism stay visible. Objection handling, disclosure, authority, and faq sit after who not for and pricing.</p>
              ${answer("Who is this not for?", "This lease comparison workflow is not for landlords, not for property managers, and not for teams that need enterprise lease administration. It is also not for anyone expecting a finished product with payment collected on this site.")}
            <p>who is this not for: not for landlords and not for property managers looking for administration software.</p>
              <h2>Pricing hypothesis</h2>
              <p>Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.</p>
              ${relatedBlock([{ href: "/commercial-lease-npv", label: "What NPV means in a commercial lease" }, { href: "/compare-commercial-leases", label: "How to compare two lease options" }, { href: "/how-it-works", label: "How the proposed workflow works" }, { href: "/for/tenant-rep-brokers", label: "For tenant-rep brokers" }, { href: "/resources", label: "Browse the resources hub" }])}
            </div>
          </div>
        </section>
        ${commercialClose([{ href: "/how-it-works", label: "See the proposed workflow" }, { href: "/for/tenant-rep-brokers", label: "Tenant-rep broker page" }])}
`,
    "../",
  );
}

export function successorHowItWorksSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="HERO" data-section-id="hiw_hero" data-pattern-id="FOCUSED_HERO">
          <div className="vg-container">
            <p className="pv-eyebrow">How it works</p>
            <h1 className="pv-display">From scattered terms to a shareable comparison without rebuilding the spreadsheet</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            ${answer("How does the proposed workflow capture lease terms?", "The proposed workflow captures each option’s rent schedule, CAM, tenant improvement allowance, free rent, and escalations, then places them on one cash-flow timeline so tenant-rep brokers can discount that stream to NPV at an explicit rate.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="hiw_steps" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-visualization="WORKFLOW_DIAGRAM">
          <div className="vg-container pv-prose">
            <h2>The problem the current method creates</h2>
            <p>Deal by deal, a hidden cell changes the ranking. Brokers rebuild a workbook. Discount-rate cases live in a separate tab. Face rent becomes the headline because the rest of the file is too fragile to share.</p>
            <h2>Broker inputs and lease inputs</h2>
            <p>Broker inputs are the measurement period, the discount rate the client can explain, and the labels that will appear on the client summary. Lease inputs are start rent, term, escalations, tenant improvement allowance, free rent, and CAM. Missing fields stay visible instead of disappearing into a hidden cell.</p>
            <h2>Term normalization and cash-flow generation</h2>
            <p>A thirty-six-month option and a sixty-month option cannot be ranked by adding the printed years. The workflow normalizes the shared occupancy window, then generates a cash-flow stream for each option so when cash moves is explicit.</p>
            <h2>TI, free rent, CAM, and escalations</h2>
            <p>Tenant improvement allowance is a timed cash event, not a brochure number. Free rent changes year-one occupancy cost and the later step-up base. CAM belongs in occupancy cost when the tenant pays it. Escalations change later periods and can flip a ranking when discounted.</p>
            <h2>NPV, sensitivity, comparison, and client summary</h2>
            <p>NPV converts the cash-flow stream into today’s dollars. Sensitivity analysis keeps the rate visible so a ranking flip is not an artifact of one assumption. The comparison and the client-facing summary stay next to those cases.</p>
            <div className="pv-workflow">
              <article className="pv-surface"><h3>Before</h3><p>Each deal rebuilds a workbook. Discount-rate cases live in a separate tab, if they exist at all.</p></article>
              <p aria-hidden="true">→</p>
              <article className="pv-surface"><h3>Proposed after</h3><p>One comparison workspace. Cash-flow compare, NPV + sensitivity, and the client summary stay together.</p></article>
            </div>
            <ProductUiFrame title="Proposed workflow sequence" caption="Illustrative sample — not a production screenshot.">
              ${leaseAbTable("hiw_ui")}
            </ProductUiFrame>
            <h2>Worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. Lease A starts at $42,000 with two months of free rent and $18,000 of TI. Lease B starts cheaper, escalates faster, and offers less TI. After discounting the cash-flow stream at 8%, Lease A’s illustrative NPV is lower.</p>
            ${cashFlowTable("hiw_cf")}
            <h2>What the proposed product does</h2>
            <p>It keeps cash-flow, NPV, and sensitivity in one workspace and produces a shareable summary for tenant-rep conversations. Pricing hypotheses are $290 per year or $149 per deal. Payment is not collected.</p>
            <h2>What it does not do</h2>
            <p>It does not administer leases, run a CRM, produce ASC 842 entries, or give legal advice. It is not a finished product.</p>
            <h2>Limitations and objections</h2>
            <p>NPV does not capture every qualitative consideration. A lower NPV is not automatically the better occupancy choice. Separate emails still exist for legal review; this workflow does not replace counsel.</p>
            <p>Positioning: this is a focused workflow, not a brokerage suite. Product visualization stays next to the steps. Benefits include a client-facing summary. Use cases are tenant-rep comparisons. Trust or disclosure: not a finished product, payment is not collected, not legal advice.</p>
            ${educationalScaffold("the proposed comparison workflow")}
            ${depthExpansion("the proposed comparison workflow", "Broker inputs and lease inputs are different jobs. The broker sets the window and the rate. The leases supply rent, CAM, TI, free rent, and escalations. Term normalization is the unglamorous step that prevents a short cheap deal from winning by omitting later years. Cash-flow generation is where incentives stop being slogans. NPV is the sum. Sensitivity is the honesty check. The client summary is the artifact the meeting can survive.")}
            ${commercialClose([{ href: "/compare-commercial-leases", label: "Compare two commercial leases" }, { href: "/commercial-lease-npv", label: "What NPV means in a commercial lease" }])}
          </div>
        </section>`,
  );
}

export function successorCompareSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="HERO" data-section-id="cmp_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Comparison</p>
            <h1 className="pv-display">Compare commercial leases on one occupancy-cost basis without rebuilding the spreadsheet</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            ${answer("How should two commercial leases be compared?", "Compare options on a shared occupancy-cost timeline: rent, escalations, tenant improvement allowance, free rent, and CAM, then discount that stream to NPV at an explicit rate. Face rent alone hides timing and incentive differences.")}
            ${answer("How do you compare leases with different terms?", "Lock the same measurement period, place incentives on the cash-flow timeline, choose a discount rate you can explain, and test nearby rates so a shorter term is not treated as automatically cheaper.")}
            ${answer("How do you compare leases with different lease terms?", "Different lease terms require a shared occupancy window before NPV is computed. A five-year stream and a three-year stream are not comparable until the unmodeled years are stated as an assumption.")}
            ${answer("What is occupancy cost?", "Occupancy cost is the tenant’s economic cost of occupying the space: base rent, CAM or operating expenses where the tenant pays them, and the timed effect of free rent and tenant improvement allowance.")}
            ${answer("How should lease incentives be timed in a model?", "Lease incentives should be placed in the period when cash actually moves. Free rent reduces early rent. Tenant improvement allowance is a credit or reimbursement, not a slogan subtracted from face rent unless that is the deal structure.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="COMPARISON" data-section-id="cmp_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Face rent, base rent, and occupancy cost</h2>
            <p>Face rent is the printed starting headline. Base rent is the contractual rent schedule before incentives. Occupancy cost is what the tenant actually bears after CAM, free rent, and TI timing. Tenant-rep work fails when those pieces live in separate emails and a separate tab.</p>
            <h2>CAM, operating expenses, TI, free rent, and escalations</h2>
            <p>CAM and operating expenses can dwarf a small face-rent difference. Tenant improvement allowance changes year-one cash. Free rent changes the early periods and sometimes the escalation base. Rent escalations change later cash-flow differences and can reverse a ranking after discounting.</p>
            <h2>Different terms and incentive timing</h2>
            <p>A shorter term is not automatically cheaper. The unmodeled years after expiry are a relocation or renewal problem. Incentive timing matters because a TI check in month fourteen is not the same as two months of free rent in month one.</p>
            <h2>NPV versus effective rent and qualitative factors</h2>
            <p>Effective rent averages concessions across the term. NPV discounts the cash-flow stream. They answer different questions. Qualitative factors — operations, flexibility, and unmodeled clauses — still sit outside both numbers.</p>
            <h2>Worked comparison</h2>
            <p>ILLUSTRATIVE EXAMPLE. Lease A versus Lease B on one occupancy-cost basis.</p>
            ${leaseAbTable("cmp_ab")}
            ${cashFlowTable("cmp_cf")}
            <div className="pv-data-panel" data-visualization="NPV_COMPARISON">
              <p>Lease B’s cheaper headline does not win after CAM, thinner TI, less free rent, and faster escalations are placed on the cash-flow timeline and discounted.</p>
            </div>
            <h2>Common comparison mistakes</h2>
            <ul>
              <li>Ranking by face rent while CAM and incentives live elsewhere.</li>
              <li>Ignoring when cash moves.</li>
              <li>Using different measurement periods without saying so.</li>
              <li>Treating a lower NPV as automatic advice to sign.</li>
            </ul>
            <p>Related concepts: <a href="/commercial-lease-npv">commercial lease NPV</a>, <a href="/tenant-improvement-allowance">tenant improvement allowance</a>, <a href="/discount-rate-sensitivity">discount-rate sensitivity</a>, <a href="/resources/cam-costs">CAM costs</a>, <a href="/resources/free-rent">free rent</a>, and <a href="/resources/rent-escalations">rent escalations</a>.</p>
            <p>The proposed workflow keeps cash-flow compare, NPV + sensitivity, and a client-facing summary together so tenant-rep brokers do not rebuild a workbook deal by deal.</p>
            <h2>A longer comparison sequence brokers can reuse</h2>
            <p>Start with the same occupancy window. Restate gross and net structures so operating expenses are visible. Place CAM on the timeline. Place free rent in the actual months. Place tenant improvement allowance in the period cash moves. Apply escalations. Discount. Then change the rate. If the ranking flips, the meeting is about timing, not about who typed the prettier headline.</p>
            <p>Percentage rent, if present, belongs as an explicit scenario. Renewal options are usually deferred unless the client is choosing a term that only works if a renewal is treated as certain. Those deferred questions stay mapped so they do not silently disappear.</p>
            <p>This page is the comparison method. NPV, TI, CAM, free rent, and escalations are the supporting cluster. The homepage and the tenant-rep page are the commercial path. Pricing remains a hypothesis: $290 per year or $149 per deal. Payment is not collected. Positioning: occupancy-cost comparison. Product visualization sits in the tables. Benefits include a shareable ranking. Use cases are tenant-rep meetings. Trust or disclosure: illustrative samples, not legal advice.</p>
            ${educationalScaffold("commercial lease comparison")}
            ${depthExpansion("commercial lease comparison", "A reusable comparison has to survive a second option arriving on Friday afternoon. That is when face rent wins unless CAM, free rent, tenant improvement allowance, and escalations are already on the same occupancy-cost timeline. Different lease terms make the problem worse: a three-year option and a five-year option are not ranked by adding the printed years. Lock the measurement period, state the unmodeled years, then discount. Qualitative factors still sit outside the number. Operations, flexibility, and counsel review are not NPV outputs. The proposed product visualization is a workspace that keeps those limits visible next to the ranking.")}
            ${commercialClose([{ href: "/how-it-works", label: "How the proposed workflow works" }, { href: "/resources", label: "Resources hub" }])}
          </div>
        </section>`,
  );
}

export function successorPricingSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="PRICING" data-section-id="pr_hero" data-pattern-id="TRUST_NEAR_DECISION">
          <div className="vg-container">
            <p className="pv-eyebrow">Interest only — not a purchase</p>
            <h1 className="pv-display">Early validation pricing hypotheses</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            ${answer("What pricing is being tested for the pilot?", "Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="PRICING" data-section-id="pr_cards" data-pattern-id="TRUST_NEAR_DECISION">
          <div className="vg-container pv-prose">
            <p>These prices are being tested because tenant-rep brokers currently rebuild a workbook deal by deal. Face rent, a separate tab, and separate emails are the current method. The hypothesis is that a focused workflow for compare commercial lease economics — cash-flow and NPV without rebuilding the spreadsheet — is worth a bounded annual or per-deal amount. That is not a claim that anyone already pays these prices.</p>
            <div className="pv-pricing-split">
              <article className="vg-pricing-card pv-surface"><h2>Professional annual access</h2><p className="vg-price">$290 / year</p><p>Intended for tenant-rep and boutique CRE brokers who would use a focused comparison workspace across deals. One authenticated user. Annual billing. Includes authenticated access to cash-flow compare, NPV + sensitivity, and an in-workspace client summary while the Professional entitlement remains ACTIVE. There is no numerical DealWorkspace cap while that entitlement remains ACTIVE. Cancellation stops future renewal; access continues through the paid period. Refund rules are in the Terms of Service. It does not include a CRM, lease administration, additional seats, export, or a public share link. Checkout is not open.</p></article>
              <article className="vg-pricing-card pv-surface"><h2>Per-deal comparison report</h2><p className="vg-price">$149 / deal</p><p>Intended for occasional use. One-time charge for one DealWorkspace. The first successful DealWorkspace allocation consumes the entitlement. Unused refund eligibility is in the Terms of Service. It does not include additional seats, export, a public share link, a free trial, or checkout on this page.</p></article>
            </div>
            <h2>Why pricing is being tested</h2>
            <p>This is a pilot context. The hidden cell cost of rebuilding a workbook is real; whether brokers will pay $290 or $149 is not proven. Payment is not collected. A selection is an interest signal only.</p>
            <h2>Who should not use it</h2>
            <p>Who is this not for: not for landlords, not for property managers, and not for teams that need enterprise lease admin. It is also not for anyone who expects a finished product or believes a lower NPV is automatically the better lease.</p>
            ${commercialClose([{ href: "/how-it-works", label: "How it works" }, { href: "/faq", label: "Pilot questions" }])}
          </div>
        </section>`,
  );
}

export function successorFaqSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="FAQ" data-section-id="faq_hero" data-pattern-id="TRUST_NEAR_DECISION">
          <div className="vg-container">
            <h1 className="pv-display">Questions about this lease comparison pilot</h1>
            ${answer("Is this a finished product?", "No. This is an early validation / pilot concept. It is not generally available, and this site does not collect payment.")}
            ${answer("Is payment collected on this site?", "Payment is not collected on this site. Pricing hypotheses of $290 per year or $149 per deal are interest signals only.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="FAQ" data-section-id="faq_list" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container pv-prose">
            <h2>Is payment collected here?</h2>
            <p>No. Pricing shown is a hypothesis. A form selection indicates interest only. Payment is not collected.</p>
            <h2>Is this a finished product?</h2>
            <p>No. The proposed workflow is in validation. It is not generally available.</p>
            <h2>What should participants expect?</h2>
            <p>A conversation about whether a focused commercial lease comparison workspace would replace a rebuilt spreadsheet. The comparison workspace exists. Checkout is not open. Not legal advice.</p>
            <h2>Who is the intended user?</h2>
            <p>Tenant-representation brokers, independent CRE brokers, and boutique advisory teams who currently rebuild lease workbooks deal by deal.</p>
            <h2>Who is this not for?</h2>
            <p>Not for landlords, not for property managers, and not for teams that need a full brokerage suite.</p>
            <p>Visible questions and visible answers about the pilot stay here. Deep educational questions live on authority pages.</p>
            <h2>Are the sample lease numbers customer results?</h2>
            <p>No. Tables and NPV figures are illustrative samples, not customer data and not a production screenshot.</p>
            <h2>Is this legal or investment advice?</h2>
            <p>No. Calculations described here would be informational. Lease terms should be independently verified. No attorney review is claimed.</p>
            <h2>Where can I read the economics?</h2>
            <p>Start with <a href="/resources">the resources hub</a>, then <a href="/commercial-lease-npv">NPV</a> and <a href="/compare-commercial-leases">the comparison method</a>.</p>
            ${relatedBlock([{ href: "/", label: "Return to the offer" }, { href: "/pricing", label: "Pricing hypotheses" }, { href: "/how-it-works", label: "How it works" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
          </div>
        </section>`,
  );
}

export function expandEarlyAccessPage(existing: string): string {
  if (!existing.includes("workEmail")) return existing;
  if (existing.includes("What participants should expect")) return existing;
  let extra = `
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="ea_expand">
          <div className="vg-container pv-prose">
            <h2>What the pilot is</h2>
            <p>The pilot is an early validation conversation about a focused commercial lease comparison workflow. Participants should expect a discussion of current spreadsheet practice, not a finished product and not a checkout.</p>
            <h2>What participants should expect</h2>
            <p>Current product state is validation-stage. This site does not collect payment. Pricing hypotheses are $290 per year or $149 per deal.</p>
            <h2>Who it is for</h2>
            <p>Tenant-rep brokers, independent CRE brokers, and boutique teams who compare commercial leases.</p>
            <h2>Who it is not for</h2>
            <p>Not for landlords or property managers looking for administration software.</p>
            <h2>What information is collected</h2>
            <p>Name, work email, role, company, team size, deal frequency, pricing interest, and two workflow checkboxes. Do not send SSNs, bank details, lease files, or other sensitive documents.</p>
            <p>Read <a href="/">the offer</a>, <a href="/how-it-works">how it works</a>, <a href="/resources">the resources hub</a>, <a href="/compare-commercial-leases">the comparison method</a>, and <a href="/pricing">pricing</a> before you decide.</p>
          </div>
        </section>`;
  if (!existing.includes("function AnswerFirst") && existing.includes("export default function")) {
    existing = existing.replace(
      "export default function",
      `function AnswerFirst({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="pv-answer" data-answer-first="true">
      <p className="pv-eyebrow">{question}</p>
      <p>{answer}</p>
    </div>
  );
}

export default function`,
    );
    extra = `
        <div data-section-type="EDUCATION">
          <AnswerFirst question="What is this pilot?" answer="The pilot is an early validation conversation about a focused commercial lease comparison workflow. Participants should expect a discussion of current spreadsheet practice, not a finished product and not a checkout." />
        </div>` + extra;
  }
  if (existing.includes("<Section title=")) {
    return existing.replace("<Section title=", `${extra}
      <Section title=`);
  }
  if (existing.includes("<form")) {
    return existing.replace("<form", `${extra}
        <form`);
  }
  return `${existing}\n${extra}`;
}

export function successorEarlyAccessSource(page: PlannedPage): string {
  void page;
  return `"use client";
import { FormEvent, useState } from "react";
import { AnswerFirst, AuthorityRefs, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { submitPilotForm } from "../../ingest-client";

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
    setStatus(result.ok ? "Request received. No payment was taken." : "Request could not be sent.");
  }
  return (
    <PageShell tone="cre">
      <PageIdentity route="/early-access" role="CONVERSION" pattern="PRICING_HYPOTHESIS_PAGE" cluster="Product">
        <SiteBreadcrumb items={[{ href: "/", label: "Home" }, { href: "/early-access", label: "Request Pilot Access" }]} />
        <header className="pv-hero pv-article-hero" data-section-type="CONVERSION" data-section-id="ea_hero">
          <div className="vg-container">
            <p className="pv-eyebrow">Pilot / early access</p>
            <h1 className="pv-display">Request a validation pilot</h1>
            <AnswerFirst question="What is this pilot?" answer="The pilot is an early validation conversation about a focused commercial lease comparison workflow. Participants should expect a discussion of current spreadsheet practice, not a finished product and not a checkout." />
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="ea_body">
          <div className="vg-container pv-prose">
            <h2>What participants should expect</h2>
            <p>A bounded conversation about whether a cash-flow, NPV, and client-summary workspace would replace a rebuilt workbook. Current product state is validation-stage. This site does not collect payment.</p>
            <h2>Who it is for</h2>
            <p>Tenant-rep brokers, independent CRE brokers, and boutique teams who compare commercial leases.</p>
            <h2>Who it is not for</h2>
            <p>Not for landlords or property managers looking for administration software.</p>
            <h2>What information is collected</h2>
            <p>Name, work email, role, company, team size, deal frequency, pricing interest, and two workflow checkboxes. Do not send SSNs, bank details, lease files, or other sensitive documents.</p>
            <h2>Pricing context</h2>
            <p>$290 per year or $149 per deal are hypotheses. Read the <a href="/pricing">pricing page</a>, <a href="/how-it-works">how it works</a>, and the <a href="/resources">resources hub</a> before you decide.</p>
            <RelatedContent items={[{ href: "/for/tenant-rep-brokers", label: "For tenant-rep brokers" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/commercial-lease-npv", label: "Commercial lease NPV" }]} />
            <AuthorityRefs items={[{ href: "https://www.naiop.org/", label: "NAIOP — commercial real estate organization" }]} />
          </div>
        </section>
        <section className="pv-section" data-section-type="FORM" data-section-id="ea_form">
          <div className="vg-container">
            <h2>Request Pilot Access</h2>
            <form className="vg-form" onSubmit={onSubmit}>
              <div className="vg-form-field"><label htmlFor="name">Name</label><input id="name" name="name" required /></div>
              <div className="vg-form-field"><label htmlFor="workEmail">Work email</label><input id="workEmail" name="workEmail" type="email" required /></div>
              <div className="vg-form-field"><label htmlFor="role">Role</label><select id="role" name="role" required><option>CRE broker</option><option>Tenant representative</option><option>Boutique brokerage</option><option>Other</option></select></div>
              <div className="vg-form-field"><label htmlFor="company">Company</label><input id="company" name="company" required /></div>
              <div className="vg-form-field"><label htmlFor="teamSize">Team size</label><input id="teamSize" name="teamSize" required /></div>
              <div className="vg-form-field"><label htmlFor="dealFrequency">Approximate deal frequency</label><select id="dealFrequency" name="dealFrequency" required><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Rarely</option></select></div>
              <div className="vg-form-field"><label htmlFor="preferredPricing">Preferred pricing option</label><select id="preferredPricing" name="preferredPricing" required><option>$290 / year</option><option>$149 / deal</option></select></div>
              <label><input type="checkbox" name="leaseWorkflow" /> I currently compare or advise on commercial leases.</label>
              <label><input type="checkbox" name="pilotInterest" required /> I am interested in a paid pilot if the product is built.</label>
              <button type="submit">Request Pilot Access</button>
            </form>
            {status ? <p role="status">{status}</p> : null}
            <Disclosure>Do not send SSNs, bank details, lease files, or other sensitive documents. Pricing selection is interest, not a purchase. Payment is not collected.</Disclosure>
            <p><PrimaryCTA href="/pricing">Review pricing hypotheses</PrimaryCTA></p>
          </div>
        </section>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
`;
}
