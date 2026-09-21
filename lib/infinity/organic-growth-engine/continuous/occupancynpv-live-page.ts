import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import {
  buildConnectedSchemaGraph,
  occupancynpvOrganization,
  type SchemaFaqItem,
} from "./schema-standard";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "./urls";

export const OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION = "How is cap rate calculated?" as const;

export const OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER =
  "Cap rate is net operating income divided by the property’s current value or purchase price. It is a property-income shorthand. It is not the same tool as a commercial-lease NPV, which discounts occupancy-cost cash over a lease term." as const;

export function occupancynpvLiveCapRatePage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_LIVE_CAP_RATE_PATH.replace(/\/+$/, ""),
    role: "QUESTION_PAGE",
    primaryIntent: "DEFINITIONAL",
    parentHub: "/commercial-lease-npv",
    title: "How is cap rate calculated?",
    metaDescription:
      "Cap rate equals NOI divided by value. See a worked sample, what the number leaves out, and why OccupancyNPV treats lease NPV as a different comparison.",
    canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "commercial-lease-npv",
    pageOpportunityId: "organic-v2-live-cap-rate",
  };
}

export function occupancynpvCapRateFaqs(): SchemaFaqItem[] {
  return [
    {
      question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
      answer: OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER,
    },
    {
      question: "Is cap rate the same as commercial-lease NPV?",
      answer:
        "No. Cap rate is a property-income ratio. Commercial-lease NPV discounts occupancy-cost cash over a lease term.",
    },
    {
      question: "Should trailing or projected NOI be used?",
      answer: "Name which one. Trailing income is observed. Projected income is a claim.",
    },
  ];
}

export function occupancynpvLiveCapRateCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Commercial lease NPV", item: "/commercial-lease-npv/" },
    { name: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, item: OCCUPANCYNPV_LIVE_CAP_RATE_PATH },
  ];
}

export function occupancynpvLiveCapRateSchema() {
  const page = occupancynpvLiveCapRatePage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "EVERGREEN_RESOURCE",
      url: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
      canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
      breadcrumbs: occupancynpvLiveCapRateCrumbs(),
      visible_breadcrumbs: occupancynpvLiveCapRateCrumbs(),
      speakable_css_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
      faqs: occupancynpvCapRateFaqs(),
      visible_faqs: occupancynpvCapRateFaqs(),
      date_published: "2026-09-17",
      date_modified: "2026-09-17",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["capitalization rate", "net operating income"],
      mentions: ["commercial lease NPV", "cash-on-cash return", "IRR"],
      article_section: "Commercial lease NPV",
      link_canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    },
  });
}

export function occupancynpvLiveCapRatePageSource(): string {
  const page = occupancynpvLiveCapRatePage();
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/commercial-lease-npv", label: "Commercial lease NPV" },
    { href: page.route, label: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION },
  ];
  const sources = [
    { href: "https://www.investopedia.com/terms/c/capitalizationrate.asp", label: "Investopedia — capitalization rate" },
    { href: "https://www.investopedia.com/terms/n/noi.asp", label: "Investopedia — net operating income" },
    { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What NPV means in a commercial lease" },
  ];
  const body = `
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as page context. Not a customer photo." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">Commercial lease NPV</p>
            <h1 className="pv-display">${OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION}</h1>
            <div id="direct-answer" data-question-id="how-is-cap-rate-calculated" data-answer-chunk-id="how-is-cap-rate-calculated_chunk">
              <AnswerFirst question=${JSON.stringify(OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION)} answer=${JSON.stringify(OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER)} />
            </div>
            <div id="summary"><p>${OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER}</p></div>
            <p>This page is an educational resource on OccupancyNPV. It is not investment advice and not a live appraisal.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">Read what lease NPV means</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>What is a cap rate?</h2>
            <p>A capitalization rate, or cap rate, is a simple ratio used on income-producing property. It asks: if I buy this building at this price, how large is the unlevered income relative to that price?</p>
            <p>In words, the formula is: cap rate equals net operating income divided by current market value or purchase price.</p>
            <p>NOI is income after operating expenses and before debt service, income taxes, and most capital spending. Value is the price a buyer pays or a current estimate of what the property would sell for. If either input is wrong, the rate is wrong.</p>
            <aside className="pv-callout" id="key-takeaways" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>${OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER}</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How the calculation works</h2>
            <ol>
              <li>Collect a full-year NOI that matches the property, not a marketing slogan.</li>
              <li>Choose the value you are testing: the offer price, the last sale, or a stated appraisal.</li>
              <li>Divide NOI by that value.</li>
              <li>State the date, the property type, and whether the income is trailing or pro forma.</li>
            </ol>
            <p>People say “6 percent cap” as if it were a complete underwriting model. It is one ratio. It does not replace a cash-flow schedule, occupancy risk, or lease-by-lease review.</p>
            <p>Going-in cap rate uses the purchase price and the income near acquisition. Exit cap rate is a later sale assumption. Asking cap rate is a listing claim. Name which one you mean.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked teaching sample</h2>
              <p>This is a labeled teaching sample. It is not a market average and not a client result.</p>
              <div className="pv-table-shell pv-wide-module" data-visualization="ASSUMPTION_TABLE">
                <table className="pv-fin-table">
                  <caption className="pv-caption">Sample going-in cap rate</caption>
                  <thead><tr><th scope="col">Input</th><th scope="col">Sample</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Net operating income</th><td>$120,000</td></tr>
                    <tr><th scope="row">Purchase price</th><td>$2,000,000</td></tr>
                    <tr><th scope="row">Cap rate</th><td>6 percent</td></tr>
                  </tbody>
                </table>
              </div>
              <p>If NOI is $120,000 and the buyer pays $2,000,000, the going-in cap rate is 0.06, or 6 percent, before financing. If vacancy rises and NOI falls to $100,000 at the same price, the implied rate is 5 percent. The building did not become “safer.” The income got smaller.</p>
              <p>Occupancy, rent steps, concessions, and unrecovered expenses change NOI. Recalculate income before you restated the rate.</p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXPLANATION" data-section-id="why" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Why this matters next to lease NPV</h2>
            <p>A capitalization rate ranks a property from one income line and one price. A commercial-lease NPV ranks occupancy-cost paths over time at an explicit discount rate.</p>
            <p>Brokers and occupiers mix the two when a landlord quotes a yield-like story for a lease, or when a buyer uses a property income ratio as the discount rate for tenant cash flows. Those are different questions.</p>
            <p>Use this page when someone asks how the ratio is calculated. Use the <a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">lease NPV explainer</a> when the decision is which occupancy path costs less in today’s dollars.</p>
            <p>If extras such as <a href="/occupancy-costs/what-is-cam-in-a-commercial-lease/">CAM</a> sit on the tenant, they belong in occupancy cost, not as a silent fudge inside a property income ratio.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="CALCULATION" data-section-id="inverse" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How to calculate property value from NOI and the ratio</h2>
            <p>Rearrange the formula: property value equals NOI divided by the capitalization rate. If NOI is $100,000 and the buyer requires 8 percent, implied value is $1,250,000.</p>
            <p>That inverse is only as good as the income and the required yield. A silent vacancy guess or a silent capital reserve can move the implied price without changing the advertised NOI.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="INTERPRETATION" data-section-id="interpret" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>What a high or low ratio implies</h2>
            <p>A higher going-in ratio often implies more perceived risk, weaker growth, shorter remaining term, or a less durable tenant. A lower ratio can reflect stronger credit, longer leases, or a tighter market. A low ratio is not automatically a better asset.</p>
            <p>Rates differ by property type because office, industrial, retail, and multifamily carry different vacancy, expense, and rollover risk. Do not compare a downtown office yield to a single-tenant industrial yield as if the risk were identical.</p>
            <p>Interest rates affect required yields because they change the cost of capital. That financing relationship is covered in the editorial note <a href="/blog/valuation/how-interest-rates-affect-commercial-property-values/">How interest rates affect commercial property values</a>.</p>
            <p>Vacancies and operating expenses affect the ratio by changing NOI. If occupancy falls or unrecovered expenses rise, income falls and the implied yield falls at the same price.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="COMPARISON" data-section-id="compare" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2>Comparisons: cash-on-cash return and IRR</h2>
            <p>Cash-on-cash return uses levered cash after debt service against equity in. The capitalization rate is unlevered. They answer different questions.</p>
            <p>IRR is a time-weighted return across a hold, including sale. The income ratio is a single-period screen. Use IRR when the hold, leverage, and exit matter. Use the ratio to compare asking prices against current income.</p>
            <p>Can the ratio be negative? Only if NOI is negative. That is a distress or lease-up story, not a normal going-in quote.</p>
            <p>Should trailing or projected NOI be used? Name it. Trailing income is observed. Projected income is a claim. Mixing them without a label is a common error in commercial real estate valuation conversations.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>Common mistakes</h2>
            <ul>
              <li>Using pro forma income as if it were trailing income without saying so.</li>
              <li>Leaving vacancy, concessions, or unrecovered expenses out of NOI.</li>
              <li>Comparing cap rates across property types or cities as if the risk were identical.</li>
              <li>Using a property cap rate as the discount rate for a tenant lease comparison.</li>
              <li>Treating one ratio as a full valuation, financing, or occupancy decision.</li>
            </ul>
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Limits</h2>
            <p>This page does not publish a current market-average cap rate. Those figures move by property type, tenancy, and date. Cite the source and date if you use one.</p>
            <p>Calculations here are informational. They are not legal advice, tax advice, or an appraisal.</p>
            <RelatedContent items={[
              { href: "/commercial-lease-npv/", label: "Commercial lease NPV hub" },
              { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV in a commercial lease?" },
              { href: "/occupancy-costs/what-is-cam-in-a-commercial-lease/", label: "What is CAM in a commercial lease?" },
              { href: "/compare-commercial-leases", label: "Compare commercial leases" },
              { href: "/blog/valuation/how-interest-rates-affect-commercial-property-values/", label: "How interest rates affect commercial property values" },
            ]} />
            <p><PrimaryCTA href="/compare-commercial-leases">Compare Your Lease Options</PrimaryCTA></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="FAQ" data-section-id="faq" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>FAQ</h2>
            ${occupancynpvCapRateFaqs().map((row) => `<div><h3>${row.question}</h3><p>${row.answer}</p></div>`).join("\n            ")}
          </div>
        </section>
        <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
          <h2>Trusted sources</h2>
          <p>These are public references. They are not endorsements and not client results.</p>
          <AuthorityRefs items={${JSON.stringify(sources)}} />
        </section>
        <Disclosure>Use the figures in your lease proposals and confirm final terms against the actual lease documents.</Disclosure>`;
  return innerPageShell({ page, importDepth: "../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvLiveCapRateDraftText(): string {
  return [
    OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER,
    "What is a capitalization rate? It is the unlevered income ratio used on income-producing property: NOI divided by property value or purchase price.",
    "The formula is simple. What counts as NOI is not. NOI is income after operating expenses and vacancy, and before debt service, income taxes, and most capital spending.",
    "Worked example: NOI of $100,000 and property value of $1,250,000 produce an 8 percent going-in ratio. Apply the same inputs in reverse to calculate property value from the required yield.",
    "What raises or lowers the ratio? Vacancies, operating expenses, rent steps, concessions, and unrecovered expenses change NOI. Interest rates change the cost of capital and often the required yield.",
    "Why do rates differ by property type? Office, industrial, retail, and multifamily carry different vacancy and rollover risk. A good ratio in one type can be weak in another.",
    "How the ratio relates to risk: a higher going-in yield often implies more perceived risk or weaker growth. A lower yield can reflect stronger tenancy. A low number is not automatically a better asset.",
    "Limitations: the ratio is not leverage, not a full DCF, and not commercial-lease NPV. Common mistakes occur when people mix trailing and projected NOI or use the property yield as a tenant discount rate.",
    "Compare with cash-on-cash return: that metric is levered cash after debt against equity in. Compare with IRR: IRR is a hold-period return including sale.",
    "Can the ratio be negative? Only if NOI is negative. Should trailing or projected NOI be used? Name it. Trailing is observed. Projected is a claim.",
    "How vacancies affect the ratio: occupancy loss reduces NOI and lowers the implied yield at the same price. Operating expenses affect it the same way.",
    "How this affects commercial real estate valuation: buyers use the screen to compare asking prices against current income, then move to lease-level occupancy economics.",
    "A capitalization rate is a ratio used on income-producing property. It asks how large the unlevered income is relative to the price paid or the value used.",
    "Net operating income is income after operating expenses and before debt service, income taxes, and most capital spending.",
    "Value is the purchase price or a stated current estimate. If either input is incomplete, the ratio is incomplete.",
    "Name the date, the property type, and whether the income is trailing or pro forma before you repeat the number.",
    "A labeled teaching sample uses one hundred twenty thousand dollars of income and a two million dollar purchase price. That going-in ratio is six percent before financing.",
    "If vacancy rises and income falls at the same price, the implied ratio falls. The building did not become safer. The income got smaller.",
    "Going-in, exit, and asking versions of the ratio are not interchangeable. Say which one you mean.",
    "OccupancyNPV uses commercial-lease NPV to compare occupancy-cost paths over a term at an explicit discount rate.",
    "That lease comparison is a different question from ranking a building from one income line and one price.",
    "A common mistake is using a property income ratio as the discount rate for tenant cash flows. Keep the two tools beside each other instead of collapsing them.",
    "CAM, taxes, insurance, concessions, and unrecovered expenses change the income line. Recalculate income before you restate the ratio.",
    "Do not publish a current market-average figure on this page. Those figures move by property type, tenancy, and date, and they need a cited source.",
    "Related OccupancyNPV resources include the commercial lease NPV hub, the NPV explainer, the CAM explainer, and the lease comparison workflow.",
    "Use this page to apply the formula, recalculate income, and name the purchase price or other value source. Cash flow timing still belongs in NPV or IRR.",
    "This resource is educational. It is not an appraisal, not legal advice, and not a claim about a live client result.",
    "When a prospect asks how the ratio is built, answer the formula first, then show the income and price inputs, then show the limits.",
    "When the same person asks which occupancy path costs less, move to the lease NPV explainer and put both options on one timeline.",
    "If extras sit with the tenant, they belong in occupancy cost. Do not hide them inside a building-level income ratio.",
    "State assumptions in writing. A silent vacancy guess or a silent capital reserve can flip the story without changing the advertised price.",
    "Use public references for definitions. Prefer primary or widely cited explainers. Do not invent a city-wide average to finish the page.",
    "Sales can send this page when the question is definitional. Sales should not send it as a substitute for a full lease comparison.",
    "After publication, indexation is not assumed. The page starts as published and discovery pending until search systems show otherwise.",
  ].join(" ");
}
