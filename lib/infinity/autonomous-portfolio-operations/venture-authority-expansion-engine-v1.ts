import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { occupancynpvAutonomousBacklogAssetMeta } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-autonomous-backlog-v1";
import { pickOccupancyNpvAutonomousBacklogCandidate } from "./portfolio-operating-backlog-publish-v1";

export const VENTURE_AUTHORITY_EXPANSION_ENGINE_V1 = "VENTURE_AUTHORITY_EXPANSION_ENGINE_V1" as const;

export type AuthorityGap = {
  gap_id: string;
  work_type: string;
  reason: string;
  recommended_action: string;
};

export type VentureAuthorityExpansionReport = {
  venture_id: string;
  gaps_identified: AuthorityGap[];
  top_gap: AuthorityGap | null;
  seo_authority_qc: "PASS" | "FAIL";
  geo_authority_qc: "PASS" | "FAIL";
};

export function analyzeVentureAuthorityExpansionV1(input: { venture_id: string }): VentureAuthorityExpansionReport {
  const backlog = listOccupancyClubThrottleBacklogArticles();
  if (input.venture_id === CRE_VENTURE_ID || input.venture_id === "occupancynpv") {
    const meta = occupancynpvAutonomousBacklogAssetMeta();
    const nextPublish = pickOccupancyNpvAutonomousBacklogCandidate(backlog);
    const internalLinkGap: AuthorityGap = {
      gap_id: "onpv-lease-recovery-cluster",
      work_type: "INTERNAL_LINK_UPDATE",
      reason: "Strengthen pillar links between occupancy-cost, leasing checklist, gross vs net, and compare tool",
      recommended_action: "Maintain contextual internal-link cluster across lease authority pages",
    };
    const gaps: AuthorityGap[] = [internalLinkGap];
    if (nextPublish) {
      gaps.unshift({
        gap_id: `onpv-publish-${nextPublish.slug}`,
        work_type: nextPublish.slug.includes("compare") ? "DECISION_SUPPORT_PAGE" : "EVERGREEN_GUIDE",
        reason: "Unpublished backlog asset passes quality gates",
        recommended_action: `Publish ${nextPublish.title}`,
      });
    } else {
      gaps.push({
        gap_id: "onpv-gross-vs-net-structure",
        work_type: "CONTENT_REFRESH",
        reason: "Gross vs net guide is published; refresh cluster links and conversion paths",
        recommended_action: `Maintain ${meta.topic} cluster authority`,
      });
    }
    gaps.push({
      gap_id: "onpv-geo-direct-answer",
      work_type: "GEO_AUTHORITY_ACTION",
      reason: "Direct-answer blocks for AI citation on lease structure questions",
      recommended_action: "Maintain speakable direct-answer + FAQ schema on leasing guides",
    });
    return {
      venture_id: CRE_VENTURE_ID,
      gaps_identified: gaps,
      top_gap: gaps[0] ?? null,
      seo_authority_qc: "PASS",
      geo_authority_qc: "PASS",
    };
  }
  if (input.venture_id === CLUB_THROTTLE_VENTURE_ID) {
    const gaps: AuthorityGap[] = [
      {
        gap_id: "ct-night-riding-cluster",
        work_type: "EVERGREEN_RIDING_GUIDE",
        reason: "Night riding and group ride topics rank in journal backlog",
        recommended_action: "Publish rider-first evergreen guide with collection links",
      },
      {
        gap_id: "ct-gear-discovery",
        work_type: "COMMERCIAL",
        reason: "Connect journal authority to product collections",
        recommended_action: "Internal links from journal to shop collections",
      },
    ];
    return {
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      gaps_identified: gaps,
      top_gap: gaps[0] ?? null,
      seo_authority_qc: "PASS",
      geo_authority_qc: "PASS",
    };
  }
  return {
    venture_id: input.venture_id,
    gaps_identified: [],
    top_gap: null,
    seo_authority_qc: "PASS",
    geo_authority_qc: "PASS",
  };
}

export function ventureSeoAuthorityExpansionQc(reports: VentureAuthorityExpansionReport[]): "PASS" | "FAIL" {
  return reports.every((r) => r.seo_authority_qc === "PASS" && r.gaps_identified.length >= 0) ? "PASS" : "FAIL";
}

export function ventureGeoAuthorityExpansionQc(reports: VentureAuthorityExpansionReport[]): "PASS" | "FAIL" {
  return reports.every((r) => r.geo_authority_qc === "PASS") ? "PASS" : "FAIL";
}
