import type { OrganicDraft } from "./quality";
import { CLUB_THROTTLE_JOURNAL_POSTS } from "./club-throttle-journal-posts";
import { clubThrottleJournalDrafts } from "./club-throttle-journal";
import { ensureCanonicalPublishedBlogInventory, type PublishedBlogRecord } from "./published-blog-inventory";
import { occupancynpvExpansionDrafts } from "./occupancynpv-blog-expansion";
import { occupancynpvInterestRateDraft } from "./occupancynpv-blog";
import { occupancynpvCamFirstYearDraft } from "./occupancynpv-cam-first-year-page";
import { occupancynpvLiveCapRateDraft } from "./occupancynpv-live-page";
import { occupancynpvAutonomousBacklogDrafts } from "./occupancynpv-autonomous-backlog-v1";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "./urls";
import { evaluateInfinityBlogPublicationGateVNext } from "./infinity-blog-publication-gate-vnext";
import { occupancyInfoVisualHtml, slugFromOccupancyPath } from "./occupancynpv-info-visuals";
import { featuredImagePathForBacklogArticle } from "./blog-article-media-registry";

export type BlogBacklogArticle = {
  venture: "club-throttle" | "occupancynpv";
  title: string;
  slug: string;
  path: string;
  canonical_url: string;
  source_files: string[];
  registry_state: PublishedBlogRecord["publication_status"] | "COMPOSE_ONLY" | "UNKNOWN";
  asset_id: string | null;
  draft: OrganicDraft | null;
  backlog_scope: "AUTHORIZED_BACKLOG" | "LEGACY_INDEX" | "TOOL_PAGE";
};

const CT_SOURCE_BY_SLUG: Record<string, string[]> = {
  "how-to-ride-after-dark": ["club-throttle-v5-body-after-dark.ts", "club-throttle-journal.ts"],
  "how-riders-choose-a-shirt": ["club-throttle-v10-body-blocks.ts", "club-throttle-v5-body-shirt.ts", "club-throttle-journal.ts"],
  "bike-night-etiquette": ["club-throttle-v5-body-bike-night.ts", "club-throttle-journal.ts"],
  "garage-culture-as-rider-social-life": ["club-throttle-v5-body-garage.ts", "club-throttle-journal.ts"],
  "group-ride-etiquette": ["club-throttle-v5-body-group-ride.ts", "club-throttle-journal.ts"],
  "streetwear-vs-riding-gear": ["club-throttle-v5-body-streetwear-gear.ts", "club-throttle-journal.ts"],
};

const ONPV_SOURCE_BY_SLUG: Record<string, string[]> = {
  "how-interest-rates-affect-commercial-property-values": ["occupancy-v5-body-interest-rates.ts", "occupancynpv-blog.ts"],
  "cam-first-year": ["occupancy-v5-body-cam-first-year.ts", "occupancynpv-cam-first-year-page.ts"],
  "how-is-cap-rate-calculated-for-a-building": ["occupancy-v5-body-cap-rate.ts", "occupancynpv-blog-expansion.ts"],
  "what-is-occupancy-cost-versus-rent": ["occupancy-v5-body-occupancy-vs-rent.ts", "occupancynpv-blog-expansion.ts"],
  "what-numbers-do-you-need-to-compare-two-leases": ["occupancy-v5-body-lease-numbers.ts", "occupancynpv-blog-expansion.ts"],
  "how-do-you-compare-two-commercial-lease-options": ["occupancy-v5-body-lease-compare.ts", "occupancynpv-blog-expansion.ts"],
  "gross-lease-vs-net-lease-for-tenants": ["occupancy-v5-body-gross-vs-net-lease.ts", "occupancynpv-autonomous-backlog-v1.ts"],
  "how-is-cap-rate-calculated": ["occupancy-v5-body-cap-rate.ts", "occupancynpv-live-page.ts"],
};

function draftByPath(drafts: OrganicDraft[], path: string): OrganicDraft | null {
  const norm = path.replace(/\/+$/, "").toLowerCase();
  return drafts.find((d) => d.canonical.replace(/\/+$/, "").toLowerCase() === norm) ?? null;
}

function registryFor(records: PublishedBlogRecord[], path: string): PublishedBlogRecord | null {
  const norm = path.replace(/\/+$/, "").toLowerCase();
  return records.find((r) => r.path.replace(/\/+$/, "").toLowerCase() === norm) ?? null;
}

export function listOccupancyClubThrottleBacklogArticles(): BlogBacklogArticle[] {
  const records = ensureCanonicalPublishedBlogInventory();
  const ctDrafts = clubThrottleJournalDrafts();
  const onpvDrafts = [
    occupancynpvInterestRateDraft(),
    occupancynpvCamFirstYearDraft(),
    ...occupancynpvExpansionDrafts(),
    ...occupancynpvAutonomousBacklogDrafts(),
  ];
  const liveCap = occupancynpvLiveCapRateDraft();

  const ctPosts: BlogBacklogArticle[] = CLUB_THROTTLE_JOURNAL_POSTS.map((post) => {
    const reg = registryFor(records, post.path);
    return {
      venture: "club-throttle",
      title: post.title,
      slug: post.slug,
      path: post.path,
      canonical_url: `https://clubthrottle.com${post.path}`,
      source_files: CT_SOURCE_BY_SLUG[post.slug] ?? ["club-throttle-journal.ts"],
      registry_state: reg?.publication_status ?? "COMPOSE_ONLY",
      asset_id: reg?.asset_id ?? `journal-${post.slug}`,
      draft: draftByPath(ctDrafts, post.path),
      backlog_scope: "AUTHORIZED_BACKLOG",
    };
  });

  const onpvFromRegistry = records
    .filter((r) => r.venture_id === "occupancynpv")
    .map((reg) => ({
      venture: "occupancynpv" as const,
      title: reg.title,
      slug: reg.slug,
      path: reg.path,
      canonical_url: reg.canonical_url,
      source_files: ONPV_SOURCE_BY_SLUG[reg.slug] ?? ["occupancynpv-publisher.ts"],
      registry_state: reg.publication_status,
      asset_id: reg.asset_id,
      draft: draftByPath(onpvDrafts, reg.path),
      backlog_scope: "AUTHORIZED_BACKLOG" as const,
    }));

  const liveCapArticle: BlogBacklogArticle = {
    venture: "occupancynpv",
    title: liveCap.h1,
    slug: "how-is-cap-rate-calculated",
    path: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    canonical_url: `https://occupancynpv.com${OCCUPANCYNPV_LIVE_CAP_RATE_PATH}`,
    source_files: ONPV_SOURCE_BY_SLUG["how-is-cap-rate-calculated"] ?? ["occupancynpv-live-page.ts"],
    registry_state: "COMPOSE_ONLY",
    asset_id: "live-cap-rate",
    draft: liveCap,
    backlog_scope: "TOOL_PAGE",
  };

  const legacyCtBlog = records.find((r) => r.venture_id === "club-throttle" && r.path === "/blog/");
  const legacy: BlogBacklogArticle[] = legacyCtBlog
    ? [
        {
          venture: "club-throttle",
          title: legacyCtBlog.title,
          slug: legacyCtBlog.slug,
          path: legacyCtBlog.path,
          canonical_url: legacyCtBlog.canonical_url,
          source_files: ["club-throttle-storefront-compose.ts"],
          registry_state: legacyCtBlog.publication_status,
          asset_id: legacyCtBlog.asset_id,
          draft: null,
          backlog_scope: "LEGACY_INDEX",
        },
      ]
    : [];

  const registryPaths = new Set(onpvFromRegistry.map((row) => row.path.replace(/\/+$/, "").toLowerCase()));
  const autonomousOnpv = occupancynpvAutonomousBacklogDrafts()
    .filter((draft) => !registryPaths.has(draft.canonical.replace(/\/+$/, "").toLowerCase()))
    .map((draft) => ({
    venture: "occupancynpv" as const,
    title: draft.h1,
    slug: draft.canonical.replace(/\/+$/, "").split("/").pop() ?? "",
    path: draft.canonical,
    canonical_url: `https://occupancynpv.com${draft.canonical}`,
    source_files: ONPV_SOURCE_BY_SLUG[draft.canonical.replace(/\/+$/, "").split("/").pop() ?? ""] ?? [
      "occupancynpv-autonomous-backlog-v1.ts",
    ],
    registry_state: "COMPOSE_ONLY" as const,
    asset_id: draft.canonical.includes("gross-lease-vs-net")
      ? "blog-expansion-gross-lease-vs-net-lease-for-tenants"
      : `autonomous-${draft.canonical.replace(/\/+$/, "").split("/").pop()}`,
    draft,
    backlog_scope: "AUTHORIZED_BACKLOG" as const,
  }));

  return [...ctPosts, ...onpvFromRegistry, ...autonomousOnpv, liveCapArticle, ...legacy];
}

export function evaluateBacklogSourceVNext(article: BlogBacklogArticle) {
  if (!article.draft) {
    return {
      result: "FAIL" as const,
      publish_allowed: false,
      reasons: ["NO_DRAFT"],
      dimensions: {} as Record<string, "PASS" | "FAIL">,
      visual_required: false,
    };
  }
  const featuredPath = featuredImagePathForBacklogArticle(article.path);
  const occSlug = slugFromOccupancyPath(article.path);
  const infoVisual = occSlug ? occupancyInfoVisualHtml(occSlug) : "";
  const gate = evaluateInfinityBlogPublicationGateVNext({
    draft: article.draft,
    featured_image_path: featuredPath,
    has_inline_table: /data-onpv-info-visual="table"/.test(infoVisual),
    has_inline_diagram: /data-onpv-info-visual="(formula|flow|step|checklist|worked)/.test(infoVisual),
  });
  return gate;
}

export function pickControlledDeployCanaryPair(articles: BlogBacklogArticle[]): {
  club_throttle: BlogBacklogArticle;
  occupancynpv: BlogBacklogArticle;
} {
  const ct =
    articles.find((a) => a.venture === "club-throttle" && a.slug === "how-riders-choose-a-shirt")
    ?? articles.find((a) => a.venture === "club-throttle" && a.backlog_scope === "AUTHORIZED_BACKLOG")!;
  const occ =
    articles.find((a) => a.venture === "occupancynpv" && a.slug === "how-is-cap-rate-calculated-for-a-building")
    ?? articles.find((a) => a.venture === "occupancynpv" && a.backlog_scope === "AUTHORIZED_BACKLOG")!;
  return { club_throttle: ct, occupancynpv: occ };
}
