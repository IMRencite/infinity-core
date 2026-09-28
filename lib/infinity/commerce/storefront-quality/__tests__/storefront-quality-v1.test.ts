import { describe, expect, it } from "vitest";
import { CLUB_THROTTLE_BRAND_PROFILE, RIDE_PAST_MIDNIGHT_CREATIVE_STATUS } from "../../brand/club-throttle-profile";
import { CLUB_THROTTLE_COLLECTIONS, CLUB_THROTTLE_CORE_TEE, CLUB_THROTTLE_SIZE_CHART } from "../../club-throttle-catalog";
import { composeClubThrottleStorefrontFiles } from "../../club-throttle-storefront-compose";
import {
  evaluateBrandCreativeFitGate,
  evaluateCrossVentureBrandIsolationGate,
  CLUB_THROTTLE_GARAGE_CULTURE_KNOWN_BAD_COPY,
  evaluateClubThrottleCollectionCopy,
  evaluateCustomerFacingLanguageGate,
  evaluateInfinityRelationshipPlacementGate,
  evaluateInternalLanguageLeakGate,
  evaluateProductFactEvidenceGate,
  evaluateProductSizeDataGate,
  evaluateShippingReturnsCompletenessGate,
  evaluateStorefrontContentQualityGate,
} from "../gates";
import { auditClubThrottlePublicRoutes, knownBadStorefrontFixtures } from "../audit";

describe("venture brand system and storefront quality", () => {
  it("populates Club Throttle brand truth, vision, environment, and territories", () => {
    expect(CLUB_THROTTLE_BRAND_PROFILE.truth.brand_name).toBe("Club Throttle");
    expect(CLUB_THROTTLE_BRAND_PROFILE.generate_replacement_logo).toBe(false);
    expect(CLUB_THROTTLE_BRAND_PROFILE.vision.desired_customer_feeling.length).toBeGreaterThan(10);
    expect(CLUB_THROTTLE_BRAND_PROFILE.environment.places.length).toBeGreaterThan(2);
    expect(CLUB_THROTTLE_BRAND_PROFILE.territories.map((row) => row.id)).toContain("THROTTLE_CORE");
    expect(RIDE_PAST_MIDNIGHT_CREATIVE_STATUS.status).toBe("TECHNICAL_ONLY");
    expect(RIDE_PAST_MIDNIGHT_CREATIVE_STATUS.brand_creative_pass).toBe(false);
  });

  it("fails known-bad thin and internal pages", () => {
    const bad = knownBadStorefrontFixtures();
    expect(evaluateStorefrontContentQualityGate({
      purpose: "collections",
      copy: bad.collections.copy,
      module_count: 1,
      image_count: 0,
      answers_customer_questions: false,
      placeholder: true,
    }).result).toBe("FAIL");
    expect(evaluateInternalLanguageLeakGate(bad.contact.copy).result).toBe("FAIL");
    expect(evaluateCustomerFacingLanguageGate(bad.about.copy).result).toBe("FAIL");
    expect(evaluateCustomerFacingLanguageGate(CLUB_THROTTLE_GARAGE_CULTURE_KNOWN_BAD_COPY).result).toBe("FAIL");
    expect(evaluateClubThrottleCollectionCopy(CLUB_THROTTLE_GARAGE_CULTURE_KNOWN_BAD_COPY).result).toBe("FAIL");
    expect(evaluateInfinityRelationshipPlacementGate({
      header: bad.header_relationship.copy,
      hero: "",
      footer: "Privacy",
    }).result).toBe("FAIL");
  });

  it("passes corrected representative Club Throttle pages", () => {
    const composed = composeClubThrottleStorefrontFiles();
    const home = composed.files.find((file) => file.path === "app/page.tsx")?.content ?? "";
    const header = composed.files.find((file) => file.path === "app/components/header.tsx")?.content ?? "";
    const footer = composed.files.find((file) => file.path === "app/components/footer.tsx")?.content ?? "";
    const about = composed.files.find((file) => file.path === "app/about/page.tsx")?.content ?? "";
    const collections = composed.files.find((file) => file.path === "app/collections/page.tsx")?.content ?? "";
    const pdp = composed.files.find((file) => file.path === "app/products/club-throttle-core-tee/page.tsx")?.content ?? "";
    expect(evaluateInfinityRelationshipPlacementGate({ header, hero: home, footer }).result).toBe("PASS");
    expect(evaluateInternalLanguageLeakGate(about).result).toBe("PASS");
    expect(evaluateInternalLanguageLeakGate(collections).result).toBe("PASS");
    const garage = CLUB_THROTTLE_COLLECTIONS.find((row) => row.slug === "garage-culture")!;
    expect(evaluateClubThrottleCollectionCopy(`${garage.blurb} ${garage.story}`).result).toBe("PASS");
    expect(composed.files.some((file) => file.content.includes("earn this shelf"))).toBe(false);
    expect(home).toContain("hero-night.svg");
    expect(pdp).toContain("Size guide");
    expect(evaluateProductSizeDataGate({ sizes: [...CLUB_THROTTLE_SIZE_CHART] }).result).toBe("PASS");
    expect(evaluateProductFactEvidenceGate({
      facts: { materials: CLUB_THROTTLE_CORE_TEE.garment.materials, weight: CLUB_THROTTLE_CORE_TEE.garment.fabric_weight },
      sources: { materials: CLUB_THROTTLE_CORE_TEE.garment.sources.materials, weight: CLUB_THROTTLE_CORE_TEE.garment.sources.fabric_weight },
    }).result).toBe("PASS");
    expect(evaluateShippingReturnsCompletenessGate({
      shipping: CLUB_THROTTLE_CORE_TEE.shipping,
      returns: CLUB_THROTTLE_CORE_TEE.returns,
      invented_promise: false,
    }).result).toBe("PASS");
    expect(evaluateBrandCreativeFitGate({
      brand: CLUB_THROTTLE_BRAND_PROFILE,
      territory_id: "THROTTLE_CORE",
      generic_pod: false,
      uses_foreign_venture: false,
    }).result).toBe("PASS");
    expect(evaluateBrandCreativeFitGate({
      brand: CLUB_THROTTLE_BRAND_PROFILE,
      territory_id: "THROTTLE_CORE",
      generic_pod: false,
      uses_foreign_venture: false,
      technical_only: true,
    }).result).toBe("FAIL");
    expect(evaluateCrossVentureBrandIsolationGate({
      venture_id: "club-throttle",
      copy: about,
      foreign_marks: ["OccupancyNPV", "Harley-Davidson"],
    }).result).toBe("PASS");
    const audit = auditClubThrottlePublicRoutes();
    expect(audit.thin).toBe(0);
    expect(audit.placeholder).toBe(0);
    expect(audit.infinity_top).toBe(0);
  });
});
