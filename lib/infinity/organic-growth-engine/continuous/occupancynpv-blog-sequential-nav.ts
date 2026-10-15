import { sequentialBlogNeighbors } from "./blog-ux";
import { occupancynpvPublishedBlogPosts, type OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";

export function occupancynpvBlogSequentialNavHtml(
  currentPath: string,
  posts: OccupancyNpvBlogPost[] = occupancynpvPublishedBlogPosts(),
): string {
  const neighbors = sequentialBlogNeighbors(posts, currentPath);
  const previous = neighbors.previous
    ? `<a href="${neighbors.previous.path}" data-blog-seq-previous="true" aria-label=${JSON.stringify(`Previous blog: ${neighbors.previous.title}`)}><span>← Previous blog</span><strong>${neighbors.previous.title}</strong></a>`
    : "";
  const next = neighbors.next
    ? `<a href="${neighbors.next.path}" data-blog-seq-next="true" aria-label=${JSON.stringify(`Next blog: ${neighbors.next.title}`)}><span>Next blog →</span><strong>${neighbors.next.title}</strong></a>`
    : "";
  return `<nav className="onpv-blog-seq" data-blog-sequential-nav="true" aria-label="Previous and next blog">${previous}${next}</nav>`;
}
