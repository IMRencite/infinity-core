import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { OrganicDraft } from "./quality";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancyGrossVsNetLeaseV5Body } from "./occupancy-v5-body-gross-vs-net-lease";
import { occupancyExpenseStopBaseYearV5Body } from "./occupancy-v5-body-expense-stop-base-year";

export const ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID =
  "blog-expansion-gross-lease-vs-net-lease-for-tenants" as const;

export const ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH =
  "/blog/leasing/gross-lease-vs-net-lease-for-tenants/" as const;

export const ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_ASSET_ID =
  "blog-expansion-expense-stop-vs-base-year-for-tenants" as const;

export const ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_PATH =
  "/blog/leasing/expense-stop-vs-base-year-for-tenants/" as const;

const SHARED_LINKS = [
  "/blog/occupancy-costs/what-is-occupancy-cost-versus-rent/",
  "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
  "/blog/leasing/what-numbers-do-you-need-to-compare-two-leases/",
  "/blog/leasing/how-do-you-compare-two-commercial-lease-options/",
  "/compare-commercial-leases",
];

function grossArticle(): OccupancyNpvBlogPost {
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

function expenseStopBaseYearArticle(): OccupancyNpvBlogPost {
  const slug = "expense-stop-vs-base-year-for-tenants";
  const featured = occupancynpvFeaturedEditorialFor(slug);
  return {
    asset_id: ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_ASSET_ID,
    slug,
    path: ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_PATH,
    title: "What is the difference between an expense stop and a base year for tenants?",
    excerpt:
      "An expense stop caps tenant recoveries at a stated level; a base year bills tenant share of operating expenses above a documented baseline year. Both change occupancy cost while face rent stays flat.",
    published: "2026-10-15",
    modified: "2026-10-15",
    primaryCategory: "Leasing",
    category: "leasing",
    categories: ["leasing"],
    tags: ["Expense Stop", "Base Year", "CAM", "Recoveries", "Leasing"],
    image: featured.path,
    image_alt: featured.alt,
    featured: false,
    reading_time: "12 min read",
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

function draftFromExpenseStop(post: OccupancyNpvBlogPost): OrganicDraft {
  const bodyPack = occupancyExpenseStopBaseYearV5Body();
  return draftFrom(post, bodyPack as ReturnType<typeof occupancyGrossVsNetLeaseV5Body>);
}

export function occupancynpvAutonomousBacklogPosts(): OccupancyNpvBlogPost[] {
  return [expenseStopBaseYearArticle(), grossArticle()];
}

export function occupancynpvAutonomousBacklogDrafts(): OrganicDraft[] {
  const expensePost = expenseStopBaseYearArticle();
  const grossPost = grossArticle();
  return [draftFromExpenseStop(expensePost), draftFrom(grossPost, occupancyGrossVsNetLeaseV5Body())];
}

export function occupancynpvAutonomousBacklogAssetMeta() {
  const post = expenseStopBaseYearArticle();
  return {
    asset_id: post.asset_id!,
    topic: post.title,
    asset_type: "DECISION_SUPPORT_PAGE" as const,
    category: post.primaryCategory ?? "Leasing",
    reason:
      "Distinct recovery-mechanics authority gap: tenants confuse expense stops with base years; unpublished and complements gross/net and CAM cluster.",
    canonical_path: post.path,
  };
}
