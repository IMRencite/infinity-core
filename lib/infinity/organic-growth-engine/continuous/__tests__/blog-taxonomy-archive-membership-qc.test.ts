import { describe, expect, it } from "vitest";
import {
  evaluateBlogCategoryTagSemanticSeparationQc,
  evaluateBlogTaxonomyArchiveCountParityQc,
  evaluateBlogTaxonomyArchiveMembershipQc,
  evaluateOccupancyNpvCategoryArchiveMembership,
} from "../blog-taxonomy-archive-membership-qc";
import { filterPostsByCategory, postMatchesCategoryArchive, taxonomySlug } from "../blog-taxonomy";
import { occupancynpvPublishedBlogPosts, type OccupancyNpvBlogPost } from "../occupancynpv-blog-catalog";
import { occupancynpvBlogCategoryArchiveSource } from "../occupancynpv-blog";

describe("ONPV taxonomy archive membership", () => {
  it("matches occupancy-costs by primary slug despite label casing", () => {
    const posts = occupancynpvPublishedBlogPosts();
    const matching = filterPostsByCategory(posts, "occupancy-costs");
    expect(matching.length).toBe(2);
    expect(matching.every((post) => postMatchesCategoryArchive(post, "occupancy-costs"))).toBe(true);
    const html = occupancynpvBlogCategoryArchiveSource("occupancy-costs");
    expect(html).not.toContain("No published posts in this archive.");
    const audit = evaluateOccupancyNpvCategoryArchiveMembership({ categorySlug: "occupancy-costs", html, posts });
    expect(audit.missing).toEqual([]);
    expect(audit.wrong).toEqual([]);
  });

  it("does not place leasing-primary posts in occupancy-costs via shared tag", () => {
    const posts = occupancynpvPublishedBlogPosts();
    const leasingOnly = posts.filter(
      (post) => taxonomySlug(post.primaryCategory ?? post.category) === "leasing",
    );
    expect(leasingOnly.length).toBeGreaterThan(0);
    const occupancy = filterPostsByCategory(posts, "occupancy-costs");
    for (const post of leasingOnly) {
      expect(occupancy.some((row) => row.slug === post.slug)).toBe(false);
    }
  });

  it("passes exact-set membership and count parity QC for canonical inventory", () => {
    expect(evaluateBlogTaxonomyArchiveMembershipQc().result).toBe("PASS");
    expect(evaluateBlogTaxonomyArchiveCountParityQc().result).toBe("PASS");
    expect(evaluateBlogCategoryTagSemanticSeparationQc().result).toBe("PASS");
  });

  it("fails when archive filter uses display label equality (regression guard)", () => {
    const base = occupancynpvPublishedBlogPosts()[0]!;
    const posts: OccupancyNpvBlogPost[] = [
      {
        ...base,
        asset_id: "occ-costs-regression",
        slug: "occ-regression",
        path: "/blog/occupancy-costs/occ-regression/",
        primaryCategory: "Occupancy costs",
        category: "Occupancy costs",
        tags: [],
      },
    ];
    const wrong = posts.filter((post) => (post.primaryCategory ?? post.category) === "Occupancy Costs");
    expect(wrong).toHaveLength(0);
    expect(filterPostsByCategory(posts, "occupancy-costs")).toHaveLength(1);
  });
});
