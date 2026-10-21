import {
  buildOperatingVentureInventory,
  buildVentureOperatingPlanV1,
  type OperatingVentureInventoryRow,
} from "./autonomous-portfolio-operations-v1";
import { analyzeVentureAuthorityExpansionV1 } from "./venture-authority-expansion-engine-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import {
  pickOccupancyNpvAutonomousBacklogCandidate,
  rankClubThrottleAutonomousContentRefreshRows,
  rankOccupancyNpvAutonomousPublishRows,
} from "./portfolio-operating-backlog-publish-v1";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { summarizeClubThrottleEditorialBacklog } from "./durable/club-throttle-editorial-backlog-v1";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { resolveLiveVentureContentContinuityV1 } from "./live-venture-content-continuity-v1";

export const VENTURE_NEXT_BEST_GROWTH_ACTION_ENGINE_V1 = "VENTURE_NEXT_BEST_GROWTH_ACTION_ENGINE_V1" as const;

export type VentureNextBestGrowthAction = {
  venture_id: string;
  venture_name: string;
  next_best_growth_action: string;
  selected_work_type: string;
  selection_reason: string;
  expected_strategic_value: string;
  opportunities_researched: number;
};

export function resolveOnpvNextBestGrowthActionV1(
  input?: { daily_blog_target_met?: boolean; blogs_published_today?: number },
  backlog = listOccupancyClubThrottleBacklogArticles(),
): VentureNextBestGrowthAction {
  return resolveOnpvAction(backlog, input);
}

function resolveOnpvAction(
  backlog = listOccupancyClubThrottleBacklogArticles(),
  input?: { daily_blog_target_met?: boolean; blogs_published_today?: number },
): VentureNextBestGrowthAction {
  const ranked = rankOccupancyNpvAutonomousPublishRows(backlog);
  const pick = pickOccupancyNpvAutonomousBacklogCandidate(backlog);
  const authority = analyzeVentureAuthorityExpansionV1({ venture_id: CRE_VENTURE_ID });
  const blogFloorMet = input?.daily_blog_target_met ?? (input?.blogs_published_today ?? 0) >= 1;
  if (!blogFloorMet && ranked.length > 0 && pick) {
    return {
      venture_id: CRE_VENTURE_ID,
      venture_name: "OccupancyNPV",
      next_best_growth_action: `Publish ${pick.title}`,
      selected_work_type:
        pick.slug.includes("compare") ||
        pick.slug.includes("expense-stop") ||
        pick.slug.includes("free-rent") ||
        pick.slug.includes("gross-lease-vs-net")
          ? "DECISION_SUPPORT_PAGE"
          : "EVERGREEN_GUIDE",
      selection_reason: "Daily blog floor unmet; publish outranks maintenance",
      expected_strategic_value: "CRE authority + conversion path to compare tools",
      opportunities_researched: authority.gaps_identified.length + ranked.length,
    };
  }
  if (pick) {
    return {
      venture_id: CRE_VENTURE_ID,
      venture_name: "OccupancyNPV",
      next_best_growth_action: `Publish ${pick.title}`,
      selected_work_type:
        pick.slug.includes("compare") ||
        pick.slug.includes("expense-stop") ||
        pick.slug.includes("free-rent") ||
        pick.slug.includes("gross-lease-vs-net")
          ? "DECISION_SUPPORT_PAGE"
          : "EVERGREEN_GUIDE",
      selection_reason: "Unpublished backlog asset passes autonomous publish gates",
      expected_strategic_value: "CRE authority + conversion path to compare tools",
      opportunities_researched: authority.gaps_identified.length + ranked.length,
    };
  }
  if (!blogFloorMet && ranked.length > 0) {
    return {
      venture_id: CRE_VENTURE_ID,
      venture_name: "OccupancyNPV",
      next_best_growth_action: `Publish ${ranked[0]!.article.title}`,
      selected_work_type: "EVERGREEN_GUIDE",
      selection_reason: "Daily blog floor unmet; gate-qualified publish candidate available",
      expected_strategic_value: "CRE authority before maintenance displacement",
      opportunities_researched: authority.gaps_identified.length + ranked.length,
    };
  }
  return {
    venture_id: CRE_VENTURE_ID,
    venture_name: "OccupancyNPV",
    next_best_growth_action: authority.top_gap?.recommended_action ?? "Maintain lease authority cluster",
    selected_work_type:
      blogFloorMet || ranked.length === 0
        ? (authority.top_gap?.work_type ?? "INTERNAL_LINK_UPDATE")
        : "EVERGREEN_GUIDE",
    selection_reason: authority.top_gap?.reason ?? "No unpublished publish candidate; cluster maintenance",
    expected_strategic_value: "Strengthen internal linking and conversion without duplicate publish",
    opportunities_researched: authority.gaps_identified.length,
  };
}

function resolveClubThrottleAction(): VentureNextBestGrowthAction {
  const editorial = summarizeClubThrottleEditorialBacklog();
  const products = rankClubThrottleProductOpportunities();
  const authority = analyzeVentureAuthorityExpansionV1({ venture_id: CLUB_THROTTLE_VENTURE_ID });
  if (editorial.CT_EDITORIAL_PUBLISH_ELIGIBLE_COUNT > 0) {
    return {
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      venture_name: "Club Throttle",
      next_best_growth_action: "Publish ranked rider-first journal or evergreen guide",
      selected_work_type: editorial.CT_EDITORIAL_HOLD_COUNT > 0 ? "JOURNAL_POST" : "EVERGREEN_RIDING_GUIDE",
      selection_reason: `${editorial.CT_EDITORIAL_PUBLISH_ELIGIBLE_COUNT} eligible editorial assets in backlog`,
      expected_strategic_value: "Rider-native authority + collection discovery",
      opportunities_researched: editorial.CT_EDITORIAL_BACKLOG_COUNT + authority.gaps_identified.length,
    };
  }
  const refresh = rankClubThrottleAutonomousContentRefreshRows(listOccupancyClubThrottleBacklogArticles());
  if (refresh[0]) {
    return {
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      venture_name: "Club Throttle",
      next_best_growth_action: `Deploy editorial refresh for ${refresh[0].article.slug}`,
      selected_work_type: "CONTENT_REFRESH",
      selection_reason: "Repaired held editorial passes gates; durable VENTURE_DEPLOY refresh",
      expected_strategic_value: "Restore human-first editorial quality on live journal URLs",
      opportunities_researched: editorial.CT_EDITORIAL_BACKLOG_COUNT + authority.gaps_identified.length,
    };
  }
  if (products[0]) {
    return {
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      venture_name: "Club Throttle",
      next_best_growth_action: `Advance product concept ${products[0].concept_id}`,
      selected_work_type: "PRODUCT_CONCEPT",
      selection_reason: products[0].differentiation_note,
      expected_strategic_value: "Original merch pipeline without competitor art copy",
      opportunities_researched: products.length,
    };
  }
  return {
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    venture_name: "Club Throttle",
    next_best_growth_action: authority.top_gap?.recommended_action ?? "Maintain STABLE_LOCKED commerce; grow editorial",
    selected_work_type: "CONTENT_REFRESH",
    selection_reason: "No immediate publish-eligible editorial row",
    expected_strategic_value: "Preserve operating stability",
    opportunities_researched: authority.gaps_identified.length,
  };
}

function resolveGenericAction(row: OperatingVentureInventoryRow): VentureNextBestGrowthAction {
  const plan = buildVentureOperatingPlanV1(row);
  const authority = analyzeVentureAuthorityExpansionV1({ venture_id: row.venture_id });
  return {
    venture_id: row.venture_id,
    venture_name: row.venture_name,
    next_best_growth_action: plan.next_best_content_opportunities[0] ?? authority.top_gap?.recommended_action ?? "Reconcile venture record",
    selected_work_type: authority.top_gap?.work_type ?? "SEO_AUTHORITY_ACTION",
    selection_reason: plan.strategic_goal,
    expected_strategic_value: "Governed growth when launch criteria met",
    opportunities_researched: authority.gaps_identified.length,
  };
}

export function buildVentureNextBestGrowthActionsV1(): VentureNextBestGrowthAction[] {
  const live = buildOperatingVentureInventory().filter((r) => r.state === "LIVE_OPERATING");
  return live.map((row) => {
    if (row.venture_id === CRE_VENTURE_ID || row.venture_id === "occupancynpv") {
      const continuity = resolveLiveVentureContentContinuityV1({ venture_id: CRE_VENTURE_ID });
      return resolveOnpvAction(undefined, {
        daily_blog_target_met: continuity.daily_blog_target_met,
        blogs_published_today: continuity.blogs_published_today,
      });
    }
    if (row.venture_id === CLUB_THROTTLE_VENTURE_ID) return resolveClubThrottleAction();
    return resolveGenericAction(row);
  });
}

export function ventureNextBestGrowthActionQc(actions: VentureNextBestGrowthAction[]): "PASS" | "FAIL" {
  const live = buildOperatingVentureInventory().filter((r) => r.state === "LIVE_OPERATING");
  if (actions.length < live.length) return "FAIL";
  return actions.every((a) => a.next_best_growth_action.length > 0 && a.selected_work_type.length > 0) ? "PASS" : "FAIL";
}
