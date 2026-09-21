/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { ProductUiFrame } from "../../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Commercial lease economics resources",
  description: "A bounded guide to commercial lease economics topics used when comparing occupancy cost and NPV.",
  alternates: { canonical: "/resources" },
  robots: { index: true, follow: true },
  openGraph: { title: "Commercial lease economics resources", description: "A bounded guide to commercial lease economics topics used when comparing occupancy cost and NPV." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/resources" role="EDUCATIONAL_HUB" pattern="EDUCATIONAL_HUB" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/resources"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/resources","label":"Commercial lease economics resources"}]} />
        
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="EDUCATION" data-section-id="res_hero" data-pattern-id="PROGRESSIVE_DISCLOSURE" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial context. Not a customer photo." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container">
            <p className="pv-eyebrow">Resources</p>
            <h1 className="pv-display">Commercial lease economics, grouped by how decisions are made</h1>
        <section className="pv-section onpv-page-depth" data-depth="resources-hub">
          <div className="vg-container">
            <h2>How to use these resources</h2>
            <p>Use this hub to learn commercial lease comparison, occupancy costs, NPV, and the OccupancyNPV workflow before or after you open a DealWorkspace. Read a topic, then apply the same inputs in the product: lease scenarios, cash-flow, occupancy cost, NPV, and sensitivity.</p>
            <p>These pages explain concepts. They are not legal or investment advice. Next: start the 3-day free trial or open related product paths.</p>
          </div>
        </section>
            <div data-question-id="q_c4820393313b1c0d" data-answer-chunk-id="q_c4820393313b1c0d_chunk"><AnswerFirst question="Which topics matter when comparing commercial leases?" answer="The smallest useful cluster is occupancy-cost comparison, NPV, discount-rate sensitivity, and tenant improvement allowance, plus CAM, free rent, escalations, and lease structure. This hub is the QuestionKnowledgeGraph map for that cluster, not a complete market encyclopedia." /></div>
          </div>
        </header>
        <section className="pv-section" data-depth-resources="true" data-section-type="RELATED" data-surface="TINTED"><div className="vg-container"><h2>More search-demand questions</h2><div className="pv-related"><p className="pv-surface"><a href="/commercial-lease-npv/why-use-npv-when-comparing-leases">Why use NPV when comparing commercial leases?</a></p><p className="pv-surface"><a href="/commercial-lease-npv/npv-vs-total-lease-cost">Why do NPV and total lease cost differ?</a></p><p className="pv-surface"><a href="/commercial-lease-npv/should-cam-be-in-lease-npv">Should CAM be included in lease NPV?</a></p><p className="pv-surface"><a href="/lease-comparison/how-do-cfos-review-lease-comparisons">How do CFOs review commercial lease comparisons?</a></p><p className="pv-surface"><a href="/lease-comparison/how-do-cam-charges-change-a-comparison">How do CAM charges change a lease comparison?</a></p><p className="pv-surface"><a href="/lease-comparison/questions-to-ask-before-signing-a-commercial-lease">What questions should a business ask before signing a commercial lease?</a></p><p className="pv-surface"><a href="/effective-rent/what-is-effective-rent">What is effective rent in a commercial lease?</a></p><p className="pv-surface"><a href="/effective-rent/blended-rent-vs-effective-rent">What is blended rent versus effective rent?</a></p><p className="pv-surface"><a href="/effective-rent/effective-rent-vs-asking-rent">What is the difference between effective rent and asking rent?</a></p><p className="pv-surface"><a href="/effective-rent/effective-rent-on-gross-and-net-leases">Does effective rent work the same on gross and net leases?</a></p><p className="pv-surface"><a href="/effective-rent/simple-average-vs-npv-adjusted-effective-rent">Should you use a simple average or an NPV-adjusted effective rent?</a></p><p className="pv-surface"><a href="/occupancy-costs/how-property-taxes-change-occupancy-cost">How do property taxes change occupancy cost?</a></p><p className="pv-surface"><a href="/occupancy-costs/how-insurance-changes-occupancy-cost">How does insurance change occupancy cost?</a></p><p className="pv-surface"><a href="/occupancy-costs/base-rent-vs-occupancy-cost">What is the difference between base rent and occupancy cost?</a></p><p className="pv-surface"><a href="/occupancy-costs/occupancy-cost-on-gross-vs-net-leases">How do you compare occupancy cost on a gross lease and a net lease?</a></p><p className="pv-surface"><a href="/occupancy-costs/why-lowest-rent-can-cost-more">Why can the lowest rent option have a higher occupancy cost?</a></p><p className="pv-surface"><a href="/occupancy-costs/how-cam-caps-change-occupancy-cost-risk">How do CAM caps change occupancy-cost risk?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis">What is the difference between sensitivity analysis and scenario analysis?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking">How does rent-escalation sensitivity change a lease ranking?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking">How does CAM sensitivity change a lease ranking?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals">What decision risks does lease sensitivity reveal?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking">Which lease assumptions flip a ranking first?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice">How does occupancy-cost sensitivity change a location choice?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/lease-abstract-vs-financial-analysis">What is the difference between a lease abstract and a financial analysis?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/common-broker-lease-analysis-mistakes">What are common broker lease-analysis mistakes?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/how-analysis-changes-negotiation-strategy">How does analysis change negotiation strategy?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/how-analysis-supports-lease-negotiation">How does analysis support lease negotiation?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary">What belongs in a client-facing lease summary?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client">How do you compare multiple spaces for one client?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/what-is-a-commercial-lease-financial-model">What is a commercial lease financial model?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-free-rent-sits-in-a-lease-model">How should free rent sit in a lease model?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model">How should a TI allowance sit in a lease model?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model">How should rent escalations sit in a lease model?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model">How do you run scenario analysis in a lease model?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-to-present-a-lease-model-to-a-client">How should a lease model be presented to a client?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-cam-sits-in-a-lease-model">How should CAM sit in a lease model?</a></p></div></div></section>
        
        
        <section className="pv-section" data-expansion-resources="true"><div className="vg-container"><h2>New search-validated questions</h2><div className="pv-related"><p className="pv-surface"><a href="/commercial-lease-npv/how-is-lease-npv-calculated">How is lease NPV calculated?</a></p><p className="pv-surface"><a href="/commercial-lease-npv/what-costs-belong-in-lease-npv">What costs belong in commercial lease NPV?</a></p><p className="pv-surface"><a href="/commercial-lease-npv/npv-vs-present-value">What is the difference between NPV and present value in a lease?</a></p><p className="pv-surface"><a href="/commercial-lease-npv/how-to-explain-lease-npv-to-clients">How should you explain lease NPV to a client?</a></p><p className="pv-surface"><a href="/lease-comparison/how-do-you-normalize-commercial-lease-proposals">How do you normalize commercial lease proposals?</a></p><p className="pv-surface"><a href="/lease-comparison/how-do-you-compare-gross-and-net-leases">How do you compare a gross lease and a net lease?</a></p><p className="pv-surface"><a href="/lease-comparison/what-belongs-in-a-commercial-lease-comparison">What belongs in a commercial lease comparison?</a></p><p className="pv-surface"><a href="/lease-comparison/how-do-brokers-compare-lease-offers">How do tenant-rep brokers compare lease offers?</a></p><p className="pv-surface"><a href="/effective-rent/how-to-calculate-effective-rent">How do you calculate effective rent?</a></p><p className="pv-surface"><a href="/effective-rent/effective-rent-vs-face-rent">What is the difference between effective rent and face rent?</a></p><p className="pv-surface"><a href="/effective-rent/effective-rent-per-square-foot">What is effective rent per square foot?</a></p><p className="pv-surface"><a href="/effective-rent/common-effective-rent-mistakes">What are common effective rent mistakes?</a></p><p className="pv-surface"><a href="/occupancy-costs/what-is-total-occupancy-cost">What is total occupancy cost in a commercial lease?</a></p><p className="pv-surface"><a href="/occupancy-costs/what-is-cam-in-a-commercial-lease">What is CAM in a commercial lease?</a></p><p className="pv-surface"><a href="/occupancy-costs/hidden-occupancy-costs">What hidden occupancy costs do tenants miss?</a></p><p className="pv-surface"><a href="/occupancy-costs/occupancy-cost-per-square-foot">What is occupancy cost per square foot?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis">Why use sensitivity analysis on a commercial lease?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking">How does discount-rate sensitivity change a lease ranking?</a></p><p className="pv-surface"><a href="/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo">How should you present lease scenarios to a CFO?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois">How do you compare commercial LOIs?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo">What belongs in a lease recommendation memo?</a></p><p className="pv-surface"><a href="/tenant-rep-analysis/how-to-compare-renewal-vs-relocation">How do you compare a renewal versus a relocation?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model">What inputs belong in a commercial lease model?</a></p><p className="pv-surface"><a href="/lease-financial-modeling/how-to-build-a-lease-cash-flow-model">How do you build a lease cash-flow model?</a></p></div></div></section>
        <section className="pv-section" data-section-type="EDUCATION" data-section-id="res_hub" data-pattern-id="PROGRESSIVE_DISCLOSURE" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Topic overview</h2>
            <p>Topic definition, subtopic summaries, semantic navigation, spoke links, key questions, and a conversion path are the hub contract. This page is not a card directory.</p>
            <p>Commercial lease comparison fails when face rent is treated as the whole story. This authority hub groups the concepts that change occupancy cost and NPV so a tenant-rep broker can move from a question to a spoke, then to the OccupancyNPV workflow. The smallest useful cluster still starts with comparison, NPV, discount-rate sensitivity, and tenant improvement allowance. CAM, free rent, escalations, and gross-versus-net structure now have dedicated spokes because they change rankings.</p>
            <h2>Question-oriented navigation</h2>
            <p>Related questions by intent sit inside each question cluster. Definitional questions land on dedicated pages. Calculation and limitation questions sit as article sections. Pilot and pricing questions stay on FAQ and pricing so this hub does not dump the entire graph.</p>
            <div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="TOPIC_MAP" data-visualization-secondary="CLUSTER_MAP">
              <h3>Visual topic map</h3>
              <p className="pv-caption">Spoke introduction — why it matters for the cluster</p>
              <table className="pv-compare pv-fin-table">
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
              <li>How OccupancyNPV turns those answers into a client summary.</li>
            </ul>
            <p>Industry terminology context comes from professional organizations, not from ranking claims. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
            <div className="pv-data-panel pv-table-shell pv-table-designed pv-wide-module" data-visualization="SPOKE_RELATIONSHIP">
              <p>Spoke relationship: NPV, comparison, TI, discount rate, CAM, free rent, escalations, and structure all feed the same occupancy-cost decision.</p>
            </div>
            
        <section className="pv-section pv-question-cluster" data-section-type="EXPLANATION" data-section-id="scaffold_why" data-composition="question-cluster" data-pattern-id="PROGRESSIVE_DISCLOSURE" data-surface="SUBTLE">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Why it matters</h2>
            <p>Deeper explanation of the commercial lease economics hub belongs in the comparison because face rent alone hides timing. How it works in practice: put the cash event on the occupancy-cost timeline, then discount. This is the next logical step after reading a definition.</p>
            <h2>Related concepts</h2>
            <p>Related concepts include occupancy cost, NPV, tenant improvement allowance, free rent, CAM, and rent escalations. Contextual CTA: open OccupancyNPV or review pricing after the numbers are explicit.</p>
            <p>Common mistakes are listed on this page. Authority sources sit below. Internal links connect the hub, the comparison method, and early access.</p>
          </div>
        </section>
        <section className="pv-section pv-worked-example" data-section-type="EXAMPLE" data-section-id="scaffold_example" data-composition="worked-example" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="SUBTLE">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>Example</h2>
            <p>ILLUSTRATIVE EXAMPLE. The Lease A versus Lease B figures used across this site are educational samples, not customer results. They exist so the commercial lease economics hub can be seen beside rent, CAM, TI, free rent, and escalations instead of as an isolated slogan.</p>
            <h2>How it works</h2>
            <p>Capture the term. Place it on the cash-flow stream. Discount. Compare. Keep the assumption visible. That sequence is the product visualization of the OccupancyNPV workflow, not a production screenshot.</p>
          </div>
        </section>
            
        <section className="pv-section pv-callout-band" data-section-type="DEPTH" data-section-id="scaffold_depth" data-composition="callout-band" data-pattern-id="DATA_DENSITY_WITH_CLARITY" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <h2>A fuller reading of the commercial lease economics hub</h2>
            <p>A hub is not a directory. Each spoke has to change a decision: whether face rent is comparable, whether an incentive is timed, whether a ranking survives a nearby discount rate, and whether lease structure hides operating expenses. Question-oriented navigation exists so a broker can enter at the question they were asked in a meeting and leave with a spoke, a limitation, and a commercial path. Future silo URLs are documented and not executed in this successor so the live validation paths stay stable.</p>
            <p>Tenant-rep brokers still have to verify the lease. This page does not replace counsel. It does not claim FASB, NAIOP, or BOMA endorsement. It uses those organizations as independent professional context so a citation-ready answer can name the entity, state the fact, and show the limitation.</p>
            <p>If two options differ only by a brochure number, the comparison is unfinished. If they differ by when cash moves, the comparison is an NPV problem. If they differ by who pays operating expenses, the comparison is a structure problem. the commercial lease economics hub is one of those differences. The proposed focused workflow keeps those differences on one in-workspace client summary.</p>
            <p>Current prices are $290 per year for Professional and $149 per deal for Per-Deal. Live checkout is available on the pricing page. A serious owner can publish this page because the example is labeled, the sources are named, and the conversion path is honest.</p>
            <p>See <a href="/">the offer</a>, <a href="/resources">the resources hub</a>, <a href="/compare-commercial-leases">the comparison method</a>, <a href="/how-it-works">how it works</a>, <a href="/commercial-lease-npv">commercial lease NPV</a>, and <a href="/early-access">Request Pilot Access</a>. The parent hub and the commercial homepage stay one click away.</p>
          </div>
        </section>
            <div className="pv-source-block" data-composition="source-block"><AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP — commercial real estate organization"},{"href":"https://www.boma.org/","label":"BOMA — commercial building organization"},{"href":"https://www.investopedia.com/terms/n/npv.asp","label":"Investopedia — net present value"}]} /></div>
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/pricing", label: "Pricing" }, { href: "/early-access", label: "Request Pilot Access" }, { href: "/faq", label: "OccupancyNPV questions" }]} />
            <p><a className="pv-cta pv-cta--ghost" href="/early-access">Request Pilot Access</a> · <a href="/pricing">Review pricing</a></p>
          </div>
        </section>
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container pv-authority-shell">
          <nav className="sn-block" data-semantic-navigation="RELATED_TOPICS" aria-label="Explore the topic map">
            <div className="sn-block-head">
              <span className="sn-kicker">RELATED TOPICS</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-6">
            <a className="sn-card" data-card-role="TOPIC" href="/commercial-lease-npv/" data-relationship="cross-topic" aria-label="Commercial lease NPV. Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how ">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/lease-comparison/" data-relationship="cross-topic" aria-label="Lease comparison. Compare two or more commercial leases on the same timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease comparison</strong><span className="sn-desc">Compare two or more commercial leases on the same timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/effective-rent/" data-relationship="cross-topic" aria-label="Effective rent. Effective rent averages a lease into one number.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Effective rent</strong><span className="sn-desc">One rent number can hide later bills.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/occupancy-costs/" data-relationship="cross-topic" aria-label="Occupancy costs. Face rent is not the full bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Occupancy costs</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/lease-sensitivity-analysis/" data-relationship="cross-topic" aria-label="Lease sensitivity analysis. A ranking can flip when one assumption changes.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Lease sensitivity analysis</strong><span className="sn-desc">Watch which input can flip the ranking.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. Put both offers on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            </div>
          </nav>
        </div>
        </section>
        <VentureFooter />
      </PageIdentity>
    </PageShell>
  );
}
