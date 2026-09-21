/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { ProductUiFrame } from "../../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "Questions about OccupancyNPV",
  description: "Direct answers about this early-validation lease comparison concept, pricing, and what is not claimed.",
  alternates: { canonical: "/faq" },
  robots: { index: true, follow: true },
  openGraph: { title: "Questions about OccupancyNPV", description: "Direct answers about this early-validation lease comparison concept, pricing, and what is not claimed." },
};

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/faq" role="FAQ" pattern="FAQ_PAGE" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/faq"]} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/resources","label":"Resources"},{"href":"/faq","label":"Questions about OccupancyNPV"}]} />
        
        <header className="pv-hero pv-article-hero" data-section-type="FAQ" data-section-id="faq_hero" data-pattern-id="TRUST_NEAR_DECISION" data-surface="DEFAULT">
          <div className="vg-container">
            <h1 className="pv-display">Questions about OccupancyNPV</h1>
        <section className="pv-section onpv-page-depth onpv-faq" data-depth="faq" data-faq-architecture="categorized">
          <div className="vg-container">
            <h2>Getting Started</h2>
            <h3>What is OccupancyNPV?</h3>
            <p>OccupancyNPV is a live lease comparison and NPV workspace. You enter competing lease scenarios in a DealWorkspace and review cash-flow, occupancy cost, NPV, and discount-rate sensitivity. See <a href="/how-it-works">how it works</a>.</p>
            <h3>Who is it for?</h3>
            <p>It is for tenant-rep brokers and boutique CRE advisors who rebuild lease workbooks deal by deal. It is not for landlords running a portfolio or teams that need a CRM.</p>
            <h3>What problem does it solve?</h3>
            <p>Face rent, free rent, TI, CAM, and discount-rate cases usually live in separate cells and emails. OccupancyNPV keeps those inputs on one comparison so a hidden spreadsheet cell is less likely to flip the ranking.</p>
            <h2>Using OccupancyNPV</h2>
            <h3>What does OccupancyNPV compare?</h3>
            <p>It compares two or more lease scenarios inside one DealWorkspace. You choose any two saved scenarios to rank on NPV. See <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            <h3>What data do I enter?</h3>
            <p>You enter term, rent steps, free rent, monthly operating expenses, one-time costs, allowances, and an annual discount rate. Missing or overlapping rent months are rejected before save.</p>
            <h3>What results do I get?</h3>
            <p>The workspace returns cash-flow, occupancy cost, NPV, discount-rate sensitivity, and an in-workspace comparison summary. Those results use the assumptions you typed.</p>
            <h3>What is a DealWorkspace?</h3>
            <p>A DealWorkspace is the saved place for one comparison. Lease scenarios stay there so you can reopen, rename, or archive the work from your account.</p>
            <h3>Can I save my work and revisit prior comparisons?</h3>
            <p>Yes. Scenarios save in the DealWorkspace. From the account list you can reopen a workspace, rename it, or archive it. Creating another workspace after trial expiration requires Professional or Per-Deal.</p>
            <h3>Can I compare more than two leases?</h3>
            <p>You can store more than two scenarios in one DealWorkspace. Comparison ranks any two you select. OccupancyNPV does not rank an entire set in one click.</p>
            <h3>What does the product not do?</h3>
            <p>OccupancyNPV is not a CRM, not lease-administration software, and not a public share room. It does not administer occupied buildings.</p>
            <h2>Lease Analysis &amp; NPV</h2>
            <h3>What is lease NPV?</h3>
            <p>Lease NPV is the net present value of the cash-flow stream you entered. Later cash is not treated as equal to cash today. Read <a href="/commercial-lease-npv">commercial lease NPV</a>.</p>
            <h3>How does OccupancyNPV calculate comparisons?</h3>
            <p>NPV uses end-of-month cash flows and converts the annual discount rate to a monthly effective rate. Ranking uses NPV, not a subjective better label.</p>
            <h3>What is discount-rate sensitivity?</h3>
            <p>Discount-rate sensitivity shows whether the ranking flips when the rate moves. The rate stays visible so a ranking change is not an artifact of one hidden assumption.</p>
            <h3>What costs can be included?</h3>
            <p>Rent steps, free rent, monthly operating expenses or CAM, one-time costs, and allowances can sit in the same occupancy-cost stream. See <a href="/occupancy-costs">occupancy costs</a>.</p>
            <h3>How are free rent, escalations, TI, and CAM handled?</h3>
            <p>Free rent waives base rent only. Escalations are rent steps. A tenant-improvement allowance offsets month 1. CAM or operating expenses are monthly occupancy-cost inputs you enter.</p>
            <h3>What should I do with the result?</h3>
            <p>Use the ranking to discuss which scenario costs less on a discounted basis under your assumptions. Independently verify lease terms before anyone signs.</p>
            <h3>Is this legal or investment advice?</h3>
            <p>No. OccupancyNPV is not legal or investment advice. Calculations are informational. Lease terms should be independently verified.</p>
            <h2>Trial &amp; Pricing</h2>
            <h3>How does the 3-day trial work?</h3>
            <p>Start Free Trial opens the same account path and a 3-day no-card trial. OccupancyNPV does not automatically convert the trial into a paid plan and does not charge you when 72 hours end.</p>
            <h3>Is a credit card required, and does the trial auto-convert?</h3>
            <p>No credit card is collected for the trial. You will not automatically be charged. After the trial you can stop, start Professional, or buy Per-Deal.</p>
            <h3>What happens to saved work when the trial ends?</h3>
            <p>The trial does not charge you when it ends. Creating another DealWorkspace requires Professional or Per-Deal. Open <a href="/pricing">pricing</a> to continue.</p>
            <h3>What is Professional vs Per-Deal?</h3>
            <p>Professional is $290/year for one authenticated seat and billed annually. Per-Deal is $149 for one DealWorkspace and is not a subscription. Choose Professional for ongoing comparisons, or Per-Deal for one deal. OccupancyNPV does not sell a monthly Professional price.</p>
            <h3>Can pricing change?</h3>
            <p>The current published prices are $290/year Professional and $149 Per-Deal. OccupancyNPV does not publish a future price-change schedule.{/* EVIDENCE_GAP */}</p>
            <h2>Accounts &amp; Saved Work</h2>
            <h3>Do I need an account, and how do I sign back in?</h3>
            <p>Yes. Trial and paid access use an email and password. Return through <a href="/occupancynpv/app/login">Log In</a>. Failed sign-in shows an error on that form.</p>
            <h3>What customer data is stored?</h3>
            <p>OccupancyNPV stores the account email plus DealWorkspace names, scenarios, and comparison results needed to reopen saved work. Do not upload SSNs, bank details, or lease files into feedback forms. Formal security certifications are not published on this site.{/* EVIDENCE_GAP */}</p>
            <h2>Billing</h2>
            <h3>When am I charged, and what happens after checkout?</h3>
            <p>The trial does not charge you. Paid Professional or Per-Deal is charged when you complete checkout on the pricing page. After payment, OccupancyNPV returns you to the authenticated app so you can open a DealWorkspace.</p>
            <h3>What if checkout fails?</h3>
            <p>If checkout cannot start, the pricing page keeps you on the offer. OccupancyNPV does not mark a paid entitlement until checkout completes.</p>
            <h3>How do refunds or cancellation work?</h3>
            <p>You can stop after the trial without buying. A published refund window for paid Professional or Per-Deal is not stated on this site.{/* EVIDENCE_GAP */}</p>
            <h2>Limitations &amp; Support</h2>
            <h3>What does OccupancyNPV not replace?</h3>
            <p>It does not replace brokerage, legal, accounting, or investment advice. It does not replace lease-administration software.</p>
            <h3>What happens if inputs are incomplete?</h3>
            <p>The workspace asks you to add a scenario or choose two different scenarios before compare. Overlapping or missing rent months are not accepted.</p>
            <h3>How do I get help or suggest an improvement?</h3>
            <p>Email infinitemediaresources@gmail.com. You can also use <a href="/suggest-improvement">Suggest an Improvement</a> without creating an account.</p>
          </div>
        </section>
            <div data-question-id="q_4398580048d96d7a" data-answer-chunk-id="q_4398580048d96d7a_chunk"><AnswerFirst question="Does OccupancyNPV exist as a working product?" answer="Yes. OccupancyNPV is a live lease comparison and NPV workspace with authenticated access. Checkout is available for Professional and Per-Deal." /></div>
            <div data-question-id="q_85b4381ffb85f0fd" data-answer-chunk-id="q_85b4381ffb85f0fd_chunk"><AnswerFirst question="Can I purchase OccupancyNPV?" answer="Yes. Live checkout is available on the pricing page for $290/year Professional and $149/deal Per-Deal." /></div>
          </div>
        </header>
        <section className="pv-section" data-section-type="FAQ" data-section-id="faq_list" data-pattern-id="PROGRESSIVE_DISCLOSURE" data-surface="DEFAULT">
          <div className="vg-container pv-prose pv-authority-shell">
            <div className="pv-question-cluster" data-composition="question-cluster"><h2>Can I purchase OccupancyNPV?</h2>
            <p>Yes. Professional is $290 per year and Per-Deal is $149 per deal. Checkout is available on the pricing page.</p>
            <h2>Does OccupancyNPV exist as a working product?</h2>
            <p>Yes. OccupancyNPV is a working lease comparison product. Public rollout remains controlled.</p>
            <h2>What should participants expect?</h2>
            <p>A conversation about whether a focused commercial lease comparison workspace would replace a rebuilt spreadsheet. Not a live calculator product and not legal advice.</p></div>
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
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/pricing", label: "Pricing" }, { href: "/how-it-works", label: "How it works" }, { href: "/early-access", label: "Request Pilot Access" }]} />
            <p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>
          </div>
        </section>
        
        
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container pv-authority-shell">
          <nav className="sn-block" data-semantic-navigation="QUESTIONS_PEOPLE_ASK_NEXT" aria-label="Questions people ask next">
            <div className="sn-block-head">
              <span className="sn-kicker">QUESTIONS PEOPLE ASK NEXT</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-5">
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. Use one method on both offers.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/" data-relationship="related" aria-label="What is NPV in a commercial lease. NPV turns later lease costs into today's dollars so you can compare options fairly.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What is NPV in a commercial lease</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/what-discount-rate-should-you-use/" data-relationship="related" aria-label="What discount rate should be used for commercial lease NPV. The discount rate is the price of waiting.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>What discount rate should be used for commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/commercial-lease-npv/when-is-npv-the-wrong-metric/" data-relationship="related" aria-label="When is NPV the wrong metric. NPV is a consistency tool, not a complete decision.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>When is NPV the wrong metric</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
            </a>
            <a className="sn-card" data-card-role="QUESTION" href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/" data-relationship="related" aria-label="How do you compare two commercial lease proposals. Put both leases on one timeline.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Question</span><strong>How do you compare two commercial lease proposals</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
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
