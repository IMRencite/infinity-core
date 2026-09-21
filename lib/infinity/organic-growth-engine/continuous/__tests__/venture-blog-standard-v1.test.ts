import { describe, expect, it } from "vitest";
import {
  auditActiveVentureBlogs,
  blogRemediationQueue,
  classifyVentureBlogStatus,
  defaultVentureBlogSurface,
  evaluateVentureBlogReadinessGate,
  provisionBuildFactoryBlogFiles,
} from "../venture-blog-standard";
import { composeOccupancyNpvOrganicLiveFiles } from "../occupancynpv-publisher";
import { OCCUPANCYNPV_BLOG_ARTICLE_PATH, OCCUPANCYNPV_BLOG_INDEX_PATH } from "../occupancynpv-blog";
import { BUILD_PROJECT_TEMPLATES } from "@/lib/infinity/build-factory/templates/definitions";

describe("Venture blog standard", () => {
  it("fails public websites without a blog surface and passes OccupancyNPV", () => {
    expect(evaluateVentureBlogReadinessGate({ public_website: true, surface: null }).result).toBe("FAIL");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: defaultVentureBlogSurface("occupancynpv"),
    }).result).toBe("PASS");
    expect(classifyVentureBlogStatus({
      public_website: true,
      surface: defaultVentureBlogSurface("occupancynpv"),
    })).toBe("BLOG_READY");
  });

  it("provisions blog files in Build Factory and OccupancyNPV compose", () => {
    const files = provisionBuildFactoryBlogFiles();
    expect(files["app/blog/page.tsx"]).toContain("Blog");
    expect(files["app/blog/[category]/[slug]/page.tsx"]).toContain("Article");
    expect(files["app/blog/category/[category]/page.tsx"]).toContain("data-blog-archive");
    expect(files["app/blog/tag/[tag]/page.tsx"]).toContain("data-blog-archive");
    expect(BUILD_PROJECT_TEMPLATES["nextjs-site-basic"].supportedCapabilities).toContain("website.provision_blog_surface");
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const paths = composed.files.map((file) => file.path.replace(/\\/g, "/"));
    expect(paths).toContain("app/blog/page.tsx");
    expect(paths.some((path) => path.includes("how-interest-rates-affect-commercial-property-values"))).toBe(true);
    const sitemap = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts");
    expect(sitemap?.content).toContain("/blog");
    expect(composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/blog/page.tsx")?.content).toContain(OCCUPANCYNPV_BLOG_INDEX_PATH.replace(/\/+$/, ""));
    expect(OCCUPANCYNPV_BLOG_ARTICLE_PATH).toContain("/blog/valuation/");
  });

  it("audits existing ventures and queues missing blogs", () => {
    const rows = auditActiveVentureBlogs();
    expect(rows.some((row) => row.venture_id === "occupancynpv" && row.status === "BLOG_READY")).toBe(true);
    expect(blogRemediationQueue(rows).some((row) => row.status === "BLOG_MISSING")).toBe(true);
  });
});
