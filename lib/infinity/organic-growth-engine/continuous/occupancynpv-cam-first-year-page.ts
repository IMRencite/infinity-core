import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import { buildConnectedSchemaGraph, occupancynpvOrganization, type SchemaFaqItem } from "./schema-standard";
import type { OrganicDraft } from "./quality";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancynpvPublishedBlogPosts } from "./occupancynpv-blog-catalog";
import { occupancyCamFirstYearV5Body } from "./occupancy-v5-body-cam-first-year";
import { occupancynpvEditorialBlogPageSource } from "./occupancynpv-editorial-blog-page";

export const OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION =
  "How should a tenant treat CAM in the first operating year?" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_PATH = "/blog/occupancy-costs/cam-first-year/" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER =
  "Treat first-year CAM as an occupancy-cost estimate that still has to sit on the occupancy-cost timeline with rent, not a finished bill. Use the lease estimate or stop language, label what is projected versus reconciled, and do not treat a first-year CAM figure as a market average or as a property cap rate." as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER = "first-year CAM belongs on the occupancy-cost timeline" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_ID = "blog-cam-first-year" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_VERSION = "cam-first-year-v3" as const;

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
    {
      question: "What is the difference between a CAM estimate, an expense stop, and a base year?",
      answer: "An estimate is a budget. An expense stop versus a base-year comparison changes who pays the overrun. A stop sets a ceiling the landlord absorbs above. A base year sets a starting operating-expense year. Neither is automatically the cash you will write in month one.",
    },
    {
      question: "What if the first operating year is not twelve months?",
      answer: "Treat stub-year cash as a partial period. Mid-year occupancy means you may owe a pro-rata share, not a full-year CAM line. Do not annualize a four-month stub and call it year one.",
    },
    {
      question: "Who pays a CAM reconciliation deficit?",
      answer: "The lease says who pays a deficit. If the clause is silent, do not guess. Demand the backup invoices before you treat a reconciliation deficit as settled cash.",
    },
    {
      question: "What if the landlord will not give a first-year CAM budget?",
      answer: "That is a no CAM budget case. Leave the cell blank. Do not invent a market average. Ask for last year's actuals or walk from a lease that hides the occupancy extra.",
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
      date_modified: "2026-09-25",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["CAM", "first operating year", "occupancy cost"],
      mentions: ["common area maintenance", "expense stop", "commercial lease NPV"],
      article_section: "Occupancy costs",
      link_canonical: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
    },
  });
}

export function occupancynpvCamFirstYearDraftText(): string {
  return occupancyCamFirstYearV5Body().body;
}

export function occupancynpvCamFirstYearDraft(): OrganicDraft {
  const page = occupancynpvCamFirstYearPage();
  const v5 = occupancyCamFirstYearV5Body();
  const body = v5.body;
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
    headings: v5.headings,
    body,
    direct_answer: v5.answer,
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
    visible_faqs: [...occupancynpvCamFirstYearFaqs(), ...v5.faqs],
    speakable_selectors: ["#direct-answer", "#key-takeaways"],
    date_published: "2026-09-24",
    date_modified: "2026-09-25",
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
  const draft = occupancynpvCamFirstYearDraft();
  const post =
    occupancynpvPublishedBlogPosts().find((row) => row.path === OCCUPANCYNPV_CAM_FIRST_YEAR_PATH) ?? {
      path: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
      published: "2026-09-24",
      primaryCategory: "Occupancy costs",
      category: "Occupancy costs",
      tags: ["CAM", "Occupancy costs", "First year"],
      title: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
    };
  const featured = occupancynpvFeaturedEditorialFor("cam-first-year");
  return occupancynpvEditorialBlogPageSource({
    page,
    draft,
    post,
    featured_image: featured.path,
    featured_alt: featured.alt,
    importDepth: "../../../../",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/blog", label: "Blog" },
      { href: "/blog/occupancy-costs/", label: "Occupancy costs" },
      { href: page.route, label: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION },
    ],
  });
}
