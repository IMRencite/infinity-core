import { describe, expect, it } from "vitest";
import {
  OCCUPANCY_CAROUSEL_KNOWN_GOOD,
  OCCUPANCY_CRUSHED_CAROUSEL_KNOWN_BAD,
  OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2,
  evaluateCarouselCardGeometry,
  evaluateCarouselCssContract,
  evaluateCarouselTextCollapse,
} from "../carousel-geometry";
import { evaluateProductionBoundRenderQc } from "../production-bound-render-qc";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS, featuredBlogCardHtml, renderFeaturedBlogsCarouselHtml } from "../blog-ux";
import { occupancynpvPublishedBlogPosts } from "../occupancynpv-blog-catalog";
import { occupancynpvBlogIndexSource } from "../occupancynpv-blog";

describe("production-bound carousel render QC", () => {
  it("rejects the exact live founder geometry and the conceptual crushed fixture", () => {
    expect(evaluateCarouselCardGeometry(OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2).result).toBe("FAIL");
    expect(evaluateCarouselCardGeometry(OCCUPANCY_CRUSHED_CAROUSEL_KNOWN_BAD).result).toBe("FAIL");
    expect(evaluateCarouselCardGeometry(OCCUPANCY_CAROUSEL_KNOWN_GOOD).result).toBe("PASS");
    expect(evaluateCarouselTextCollapse({
      image_width: OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2.image.width,
      body_width: OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2.body.width,
      card_width: OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2.card.width,
      title_lines: OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2.title_lines,
      title_words: OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2.title_words,
    }).result).toBe("FAIL");
    expect(evaluateCarouselTextCollapse({
      image_width: 420,
      body_width: 420,
      card_width: 420,
      title_lines: 2,
      title_words: 11,
    }).result).toBe("PASS");
  });

  it("keeps single-density CSS more specific than the three-column rail", () => {
    expect(evaluateCarouselCssContract(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).result).toBe("PASS");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain('[data-carousel-density="single"] .onpv-blog-featured-rail .onpv-blog-carousel__scroller');
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain("display:flex");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain("flex-direction:column");
  });

  it("composes a shared card with media and body as siblings", () => {
    const post = occupancynpvPublishedBlogPosts()[0]!;
    const card = featuredBlogCardHtml(post);
    expect(card).toContain("onpv-blog-featured-media");
    expect(card).toContain("onpv-blog-featured-body");
    expect(card).toContain('data-carousel-geometry-contract="v2"');
    expect(card).toMatch(/onpv-blog-featured-media[\s\S]*?<\/a>[\s\S]*onpv-blog-featured-body[\s\S]*<h3>/);
    const html = occupancynpvBlogIndexSource();
    expect(html).toContain("Featured Blogs");
    expect(html).toContain('data-carousel-mode="EDITORIAL_BOOTSTRAP"');
    expect(renderFeaturedBlogsCarouselHtml([post], { mode: "PERFORMANCE_POPULAR" }).includes("onpv-blog-featured-body")).toBe(true);
  });

  it("cannot pass production from fixture-only or live-escape evidence", () => {
    const fixtureOnly = evaluateProductionBoundRenderQc({
      fixture: { known_bad_result: "FAIL", known_good_result: "PASS" },
    });
    expect(fixtureOnly.production_gate).toBe("FAIL");
    expect(fixtureOnly.reasons).toContain("LIVE_DOMAIN_NOT_VERIFIED");

    const escaped = evaluateProductionBoundRenderQc({
      fixture: { known_bad_result: "FAIL", known_good_result: "PASS" },
      preview: { geometry_result: "PASS" },
      live: {
        url: "https://occupancynpv.com/blog/",
        geometry_result: "FAIL",
        text_collapse: true,
        serving_expected_artifact: false,
        cache: "HIT",
        deployment_id: "dpl_6aCgW1Cnb2bVcqVMcGKQUrf24LLn",
      },
    });
    expect(escaped.production_gate).toBe("FAIL");
    expect(escaped.live_render_escape).toBe("YES");
    expect(escaped.qc_gate_effectiveness).toBe("FAIL");

    const livePass = evaluateProductionBoundRenderQc({
      fixture: { known_bad_result: "FAIL", known_good_result: "PASS" },
      preview: { geometry_result: "PASS" },
      live: {
        url: "https://occupancynpv.com/blog/",
        geometry_result: "PASS",
        text_collapse: false,
        serving_expected_artifact: true,
        cache: "MISS",
        deployment_id: "dpl_repaired",
        expected_deployment_id: "dpl_repaired",
      },
    });
    expect(livePass.production_gate).toBe("PASS");
    expect(livePass.live_render_escape).toBe("NO");
  });
});
