import { describe, expect, it } from "vitest";
import { afterDarkCreativeDirections, compileGrokApparelPrompt, plannedCapsuleDirections, rejectShallowApparelPrompt } from "../apparel-creative-director";
import { evaluateApparelSellability, evaluateKnownBadSellabilityFixtures } from "../apparel-sellability-gate";
import { evaluateApparelPrepressQC } from "../apparel-prepress-qc";
import { evaluateCandidateDiversity } from "../grok-apparel-critique";
import { clubThrottleCapsuleProducts, selectGelatoTemplateForCapsule } from "../apparel-capsule";
import { planAfterDarkCanary } from "../grok-apparel-pipeline";
import { routeClubThrottleCreative } from "../xai-imagine";
import { classifyXaiImagineHttpFailure } from "../xai-imagine-adapter";
import { routeCreativeProvider } from "../creative-provider-router";
import { evaluateCommerceDensity, evaluateKnownBadGiantProductCards } from "../../storefront-quality/commerce-density";
import { composeClubThrottleStorefrontFiles } from "../../club-throttle-storefront-compose";
import { composeKickstandsUpConcept } from "../creative-trend-intelligence";
import { evaluateCommercialCreativeQC, CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD } from "../commercial-creative-qc";
import { GELATO_STORE_ID } from "@/lib/infinity/commercialization/providers/gelato/founder-templates";

describe("Grok apparel creative director", () => {
  it("rejects a shallow cool-shirt prompt and compiles a full brief", () => {
    expect(rejectShallowApparelPrompt("Make a cool motorcycle shirt for Club Throttle.")).toBe("REJECT");
    const directions = afterDarkCreativeDirections();
    expect(directions).toHaveLength(3);
    expect(new Set(directions.map((row) => row.scene)).size).toBe(3);
    expect(new Set(directions.map((row) => row.art_treatment)).size).toBe(3);
    const prompt = compileGrokApparelPrompt({ direction: directions[0], placement: "back" });
    expect(prompt).toContain("Generate the ARTWORK ITSELF");
    expect(prompt).toMatch(/AVOID:.*T-shirt mockup/i);
    expect(prompt).toContain("Do not draw the garment");
    expect(prompt).toContain("Club Throttle");
    expect(prompt).toContain("Neon City Run");
  });

  it("routes Club Throttle apparel to XAI Imagine first", () => {
    expect(routeCreativeProvider({
      intent: "CLUB_THROTTLE_APPAREL",
      configured: { XAI_IMAGINE: "PRESENT", RECRAFT: "PRESENT", IDEOGRAM: "ABSENT", OPENAI_IMAGE: "PRESENT" },
    }).provider).toBe("XAI_IMAGINE");
    expect(routeClubThrottleCreative({ XAI_API_KEY: "present", OPENAI_API_KEY: "present" }).provider).toBe("XAI_IMAGINE");
    expect(classifyXaiImagineHttpFailure(403, "Your team has either used all available credits or reached its monthly spending limit.")).toBe("SPEND_LIMIT");
    expect(routeCreativeProvider({
      intent: "CLUB_THROTTLE_APPAREL",
      configured: { XAI_IMAGINE: "ABSENT", RECRAFT: "ABSENT", IDEOGRAM: "ABSENT", OPENAI_IMAGE: "ABSENT" },
    }).provider).toBe("VISUAL_ASSET_BLOCKED");
  });

  it("rejects known-bad sellability fixtures and passes a developed composition", () => {
    const bad = evaluateKnownBadSellabilityFixtures();
    expect(bad.every((row) => row.verdict.result === "FAIL" && row.verdict.class === "REJECT")).toBe(true);
    expect(composeKickstandsUpConcept().commercial.result).toBe("FAIL");
    expect(evaluateCommercialCreativeQC({ ...CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD, finished_merchandise: true }).result).toBe("FAIL");
    expect(evaluateApparelSellability({
      title: "After Dark Neon City Run",
      art: "A fully developed original Club Throttle motorcycle apparel composition with professional illustration, realistic motorcycle anatomy, coordinated front and back treatment, vintage poster back print.",
      placement: "SMALL_FRONT_LARGE_BACK",
      provider_preview: true,
    }).result).toBe("PASS");
    expect(evaluateApparelPrepressQC({ shirt_mockup: true }).result).toBe("FAIL");
    expect(evaluateCandidateDiversity(["a", "a", "a"]).result).toBe("FAIL");
    expect(evaluateCandidateDiversity(["a", "b", "c", "d", "e", "f", "g", "h", "i"]).result).toBe("PASS");
  });

  it("plans a bounded After Dark canary and six distinct capsule products", () => {
    const plan = planAfterDarkCanary();
    expect(plan.directions).toBeGreaterThanOrEqual(3);
    expect(plan.candidates_planned).toBe(9);
    expect(plan.bounded).toBe(true);
    const capsule = clubThrottleCapsuleProducts();
    expect(capsule).toHaveLength(6);
    expect(new Set(capsule.map((row) => row.territory)).size).toBe(6);
    expect(capsule.some((row) => row.garment === "oversized hoodie")).toBe(true);
    expect(capsule.some((row) => row.garment === "heavyweight tee")).toBe(true);
    expect(selectGelatoTemplateForCapsule(capsule[0]).create_product).toBe(false);
    expect(GELATO_STORE_ID).toBe("PENDING_FOUNDER");
    const planned = plannedCapsuleDirections();
    expect(Object.keys(planned)).toHaveLength(6);
    expect(Object.values(planned).every((rows) => rows.length >= 3)).toBe(true);
  });

  it("fails giant product cards and applies compact retail density CSS", () => {
    expect(evaluateKnownBadGiantProductCards().result).toBe("FAIL");
    expect(evaluateCommerceDensity({
      viewport_width: 1920,
      column_count: 4,
      card_width_px: 288,
      visible_cards: 4,
      product_image_height_px: 360,
    }).result).toBe("PASS");
    const css = composeClubThrottleStorefrontFiles().files.find((file) => file.path === "app/globals.css")?.content ?? "";
    expect(css).toContain("repeat(4,minmax(0,1fr))");
    expect(css).toContain("max-width:18rem");
    expect(css).not.toContain("auto-fit,minmax(16rem,1fr)");
  });
});
