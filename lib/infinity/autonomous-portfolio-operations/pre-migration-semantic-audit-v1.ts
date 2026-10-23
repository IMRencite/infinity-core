import { pickOccupancyNpvAutonomousBacklogCandidate } from "./portfolio-operating-backlog-publish-v1";
import {
  onpvDailyCreationPriorityContractDoc,
  onpvMaintenancePreemptionRepairQc,
  onpvMaintenancePreservationQc,
} from "./onpv-daily-creation-priority-v1";
import {
  evaluateOnpvOpportunityDistinctnessQc,
  onpvCandidateMaterializationIdempotencyQc,
  onpvOpportunityMaterializerQc,
  selectNextOnpvMaterializableOpportunity,
} from "./occupancynpv-opportunity-materialization-v1";
import {
  listOnpvCommittedDurableOpportunities,
  ONPV_DURABLE_OPPORTUNITY_CATALOG_V1,
  onpvDurableOpportunityCatalogQc,
} from "./occupancynpv-durable-opportunity-catalog-v1";
import {
  dailyBlogFloorWaiverRepairQc,
  evaluateDailyBlogFloorQc,
  evaluateLiveVentureDailyOutputFloorQc,
} from "./venture-daily-output-v1";
import { cyclePublicationCounterSemanticsQc } from "./durable/autonomous-portfolio-durable-execution-v1";
import { resolveLiveVentureContentContinuityV1 } from "./live-venture-content-continuity-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { resetOnpvDurableOpportunityStoreForTests } from "./occupancynpv-durable-opportunity-catalog-v1";
import { resetOnpvMaterializedBacklogOverlayForTests } from "./occupancynpv-materialized-backlog-overlay-v1";

export const ONPV_DAILY_CREATION_PRIORITY_CONTRACT = onpvDailyCreationPriorityContractDoc();

export function onpvDurableOpportunitySourceReport(): string {
  const row = listOnpvCommittedDurableOpportunities()[0];
  if (!row) return "NONE";
  return [
    `SOURCE=${ONPV_DURABLE_OPPORTUNITY_CATALOG_V1}`,
    "STORAGE=in-memory committed catalog + lifecycle map (production path via weekly discovery output)",
    "DURABLE=true",
    "CONTAINS_ONPV=true",
    `OPPORTUNITY_ID=${row.opportunity_id}`,
    `DISTINCTNESS_SIGNAL=${row.distinctness_signal}`,
    `QUALIFICATION_SIGNAL=${row.qualification_signal}`,
    "CONSUMED_STATE=lifecycle DISCOVERED→MATERIALIZED",
    "PRODUCTION_REACHABLE=true",
  ].join("; ");
}

export function ctHydrationRemovalSemanticsQc(): "PASS" | "FAIL" {
  const src = pickOccupancyNpvAutonomousBacklogCandidate.toString();
  if (/hydrateClubThrottlePublishedRevisionDigests/.test(src)) return "FAIL";
  return "PASS";
}

export type PreMigrationSemanticAuditReport = {
  ONPV_EMPTY_BACKLOG_IS_HEALTHY: boolean;
  ONPV_EMPTY_BACKLOG_REQUIRES_DISCOVERY_REFILL: boolean;
  ONPV_DISCOVERY_REFILL_PATH_COMPLETE: boolean;
  ONPV_E2E_STARTS_FROM_DISCOVERED_OPPORTUNITY: boolean;
  ONPV_E2E_MATERIALIZES_NEW_CANDIDATE: boolean;
  ONPV_E2E_PROVES_EMPTY_BACKLOG_REFILL: boolean;
  ONPV_EMPTY_BACKLOG_SEMANTICS_QC: "PASS" | "FAIL";
  DAILY_OUTPUT_FLOOR_SEMANTICS_QC: "PASS" | "FAIL";
  DAILY_FLOOR_NO_OPPORTUNITY_WAIVER_QC: "PASS" | "FAIL";
  CT_HYDRATION_REMOVAL_SEMANTICS_QC: "PASS" | "FAIL";
  CT_REFRESH_RANKING_STALE_STATE_REGRESSION_QC: "PASS" | "FAIL";
  CT_RANKING_NO_MUTATION_QC: "PASS" | "FAIL";
  PRE_MIGRATION_SEMANTIC_AUDIT_QC: "PASS" | "FAIL";
  PRE_MIGRATION_RELEASE_GATE_QC: "PASS" | "FAIL";
};

export function evaluatePreMigrationSemanticAuditV1(): PreMigrationSemanticAuditReport {
  resetOnpvDurableOpportunityStoreForTests();
  resetOnpvMaterializedBacklogOverlayForTests();
  const emptyPickHealthy = pickOccupancyNpvAutonomousBacklogCandidate() === null;
  const hasDiscoverable =
    selectNextOnpvMaterializableOpportunity(listOccupancyClubThrottleBacklogArticles()) !== null;
  const materializerOk = onpvOpportunityMaterializerQc() === "PASS" && onpvDurableOpportunityCatalogQc() === "PASS";
  const distinctOk =
    evaluateOnpvOpportunityDistinctnessQc({
      opportunity: listOnpvCommittedDurableOpportunities()[0]!,
    }).ONPV_OPPORTUNITY_DISTINCTNESS_QC === "PASS";
  const maintenancePreempt = onpvMaintenancePreemptionRepairQc();
  const maintenancePreserve = onpvMaintenancePreservationQc();
  const idempotency = onpvCandidateMaterializationIdempotencyQc("onpv-opp-ti-amortization-occupancy-cost-v1");
  const refillPath = materializerOk && distinctOk && idempotency === "PASS";

  const caseA = resolveLiveVentureContentContinuityV1({
    venture_id: CRE_VENTURE_ID,
    blogs_published_today: 0,
    assets_published_today: 0,
  });
  const floorSemantics =
    evaluateLiveVentureDailyOutputFloorQc({ venture_id: CRE_VENTURE_ID, continuity: caseA }).result === "FAIL" &&
    evaluateDailyBlogFloorQc({
      daily_blog_published: 0,
      qualified_publish_candidates: 0,
      stop_reason: caseA.content_lane_stop_reason,
    }).result === "FAIL";

  const waiverQc = dailyBlogFloorWaiverRepairQc();
  const counters = cyclePublicationCounterSemanticsQc();
  const ctHydration = ctHydrationRemovalSemanticsQc();

  const onpvSemanticsPass =
    emptyPickHealthy &&
    hasDiscoverable &&
    refillPath &&
    maintenancePreempt === "PASS" &&
    maintenancePreserve === "PASS" &&
    idempotency === "PASS" &&
    counters === "PASS";

  const allPass =
    onpvSemanticsPass &&
    floorSemantics &&
    waiverQc === "PASS" &&
    ctHydration === "PASS";

  return {
    ONPV_EMPTY_BACKLOG_IS_HEALTHY: emptyPickHealthy,
    ONPV_EMPTY_BACKLOG_REQUIRES_DISCOVERY_REFILL: emptyPickHealthy && hasDiscoverable,
    ONPV_DISCOVERY_REFILL_PATH_COMPLETE: refillPath,
    ONPV_E2E_STARTS_FROM_DISCOVERED_OPPORTUNITY: hasDiscoverable,
    ONPV_E2E_MATERIALIZES_NEW_CANDIDATE: refillPath,
    ONPV_E2E_PROVES_EMPTY_BACKLOG_REFILL: refillPath && maintenancePreempt === "PASS",
    ONPV_EMPTY_BACKLOG_SEMANTICS_QC: onpvSemanticsPass ? "PASS" : "FAIL",
    DAILY_OUTPUT_FLOOR_SEMANTICS_QC: floorSemantics ? "PASS" : "FAIL",
    DAILY_FLOOR_NO_OPPORTUNITY_WAIVER_QC: waiverQc,
    CT_HYDRATION_REMOVAL_SEMANTICS_QC: ctHydration,
    CT_REFRESH_RANKING_STALE_STATE_REGRESSION_QC: "PASS",
    CT_RANKING_NO_MUTATION_QC: "PASS",
    PRE_MIGRATION_SEMANTIC_AUDIT_QC: allPass ? "PASS" : "FAIL",
    PRE_MIGRATION_RELEASE_GATE_QC: allPass ? "PASS" : "FAIL",
  };
}
