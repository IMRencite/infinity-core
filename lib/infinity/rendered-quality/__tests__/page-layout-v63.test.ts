import { describe, expect, it } from "vitest";
import {
  COMMERCE_LAYOUT_KNOWN_GOOD,
  FOUNDER_CT_SHOP_KNOWN_BAD_LAYOUT,
  evaluatePageLayoutContract,
} from "../page-layout-contract";
import { commerceLayoutCssUsesCenteredContainer } from "../commerce-layout-css";
import { composeClubThrottleStorefrontFiles } from "@/lib/infinity/commerce/club-throttle-storefront-compose";
import { evaluateCarouselCardGeometry, OCCUPANCY_CAROUSEL_KNOWN_GOOD, OCCUPANCY_CRUSHED_CAROUSEL_KNOWN_BAD } from "@/lib/infinity/organic-growth-engine/continuous/carousel-geometry";
import { evaluateClubThrottleJournalQuality, CLUB_THROTTLE_JOURNAL_POSTS, clubThrottleJournalIndexHtml } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-journal";
import { evaluateCommercialCreativeQC, CLUB_THROTTLE_LIVE_GEOMETRY_FIXTURES } from "@/lib/infinity/commerce/creative-media/commercial-creative-qc";
import { clubThrottleLaunchCapsule } from "@/lib/infinity/commerce/club-throttle-launch-capsule";
import { classifyGelatoBindReadiness } from "@/lib/infinity/commercialization/providers/gelato/bind-pipeline";
import { assembleClubThrottleOperatingBundle } from "@/lib/infinity/autonomous-venture-operations/assemble";

describe("global rendered layout and Club Throttle launch", () => {
  it("fails the founder Shop whitespace fixture and passes the known-good", () => {
    expect(evaluatePageLayoutContract(FOUNDER_CT_SHOP_KNOWN_BAD_LAYOUT).result).toBe("FAIL");
    expect(evaluatePageLayoutContract(COMMERCE_LAYOUT_KNOWN_GOOD).result).toBe("PASS");
  });

  it("centers the composed commerce container and uses a growing grid", () => {
    const css = composeClubThrottleStorefrontFiles().files.find((file) => file.path === "app/globals.css")?.content ?? "";
    expect(commerceLayoutCssUsesCenteredContainer(css) || /margin-inline:auto/.test(css.replace(/\s+/g, ""))).toBe(true);
    expect(css).toMatch(/auto-fit/);
    expect(css).not.toMatch(/minmax\(220px,18rem\)/);
    const shop = composeClubThrottleStorefrontFiles().files.find((file) => file.path === "app/shop/page.tsx")?.content ?? "";
    expect(shop).not.toMatch(/products ready to review/i);
    expect(shop).toMatch(/launching soon/i);
  });

  it("fails crushed carousel geometry and keeps Occupancy known-good aligned", () => {
    expect(evaluateCarouselCardGeometry(OCCUPANCY_CRUSHED_CAROUSEL_KNOWN_BAD).result).toBe("FAIL");
    expect(evaluateCarouselCardGeometry(OCCUPANCY_CAROUSEL_KNOWN_GOOD).result).toBe("PASS");
    expect(assembleClubThrottleOperatingBundle().organic.live_production_verification_required).toBe(true);
  });

  it("provisions a Journal surface with six articles and bootstrap carousel", () => {
    const journal = evaluateClubThrottleJournalQuality();
    expect(CLUB_THROTTLE_JOURNAL_POSTS).toHaveLength(6);
    const html = clubThrottleJournalIndexHtml();
    expect(html).toContain("All articles");
    expect(html).toContain("Featured Blogs");
    expect(html).toContain("Featured Reads");
    expect(html).not.toContain("Latest Blogs");
    expect(composeClubThrottleStorefrontFiles().files.some((file) => file.path === "app/journal/page.tsx")).toBe(true);
    expect(journal.articles).toBe(6);
    expect(journal.result).toBe("PASS");
  });

  it("keeps live geometry as a commercial fail and capsule products planned", () => {
    for (const fixture of CLUB_THROTTLE_LIVE_GEOMETRY_FIXTURES) {
      expect(evaluateCommercialCreativeQC({ ...fixture, finished_merchandise: true, placement: "UNKNOWN" }).result).toBe("FAIL");
    }
    const capsule = clubThrottleLaunchCapsule();
    expect(capsule).toHaveLength(6);
    expect(capsule.every((row) => row.provider_product_id === null && row.state === "PLANNED")).toBe(true);
    expect(classifyGelatoBindReadiness({}).store_id).toBe("PENDING_FOUNDER");
    expect(assembleClubThrottleOperatingBundle().organic.empty_blog_can_launch).toBe(false);
  });
});
