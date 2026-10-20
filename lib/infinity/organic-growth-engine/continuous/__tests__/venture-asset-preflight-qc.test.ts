import { describe, expect, it } from "vitest";
import {
  classifyTopicCannibalization,
  evaluateVentureAssetPreflightQc,
  runVentureAssetPreflightWithRepair,
} from "../venture-asset-preflight-qc";
import { buildClubThrottleShirtV10PreflightManifest } from "../club-throttle-shirt-preflight-manifest";
import {
  CLUB_THROTTLE_SHIRT_QUESTION_CLUSTER,
  CLUB_THROTTLE_SHIRT_SEARCH_DEMAND,
} from "../search-demand-evidence";

describe("VentureAssetPreflightQc", () => {
  it("blocks invalid random blog plan without demand", () => {
    const gate = evaluateVentureAssetPreflightQc({
      venture_id: "club-throttle",
      asset_id: "random",
      asset_type: "AUTHORITY_BLOG",
      page_type: "BLOG_ARTICLE",
      public_url: "https://clubthrottle.com/journal/home/pantry-spices/",
      canonical: "/journal/home/pantry-spices/",
      indexable: true,
      body_word_target: { min: 800, preferred_min: 900, preferred_max: 1100 },
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.generation_allowed).toBe(false);
    expect(gate.reasons).toContain("search_demand_missing");
    expect(gate.reasons).toContain("depth_plan_below_authority_minimum");
  });

  it("repairs weak plan enough to pass demand/schema defaults", () => {
    const repaired = runVentureAssetPreflightWithRepair({
      venture_id: "club-throttle",
      asset_id: "shirt",
      asset_type: "AUTHORITY_BLOG",
      page_type: "BLOG_ARTICLE",
      public_url: "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/",
      canonical: "/journal/apparel/how-riders-choose-a-shirt/",
      indexable: true,
      primary_query: CLUB_THROTTLE_SHIRT_SEARCH_DEMAND.primary_query,
      demand: CLUB_THROTTLE_SHIRT_SEARCH_DEMAND,
      cluster: CLUB_THROTTLE_SHIRT_QUESTION_CLUSTER,
      editorial_premise: "Riders keep shirts that work on real miles.",
      thesis: "Blank beats graphic on repeat wear.",
      hero: {
        required: true,
        format: "EDITORIAL_RASTER",
        deploy_path: "/visual/journal-v2-shirt-hero.webp",
        width: 1600,
        height: 900,
      },
      deploy_asset_paths: ["/visual/journal-v2-shirt-hero.webp"],
    });
    expect(repaired.repairs_applied.length).toBeGreaterThan(0);
    expect(repaired.result).toBe("PASS");
    expect(repaired.generation_allowed).toBe(true);
  });

  it("legacy svg hero plan fails preflight", () => {
    const manifest = buildClubThrottleShirtV10PreflightManifest({
      hero_format: "LEGACY_PROCEDURAL_SVG",
      hero_deploy_path: "/visual/journal-v2-shirt-hero.svg",
      deploy_asset_paths: ["/visual/journal-v2-shirt-hero.svg"],
    });
    const gate = evaluateVentureAssetPreflightQc(manifest);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("hero_legacy_svg_default");
  });

  it("V10 raster hero manifest passes preflight when deploy path included", () => {
    const manifest = buildClubThrottleShirtV10PreflightManifest({
      hero_format: "EDITORIAL_RASTER",
      hero_deploy_path: "/visual/journal-v2-shirt-hero.webp",
      deploy_asset_paths: ["/visual/journal-v2-shirt-hero.webp"],
    });
    expect(evaluateVentureAssetPreflightQc(manifest).result).toBe("PASS");
  });

  it("detects duplicate topic intent as MERGE", () => {
    expect(
      classifyTopicCannibalization({
        proposed_canonical: "/journal/apparel/new-slug/",
        proposed_primary_query: "how riders choose a shirt that survives the ride home",
        existing: [
          {
            canonical: "/journal/apparel/how-riders-choose-a-shirt/",
            primary_query: "how riders choose a shirt that survives the ride home",
          },
        ],
      }),
    ).toBe("MERGE");
  });
});
