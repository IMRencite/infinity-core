import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { composeClubThrottleJournalFiles } from "../club-throttle-journal";
import { composeOccupancyNpvOrganicLiveFiles } from "../occupancynpv-publisher";
import { occupancynpvCamFirstYearPageSource } from "../occupancynpv-cam-first-year-page";
import { occupancynpvLiveCapRatePageSource } from "../occupancynpv-live-page";
import { occupancynpvLeaseInputsPageSource } from "../occupancynpv-lease-inputs-page";
import { occupancynpvExpansionDrafts, occupancynpvExpansionPageSource } from "../occupancynpv-blog-expansion";
import { occupancynpvBlogArticleSource } from "../occupancynpv-blog";
import { evaluateCustomerFacingLanguageGate } from "@/lib/infinity/venture-isolation/venture-isolation";

const BAD =
  /teaching sample|learning test|section-depth|after this page a reader should|for learning the method|learning check|page failed actionability/i;

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function visibleArticleText(source: string): string {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, " ")
    .replace(/export[\s\S]*?function[\s\S]*?\{/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ");
}

function assertRenderClean(label: string, source: string) {
  expect(source, `${label} empty`).toBeTruthy();
  const visible = visibleArticleText(source);
  expect(visible.match(BAD), `${label} rubric leak`).toBeNull();
  expect(evaluateCustomerFacingLanguageGate(visible).result, `${label} customer gate`).toBe("PASS");
}

describe("customer-visible content recovery (composed render)", () => {
  it("occupancy six customer routes render without rubric language", () => {
    const expansion = occupancynpvExpansionDrafts();
    const byCanonical = (part: string) => expansion.find((d) => d.canonical.includes(part))!;
    assertRenderClean("cap-rate-blog", occupancynpvExpansionPageSource(byCanonical("how-is-cap-rate-calculated")));
    assertRenderClean("interest-rates", occupancynpvBlogArticleSource());
    assertRenderClean("cam-first-year", occupancynpvCamFirstYearPageSource());
    assertRenderClean("compare-leases", occupancynpvExpansionPageSource(byCanonical("how-do-you-compare-two")));
    assertRenderClean("lease-inputs-hub", occupancynpvLeaseInputsPageSource());
    assertRenderClean("lease-inputs-blog", occupancynpvExpansionPageSource(byCanonical("what-numbers-do-you-need")));
    assertRenderClean("occupancy-vs-rent", occupancynpvExpansionPageSource(byCanonical("what-is-occupancy-cost")));
    assertRenderClean("cap-rate-hub", occupancynpvLiveCapRatePageSource());
  });

  it("club throttle six journal pages render without rubric language", () => {
    const slugs = [
      "how-riders-choose-a-shirt",
      "how-to-ride-after-dark",
      "bike-night-etiquette",
      "garage-culture-as-rider-social-life",
      "group-ride-etiquette",
      "streetwear-vs-riding-gear",
    ];
    const files = composeClubThrottleJournalFiles();
    for (const slug of slugs) {
      const file = files.find((row) => row.path.includes(slug));
      expect(file, slug).toBeTruthy();
      assertRenderClean(slug, file!.content);
    }
  });

  it("publisher bundle includes expansion blog routes", () => {
    const files = composeOccupancyNpvOrganicLiveFiles().files;
    expect(files.some((f) => f.path.includes("how-is-cap-rate-calculated-for-a-building"))).toBe(true);
    expect(files.some((f) => f.path.includes("what-is-occupancy-cost-versus-rent"))).toBe(true);
    const articlePaths = [
      "how-is-cap-rate-calculated-for-a-building",
      "how-interest-rates-affect-commercial-property-values",
      "cam-first-year",
      "how-do-you-compare-two-commercial-lease-options",
      "what-numbers-do-you-need-to-compare-two-commercial-leases",
      "what-is-occupancy-cost-versus-rent",
    ];
    const articleFiles = files.filter((f) => articlePaths.some((slug) => f.path.includes(slug)));
    expect(articleFiles.length).toBeGreaterThanOrEqual(6);
    for (const file of articleFiles) {
      assertRenderClean(file.path, file.content);
    }
  });

  it("records render identity hashes for traceability", () => {
    const cam = occupancynpvCamFirstYearPageSource();
    expect(hash(cam)).toMatch(/^[a-f0-9]{16}$/);
    expect(composeOccupancyNpvOrganicLiveFiles().files.length).toBeGreaterThan(20);
  });
});
