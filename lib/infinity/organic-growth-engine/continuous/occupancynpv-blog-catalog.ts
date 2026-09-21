export const OCCUPANCYNPV_BLOG_INDEX_PATH = "/blog/" as const;
export const OCCUPANCYNPV_BLOG_ARTICLE_SLUG = "how-interest-rates-affect-commercial-property-values" as const;
export const OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH = "/blog/how-interest-rates-affect-commercial-property-values/" as const;
export const OCCUPANCYNPV_BLOG_ARTICLE_PATH = "/blog/valuation/how-interest-rates-affect-commercial-property-values/" as const;
export const OCCUPANCYNPV_BLOG_ARTICLE_QUESTION = "How do interest rates affect commercial property values?" as const;
export const OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID = "blog-interest-rate" as const;
export const OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY = "Valuation" as const;

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
  return [
    {
      asset_id: OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
      slug: OCCUPANCYNPV_BLOG_ARTICLE_SLUG,
      path: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      legacy_paths: [OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH],
      title: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
      excerpt:
        "Financing costs change the yield buyers require. Same NOI at a higher cap rate is a lower indicated value. This is a property-valuation story, not a tenant lease NPV.",
      published: "2026-09-17",
      modified: "2026-09-17",
      primaryCategory: OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
      category: OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
      categories: [OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY],
      tags: ["Interest Rates", "Cap Rates", "Commercial Real Estate"],
      image: "/media/hero-building.webp",
      image_alt: "Editorial commercial building used as valuation context. Not a customer property.",
      featured: true,
      reading_time: "16 min read",
    },
  ];
}

export function occupancynpvCategoryCounts(posts = occupancynpvPublishedBlogPosts()): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of posts.filter((row) => !row.draft && !row.unpublished)) {
    const labels = [...new Set([post.primaryCategory ?? post.category, ...(post.categories ?? [])].filter(Boolean))];
    for (const category of labels) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
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
