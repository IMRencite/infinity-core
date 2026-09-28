import { describe, expect, it } from "vitest";
import { CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD, evaluateCommercialCreativeQC } from "../commercial-creative-qc";
import { composeKickstandsUpConcept, clubThrottleTrendSignals } from "../creative-trend-intelligence";
import { gelatoReadOnlyCapability, seedClubThrottleCoreTeeTemplate, selectGelatoTemplate } from "@/lib/infinity/commercialization/providers/gelato/template-registry";

describe("Commercial creative and Gelato read-only", () => {
  it("fails founder-rejected geometric collection art as finished merchandise", () => {
    expect(evaluateCommercialCreativeQC({ ...CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD, finished_merchandise: true }).result).toBe("FAIL");
  });

  it("rejects Kickstands Up text-on-rectangle as a known-bad sellability fixture", () => {
    const concept = composeKickstandsUpConcept();
    expect(clubThrottleTrendSignals().length).toBeGreaterThan(0);
    expect(concept.composition.placement).toBe("SMALL_FRONT_LARGE_BACK");
    expect(concept.ip_safe).toBe(true);
    expect(concept.commercial.result).toBe("FAIL");
    expect(concept.commercial.reasons).toContain("KNOWN_BAD_TEXT_GRAPHIC");
    expect(concept.artwork_svg).toContain("KICKSTANDS");
  });

  it("records Gelato catalog support and does not invent mockup APIs", () => {
    const capability = gelatoReadOnlyCapability();
    expect(capability.catalog_products).toBe(true);
    expect(capability.mockup_api).toBe("UNSUPPORTED");
    seedClubThrottleCoreTeeTemplate();
    expect(selectGelatoTemplate({ garment_intent: "tee", placement: "SMALL_FRONT_LARGE_BACK", approved_only: false })?.print_areas.map((row) => row.location)).toEqual(["front", "back"]);
  });
});
