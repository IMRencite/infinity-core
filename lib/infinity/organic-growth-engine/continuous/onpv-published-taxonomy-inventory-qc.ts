import type { OrganicNamedGate } from "./types";
import {
  filterPostsByCategory,
  filterPostsByTag,
  postPrimaryCategorySlug,
  taxonomySlug,
} from "./blog-taxonomy";
import {
  listPublishedBlogRecords,
  ensureCanonicalPublishedBlogInventory,
  type PublishedBlogRecord,
} from "./published-blog-inventory";
import {
  occupancynpvActiveCategorySlugs,
  occupancynpvActiveTags,
  occupancynpvCategoryCounts,
  occupancynpvPublishedBlogPosts,
} from "./occupancynpv-blog-catalog";

export const ONPV_PUBLISHED_TAXONOMY_INVENTORY_QC = "OnpvPublishedTaxonomyInventoryQc" as const;
export const ONPV_CATEGORY_PARTITION_QC = "OnpvCategoryPartitionQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export type OnpvPublishedTaxonomyRow = {
  asset_id: string;
  slug: string;
  primary_category_raw: string;
  primary_category_slug: string;
  tags: string[];
  normalized_tag_slugs: string[];
  registry_state: string;
  production_state: string;
};

export function buildOnpvPublishedTaxonomyMap(): OnpvPublishedTaxonomyRow[] {
  ensureCanonicalPublishedBlogInventory();
  return listPublishedBlogRecords("occupancynpv")
    .filter((row) => row.publication_status === "PUBLISHED")
    .map((row) => ({
      asset_id: row.asset_id,
      slug: row.slug,
      primary_category_raw: row.primary_category,
      primary_category_slug: taxonomySlug(row.primary_category),
      tags: [...row.tags],
      normalized_tag_slugs: row.tags.map(taxonomySlug).filter(Boolean),
      registry_state: row.publication_status,
      production_state: row.publication_evidence ?? "PUBLISHED",
    }));
}

export function evaluateOnpvPublishedTaxonomyInventoryQc(): OrganicNamedGate & {
  ONPV_PUBLISHED_ARTICLE_COUNT: number;
  ONPV_ORPHANED_PRIMARY_CATEGORY_COUNT: number;
  ONPV_UNKNOWN_CATEGORY_SLUG_COUNT: number;
  ONPV_CONFLICTING_PRIMARY_CATEGORY_COUNT: number;
  ONPV_DUPLICATE_PUBLISHED_SLUG_COUNT: number;
} {
  const rows = buildOnpvPublishedTaxonomyMap();
  const reasons: string[] = [];
  let orphaned = 0;
  let unknownSlug = 0;
  const slugSeen = new Map<string, string>();
  let duplicateSlugs = 0;
  const assetSeen = new Set<string>();
  let duplicateAssets = 0;

  for (const row of rows) {
    if (!row.primary_category_raw?.trim()) {
      orphaned += 1;
      reasons.push(`orphan_primary:${row.asset_id}`);
    }
    if (!row.primary_category_slug) {
      unknownSlug += 1;
      reasons.push(`unknown_slug:${row.asset_id}`);
    }
    const prior = slugSeen.get(row.slug);
    if (prior && prior !== row.asset_id) {
      duplicateSlugs += 1;
      reasons.push(`duplicate_slug:${row.slug}`);
    } else slugSeen.set(row.slug, row.asset_id);
    if (assetSeen.has(row.asset_id)) {
      duplicateAssets += 1;
      reasons.push(`duplicate_asset:${row.asset_id}`);
    }
    assetSeen.add(row.asset_id);
  }

  return {
    ...named(ONPV_PUBLISHED_TAXONOMY_INVENTORY_QC, reasons),
    ONPV_PUBLISHED_ARTICLE_COUNT: rows.length,
    ONPV_ORPHANED_PRIMARY_CATEGORY_COUNT: orphaned,
    ONPV_UNKNOWN_CATEGORY_SLUG_COUNT: unknownSlug,
    ONPV_CONFLICTING_PRIMARY_CATEGORY_COUNT: duplicateAssets,
    ONPV_DUPLICATE_PUBLISHED_SLUG_COUNT: duplicateSlugs,
  };
}

export function evaluateOnpvCategoryPartitionQc(): OrganicNamedGate & {
  ONPV_CATEGORY_MEMBERSHIP_TOTAL: number;
  ONPV_PUBLISHED_CATEGORY_ARTICLE_TOTAL: number;
  ONPV_CATEGORY_PARTITION_MISSING: string[];
  ONPV_CATEGORY_PARTITION_DUPLICATES: string[];
} {
  const posts = occupancynpvPublishedBlogPosts().filter((row) => !row.draft && !row.unpublished);
  const publishedSlugs = new Set(posts.map((row) => row.slug));
  const inCategory = new Set<string>();
  const duplicates: string[] = [];
  let membershipTotal = 0;

  for (const slug of occupancynpvActiveCategorySlugs(posts)) {
    for (const post of filterPostsByCategory(posts, slug)) {
      membershipTotal += 1;
      if (inCategory.has(post.slug)) duplicates.push(post.slug);
      inCategory.add(post.slug);
    }
  }

  const missing = [...publishedSlugs].filter((slug) => !inCategory.has(slug));
  const reasons: string[] = [];
  if (missing.length) reasons.push(`partition_missing:${missing.join(",")}`);
  if (duplicates.length) reasons.push(`partition_duplicates:${duplicates.join(",")}`);
  if (membershipTotal !== publishedSlugs.size) {
    reasons.push(`membership_total_mismatch:${membershipTotal}_vs_${publishedSlugs.size}`);
  }

  return {
    ...named(ONPV_CATEGORY_PARTITION_QC, reasons),
    ONPV_CATEGORY_MEMBERSHIP_TOTAL: membershipTotal,
    ONPV_PUBLISHED_CATEGORY_ARTICLE_TOTAL: publishedSlugs.size,
    ONPV_CATEGORY_PARTITION_MISSING: missing,
    ONPV_CATEGORY_PARTITION_DUPLICATES: duplicates,
  };
}

export function evaluateOnpvTagCategoryFallbackQc(): OrganicNamedGate & {
  ONPV_PUBLIC_TAG_COUNT: number;
  ONPV_TAG_EXPECTED_MEMBERSHIP_TOTAL: number;
  ONPV_TAG_CATEGORY_FALLBACK_MATCH_COUNT: number;
} {
  const posts = occupancynpvPublishedBlogPosts();
  const tags = occupancynpvActiveTags(posts);
  let fallbackMatches = 0;
  let expectedTotal = 0;

  for (const row of tags) {
    const byTag = filterPostsByTag(posts, row.tag);
    expectedTotal += byTag.length;
    const tagSlug = taxonomySlug(row.tag);
    for (const post of byTag) {
      const primary = postPrimaryCategorySlug(post);
      if (primary === tagSlug && !post.tags.some((t) => taxonomySlug(t) === tagSlug)) {
        fallbackMatches += 1;
      }
    }
  }

  return {
    ...named("OnpvTagCategoryFallbackQc", fallbackMatches ? [`fallback_count:${fallbackMatches}`] : []),
    ONPV_PUBLIC_TAG_COUNT: tags.length,
    ONPV_TAG_EXPECTED_MEMBERSHIP_TOTAL: expectedTotal,
    ONPV_TAG_CATEGORY_FALLBACK_MATCH_COUNT: fallbackMatches,
  };
}

export function expectedCategorySlugs(posts = occupancynpvPublishedBlogPosts()): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of occupancynpvCategoryCounts(posts)) {
    out[row.slug] = filterPostsByCategory(posts, row.slug).map((p) => p.slug);
  }
  return out;
}
