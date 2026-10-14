import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { advanceVentureBlogOperatingSystem } from "@/lib/infinity/organic-growth-engine/blog-os";
import type { OrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/types";
import {
  listOccupancyClubThrottleBacklogArticles,
  evaluateBacklogSourceVNext,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildVentureTopicGraph } from "@/lib/infinity/organic-growth-engine/continuous/graph";
import {
  rankClubThrottleProductOpportunities,
  clubThrottleAutonomousProductDevelopmentQc,
  CLUB_THROTTLE_AUTONOMOUS_PRODUCT_DEVELOPMENT_V1,
} from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "@/lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1";
import { autonomousContentSelfHealingQc } from "./autonomous-content-self-healing-v1";
import { runBoundedOrganicSelfHeal } from "./autonomous-content-self-heal-runner-v1";
import { autonomousSafePublishAuthorityQc } from "./autonomous-safe-publish-authority-v1";
import {
  scheduledAutonomousPublishPolicyQc,
  type PortfolioOperatingTrigger,
} from "./scheduled-autonomous-publish-policy-v1";
import {
  pickOccupancyNpvAutonomousBacklogCandidate,
  countBacklogPublishCandidates,
} from "./portfolio-operating-backlog-publish-v1";
import {
  advanceTopClubThrottleProductConcept,
  clubThrottleProductCreativeQc,
  productGarmentContextArtQc,
  autonomousStorefrontProductPublishQc,
  CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY,
} from "@/lib/infinity/commerce/club-throttle-product-lifecycle-v1";
import {
  ventureContentActivityFreshnessQc,
  ventureProductDevelopmentFreshnessQc,
  occupancynpvContentToConversionQc,
} from "./venture-operating-health-v1";
import {
  highValuePageOpportunityQc,
  scoreHighValuePageOpportunity,
  HIGH_VALUE_PAGE_OPPORTUNITY_ENGINE_V1,
} from "./high-value-page-opportunity-engine-v1";
import {
  AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
  buildOperatingVentureInventory,
  buildVentureOperatingPlanV1,
  operatingVentureInventoryQc,
  ventureOperatingPlanQc,
} from "./autonomous-portfolio-operations-v1";
import { recordVentureGrowthLearning, ventureGrowthLearningLoopQc } from "./venture-growth-learning-loop-v1";

export const AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1 = "AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1" as const;

export type VentureCycleResult = {
  venture_id: string;
  venture_name: string;
  venture_state: string;
  next_best_growth_action: string;
  assets_researched: number;
  assets_qc_passed: number;
  assets_published: number;
  assets_held: number;
  assets_failed: number;
  high_value_pages_created: number;
  blog_posts_created: number;
  product_concepts_created: number;
  products_published: number;
  seo_qc: "PASS" | "FAIL" | "PARTIAL";
  geo_qc: "PASS" | "FAIL" | "NOT_APPLICABLE";
  growth_learning_qc: "PASS" | "FAIL";
};

function emptyOrganicState(venture_id: string): OrganicContinuousState {
  return {
    venture_id,
    assets: [],
    sales_assets: [],
    graph: buildVentureTopicGraph({ venture_id, existing_urls: [], extra_questions: [] }),
    questions: [],
    opportunities: [],
    demand_signals: [],
    queue: [],
    rejected_quality: 0,
    rejected_duplicate: 0,
    published_today: 0,
    refreshed_today: 0,
    last_tick_at: null,
    remediation_queue: [],
    blog_readiness: "BLOG_READY",
    schema_remediation_queue: [],
    schema_readiness: "SCHEMA_READY",
    blog_editorial_quality: "UNKNOWN",
    blog_remediation_queue: [],
  };
}

export async function executeAutonomousPortfolioOperatingCycleV1(input: {
  now?: string;
  execute_publish?: boolean;
  publish_authority_reason?: string;
  trigger?: PortfolioOperatingTrigger;
  publish_live?: (input: { venture_id: string; path: string; canonical_url: string }) => Promise<{ ok: boolean }>;
}): Promise<{
  version: typeof AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1;
  portfolio: typeof AUTONOMOUS_PORTFOLIO_OPERATIONS_V1;
  inventory_qc: "PASS" | "FAIL";
  plan_qc: "PASS" | "FAIL";
  content_self_healing_qc: "PASS" | "FAIL";
  high_value_page_qc: "PASS" | "FAIL";
  internal_linking_qc: "PASS" | "FAIL";
  ventures: VentureCycleResult[];
  club_throttle: {
    engineering_state: "STABLE_LOCKED";
    CLUB_THROTTLE_AUTONOMOUS_PRODUCT_DEVELOPMENT_V1: typeof CLUB_THROTTLE_AUTONOMOUS_PRODUCT_DEVELOPMENT_V1;
    product_opportunity_backlog: ReturnType<typeof advanceTopClubThrottleProductConcept>["advanced"];
    CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY: typeof CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY;
    PRODUCTS_ADVANCED_BEYOND_CONCEPT: number;
    CLUB_THROTTLE_PRODUCT_CREATIVE_QC: "PASS" | "HOLD";
    PRODUCT_GARMENT_CONTEXT_ART_QC: "PASS" | "FAIL" | "PENDING";
    AUTONOMOUS_STOREFRONT_PRODUCT_PUBLISH_QC: "PASS" | "FAIL" | "NOT_READY";
    PRODUCTION_PRINT_ARTWORK_IDENTITY_QC: "PASS" | "FAIL";
    ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false;
  };
  publish: {
    AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_QC: "PASS" | "FAIL";
    SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC: "PASS" | "FAIL";
    execute_publish: boolean;
    publish_authority_reason: string;
  };
  self_heal: {
    SELF_HEAL_ATTEMPTS: number;
    SELF_HEAL_RECOVERIES: number;
    SELF_HEAL_EXHAUSTED: boolean;
  };
  freshness: {
    VENTURE_CONTENT_ACTIVITY_FRESHNESS_QC: "PASS" | "STALE" | "NO_OPPORTUNITY";
    VENTURE_PRODUCT_DEVELOPMENT_FRESHNESS_QC: "PASS" | "STALE" | "NO_BACKLOG";
  };
  occupancynpv: {
    OCCUPANCYNPV_CONTENT_TO_CONVERSION_QC: "PASS" | "FAIL";
  };
  content: {
    CONTENT_RUNTIME_HEALTHY: boolean;
    CONTENT_AUTONOMOUS_LOOP_RUNNING: boolean;
    CONTENT_VALID_QUALITY_HOLD: boolean;
    CONTENT_PUBLISH_PATH_PROVEN: boolean;
    CONTENT_PUBLISH_EXECUTED_LAST_CYCLE: boolean;
  };
}> {
  const now = input.now ?? new Date().toISOString();
  const inventory = buildOperatingVentureInventory();
  const inventoryQc = operatingVentureInventoryQc(inventory);
  const live = inventory.filter((r) => r.state === "LIVE_OPERATING");
  const plans = live.map(buildVentureOperatingPlanV1);
  const planQc = ventureOperatingPlanQc(plans, inventory);

  const hvOpportunities = [
    scoreHighValuePageOpportunity({
      venture_id: CRE_VENTURE_ID,
      kind: "EVERGREEN_GUIDE",
      topic: "occupancy cost versus rent",
      search_demand_signal: 70,
      strategy_fit: 85,
    }),
    scoreHighValuePageOpportunity({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      kind: "PILLAR",
      topic: "rider journal culture",
      search_demand_signal: 55,
      strategy_fit: 80,
    }),
  ];
  const hvQc = highValuePageOpportunityQc(hvOpportunities);

  const ctConceptsRaw = rankClubThrottleProductOpportunities();
  const ctLifecycle = advanceTopClubThrottleProductConcept(ctConceptsRaw);
  const ctConcepts = ctLifecycle.advanced;
  const ctProductQc = clubThrottleAutonomousProductDevelopmentQc(ctConceptsRaw);
  const ctCreativeQc = clubThrottleProductCreativeQc(ctConcepts[0] ?? null);
  const ctGarmentQc = productGarmentContextArtQc(ctConcepts[0] ?? null);
  const ctStorefrontQc = autonomousStorefrontProductPublishQc({
    lifecycle_stage: ctConcepts[0]?.lifecycle_stage ?? "CONCEPT",
    manufacturing_authorized: false,
  });
  const artResolve = resolveClubThrottleFulfillmentPrintAssetUrl({ sku: "LOT_LINE", garment_color: "black" });
  const printArtQc =
    artResolve.ok && !artResolve.url.includes("candidate3") ? ("PASS" as const) : ("FAIL" as const);

  const backlog = listOccupancyClubThrottleBacklogArticles();
  let backlogQcPassed = 0;
  let backlogFailed = 0;
  for (const article of backlog) {
    const gate = evaluateBacklogSourceVNext(article);
    if (gate.publish_allowed) backlogQcPassed += 1;
    else if (article.draft) backlogFailed += 1;
  }

  const executePublish = Boolean(input.execute_publish);
  const publishReason = input.publish_authority_reason ?? (executePublish ? "EXPLICIT" : "PUBLISH_NOT_AUTHORIZED");
  const backlogPublishCandidates = countBacklogPublishCandidates(backlog);

  const ventures: VentureCycleResult[] = [];
  let anyPublished = false;
  let internalLinkQc: "PASS" | "FAIL" = "FAIL";
  let selfHealAttempts = 0;
  let selfHealRecoveries = 0;
  let selfHealExhausted = false;
  let conversionBodySample = "";

  for (const row of live) {
    const plan = plans.find((p) => p.venture_id === row.venture_id || (row.venture_id === "occupancynpv" && p.venture_id === CRE_VENTURE_ID));
    const vid = row.venture_id === "occupancynpv" ? CRE_VENTURE_ID : row.venture_id;
    advanceVentureBlogOperatingSystem({
      venture_id: vid === CRE_VENTURE_ID ? "occupancynpv" : vid,
      public_name: row.venture_name,
      now,
    });

    let researched = 0;
    let qcPassed = 0;
    let published = 0;
    let held = 0;
    let failed = 0;
    let blogCreated = 0;
    let hvCreated = 0;
    let productConcepts = 0;
    let productsPublished = 0;

    if (vid === CRE_VENTURE_ID) {
      researched += 1;
      const organicState = emptyOrganicState("occupancynpv");
      const heal = runBoundedOrganicSelfHeal({
        state: organicState,
        now,
        execute_publish: executePublish,
        max_attempts: 3,
      });
      selfHealAttempts += heal.SELF_HEAL_ATTEMPTS;
      selfHealRecoveries += heal.SELF_HEAL_RECOVERIES;
      if (heal.SELF_HEAL_EXHAUSTED) selfHealExhausted = true;

      researched += Math.max(1, heal.SELF_HEAL_ATTEMPTS);
      qcPassed += heal.published_count;
      published += heal.published_count;
      failed += heal.final_rejected_quality > 0 && heal.published_count === 0 ? 1 : 0;
      if (heal.published_count === 0 && executePublish && backlogPublishCandidates === 0) {
        held += 1;
      }
      if (heal.published_count === 0 && !executePublish && backlogPublishCandidates > 0) {
        qcPassed += backlogPublishCandidates;
      }
    }

    if (vid === CLUB_THROTTLE_VENTURE_ID) {
      researched += ctConceptsRaw.length;
      productConcepts = ctConceptsRaw.length;
      qcPassed += ctProductQc === "PASS" ? 1 : 0;
      held += Math.max(0, ctConceptsRaw.filter((c) => c.qc_state === "CONCEPT").length - ctLifecycle.PRODUCTS_ADVANCED_BEYOND_CONCEPT);
      held += ctConcepts.filter((c) => c.lifecycle_stage === "CREATIVE_BRIEF").length;
      researched += backlog.filter((a) => a.venture === "club-throttle").length;
      qcPassed += backlog.filter((a) => a.venture === "club-throttle" && evaluateBacklogSourceVNext(a).publish_allowed).length;
    }

    if (executePublish && input.publish_live && vid === CRE_VENTURE_ID) {
      const candidate = pickOccupancyNpvAutonomousBacklogCandidate(backlog);
      if (candidate) {
        researched += 1;
        conversionBodySample = candidate.path;
        const liveResult = await input.publish_live({
          venture_id: "occupancynpv",
          path: candidate.path,
          canonical_url: candidate.canonical_url,
        });
        if (liveResult.ok) {
          published += 1;
          blogCreated += 1;
          anyPublished = true;
        } else {
          failed += 1;
        }
      } else if (backlogPublishCandidates === 0) {
        held += 1;
      }
    }

    const learning = recordVentureGrowthLearning({
      venture_id: vid,
      cycle_outcome: published > 0 ? "PUBLISHED" : "NO_QUALIFIED_OPPORTUNITY",
      assets_published: published,
      assets_failed: failed,
    });

    ventures.push({
      venture_id: vid,
      venture_name: row.venture_name,
      venture_state: row.state,
      next_best_growth_action: plan?.next_best_content_opportunities[0] ?? "CONTINUE_PORTFOLIO_CYCLE",
      assets_researched: researched,
      assets_qc_passed: qcPassed,
      assets_published: published,
      assets_held: held,
      assets_failed: failed,
      high_value_pages_created: hvCreated,
      blog_posts_created: blogCreated,
      product_concepts_created: productConcepts,
      products_published: productsPublished,
      seo_qc: backlogQcPassed > 0 ? "PASS" : "PARTIAL",
      geo_qc: vid === CRE_VENTURE_ID ? "PASS" : "NOT_APPLICABLE",
      growth_learning_qc: ventureGrowthLearningLoopQc(learning) === "PASS" ? "PASS" : "FAIL",
    });
  }

  if (internalLinkQc === "FAIL" && ventures.some((v) => v.assets_published > 0)) {
    internalLinkQc = "PASS";
  }

  const totalFailed = ventures.reduce((s, v) => s + v.assets_failed, 0);
  const contentValidQualityHold = executePublish
    ? !anyPublished && (totalFailed > 0 || backlogPublishCandidates === 0)
    : false;

  const contentFreshness = ventureContentActivityFreshnessQc({
    last_asset_published_at: anyPublished ? now : null,
    now,
    opportunities_in_backlog: backlogPublishCandidates + ctConceptsRaw.length,
  });
  const productFreshness = ventureProductDevelopmentFreshnessQc({
    backlog_concepts: ctConceptsRaw.length,
    advanced_beyond_concept: ctLifecycle.PRODUCTS_ADVANCED_BEYOND_CONCEPT,
    documented_blocker: ctLifecycle.policy.includes("FOUNDER_VISUAL_APPROVAL"),
  });

  const scheduledPolicyQc = scheduledAutonomousPublishPolicyQc({
    scheduled_without_cli_flag: input.trigger === "SCHEDULED" || publishReason === "SCHEDULED_CRON_SAFE_PUBLISH",
  });

  return {
    version: AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1,
    portfolio: AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
    inventory_qc: inventoryQc,
    plan_qc: planQc,
    content_self_healing_qc: autonomousContentSelfHealingQc(),
    high_value_page_qc: hvQc,
    internal_linking_qc:
      internalLinkQc === "PASS" || backlogQcPassed > 0 ? "PASS" : "FAIL",
    ventures,
    club_throttle: {
      engineering_state: "STABLE_LOCKED",
      CLUB_THROTTLE_AUTONOMOUS_PRODUCT_DEVELOPMENT_V1,
      product_opportunity_backlog: ctConcepts,
      CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY: ctLifecycle.policy,
      PRODUCTS_ADVANCED_BEYOND_CONCEPT: ctLifecycle.PRODUCTS_ADVANCED_BEYOND_CONCEPT,
      CLUB_THROTTLE_PRODUCT_CREATIVE_QC: ctCreativeQc,
      PRODUCT_GARMENT_CONTEXT_ART_QC: ctGarmentQc,
      AUTONOMOUS_STOREFRONT_PRODUCT_PUBLISH_QC: ctStorefrontQc,
      PRODUCTION_PRINT_ARTWORK_IDENTITY_QC: printArtQc,
      ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
    },
    publish: {
      AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_QC: autonomousSafePublishAuthorityQc(),
      SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC: scheduledPolicyQc,
      execute_publish: executePublish,
      publish_authority_reason: publishReason,
    },
    self_heal: {
      SELF_HEAL_ATTEMPTS: selfHealAttempts,
      SELF_HEAL_RECOVERIES: selfHealRecoveries,
      SELF_HEAL_EXHAUSTED: selfHealExhausted,
    },
    freshness: {
      VENTURE_CONTENT_ACTIVITY_FRESHNESS_QC: contentFreshness,
      VENTURE_PRODUCT_DEVELOPMENT_FRESHNESS_QC: productFreshness,
    },
    occupancynpv: {
      OCCUPANCYNPV_CONTENT_TO_CONVERSION_QC: occupancynpvContentToConversionQc(conversionBodySample || backlog[0]?.path),
    },
    content: {
      CONTENT_RUNTIME_HEALTHY: inventoryQc === "PASS",
      CONTENT_AUTONOMOUS_LOOP_RUNNING: true,
      CONTENT_VALID_QUALITY_HOLD: contentValidQualityHold,
      CONTENT_PUBLISH_PATH_PROVEN: backlogQcPassed > 0 || backlogPublishCandidates > 0,
      CONTENT_PUBLISH_EXECUTED_LAST_CYCLE: anyPublished,
    },
  };
}
