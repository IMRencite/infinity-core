import type { OccupancyNpvBlogPost } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-catalog";
import { scoreReaderFavorite, type EditorialEngagement } from "./reader-favorite-score";

export type PopularBlogSelection = {
  mode: "EDITORIAL_BOOTSTRAP" | "PERFORMANCE_POPULAR";
  public_label: "Featured Blogs" | "Popular Blogs";
  posts: OccupancyNpvBlogPost[];
  evidence: "SUFFICIENT" | "INSUFFICIENT";
};

export function selectPopularOrFeaturedBlogs(input: {
  posts: OccupancyNpvBlogPost[];
  engagement?: EditorialEngagement[];
  minimum_qualified_views?: number;
}): PopularBlogSelection {
  const published = input.posts.filter((post) => !post.draft && !post.unpublished);
  const threshold = input.minimum_qualified_views ?? 25;
  const rows = (input.engagement ?? []).filter((row) => row.qualified_views >= threshold);
  if (rows.length >= 2) {
    const ranked = [...rows].sort((left, right) => scoreReaderFavorite(right) - scoreReaderFavorite(left)).slice(0, 6);
    const posts = ranked
      .map((row) => published.find((post) => post.path === row.path))
      .filter((post): post is OccupancyNpvBlogPost => Boolean(post));
    if (posts.length) {
      return { mode: "PERFORMANCE_POPULAR", public_label: "Popular Blogs", posts, evidence: "SUFFICIENT" };
    }
  }
  const featured = published.filter((post) => post.featured).slice(0, 6);
  return {
    mode: "EDITORIAL_BOOTSTRAP",
    public_label: "Featured Blogs",
    posts: featured.length ? featured : published.slice(0, 6),
    evidence: "INSUFFICIENT",
  };
}
