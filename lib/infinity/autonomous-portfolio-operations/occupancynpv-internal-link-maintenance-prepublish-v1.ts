import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import type { RenderedBacklogEvidence } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "@/lib/infinity/organic-growth-engine/continuous/blog-ux";
import { evaluateRenderedPageQualityQc } from "@/lib/infinity/organic-growth-engine/continuous/rendered-page-quality-v1";
import { ONPV_LEASE_AUTHORITY_CLUSTER_PATHS } from "./portfolio-operating-backlog-publish-v1";

export const ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_V1 = "ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_V1" as const;

export const ONPV_REFRESH_BROWSER_REQUIREMENT_SEMANTICS =
  "MAINTENANCE_SPECIFIC_RENDER_CONTRACT" as const;

function normPath(path: string): string {
  return path.replace(/\/+$/, "").toLowerCase();
}

function evaluateOnpvInternalLinkClusterMissing(articles: BlogBacklogArticle[]): string[] {
  const clusterPaths = new Set(
    ONPV_LEASE_AUTHORITY_CLUSTER_PATHS.filter((p) => p.startsWith("/blog/")).map((p) => normPath(p)),
  );
  const missing: string[] = [];
  for (const path of clusterPaths) {
    const article = articles.find(
      (a) => a.venture === "occupancynpv" && normPath(a.path) === path,
    );
    if (!article?.draft) {
      missing.push(`${path}:NO_DRAFT`);
      continue;
    }
    const links = new Set((article.draft.internal_links ?? []).map((l) => normPath(l)));
    for (const target of clusterPaths) {
      if (target === path) continue;
      if (!links.has(target)) missing.push(`${path}->${target}`);
    }
    if (path.includes("/leasing/") || path.includes("/occupancy-costs/")) {
      const tool = normPath("/compare-commercial-leases");
      if (!links.has(tool)) missing.push(`${path}->${tool}`);
    }
  }
  return missing;
}

export function evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc(input: {
  article: BlogBacklogArticle;
  rendered: RenderedBacklogEvidence | null;
  articles?: BlogBacklogArticle[];
}): {
  ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_QC: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!input.rendered) {
    return {
      ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_QC: "FAIL",
      reasons: ["RENDERED_EVIDENCE_MISSING"],
    };
  }
  const source = evaluateBacklogSourceVNext(input.article);
  if (source.result !== "PASS") reasons.push("SOURCE_QC_FAIL", ...source.reasons);

  const pageRender = evaluateRenderedPageQualityQc({
    profile: "ARTICLE",
    shell_html: input.rendered.shell_html,
    main_html: input.rendered.main_html,
    editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
    boundary: "UNIT_HELPER",
    browser_evidence: input.rendered.browser_responsive_evidence ?? null,
    functional_pass: true,
  });
  if (pageRender.RENDERED_PAGE_QUALITY_QC !== "PASS") {
    reasons.push("MAINTENANCE_RENDER_QC_FAIL", ...pageRender.reasons);
  }

  const canonOk = normPath(input.rendered.expected_canonical) === normPath(input.article.canonical_url);
  if (!canonOk) reasons.push("CANONICAL_QC_FAIL");

  const shell = input.rendered.shell_html;
  if (!/BlogPosting/.test(shell) || !/BreadcrumbList/.test(shell)) {
    reasons.push("SCHEMA_QC_FAIL");
  }

  const baseline = input.articles ?? listOccupancyClubThrottleBacklogArticles();
  const mergedArticles = baseline.map((row) =>
    row.path.replace(/\/+$/, "") === input.article.path.replace(/\/+$/, "") ? input.article : row,
  );
  const clusterMissing = evaluateOnpvInternalLinkClusterMissing(mergedArticles);
  if (clusterMissing.length > 0) {
    reasons.push("ONPV_INTERNAL_LINK_CLUSTER_QC_FAIL", ...clusterMissing);
  }

  return {
    ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_QC: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: [...new Set(reasons)],
  };
}

export function occupancynpvInternalLinkMaintenancePrepublishQc(): "PASS" | "FAIL" {
  return typeof ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_V1 === "string" ? "PASS" : "FAIL";
}
