import { describe, expect, it } from "vitest";
import { composeOccupancyNpvOrganicLiveFiles } from "../occupancynpv-publisher";
import { evaluateBlogMediaDeployArtifactQc, materializeAuthorizedBlogMediaDeployFiles } from "../blog-deploy-media-bundle";
import {
  evaluateBlogCanonicalMediaFallbackQc,
  evaluateBlogProductionMediaDeliveryQc,
} from "../blog-production-media-delivery-qc";
import { occupancynpvCategoryCounts, occupancynpvPublishedBlogPosts } from "../occupancynpv-blog-catalog";
import { CLUB_THROTTLE_JOURNAL_POSTS } from "../club-throttle-journal";
import { isPlaceholderBlogMediaSrc } from "../blog-article-media-registry";
import { composeClubThrottleStorefrontFiles } from "@/lib/infinity/commerce/club-throttle-storefront-compose";

describe("Portfolio blog media regression", () => {
  it("materializes occ-v2 and journal hero rasters for deploy", () => {
    const files = materializeAuthorizedBlogMediaDeployFiles();
    expect(files.some((f) => f.path === "public/media/blog/occ-v2-cap-rate-valuation.webp")).toBe(true);
    expect(files.some((f) => f.path === "public/visual/journal-hero-night-ride.webp")).toBe(true);
  });

  it("ONPV compose bundle includes canonical blog media artifact paths", () => {
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const artifact = evaluateBlogMediaDeployArtifactQc({ deploy_files: composed.files });
    expect(artifact.result).toBe("PASS");
  });

  it("CT journal posts resolve canonical webp heroes from registry", () => {
    const afterDark = CLUB_THROTTLE_JOURNAL_POSTS.find((p) => p.slug === "how-to-ride-after-dark");
    expect(afterDark?.image).toBe("/visual/journal-hero-night-ride.webp");
    expect(isPlaceholderBlogMediaSrc(afterDark?.image ?? "")).toBe(false);
  });

  it("dedupes sidebar categories when slug matches but label casing differs", () => {
    const counts = occupancynpvCategoryCounts(occupancynpvPublishedBlogPosts());
    const valuationRows = counts.filter((row) => row.category.toLowerCase().includes("valuation"));
    expect(valuationRows).toHaveLength(1);
  });

  it("flags canonical-vs-fallback mismatch", () => {
    const qc = evaluateBlogCanonicalMediaFallbackQc({
      article_path: "/journal/night-riding/how-to-ride-after-dark/",
      rendered_src: "/visual/journal-night-ride.svg",
    });
    expect(qc.result).toBe("FAIL");
    expect(qc.reasons).toContain("canonical_expected_fallback_rendered");
  });

  it("CT storefront compose includes journal hero webp artifacts", () => {
    const composed = composeClubThrottleStorefrontFiles(process.cwd());
    const artifact = evaluateBlogMediaDeployArtifactQc({ deploy_files: composed.files });
    expect(artifact.result).toBe("PASS");
  });

  it("production media delivery QC fails on non-image HTTP", () => {
    const gate = evaluateBlogProductionMediaDeliveryQc({
      article_path: "/blog/valuation/how-is-cap-rate-calculated-for-a-building/",
      origin: "https://occupancynpv.com",
      probe: { url: "https://occupancynpv.com/media/blog/occ-v2-cap-rate-valuation.webp", http_status: 404, content_type: "text/html", content_length: 100 },
      rendered_src: "/media/blog/occ-v2-cap-rate-valuation.webp",
    });
    expect(gate.result).toBe("FAIL");
  });
});
