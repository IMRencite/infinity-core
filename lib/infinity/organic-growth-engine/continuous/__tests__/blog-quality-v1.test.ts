import { describe, expect, it } from "vitest";
import { BUILD_PROJECT_TEMPLATES } from "@/lib/infinity/build-factory/templates/definitions";
import {
  evaluateBlogActionabilityGate,
  evaluateBlogContentQualityGate,
  evaluateBlogHumanReadabilityGate,
  evaluateBlogIndexReadinessGate,
  evaluateBlogValueFirstGate,
  evaluateBlogVisualAssetGate,
} from "../blog-quality";
import { occupancynpvBlogArticleSchema, occupancynpvBlogArticleSource, occupancynpvBlogIndexSchema, occupancynpvBlogIndexSource, occupancynpvInterestRateDraft } from "../occupancynpv-blog";
import { occupancynpvPublishedBlogPosts, occupancynpvTagCloud } from "../occupancynpv-blog-catalog";
import { defaultVelocityInputs } from "../cadence";
import { applyOrganicGrowthPerformanceFeedback } from "../performance";
import { authorizeOrganicPublish, registerSalesContentAsset } from "../publish";
import { evaluateDraftSchemaStack } from "../schema-standard";
import { classifyBlogEditorial } from "../blog-quality";
import { defaultVentureBlogSurface, evaluateVentureBlogReadinessGate, provisionBuildFactoryBlogFiles } from "../venture-blog-standard";
import type { OrganicDraft } from "../quality";

function thinDraft(): OrganicDraft {
  return {
    title: "Rates note",
    meta_description: "A short editorial note about interest rates in commercial real estate markets today.",
    h1: "How interest rates affect values",
    headings: ["Overview", "Conclusion"],
    body: "Interest rates affect commercial property values. In today's market this is important. Values may change when rates change.",
    direct_answer: "Rates can affect values.",
    citations: [],
    schema: ["BlogPosting"],
    canonical: "/blog/thin/",
    breadcrumbs: ["Home", "Blog", "Thin"],
    internal_links: [],
    word_count: 28,
  };
}

describe("Blog quality standard", () => {
  it("rejects a thin low-value blog and blocks publish", () => {
    const draft = thinDraft();
    expect(evaluateBlogValueFirstGate(draft).result).toBe("FAIL");
    expect(evaluateBlogContentQualityGate(draft).result).toBe("FAIL");
    expect(evaluateBlogActionabilityGate(draft).result).toBe("FAIL");
    expect(authorizeOrganicPublish({
      venture_active: true,
      website_approved: true,
      publishing_enabled: true,
      quality: { gate: "q", result: "PASS", reasons: [] },
      duplicate: { result: "PASS" },
      url: { gate: "u", result: "PASS", reasons: [] },
      evidence: { gate: "e", result: "PASS", reasons: [] },
      links: { gate: "l", result: "PASS", reasons: [] },
      schema: { gate: "s", result: "PASS", reasons: [] },
      velocity_available: true,
      blog_gates: [evaluateBlogValueFirstGate(draft)],
    }).result).toBe("FAIL");
  });

  it("passes the expanded OccupancyNPV interest-rate resource", () => {
    const draft = occupancynpvInterestRateDraft();
    expect(evaluateBlogValueFirstGate(draft).result).toBe("PASS");
    expect(evaluateBlogContentQualityGate(draft).result).toBe("PASS");
    expect(evaluateBlogActionabilityGate(draft).result).toBe("PASS");
    expect(evaluateBlogHumanReadabilityGate(draft).result).toBe("PASS");
    expect(evaluateBlogVisualAssetGate({
      featured_image: "/media/hero-building.webp",
      featured_alt: "Editorial commercial building used as valuation context. Not a customer property.",
      supporting_visual: true,
    }).result).toBe("PASS");
    expect(evaluateBlogVisualAssetGate({ featured_image: undefined, required: true }).result).toBe("FAIL");
    expect(evaluateDraftSchemaStack(draft).stack.result).toBe("PASS");
    expect(occupancynpvBlogArticleSource()).toContain("/media/hero-building.webp");
    expect(occupancynpvBlogArticleSource()).toContain("What Owners Should Review When Rates Change");
    expect(occupancynpvBlogArticleSource()).toContain("$2,000,000");
  });

  it("renders a dynamic blog index roll, categories, and active-only tag cloud", () => {
    const html = occupancynpvBlogIndexSource();
    const posts = occupancynpvPublishedBlogPosts();
    expect(evaluateBlogIndexReadinessGate({ published: posts, index_html: html }).result).toBe("PASS");
    expect(html).toContain(posts[0]!.title);
    expect(html).toContain(posts[0]!.image);
    expect(html).toContain(posts[0]!.excerpt);
    expect(html).toContain("Valuation");
    expect(html).toContain("Interest Rates");
    expect(html).toContain("data-blog-roll");
    expect(occupancynpvTagCloud(posts, ["Stale Unused"]).map((row) => row.tag)).not.toContain("Stale Unused");
    expect(occupancynpvTagCloud([
      ...posts,
      { ...posts[0]!, slug: "two", path: "/blog/two/", tags: ["Commercial Real Estate"] },
      { ...posts[0]!, slug: "three", path: "/blog/three/", tags: ["Commercial Real Estate"] },
    ]).find((row) => row.tag === "Commercial Real Estate")?.count).toBe(3);
    expect(occupancynpvBlogIndexSchema()["@graph"]).toEqual(expect.any(Array));
    expect(JSON.stringify(occupancynpvBlogIndexSchema())).not.toContain("BlogPosting");
    expect(JSON.stringify(occupancynpvBlogArticleSchema())).toContain("BlogPosting");
    expect(classifyBlogEditorial(occupancynpvInterestRateDraft(), {
      featured_image: "/media/hero-building.webp",
      category: "Valuation",
      tags: ["Interest Rates", "Cap Rates"],
    })).toBe("BLOG_COMPLETE");
    const sales = registerSalesContentAsset({
      asset_id: "blog-interest-rate",
      venture_id: "occupancynpv",
      url: posts[0]!.path,
      title: posts[0]!.title,
      content_type: "BLOG",
      topic: "Interest Rates",
      cluster: "valuation",
      question_answered: posts[0]!.title,
      intent: "how interest rates affect commercial property values",
      status: "PUBLISHED",
      published_at: posts[0]!.published,
      updated_at: posts[0]!.modified,
      quality_score: 92,
      evidence_status: "PASS",
      internal_links: ["/commercial-lease-npv/how-is-cap-rate-calculated/"],
      taxonomy: { categories: ["Valuation"], tags: posts[0]!.tags },
      sales_relevance: 0.8,
      objections_addressed: ["rates automatically cut every property by the same amount"],
      indexation: "published",
    });
    expect(sales.url).toBe(posts[0]!.path);
    expect(applyOrganicGrowthPerformanceFeedback({
      records: [{
        url: posts[0]!.path,
        indexation: "published",
        impressions: 1,
        clicks: 0,
        ranking_visibility: 0.2,
        engagement: 0,
        conversions: 0,
        assisted_conversions: 0,
        organic_leads: 0,
        sales_usage: 1,
        outbound_usage: 0,
        geo_visibility: 0,
        refresh_impact: 0,
      }],
      graph: { venture_id: "occupancynpv", nodes: [], questions: [], entities: [], content_gaps: [], internal_links: [], authority_sources: [], sales_relevance: {}, refresh_state: {} },
      velocity: defaultVelocityInputs(),
    }).velocity_adjustment).toBeDefined();
  });

  it("updates VentureBlogStandard and Build Factory blog readiness", () => {
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: defaultVentureBlogSurface("occupancynpv"),
    }).result).toBe("PASS");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: { ...defaultVentureBlogSurface("x"), dynamic_post_roll: false },
    }).result).toBe("FAIL");
    const files = provisionBuildFactoryBlogFiles();
    expect(files["content/blog-catalog.json"]).toContain("dynamic_post_roll");
    expect(BUILD_PROJECT_TEMPLATES["nextjs-site-basic"].supportedCapabilities).toContain("website.provision_blog_surface");
  });
});
