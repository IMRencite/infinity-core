/* data-composition-repaired="true" */
import { AnswerFirst, AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../../components/site-chrome";
import { OccupancynpvOfferBeacon } from "../../components/occupancynpv-offer-beacon";
import { ProductUiFrame } from "../../components/premium-venture";
import { Disclosure, PageShell, PrimaryCTA } from "../../components/validation-grade";
import { VentureFooter } from "../../components/venture-footer";
import { SITE_SCHEMA } from "../../lib/site-schema";
export const metadata = {
  title: "OccupancyNPV pricing",
  description: "OccupancyNPV pricing: $290 per year or $149 per deal. Live checkout is available for Professional and Per-Deal.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
  openGraph: { title: "OccupancyNPV pricing", description: "OccupancyNPV pricing: $290 per year or $149 per deal. Live checkout is available for Professional and Per-Deal." },
};

const PRICING_FAQ_SCHEMA = {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
              {
                "@type": "Question",
                "name": "Is the 3-day trial really free?",
                "acceptedAnswer": { "@type": "Answer", "text": "Yes. The trial does not collect a card and does not bill you. After 72 hours you choose Professional $290/year, Per-Deal $149, or you can stop." }
              },
              {
                "@type": "Question",
                "name": "Do I need a credit card for the trial?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. Start Free Trial asks you to sign in or create an account. It does not collect a card." }
              },
              {
                "@type": "Question",
                "name": "Will I automatically be charged after 3 days?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. OccupancyNPV does not automatically convert the trial into a paid plan." }
              },
              {
                "@type": "Question",
                "name": "What happens when the trial ends?",
                "acceptedAnswer": { "@type": "Answer", "text": "The trial ends after 72 hours. OccupancyNPV does not charge you. To create another DealWorkspace, buy Professional or Per-Deal." }
              },
              {
                "@type": "Question",
                "name": "What is included in Professional?",
                "acceptedAnswer": { "@type": "Answer", "text": "Professional is $290 per year for one authenticated user. During the paid period you can create DealWorkspaces and run lease comparisons with cash-flow, NPV, sensitivity, and an in-workspace comparison summary." }
              },
              {
                "@type": "Question",
                "name": "What does one Per-Deal purchase include?",
                "acceptedAnswer": { "@type": "Answer", "text": "Per-Deal is $149 for one DealWorkspace and one complete lease comparison." }
              },
              {
                "@type": "Question",
                "name": "Can I start with the trial and later buy Per-Deal?",
                "acceptedAnswer": { "@type": "Answer", "text": "Yes. After the trial, or during it, you can buy Per-Deal $149 instead of Professional." }
              },
              {
                "@type": "Question",
                "name": "Can I upgrade to Professional?",
                "acceptedAnswer": { "@type": "Answer", "text": "Yes. Start Professional on this page starts checkout for $290/year. You can do that during or after the trial." }
              },
              {
                "@type": "Question",
                "name": "Is Professional monthly or annual?",
                "acceptedAnswer": { "@type": "Answer", "text": "Professional is billed annually at $290/year. OccupancyNPV does not sell a monthly Professional price." }
              },
              {
                "@type": "Question",
                "name": "How many users are included?",
                "acceptedAnswer": { "@type": "Answer", "text": "One authenticated user. Extra Professional seats are not sold on this page." }
              },
              {
                "@type": "Question",
                "name": "Is OccupancyNPV a CRM?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. OccupancyNPV is a lease-comparison workspace. It is not a CRM." }
              },
              {
                "@type": "Question",
                "name": "Does OccupancyNPV replace lease administration software?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. It does not administer occupied buildings or replace lease-administration software." }
              },
              {
                "@type": "Question",
                "name": "What kind of lease analysis does OccupancyNPV support?",
                "acceptedAnswer": { "@type": "Answer", "text": "You enter lease scenarios in a DealWorkspace, then review cash-flow, occupancy costs, NPV, and discount-rate sensitivity." }
              },
              {
                "@type": "Question",
                "name": "Can I save my deal comparisons?",
                "acceptedAnswer": { "@type": "Answer", "text": "Yes. Comparisons live in your DealWorkspace. You can rename or archive a workspace from your account." }
              },
              {
                "@type": "Question",
                "name": "What happens to my work after the trial?",
                "acceptedAnswer": { "@type": "Answer", "text": "The trial does not charge you when it ends. Creating another DealWorkspace requires Professional or Per-Deal." }
              },
              {
                "@type": "Question",
                "name": "How do I get help?",
                "acceptedAnswer": { "@type": "Answer", "text": "Email infinitemediaresources@gmail.com. You can also use Suggest an Improvement on the site without creating an account." }
              }
              ]
            };

export default function Page() {
  return (
    <PageShell tone="cre">
      <PageIdentity route="/pricing" role="PRICING" pattern="PRICING_HYPOTHESIS_PAGE" cluster="Product">
        <JsonLdBlock data={SITE_SCHEMA["/pricing"]} />
        <JsonLdBlock data={PRICING_FAQ_SCHEMA} />
        <SiteBreadcrumb items={[{"href":"/","label":"Home"},{"href":"/pricing","label":"OccupancyNPV pricing"}]} />
        
        <header className="onpv-pricing-hero onpv-pricing-hero--overlay" data-section-type="PRICING" data-section-id="pr_hero" data-commercial-hero="overlay" data-pattern-id="TRUST_NEAR_DECISION" data-surface="EDITORIAL">
          <figure className="onpv-pricing-hero-media" aria-hidden="true">
            <img src="/media/hero-building.webp" alt="" width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="onpv-pricing-hero-shade" aria-hidden="true" />
          <div className="vg-container onpv-pricing-hero-copy">
            <p className="onpv-pricing-hero-eyebrow">OCCUPANCYNPV</p>
            <h1 className="onpv-pricing-hero-title">Compare commercial lease scenarios with confidence</h1>
            <p className="onpv-pricing-hero-lede">Model cash flow, NPV, and sensitivity in one focused workspace built for tenant-rep lease comparisons.</p>
            <p className="onpv-pricing-hero-cue">Start with a 3-day free trial. No credit card required.</p>
          </div>
        </header>
        <section className="pv-section" data-section-type="PRICING" data-section-id="pr_cards" data-pattern-id="TRUST_NEAR_DECISION" data-surface="EDITORIAL">
          <div className="vg-container pv-prose pv-authority-shell">
            <section
              data-pricing-architecture="true"
              data-purchase-model="ANNUAL_SUBSCRIPTION+PER_TRANSACTION"
              data-promotional-offer="THREE_DAY_NO_CARD_TRIAL"
              data-offer-type="NO_CARD_TRIAL"
              data-customer-advantage="3-day free trial"
              data-card-required="false"
              data-auto-convert="false"
              data-offer-events="true"
              data-commercial-decision="primary"
              className="onpv-pricing"
            >
              <article data-acquisition-offer="true" className="onpv-trial-offer">
                <p className="pv-eyebrow">3-day free trial</p>
                <h2>Try OccupancyNPV free for 3 days</h2>
                <p className="onpv-offer-facts">1 user · 1 DealWorkspace · 72 hours · No credit card required · No automatic billing</p>
                <form action="/api/trial/start" method="post" data-trial-start="professional">
                  <button type="submit" className="vg-cta vg-cta--primary" data-offer-cta="primary">Start Free Trial</button>
                </form>
                <p className="onpv-trial-terms">After 3 days, Professional is $290/year or Per-Deal is $149. Cancel anytime. No charge if you stop.</p>
              </article>
              <p className="onpv-buy-now">Or buy now</p>
              <div data-payment-surface="occupancynpv-canonical" className="onpv-price-grid">
                <article data-price-card="professional">
                  <h2>Professional</h2>
                  <p className="vg-price">$290/year</p>
                  <p className="onpv-price-note">Annual workspace after the trial.</p>
                  <form action="/api/checkout/start" method="post" data-checkout-start="professional">
                    <input type="hidden" name="offer" value="PROFESSIONAL" />
                    <button type="submit" className="vg-cta vg-cta--secondary" data-offer-cta="secondary">Start Professional</button>
                  </form>
                </article>
                <article data-price-card="per-deal">
                  <h2>Per-Deal</h2>
                  <p className="vg-price">$149</p>
                  <p className="onpv-price-note">One complete lease comparison.</p>
                  <form action="/api/checkout/start" method="post" data-checkout-start="per-deal">
                    <input type="hidden" name="offer" value="PER_DEAL" />
                    <button type="submit" className="vg-cta vg-cta--secondary" data-offer-cta="tertiary">Start One Deal</button>
                  </form>
                </article>
              </div>
              <OccupancynpvOfferBeacon />
            </section>
            <section className="onpv-buyer-guide" data-pricing-depth="true">
            <h2>How the 3-day free trial works</h2>
            <ul>
              <li>No credit card. No automatic billing.</li>
              <li>The 72 hours begin when your account receives the trial, after you sign in or create an account.</li>
              <li>One authenticated user. One DealWorkspace.</li>
              <li>During the trial you can enter lease scenarios, review cash-flow and occupancy costs, compare NPV and sensitivity, and read the in-workspace comparison summary.</li>
              <li>When 72 hours end, OccupancyNPV does not charge you.</li>
              <li>You can buy Professional $290/year or Per-Deal $149 during the trial or after it ends.</li>
              <li>Each account can use the trial once.</li>
            </ul>
            <h2>Professional vs Per-Deal</h2>
            <div className="onpv-compare" role="table" aria-label="Professional versus Per-Deal">
              <div className="onpv-compare-row onpv-compare-row--head" role="row">
                <span role="columnheader"> </span>
                <span role="columnheader">Professional</span>
                <span role="columnheader">Per-Deal</span>
              </div>
              <div className="onpv-compare-row" role="row"><span>Price</span><span>$290/year</span><span>$149</span></div>
              <div className="onpv-compare-row" role="row"><span>Billing</span><span>Annual subscription</span><span>One-time purchase</span></div>
              <div className="onpv-compare-row" role="row"><span>Best suited for</span><span>Brokers who compare leases across deals during the year</span><span>One comparison when you need it</span></div>
              <div className="onpv-compare-row" role="row"><span>DealWorkspaces</span><span>Create workspaces during the paid year</span><span>One DealWorkspace</span></div>
              <div className="onpv-compare-row" role="row"><span>Comparison workflow</span><span>Cash-flow, NPV, sensitivity, in-workspace summary</span><span>The same comparison workflow for that one workspace</span></div>
              <div className="onpv-compare-row" role="row"><span>Account</span><span>Required</span><span>Required</span></div>
              <div className="onpv-compare-row" role="row"><span>Trial relationship</span><span>Available after or instead of the 3-day trial</span><span>Available after or instead of the 3-day trial</span></div>
            </div>
            <h2>What OccupancyNPV helps you do</h2>
            <p>OccupancyNPV is a DealWorkspace for tenant-rep lease comparison. You put competing commercial lease scenarios on one timeline, review cash-flow and occupancy-cost differences, calculate NPV, and check how the rank changes when the discount rate changes. The comparison summary stays in the workspace so you can walk a client through the same numbers you used.</p>
            <h2>How a lease comparison works</h2>
            <ol className="onpv-steps">
              <li>Create a DealWorkspace and enter the lease scenarios.</li>
              <li>Review cash-flow and occupancy economics on the same timeline.</li>
              <li>Compare NPV and discount-rate sensitivity.</li>
              <li>Read the in-workspace comparison summary.</li>
              <li>Use that result in the tenant-rep decision, then verify lease terms independently.</li>
            </ol>
            <h2>What is included</h2>
            <ul>
              <li>Authenticated DealWorkspace</li>
              <li>Lease scenario entry</li>
              <li>Cash-flow and occupancy-cost comparison</li>
              <li>NPV and discount-rate sensitivity</li>
              <li>In-workspace comparison summary</li>
              <li>Rename and archive for saved workspaces</li>
            </ul>
            <h2>What OccupancyNPV is not</h2>
            <ul>
              <li>Not a CRM</li>
              <li>Not lease-administration software</li>
              <li>Not portfolio-management software</li>
              <li>Not extra Professional seats — this page sells one authenticated user</li>
              <li>Not a public share or export path</li>
            </ul>
            <h2>Who OccupancyNPV is for</h2>
            <ul>
              <li>Tenant-representation brokers comparing commercial lease scenarios</li>
              <li>Boutique CRE advisory teams that currently rebuild deal comparisons by hand</li>
              <li>Professionals who need cash-flow, NPV, and sensitivity in one workspace</li>
            </ul>
            <h2>Who OccupancyNPV is not for</h2>
            <ul>
              <li>Landlords running a portfolio</li>
              <li>Property managers administering occupied buildings</li>
              <li>Teams that need a CRM, lease administration, or extra seats</li>
            </ul>
            <h2>What happens after the trial</h2>
            <p>OccupancyNPV does not charge you when the 72 hours end. To create another DealWorkspace, choose Professional $290/year or Per-Deal $149. You can also buy either plan before the trial ends.</p>
            <section data-section-type="FAQ" data-section-id="pr_faq" data-pricing-faq="true">
            <h2>Pricing questions</h2>
            <h3>Is the 3-day trial really free?</h3>
            <p>Yes. The trial does not collect a card and does not bill you. After 72 hours you choose Professional $290/year, Per-Deal $149, or you can stop.</p>
            <h3>Do I need a credit card for the trial?</h3>
            <p>No. Start Free Trial asks you to sign in or create an account. It does not collect a card.</p>
            <h3>Will I automatically be charged after 3 days?</h3>
            <p>No. OccupancyNPV does not automatically convert the trial into a paid plan.</p>
            <h3>What happens when the trial ends?</h3>
            <p>The trial ends after 72 hours. OccupancyNPV does not charge you. To create another DealWorkspace, buy Professional or Per-Deal.</p>
            <h3>What is included in Professional?</h3>
            <p>Professional is $290 per year for one authenticated user. During the paid period you can create DealWorkspaces and run lease comparisons with cash-flow, NPV, sensitivity, and an in-workspace comparison summary.</p>
            <h3>What does one Per-Deal purchase include?</h3>
            <p>Per-Deal is $149 for one DealWorkspace and one complete lease comparison.</p>
            <h3>Can I start with the trial and later buy Per-Deal?</h3>
            <p>Yes. After the trial, or during it, you can buy Per-Deal $149 instead of Professional.</p>
            <h3>Can I upgrade to Professional?</h3>
            <p>Yes. Start Professional on this page starts checkout for $290/year. You can do that during or after the trial.</p>
            <h3>Is Professional monthly or annual?</h3>
            <p>Professional is billed annually at $290/year. OccupancyNPV does not sell a monthly Professional price.</p>
            <h3>How many users are included?</h3>
            <p>One authenticated user. Extra Professional seats are not sold on this page.</p>
            <h3>Is OccupancyNPV a CRM?</h3>
            <p>No. OccupancyNPV is a lease-comparison workspace. It is not a CRM.</p>
            <h3>Does OccupancyNPV replace lease administration software?</h3>
            <p>No. It does not administer occupied buildings or replace lease-administration software.</p>
            <h3>What kind of lease analysis does OccupancyNPV support?</h3>
            <p>You enter lease scenarios in a DealWorkspace, then review cash-flow, occupancy costs, NPV, and discount-rate sensitivity.</p>
            <h3>Can I save my deal comparisons?</h3>
            <p>Yes. Comparisons live in your DealWorkspace. You can rename or archive a workspace from your account.</p>
            <h3>What happens to my work after the trial?</h3>
            <p>The trial does not charge you when it ends. Creating another DealWorkspace requires Professional or Per-Deal.</p>
            <h3>How do I get help?</h3>
            <p>Email infinitemediaresources@gmail.com. You can also use Suggest an Improvement on the site without creating an account.</p>
            </section>
            <section className="onpv-final-cta" data-final-conversion="true">
              <h2>Start the 3-day free trial</h2>
              <p>3 days. No credit card. No automatic billing. Then Professional $290/year or Per-Deal $149 if you continue.</p>
              <form action="/api/trial/start" method="post">
                <button type="submit" className="vg-cta vg-cta--primary">Start Free Trial</button>
              </form>
              <div className="onpv-final-paid">
                <form action="/api/checkout/start" method="post">
                  <input type="hidden" name="offer" value="PROFESSIONAL" />
                  <button type="submit" className="vg-cta vg-cta--secondary">Start Professional</button>
                </form>
                <form action="/api/checkout/start" method="post">
                  <input type="hidden" name="offer" value="PER_DEAL" />
                  <button type="submit" className="vg-cta vg-cta--secondary">Start One Deal</button>
                </form>
              </div>
            </section>
          </section>
            
            
            
            <div className="vg-container pv-close-well">
            
            
            <section data-section-type="FAQ" data-section-id="dr_faq" data-pattern-id="TRUST_NEAR_DECISION" data-surface="DEFAULT">
              
              
            </section>
            <RelatedContent items={[{ href: "/", label: "Return to the offer" }, { href: "/resources", label: "Lease economics resources" }, { href: "/pricing", label: "Pricing" }, { href: "/how-it-works", label: "How it works" }, { href: "/faq", label: "OccupancyNPV questions" }]} />
            <div className="pv-source-block" data-composition="source-block"><AuthorityRefs items={[{"href":"https://www.naiop.org/","label":"NAIOP — commercial real estate organization"},{"href":"https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm","label":"U.S. BLS — real estate brokers and sales agents"}]} /></div>
            <Disclosure>Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.</Disclosure>
            
        
        </div>
          </div>
        </section>
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav" data-surface="DEFAULT">
        <div className="vg-container pv-authority-shell">
          <nav className="sn-block" data-semantic-navigation="USE_THE_TOOL" aria-label="Related product paths">
            <div className="sn-block-head">
              <span className="sn-kicker">USE THE TOOL</span>
              <strong className="sn-title">Related product paths</strong>
            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-4">
            <a className="sn-card" data-card-role="TOOL" href="/compare-commercial-leases/" data-relationship="commercial-path" aria-label="Compare two leases. See the shared timeline before you pick.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Tool</span><strong>Compare two leases</strong><span className="sn-desc">Put both offers on one shared timeline.</span></span>
            </a>
            <a className="sn-card" data-card-role="WORKFLOW" href="/how-it-works/" data-relationship="workflow" aria-label="See the workflow. Four steps from scattered terms to a summary.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Workflow</span><strong>See the workflow</strong><span className="sn-desc">Follow the steps before you pick a number.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/occupancy-costs/" data-relationship="related" aria-label="Occupancy costs. Face rent is not the full bill.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Occupancy costs</strong><span className="sn-desc">Add the extras that sit beside face rent.</span></span>
            </a>
            <a className="sn-card" data-card-role="TOPIC" href="/commercial-lease-npv/" data-relationship="related" aria-label="Commercial lease NPV. Learn why later cash is not equal to cash today.">
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z" /></svg></span>
              <span className="sn-copy"><span className="sn-role">Topic</span><strong>Commercial lease NPV</strong><span className="sn-desc">Later cash is not the same as cash today.</span></span>
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
