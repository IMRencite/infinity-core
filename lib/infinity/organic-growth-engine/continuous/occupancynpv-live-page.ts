import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import {
  buildConnectedSchemaGraph,
  occupancynpvOrganization,
  type SchemaFaqItem,
} from "./schema-standard";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "./urls";
import type { OrganicDraft } from "./quality";
import { occupancyCapRateV5Body } from "./occupancy-v5-body-cap-rate";
import { occupancynpvEditorialBlogPageSource } from "./occupancynpv-editorial-blog-page";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";

export const OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION = "How is cap rate calculated?" as const;

export const OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER =
  "Cap rate is net operating income divided by the property’s current value or purchase price. It is a property-income shorthand. It is not the same tool as a commercial-lease NPV, which discounts occupancy-cost cash over a lease term." as const;

export function occupancynpvLiveCapRatePage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_LIVE_CAP_RATE_PATH.replace(/\/+$/, ""),
    role: "QUESTION_PAGE",
    primaryIntent: "DEFINITIONAL",
    parentHub: "/commercial-lease-npv",
    title: "How is cap rate calculated?",
    metaDescription:
      "Cap rate equals NOI divided by value. See a worked sample, what the number leaves out, and why OccupancyNPV treats lease NPV as a different comparison.",
    canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "commercial-lease-npv",
    pageOpportunityId: "organic-v2-live-cap-rate",
  };
}

export function occupancynpvCapRateFaqs(): SchemaFaqItem[] {
  return [
    {
      question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
      answer: OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER,
    },
    {
      question: "Is cap rate the same as commercial-lease NPV?",
      answer:
        "No. Cap rate is a property-income ratio. Commercial-lease NPV discounts occupancy-cost cash over a lease term.",
    },
    {
      question: "Should trailing or projected NOI be used?",
      answer: "Name which one. Trailing income is observed. Projected income is a claim.",
    },
  ];
}

export function occupancynpvLiveCapRateCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Commercial lease NPV", item: "/commercial-lease-npv/" },
    { name: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, item: OCCUPANCYNPV_LIVE_CAP_RATE_PATH },
  ];
}

export function occupancynpvLiveCapRateSchema() {
  const page = occupancynpvLiveCapRatePage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "EVERGREEN_RESOURCE",
      url: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
      canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
      breadcrumbs: occupancynpvLiveCapRateCrumbs(),
      visible_breadcrumbs: occupancynpvLiveCapRateCrumbs(),
      speakable_css_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
      faqs: occupancynpvCapRateFaqs(),
      visible_faqs: occupancynpvCapRateFaqs(),
      date_published: "2026-09-17",
      date_modified: "2026-09-17",
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      about: ["capitalization rate", "net operating income"],
      mentions: ["commercial lease NPV", "cash-on-cash return", "IRR"],
      article_section: "Commercial lease NPV",
      link_canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    },
  });
}

export function occupancynpvLiveCapRateDraft(): OrganicDraft {
  const page = occupancynpvLiveCapRatePage();
  const v5 = occupancyCapRateV5Body();
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    headings: v5.headings,
    body: v5.body,
    direct_answer: v5.answer,
    citations: [],
    schema: page.schemaTypes,
    canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    breadcrumbs: ["Home", "Commercial lease NPV", OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION],
    internal_links: [
      "/blog/valuation/how-is-cap-rate-calculated-for-a-building/",
      "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/compare-commercial-leases",
    ],
    word_count: v5.body.split(/\s+/).length,
    visible_faqs: [...occupancynpvCapRateFaqs(), ...v5.faqs],
    speakable_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
    date_published: "2026-09-17",
    date_modified: "2026-09-27",
    page_kind: "EVERGREEN_RESOURCE",
  };
}

export function occupancynpvLiveCapRatePageSource(): string {
  const page = occupancynpvLiveCapRatePage();
  const draft = occupancynpvLiveCapRateDraft();
  const featured = occupancynpvFeaturedEditorialFor("how-is-cap-rate-calculated-for-a-building");
  return occupancynpvEditorialBlogPageSource({
    page,
    draft,
    post: {
      path: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
      published: "2026-09-17",
      primaryCategory: "Commercial lease NPV",
      category: "Commercial lease NPV",
      tags: ["Cap Rates", "Valuation", "NOI"],
      title: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    },
    featured_image: featured.path,
    featured_alt: featured.alt,
    importDepth: "../../../",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/commercial-lease-npv", label: "Commercial lease NPV" },
      { href: page.route, label: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION },
    ],
  });
}

export function occupancynpvLiveCapRateDraftText(): string {
  const draft = occupancynpvLiveCapRateDraft();
  return `${draft.direct_answer ?? ""} ${draft.headings.join(" ")} ${draft.body}`;
}
