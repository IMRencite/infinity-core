export {
  OCCUPANCYNPV_BLOG_INDEX_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_SLUG,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
  OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
} from "./occupancynpv-blog-catalog-constants";

import {
  ensureCanonicalPublishedBlogInventory,
  listPublishedBlogRecords,
  publishedBlogRecordToCatalogPost,
} from "./published-blog-inventory";
import { postCategories, taxonomySlug } from "./blog-taxonomy";

export type OccupancyNpvBlogPost = {
  asset_id?: string;
  slug: string;
  path: string;
  legacy_paths?: string[];
  title: string;
  excerpt: string;
  published: string;
  modified: string;
  primaryCategory?: string;
  category: string;
  categories?: string[];
  tags: string[];
  image: string;
  image_alt: string;
  featured: boolean;
  reading_time?: string;
  draft?: boolean;
  unpublished?: boolean;
};

export function occupancynpvPublishedBlogPosts(): OccupancyNpvBlogPost[] {
  ensureCanonicalPublishedBlogInventory();
  return listPublishedBlogRecords("occupancynpv").map(publishedBlogRecordToCatalogPost);
}

export function occupancynpvCamFirstYearCatalogPost(): OccupancyNpvBlogPost {
  const post = occupancynpvPublishedBlogPosts().find((row) => row.asset_id === "blog-cam-first-year");
  if (!post) {
    throw new Error("blog-cam-first-year missing from canonical published blog inventory");
  }
  return post;
}

function categoryDisplayFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function occupancynpvCategoryCounts(posts = occupancynpvPublishedBlogPosts()): Array<{ category: string; count: number }> {
  const counts = new Map<string, { category: string; count: number }>();
  for (const post of posts.filter((row) => !row.draft && !row.unpublished)) {
    for (const label of postCategories(post)) {
      const slug = taxonomySlug(label);
      if (!slug) continue;
      const existing = counts.get(slug);
      if (existing) existing.count += 1;
      else counts.set(slug, { category: categoryDisplayFromSlug(slug), count: 1 });
    }
  }
  return [...counts.values()].sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
}

export function occupancynpvActiveCategories(posts = occupancynpvPublishedBlogPosts()): string[] {
  return occupancynpvCategoryCounts(posts).map((row) => row.category);
}

export function occupancynpvActiveTags(posts = occupancynpvPublishedBlogPosts()): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of posts.filter((row) => !row.draft && !row.unpublished)) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}

export function occupancynpvTagCloud(posts = occupancynpvPublishedBlogPosts(), stale: string[] = []): Array<{ tag: string; count: number }> {
  const active = new Set(occupancynpvActiveTags(posts).map((row) => row.tag));
  return occupancynpvActiveTags(posts).filter((row) => active.has(row.tag) && !stale.includes(row.tag) && row.count > 0);
}
