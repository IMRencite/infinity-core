import type { OrganicNamedGate } from "./types";
import {
  filterPostsByCategory,
  filterPostsByTag,
  postPrimaryCategorySlug,
  taxonomySlug,
} from "./blog-taxonomy";
import {
  occupancynpvActiveCategorySlugs,
  occupancynpvActiveTags,
  occupancynpvCategoryCounts,
  occupancynpvPublishedBlogPosts,
  type OccupancyNpvBlogPost,
} from "./occupancynpv-blog-catalog";
import {
  occupancynpvBlogCategoryArchiveSource,
  occupancynpvBlogTagArchiveSource,
} from "./occupancynpv-blog";

export const BLOG_TAXONOMY_ARCHIVE_MEMBERSHIP_QC = "BlogTaxonomyArchiveMembershipQc" as const;
export const BLOG_TAXONOMY_ARCHIVE_COUNT_PARITY_QC = "BlogTaxonomyArchiveCountParityQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

function stablePostIdentity(post: OccupancyNpvBlogPost): string {
  return post.asset_id ?? post.slug;
}

function extractArchiveCardIdentities(html: string): string[] {
  const slugs: string[] = [];
  const hrefRe = /data-blog-archive-card="true"[\s\S]*?<a href="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null) {
    const path = match[1] ?? "";
    const slug = path.replace(/\/+$/, "").split("/").pop() ?? path;
    if (slug) slugs.push(slug);
  }
  return slugs;
}

function setDiff(expected: string[], actual: string[]): { missing: string[]; wrong: string[]; duplicates: string[] } {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((id) => !actualSet.has(id));
  const wrong = actual.filter((id) => !expectedSet.has(id));
  const seen = new Set<string>();
  const duplicates = actual.filter((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
  return { missing, wrong, duplicates };
}

export function evaluateOccupancyNpvCategoryArchiveMembership(input: {
  categorySlug: string;
  html: string;
  posts?: OccupancyNpvBlogPost[];
}): {
  expected: string[];
  rendered: string[];
  missing: string[];
  wrong: string[];
  duplicates: string[];
} {
  const posts = input.posts ?? occupancynpvPublishedBlogPosts();
  const expectedPosts = filterPostsByCategory(posts, input.categorySlug);
  const expected = expectedPosts.map(stablePostIdentity);
  const html = input.html || occupancynpvBlogCategoryArchiveSource(input.categorySlug);
  const renderedPosts = extractArchiveCardIdentities(html);
  const slugToIdentity = new Map(expectedPosts.map((post) => [post.slug, stablePostIdentity(post)]));
  const rendered = renderedPosts.map((slug) => slugToIdentity.get(slug) ?? slug);
  const diff = setDiff(expected, rendered);
  return { expected, rendered, ...diff };
}

export function evaluateOccupancyNpvTagArchiveMembership(input: {
  tag: string;
  html: string;
  posts?: OccupancyNpvBlogPost[];
}): {
  expected: string[];
  rendered: string[];
  missing: string[];
  wrong: string[];
  duplicates: string[];
} {
  const posts = input.posts ?? occupancynpvPublishedBlogPosts();
  const expectedPosts = filterPostsByTag(posts, input.tag);
  const expected = expectedPosts.map(stablePostIdentity);
  const html = input.html || occupancynpvBlogTagArchiveSource(input.tag);
  const renderedPosts = extractArchiveCardIdentities(html);
  const slugToIdentity = new Map(expectedPosts.map((post) => [post.slug, stablePostIdentity(post)]));
  const rendered = renderedPosts.map((slug) => slugToIdentity.get(slug) ?? slug);
  const diff = setDiff(expected, rendered);
  return { expected, rendered, ...diff };
}

export function evaluateBlogTaxonomyArchiveMembershipQc(posts = occupancynpvPublishedBlogPosts()): OrganicNamedGate {
  const reasons: string[] = [];
  for (const categorySlug of occupancynpvActiveCategorySlugs(posts)) {
    const result = evaluateOccupancyNpvCategoryArchiveMembership({ categorySlug, html: "", posts });
    if (result.missing.length) reasons.push(`category:${categorySlug}:missing:${result.missing.join(",")}`);
    if (result.wrong.length) reasons.push(`category:${categorySlug}:wrong:${result.wrong.join(",")}`);
    if (result.duplicates.length) reasons.push(`category:${categorySlug}:duplicate:${result.duplicates.join(",")}`);
  }
  for (const row of occupancynpvActiveTags(posts)) {
    const result = evaluateOccupancyNpvTagArchiveMembership({ tag: row.tag, html: "", posts });
    if (result.missing.length) reasons.push(`tag:${taxonomySlug(row.tag)}:missing:${result.missing.join(",")}`);
    if (result.wrong.length) reasons.push(`tag:${taxonomySlug(row.tag)}:wrong:${result.wrong.join(",")}`);
    if (result.duplicates.length) reasons.push(`tag:${taxonomySlug(row.tag)}:duplicate:${result.duplicates.join(",")}`);
  }
  return named(BLOG_TAXONOMY_ARCHIVE_MEMBERSHIP_QC, reasons);
}

export function evaluateBlogTaxonomyArchiveCountParityQc(posts = occupancynpvPublishedBlogPosts()): OrganicNamedGate {
  const reasons: string[] = [];
  const counts = occupancynpvCategoryCounts(posts);
  for (const row of counts) {
    const archiveCount = filterPostsByCategory(posts, row.slug).length;
    if (row.count !== archiveCount) {
      reasons.push(`category:${row.slug}:sidebar=${row.count}:archive=${archiveCount}`);
    }
    const html = occupancynpvBlogCategoryArchiveSource(row.slug);
    const attr = html.match(/data-blog-archive-count="(\d+)"/);
    const rendered = attr ? Number(attr[1]) : -1;
    if (rendered !== archiveCount) {
      reasons.push(`category:${row.slug}:rendered_attr=${rendered}:archive=${archiveCount}`);
    }
  }
  for (const row of occupancynpvActiveTags(posts)) {
    const archiveCount = filterPostsByTag(posts, row.tag).length;
    if (row.count !== archiveCount) {
      reasons.push(`tag:${taxonomySlug(row.tag)}:sidebar=${row.count}:archive=${archiveCount}`);
    }
  }
  return named(BLOG_TAXONOMY_ARCHIVE_COUNT_PARITY_QC, reasons);
}

/** Ensures category archives use primary slug only and tag archives use tag slugs only. */
export function evaluateBlogCategoryTagSemanticSeparationQc(posts = occupancynpvPublishedBlogPosts()): OrganicNamedGate {
  const reasons: string[] = [];
  for (const slug of occupancynpvActiveCategorySlugs(posts)) {
    for (const post of filterPostsByCategory(posts, slug)) {
      if (postPrimaryCategorySlug(post) !== slug) {
        reasons.push(`category_not_primary:${slug}:${post.slug}`);
      }
    }
  }
  for (const row of occupancynpvActiveTags(posts)) {
    const tagSlug = taxonomySlug(row.tag);
    for (const post of filterPostsByTag(posts, row.tag)) {
      if (!post.tags.some((tag) => taxonomySlug(tag) === tagSlug)) {
        reasons.push(`tag_not_in_tags:${tagSlug}:${post.slug}`);
      }
    }
  }
  return named("BlogCategoryTagSemanticSeparationQc", reasons);
}
