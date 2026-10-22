import { describe, expect, it } from "vitest";
import {
  autonomousSchedulerResponsibilitySeparationQc,
  autonomousVentureOperationsQc,
  buildOperatingVentureInventory,
  operatingVentureInventoryQc,
} from "../autonomous-portfolio-operations-v1.ts";
import { autonomousContentSelfHealingQc } from "../autonomous-content-self-healing-v1.ts";
import { runBoundedOrganicSelfHeal } from "../autonomous-content-self-heal-runner-v1.ts";
import {
  resolveScheduledAutonomousPublish,
  scheduledAutonomousPublishPolicyQc,
} from "../scheduled-autonomous-publish-policy-v1.ts";
import { pickOccupancyNpvAutonomousBacklogCandidate } from "../portfolio-operating-backlog-publish-v1.ts";
import { advanceTopClubThrottleProductConcept } from "@/lib/infinity/commerce/club-throttle-product-lifecycle-v1.ts";
import { executeAutonomousPortfolioOperatingCycleV1 } from "../execute-autonomous-portfolio-operating-cycle-v1.ts";
import { autonomousVentureProductionDeployerQc } from "../autonomous-venture-production-deployer-v1.ts";
import { ventureDeployTargetIdentityQc } from "../venture-deploy-target-identity-v1.ts";
import { reconcileOccupancyNpvBacklog } from "../occupancynpv-backlog-reconciliation-v1.ts";
import { commerceCreativeVsManufacturingAuthoritySeparationQc } from "@/lib/infinity/commerce/club-throttle-autonomous-creative-approval-policy-v1.ts";
import { clubThrottleAutonomousProductDevelopmentQc, rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1.ts";
import { buildVentureTopicGraph } from "@/lib/infinity/organic-growth-engine/continuous/graph";

describe("AUTONOMOUS_PORTFOLIO_OPERATIONS_V1", () => {
  it("inventories live Club Throttle and OccupancyNPV without inventing ventures", () => {
    const rows = buildOperatingVentureInventory();
    expect(operatingVentureInventoryQc(rows)).toBe("PASS");
    expect(rows.some((r) => r.venture_id === "club-throttle" && r.state === "LIVE_OPERATING")).toBe(true);
    expect(rows.some((r) => r.production_url?.includes("occupancynpv.com") && r.state === "LIVE_OPERATING")).toBe(true);
  });

  it("separates portfolio operating cron from opportunity discovery cron", () => {
    expect(autonomousSchedulerResponsibilitySeparationQc()).toBe("PASS");
  });

  it("requires existing venture growth for full autonomy QC", () => {
    expect(
      autonomousVentureOperationsQc({
        new_venture_discovery_autonomy_qc: "PENDING_NEXT_REAL_CRON",
        existing_venture_growth_autonomy_qc: "PASS",
        portfolio_cycle_executed: true,
      }),
    ).toBe("PARTIAL_AWAITING_REAL_SCHEDULED_PROOFS");
    expect(
      autonomousVentureOperationsQc({
        new_venture_discovery_autonomy_qc: "PASS",
        existing_venture_growth_autonomy_qc: "PASS",
        portfolio_cycle_executed: true,
      }),
    ).toBe("PASS");
  });

  it("blocks automatic Club Throttle manufacturing in product development", () => {
    const concepts = rankClubThrottleProductOpportunities();
    expect(clubThrottleAutonomousProductDevelopmentQc(concepts)).toBe("PASS");
    expect(concepts.every((c) => c.manufacturing_authorized === false)).toBe(true);
  });

  it("keeps content self-healing on failed builds", () => {
    expect(autonomousContentSelfHealingQc()).toBe("PASS");
  });

  it("authorizes scheduled portfolio publish without CLI --publish", () => {
    const scheduled = resolveScheduledAutonomousPublish({ trigger: "SCHEDULED", manual_publish_flag: false });
    expect(scheduled.execute_publish).toBe(true);
    expect(scheduled.reason).toBe("SCHEDULED_CRON_SAFE_PUBLISH");
    expect(scheduledAutonomousPublishPolicyQc({ scheduled_without_cli_flag: true })).toBe("PASS");
    const local = resolveScheduledAutonomousPublish({ trigger: "MANUAL", manual_publish_flag: false, env: {} });
    expect(local.execute_publish).toBe(false);
  });

  it("runs bounded organic self-heal without ending the cycle", () => {
    const state = {
      venture_id: "occupancynpv",
      assets: [],
      sales_assets: [],
      graph: buildVentureTopicGraph({ venture_id: "occupancynpv", existing_urls: [], extra_questions: [] }),
      questions: [],
      opportunities: [],
      demand_signals: [],
      queue: [],
      rejected_quality: 1,
      rejected_duplicate: 0,
      published_today: 0,
      refreshed_today: 0,
      last_tick_at: null,
      remediation_queue: [],
      blog_readiness: "BLOG_READY" as const,
      schema_remediation_queue: [],
      schema_readiness: "SCHEMA_READY" as const,
      blog_editorial_quality: "UNKNOWN" as const,
      blog_remediation_queue: [],
    };
    const heal = runBoundedOrganicSelfHeal({ state, now: new Date().toISOString(), execute_publish: false, max_attempts: 2 });
    expect(heal.SELF_HEAL_ATTEMPTS).toBeGreaterThan(0);
  });

  it("advances top Club Throttle concept to creative brief without manufacturing", () => {
    const concepts = rankClubThrottleProductOpportunities();
    const advanced = advanceTopClubThrottleProductConcept(concepts);
    expect(advanced.PRODUCTS_ADVANCED_BEYOND_CONCEPT).toBe(1);
    expect(advanced.advanced[0]?.lifecycle_stage).toBe("CREATIVE_BRIEF");
  });

  it("separates venture deploy targets and reconciles OccupancyNPV backlog", () => {
    expect(autonomousVentureProductionDeployerQc()).toBe("PASS");
    expect(
      ventureDeployTargetIdentityQc({
        venture_id: "occupancynpv",
        expected_project_id: "prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d",
      }),
    ).toBe("PASS");
    expect(commerceCreativeVsManufacturingAuthoritySeparationQc()).toBe("PASS");
    const backlog = reconcileOccupancyNpvBacklog();
    expect(backlog.OCCUPANCYNPV_QC_PASS_BACKLOG_COUNT).toBeGreaterThan(0);
  });

  it("does not treat missing CLI publish as quality hold when backlog is ready", async () => {
    const cycle = await executeAutonomousPortfolioOperatingCycleV1({ execute_publish: false, trigger: "MANUAL" });
    expect(cycle.publish.execute_publish).toBe(false);
    expect(cycle.content.CONTENT_VALID_QUALITY_HOLD).toBe(false);
    expect(pickOccupancyNpvAutonomousBacklogCandidate()).toBeNull();
  });
});
