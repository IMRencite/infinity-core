import {
  classifyRoute,
  displayPageType,
  expectedDepthClass,
  inventoryVentureCustomerPages,
} from "@/lib/infinity/customer-page-depth";
import type { VenturePageDepthSummary } from "@/lib/infinity/customer-page-depth";

export const OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT = "occupancynpv_venture_wide_page_depth_uplift_v1" as const;

const CANONICAL_RELATED = [
  { href: "/compare-commercial-leases", label: "Compare commercial leases" },
  { href: "/how-it-works", label: "How OccupancyNPV works" },
  { href: "/occupancy-costs", label: "Occupancy costs" },
  { href: "/commercial-lease-npv", label: "Commercial lease NPV" },
  { href: "/pricing", label: "Pricing and 3-day trial" },
  { href: "/resources", label: "Resource hub" },
  { href: "/faq", label: "FAQ" },
] as const;

export function occupancynpvRelatedPathsSection(): string {
  const cards = CANONICAL_RELATED.map((row) => `                <a className="sn-card" href="${row.href}">
                  <span className="sn-card-title">${row.label}</span>
                </a>`).join("\n");
  return `
        <section className="pv-section onpv-related-paths" data-section-type="SEMANTIC_NAVIGATION">
          <div className="vg-container pv-authority-shell">
            <nav className="sn-block" aria-label="Related product paths">
              <strong className="sn-title">Related product paths</strong>
              <div className="sn-grid">
${cards}
              </div>
            </nav>
          </div>
        </section>`;
}

function insertBeforeFooter(html: string, block: string): string {
  if (html.includes("<VentureFooter")) return html.replace("<VentureFooter", `${block}\n        <VentureFooter`);
  if (html.includes("</main>")) return html.replace("</main>", `${block}\n    </main>`);
  return `${html}\n${block}`;
}

function insertAfterFirstH1(html: string, block: string): string {
  const match = html.match(/<h1[\s\S]*?<\/h1>/);
  if (!match || match.index == null) return insertBeforeFooter(html, block);
  const end = match.index + match[0].length;
  return `${html.slice(0, end)}${block}${html.slice(end)}`;
}

function collapseDuplicateNotFor(html: string): string {
  const heading = /<h2[^>]*>\s*Who (?:OccupancyNPV is not for|should not use it|is this not for)\??\s*<\/h2>/gi;
  const matches = [...html.matchAll(heading)];
  if (matches.length <= 1) return html;
  let next = html;
  for (const match of matches.slice(1).reverse()) {
    const start = match.index ?? -1;
    if (start < 0) continue;
    const rest = next.slice(start);
    const endRel = rest.search(/<h2|<section[\s>]|<VentureFooter|<\/main>/i);
    const end = endRel <= 0 ? start + match[0].length : start + endRel;
    next = `${next.slice(0, start)}${next.slice(end)}`;
  }
  return next;
}

function ensureRelatedPaths(html: string): string {
  const semantic = html.match(/<section className="pv-section[^"]*" data-section-type="SEMANTIC_NAVIGATION"[\s\S]*?<\/section>/);
  if (semantic) {
    let repaired = semantic[0]
      .replace(/className="pv-section(?![^"]*onpv-related-paths)/, 'className="pv-section onpv-related-paths')
      .replace('<div className="vg-container">', '<div className="vg-container pv-authority-shell">')
      .replace(/ pv-wide-module/g, "");
    if (!/Related product paths/i.test(repaired)) {
      repaired = repaired.replace(/<strong className="sn-title">[\s\S]*?<\/strong>/, '<strong className="sn-title">Related product paths</strong>');
    }
    const hoisted = html.replace(semantic[0], "");
    if (hoisted.includes("onpv-related-paths") && hoisted.includes("<VentureFooter")) return hoisted;
    return insertBeforeFooter(hoisted, repaired);
  }
  if (/Related product paths/i.test(html) && /onpv-related-paths/.test(html)) return html;
  return insertBeforeFooter(html, occupancynpvRelatedPathsSection());
}

function ensureSupport(html: string): string {
  if (/infinitemediaresources@gmail.com/i.test(html)) return html;
  return insertBeforeFooter(html, `
        <section className="pv-section onpv-page-depth" data-depth="support">
          <div className="vg-container">
            <h2>Support</h2>
            <p>Email <a href="mailto:infinitemediaresources@gmail.com">infinitemediaresources@gmail.com</a>. You can also use <a href="/suggest-improvement">Suggest an Improvement</a> without creating an account.</p>
          </div>
        </section>`);
}

const RESOURCE_DEPTH = `
        <section className="pv-section onpv-page-depth" data-depth="resource">
          <div className="vg-container">
            <h2>How to use this with OccupancyNPV</h2>
            <p>This page answers the concept. OccupancyNPV applies it inside a DealWorkspace: enter lease scenarios, review cash-flow and occupancy cost, then compare NPV and discount-rate sensitivity. OccupancyNPV NPV is not the same as a face-rent comparison. OccupancyNPV is not a CRM or lease-administration suite, and this page is not legal or investment advice.</p>
            <p>Next: start the 3-day free trial, open <a href="/pricing">pricing</a>, or continue through related product paths.</p>
          </div>
        </section>`;

const HOW_IT_WORKS_DEPTH = `
        <section className="pv-section onpv-page-depth" data-depth="workflow">
          <div className="vg-container">
            <h2>Current OccupancyNPV workflow</h2>
            <ol>
              <li>Start a 3-day free trial or create an account and sign in.</li>
              <li>Create or open a DealWorkspace.</li>
              <li>Enter competing lease scenarios.</li>
              <li>Add occupancy-cost and cash-flow assumptions such as rent steps, free rent, operating expenses, and allowances.</li>
              <li>Compare the scenarios in the workspace.</li>
              <li>Review NPV and discount-rate sensitivity.</li>
              <li>Inspect the in-workspace comparison summary.</li>
              <li>Save the workspace. Rename or archive it from your account history.</li>
              <li>Choose the next action: keep comparing, start Professional at $290/year, or buy Per-Deal at $149.</li>
            </ol>
            <p>OccupancyNPV is a lease-comparison workspace. It is not a CRM and does not administer occupied buildings. Results depend on the inputs you enter and are not legal or investment advice.</p>
          </div>
        </section>`;

const COMPARE_DEPTH = `
        <section className="pv-section onpv-page-depth" data-depth="comparison">
          <div className="vg-container">
            <h2>What OccupancyNPV compares</h2>
            <p>OccupancyNPV compares two or more lease scenarios inside one DealWorkspace. Inputs are term, rent steps, free rent, operating expenses, allowances, and an annual discount rate. The workspace generates cash-flow, occupancy cost, NPV, and discount-rate sensitivity so you can see which scenario costs less on a discounted basis under your assumptions.</p>
            <p>Interpret NPV as a ranking of the cash-flow streams you entered, not as a market value or a recommendation to sign a lease. OccupancyNPV is not the same as a face-rent spreadsheet, and it is not legal or investment advice. Saved comparisons stay in the DealWorkspace; rename or archive them from your account. Next: start the 3-day free trial or open <a href="/pricing">pricing</a>.</p>
          </div>
        </section>`;

const FAQ_DEPTH = `
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
        </section>`;

const HOME_OFFER = `
              <div className="onpv-home-offer" data-home-offer="true">
                <p>3-day no-card trial. No automatic conversion. Professional is $290/year. Per-Deal is $149.</p>
              </div>`;

const RESOURCES_HUB = `
        <section className="pv-section onpv-page-depth" data-depth="resources-hub">
          <div className="vg-container">
            <h2>How to use these resources</h2>
            <p>Use this hub to learn commercial lease comparison, occupancy costs, NPV, and the OccupancyNPV workflow before or after you open a DealWorkspace. Read a topic, then apply the same inputs in the product: lease scenarios, cash-flow, occupancy cost, NPV, and sensitivity.</p>
            <p>These pages explain concepts. They are not legal or investment advice. Next: start the 3-day free trial or open related product paths.</p>
          </div>
        </section>`;

const EARLY_ACCESS_DEPTH = `
        <p>OccupancyNPV is for tenant-rep brokers comparing competing leases in a DealWorkspace. The public offer is a 3-day no-card trial. Professional is $290/year. Per-Deal is $149. The trial does not automatically convert and does not charge you. You will not automatically be charged. OccupancyNPV is not a CRM. You can stop after the trial. Checkout is on the <a href="/pricing">pricing</a> page.</p>`;

function patchHomepage(html: string): string {
  let next = collapseDuplicateNotFor(html);
  next = next.replace(/<section className="pv-section onpv-page-depth" data-depth="offer"[\s\S]*?<\/section>/g, "");
  next = next.replace(
    'className="pv-hero pv-hero--split pv-hero-photo--compact pv-hero-photo"',
    'className="pv-hero pv-hero--split pv-hero-photo--compact pv-hero-photo onpv-home-hero"',
  );
  next = next.replace('data-cta="Request Pilot Access"', 'data-cta="Start Free Trial"');
  next = next.replace(
    '<h1 className="pv-display">Compare commercial lease economics without rebuilding the spreadsheet.</h1>',
    '<h1 className="pv-display onpv-home-title">Compare commercial lease economics without rebuilding the spreadsheet.</h1>',
  );
  if (!/data-home-offer="true"/.test(next)) {
    next = next.replace(
      '<h1 className="pv-display onpv-home-title">Compare commercial lease economics without rebuilding the spreadsheet.</h1>',
      `<h1 className="pv-display onpv-home-title">Compare commercial lease economics without rebuilding the spreadsheet.</h1>${HOME_OFFER}`,
    );
  }
  const audience = next.match(/<div data-question-id="q_68d856500f44429b"[\s\S]*?<\/div>\s*<p className="pv-lede">[\s\S]*?<\/p>/);
  next = next.replace(
    /<p><div className="pv-hero-actions-row">[\s\S]*?<\/div><\/p>\s*<div data-question-id="q_68d856500f44429b"[\s\S]*?<\/div>\s*<p className="pv-lede">[\s\S]*?<\/p>/,
    `<div className="onpv-home-actions" data-home-actions="true">
                <a className="vg-cta" data-offer-cta="primary" href="/occupancynpv/app/login?intent=trial">Start Free Trial</a>
                <a className="onpv-see-pricing" data-offer-cta="pricing" href="/pricing">See pricing</a>
                <a className="onpv-home-secondary" href="/how-it-works">See the workflow</a>
              </div>`,
  );
  if (audience && !/onpv-home-support/.test(next)) {
    next = next.replace(
      "</header>",
      `</header>
        <section className="pv-section onpv-home-support" data-home-support="true">
          <div className="vg-container">
            ${audience[0]}
          </div>
        </section>`,
    );
  }
  next = ensureSupport(next);
  return ensureRelatedPaths(next);
}

function patchHowItWorks(html: string): string {
  let next = collapseDuplicateNotFor(html);
  if (!/Current OccupancyNPV workflow/i.test(next)) {
    next = next.includes("<h2>How OccupancyNPV works today</h2>")
      ? next.replace("<h2>How OccupancyNPV works today</h2>", `<h2>How OccupancyNPV works today</h2>${HOW_IT_WORKS_DEPTH}`)
      : insertBeforeFooter(next, HOW_IT_WORKS_DEPTH);
  }
  next = ensureSupport(next);
  return ensureRelatedPaths(next);
}

function patchCompare(html: string): string {
  let next = collapseDuplicateNotFor(html);
  if (!/What OccupancyNPV compares/i.test(next)) {
    next = next.includes("<h1") ? insertAfterFirstH1(next, COMPARE_DEPTH) : insertBeforeFooter(next, COMPARE_DEPTH);
  }
  next = ensureSupport(next);
  return ensureRelatedPaths(next);
}

function patchFaq(html: string): string {
  let next = html.replace(/<section className="pv-section onpv-page-depth" data-depth="faq"[\s\S]*?<\/section>/g, "");
  if (!/data-faq-architecture="categorized"/i.test(next)) {
    next = next.includes("<h1") ? insertAfterFirstH1(next, FAQ_DEPTH) : insertBeforeFooter(next, FAQ_DEPTH);
  }
  return ensureRelatedPaths(next);
}

function patchResources(html: string): string {
  let next = html;
  if (!/How to use these resources/i.test(next)) {
    next = next.includes("<h1") ? insertAfterFirstH1(next, RESOURCES_HUB) : insertBeforeFooter(next, RESOURCES_HUB);
  }
  return ensureRelatedPaths(next);
}

function patchSuggest(html: string): string {
  let next = html;
  if (!/after you submit/i.test(next)) {
    next = next.replace(
      /This is product feedback, not a promise a change will be built\./,
      "Suggestions are for product, workflow, and result-clarity improvements. After you submit, OccupancyNPV stores the note for review. This is product feedback, not a promise a change will be built. Contact email is optional. Do not send SSNs, bank details, or lease files. Useful examples: a missing input, a confusing NPV label, or a save/archive gap.",
    );
  }
  if (!/after you submit/i.test(next)) {
    next = next.replace(
      "<OccupancynpvPublicImprovementForm />",
      `<p className="pv-lede">Suggestions are for product, workflow, and result-clarity improvements. After you submit, OccupancyNPV stores the note for review. This is product feedback, not a promise a change will be built. Contact email is optional. Do not send SSNs, bank details, or lease files.</p>
        <OccupancynpvPublicImprovementForm />`,
    );
  }
  return next;
}

function patchLogin(html: string): string {
  if (/3-day free trial uses the same sign-in path/i.test(html)) return html;
  return html.replace(
    /OccupancyNPV comparison workspace\. Support: infinitemediaresources@gmail.com\. Use Suggest an Improvement in the page footer without creating an account\./,
    "Account access opens your DealWorkspaces. A 3-day free trial uses the same sign-in path and does not collect a card. Email and password stay on this form. If sign-in fails, the form shows the error. OccupancyNPV does not sell or publish your login. Support: infinitemediaresources@gmail.com. Use Suggest an Improvement in the page footer without creating an account.",
  );
}

function patchDashboard(html: string): string {
  if (/OccupancyNPV is not a CRM/i.test(html) && /Rename or archive saved work from this list/i.test(html)) return html;
  return html.replace(
    /Compare lease options using cash flow, NPV, occupancy costs, and sensitivity analysis\.[^<]*/,
    "Compare lease options using cash flow, NPV, occupancy costs, and sensitivity analysis. Create a DealWorkspace, enter lease scenarios, then compare results. OccupancyNPV is not a CRM. Rename or archive saved work from this list. Next: open a workspace or start a new comparison.",
  );
}

function patchWorkspace(html: string): string {
  if (/OccupancyNPV is not a CRM/i.test(html) && /not legal or investment advice/i.test(html)) return html;
  return html.replace(
    /Ranking uses NPV, not a subjective “better” label\.[^<]*/,
    "Ranking uses NPV, not a subjective “better” label. Save scenarios in this DealWorkspace, then Compare NPV. OccupancyNPV is not a CRM. Results depend on the inputs you entered and are not legal or investment advice. Next: edit inputs, compare another pair, or return to the dashboard to rename or archive.",
  );
}

function patchEarlyAccess(html: string): string {
  let next = html;
  if (!/3-day no-card trial/i.test(next) && next.includes("<h1>Request pilot access</h1>")) {
    next = next.replace("<h1>Request pilot access</h1>", `<h1>Request pilot access</h1>\n        ${EARLY_ACCESS_DEPTH}`);
  }
  if (!/automatically be charged/i.test(next)) {
    next = next.replace(
      "You can stop after the trial.",
      "You will not automatically be charged. OccupancyNPV is not a CRM. You can stop after the trial.",
    );
  }
  if (/3-day no-card trial/i.test(next) && /\$290/.test(next) && /automatically be charged/i.test(next)) return next;
  return next.includes("</main>") ? next.replace("</main>", `${EARLY_ACCESS_DEPTH}\n    </main>`) : `${next}\n${EARLY_ACCESS_DEPTH}`;
}

function patchEducational(html: string): string {
  let next = html;
  if (!/How to use this with OccupancyNPV/i.test(next) && (!/Related product paths/i.test(next) || !/not the same/i.test(next) || !/Start Free Trial|\/pricing/i.test(next))) {
    next = insertBeforeFooter(next, RESOURCE_DEPTH);
  }
  return ensureRelatedPaths(next);
}

const NOT_FOUND_PAGE = `export default function OccupancynpvNotFoundPage() {
  return (
    <main className="vg-page" data-page-id="/not-found">
      <div className="vg-container">
        <h1>Page not found</h1>
        <p>That OccupancyNPV URL is missing or moved. Open the homepage, pricing, or resources to continue.</p>
        <p><a className="vg-cta" href="/">Back to OccupancyNPV</a> <a className="vg-cta vg-cta--secondary" href="/pricing">Pricing</a></p>
      </div>
    </main>
  );
}
`;

export function applyOccupancynpvVenturePageDepth(path: string, content: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (/from "next\/navigation"/.test(content) && /redirect\(/.test(content)) {
    const cut = content.search(/<section className="pv-section onpv-page-depth"|<section className="pv-section onpv-related-paths"/);
    const cleaned = (cut > 0 ? content.slice(0, cut) : content).replace(/<section className="pv-section onpv-page-depth"[\s\S]*?<\/section>/g, "").trimEnd() + "\n";
    if (!/<h1/i.test(cleaned)) return cleaned;
    content = cleaned;
  }
  if (normalized === "app/pricing/page.tsx") return content;
  if (normalized === "app/page.tsx") return patchHomepage(content);
  if (normalized === "app/how-it-works/page.tsx") return patchHowItWorks(content);
  if (normalized === "app/compare-commercial-leases/page.tsx") return patchCompare(content);
  if (normalized === "app/faq/page.tsx") return patchFaq(content);
  if (normalized === "app/resources/page.tsx") return patchResources(content);
  if (normalized === "app/suggest-improvement/page.tsx") return patchSuggest(content);
  if (normalized === "app/occupancynpv/app/login/page.tsx") return patchLogin(content);
  if (normalized === "app/occupancynpv/app/page.tsx") return patchDashboard(content);
  if (normalized === "app/occupancynpv/app/workspaces/[id]/page.tsx") return patchWorkspace(content);
  if (normalized === "app/early-access/page.tsx") return patchEarlyAccess(content);
  if (normalized === "app/privacy-policy/page.tsx" || normalized === "app/terms-of-service/page.tsx") return content;
  if (normalized.endsWith("/page.tsx") && normalized.startsWith("app/") && !normalized.startsWith("app/api/") && !normalized.startsWith("app/occupancynpv/")) {
    return patchEducational(content);
  }
  return content;
}

export function applyOccupancynpvVenturePageDepthToFiles<T extends { path: string; content: string }>(files: T[]): T[] {
  const next = files.map((file) => {
    const content = applyOccupancynpvVenturePageDepth(file.path, file.content);
    return content === file.content ? file : { ...file, content };
  });
  if (!next.some((file) => file.path.replace(/\\/g, "/") === "app/not-found.tsx")) {
    next.push({ path: "app/not-found.tsx", content: NOT_FOUND_PAGE } as T);
  }
  return next;
}

export function routeFromComposedPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (normalized === "app/page.tsx") return "/";
  if (normalized === "app/not-found.tsx") return "/not-found";
  return normalized.replace(/^app/, "").replace(/\/page\.tsx$/, "").replace(/\[id\]/, ":id");
}

export function inventoryOccupancynpvVenturePageDepth(files: Array<{ path: string; content: string }>): VenturePageDepthSummary {
  const composed = files;
  const pages = composed
    .filter((file) => {
      const path = file.path.replace(/\\/g, "/");
      return (path.endsWith("page.tsx") || path === "app/not-found.tsx") && path.startsWith("app/") && !path.startsWith("app/api/");
    })
    .map((file) => ({
      route: routeFromComposedPath(file.path),
      html: file.content,
      pageType: classifyRoute(routeFromComposedPath(file.path), file.content),
    }));
  if (!pages.some((row) => row.route === "/sitemap.xml")) {
    pages.push({ route: "/sitemap.xml", html: "<h1>Sitemap</h1><p>XML sitemap.</p>", pageType: "UTILITY" });
  }
  const rows = inventoryVentureCustomerPages({ pages });
  return {
    total_material_pages: rows.length,
    passed: rows.filter((row) => row.status === "PASS" || row.status === "N/A").length,
    failed: rows.filter((row) => row.status === "FAIL").length,
    thin: rows.filter((row) => row.thinness === "FAIL").length,
    unverified: rows.filter((row) => row.status === "UNVERIFIED").length,
    pages: rows,
  };
}

export function occupancynpvVenturePageDepthHqFields(files: Array<{ path: string; content: string }>) {
  const summary = inventoryOccupancynpvVenturePageDepth(files);
  return {
    summary,
    display_rows: summary.pages.map((row) => ({
      route: row.route,
      page_type: displayPageType(row.page_type),
      depth_class: row.depth_class ?? expectedDepthClass(row.page_type, row.route),
      question_coverage: row.question_coverage ?? "N/A",
      product_understanding: row.product_understanding ?? "N/A",
      buyer_decision_support: row.buyer_decision_support ?? "N/A",
      information_gain: row.information_gain ?? "N/A",
      thinness: row.thinness ?? "N/A",
      visual_quality: row.visual_quality ?? "N/A",
      status: row.status,
      missing_material_questions: row.missing_material_questions,
    })),
  };
}
