import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { OrganicDraft } from "./quality";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancyGrossVsNetLeaseV5Body } from "./occupancy-v5-body-gross-vs-net-lease";

export const ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID =
  "blog-expansion-gross-lease-vs-net-lease-for-tenants" as const;

export const ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH =
  "/blog/leasing/gross-lease-vs-net-lease-for-tenants/" as const;

const SHARED_LINKS = [
  "/blog/occupancy-costs/what-is-occupancy-cost-versus-rent/",
  "/blog/leasing/what-numbers-do-you-need-to-compare-two-leases/",
  "/blog/leasing/how-do-you-compare-two-commercial-lease-options/",
  "/compare-commercial-leases",
];

function article(): OccupancyNpvBlogPost {
  const slug = "gross-lease-vs-net-lease-for-tenants";
  const featured = occupancynpvFeaturedEditorialFor(slug);
  return {
    asset_id: ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID,
    slug,
    path: ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH,
    title: "What is the difference between a gross lease and a net lease for tenants?",
    excerpt:
      "Gross leases bundle operating costs into the rent quote; net leases separate base rent from CAM, tax, and insurance recoveries. Compare occupancy cost, not headline rent alone.",
    published: "2026-10-15",
    modified: "2026-10-15",
    primaryCategory: "Leasing",
    category: "leasing",
    categories: ["leasing"],
    tags: ["Gross Lease", "Net Lease", "Occupancy Costs", "Leasing"],
    image: featured.path,
    image_alt: featured.alt,
    featured: false,
    reading_time: "14 min read",
    draft: true,
    unpublished: true,
  };
}

function draftFrom(post: OccupancyNpvBlogPost, bodyPack: ReturnType<typeof occupancyGrossVsNetLeaseV5Body>): OrganicDraft {
  return {
    title: post.title,
    meta_description: post.excerpt,
    h1: post.title,
    headings: bodyPack.headings,
    body: bodyPack.body,
    direct_answer: bodyPack.answer,
    citations: [
      {
        source: "https://www.naiop.org/",
        source_type: "authority",
        retrieved_at: "2026-10-15",
        claim: "Commercial leases assign operating expenses between landlord and tenant in gross and net structures.",
      },
      {
        source: "https://www.boma.org/",
        source_type: "authority",
        retrieved_at: "2026-10-15",
        claim: "Operating expense recovery practices vary by lease type and market.",
      },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: post.path,
    breadcrumbs: ["Blog", "Leasing", post.title],
    internal_links: SHARED_LINKS,
    word_count: bodyPack.body.split(/\s+/).length,
    visible_faqs: bodyPack.faqs,
    speakable_selectors: ["h1", "[data-direct-answer]"],
    date_published: post.published,
    date_modified: post.modified,
    page_kind: "BLOG_ARTICLE",
    origin: "https://occupancynpv.com",
  };
}

export function occupancynpvAutonomousBacklogPosts(): OccupancyNpvBlogPost[] {
  return [article()];
}

export function occupancynpvAutonomousBacklogDrafts(): OrganicDraft[] {
  const post = article();
  return [draftFrom(post, occupancyGrossVsNetLeaseV5Body())];
}

export function occupancynpvAutonomousBacklogAssetMeta() {
  const post = article();
  return {
    asset_id: post.asset_id!,
    topic: post.title,
    asset_type: "EVERGREEN_GUIDE" as const,
    category: post.primaryCategory ?? "Leasing",
    reason:
      "Distinct leasing-structure authority gap: tenants confuse gross headline rent with occupancy cost; unpublished and not duplicating live lease-compare article.",
    canonical_path: post.path,
  };
}
