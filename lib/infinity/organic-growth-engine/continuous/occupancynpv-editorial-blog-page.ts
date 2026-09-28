import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { OrganicDraft } from "./quality";
import {
  LATEST_BLOGS_CAROUSEL_SCRIPT,
  renderBlogArticleShell,
  renderLatestBlogsCarouselHtml,
} from "./blog-ux";
import { renderCanonicalArticleMain } from "./article-section-renderer";
import { occupancynpvBlogSequentialNavHtml } from "./occupancynpv-blog";
import { occupancynpvPublishedBlogPosts } from "./occupancynpv-blog-catalog";

export function occupancynpvEditorialBlogPageSource(input: {
  page: PlannedPage;
  draft: OrganicDraft;
  post: Pick<OccupancyNpvBlogPost, "path" | "published" | "primaryCategory" | "category" | "tags" | "title">;
  featured_image: string;
  featured_alt: string;
  breadcrumbs: Array<{ href: string; label: string }>;
  importDepth: string;
  related_html?: string;
}): string {
  const posts = occupancynpvPublishedBlogPosts();
  const related =
    input.related_html ??
    `<section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <p><a href="/blog/occupancy-costs/cam-first-year/">CAM in the first year</a> · <a href="/blog/valuation/how-interest-rates-affect-commercial-property-values/">Interest rates and value</a> · <a href="/commercial-lease-npv/how-is-cap-rate-calculated/">Cap rate hub</a> · <a href="/compare-commercial-leases">Compare leases</a></p>
            </section>`;
  const main = `
            ${renderCanonicalArticleMain({ headings: input.draft.headings, body: input.draft.body, faqs: input.draft.visible_faqs })}
            ${related}
            ${renderLatestBlogsCarouselHtml({ posts, excludePath: input.post.path, hideWhenNoDiscovery: true, surface: "article" })}
            ${occupancynpvBlogSequentialNavHtml(input.post.path, posts)}`;
  const body = `${renderBlogArticleShell({
    category: input.post.primaryCategory ?? input.post.category,
    date: input.post.published,
    title: input.draft.h1 ?? input.post.title,
    dek: input.draft.direct_answer ?? "",
    featured_image: input.featured_image,
    featured_alt: input.featured_alt,
    tags: input.post.tags,
    main_html: main,
    posts,
    path: input.post.path,
    hideWhenNoDiscovery: true,
  })}
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
  return innerPageShell({ page: input.page, importDepth: input.importDepth, body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(input.breadcrumbs)}} />`,
  );
}
