import { binaryOfferResult, type NamedOfferGate } from "./types";
import { evaluatePrimaryCommercialActionViewportGate } from "./true-offer";

const VISUAL_GAP_PX = 24;
export const PRICING_HERO_BAND_MAX_HEIGHT_PX = 240;
export const PRICING_HERO_CONVERSION_MAX_HEIGHT_PX = 240;
export const HERO_TEXT_READABILITY_GATE = "HeroTextReadabilityGate" as const;
export const RESPONSIVE_HERO_GATE = "ResponsiveHeroGate" as const;
export const UNEXPLAINED_WHITESPACE_MAX_PX = 96;

type ViewportRect = { top: number; bottom: number; height?: number };
type ViewportProfile = {
  scrollY: number;
  viewportHeight: number;
  professionalPrice: ViewportRect;
  startFreeTrial?: ViewportRect;
  startProfessional: ViewportRect;
  hero?: ViewportRect;
  siblingGapPx?: number;
  pricingGroupToNextSectionGapPx?: number;
};

export const HERO_CONVERSION_BALANCE_GATE = "HeroConversionBalanceGate" as const;
export const COMMERCIAL_WHITESPACE_BALANCE_GATE = "CommercialWhitespaceBalanceGate" as const;
export const PRICING_PAGE_INFORMATION_DEPTH_GATE = "PricingPageInformationDepthGate" as const;
export const COMMERCIAL_CONTENT_REDUNDANCY_GATE = "CommercialContentRedundancyGate" as const;
export const COMMERCIAL_PAGE_NARRATIVE_GATE = "CommercialPageNarrativeGate" as const;

const DEPTH_MARKERS = {
  offer_understanding: /Try OccupancyNPV free for 3 days|How the 3-day free trial works/i,
  price_understanding: /\$290\/year|\$149/,
  plan_comparison: /Professional vs Per-Deal/i,
  product_capability: /What OccupancyNPV helps you do|cash-flow|NPV/i,
  trial_mechanics: /How the 3-day free trial works|No credit card required/i,
  purchase_mechanics: /Start Professional|Start One Deal|What happens after the trial/i,
  limitations: /What OccupancyNPV is not|not a CRM|lease-administration/i,
  audience_fit: /Who OccupancyNPV is for/i,
  post_trial_behavior: /What happens after the trial|does not charge you/i,
  support_help: /infinitemediaresources@gmail.com|How do I get help/i,
  common_objections: /Will I automatically be charged|Is OccupancyNPV a CRM/i,
} as const;

export function evaluateHeroConversionBalanceGate(input: {
  html: string;
  profile?: ViewportProfile | null;
}): NamedOfferGate {
  const html = input.html;
  const hasHero = /hero-building\.webp|data-commercial-hero="(?:band|overlay)"|onpv-pricing-hero--(?:band|overlay)/i.test(html);
  const reasons: string[] = [];
  if (hasHero && /pv-hero-photo(?!--band)/i.test(html) && !/data-commercial-hero="(?:compact|band|overlay)"/i.test(html)) {
    reasons.push("UNCONTROLLED_PHOTO_HERO");
  }
  if (!input.profile) {
    reasons.push("VIEWPORT_NOT_MEASURED_IN_BROWSER");
    return { gate: HERO_CONVERSION_BALANCE_GATE, result: "FAIL", reasons };
  }
  const heroHeight = input.profile.hero?.height ?? 0;
  if (hasHero && heroHeight > PRICING_HERO_CONVERSION_MAX_HEIGHT_PX) reasons.push("HERO_TALLER_THAN_CONVERSION_BAND");
  const trial = input.profile.startFreeTrial ?? input.profile.startProfessional;
  const trialVisible = evaluatePrimaryCommercialActionViewportGate({
    primary_cta_in_viewport: trial.top >= 0 && trial.bottom <= input.profile.viewportHeight && input.profile.scrollY === 0,
    measurement: "BROWSER_GEOMETRY",
    scrollY: input.profile.scrollY,
  });
  if (trialVisible.result === "FAIL") reasons.push("HERO_PUSHED_PRIMARY_CTA_BELOW_FOLD");
  if (input.profile.professionalPrice.bottom > input.profile.viewportHeight || input.profile.professionalPrice.top < 0) {
    reasons.push("PAID_PRICE_LEFT_FIRST_VIEWPORT");
  }
  return { gate: HERO_CONVERSION_BALANCE_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHeroTextReadabilityGate(html: string): NamedOfferGate {
  const reasons: string[] = [];
  if (/Compare commercial lease economics without rebuilding the spreadsheet/i.test(html) && !/data-pricing-architecture/.test(html)) {
    if (!/onpv-home-title/.test(html)) reasons.push("HOME_H1_WRAP_CONTROL_MISSING");
    if (!/pv-hero-overlay/.test(html)) reasons.push("HERO_OVERLAY_MISSING");
    if (!/Start Free Trial/.test(html)) reasons.push("HERO_TRIAL_CUE_MISSING");
    if (/<header[\s\S]*data-depth="offer"[\s\S]*?<\/header>/i.test(html)) reasons.push("HERO_COPY_OVERSTACKED");
    return { gate: HERO_TEXT_READABILITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
  }
  if (!/data-commercial-hero="overlay"|onpv-pricing-hero--overlay/i.test(html)) reasons.push("OVERLAY_HERO_MISSING");
  if (!/onpv-pricing-hero-shade|onpv-pricing-hero-overlay/i.test(html)) reasons.push("OVERLAY_TREATMENT_MISSING");
  if (!/<h1[^>]*>Compare commercial lease scenarios with confidence<\/h1>/i.test(html)) reasons.push("HERO_H1_MISSING");
  if (!/OCCUPANCYNPV/.test(html)) reasons.push("HERO_EYEBROW_MISSING");
  if (!/Model cash flow, NPV, and sensitivity/i.test(html)) reasons.push("HERO_SUPPORTING_COPY_MISSING");
  if (!/Start with a 3-day free trial/i.test(html)) reasons.push("HERO_TRIAL_CUE_MISSING");
  if (/<header[^>]*onpv-pricing-hero[\s\S]*?Start Free Trial[\s\S]*?<\/header>/i.test(html)) {
    reasons.push("DUPLICATE_PRIMARY_CTA_IN_HERO");
  }
  return { gate: HERO_TEXT_READABILITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateResponsiveHeroGate(input: { html: string; css?: string }): NamedOfferGate {
  const reasons: string[] = [];
  if (!/data-commercial-hero="overlay"|onpv-pricing-hero--overlay/i.test(input.html)) {
    reasons.push("OVERLAY_HERO_MISSING");
  }
  if (/pv-hero-photo/i.test(input.html)) reasons.push("UNCONTROLLED_PHOTO_HERO");
  const css = input.css ?? "";
  if (css) {
    if (!/@media \(max-width: 720px\)[\s\S]*onpv-pricing-hero--overlay[\s\S]*10rem/.test(css)) {
      reasons.push("MOBILE_HERO_HEIGHT_NOT_CONVERSION_SAFE");
    }
    if (!/onpv-pricing-hero--overlay[\s\S]*13\.5rem/.test(css)) reasons.push("DESKTOP_HERO_HEIGHT_NOT_ENLARGED");
  }
  return { gate: RESPONSIVE_HERO_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateCommercialWhitespaceBalanceGate(input: {
  html?: string;
  profile?: ViewportProfile | null;
}): NamedOfferGate {
  const reasons: string[] = [];
  const html = input.html ?? "";
  if (/margin:\s*0\s+0\s+12rem/.test(html) || /margin-bottom:\s*12rem/.test(html)) {
    reasons.push("LEGACY_12REM_PRICING_MARGIN");
  }
  if (!input.profile) {
    reasons.push("WHITESPACE_NOT_MEASURED_IN_BROWSER");
    return { gate: COMMERCIAL_WHITESPACE_BALANCE_GATE, result: "FAIL", reasons };
  }
  const gap = input.profile.pricingGroupToNextSectionGapPx ?? -1;
  if (gap < 0) reasons.push("SUPPORTING_CONTENT_GAP_UNMEASURED");
  if (gap > UNEXPLAINED_WHITESPACE_MAX_PX) reasons.push("UNEXPLAINED_EMPTY_VERTICAL_REGION");
  if (gap >= 0 && gap < VISUAL_GAP_PX) reasons.push("SUPPORTING_CONTENT_TOO_CLOSE");
  if ((input.profile.siblingGapPx ?? 0) < 16 && (input.profile.siblingGapPx ?? 0) >= 0) {
    reasons.push("PRICING_CARDS_TOUCHING_OR_CRAMPED");
  }
  return { gate: COMMERCIAL_WHITESPACE_BALANCE_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluatePricingPageInformationDepthGate(html: string): NamedOfferGate {
  const missing = Object.entries(DEPTH_MARKERS)
    .filter(([, pattern]) => !pattern.test(html))
    .map(([key]) => `MISSING_${key.toUpperCase()}`);
  return {
    gate: PRICING_PAGE_INFORMATION_DEPTH_GATE,
    result: missing.length === 0 ? "PASS" : "FAIL",
    reasons: missing,
  };
}

function visibleCommercialHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<JsonLdBlock[\s\S]*?\/>/g, "")
    .replace(/const PRICING_FAQ_SCHEMA[\s\S]*?export default function Page/g, "");
}

export function evaluateCommercialContentRedundancyGate(html: string): NamedOfferGate {
  const visible = visibleCommercialHtml(html);
  const reasons: string[] = [];
  if (/Who should not use it/i.test(visible) && /Who is this not for/i.test(visible)) {
    reasons.push("DUPLICATE_NOT_FOR_SECTIONS");
  }
  const whoNot = visible.match(/<h2[^>]*>\s*Who (?:OccupancyNPV is not for|should not use it|is this not for)/gi) ?? [];
  if (whoNot.length > 1) reasons.push("DUPLICATE_AUDIENCE_HEADINGS");
  if ((visible.match(/Why these prices exist/gi) ?? []).length > 1) reasons.push("DUPLICATE_PRICE_EXPLANATION");
  if (/Is this a finished product\?/i.test(visible) && /Payment is not collected/i.test(visible)) {
    reasons.push("STALE_VALIDATION_FAQ_CONTRADICTS_LIVE_PRODUCT");
  }
  return { gate: COMMERCIAL_CONTENT_REDUNDANCY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateCommercialPageNarrativeGate(html: string): NamedOfferGate {
  const visible = html
    .replace(/const PRICING_FAQ_SCHEMA[\s\S]*?export default function Page/g, "export default function Page")
    .replace(/<JsonLdBlock[\s\S]*?\/>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const sequence = [
    visible.search(/Try OccupancyNPV free for 3 days/i),
    visible.search(/Start Free Trial/i),
    visible.search(/\$290\/year/i),
    visible.search(/How the 3-day free trial works/i),
    visible.search(/Professional vs Per-Deal/i),
    visible.search(/What OccupancyNPV helps you do/i),
    visible.search(/How a lease comparison works/i),
    visible.search(/Who OccupancyNPV is for/i),
    visible.search(/Pricing questions/i),
    visible.search(/Start the 3-day free trial/i),
  ];
  const reasons: string[] = [];
  if (sequence.some((index) => index < 0)) reasons.push("NARRATIVE_SECTION_MISSING");
  const ordered = sequence.filter((index) => index >= 0);
  if (ordered.some((index, i) => i > 0 && index < ordered[i - 1]!)) reasons.push("NARRATIVE_ORDER_WRONG");
  return { gate: COMMERCIAL_PAGE_NARRATIVE_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function hqPricingQualityFieldsFromHtml(html: string, profile?: ViewportProfile | null): {
  pricing_content_depth: "PASS" | "FAIL";
  whitespace: "PASS" | "FAIL";
} {
  return {
    pricing_content_depth: binaryOfferResult(evaluatePricingPageInformationDepthGate(html).result),
    whitespace: binaryOfferResult(evaluateCommercialWhitespaceBalanceGate({ html, profile }).result),
  };
}

export const OCCUPANCYNPV_PRICING_FAQ = [
  {
    q: "Is the 3-day trial really free?",
    a: "Yes. The trial does not collect a card and does not bill you. After 72 hours you choose Professional $290/year, Per-Deal $149, or you can stop.",
  },
  {
    q: "Do I need a credit card for the trial?",
    a: "No. Start Free Trial asks you to sign in or create an account. It does not collect a card.",
  },
  {
    q: "Will I automatically be charged after 3 days?",
    a: "No. OccupancyNPV does not automatically convert the trial into a paid plan.",
  },
  {
    q: "What happens when the trial ends?",
    a: "The trial ends after 72 hours. OccupancyNPV does not charge you. To create another DealWorkspace, buy Professional or Per-Deal.",
  },
  {
    q: "What is included in Professional?",
    a: "Professional is $290 per year for one authenticated user. During the paid period you can create DealWorkspaces and run lease comparisons with cash-flow, NPV, sensitivity, and an in-workspace comparison summary.",
  },
  {
    q: "What does one Per-Deal purchase include?",
    a: "Per-Deal is $149 for one DealWorkspace and one complete lease comparison.",
  },
  {
    q: "Can I start with the trial and later buy Per-Deal?",
    a: "Yes. After the trial, or during it, you can buy Per-Deal $149 instead of Professional.",
  },
  {
    q: "Can I upgrade to Professional?",
    a: "Yes. Start Professional on this page starts checkout for $290/year. You can do that during or after the trial.",
  },
  {
    q: "Is Professional monthly or annual?",
    a: "Professional is billed annually at $290/year. OccupancyNPV does not sell a monthly Professional price.",
  },
  {
    q: "How many users are included?",
    a: "One authenticated user. Extra Professional seats are not sold on this page.",
  },
  {
    q: "Is OccupancyNPV a CRM?",
    a: "No. OccupancyNPV is a lease-comparison workspace. It is not a CRM.",
  },
  {
    q: "Does OccupancyNPV replace lease administration software?",
    a: "No. It does not administer occupied buildings or replace lease-administration software.",
  },
  {
    q: "What kind of lease analysis does OccupancyNPV support?",
    a: "You enter lease scenarios in a DealWorkspace, then review cash-flow, occupancy costs, NPV, and discount-rate sensitivity.",
  },
  {
    q: "Can I save my deal comparisons?",
    a: "Yes. Comparisons live in your DealWorkspace. You can rename or archive a workspace from your account.",
  },
  {
    q: "What happens to my work after the trial?",
    a: "The trial does not charge you when it ends. Creating another DealWorkspace requires Professional or Per-Deal.",
  },
  {
    q: "How do I get help?",
    a: "Email infinitemediaresources@gmail.com. You can also use Suggest an Improvement on the site without creating an account.",
  },
] as const;

export function occupancynpvPricingFaqSchema(): string {
  const entity = OCCUPANCYNPV_PRICING_FAQ.map((row) => `{
                "@type": "Question",
                "name": ${JSON.stringify(row.q)},
                "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(row.a)} }
              }`).join(",\n              ");
  return `{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
              ${entity}
              ]
            }`;
}

export function occupancynpvPricingBuyerGuideSource(): string {
  const faq = OCCUPANCYNPV_PRICING_FAQ.map((row) => `<h3>${row.q}</h3>\n            <p>${row.a}</p>`).join("\n            ");
  return `<section className="onpv-buyer-guide" data-pricing-depth="true">
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
            ${faq}
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
          </section>`;
}

