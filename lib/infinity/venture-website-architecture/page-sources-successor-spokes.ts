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

export function successorCamSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="cam_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">What is CAM in a commercial lease?</h1>
            ${answer("What is CAM in a commercial lease?", "CAM is the tenant’s share of common-area maintenance and related operating costs where the lease assigns those costs. CAM changes occupancy cost and should be included in lease NPV when the tenant pays it.")}
            ${answer("Should CAM be included in lease NPV?", "CAM should be included in lease NPV when the tenant pays common-area or operating expenses. Leaving CAM out makes a cheap face-rent option look better than the cash-flow stream actually is.")}
            ${answer("What operating expenses belong beside face rent?", "Operating expenses that belong beside face rent are the tenant-paid costs of occupying the space, including CAM where assigned, and any stated expense stops or caps that change later cash flows.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="cam_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>What does CAM include?</h2>
            <p>CAM typically includes shared building operating costs allocated to tenants: common-area utilities, janitorial for shared spaces, landscaping, and similar items the lease defines. Professional building organizations discuss operating-cost practice; this page uses that as context, not as a copied standard. See <a href="https://www.boma.org/">BOMA</a>.</p>
            <h2>What usually does not belong in CAM?</h2>
            <p>Capital improvements that the lease excludes, landlord overhead the lease does not allocate, and costs the tenant already pays directly usually do not belong. The lease controls. This page does not give legal advice.</p>
            <h2>How is CAM calculated?</h2>
            <p>CAM is usually an estimated annual amount, often per square foot, reconciled later. For comparison, model the estimate you will actually use in occupancy cost, then note reconciliation risk as a limitation rather than a hidden plug.</p>
            <h2>How does CAM affect occupancy cost?</h2>
            <p>A $3 per foot CAM difference on a large space can exceed a small face-rent win. Occupancy cost is rent plus tenant-paid CAM, after free rent and TI timing.</p>
            <h2>How do CAM increases affect comparisons?</h2>
            <p>If one option has a CAM cap and the other does not, later cash-flow periods diverge. Discounting those later increases can change NPV even when year-one CAM looks close.</p>
            <h2>How should estimated CAM be modeled?</h2>
            <p>Place estimated CAM on the same cash-flow timeline as rent. Escalate it only if the comparison assumption says so. Do not hide the estimate in a separate tab.</p>
            <h2>Common CAM comparison mistakes</h2>
            <ul>
              <li>Comparing face rent across a gross lease and a net lease without restating expenses.</li>
              <li>Ignoring CAM increases after year one.</li>
              <li>Treating a CAM estimate as a guaranteed invoice.</li>
            </ul>
            <p>ILLUSTRATIVE EXAMPLE. Lease A CAM $8,400 versus Lease B CAM $9,100, with the rest of the occupancy-cost stack shown beside it.</p>
            ${leaseAbTable("cam_ab")}
            ${cashFlowTable("cam_cf")}
            ${educationalScaffold("CAM costs")}
            ${depthExpansion("CAM costs", "How CAM is calculated in a comparison is usually an estimate, sometimes per square foot, sometimes reconciled later. How CAM increases affect comparisons depends on caps and base years. Estimated CAM should be modeled on the same cash-flow timeline as rent. Common CAM comparison mistakes include ranking a net headline against a gross headline and treating an estimate as an invoice. Should CAM be included in lease NPV? Yes when the tenant pays it.")}
            ${authorityBlock([COMMON_SOURCES.boma, COMMON_SOURCES.naiop])}
            ${relatedBlock([{ href: "/resources", label: "Resources hub" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/commercial-lease-npv", label: "Commercial lease NPV" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
    "../../../",
  );
}

export function successorFreeRentSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="fr_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">How free rent changes occupancy cost</h1>
            ${answer("How does free rent change occupancy cost?", "Free rent reduces early occupancy cost by removing contractual rent for a stated period. It changes the cash-flow stream and therefore NPV. Timing matters: two months at commencement is not the same as a later abatement.")}
            ${answer("Does free rent affect lease NPV?", "Free rent affects lease NPV because it lowers early cash outflows. A later abatement is discounted more than an immediate one, so the same number of free months can produce different present values.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="fr_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>What is free rent in a commercial lease?</h2>
            <p>Free rent is a contractual abatement: the tenant does not pay base rent for a stated period. It is an incentive, not a change to the building. Common-area charges may still be due; the lease says so.</p>
            <h2>How is free rent structured?</h2>
            <p>It may be consecutive months at commencement, scattered months, or a later rent holiday. Some deals apply it only to base rent. Some also abate CAM. Model the structure that is actually written.</p>
            <h2>Why does the timing of free rent matter?</h2>
            <p>Money not paid this year is worth more than money not paid in year four after discounting. Timing also affects whether escalations apply to a reduced base.</p>
            <h2>Free rent versus lower face rent</h2>
            <p>A lower face rent lasts for every period. Free rent is concentrated. After escalations, the cheaper headline can lose. NPV makes that visible.</p>
            <h2>How should brokers model free rent?</h2>
            <p>Put zeros or reduced rent in the abated periods on the cash-flow timeline. Do not subtract a slogan from year-one rent unless that is the actual structure. Then recompute occupancy cost and NPV.</p>
            <h2>Common mistakes</h2>
            <ul>
              <li>Comparing free-rent months without saying whether CAM continues.</li>
              <li>Ignoring the escalation base after the abatement.</li>
              <li>Treating free rent as a trophy number instead of dated cash.</li>
            </ul>
            <p>ILLUSTRATIVE EXAMPLE. Lease A has two months of free rent; Lease B has one. After CAM, TI, and escalations, Lease A still wins on illustrative NPV at 8%.</p>
            ${leaseAbTable("fr_ab")}
            ${cashFlowTable("fr_cf")}
            ${educationalScaffold("free rent")}
            ${depthExpansion("free rent", "How free rent is structured decides whether CAM continues during the abatement. How free rent affects occupancy cost is concentrated in the early periods. How free rent affects NPV depends on when cash moves. Free rent versus lower face rent is a timing trade. Brokers should model the actual months, not a trophy number. Common mistakes include ignoring the escalation base after the holiday.")}
            ${authorityBlock([COMMON_SOURCES.naiop, COMMON_SOURCES.npv])}
            ${relatedBlock([{ href: "/resources", label: "Resources hub" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/commercial-lease-npv", label: "Commercial lease NPV" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
    "../../../",
  );
}

export function successorEscalationsSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="esc_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">How rent escalations change a lease comparison</h1>
            ${answer("How do rent escalations change a comparison?", "Rent escalations change a comparison by raising later occupancy-cost periods. A cheaper start with a faster step-up can lose after the cash-flow stream is discounted. Fixed-dollar and percentage increases are different schedules, not interchangeable slogans.")}
            ${answer("How do rent escalations affect NPV?", "Rent escalations affect NPV by increasing later cash flows. A higher discount rate reduces the present weight of those later increases, which can flip a ranking that looked obvious at face rent.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="esc_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>What are rent escalations?</h2>
            <p>Rent escalations are scheduled increases in contractual rent. They are part of the cash-flow stream, not a footnote. Industry practice discusses step-ups as ordinary commercial terms; this page does not copy any proprietary form.</p>
            <h2>Fixed-dollar increases</h2>
            <p>A fixed-dollar increase adds the same amount each period. It is easy to place on a timeline and easy to discount. It is not automatically cheaper than a percentage increase.</p>
            <h2>Percentage increases</h2>
            <p>A percentage increase compounds. A 5% schedule on a cheaper start can overtake a 3% schedule on a higher start by year four. That is why Year 4 belongs in a worked example.</p>
            <h2>Other relevant structures</h2>
            <p>Some leases use CPI-linked increases or reset clauses. Model those as scenarios, not as hidden plugs. If the index is unknown, state the assumption.</p>
            <h2>How escalations affect total occupancy cost and NPV</h2>
            <p>Undiscounted totals overweight late years equally with year one. NPV discounts those late years. Different escalation schedules can alter rankings even when start rent looks decisive.</p>
            <h2>Worked example</h2>
            <p>ILLUSTRATIVE EXAMPLE. Lease A escalates 3% per year. Lease B escalates 5% per year from a cheaper start. After CAM, TI, and free rent, Lease B’s illustrative NPV is higher at 8%.</p>
            ${leaseAbTable("esc_ab")}
            ${cashFlowTable("esc_cf")}
            <h2>Common mistakes</h2>
            <ul>
              <li>Comparing year-one rent and ignoring the schedule.</li>
              <li>Mixing fiscal-year and lease-year step-up dates.</li>
              <li>Forgetting that free rent can change the escalation base.</li>
            </ul>
            ${educationalScaffold("rent escalations")}
            ${depthExpansion("rent escalations", "Fixed-dollar increases and percentage increases are different cash-flow shapes. Other structures such as index-linked resets belong as scenarios. Escalations affect total occupancy cost by raising later periods and affect NPV after those periods are discounted. Different escalation schedules can alter rankings even when start rent looks decisive. The worked example keeps Year 4 visible so the compounding is not hidden.")}
            ${authorityBlock([COMMON_SOURCES.npv, COMMON_SOURCES.naiop])}
            ${relatedBlock([{ href: "/resources", label: "Resources hub" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/discount-rate-sensitivity", label: "Discount-rate sensitivity" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
    "../../../",
  );
}

export function successorGrossNetSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="EDUCATION" data-section-id="gn_hero" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container">
            <p className="pv-eyebrow">Lease economics</p>
            <h1 className="pv-display">Gross lease vs net lease</h1>
            ${answer("What is the difference between a gross lease and a net lease?", "A gross lease prices most operating expenses into the base rent. A net lease, including a triple-net structure where appropriate, shifts more expense responsibility to the tenant. Face rent alone misleads because the cheaper net headline may exclude CAM and other occupancy costs.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="gn_body" data-pattern-id="DATA_DENSITY_WITH_CLARITY">
          <div className="vg-container pv-prose">
            <h2>Gross lease</h2>
            <p>In a typical gross structure, the landlord bears more operating-expense responsibility and the tenant pays a higher contractual rent. The comparison still needs an occupancy-cost view if the tenant later pays extras the lease carves out.</p>
            <h2>Modified gross</h2>
            <p>Modified gross splits responsibility. Base year stops, expense caps, and specified services decide what belongs beside face rent. Model the actual split, not the label.</p>
            <h2>Net lease and NNN</h2>
            <p>A net lease, and a triple-net lease where the documents assign taxes, insurance, and maintenance to the tenant, makes face rent look cheaper. Occupancy cost must add those expenses. This page does not treat every net lease as identical NNN.</p>
            <h2>Expense responsibility and base rent versus operating expenses</h2>
            <p>The useful question is who pays which cash flow, and when. Base rent is one line. Operating expenses and CAM are others. NPV implications follow once the cash-flow stream is complete.</p>
            <h2>Why face rent alone can mislead</h2>
            <p>A $39,000 net start can lose to a $42,000 gross start after CAM is restored. That is the same lesson as the Lease A versus Lease B comparison used across this site.</p>
            <p>ILLUSTRATIVE EXAMPLE. Restating Lease B’s cheaper face rent with heavier CAM shows why structure belongs in the model.</p>
            ${leaseAbTable("gn_ab")}
            ${cashFlowTable("gn_cf")}
            <h2>Comparison implications</h2>
            <p>Do not rank a gross option against a net option by headline rent. Restate both on occupancy cost, then discount. See <a href="/resources/cam-costs">CAM</a> and <a href="/compare-commercial-leases">the comparison method</a>.</p>
            ${educationalScaffold("gross versus net lease structure")}
            ${depthExpansion("gross versus net lease structure", "Expense responsibility is the comparison. Base rent versus operating expenses is the restatement. Occupancy cost is the common language. Why face rent alone can mislead is the same lesson as Lease A versus Lease B. NPV implications follow once the cash-flow stream includes the expenses the tenant actually pays. Modified gross is not a third slogan; it is a split that has to be modeled.")}
            ${authorityBlock([COMMON_SOURCES.naiop, COMMON_SOURCES.boma])}
            ${relatedBlock([{ href: "/resources", label: "Resources hub" }, { href: "/compare-commercial-leases", label: "Compare commercial leases" }, { href: "/resources/cam-costs", label: "CAM costs" }, { href: "/early-access", label: "Request Pilot Access" }])}
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a></p>
          </div>
        </section>`,
    "../../../",
  );
}

export function successorPersonaSource(page: PlannedPage): string {
  return successorShell(
    page,
    `
        <header className="pv-hero pv-article-hero" data-section-type="HERO" data-section-id="tr_hero" data-pattern-id="FOCUSED_HERO">
          <div className="vg-container">
            <p className="pv-eyebrow">For tenant-rep brokers</p>
            <h1 className="pv-display">Compare commercial leases without rebuilding the spreadsheet</h1>
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
            ${answer("How should tenant-rep brokers compare leases?", "Tenant-rep brokers should compare leases on a shared occupancy-cost timeline, discount that cash-flow stream to NPV at an explicit rate, and keep a shareable client summary next to the sensitivity cases. Face rent alone hides timing.")}
            ${answer("How do tenant-rep brokers use NPV?", "Tenant-rep brokers use NPV to show clients when cash moves. Inputs are required: rent, CAM, TI, free rent, escalations, term, and a stated discount rate. What decisions follow is which option is cheaper on a present-value basis and whether that ranking survives nearby rates.")}
            ${answer("How does tenant representation use a client summary?", "Tenant representation uses a client summary to keep the comparison shareable. The summary should sit next to the cash-flow and NPV figures, labeled illustrative until live terms are loaded, so the client sees the same ranking the broker used.")}
          </div>
        </header>
        <section className="pv-section" data-section-type="WORKFLOW" data-section-id="tr_body" data-pattern-id="PRODUCT_FIRST_VISUALIZATION" data-visualization="WORKFLOW_DIAGRAM">
          <div className="vg-container pv-prose">
            <h2>Who this is for</h2>
            <p>This page is for tenant-rep brokers, independent CRE brokers, and boutique advisory teams who currently rebuild lease workbooks deal by deal.</p>
            <h2>Broker workflow and lease-comparison friction</h2>
            <p>The current method fails when face rent is the headline, CAM lives in a separate tab, and incentives live in separate emails. A hidden cell changes the ranking. The client gets a story instead of a cash-flow argument.</p>
            <h2>Spreadsheet workflow problems</h2>
            <p>Spreadsheets are fine calculators. They are poor shared methods. Each deal rebuilds a workbook. Discount-rate cases disappear. The proposed workflow keeps cash-flow compare, NPV + sensitivity, and a shareable client summary together.</p>
            <ProductUiFrame title="Proposed tenant-rep workspace" caption="Illustrative sample — not customer data.">
              ${leaseAbTable("tr_ui")}
            </ProductUiFrame>
            ${cashFlowTable("tr_cf")}
            <h2>Scenario modeling and client presentations</h2>
            <p>Change the discount rate, keep the lease terms in view, and share an illustrative summary. Sample figures are not customer results. The value is that sensitivity stays visible.</p>
            <h2>Common questions</h2>
            <p>See <a href="/commercial-lease-npv">NPV</a>, <a href="/compare-commercial-leases">comparison</a>, and <a href="/resources">the resources hub</a> for educational depth. This page stays on the professional workflow.</p>
            <h2>Pricing hypothesis</h2>
            <p>$290 per year or $149 per deal. Payment is not collected. Willingness to pay is not proven.</p>
            <p>Positioning, problem, product visualization, benefits, use cases, and trust or disclosure sit on this persona page because the conversion path is for tenant-rep brokers, not a generic audience.</p>
            ${educationalScaffold("the tenant-rep broker workflow")}
            ${depthExpansion("the tenant-rep broker workflow", "Lease-comparison friction is the rebuilt workbook. Spreadsheet workflow problems are hidden cells and separate tabs. Scenario modeling and client presentations need a shareable summary. Common questions belong on the authority spokes. Objections include finished-product expectations and treating lower NPV as automatic advice. Who it is not for remains landlords and property managers. The pilot CTA is Request Pilot Access.")}
            ${commercialClose([{ href: "/how-it-works", label: "How it works" }, { href: "/resources", label: "Authority resources" }])}
          </div>
        </section>`,
    "../../../",
  );
}
