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

export function successorResourcesSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="res_hero" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container">
            <p className="pv-eyebrow">Resources</p>
            <h1 className="pv-display">Commercial lease economics, grouped by how decisions are made</h1>
            ${answer("Which topics matter when comparing commercial leases?", "The smallest useful cluster is occupancy-cost comparison, NPV, discount-rate sensitivity, and tenant improvement allowance, plus CAM, free rent, escalations, and lease structure. This hub is the QuestionKnowledgeGraph map for that cluster, not a complete market encyclopedia.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="res_hub" data-pattern-id="PROGRESSIVE_DISCLOSURE">
          <div className="vg-container pv-prose">
            <h2>Topic overview</h2>
            <p>Topic definition, subtopic summaries, semantic navigation, spoke links, key questions, and a conversion path are the hub contract. This page is not a card directory.</p>
            <p>Commercial lease comparison fails when face rent is treated as the whole story. This authority hub groups the concepts that change occupancy cost and NPV so a tenant-rep broker can move from a question to a spoke, then to the proposed workflow. The smallest useful cluster still starts with comparison, NPV, discount-rate sensitivity, and tenant improvement allowance. CAM, free rent, escalations, and gross-versus-net structure now have dedicated spokes because they change rankings.</p>
            <h2>Question-oriented navigation</h2>
            <p>Related questions by intent sit inside each question cluster. Definitional questions land on dedicated pages. Calculation and limitation questions sit as article sections. Pilot and pricing questions stay on FAQ and pricing so this hub does not dump the entire graph.</p>
            <div className="pv-data-panel" data-visualization="TOPIC_MAP" data-visualization-secondary="CLUSTER_MAP">
              <h3>Visual topic map</h3>
              <p className="pv-caption">Spoke introduction — why it matters for the cluster</p>
              <table className="pv-compare">
                <caption className="pv-caption">Question cluster map — not a doorway list</caption>
                <thead><tr><th scope="col">Cluster</th><th scope="col">Start here</th><th scope="col">Decision it changes</th></tr></thead>
                <tbody>
                  <tr><th scope="row">NPV cluster</th><td><a href="/commercial-lease-npv">Commercial lease NPV</a></td><td>Present value of occupancy cost</td></tr>
                  <tr><th scope="row">Lease comparison cluster</th><td><a href="/compare-commercial-leases">Compare commercial leases</a></td><td>Shared occupancy-cost basis</td></tr>
                  <tr><th scope="row">TI cluster</th><td><a href="/tenant-improvement-allowance">Tenant improvement allowance</a></td><td>Incentive timing</td></tr>
                  <tr><th scope="row">Discount-rate cluster</th><td><a href="/discount-rate-sensitivity">Discount-rate sensitivity</a></td><td>Whether a ranking is fragile</td></tr>
                  <tr><th scope="row">CAM / operating-expense cluster</th><td><a href="/resources/cam-costs">CAM costs</a></td><td>Whether face rent is comparable</td></tr>
                  <tr><th scope="row">Free-rent cluster</th><td><a href="/resources/free-rent">Free rent</a></td><td>Early-period cash</td></tr>
                  <tr><th scope="row">Rent-escalation cluster</th><td><a href="/resources/rent-escalations">Rent escalations</a></td><td>Later-period cash</td></tr>
                  <tr><th scope="row">Gross-vs-net cluster</th><td><a href="/resources/gross-vs-net-lease">Gross vs net lease</a></td><td>Who pays operating expenses</td></tr>
                  <tr><th scope="row">Occupancy-cost cluster</th><td><a href="/compare-commercial-leases">Occupancy cost method</a></td><td>What belongs beside rent</td></tr>
                  <tr><th scope="row">Broker-workflow cluster</th><td><a href="/for/tenant-rep-brokers">Tenant-rep brokers</a></td><td>How the comparison is presented</td></tr>
                </tbody>
              </table>
            </div>
            <h2>NPV cluster</h2>
            <p>Spoke introduction: NPV converts future occupancy costs into today’s dollars so timing is explicit. Why it matters for the cluster: without discounting, year-five rent is treated as equal to year-one rent. Read <a href="/commercial-lease-npv">what NPV means in a commercial lease</a>.</p>
            <h2>Lease comparison cluster</h2>
            <p>Spoke introduction: comparison is the decision, not the definition. Why it matters for the cluster: two options with different free rent and TI cannot be ranked by start rent. Read <a href="/compare-commercial-leases">how to compare commercial lease options</a>.</p>
            <h2>TI cluster</h2>
            <p>Spoke introduction: tenant improvement allowance is a timed cash event. Why it matters for the cluster: a larger allowance can fund a higher face rent. Read <a href="/tenant-improvement-allowance">tenant improvement allowance and occupancy cost</a>.</p>
            <h2>Free-rent cluster</h2>
            <p>Spoke introduction: free rent changes early occupancy cost and sometimes the escalation base. Why it matters for the cluster: two months at the start is not the same as a lower headline. Read <a href="/resources/free-rent">how free rent changes occupancy cost</a>.</p>
            <h2>CAM / operating-expense cluster</h2>
            <p>Spoke introduction: CAM is the tenant’s share of common-area operating cost where the lease assigns it. Why it matters for the cluster: a cheaper face rent with heavier CAM can lose. Read <a href="/resources/cam-costs">what CAM is in a commercial lease</a>.</p>
            <h2>Rent-escalation cluster</h2>
            <p>Spoke introduction: escalations change later cash flows. Why it matters for the cluster: a 5% step-up can erase a cheap start after discounting. Read <a href="/resources/rent-escalations">how rent escalations change a comparison</a>.</p>
            <h2>Discount-rate cluster</h2>
            <p>Spoke introduction: the rate is an assumption, not a market trophy. Why it matters for the cluster: nearby rates can flip a ranking. Read <a href="/discount-rate-sensitivity">discount-rate sensitivity</a>.</p>
            <h2>Occupancy-cost cluster</h2>
            <p>Spoke introduction: occupancy cost is the tenant’s economic burden, not the brochure rent. Why it matters for the cluster: CAM, free rent, and TI belong beside face rent.</p>
            <h2>Gross-vs-net cluster</h2>
            <p>Spoke introduction: lease structure assigns expense responsibility. Why it matters for the cluster: a lower net face rent is not comparable to a higher gross face rent. Read <a href="/resources/gross-vs-net-lease">gross lease vs net lease</a>.</p>
            <h2>Broker-workflow cluster</h2>
            <p>Spoke introduction: the comparison has to survive a client meeting. Why it matters for the cluster: a rebuilt workbook is hard to share. Read <a href="/for/tenant-rep-brokers">the tenant-rep broker page</a> and <a href="/how-it-works">how it works</a>.</p>
            <h2>Key questions this hub answers</h2>
            <ul>
              <li>Why two leases with different free rent and TI cannot be ranked by start rent.</li>
              <li>What NPV does and does not decide for a tenant-rep conversation.</li>
              <li>When CAM, free rent, escalations, and lease structure need their own pages.</li>
              <li>How the proposed product turns those answers into a client summary.</li>
            </ul>
            <p>Industry terminology context comes from professional organizations, not from ranking claims. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
            <div className="pv-data-panel" data-visualization="SPOKE_RELATIONSHIP">
              <p>Spoke relationship: NPV, comparison, TI, discount rate, CAM, free rent, escalations, and structure all feed the same occupancy-cost decision.</p>
            </div>
            ${educationalScaffold("the commercial lease economics hub")}
            ${depthExpansion("the commercial lease economics hub", "A hub is not a directory. Each spoke has to change a decision: whether face rent is comparable, whether an incentive is timed, whether a ranking survives a nearby discount rate, and whether lease structure hides operating expenses. Question-oriented navigation exists so a broker can enter at the question they were asked in a meeting and leave with a spoke, a limitation, and a commercial path. Future silo URLs are documented and not executed in this successor so the live validation paths stay stable.")}
            ${authorityBlock([COMMON_SOURCES.naiop, COMMON_SOURCES.boma, COMMON_SOURCES.npv])}
            ${relatedBlock([{ href: "/", label: "Return to the offer" }, { href: "/pricing", label: "Pricing hypotheses" }, { href: "/early-access", label: "Request Pilot Access" }, { href: "/faq", label: "Pilot questions" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a> · <a href="/pricing">Review pricing</a></p>
          </div>
        </section>`,
  );
}

export function successorNpvSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="npv_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">What is NPV in a commercial lease?</h1>
            <div data-answer-first="true">
              ${answer("What is NPV in a commercial lease?", "A commercial lease NPV calculation converts future lease costs into today’s dollars using a discount rate. It helps brokers and tenants compare lease options with different rent schedules, incentives, and timing on a more consistent basis.")}
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="npv_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            ${answer("What is present value in lease economics?", "Present value in lease economics is the current worth of a future occupancy-cost payment after applying a discount rate. NPV is the sum of those discounted amounts across the modeled cash-flow periods.")}
            ${answer("How do you calculate commercial lease NPV?", "Commercial lease NPV is calculated by building the cash-flow stream for each option, choosing an explicit discount rate, discounting each period, and summing the discounted amounts. The formula is NPV = Σ Ct / (1 + r)^t.")}
            ${answer("Why is NPV useful when comparing leases?", "NPV is useful when comparing leases because it keeps timing explicit. Free rent, tenant improvement allowance, CAM, and escalations stop being slogans and become dated cash events on one timeline.")}
            ${answer("What costs belong in lease NPV?", "The cash flows that belong in a lease NPV model are occupancy costs and incentives attributed to the tenant’s decision: rent, CAM where modeled, abatements, and improvement funding. Unrelated corporate overhead does not belong.")}
            ${answer("What belongs in a lease cash-flow model?", "A lease cash-flow model should include contractual rent, modeled CAM or operating expenses, free rent, tenant improvement allowance timing, and escalations. Percentage rent belongs only as an explicit scenario.")}
            ${answer("NPV vs total lease cost", "NPV is not the same as total lease cost. Undiscounted totals treat a dollar in year five as equal to a dollar this year. That is a different question from present value.")}
            ${answer("NPV vs effective rent", "NPV discounts the cash-flow stream. Effective rent averages concessions across the term. A lower effective rent can still lose on NPV if cash moves earlier.")}
            ${answer("What is effective rent?", "Effective rent is an averaged occupancy-cost shorthand after spreading concessions across the term. It is not a discounted present value and should not be treated as a substitute for NPV.")}
            <h2>What is the NPV formula?</h2>
            <p>The standard finance formula is NPV = Σ Ct / (1 + r)^t, the sum of discounted cash flows. Finance references describe NPV as the discounted value of future cash flows. See Investopedia’s NPV definition at https://www.investopedia.com/terms/n/npv.asp.</p>
            <div className="pv-data-panel" data-visualization="FORMULA_PANEL">
              <p><strong>NPV = Σ Ct / (1 + r)^t</strong></p>
              <p>Ct is the net occupancy cash flow in period t. r is the discount rate. t is the period index. A full NPV sums every modeled period.</p>
            </div>
            <h2>What does each term in the formula mean?</h2>
            <p>Ct is rent plus modeled CAM, minus free-rent relief, minus TI cash received in that period. r is the rate used to translate later dollars into today’s dollars. t is the year or month index you chose when you built the cash-flow stream for each option.</p>
            <h2>Why it matters</h2>
            <p>Commercial options rarely differ by a single rent number. One lease may offer free rent now and steeper step-ups later. Another may look expensive in year one because a tenant improvement allowance arrives as a landlord payment rather than a lower face rent. NPV is a way to keep those differences on one timeline.</p>
            <h2>How is commercial lease NPV calculated?</h2>
            <p>Build the cash-flow stream for each option. Choose a discount rate you can explain. Discount the stream. Compare the results, then test nearby rates so the ranking is not fragile. The model must show when cash moves, including CAM and escalations, not only the printed face rent.</p>
            <h3>What discount rate should be used for lease NPV?</h3>
            <p>Use a rate the client already uses for capital decisions, or a stated opportunity-cost rate, and keep it visible. The Federal Reserve policy rate is not automatically the lease input. See <a href="/discount-rate-sensitivity">discount-rate sensitivity</a>.</p>
            <h3>How does changing the discount rate affect results?</h3>
            <p>A higher rate reduces the present weight of future step-ups and late incentives. Nearby rates can flip a ranking. That is why sensitivity belongs beside the terms.</p>
            <h3>How does tenant improvement allowance affect NPV?</h3>
            <p>TI is a cash event. A landlord-funded allowance in year one reduces net occupancy cost in that period and therefore lowers NPV, all else equal. Unused TI that expires should not be modeled as cash received. See <a href="/tenant-improvement-allowance">tenant improvement allowance</a>.</p>
            <h3>Does free rent affect lease NPV?</h3>
            <p>Yes. Free rent reduces early Ct. Timing matters: two months at commencement is not the same as a later abatement. See <a href="/resources/free-rent">free rent</a>.</p>
            <h3>Should CAM be included in lease NPV?</h3>
            <p>Yes, when the tenant pays CAM or a CAM-equivalent operating expense. Leaving it out makes a cheap-face-rent / heavy-CAM option look better than it is. See <a href="/resources/cam-costs">CAM costs</a>.</p>
            <h3>How do rent escalations affect NPV?</h3>
            <p>Escalations raise later Ct. After discounting, a steep step-up can erase a cheap start. See <a href="/resources/rent-escalations">rent escalations</a>.</p>
            <h2>How do you compare leases with different terms?</h2>
            <p>Different lease terms require a shared measurement period. A three-year NPV and a five-year NPV are not automatically comparable. State the unmodeled years as an assumption, then discount the aligned cash-flow stream.</p>
            <h2>Is lower NPV always the better lease?</h2>
            ${answer("Is lower NPV always the better lease?", "A lower NPV is not automatically the better lease. NPV is a consistency tool for occupancy-cost timing. Operations, flexibility, and unmodeled terms still matter, and this site does not give legal or investment advice.")}
            ${answer("Does NPV capture every qualitative lease consideration?", "NPV does not capture every qualitative lease consideration. Operations, flexibility, renewal options, and unmodeled clauses still sit outside the discounted occupancy-cost number.")}
            <h2>ILLUSTRATIVE EXAMPLE — worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. Lease A and Lease B below are educational samples, not customer results. Year 4 is shown so later escalations are visible. A full NPV sums every modeled period.</p>
            ${leaseAbTable("npv_ab")}
            ${cashFlowTable("npv_cf")}
            <div className="pv-data-panel" data-visualization="NPV_COMPARISON">
              <p>After CAM, TI, free rent, and escalations are placed on the cash-flow stream, Lease A’s illustrative NPV at 8% is $186,400 and Lease B’s is $191,220. Lease B’s cheaper headline does not win.</p>
            </div>
            <h2>How do tenant-rep brokers use NPV?</h2>
            <p>Tenant-rep brokers use NPV to keep the client summary next to the terms. Inputs are required: rent, CAM, TI, free rent, escalations, term, and a stated rate. What decisions follow: which option is cheaper on a present-value occupancy-cost basis, and whether that ranking survives nearby rates.</p>
            <h2>How should NPV be explained to a client?</h2>
            <p>Say that later dollars are worth less than dollars due now, show the cash-flow stream, name the rate, and show the sensitivity table. Do not present a single cell as advice to sign.</p>
            <h2>Common mistakes</h2>
            <ul>
              <li>Discounting rent but ignoring TI and free rent.</li>
              <li>Using a rate nobody can explain to the client.</li>
              <li>Treating the lower NPV as automatic advice to sign.</li>
              <li>Comparing different terms without a shared measurement period.</li>
            </ul>
            ${answer("What are common lease NPV mistakes?", "Common lease NPV mistakes include ignoring TI and free rent, hiding the discount rate, comparing different terms without a shared window, and treating a lower NPV as automatic advice to sign.")}
            <h2>What are the limitations of NPV?</h2>
            <p>NPV does not capture every qualitative consideration. It is not a cap rate. It is not lease accounting. Accounting standard setters publish related literature; this page does not claim FASB endorsement or a completed ASC 842 product.</p>
            <h2>Questions</h2>
            <h3>Is NPV the same as a cap rate?</h3>
            <p>No. A cap rate is a different market shorthand. NPV here is a discounted occupancy-cost tool for comparing specified alternatives.</p>
            <h3>Can I skip NPV and add the years?</h3>
            <p>Undiscounted totals treat a dollar in year five as equal to a dollar this year. That is a different question.</p>
            ${educationalScaffold("commercial lease NPV")}
            ${depthExpansion("commercial lease NPV", "NPV is a consistency tool, not a signing instruction. The formula NPV = Σ Ct / (1 + r)^t only helps if Ct includes the incentives and expenses the tenant actually bears and if r is a rate the client can explain. Year 4 in the illustrative table exists so escalations are visible. A full NPV sums every modeled period. Tenant-rep brokers use NPV when inputs are required and what decisions follow is a ranking plus a sensitivity check, not a verdict.")}
            ${authorityBlock([COMMON_SOURCES.npv, COMMON_SOURCES.fasb, COMMON_SOURCES.discount])}
            ${relatedBlock([{ href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/discount-rate-sensitivity", label: "Discount-rate sensitivity" }, { href: "/resources", label: "Resources hub" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p>If you want this comparison in a reusable workspace rather than another spreadsheet, <a href="/how-it-works">see the proposed workflow</a>.</p>
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  );
}

export function successorTiSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="ti_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">Tenant improvement allowance and occupancy cost</h1>
            ${answer("What is a tenant improvement allowance?", "A tenant improvement allowance is landlord funding for space work. It can lower the tenant’s net cash outlay even when face rent is higher. The allowance should be placed on the same cash-flow timeline as rent, free rent, and CAM before anyone ranks the options.")}
            ${answer("How does tenant improvement allowance affect NPV?", "Tenant improvement allowance affects NPV by changing the period when cash moves. A year-one TI credit reduces that period’s net occupancy cost and therefore changes the discounted total. Unused TI that expires should not be modeled as cash received.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="ti_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Definition and common structure</h2>
            <p>Brokers often hear “we will give you $18 per foot.” That sentence is incomplete until you know when the money moves, what it covers, and how the rent schedule changed to fund it. Landlord-funded TI is a cash or credit event. Tenant-funded work is a cash outflow. Unused TI limitations matter because an expired remainder is not a benefit.</p>
            <h2>Timing and occupancy-cost effect</h2>
            <p>If the allowance is reimbursed after invoices, year-one cash is not the brochure number. If it is applied as a rent credit, it reduces early Ct. Either way, it belongs on the cash-flow stream before NPV is computed.</p>
            <h2>Negotiation considerations</h2>
            <p>A smaller allowance with cheaper rent can still lose on a present-value basis. A larger allowance that funds a higher face rent can win in year one and lose after escalations. Put both on the same timeline.</p>
            <div className="pv-data-panel" data-visualization="CALCULATION_EXAMPLE">
              <table className="pv-compare">
                <caption className="pv-caption">ILLUSTRATIVE EXAMPLE — TI versus rent trade, not a customer case</caption>
                <thead><tr><th scope="col">Structure</th><th scope="col">Year-1 rent</th><th scope="col">TI in year 1</th><th scope="col">Net year-1 cash idea</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Higher TI</th><td>$44,000</td><td>$18,000 credit</td><td>$26,000</td></tr>
                  <tr><th scope="row">Lower TI</th><td>$39,000</td><td>$8,000 credit</td><td>$31,000</td></tr>
                </tbody>
              </table>
            </div>
            ${cashFlowTable("ti_cf")}
            <h2>Worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. The higher-TI structure looks expensive on face rent and cheaper after the year-one credit. Later step-ups can reverse the story. That is why NPV and a shared measurement period belong beside the allowance.</p>
            <h2>Common mistakes</h2>
            <ul>
              <li>Advertising the allowance and hiding the rent that funds it.</li>
              <li>Assuming unused TI is kept.</li>
              <li>Comparing TI per square foot across spaces with different usable areas without saying so.</li>
            </ul>
            <h2>Questions</h2>
            <h3>Should unused TI be modeled as cash?</h3>
            <p>No, unless the lease actually lets the tenant keep it. Limitations are part of the model, not a footnote.</p>
            <p>Next: <a href="/compare-commercial-leases">put TI beside free rent and CAM in one table</a>.</p>
            ${educationalScaffold("tenant improvement allowance")}
            ${depthExpansion("tenant improvement allowance", "Landlord-funded versus tenant-funded work changes the sign of the cash event. Unused TI limitations change whether the brochure number is real. Negotiation should treat the allowance and the rent that funds it as one package. Comparing TI per square foot across different usable areas without saying so is a common mistake. Place the expected cash in the period it is likely to occur, then recompute occupancy cost and NPV.")}
            ${authorityBlock([COMMON_SOURCES.boma, COMMON_SOURCES.npv])}
            ${relatedBlock([{ href: "/commercial-lease-npv", label: "Commercial lease NPV" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/resources", label: "Resources hub" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  );
}

export function successorDiscountSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="dr_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">Discount-rate sensitivity in lease NPV</h1>
            ${answer("What discount rate should be used for lease NPV?", "The discount rate converts later occupancy costs into today’s dollars. Choose a rate the client can explain — often a cost of capital already used — and keep it visible beside the terms. A hidden rate makes the ranking an artifact of one assumption.")}
            ${answer("What happens if the discount-rate ranking flips?", "If the discount-rate ranking flips, the conversation is about timing and risk, not about a single heroic NPV. Show the sensitivity table so the client sees that later step-ups weigh less at a higher rate.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="dr_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>What the discount rate means</h2>
            <p>In finance, a discount rate is the rate used to translate future amounts into present value. That is not the Federal Reserve policy rate, and this page does not treat monetary-policy headlines as a lease input. See https://www.investopedia.com/terms/d/discountrate.asp.</p>
            <h2>Why it matters and how a chosen rate changes NPV</h2>
            <p>Two honest models can rank the same pair of leases differently if they silently use different rates. A higher rate reduces the present weight of future step-ups and late incentives, which can change which lease looks cheaper on a cash-flow basis.</p>
            <h2>Rate-selection considerations</h2>
            <p>Pick a rate that matches the decision and say so. Do not hide it in a named range. Do not inflate it to make a preferred building win. Do not confuse it with a mortgage interest quote.</p>
            <h2>Ranking-flip example and sensitivity analysis</h2>
            <p>ILLUSTRATIVE EXAMPLE. Lease A versus Lease B at three rates. The ranking is stable here; a different escalation pair can flip. The table is the point, not a claim that every deal is stable.</p>
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
            ${cashFlowTable("dr_cf")}
            <h2>Client explanation</h2>
            <p>Show the terms, name the rate, show nearby rates, and explain that NPV does not automatically decide the occupancy choice. Tenant-rep brokers use this so the client summary next to the sensitivity cases stays honest.</p>
            <h2>Limitations and mistakes</h2>
            <ul>
              <li>Hiding the rate in a named range nobody opens.</li>
              <li>Using an inflated rate to make a preferred building win.</li>
              <li>Confusing this rate with a mortgage interest quote.</li>
            </ul>
            ${educationalScaffold("discount-rate sensitivity")}
            ${depthExpansion("discount-rate sensitivity", "Rate-selection considerations are part of the client explanation. A ranking-flip example is more useful than a single heroic NPV. Sensitivity analysis belongs beside the terms so the assumption cannot hide in a named range. Limitations include confusing this rate with a mortgage quote or a policy headline. The illustrative table is a method, not a customer result.")}
            ${authorityBlock([COMMON_SOURCES.discount, COMMON_SOURCES.npv])}
            ${relatedBlock([{ href: "/commercial-lease-npv", label: "Commercial lease NPV" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/resources", label: "Resources hub" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
  );
}
