import { describe, expect, it } from "vitest";

describe("runtime module initialization v44.1", () => {
  it(
    "loads organic growth catalog without TDZ",
    async () => {
      const catalog = await import("@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-catalog");
      expect(catalog.OCCUPANCYNPV_BLOG_ARTICLE_QUESTION).toContain("interest rates");
      expect(catalog.occupancynpvPublishedBlogPosts().length).toBeGreaterThan(0);
    },
    30_000,
  );

  it("loads backlog inventory after catalog init", async () => {
    const backlog = await import("@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory");
    const rows = backlog.listOccupancyClubThrottleBacklogArticles();
    expect(rows.some((r) => r.venture === "occupancynpv")).toBe(true);
  });

  it("loads isolated runtime route modules", async () => {
    const organic = await import("@/app/api/runtime/organic-tick/route");
    const venture = await import("@/app/api/runtime/venture-operating-cycle/route");
    expect(typeof organic.GET).toBe("function");
    expect(typeof venture.GET).toBe("function");
  });
});
