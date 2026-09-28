import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { buildConnectedSchemaGraph, occupancynpvOrganization, type SchemaFaqItem } from "./schema-standard";
import type { OrganicDraft } from "./quality";
import { occupancyLeaseCompareV5Body } from "./occupancy-v5-body-lease-compare";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancynpvEditorialBlogPageSource } from "./occupancynpv-editorial-blog-page";

export const OCCUPANCYNPV_LEASE_COMPARE_QUESTION = "How do you compare two commercial lease options?" as const;
export const OCCUPANCYNPV_LEASE_COMPARE_PATH = "/lease-comparison/how-do-you-compare-two-commercial-lease-options/" as const;

export function occupancynpvLeaseCompareHubPage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_LEASE_COMPARE_PATH.replace(/\/+$/, ""),
    role: "QUESTION_PAGE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/lease-comparison",
    title: OCCUPANCYNPV_LEASE_COMPARE_QUESTION,
    metaDescription:
      "How to compare two commercial lease options on one occupancy-cost timeline: same inputs, one discount rate, and what the ranking still cannot decide for you.",
    canonical: OCCUPANCYNPV_LEASE_COMPARE_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "lease-comparison",
    pageOpportunityId: "organic-v2-lease-compare-hub",
  };
}

export function occupancynpvLeaseCompareHubFaqs(): SchemaFaqItem[] {
  return [
    {
      question: "Can OccupancyNPV compare two real lease proposals?",
      answer: "Yes, after you enter the same occupancy-cost fields from each proposal on one timeline. It does not invent missing bids or replace reading the lease.",
    },
    {
      question: "Is this legal or financial advice?",
      answer: "No. Confirm final terms against the actual lease documents with counsel or your accountant when needed.",
    },
  ];
}

export function occupancynpvLeaseCompareHubSchema() {
  const page = occupancynpvLeaseCompareHubPage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "EVERGREEN_RESOURCE",
      url: OCCUPANCYNPV_LEASE_COMPARE_PATH,
      canonical: OCCUPANCYNPV_LEASE_COMPARE_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_LEASE_COMPARE_QUESTION,
      breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Lease comparison", item: "/lease-comparison/" },
        { name: OCCUPANCYNPV_LEASE_COMPARE_QUESTION, item: OCCUPANCYNPV_LEASE_COMPARE_PATH },
      ],
      visible_breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Lease comparison", item: "/lease-comparison/" },
        { name: OCCUPANCYNPV_LEASE_COMPARE_QUESTION, item: OCCUPANCYNPV_LEASE_COMPARE_PATH },
      ],
      speakable_css_selectors: ["#direct-answer", "#key-takeaways"],
      faqs: occupancynpvLeaseCompareHubFaqs(),
      visible_faqs: occupancynpvLeaseCompareHubFaqs(),
      date_published: "2026-09-20",
      date_modified: "2026-09-27",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["commercial lease comparison", "occupancy cost NPV"],
      mentions: ["base rent", "CAM", "tenant improvement", "discount rate"],
      article_section: "Lease comparison",
      link_canonical: OCCUPANCYNPV_LEASE_COMPARE_PATH,
    },
  });
}

export function occupancynpvLeaseCompareHubDraft(): OrganicDraft {
  const page = occupancynpvLeaseCompareHubPage();
  const v5 = occupancyLeaseCompareV5Body();
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_LEASE_COMPARE_QUESTION,
    headings: v5.headings,
    body: v5.body,
    direct_answer: v5.answer,
    citations: [],
    schema: page.schemaTypes,
    canonical: OCCUPANCYNPV_LEASE_COMPARE_PATH,
    breadcrumbs: ["Home", "Lease comparison", OCCUPANCYNPV_LEASE_COMPARE_QUESTION],
    internal_links: [
      "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      "/compare-commercial-leases",
      "/blog/occupancy-costs/cam-first-year/",
      "/pricing",
    ],
    word_count: v5.body.split(/\s+/).length,
    visible_faqs: [...occupancynpvLeaseCompareHubFaqs(), ...v5.faqs],
    speakable_selectors: ["#direct-answer", "#key-takeaways"],
    date_published: "2026-09-20",
    date_modified: "2026-09-27",
    page_kind: "EVERGREEN_RESOURCE",
  };
}

export function occupancynpvLeaseCompareHubPageSource(): string {
  const page = occupancynpvLeaseCompareHubPage();
  const draft = occupancynpvLeaseCompareHubDraft();
  const featured = occupancynpvFeaturedEditorialFor("how-do-you-compare-two-commercial-lease-options");
  return occupancynpvEditorialBlogPageSource({
    page,
    draft,
    post: {
      path: OCCUPANCYNPV_LEASE_COMPARE_PATH,
      published: "2026-09-20",
      primaryCategory: "Lease comparison",
      category: "Lease comparison",
      tags: ["Lease comparison", "NPV", "Occupancy cost"],
      title: OCCUPANCYNPV_LEASE_COMPARE_QUESTION,
    },
    featured_image: featured.path,
    featured_alt: featured.alt,
    importDepth: "../../../",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/lease-comparison", label: "Lease comparison" },
      { href: page.route, label: OCCUPANCYNPV_LEASE_COMPARE_QUESTION },
    ],
    related_html: `<section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <p><a href="/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/">Lease input checklist</a> · <a href="/blog/leasing/what-is-occupancy-cost-versus-rent/">Occupancy cost versus rent</a> · <a href="/compare-commercial-leases">Compare leases tool</a></p>
            </section>`,
  });
}
