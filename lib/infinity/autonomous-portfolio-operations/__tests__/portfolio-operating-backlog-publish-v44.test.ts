import { describe, expect, it } from "vitest";
import {
  evaluateOnpvInternalLinkClusterQc,
  pickClubThrottleAutonomousBacklogCandidate,
  rankClubThrottleAutonomousPublishRows,
  rankOccupancyNpvAutonomousPublishRows,
} from "../portfolio-operating-backlog-publish-v1";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";

describe("portfolio operating backlog publish hygiene", () => {
  it("excludes PUBLISHED rows from new-publication ranking", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const ranked = rankOccupancyNpvAutonomousPublishRows(articles);
    expect(ranked.some((row) => row.article.slug === "gross-lease-vs-net-lease-for-tenants")).toBe(false);
  });

  it("passes ONPV lease internal-link cluster QC", () => {
    const qc = evaluateOnpvInternalLinkClusterQc();
    expect(qc.ONPV_INTERNAL_LINK_CLUSTER_QC).toBe("PASS");
  });

  it("excludes verified live CT shirt from autonomous new-publication ranking", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const ranked = rankClubThrottleAutonomousPublishRows(articles);
    expect(ranked.some((row) => row.article.slug === "how-riders-choose-a-shirt")).toBe(false);
  });

  it("selects next repaired CT refresh candidate, not verified shirt or refreshed etiquette pages", () => {
    const pick = pickClubThrottleAutonomousBacklogCandidate();
    expect(pick?.slug).not.toBe("how-riders-choose-a-shirt");
    expect(pick?.slug).not.toBe("bike-night-etiquette");
    expect(pick?.slug).not.toBe("group-ride-etiquette");
    expect(pick?.slug).toBe("how-to-ride-after-dark");
  });

  it("ranks net-new ONPV free-rent before published lease cluster pages", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const ranked = rankOccupancyNpvAutonomousPublishRows(articles);
    expect(ranked[0]?.article.slug).toBe("how-free-rent-affects-occupancy-cost-for-tenants");
  });
});
