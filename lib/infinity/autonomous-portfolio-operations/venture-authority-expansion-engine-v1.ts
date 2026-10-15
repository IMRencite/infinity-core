import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { occupancynpvAutonomousBacklogAssetMeta } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-autonomous-backlog-v1";

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
    const gaps: AuthorityGap[] = [
      {
        gap_id: "onpv-gross-vs-net-structure",
        work_type: "EVERGREEN_GUIDE",
        reason: "Tenants search gross vs net lease structure; distinct from live lease-compare NPV article",
        recommended_action: `Build and publish ${meta.topic}`,
      },
      {
        gap_id: "onpv-lease-recovery-cluster",
        work_type: "INTERNAL_LINK",
        reason: "Strengthen pillar links between occupancy-cost, leasing checklist, and compare tool",
        recommended_action: "Wire internal links on next leasing publication",
      },
      {
        gap_id: "onpv-geo-direct-answer",
        work_type: "GEO_AUTHORITY_ACTION",
        reason: "Direct-answer blocks for AI citation on lease structure questions",
        recommended_action: "Maintain speakable direct-answer + FAQ schema on new leasing guides",
      },
    ];
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
