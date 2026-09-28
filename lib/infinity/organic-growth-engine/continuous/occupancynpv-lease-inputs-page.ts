import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import {
  buildConnectedSchemaGraph,
  occupancynpvOrganization,
  type SchemaFaqItem,
} from "./schema-standard";
import { FIRST_LEASE_INPUTS_QUESTION, FIRST_LEASE_INPUTS_ROUTE } from "../obligation/opportunity";
import type { OrganicDraft } from "./quality";
import { occupancyLeaseNumbersV5Body } from "./occupancy-v5-body-lease-numbers";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancynpvEditorialBlogPageSource } from "./occupancynpv-editorial-blog-page";

export const OCCUPANCYNPV_LEASE_INPUTS_QUESTION = FIRST_LEASE_INPUTS_QUESTION;
export const OCCUPANCYNPV_LEASE_INPUTS_PATH = FIRST_LEASE_INPUTS_ROUTE;
export const OCCUPANCYNPV_LEASE_INPUTS_DIRECT_ANSWER =
  "Collect the same cash figures from each lease: starting rent, term, increases, free rent, tenant-improvement money, extras the tenant still pays, and any move or downtime cost. Rent alone is not a comparison." as const;

export function occupancynpvLeaseInputsPage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_LEASE_INPUTS_PATH.replace(/\/+$/, ""),
    role: "QUESTION_PAGE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/lease-comparison",
    title: "What numbers do you need to compare two commercial leases?",
    metaDescription:
      "A working input list for comparing two commercial leases: rent, term, increases, concessions, extras, move costs, and what to take from the lease itself.",
    canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "lease-comparison",
    pageOpportunityId: "organic-v2-live-lease-inputs",
  };
}

export function occupancynpvLeaseInputsFaqs(): SchemaFaqItem[] {
  return [
    {
      question: "Can OccupancyNPV compare two real lease proposals?",
      answer: "Yes, after you enter the same occupancy-cost fields from each proposal. OccupancyNPV puts both paths on one timeline. It does not invent a missing bid and does not replace reading the lease.",
    },
    {
      question: "Is this legal or financial advice?",
      answer: "No. Use the figures in the lease proposals and confirm final terms against the actual lease documents with counsel or your accountant when needed.",
    },
  ];
}

export function occupancynpvLeaseInputsCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Lease comparison", item: "/lease-comparison/" },
    { name: OCCUPANCYNPV_LEASE_INPUTS_QUESTION, item: OCCUPANCYNPV_LEASE_INPUTS_PATH },
  ];
}

export function occupancynpvLeaseInputsSchema() {
  const page = occupancynpvLeaseInputsPage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "EVERGREEN_RESOURCE",
      url: OCCUPANCYNPV_LEASE_INPUTS_PATH,
      canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_LEASE_INPUTS_QUESTION,
      breadcrumbs: occupancynpvLeaseInputsCrumbs(),
      visible_breadcrumbs: occupancynpvLeaseInputsCrumbs(),
      speakable_css_selectors: ["#direct-answer", "#only-rent", "#from-the-lease", "#key-takeaways"],
      faqs: occupancynpvLeaseInputsFaqs(),
      visible_faqs: occupancynpvLeaseInputsFaqs(),
      date_published: "2026-09-20",
      date_modified: "2026-09-27",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["commercial lease comparison", "occupancy cost inputs"],
      mentions: ["base rent", "CAM", "tenant improvement", "move costs", "commercial lease NPV"],
      article_section: "Lease comparison",
      link_canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
    },
  });
}

export function occupancynpvLeaseInputsPageSource(): string {
  const page = occupancynpvLeaseInputsPage();
  const draft = occupancynpvLeaseInputsDraft();
  const featured = occupancynpvFeaturedEditorialFor("what-numbers-do-you-need-to-compare-two-leases");
  return occupancynpvEditorialBlogPageSource({
    page,
    draft,
    post: {
      path: OCCUPANCYNPV_LEASE_INPUTS_PATH,
      published: "2026-09-20",
      primaryCategory: "Lease comparison",
      category: "Lease comparison",
      tags: ["Lease comparison", "Inputs", "Checklist"],
      title: OCCUPANCYNPV_LEASE_INPUTS_QUESTION,
    },
    featured_image: featured.path,
    featured_alt: featured.alt,
    importDepth: "../../../",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/lease-comparison", label: "Lease comparison" },
      { href: page.route, label: OCCUPANCYNPV_LEASE_INPUTS_QUESTION },
    ],
    related_html: `<section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <p><a href="/lease-comparison/how-do-you-compare-two-commercial-lease-options/">Compare two lease options</a> · <a href="/blog/occupancy-costs/cam-first-year/">CAM in the first year</a> · <a href="/compare-commercial-leases">Compare leases tool</a></p>
            </section>`,
  });
}

export function occupancynpvLeaseInputsDraftText(): string {
  return occupancyLeaseNumbersV5Body().body;
}

export function occupancynpvLeaseInputsDraft(): OrganicDraft {
  const page = occupancynpvLeaseInputsPage();
  const v5 = occupancyLeaseNumbersV5Body();
  const body = v5.body;
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_LEASE_INPUTS_QUESTION,
    headings: v5.headings,
    body,
    direct_answer: v5.answer,
    citations: [
      {
        source: "https://www.gsa.gov/real-estate/real-estate-services/leasing-policy",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-20",
        claim: "Commercial lease decisions depend on documented occupancy terms",
      },
      {
        source: "https://www.sba.gov/business-guide/manage-your-business/rent-commercial-space",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-20",
        claim: "Renting commercial space requires comparing occupancy terms, not rent alone",
      },
    ],
    schema: page.schemaTypes,
    canonical: OCCUPANCYNPV_LEASE_INPUTS_PATH,
    breadcrumbs: ["Home", "Lease comparison", OCCUPANCYNPV_LEASE_INPUTS_QUESTION],
    internal_links: [
      "/lease-comparison/",
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
      "/compare-commercial-leases",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
      "/pricing",
    ],
    word_count: body.split(/\s+/).length,
    visible_faqs: [...occupancynpvLeaseInputsFaqs(), ...v5.faqs],
    speakable_selectors: ["#direct-answer", "#only-rent", "#from-the-lease", "#key-takeaways"],
    date_published: "2026-09-20",
    date_modified: "2026-09-27",
    page_kind: "EVERGREEN_RESOURCE",
    origin: "https://occupancynpv.com",
    about: ["commercial lease comparison", "occupancy cost inputs"],
    mentions: ["base rent", "CAM", "move costs", "commercial lease NPV"],
  };
}
