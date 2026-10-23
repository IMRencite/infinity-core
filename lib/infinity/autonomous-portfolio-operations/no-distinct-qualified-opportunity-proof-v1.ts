import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  countBacklogPublishCandidates,
  pickOccupancyNpvAutonomousBuildCandidate,
  rankOccupancyNpvRepairableHeldRows,
} from "./portfolio-operating-backlog-publish-v1";
import { mergeOnpvMaterializedBacklogArticles } from "./occupancynpv-materialized-backlog-overlay-v1";
import { listOnpvCommittedDurableOpportunities } from "./occupancynpv-durable-opportunity-catalog-v1";
import { selectNextOnpvMaterializableOpportunity } from "./occupancynpv-opportunity-materialization-v1";

export const NO_DISTINCT_QUALIFIED_OPPORTUNITY_PROOF_V1 = "NO_DISTINCT_QUALIFIED_OPPORTUNITY_PROOF_V1" as const;

export type NoDistinctQualifiedOpportunityProof = {
  NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN: boolean;
  ready_publish_count: number;
  repairable_unpublished_count: number;
  materializable_opportunity_count: number;
  reasons: string[];
};

export function evaluateNoDistinctQualifiedOpportunityProof(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): NoDistinctQualifiedOpportunityProof {
  const merged = mergeOnpvMaterializedBacklogArticles(articles);
  const ready = countBacklogPublishCandidates(merged);
  const repairable = rankOccupancyNpvRepairableHeldRows(merged).length;
  const buildCandidate = pickOccupancyNpvAutonomousBuildCandidate(merged);
  const materializable = listOnpvCommittedDurableOpportunities().filter((o) => o.lifecycle === "DISCOVERED").length;
  const nextOpp = selectNextOnpvMaterializableOpportunity(merged);
  const reasons: string[] = [];
  if (ready > 0) reasons.push("READY_PUBLISH_CANDIDATES_REMAIN");
  if (repairable > 0 || buildCandidate) reasons.push("REPAIRABLE_UNPUBLISHED_REMAIN");
  if (nextOpp) reasons.push("MATERIALIZABLE_OPPORTUNITY_REMAIN");
  const proven = reasons.length === 0;
  return {
    NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN: proven,
    ready_publish_count: ready,
    repairable_unpublished_count: repairable + (buildCandidate ? 1 : 0),
    materializable_opportunity_count: nextOpp ? 1 : materializable,
    reasons,
  };
}

export function noDistinctOpportunityProofQc(
  articles?: BlogBacklogArticle[],
): "PASS" | "FAIL" {
  const proof = evaluateNoDistinctQualifiedOpportunityProof(articles);
  return proof.NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN ? "PASS" : "FAIL";
}
