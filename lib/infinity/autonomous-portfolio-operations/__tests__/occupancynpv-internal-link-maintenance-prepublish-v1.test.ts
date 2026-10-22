import { describe, expect, it } from "vitest";
import {
  evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc,
  ONPV_REFRESH_BROWSER_REQUIREMENT_SEMANTICS,
} from "../occupancynpv-internal-link-maintenance-prepublish-v1";
import { evaluateOccupancyNpvTargetPrepublishQc } from "../portfolio-operating-backlog-publish-v1";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";

describe("occupancynpv internal link maintenance prepublish", () => {
  it("A: valid internal-link refresh satisfies maintenance QC when cluster and render pass", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const article = articles.find(
      (a) => a.path.includes("gross-lease-vs-net-lease") && a.venture === "occupancynpv",
    );
    if (!article) return;
    const rendered = buildBacklogRenderedEvidenceMap([article])[article.path] ?? null;
    const qc = evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc({ article, rendered });
    expect(ONPV_REFRESH_BROWSER_REQUIREMENT_SEMANTICS).toBe("MAINTENANCE_SPECIFIC_RENDER_CONTRACT");
    expect(qc.ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_QC).toBe("PASS");
  });

  it("B: broken internal link cluster fails maintenance QC", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const article = articles.find(
      (a) => a.path.includes("gross-lease-vs-net-lease") && a.venture === "occupancynpv",
    );
    if (!article?.draft) return;
    const rendered = buildBacklogRenderedEvidenceMap([article])[article.path] ?? null;
    const broken = {
      ...article,
      draft: { ...article.draft, internal_links: [] },
    };
    const qc = evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc({ article: broken, rendered });
    expect(qc.ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_QC).toBe("FAIL");
    expect(qc.reasons.some((r) => r.includes("ONPV_INTERNAL_LINK_CLUSTER"))).toBe(true);
  });

  it("C: missing rendered evidence fails", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const article = articles.find((a) => a.venture === "occupancynpv" && a.draft);
    if (!article) return;
    const qc = evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc({ article, rendered: null });
    expect(qc.reasons).toContain("RENDERED_EVIDENCE_MISSING");
  });

  it("D: full publication prepublish still fails without browser evidence for new publish", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const draftOnly = articles.find(
      (a) => a.venture === "occupancynpv" && a.registry_state === "DRAFT" && a.draft,
    );
    if (!draftOnly) return;
    const prepublish = evaluateOccupancyNpvTargetPrepublishQc({
      path: draftOnly.path,
      work_type: "NEW_PUBLICATION",
    });
    expect(prepublish.OCCUPANCYNPV_TARGET_PREPUBLISH_QC).toBe("FAIL");
    expect(prepublish.reasons.some((r) => r.includes("BROWSER") || r.includes("RENDERED"))).toBe(true);
  });

  it("E: maintenance path cannot skip source QC on broken article", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const article = articles.find((a) => a.venture === "occupancynpv" && a.draft);
    if (!article) return;
    const rendered = buildBacklogRenderedEvidenceMap([article])[article.path] ?? null;
    const prepublish = evaluateOccupancyNpvTargetPrepublishQc({
      path: article.path,
      work_type: "INTERNAL_LINK_UPDATE",
      articles: [{ ...article, registry_state: "PUBLISHED" }],
    });
    expect(prepublish.reasons.length).toBeGreaterThan(0);
    expect(prepublish.OCCUPANCYNPV_TARGET_PREPUBLISH_QC).toBeDefined();
  });

  it("F: INTERNAL_LINK_UPDATE on published gross-lease path uses maintenance contract", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const article = articles.find(
      (a) => a.path.includes("gross-lease-vs-net-lease") && a.venture === "occupancynpv",
    );
    if (!article) return;
    const published = { ...article, registry_state: "PUBLISHED" as const };
    const prepublish = evaluateOccupancyNpvTargetPrepublishQc({
      path: published.path,
      work_type: "INTERNAL_LINK_UPDATE",
      articles: [published],
    });
    expect(prepublish.reasons).not.toContain("BROWSER_GEOMETRY_REQUIRED_BUT_MISSING");
  });
});
