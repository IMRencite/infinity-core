import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../../../components/site-chrome";
import { Disclosure, PageShell, PrimaryCTA } from "../../../../components/validation-grade";
import { VentureFooter } from "../../../../components/venture-footer";
import { SITE_SCHEMA } from "../../../../lib/site-schema";
export const metadata = {
  title: "How interest rates affect commercial property values — OccupancyNPV",
  description: "How financing costs move required yields, why the same NOI can imply a lower value, and what owners can stress-test. Not a tenant lease NPV.",
  alternates: { canonical: "/blog/valuation/how-interest-rates-affect-commercial-property-values/" },
  robots: { index: true, follow: true },
  openGraph: { title: "How interest rates affect commercial property values — OccupancyNPV", description: "How financing costs move required yields, why the same NOI can imply a lower value, and what owners can stress-test. Not a tenant lease NPV." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/blog/valuation/how-interest-rates-affect-commercial-property-values" role="EDUCATIONAL_ARTICLE" pattern="FOCUSED_HERO" cluster="valuation">
        <JsonLdBlock data={SITE_SCHEMA["/blog/valuation/how-interest-rates-affect-commercial-property-values"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/blog","label":"Blog"},{"href":"/blog/category/valuation/","label":"Valuation"},{"href":"/blog/valuation/how-interest-rates-affect-commercial-property-values","label":"How do interest rates affect commercial property values?"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO">
          <figure className="pv-hero-media">
            <img src="/media/hero-building.webp" alt="Editorial commercial building used as valuation context. Not a customer property." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow"><a href="/blog/category/valuation/" data-blog-category="Valuation" data-blog-taxonomy-link="category">Valuation</a> · 2026-09-17</p>
            <h1 className="pv-display">How do interest rates affect commercial property values?</h1>
            <p><a href="/blog/tag/interest-rates/" data-blog-tag="Interest Rates" data-blog-taxonomy-link="tag">Interest Rates</a> <a href="/blog/tag/cap-rates/" data-blog-tag="Cap Rates" data-blog-taxonomy-link="tag">Cap Rates</a> <a href="/blog/tag/commercial-real-estate/" data-blog-tag="Commercial Real Estate" data-blog-taxonomy-link="tag">Commercial Real Estate</a></p>
            <div id="direct-answer"><p>When borrowing costs rise, buyers often require a higher unlevered income yield to pay the same price. Same NOI at a higher capitalization rate is a lower indicated value. That is a property-valuation story. It is not a tenant occupancy-cost NPV.</p></div>
            <div id="summary"><p>Rates change the cost of capital. Owners should stress-test refinance, NOI after rollover, and indicated value at a higher going-in yield before treating a headline rate move as a one-size price cut.</p></div>
          </div>
        </header>
        <article className="pv-section onpv-blog-article-shell" data-section-type="ARTICLE" data-blog-article-shell="true">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-article-layout="true" data-blog-article-sidebar="true">
          <div className="onpv-blog-main pv-reading">
            <h2>Which interest rates are relevant to commercial real estate</h2>
            <p>A Federal Reserve policy rate is not the same as a commercial mortgage coupon. Treasuries are a risk-free benchmark. Credit spreads sit on top of those yields. Local lender risk appetite and the specific loan then set the quote you can actually close.</p>
            <p>Those layers can move at different times. A policy-rate cut can leave commercial mortgage rates sticky if credit spreads widen or lenders pull proceeds. A Treasury move can matter more than a press-conference line. Name the rate you are using before you translate it into value.</p>
            <h2>Why this matters commercially</h2>
            <p>A rate headline is not a completed price. Owners, buyers, and lenders still have to name NOI, leverage, and the bid that can actually clear. The commercial question is whether the same building still supports the same loan, the same equity check, and the same hold-versus-sell decision after the coupon moves.</p>
            <h2>Why borrowing costs matter</h2>
            <p>Debt service is cash the loan requires before equity sees residual cash. Higher rates raise that service for the same principal. At a fixed loan-to-value, coverage can fall unless NOI rises or the buyer reduces leverage and brings more cash equity.</p>
            <p>Unlevered buyers still reprice. Their opportunity cost of capital moved even if they never draw a loan. The required return conversation is larger than one coupon.</p>
            <div className="onpv-blog-flow" data-supporting-visual="rate-to-value">
              <span>Rate</span><span>Financing cost</span><span>Required return</span><span>Cap rate</span><span>Value</span>
            </div>
            <p>That chain is a teaching map, not a mechanical formula. Liquidity, tenant credit, and lease structure can interrupt any step.</p>
            <h2>How interest rates influence required returns</h2>
            <p>Buyers compare a going-in yield with the cost of debt and with other uses of equity. If debt is more expensive, a leveraged buyer may accept a lower price for the same NOI so the going-in yield still covers a tighter debt-service cushion.</p>
            <p>Cap rates do not move 1:1 with Treasury or Fed rates. Credit-spread, property-specific risk, and transaction liquidity sit between the benchmark and the bid. A 100-basis-point policy move is not a 100-basis-point cap-rate move on every asset.</p>
            <p>This page sits beside the evergreen resource <a href="/commercial-lease-npv/how-is-cap-rate-calculated/">How is cap rate calculated?</a>. Use that page for the formula. Use this page for the financing-context implication.</p>
            <h2>Valuation: NOI, cap rate, and property-specific risk</h2>
            <p>Indicated value is NOI divided by the going-in capitalization rate. Same NOI at a higher cap rate is a lower indicated value. NOI growth can offset part of that pressure. NOI decline can amplify it.</p>
            <p>Property-specific risk still matters. Tenant credit, remaining term, expense recovery, and deferred capital can keep two buildings from sharing one yield. Market liquidity matters too: a thin bid pool can sit with a wide bid-ask even when the arithmetic is clear.</p>
            <h2>Financing: LTV, DSCR, debt yield, and loan structure</h2>
            <p>Loan-to-value is principal divided by value or price. Debt-service coverage (DSCR) is NOI divided by annual debt service. Debt yield is NOI divided by loan amount. A higher coupon can fail a coverage or debt-yield test before the cap-rate story finishes.</p>
            <p>Interest-only periods can hide pressure until amortization starts. Floating-rate loans transmit a rate move into debt service before a sale. Balloon and maturity risk appear when proceeds no longer support the same LTV. An assumable loan can keep an older coupon in place for a buyer. Those edges change which cash-flow line moves first. They do not cancel the going-in yield conversation.</p>
            <h2>Buyer impact</h2>
            <p>Higher rates often mean lower leverage capacity, a higher cash-equity requirement, and a higher return hurdle. Pricing discipline shows up as sensitivity analysis: hold NOI fixed and change yield, then change NOI, then change leverage. Report all three.</p>
            <h2>Seller impact</h2>
            <p>The buyer pool can shrink when proceeds and coverage tighten. Pricing expectations that last marked a lower yield meet a wider bid-ask. Time-on-market can stretch until someone yields or NOI improves. Hold vs sell is a comparison of the bid you can clear against the hold income path, not a slogan about “rates.”</p>
            <h2>Owner and operator impact</h2>
            <p>Lease rollover, tenant quality, and expense control move NOI while the rate story is happening. Capital-expenditure plans and the refinancing timeline belong in the same workbook. A clean occupancy print does not prove coverage will survive a new coupon.</p>
            <h2>How different property types can react</h2>
            <p>Office stacks with near-term rollover and tenant-improvement spend often transmit a rate move through NOI as well as through yield. Retail depends on recovery and credit. Industrial with remaining term and recovered expenses can hold NOI while the bid still reprices. Multifamily can reprice rents faster than a long industrial lease. That can offset some yield pressure. It can also add expense and turnover cost. Other CRE types follow the same rule: shared rate, different income path. Do not invent one percentage decline for every asset class.</p>
            <h2>Market context without a fake forecast</h2>
            <p>Federal Reserve policy, Treasury yields, credit spreads, and lender risk appetite are separate inputs. Local supply and demand and transaction liquidity decide whether a bid clears. This page does not publish a current market-average cap rate or a dated Fed path. Those need a source with a retrieval date.</p>
            <h2>Scenario analysis</h2>
            <p>These are labeled teaching samples. They are not market averages and not client results.</p>
            <div className="pv-table-shell" data-supporting-visual="valuation-scenarios">
              <table className="pv-fin-table">
                <caption className="pv-caption">Indicative value = NOI ÷ going-in cap rate</caption>
                <thead><tr><th scope="col">Case</th><th scope="col">NOI</th><th scope="col">Cap rate</th><th scope="col">Indicated value</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Starting</th><td>$120,000</td><td>6%</td><td>$2,000,000</td></tr>
                  <tr><th scope="row">Higher required yield</th><td>$120,000</td><td>7%</td><td>$1,714,286</td></tr>
                  <tr><th scope="row">NOI growth offset</th><td>$135,000</td><td>7%</td><td>$1,928,571</td></tr>
                </tbody>
              </table>
            </div>
            <p>Same income at 7 percent instead of 6 percent cuts indicated value by about $286,000. Raising NOI to $135,000 at the same 7 percent recovers most of that gap ($1,928,571) but does not automatically restore the $2,000,000 starting mark. Higher rates do not always lower values by the same amount. The lesson is joint: yield and income both have to be named.</p>
            <h2>Financing example: loan sizing, equity, and DSCR</h2>
            <p>Assume a $2,000,000 purchase, 65 percent LTV, a $1,300,000 loan, and interest-only debt so annual debt service equals the coupon times principal. At 6 percent, annual debt service is $78,000. At $120,000 NOI, DSCR is 1.54x and cash after debt service is $42,000 on $700,000 equity.</p>
            <p>At 8 percent on the same principal, annual debt service is $104,000. DSCR falls to 1.15x. Cash after debt service is $16,000. If a lender keeps a 1.25x coverage test, the loan must shrink: $120,000 ÷ 1.25 = $96,000 of allowed service, so principal at 8 percent is $1,200,000. Equity required rises to $800,000. Simplifying assumptions: interest-only, constant NOI, no fees, no amortization, no reserve. Real quotes add all four.</p>
            <div className="pv-table-shell" data-supporting-visual="refinance-stress">
              <table className="pv-fin-table">
                <caption className="pv-caption">Same $2,000,000 price, interest-only teaching sample</caption>
                <thead><tr><th scope="col">Coupon</th><th scope="col">Loan</th><th scope="col">Debt service</th><th scope="col">DSCR</th></tr></thead>
                <tbody>
                  <tr><th scope="row">6%</th><td>$1,300,000</td><td>$78,000</td><td>1.54x</td></tr>
                  <tr><th scope="row">8% same loan</th><td>$1,300,000</td><td>$104,000</td><td>1.15x</td></tr>
                  <tr><th scope="row">8% 1.25x cap</th><td>$1,200,000</td><td>$96,000</td><td>1.25x</td></tr>
                </tbody>
              </table>
            </div>
            <h2>Cap rate, yield on cost, and cash-on-cash</h2>
            <p>Going-in cap rate is current or stabilized NOI over price. Yield on cost is stabilized NOI over total project cost. Cash-on-cash is levered cash after debt service over equity. A higher rate can leave the cap-rate story intact while cash-on-cash falls because coverage tightened. Do not treat cash-on-cash as proof the building’s unlevered value moved by the same amount.</p>
            <h2>What Owners Should Review When Rates Change</h2>
            <ul data-blog-checklist="true">
              <li>Debt maturity schedule and balloon dates.</li>
              <li>Rate structure: fixed, floating, interest-only, or amortizing.</li>
              <li>DSCR, LTV, and debt yield at the new coupon.</li>
              <li>Tenant rollover, expense growth, and NOI assumptions after vacancy.</li>
              <li>Cap-rate scenarios with the same NOI and with a changed NOI.</li>
              <li>Refinance proceeds versus remaining principal.</li>
              <li>Comparable sales that actually cleared, not last year’s ask.</li>
              <li>Current lender quotes, not a remembered spread.</li>
            </ul>
            <p>Keep tenant occupancy comparisons on a lease NPV timeline. See <a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">what NPV means in a commercial lease</a> and <a href="/compare-commercial-leases">compare commercial leases</a> when the discount rate on occupancy cost is the question.</p>
            <h2>Decision support for buyers, owners, sellers, and operators</h2>
            <p>Buyers should show yield, NOI, and leverage cases before they treat a headline rate as a finished price. Owners should put refinance and rollover on one page. Sellers should price the bid they can clear, not the mark they remember. Operators should treat expense control and capex as NOI tools, not afterthoughts. None of this is personalized financial advice.</p>
            <h2>Common mistakes and misconceptions</h2>
            <ul>
              <li>Using a property cap rate as the discount rate for a tenant lease comparison.</li>
              <li>Assuming every asset reprices by the same percentage as a policy-rate move.</li>
              <li>Ignoring leverage, DSCR, and debt yield when the story is “rates.”</li>
              <li>Mixing trailing and projected NOI without saying which one sits in the numerator.</li>
              <li>Treating a Fed print as a commercial mortgage quote.</li>
            </ul>
            <h2>Limitations and tradeoffs</h2>
            <p>Cap rates are not mechanically tied to rates. Local market, property quality, tenant credit, lease structure, NOI assumptions, and debt structure all matter. This page does not replace an appraisal. OccupancyNPV compares occupancy-cost paths. When the discount-rate sensitivity of two leases is the job, use <a href="/discount-rate-sensitivity">discount-rate sensitivity</a>.</p>
            <div id="key-takeaways"><h2>Key takeaways</h2><p>Rates change required yields. Same NOI at a higher yield is a lower indicated value. NOI, leverage, and lease durability can offset or amplify that move. Fed rates are not commercial mortgage rates. Tenant NPV remains a different tool.</p></div>
            <section data-section-type="FAQ">
              <h2>FAQ</h2>
              <div><h3>How do interest rates affect commercial property values?</h3><p>When borrowing costs rise, buyers often require a higher income yield to pay the same price. Same NOI at a higher cap rate implies a lower value. That is a buyer-yield story, not a tenant occupancy-cost NPV.</p></div>
              <div><h3>Do higher interest rates always lower property values?</h3><p>No. A higher required yield pressures price only if NOI, liquidity, and risk do not offset it. NOI growth can recover part of the gap. A one-for-one cut is not automatic.</p></div>
              <div><h3>How quickly do cap rates react?</h3><p>Cap rates reprice when bids clear, not when a policy rate prints. Thin markets can sit with a wide bid-ask until someone yields or NOI improves.</p></div>
              <div><h3>What matters more: cap rate or NOI?</h3><p>Both. Value is NOI divided by the going-in cap rate. A durable NOI path can offset a higher yield. A weaker NOI path amplifies it.</p></div>
              <div><h3>How do interest rates affect refinancing?</h3><p>A higher coupon raises debt service on the same principal. Coverage, LTV, and cash-on-cash can fail even when occupancy looks unchanged. Model maturity, balloon risk, and the new rate together.</p></div>
              <div><h3>Can rents offset higher interest rates?</h3><p>Sometimes. Rent growth that survives occupancy, concessions, and unrecovered expenses can lift NOI. Do not treat a rent ask as cash until rollover is modeled.</p></div>
              <div><h3>Which commercial property types are most sensitive?</h3><p>Assets with short leases, weak recovery, or heavy near-term rollover usually transmit a rate move faster. Long, credit-strong industrial or net-lease stacks can hold NOI while office or short retail stacks are still marking vacancy.</p></div>
              <div><h3>Should owners sell when rates rise?</h3><p>Not as a reflex. Compare hold NOI, refinance proceeds, and the bid you can actually clear. A wider bid-ask can make a sale more expensive than waiting if the income path is intact.</p></div>
              <div><h3>How should buyers model changing rates?</h3><p>Hold NOI fixed and change the going-in yield. Then change NOI. Then change leverage, DSCR, and equity. Report all three rather than one headline cut.</p></div>
              <div><h3>What happens when rates fall?</h3><p>Required yields can compress and loan proceeds can rise, but credit spreads and liquidity still matter. A lower policy rate does not restore every prior mark.</p></div>
              <div><h3>What is the difference between Fed rates and commercial mortgage rates?</h3><p>The Federal Reserve sets a policy rate. Commercial mortgages price from Treasury yields plus a credit spread and lender appetite. Those layers can move at different times.</p></div>
              <div><h3>Is that the same as a tenant lease NPV?</h3><p>No. Financing-cost valuation is a buyer-yield story. Tenant NPV is occupancy cost over time. See the evergreen NPV page rather than reusing a property cap rate as a lease discount rate.</p></div>
            </section>
            <section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <RelatedContent items={[
                { href: "/blog/", label: "Blog index" },
                { href: "/commercial-lease-npv/how-is-cap-rate-calculated/", label: "How is cap rate calculated?" },
                { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV in a commercial lease?" },
                { href: "/compare-commercial-leases", label: "Compare commercial leases" },
                { href: "/discount-rate-sensitivity", label: "Discount-rate sensitivity" },
                { href: "/resources", label: "Resource library" },
              ]} />
            </section>
            <section data-blog-article-discovery="true" data-blog-discovery-empty="true" data-blog-carousel-shared="LatestBlogsCarousel" hidden>
                <h2>Latest Blogs</h2>
              </section>
            <nav className="onpv-blog-seq" data-blog-sequential-nav="true" aria-label="Previous and next blog"></nav>
          </div>
            <aside className="onpv-blog-sidebar" data-blog-sidebar="true" data-blog-sidebar-shared="BlogSidebar">
              <nav className="onpv-blog-sidebar__panel" aria-label="Categories" data-blog-categories="true">
                <h2>Categories</h2>
                <ul><li className="onpv-blog-cat" data-blog-category="Valuation"><a href="/blog/category/valuation/" data-blog-category="Valuation" data-blog-taxonomy-link="category">Valuation</a><span>1</span></li></ul>
              </nav>
              <nav className="onpv-blog-sidebar__panel" aria-label="Topics" data-blog-tag-cloud="true">
                <h2>Topic cloud</h2>
                <div className="onpv-blog-cloud"><span data-count="1"><a href="/blog/tag/cap-rates/" data-blog-tag="Cap Rates" data-blog-taxonomy-link="tag">Cap Rates</a></span><span data-count="1"><a href="/blog/tag/commercial-real-estate/" data-blog-tag="Commercial Real Estate" data-blog-taxonomy-link="tag">Commercial Real Estate</a></span><span data-count="1"><a href="/blog/tag/interest-rates/" data-blog-tag="Interest Rates" data-blog-taxonomy-link="tag">Interest Rates</a></span></div>
              </nav>
              <section className="onpv-blog-sidebar__panel" aria-label="Resources" data-blog-popular-resources="true">
                <h2>Popular resources</h2>
                <p><a href="/commercial-lease-npv/how-is-cap-rate-calculated/">How is cap rate calculated?</a></p>
                <p><a href="/compare-commercial-leases">Compare commercial leases</a></p>
                <p><a href="/resources">Resource library</a></p>
              </section>
            </aside>
          </div>
        </article>
        <script dangerouslySetInnerHTML={{ __html: "(()=>{document.querySelectorAll(\"[data-blog-carousel-track]\").forEach((root)=>{const s=root.querySelector(\"[data-blog-carousel-scroller]\");const prev=root.querySelector(\"[data-blog-carousel-prev]\");const next=root.querySelector(\"[data-blog-carousel-next]\");if(!s||!prev||!next)return;const reduced=window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches;const sync=()=>{const max=Math.max(0,s.scrollWidth-s.clientWidth-2);prev.disabled=s.scrollLeft<=2;next.disabled=s.scrollLeft>=max;prev.setAttribute(\"aria-disabled\",String(prev.disabled));next.setAttribute(\"aria-disabled\",String(next.disabled));};const move=(d)=>{s.scrollBy({left:d*s.clientWidth*0.9,behavior:reduced?\"auto\":\"smooth\"});};prev.addEventListener(\"click\",()=>move(-1));next.addEventListener(\"click\",()=>move(1));s.addEventListener(\"scroll\",sync,{passive:true});window.addEventListener(\"resize\",sync);sync();});})();" }} />
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
