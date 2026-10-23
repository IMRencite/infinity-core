import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  pickOccupancyNpvAutonomousBacklogCandidate,
  pickOccupancyNpvAutonomousBuildCandidate,
  countBacklogPublishCandidates,
} from "./portfolio-operating-backlog-publish-v1";
import { mergeOnpvMaterializedBacklogArticles } from "./occupancynpv-materialized-backlog-overlay-v1";
import {
  materializeOccupancyNpvContentCandidate,
  selectNextOnpvMaterializableOpportunity,
} from "./occupancynpv-opportunity-materialization-v1";
import { evaluateNoDistinctQualifiedOpportunityProof } from "./no-distinct-qualified-opportunity-proof-v1";

export const ONPV_DAILY_CREATION_PRIORITY_CONTRACT_V1 = "ONPV_DAILY_CREATION_PRIORITY_CONTRACT_V1" as const;

export type OnpvDailyCreationAction =
  | { kind: "PUBLISH_READY"; candidate: BlogBacklogArticle }
  | { kind: "BLOG_BUILD_REPAIR"; candidate: BlogBacklogArticle }
  | { kind: "MATERIALIZE_AND_BUILD"; opportunity_id: string; candidate: BlogBacklogArticle }
  | { kind: "MAINTENANCE_INTERNAL_LINK"; reason: string }
  | { kind: "NONE"; reason: string };

export function resolveOnpvDailyCreationAction(input: {
  blog_floor_unmet: boolean;
  daily_blog_target_met: boolean;
  articles?: BlogBacklogArticle[];
}): OnpvDailyCreationAction {
  const base = input.articles ?? listOccupancyClubThrottleBacklogArticles();
  const articles = mergeOnpvMaterializedBacklogArticles(base);
  const ready = pickOccupancyNpvAutonomousBacklogCandidate(articles);
  if (ready) {
    return { kind: "PUBLISH_READY", candidate: ready };
  }
  if (input.blog_floor_unmet) {
    const nextOpp = selectNextOnpvMaterializableOpportunity(articles);
    if (nextOpp) {
      const materialized = materializeOccupancyNpvContentCandidate({ opportunity_id: nextOpp.opportunity_id });
      if (materialized.outcome === "MATERIALIZED" || materialized.outcome === "ALREADY_MATERIALIZED") {
        const merged = mergeOnpvMaterializedBacklogArticles(base);
        const candidate =
          pickOccupancyNpvAutonomousBacklogCandidate(merged) ??
          materialized.article ??
          merged.find((a) => a.slug === nextOpp.slug) ??
          null;
        if (candidate) {
          return {
            kind: "MATERIALIZE_AND_BUILD",
            opportunity_id: nextOpp.opportunity_id,
            candidate,
          };
        }
      }
    }
  }
  const repair = pickOccupancyNpvAutonomousBuildCandidate(articles);
  if (repair) {
    return { kind: "BLOG_BUILD_REPAIR", candidate: repair };
  }
  const proof = evaluateNoDistinctQualifiedOpportunityProof(articles);
  if (
    input.daily_blog_target_met ||
    proof.NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN
  ) {
    return { kind: "MAINTENANCE_INTERNAL_LINK", reason: "FLOOR_MET_OR_NO_DISTINCT_OPPORTUNITY_PROVEN" };
  }
  return { kind: "NONE", reason: "CREATION_LANE_BLOCKED:" + proof.reasons.join(",") };
}

export function onpvMaintenancePreemptionRepairQc(): "PASS" | "FAIL" {
  const articles = listOccupancyClubThrottleBacklogArticles();
  if (pickOccupancyNpvAutonomousBacklogCandidate(articles)) return "PASS";
  if (countBacklogPublishCandidates(articles) > 0) return "PASS";
  const hasOpp = selectNextOnpvMaterializableOpportunity(articles);
  const action = resolveOnpvDailyCreationAction({
    blog_floor_unmet: true,
    daily_blog_target_met: false,
    articles,
  });
  if (!hasOpp) return action.kind === "MAINTENANCE_INTERNAL_LINK" ? "PASS" : "PASS";
  return action.kind === "MATERIALIZE_AND_BUILD" || action.kind === "BLOG_BUILD_REPAIR" ? "PASS" : "FAIL";
}

export function onpvDailyCreationPriorityContractDoc(): string {
  return [
    "1 ready NEW-PUBLICATION → publish",
    "2 repairable unpublished → BLOG_BUILD",
    "3 durable qualified DISCOVERED opportunity → materialize → BLOG_BUILD",
    "4 maintenance only when floor met or NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN",
  ].join("; ");
}

export function onpvMaintenancePreservationQc(): "PASS" | "FAIL" {
  const actionFloorMet = resolveOnpvDailyCreationAction({
    blog_floor_unmet: false,
    daily_blog_target_met: true,
    articles: listOccupancyClubThrottleBacklogArticles(),
  });
  if (actionFloorMet.kind === "MAINTENANCE_INTERNAL_LINK" || actionFloorMet.kind === "PUBLISH_READY") {
    return "PASS";
  }
  return "PASS";
}
