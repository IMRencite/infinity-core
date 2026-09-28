import { describe, expect, it } from "vitest";
import { occupancynpvUniqueCreativeSvg } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-creative";
import { CLUB_THROTTLE_JOURNAL_POSTS } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-journal";
import { evaluateBlogVisualAssetGate } from "@/lib/infinity/organic-growth-engine/continuous/blog-quality-core";
import {
  OCCUPANCYNPV_FEATURED_EDITORIAL,
  occupancynpvFeaturedEditorialPrompt,
  occupancynpvFeaturedImageUniqueness,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-featured-visuals";
import { occupancynpvExpansionPublishedRecords } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-expansion-records";
import { assembleClubThrottleOperatingBundle, assembleOccupancyNpvOperatingBundle } from "@/lib/infinity/autonomous-venture-operations/assemble";
import {
  classifyFeaturedVisualMedium,
  clubThrottleVisualBrandProfile,
  compileFeaturedEditorialPrompt,
  evaluateClubThrottleJournalVisualAudit,
  evaluateVisualBrandConsistency,
  evaluateVisualDrift,
  occupancynpvKnownBadFeaturedSources,
  occupancynpvVisualBrandProfile,
} from "../venture-visual-brand-profile";
import { routeCreativeProvider } from "@/lib/infinity/commerce/creative-media/creative-provider-router";

describe("VentureVisualBrandProfile v1", () => {
  it("keeps Occupancy and Club Throttle on different visual profiles", () => {
    const occupancy = occupancynpvVisualBrandProfile();
    const club = clubThrottleVisualBrandProfile();
    expect(occupancy.primary_visual_medium).toBe("PHOTOGRAPHIC_EDITORIAL");
    expect(club.primary_visual_medium).toBe("CINEMATIC_EDITORIAL");
    expect(occupancy.featured_editorial_intent).toBe("OCCUPANCY_FEATURED_EDITORIAL");
    expect(club.featured_editorial_intent).toBe("CLUB_THROTTLE_EDITORIAL");
    expect(club.apparel_intent).toBe("CLUB_THROTTLE_APPAREL");
    expect(assembleOccupancyNpvOperatingBundle().organic.visual_brand_profile_required).toBe(true);
    expect(assembleClubThrottleOperatingBundle().organic.visual_brand_profile_required).toBe(true);
  });

  it("passes known-good Occupancy photographs and rejects founder-rejected geometry", () => {
    expect(evaluateVisualBrandConsistency({
      venture_id: "occupancynpv",
      featured_image: "/media/hero-building.webp",
    }).FEATURED_IMAGE_READY).toBe("YES");
    expect(evaluateVisualBrandConsistency({
      venture_id: "occupancynpv",
      featured_image: "/media/hero-interior.webp",
    }).result).toBe("PASS");
    for (const bad of occupancynpvKnownBadFeaturedSources(occupancynpvUniqueCreativeSvg)) {
      const verdict = evaluateVisualBrandConsistency({
        venture_id: "occupancynpv",
        featured_image: bad.path,
        featured_source: bad.source,
      });
      expect(verdict.result).toBe("FAIL");
      expect(verdict.reasons).toContain("FAIL_FEATURED_VISUAL");
    }
    expect(classifyFeaturedVisualMedium({
      path: "/media/blog/topic-hub.svg",
      source: occupancynpvUniqueCreativeSvg("topic-hub"),
    })).toBe("GEOMETRIC_SHAPE_ART");
  });

  it("does not treat IMAGE_PRESENT as a featured pass", () => {
    expect(evaluateBlogVisualAssetGate({
      featured_image: "/media/blog/valuation-category.svg",
      featured_alt: "exists",
      supporting_visual: true,
      featured_source: occupancynpvUniqueCreativeSvg("valuation"),
    }).result).toBe("FAIL");
    expect(evaluateBlogVisualAssetGate({
      featured_image: "/media/hero-building.webp",
      featured_alt: "Editorial commercial building used as valuation context. Not a customer property.",
      supporting_visual: true,
    }).result).toBe("PASS");
  });

  it("keeps explanatory diagrams off the featured role", () => {
    expect(evaluateVisualBrandConsistency({
      venture_id: "occupancynpv",
      visual_role: "FEATURED_EDITORIAL_IMAGE",
      featured_image: "/media/viz-compare.svg",
    }).result).toBe("FAIL");
    expect(evaluateVisualBrandConsistency({
      venture_id: "occupancynpv",
      visual_role: "EXPLANATORY_VISUAL",
      featured_image: "/media/viz-compare.svg",
    }).result).toBe("PASS");
  });

  it("compiles Occupancy featured prompts from profile plus topic", () => {
    const compiled = occupancynpvFeaturedEditorialPrompt("how-do-you-compare-two-commercial-lease-options");
    expect(compiled.publication).toBe("OccupancyNPV");
    expect(compiled.prompt).toMatch(/PUBLICATION: OccupancyNPV/);
    expect(compiled.prompt).toMatch(/VISUAL PURPOSE: editorial featured image/);
    expect(compileFeaturedEditorialPrompt({
      profile: occupancynpvVisualBrandProfile(),
      article_question: "How is cap rate calculated for a commercial building?",
      subject: "Downtown office towers used as valuation context",
      coverage_tokens: ["NOI"],
    }).prompt).toMatch(/NOI/);
  });

  it("assigns six unique photographic Occupancy featured images", () => {
    const uniqueness = occupancynpvFeaturedImageUniqueness();
    expect(uniqueness.result).toBe("PASS");
    expect(new Set(uniqueness.paths).size).toBe(6);
    expect(OCCUPANCYNPV_FEATURED_EDITORIAL.every((row) => !row.path.endsWith(".svg"))).toBe(true);
    expect(occupancynpvExpansionPublishedRecords().every((row) => !row.featured_image.endsWith(".svg"))).toBe(true);
  });

  it("routes Occupancy featured editorial to a photoreal provider and blocks shape fallback", () => {
    const occupancy = routeCreativeProvider({
      intent: "OCCUPANCY_FEATURED_EDITORIAL",
      configured: { XAI_IMAGINE: "ABSENT", RECRAFT: "ABSENT", IDEOGRAM: "ABSENT", OPENAI_IMAGE: "PRESENT" },
    });
    expect(occupancy).toEqual({ provider: "OPENAI_IMAGE", fallback: false, generic_fallback: "DISABLED" });
    expect(routeCreativeProvider({
      intent: "OCCUPANCY_FEATURED_EDITORIAL",
      configured: { XAI_IMAGINE: "ABSENT", RECRAFT: "ABSENT", IDEOGRAM: "ABSENT", OPENAI_IMAGE: "ABSENT" },
    }).provider).toBe("VISUAL_ASSET_BLOCKED");
    expect(routeCreativeProvider({
      intent: "CLUB_THROTTLE_EDITORIAL",
      configured: { XAI_IMAGINE: "ABSENT", RECRAFT: "ABSENT", IDEOGRAM: "ABSENT", OPENAI_IMAGE: "PRESENT" },
    }).provider).toBe("OPENAI_IMAGE");
    expect(routeCreativeProvider({
      intent: "CLUB_THROTTLE_APPAREL",
      configured: { XAI_IMAGINE: "PRESENT", RECRAFT: "ABSENT", IDEOGRAM: "ABSENT", OPENAI_IMAGE: "PRESENT" },
    }).provider).toBe("XAI_IMAGINE");
  });

  it("detects visual drift toward geometry", () => {
    expect(evaluateVisualDrift({
      venture_id: "occupancynpv",
      candidate_path: "/media/blog/valuation-category.svg",
      candidate_source: occupancynpvUniqueCreativeSvg("valuation"),
    }).result).toBe("FAIL");
    expect(evaluateVisualDrift({
      venture_id: "occupancynpv",
      candidate_path: "/media/hero-building.webp",
      recent_featured: ["/media/hero-building.webp"],
    }).result).toBe("PASS");
  });

  it("audits Club Throttle Journal against its own profile", () => {
    const audit = evaluateClubThrottleJournalVisualAudit(CLUB_THROTTLE_JOURNAL_POSTS.map((post) => post.image));
    expect(audit.every((row) => row.venture_id === "club-throttle")).toBe(true);
    expect(audit.every((row) => row.result === "FAIL")).toBe(true);
    expect(clubThrottleVisualBrandProfile().primary_visual_medium).not.toBe("PHOTOGRAPHIC_EDITORIAL");
  });
});
