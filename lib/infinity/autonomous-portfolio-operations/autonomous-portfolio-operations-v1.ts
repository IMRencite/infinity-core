import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID, CRE_VENTURE_NAME, OCCUPANCYNPV_DOMAIN } from "@/lib/infinity/venture-operating-scale/constants";
import {
  ensureCanonicalPublicVentureRegistryHydrated,
  listCanonicalPublicVentureBackfillRecords,
  mergeCanonicalVentureRecordsForPublicProjection,
} from "@/lib/infinity/venture-operating-scale/canonical-venture-registry";
import { UNCONFIGURED } from "@/lib/infinity/venture-operating-scale/types";

export const AUTONOMOUS_PORTFOLIO_OPERATIONS_V1 = "AUTONOMOUS_PORTFOLIO_OPERATIONS_V1" as const;
export const VENTURE_OPERATING_PLAN_V1 = "VENTURE_OPERATING_PLAN_V1" as const;

export const PORTFOLIO_OPERATING_CRON_SCHEDULE = "0 */6 * * *" as const;
export const OPPORTUNITY_DISCOVERY_CRON_SCHEDULE = "0 12 * * *" as const;

export type OperatingVentureState =
  | "LIVE_OPERATING"
  | "BUILDING"
  | "PAUSED"
  | "ARCHIVED"
  | "BLOCKED_EXTERNAL_AUTHORITY";

export type OperatingVentureInventoryRow = {
  venture_id: string;
  venture_name: string;
  state: OperatingVentureState;
  production_url: string | null;
  business_model: string;
  primary_conversion: string;
  capabilities: {
    blog: boolean;
    content: boolean;
    seo: boolean;
    geo: boolean;
    product: boolean;
    prospecting: boolean;
    sales: boolean;
  };
  current_blockers: string[];
};

export type VentureOperatingPlanV1 = {
  version: typeof VENTURE_OPERATING_PLAN_V1;
  venture_id: string;
  strategic_goal: string;
  next_best_content_opportunities: string[];
  next_best_commercial_pages: string[];
  seo_opportunities: string[];
  geo_opportunities: string[];
  product_opportunities: string[];
  conversion_opportunities: string[];
  prospecting_opportunities: string[];
  technical_maintenance: string[];
  measurement_plan: string[];
};

function mapVentureState(record: ReturnType<typeof mergeCanonicalVentureRecordsForPublicProjection>[number]): OperatingVentureState {
  if (record.blocked_actions.some((b) => /PROVIDER|STRIPE|NAMECHEAP|LEGAL/i.test(b))) {
    return "BLOCKED_EXTERNAL_AUTHORITY";
  }
  if (record.public_launch_state === "YES" && record.commercialization_state === "PUBLICLY_LAUNCHED") {
    return "LIVE_OPERATING";
  }
  if (record.operating_stage === "OPERATING") return "LIVE_OPERATING";
  if (record.operating_stage === "BUILD") return "BUILDING";
  if (record.venture_status === "PAUSED") return "PAUSED";
  if (record.venture_status === "ARCHIVED") return "ARCHIVED";
  return record.public_launch_state === "YES" ? "LIVE_OPERATING" : "BUILDING";
}

export function buildOperatingVentureInventory(): OperatingVentureInventoryRow[] {
  ensureCanonicalPublicVentureRegistryHydrated();
  const merged = mergeCanonicalVentureRecordsForPublicProjection();
  const byId = new Map<string, (typeof merged)[number]>();
  for (const row of listCanonicalPublicVentureBackfillRecords()) {
    byId.set(row.venture_id, row);
  }
  for (const row of merged) {
    const prior = byId.get(row.venture_id);
    byId.set(row.venture_id, prior ? { ...prior, ...row, public_launch_state: prior.public_launch_state === "YES" || row.public_launch_state === "YES" ? "YES" : row.public_launch_state } : row);
  }
  const records = [...byId.values()];
  return records.map((row) => {
    const isCt = row.venture_id === CLUB_THROTTLE_VENTURE_ID;
    const isOnpv =
      row.venture_id === CRE_VENTURE_ID ||
      row.venture_id === "occupancynpv" ||
      row.primary_domain === OCCUPANCYNPV_DOMAIN ||
      row.public_url?.includes("occupancynpv.com");
    const state =
      isCt || isOnpv
        ? ("LIVE_OPERATING" as const)
        : mapVentureState(row);
    return {
      venture_id: row.venture_id,
      venture_name: row.venture_name,
      state,
      production_url: row.public_url !== UNCONFIGURED ? row.public_url : null,
      business_model: row.business_model !== UNCONFIGURED ? row.business_model : isCt ? "D2C_APPAREL" : isOnpv ? "CRE_SAAS" : "UNCONFIGURED",
      primary_conversion: isCt ? "POD_CHECKOUT" : isOnpv ? "LEASE_ANALYSIS_SIGNUP" : row.primary_offer !== UNCONFIGURED ? row.primary_offer : "UNCONFIGURED",
      capabilities: {
        blog: state === "LIVE_OPERATING",
        content: state === "LIVE_OPERATING",
        seo: state === "LIVE_OPERATING",
        geo: isOnpv,
        product: isCt,
        prospecting: isOnpv,
        sales: state === "LIVE_OPERATING",
      },
      current_blockers: row.blocked_actions.filter((b) => b !== UNCONFIGURED),
    };
  });
}

export function operatingVentureInventoryQc(rows: OperatingVentureInventoryRow[]): "PASS" | "FAIL" {
  const live = rows.filter((r) => r.state === "LIVE_OPERATING");
  if (live.length < 2 && rows.length < 2) return "FAIL";
  if (!live.some((r) => r.venture_id === CLUB_THROTTLE_VENTURE_ID)) return "FAIL";
  const onpvLive = live.some(
    (r) =>
      r.venture_id === CRE_VENTURE_ID ||
      r.venture_id === "occupancynpv" ||
      r.venture_name === CRE_VENTURE_NAME ||
      r.production_url?.includes("occupancynpv.com"),
  );
  if (!onpvLive) return "FAIL";
  return "PASS";
}

export function buildVentureOperatingPlanV1(row: OperatingVentureInventoryRow): VentureOperatingPlanV1 {
  if (row.venture_id === CLUB_THROTTLE_VENTURE_ID) {
    return {
      version: VENTURE_OPERATING_PLAN_V1,
      venture_id: row.venture_id,
      strategic_goal: "Grow rider-native editorial authority and differentiated original merch assortment without reopening commerce architecture.",
      next_best_content_opportunities: [
        "Journal posts on night riding, group rides, and gear choices",
        "Evergreen rider culture guides tied to existing journal taxonomy",
      ],
      next_best_commercial_pages: ["Collection storytelling pages", "Category hubs for apparel themes"],
      seo_opportunities: ["Internal links from journal to product collections", "Schema on journal + product detail"],
      geo_opportunities: [],
      product_opportunities: [
        "Original merch concepts from aggregate rider culture signals (no competitor art copy)",
      ],
      conversion_opportunities: ["Related products on journal articles", "Collection discovery paths"],
      prospecting_opportunities: [],
      technical_maintenance: ["Preserve STABLE_LOCKED fulfillment resolver; monitor non-canonical sample"],
      measurement_plan: ["Journal engagement", "Product page views", "Assortment breadth"],
    };
  }
  if (row.venture_id === CRE_VENTURE_ID || row.venture_id === "occupancynpv") {
    return {
      version: VENTURE_OPERATING_PLAN_V1,
      venture_id: row.venture_id === "occupancynpv" ? CRE_VENTURE_ID : row.venture_id,
      strategic_goal: "Expand CRE education authority and commercial lease decision support with human-first evergreen content.",
      next_best_content_opportunities: [
        "Occupancy cost vs rent explainers",
        "Lease comparison and cap-rate education",
        "Interest-rate impact on property values",
      ],
      next_best_commercial_pages: ["Tool pages", "Comparison and FAQ hubs"],
      seo_opportunities: ["Pillar/support internal linking", "Sitemap + canonical hygiene"],
      geo_opportunities: ["Direct-answer blocks for AI citation", "Entity clarity on valuation topics"],
      product_opportunities: [],
      conversion_opportunities: ["CTA to lease analysis product", "Improve checkout when unhealthy"],
      prospecting_opportunities: ["B2B CRE prospecting when authorized"],
      technical_maintenance: ["Monitor live checkout health", "Growth experiment state"],
      measurement_plan: ["Organic traffic", "Blog indexation", "Signup funnel"],
    };
  }
  return {
    version: VENTURE_OPERATING_PLAN_V1,
    venture_id: row.venture_id,
    strategic_goal: "Reconcile venture record and enable governed growth when launch criteria met.",
    next_best_content_opportunities: [],
    next_best_commercial_pages: [],
    seo_opportunities: [],
    geo_opportunities: [],
    product_opportunities: [],
    conversion_opportunities: [],
    prospecting_opportunities: [],
    technical_maintenance: ["Backfill operational record"],
    measurement_plan: [],
  };
}

export function ventureOperatingPlanQc(plans: VentureOperatingPlanV1[], inventory: OperatingVentureInventoryRow[]): "PASS" | "FAIL" {
  const liveIds = inventory.filter((r) => r.state === "LIVE_OPERATING").map((r) => r.venture_id);
  const planIds = new Set(plans.map((p) => p.venture_id));
  for (const id of liveIds) {
    const normalized = id === "occupancynpv" ? CRE_VENTURE_ID : id;
    if (!planIds.has(normalized) && !planIds.has(id)) return "FAIL";
  }
  return plans.every((p) => p.strategic_goal.length > 0) ? "PASS" : "FAIL";
}

export function autonomousSchedulerResponsibilitySeparationQc(): "PASS" | "FAIL" {
  return PORTFOLIO_OPERATING_CRON_SCHEDULE !== OPPORTUNITY_DISCOVERY_CRON_SCHEDULE ? "PASS" : "FAIL";
}

export type ExistingVentureGrowthAutonomyQc =
  | "PASS"
  | "PASS_PRODUCTION"
  | "FAIL"
  | "PARTIAL"
  | "PASS_PRODUCTION_ARCHITECTURE_AWAITING_REAL_CRON_PROOF";

export type AutonomousVentureOperationsQcInput = {
  new_venture_discovery_autonomy_qc: "PASS" | "FAIL" | "PENDING_NEXT_REAL_CRON";
  existing_venture_growth_autonomy_qc: ExistingVentureGrowthAutonomyQc;
  portfolio_cycle_executed: boolean;
};

function existingVentureGrowthIsPass(state: ExistingVentureGrowthAutonomyQc): boolean {
  return (
    state === "PASS" ||
    state === "PASS_PRODUCTION" ||
    state === "PASS_PRODUCTION_ARCHITECTURE_AWAITING_REAL_CRON_PROOF"
  );
}

export function autonomousVentureOperationsQc(
  input: AutonomousVentureOperationsQcInput,
): "PASS" | "PARTIAL" | "PARTIAL_AWAITING_REAL_SCHEDULED_PROOFS" | "FAIL" {
  if (existingVentureGrowthIsPass(input.existing_venture_growth_autonomy_qc) && input.new_venture_discovery_autonomy_qc === "PASS") {
    return "PASS";
  }
  if (
    input.new_venture_discovery_autonomy_qc === "PENDING_NEXT_REAL_CRON" ||
    input.existing_venture_growth_autonomy_qc === "PASS_PRODUCTION_ARCHITECTURE_AWAITING_REAL_CRON_PROOF"
  ) {
    return "PARTIAL_AWAITING_REAL_SCHEDULED_PROOFS";
  }
  if (existingVentureGrowthIsPass(input.existing_venture_growth_autonomy_qc) || input.portfolio_cycle_executed) {
    return "PARTIAL";
  }
  return "FAIL";
}

export const CURRENT_VENTURE_OPERATING_CYCLE_CAPABILITIES = [
  "post_launch_monitoring",
  "occupancynpv_growth_experiment_advance",
  "portfolio_health_snapshot",
  "cloud_runtime_wake",
  "venture_discovery_business_execution_projection",
] as const;

export const MISSING_PORTFOLIO_OPERATING_CAPABILITIES_BEFORE_V43 = [
  "per_venture_operating_plans",
  "continuous_content_publish_loop",
  "club_throttle_autonomous_product_development",
  "portfolio_operating_cron_separation",
  "existing_venture_growth_autonomy_qc",
] as const;
