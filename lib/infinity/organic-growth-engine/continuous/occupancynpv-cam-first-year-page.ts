import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import { buildConnectedSchemaGraph, occupancynpvOrganization, type SchemaFaqItem } from "./schema-standard";
import type { OrganicDraft } from "./quality";

export const OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION =
  "How should a tenant treat CAM in the first operating year?" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_PATH = "/blog/occupancy-costs/cam-first-year/" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER =
  "Treat first-year CAM as an occupancy-cost estimate that still has to sit on the same timeline as rent, not as a finished bill. Use the lease estimate or stop language, label what is projected versus reconciled, and do not treat a first-year CAM figure as a market average or as a property cap rate." as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER = "first-year CAM belongs on the occupancy-cost timeline" as const;

export const OCCUPANCYNPV_CAM_VISUALS = {
  featured_image: "/media/hero-interior.webp",
  featured_alt: "Editorial commercial interior used as occupancy-cost context. Not a customer photo.",
  supporting_visual: true,
} as const;

export function occupancynpvCamFirstYearPage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH.replace(/\/+$/, ""),
    role: "QUESTION_PAGE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/occupancy-costs",
    title: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
    metaDescription:
      "How a commercial tenant should treat CAM in the first operating year: estimate versus reconcile, what belongs on the occupancy-cost timeline, and common first-year mistakes.",
    canonical: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "occupancy-costs",
    pageOpportunityId: "organic-v2-cam-first-year",
  };
}

export function occupancynpvCamFirstYearFaqs(): SchemaFaqItem[] {
  return [
    {
      question: "Is first-year CAM the same as the final CAM bill?",
      answer: "No. First-year CAM is usually an estimate or a stop. The landlord may reconcile later. Put the estimate on the timeline and label it as projected until the reconciliation exists.",
    },
    {
      question: "Can OccupancyNPV invent a missing CAM number?",
      answer: "No. OccupancyNPV compares occupancy-cost cash you enter. It does not invent a market-average CAM or replace reading the lease. The 3-day free trial has no credit card and no automatic billing.",
    },
  ];
}

export function occupancynpvCamFirstYearSchema() {
  const page = occupancynpvCamFirstYearPage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_ARTICLE",
      url: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
      canonical: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
      breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Occupancy costs", item: "/occupancy-costs/" },
        { name: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION, item: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH },
      ],
      visible_breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Occupancy costs", item: "/occupancy-costs/" },
        { name: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION, item: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH },
      ],
      speakable_css_selectors: ["#direct-answer", "#key-takeaways"],
      faqs: occupancynpvCamFirstYearFaqs(),
      visible_faqs: occupancynpvCamFirstYearFaqs(),
      date_published: "2026-09-24",
      date_modified: "2026-09-24",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["CAM", "first operating year", "occupancy cost"],
      mentions: ["common area maintenance", "expense stop", "commercial lease NPV"],
      article_section: "Occupancy costs",
      link_canonical: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
    },
  });
}

export function occupancynpvCamFirstYearDraftText(): string {
  return [
    OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER,
    "CAM is common-area maintenance and related operating extras a tenant may pay under a net or modified-gross lease. In the first operating year the number on the proposal is often a budget, a stop, or a pro-rata share of an incomplete year. Tenants should compare that figure the same way they compare rent: as cash that belongs on one occupancy-cost timeline.",
    "Worked example: Lease A quotes $8,000 monthly rent and $14 per square foot of first-year CAM on 4,000 square feet, or $56,000 of CAM. Lease B quotes $7,400 monthly rent and $18 CAM, or $72,000 of CAM. Face rent makes B look cheaper. Year-one occupancy cash before other extras is $96,000 plus $56,000 on A versus $88,800 plus $72,000 on B. A is $152,000. B is $160,800. Lower rent did not win year one.",
    "What owners, investors, and tenants can do: copy the CAM clause, the base year or stop, the first-year estimate, and the reconciliation rule onto the same worksheet as rent. Watch for a stub year that is not twelve months. Stress-test a 10 percent CAM overrun and a zero-reconciliation case. Review the actual lease, not a broker summary, before you treat the estimate as final.",
    "Checklist for first-year CAM: estimate or stop amount, what expenses are included, whether the first year is a stub, when reconciliation happens, who pays a deficit, and whether a cap applies. Leave a cell blank if the document does not state the number. Do not invent a market-average CAM to finish the row.",
    "Limitations: first-year CAM is not a property cap rate, not NOI, not a full building valuation, and not automatically the second-year CAM. OccupancyNPV does not guarantee a winner after discounting. A later year can flip the rank if CAM steps or a reconciliation deficit appears.",
    "Common mistakes include comparing face rent and ignoring CAM, treating a first-year estimate as a final bill, mixing a calendar year with a lease year, using a building cap-rate screen as the tenant CAM number, and guessing a market CAM instead of leaving the cell blank.",
    "Related pages: what CAM is in a commercial lease, the lease-input checklist, and how two lease options are compared. OccupancyNPV puts both occupancy-cost paths on one timeline. It does not invent missing bids. The 3-day free trial has no credit card and no automatic billing. Start at /pricing.",
    "This resource is not legal advice, tax advice, or a substitute for reading the lease with counsel or your accountant.",
  ].join(" ");
}

export function occupancynpvCamFirstYearDraft(): OrganicDraft {
  const page = occupancynpvCamFirstYearPage();
  const body = occupancynpvCamFirstYearDraftText();
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
    headings: [
      "What is CAM in the first operating year?",
      "How should a tenant put first-year CAM on the timeline?",
      "Worked example",
      "What owners and tenants can do",
      "First-year CAM checklist",
      "Limitations and common mistakes",
      "How OccupancyNPV uses the number",
      "FAQ",
    ],
    body,
    direct_answer: OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER,
    citations: [
      {
        source: "https://www.gsa.gov/real-estate/real-estate-services/leasing-policy",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-24",
        claim: "Commercial occupancy terms belong in the documented lease, not in an invented average",
      },
      {
        source: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-24",
        claim: "Renting commercial space requires comparing occupancy extras, not rent alone",
      },
    ],
    schema: page.schemaTypes,
    canonical: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
    breadcrumbs: ["Home", "Occupancy costs", OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION],
    internal_links: [
      "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
      "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/pricing",
    ],
    word_count: body.split(/\s+/).length,
    visible_faqs: occupancynpvCamFirstYearFaqs(),
    speakable_selectors: ["#direct-answer", "#key-takeaways"],
    date_published: "2026-09-24",
    date_modified: "2026-09-24",
    page_kind: "BLOG_ARTICLE",
    origin: "https://occupancynpv.com",
    about: ["CAM", "first operating year", "occupancy cost"],
    mentions: ["common area maintenance", "expense stop", "commercial lease NPV"],
  };
}

export function evaluateOccupancyNpvBrandContentFit(copy: string): { result: "PASS" | "FAIL"; reasons: string[] } {
  const text = copy.toLowerCase();
  const reasons: string[] = [];
  if (!/cam|common area maintenance|occupancy/.test(text)) reasons.push("missing_occupancy_subject");
  if (!/tenant|lease/.test(text)) reasons.push("missing_audience");
  if (!/occupancynpv/.test(text)) reasons.push("missing_venture");
  for (const mark of ["club throttle", "ride past midnight", "gelato", "hoodie", "tee shirt", "merch drop"]) {
    if (text.includes(mark)) reasons.push(`foreign:${mark}`);
  }
  return { result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function occupancynpvCamFirstYearRenderedHtml(): string {
  const draft = occupancynpvCamFirstYearDraft();
  return `<!doctype html><html><head><title>${draft.title}</title><link rel="canonical" href="https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}"></head><body>
  <img src="${OCCUPANCYNPV_CAM_VISUALS.featured_image}" alt="${OCCUPANCYNPV_CAM_VISUALS.featured_alt}" />
  <h1>${draft.h1}</h1>
  <p id="direct-answer">${draft.direct_answer}</p>
  <p>${OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER}.</p>
  <p>${draft.body}</p>
  <figure><img src="/media/hero-building.webp" alt="Supporting occupancy-cost visual. Not a customer property." /></figure>
</body></html>`;
}

export function occupancynpvCamFirstYearPageSource(): string {
  const page = occupancynpvCamFirstYearPage();
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/occupancy-costs", label: "Occupancy costs" },
    { href: page.route, label: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION },
  ];
  const sources = [
    { href: "https://www.gsa.gov/real-estate/real-estate-services/leasing-policy", label: "GSA — leasing policy" },
    { href: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space", label: "SBA — renting commercial space" },
    { href: "/occupancy-costs/what-is-cam-in-a-commercial-lease/", label: "What is CAM in a commercial lease?" },
  ];
  const body = `
        <header className="pv-hero pv-article-hero pv-hero-photo pv-hero-photo--article" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as occupancy-cost context. Not a customer photo." width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">Occupancy costs</p>
            <h1 className="pv-display">${OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION}</h1>
            <div id="direct-answer">
              <p>${OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER}</p>
            </div>
            <p>${OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER} with rent, not beside it as an afterthought.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p>Put the first-year CAM estimate on the same worksheet as rent before you argue about which lease is cheaper.</p>
              <p><PrimaryCTA href="/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/">See the lease input checklist</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="DEFINITION" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="what">What is CAM in the first operating year?</h2>
            <p>CAM is common-area maintenance and related operating extras a tenant may pay under a net or modified-gross lease. In the first operating year the number on the proposal is often a budget, a stop, or a pro-rata share of an incomplete year.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="PROCESS" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="timeline">How should a tenant put first-year CAM on the timeline?</h2>
            <p>Copy the CAM clause, the base year or stop, the first-year estimate, and the reconciliation rule onto the same worksheet as rent. Watch for a stub year that is not twelve months. Stress-test a 10 percent CAM overrun and a zero-reconciliation case.</p>
            <aside className="pv-callout" id="key-takeaways"><h3>Key takeaway</h3><p>Label first-year CAM as projected until a reconciliation exists. Do not invent a market average.</p></aside>
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="example">Worked example</h2>
            <p>Lease A quotes $8,000 monthly rent and $14 per square foot of first-year CAM on 4,000 square feet, or $56,000 of CAM. Lease B quotes $7,400 monthly rent and $18 CAM, or $72,000 of CAM. Year-one occupancy cash before other extras is $152,000 on A and $160,800 on B. Lower rent did not win year one.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="CHECKLIST" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2 id="checklist">First-year CAM checklist</h2>
            <p>What owners and tenants can do: record the estimate or stop amount, what expenses are included, whether the first year is a stub, when reconciliation happens, who pays a deficit, and whether a cap applies.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2 id="mistakes">Limitations and common mistakes</h2>
            <p>First-year CAM is not a property cap rate, not NOI, and not automatically the second-year CAM. OccupancyNPV does not guarantee a winner. Common mistakes include ignoring CAM, treating an estimate as a final bill, and guessing a market CAM.</p>
          </div>
        </section>
        <section className="pv-section" data-section-type="PRODUCT" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2 id="occupancynpv">How OccupancyNPV uses the number</h2>
            <p>OccupancyNPV puts both occupancy-cost paths on one timeline. It does not invent missing bids. The 3-day free trial has no credit card and no automatic billing. Start at <a href="/pricing">/pricing</a>.</p>
            <RelatedContent items={[
              { href: "/occupancy-costs/what-is-cam-in-a-commercial-lease/", label: "What is CAM in a commercial lease?" },
              { href: "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/", label: "What numbers do you need to compare two commercial leases?" },
              { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "How do you compare two commercial lease options?" },
              { href: "/pricing", label: "OccupancyNPV pricing and trial" },
            ]} />
            <p><PrimaryCTA href="/pricing">Start free trial</PrimaryCTA></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="FAQ" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>FAQ</h2>
            ${occupancynpvCamFirstYearFaqs().map((row) => `<div><h3>${row.question}</h3><p>${row.answer}</p></div>`).join("\n            ")}
          </div>
        </section>
        <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
          <h2>Trusted sources</h2>
          <AuthorityRefs items={${JSON.stringify(sources)}} />
        </section>
        <Disclosure>Use the figures in your lease proposals and confirm final terms against the actual lease documents.</Disclosure>`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}
