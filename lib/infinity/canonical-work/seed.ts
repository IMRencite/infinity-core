import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "./types";
import { classifyCanonicalWork, projectLatestVentureWork, projectRecentSystemActivityHistory, projectRecentVentureWorkHistory } from "./classification";
import { pickCurrentCanonicalWork, pickLatestCompletedCanonicalWork } from "./rows";
import { completeCanonicalWork, listCanonicalWork, markCanonicalWorkStatus, reloadCanonicalWorkStoreFromDisk, upsertCanonicalWork } from "./store";
import { sourceLabel } from "./rooms";
import {
  ensureVerifiedCommitmentMilestone,
  ensureVerifiedSpendAuthorityMilestone,
  resolveCanonicalMissionCompletions,
} from "./mission-completion";

export const OCCUPANCYNPV_LIVE_OFFER_WORK_ID = "work:occupancynpv:live-offer-activation-v1" as const;
export const OCCUPANCYNPV_FOUNDER_RECHECK_WORK_ID = "work:occupancynpv:founder-physical-offer-recheck" as const;
export const HQ_LIVE_WORK_PROJECTION_REPAIR_ID = "work:infinity:hq-live-work-projection-repair-v1" as const;
export const OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID = "work:occupancynpv:true-offer-conversion-ux-repair-v1" as const;
export const OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID =
  "work:occupancynpv:pricing-conversion-true-offer-repair-v2" as const;
export const OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID =
  "work:occupancynpv:pricing-page-production-quality-repair-v3" as const;
export const OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID =
  "work:occupancynpv:pricing-hero-enhancement-v1" as const;
export const GLOBAL_PAGE_DEPTH_QC_WORK_ID =
  "work:infinity:global-page-depth-qc-occupancynpv-layout-repair-v1" as const;
export const OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID =
  "work:occupancynpv:venture-wide-page-depth-uplift-v1" as const;
export const OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID =
  "work:occupancynpv:founder-visual-faq-quality-repair-v1" as const;
export const OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID =
  "work:occupancynpv:global-h1-composition-repair-v1" as const;
export const LIGHTWEIGHT_LIVE_HQ_WORK_ID = "work:infinity:lightweight-live-hq-v1" as const;
export const OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID =
  "work:occupancynpv:app-action-hierarchy-repair-v1" as const;
export const OCCUPANCYNPV_FAVICON_REPAIR_ID =
  "work:occupancynpv:favicon-production-repair-v1" as const;
export const OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID =
  "work:occupancynpv:global-venture-brand-identity-v1" as const;
export const OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID =
  "work:occupancynpv:brand-deploy-hq-metadata-repair-v1" as const;
export const HQ_LIVE_FLOOR_WIRING_REPAIR_ID =
  "work:infinity:live-operating-floor-wiring-repair-v1" as const;
export const HQ_STALE_STATE_PHYSICAL_PROOF_ID = "work:hq:stale-state-physical-proof" as const;
export const MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID =
  "work:infinity:mercury-stripe-financial-truth-v1" as const;
export const TREASURY_CONTROL_CENTER_WORK_ID =
  "work:infinity:live-treasury-control-center-v1" as const;
export const TREASURY_CONTROL_CENTER_WORK_TITLE =
  "Infinity — Live Treasury Control Center + Bank-Linked Budgeting" as const;
export const HQ_NAVIGATION_CLEANUP_WORK_ID = "work:infinity:hq-navigation-cleanup-v1" as const;
export const HQ_NAVIGATION_CLEANUP_WORK_TITLE =
  "Infinity — HQ Navigation Cleanup + Current-Work Floor" as const;
export const OCCUPANCYNPV_SPEND_AUTHORITY_WORK_ID =
  "work:occupancynpv:governed-venture-spend-authority-v1" as const;
export const OCCUPANCYNPV_SPEND_AUTHORITY_WORK_TITLE =
  "OccupancyNPV Governed Venture Spend Authority V1" as const;
export const OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_ID =
  "work:occupancynpv:venture-financial-commitment-v1" as const;
export const OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_TITLE =
  "Venture Financial Commitment V1" as const;

function already(id: string): boolean {
  return listCanonicalWork().some((row) => row.work_id === id);
}

const HERO_PARKED_OUTPUT =
  "Overlay hero live · 3-day trial above the fold · $290/$149 unchanged · dpl_22YPpFnmH2m2FoKEDo4wqCRruLfx";

export function ensureOccupancyNpvCanonicalWork(now = new Date().toISOString()): CanonicalWorkExecutionContract[] {
  reloadCanonicalWorkStoreFromDisk();
  const created: CanonicalWorkExecutionContract[] = [];
  const leftoverProof = listCanonicalWork().find((row) => row.work_id === HQ_STALE_STATE_PHYSICAL_PROOF_ID);
  if (leftoverProof && leftoverProof.status !== "COMPLETED" && leftoverProof.status !== "SUPERSEDED") {
    const closed = markCanonicalWorkStatus(HQ_STALE_STATE_PHYSICAL_PROOF_ID, "SUPERSEDED", {
      updated_at: now,
      completed_at: now,
      latest_output: `${leftoverProof.latest_output} · superseded by live operating-floor wiring repair`,
      next_expected_transition: "HQ_LIVE_FLOOR_WIRING_REPAIR",
    });
    if (closed) created.push(closed);
  }
  const leftoverDepth = listCanonicalWork().find((row) => row.work_id === GLOBAL_PAGE_DEPTH_QC_WORK_ID);
  if (leftoverDepth && leftoverDepth.status === "ACTIVE") {
    const closed = markCanonicalWorkStatus(GLOBAL_PAGE_DEPTH_QC_WORK_ID, "SUPERSEDED", {
      updated_at: now,
      completed_at: leftoverDepth.completed_at ?? now,
      latest_output: `${leftoverDepth.latest_output} · SUPERSEDED — no longer current HQ mission`,
      next_expected_transition: "FOUNDER_LIVE_FLOOR_RECHECK_REQUIRED",
    });
    if (closed) created.push(closed);
  } else if (leftoverDepth?.status === "STALE") {
    const closed = markCanonicalWorkStatus(GLOBAL_PAGE_DEPTH_QC_WORK_ID, "COMPLETED", {
      updated_at: now,
      completed_at: leftoverDepth.completed_at ?? now,
      latest_output: leftoverDepth.latest_output.replace(/ · marked STALE after freshness policy/, "") + " · closed after floor wiring repair",
      next_expected_transition: "GLOBAL_PAGE_DEPTH_QC_LOCKED",
    });
    if (closed) created.push(closed);
  }
  if (!already(OCCUPANCYNPV_LIVE_OFFER_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_LIVE_OFFER_WORK_ID,
      mission_id: "mission:occupancynpv:live-offer-activation-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "OFFER_ARCHITECTURE",
      title: "OccupancyNPV — Live Offer Activation",
      description: "Implement a real customer-facing paid-first offer and restore CommercialOfferCompletenessGate / FULL QC.",
      stage: "BUILD / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["systems_architect", "product_lab", "quality_control", "launch_operations"],
      assigned_workers: ["Systems Architect", "Creation Lab", "Validation Station", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Live offer rendered; commercial offer QC PASS",
      latest_output: "CommercialOfferCompletenessGate PASS · live /pricing shows Start Professional · $290/$149 unchanged",
      artifact_refs: ["dpl_GfGAdHxZ295GoHsafjr2drKFXj37"],
      evidence_refs: [
        ".infinity/venture-operating-scale/occupancynpv-live-offer-deployment.json",
        ".infinity/venture-operating-scale/occupancynpv-live-offer-surface.json",
      ],
      parent_work_id: null,
      traceability_links: [
        "https://occupancynpv.com/pricing",
        "offer:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:paid-first-rendered-v2",
      ],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_PHYSICAL_OFFER_RECHECK",
    }));
  }
  const existingFounderRecheck = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_FOUNDER_RECHECK_WORK_ID);
  if (existingFounderRecheck && existingFounderRecheck.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_FOUNDER_RECHECK_WORK_ID,
      "Founder physical review PASS · pricing offer and conversion path accepted",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_FOUNDER_RECHECK_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_FOUNDER_RECHECK_WORK_ID,
      mission_id: "mission:occupancynpv:live-offer-activation-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "OccupancyNPV — Founder Physical Offer Recheck",
      description: "Founder physical recheck of the live paid-first offer on occupancynpv.com/pricing.",
      stage: "QC",
      status: "COMPLETED",
      assigned_rooms: ["quality_control"],
      assigned_workers: ["Validation Station"],
      source: "FOUNDER",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Founder physical review recorded",
      latest_output: "Founder physical review PASS · pricing offer and conversion path accepted",
      artifact_refs: [],
      evidence_refs: [".infinity/venture-operating-scale/occupancynpv-live-offer-surface.json"],
      parent_work_id: OCCUPANCYNPV_LIVE_OFFER_WORK_ID,
      traceability_links: ["https://occupancynpv.com/pricing"],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_HERO_RECHECK_REQUIRED",
    }));
  }
  if (!already(HQ_LIVE_WORK_PROJECTION_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: HQ_LIVE_WORK_PROJECTION_REPAIR_ID,
      mission_id: "mission:infinity:hq-live-work-projection-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "SYSTEM_ARCHITECTURE",
      title: "OccupancyNPV — HQ Live Work Projection Repair",
      description: "Project OccupancyNPV commercial/QC/build work onto HQ Command and the operating floor without faking autonomous runtime execution.",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "COMPLETED",
      assigned_rooms: ["systems_architect", "quality_control", "operations"],
      assigned_workers: ["Systems Architect", "Validation Station"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Command lists assigned rooms; workers glow only while work is ACTIVE",
      latest_output: "HQ projection repair COMPLETED · workers idle until the next ACTIVE work",
      artifact_refs: [],
      evidence_refs: [],
      parent_work_id: OCCUPANCYNPV_LIVE_OFFER_WORK_ID,
      traceability_links: [OCCUPANCYNPV_LIVE_OFFER_WORK_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_PHYSICAL_OFFER_RECHECK",
    }));
  }
  const repair = listCanonicalWork().find((row) => row.work_id === HQ_LIVE_WORK_PROJECTION_REPAIR_ID);
  if (repair?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      HQ_LIVE_WORK_PROJECTION_REPAIR_ID,
      "HQ projection repair COMPLETED · workers idle until the next ACTIVE work",
    );
    if (closed) created.push(closed);
  }
  const existingRepair = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID);
  if (existingRepair?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID,
      "Superseded by OccupancyNPV — Pricing Conversion + True Offer Repair",
    );
    if (closed) created.push(closed);
  }
  if (!already(OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID,
      mission_id: "mission:occupancynpv:true-offer-conversion-ux-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "OFFER_ARCHITECTURE",
      title: "OccupancyNPV — True Offer + Pricing UX Repair",
      description: "Separate base pricing from promotional offers, remove the fake paid-first offer block, and restore above-the-fold purchase actions.",
      stage: "OFFER SEMANTICS / PRICING UX / QC",
      status: "COMPLETED",
      assigned_rooms: ["strategy_finance", "systems_architect", "product_lab", "quality_control", "operations"],
      assigned_workers: ["Profit Lab", "Systems Architect", "Creation Lab", "Validation Station", "Venture Operator"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Semantic repair complete; superseded by conversion + true-offer V2",
      latest_output: "Superseded by OccupancyNPV — Pricing Conversion + True Offer Repair",
      artifact_refs: ["dpl_5kzZSd2okSugvcDSCxWLTRr6FjP7"],
      evidence_refs: ["https://occupancynpv.com/pricing"],
      parent_work_id: OCCUPANCYNPV_LIVE_OFFER_WORK_ID,
      traceability_links: ["https://occupancynpv.com/pricing", OCCUPANCYNPV_LIVE_OFFER_WORK_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "OCCUPANCYNPV_PRICING_UX_REPAIRED_OFFER_PENDING or TRUE_OFFER_ACTIVE",
    }));
  }
  const existingActivation = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID);
  if (existingActivation?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID,
      "3-day trial live above the fold · superseded by OccupancyNPV — Pricing Page Production Quality Repair",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID,
      mission_id: "mission:occupancynpv:pricing-conversion-true-offer-repair-v2",
      venture_id: CRE_VENTURE_ID,
      work_type: "OFFER_ARCHITECTURE",
      title: "OccupancyNPV — Mandatory Acquisition Offer Activation",
      description: "Activate the 3-day no-card trial and put the offer plus CTAs first in the desktop fold.",
      stage: "ACQUISITION OFFER / CONVERSION UX / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "strategy_finance", "systems_architect", "product_lab", "quality_control", "launch_operations"],
      assigned_workers: ["Venture Operator", "Profit Lab", "Systems Architect", "Creation Lab", "Validation Station", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "3-day no-card trial live first in the pricing fold",
      latest_output: "COMPLETED · Start Free Trial first in fold · $290/$149 unchanged · dpl_HQxMiqn4E1u4dWSP1JYHuUYC4BW2",
      artifact_refs: ["dpl_HQxMiqn4E1u4dWSP1JYHuUYC4BW2"],
      evidence_refs: ["https://occupancynpv.com/pricing"],
      parent_work_id: OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID,
      traceability_links: ["https://occupancynpv.com/pricing", OCCUPANCYNPV_TRUE_OFFER_UX_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_PRICING_PAGE_RECHECK_REQUIRED",
    }));
  }
  const existingQuality = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID);
  if (existingQuality?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID,
      "Founder physical review PASS · superseded by OccupancyNPV — Pricing Hero Enhancement",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID,
      mission_id: "mission:occupancynpv:pricing-page-production-quality-repair-v3",
      venture_id: CRE_VENTURE_ID,
      work_type: "DESIGN",
      title: "OccupancyNPV — Pricing Page Production Quality Repair",
      description: "Restore a conversion-safe building hero, remove dead whitespace, and rebuild below-fold buyer-decision content without moving the 3-day trial off the first viewport.",
      stage: "DESIGN / CONTENT / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "creative_studio", "product_lab", "quality_control", "launch_operations"],
      assigned_workers: ["Venture Operator", "Design Core", "Creation Lab", "Validation Station", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Founder physical review PASS",
      latest_output: "Founder physical review PASS · superseded by OccupancyNPV — Pricing Hero Enhancement",
      artifact_refs: ["dpl_GAM56gQxPZ73X6EHRHA6dL8S7GyV"],
      evidence_refs: ["https://occupancynpv.com/pricing"],
      parent_work_id: OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID,
      traceability_links: ["https://occupancynpv.com/pricing", OCCUPANCYNPV_PRICING_CONVERSION_TRUE_OFFER_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_HERO_RECHECK_REQUIRED",
    }));
  }
  const existingHero = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID);
  if (existingHero?.status === "ACTIVE") {
    const parked = parkOccupancyNpvHeroWorkForFounderRecheck(
      /in progress|Preserving 3-day/i.test(existingHero.latest_output ?? "")
        ? HERO_PARKED_OUTPUT
        : existingHero.latest_output || HERO_PARKED_OUTPUT,
      now,
    );
    if (parked) created.push(parked);
  } else if (!already(OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID,
      mission_id: "mission:occupancynpv:pricing-hero-enhancement-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "DESIGN",
      title: "OccupancyNPV — Pricing Hero Enhancement",
      description: "Enlarge the building hero, add overlay product copy, and keep the 3-day trial plus paid paths above the fold.",
      stage: "DESIGN / QC / DEPLOYMENT",
      status: "AUTHORIZATION_REQUIRED",
      assigned_rooms: ["operations", "creative_studio", "product_lab", "quality_control", "launch_operations"],
      assigned_workers: ["Venture Operator", "Design Core", "Creation Lab", "Validation Station", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: null,
      blocked_reason: null,
      authorization_state: "FOUNDER_HERO_RECHECK_REQUIRED",
      progress: "Waiting on founder physical hero recheck",
      latest_output: HERO_PARKED_OUTPUT,
      artifact_refs: ["dpl_22YPpFnmH2m2FoKEDo4wqCRruLfx"],
      evidence_refs: ["https://occupancynpv.com/pricing"],
      parent_work_id: OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID,
      traceability_links: ["https://occupancynpv.com/pricing", OCCUPANCYNPV_PRICING_PAGE_QUALITY_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_HERO_RECHECK_REQUIRED",
    }));
  }
  const existingDepth = listCanonicalWork().find((row) => row.work_id === GLOBAL_PAGE_DEPTH_QC_WORK_ID);
  if (existingDepth?.status === "ACTIVE" && /width repaired|customer page depth QC locked/i.test(existingDepth.latest_output ?? "")) {
    const closed = completeCanonicalWork(
      GLOBAL_PAGE_DEPTH_QC_WORK_ID,
      existingDepth.latest_output || "Related product paths width repaired · customer page depth QC locked · OccupancyNPV isolated artifact only",
    );
    if (closed) created.push(closed);
  } else if (!already(GLOBAL_PAGE_DEPTH_QC_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: GLOBAL_PAGE_DEPTH_QC_WORK_ID,
      mission_id: "mission:infinity:global-page-depth-qc-occupancynpv-layout-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
      description: "Repair OccupancyNPV related-paths width and lock customer-facing page depth QC by user intent and question coverage, not word count.",
      stage: "DESIGN / CONTENT / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "creative_studio", "product_lab", "quality_control", "systems_architect", "launch_operations"],
      assigned_workers: ["Venture Operator", "Design Core", "Creation Lab", "Validation Station", "Systems Architect", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Layout repaired; global page depth QC active",
      latest_output: "Related product paths width repaired · customer page depth QC locked · OccupancyNPV isolated artifact only",
      artifact_refs: [],
      evidence_refs: ["https://occupancynpv.com/pricing"],
      parent_work_id: OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID,
      traceability_links: ["https://occupancynpv.com/pricing", OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "GLOBAL_PAGE_DEPTH_QC_ACTIVE",
    }));
  }
  const existingVentureDepth = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID);
  if (existingVentureDepth?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID,
      existingVentureDepth.latest_output || "Venture-wide page depth uplift complete · isolated OccupancyNPV artifact only",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID,
      mission_id: "mission:occupancynpv:venture-wide-page-depth-uplift-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "OccupancyNPV — Venture-Wide Page Depth Uplift",
      description: "Bring every material OccupancyNPV customer page to the page-depth standard by question coverage and user intent, not word count.",
      stage: "RESEARCH / CONTENT / DESIGN / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "research_department", "creative_studio", "product_lab", "quality_control", "launch_operations"],
      assigned_workers: ["Venture Operator", "Research Grid", "Creation Lab", "Design Core", "Validation Station", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Venture-wide depth contracts, repairs, and HQ summary complete",
      latest_output: "Venture-wide page depth uplift complete · isolated OccupancyNPV artifact only",
      artifact_refs: ["dpl_4pWhet1Myqx7sMQ4Nnmgt2Gd5DRk"],
      evidence_refs: ["https://occupancynpv.com/", "https://occupancynpv.com/how-it-works", "https://occupancynpv.com/faq"],
      parent_work_id: GLOBAL_PAGE_DEPTH_QC_WORK_ID,
      traceability_links: ["https://occupancynpv.com/", GLOBAL_PAGE_DEPTH_QC_WORK_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_VENTURE_DEPTH_RECHECK_REQUIRED",
    }));
  }
  const existingVisualFaq = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID);
  if (existingVisualFaq?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID,
      existingVisualFaq.latest_output || "Homepage hero recomposed · FAQ clusters expanded · isolated OccupancyNPV artifact only",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID,
      mission_id: "mission:occupancynpv:founder-visual-faq-quality-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "OccupancyNPV — Founder Visual + FAQ Quality Repair",
      description: "Repair cramped homepage hero contrast and expand FAQ by buyer-intent clusters after founder physical contradiction.",
      stage: "DESIGN / CONTENT / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "creative_studio", "product_lab", "quality_control", "systems_architect", "launch_operations"],
      assigned_workers: ["Venture Operator", "Design Core", "Creation Lab", "Validation Station", "Systems Architect", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Hero recomposed; FAQ clusters expanded; global QC hardened",
      latest_output: "Homepage hero recomposed · FAQ clusters expanded · isolated OccupancyNPV artifact only",
      artifact_refs: ["dpl_HMaYVjg3NCKqyU22x1PWpbCgkFbh"],
      evidence_refs: ["https://occupancynpv.com/", "https://occupancynpv.com/faq"],
      parent_work_id: OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID,
      traceability_links: ["https://occupancynpv.com/", OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_OCCUPANCY_FINAL_RECHECK_REQUIRED",
    }));
  }
  const existingH1 = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID);
  if (existingH1?.status === "ACTIVE") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID,
      existingH1.latest_output || "Global H1 width repair · isolated OccupancyNPV artifact only",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID,
      mission_id: "mission:occupancynpv:global-h1-composition-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "OccupancyNPV — Global H1 Composition Repair",
      description: "Remove universal ch-width H1 crush on article pages and harden composition QC after founder contradiction.",
      stage: "DESIGN / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "creative_studio", "product_lab", "quality_control", "systems_architect", "launch_operations"],
      assigned_workers: ["Venture Operator", "Design Core", "Creation Lab", "Validation Station", "Systems Architect", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Article H1 width repaired; width/wrap gates inherited",
      latest_output: "Global H1 width repair · isolated OccupancyNPV artifact only",
      artifact_refs: ["dpl_AEfAHxgzRAxiAweearQJwGLPzJbW"],
      evidence_refs: ["https://occupancynpv.com/resources", "https://occupancynpv.com/how-it-works"],
      parent_work_id: OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID,
      traceability_links: ["https://occupancynpv.com/resources", OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_OCCUPANCY_FINAL_RECHECK_REQUIRED",
    }));
  }
  const existingLiveHq = listCanonicalWork().find((row) => row.work_id === LIGHTWEIGHT_LIVE_HQ_WORK_ID);
  if (existingLiveHq && existingLiveHq.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      LIGHTWEIGHT_LIVE_HQ_WORK_ID,
      "SSE-first HQ · visibility-aware fallback · favc1-cycle observation decoupled from dashboard lifecycle",
    );
    if (closed) created.push(closed);
  } else if (!already(LIGHTWEIGHT_LIVE_HQ_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: LIGHTWEIGHT_LIVE_HQ_WORK_ID,
      mission_id: "mission:infinity:lightweight-live-hq-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "SYSTEM_ARCHITECTURE",
      title: "Infinity — Lightweight Live HQ",
      description: "Event-driven HQ observation with visibility-aware fallback polling. Runtime stays live when HQ is closed.",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "COMPLETED",
      assigned_rooms: ["operations", "systems_architect", "product_lab", "quality_control", "intelligence_center"],
      assigned_workers: ["Venture Operator", "Systems Architect", "Creation Lab", "Validation Station", "Signal Intelligence"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "HQ observes via SSE; fallback 20s visible / paused or 3m hidden; favc1-cycle is runtime-owned",
      latest_output: "Lightweight live HQ ACTIVE · Growth Nexus idle · no Stripe/Mercury dashboard polling",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/operator-console/hq-live-policy.ts",
        "app/api/operator-console/hq-events/route.ts",
      ],
      parent_work_id: HQ_LIVE_WORK_PROJECTION_REPAIR_ID,
      traceability_links: [HQ_LIVE_WORK_PROJECTION_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "LIGHTWEIGHT_LIVE_HQ_ACTIVE",
    }));
  }
  const existingActionHq = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID);
  if (existingActionHq && existingActionHq.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID,
      "View Latest Comparison is a filled primary continuation inside the Compare NPV result panel",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID,
      mission_id: "mission:occupancynpv:app-action-hierarchy-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "OccupancyNPV — App Action Hierarchy Repair",
      description: "Make View Latest Comparison a primary continuation and lock global primary-action discoverability QC.",
      stage: "DESIGN / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "systems_architect", "product_lab", "quality_control", "intelligence_center", "launch_operations"],
      assigned_workers: ["Venture Operator", "Systems Architect", "Creation Lab", "Validation Station", "Signal Intelligence", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Result continuation filled and contextual; future ventures inherit action-hierarchy QC",
      latest_output: "View Latest Comparison PRIMARY_CONTINUATION · isolated OccupancyNPV artifact only",
      artifact_refs: [],
      evidence_refs: [
        "app/occupancynpv/app/workspaces/[id]/page.tsx",
        "lib/infinity/customer-page-depth/app-action-hierarchy.ts",
      ],
      parent_work_id: OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID,
      traceability_links: [OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_LIVE_HQ_RECHECK_REQUIRED",
    }));
  }
  const existingFaviconHq = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_FAVICON_REPAIR_ID);
  if (existingFaviconHq && existingFaviconHq.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_FAVICON_REPAIR_ID,
      "OccupancyNPV venture-specific navy O favicon is in isolated compose and live metadata",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_FAVICON_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_FAVICON_REPAIR_ID,
      mission_id: "mission:occupancynpv:favicon-production-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "QC",
      title: "OccupancyNPV — Favicon Production Repair",
      description: "Add a venture-specific browser-tab icon and lock VentureFaviconGate for future public ventures.",
      stage: "DESIGN / QC / DEPLOYMENT",
      status: "COMPLETED",
      assigned_rooms: ["operations", "systems_architect", "product_lab", "quality_control", "launch_operations"],
      assigned_workers: ["Venture Operator", "Systems Architect", "Creation Lab", "Validation Station", "Deployment Depot"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Navy geometric O icon + VentureFaviconGate inherited",
      latest_output: "favicon.ico /icon /apple-touch-icon.png · isolated OccupancyNPV artifact only",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/venture-operating-scale/occupancynpv-favicon.ts",
        "lib/infinity/universal-venture-system-qc/favicon.ts",
      ],
      parent_work_id: OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID,
      traceability_links: [OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_OCCUPANCY_FINAL_RECHECK_REQUIRED",
    }));
  }
  const existingBrandHq = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID);
  if (existingBrandHq && existingBrandHq.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID,
      "OccupancyNPV mark + wordmark + favicon QC inherited · FOUNDER_OCCUPANCY_BRAND_RECHECK_REQUIRED",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID,
      mission_id: "mission:occupancynpv:global-venture-brand-identity-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "DESIGN",
      title: "OccupancyNPV — Global Venture Brand Identity + Logo + Favicon QC",
      description: "Require a venture-specific logo/mark and favicon before FULL production-quality PASS, and render OccupancyNPV identity in public and app chrome.",
      stage: "DESIGN / QC",
      status: "COMPLETED",
      assigned_rooms: ["operations", "creative_studio", "product_lab", "quality_control", "systems_architect"],
      assigned_workers: ["Venture Operator", "Design Core", "Creation Lab", "Validation Station", "Systems Architect"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Mark + wordmark + inherited brand QC",
      latest_output: "OccupancyNPV MARK_PLUS_WORDMARK · favicon derived from compact O · FOUNDER_OCCUPANCY_BRAND_RECHECK_REQUIRED",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/venture-brand-identity/contract.ts",
        "lib/infinity/venture-website-architecture/site-chrome.ts",
      ],
      parent_work_id: OCCUPANCYNPV_FAVICON_REPAIR_ID,
      traceability_links: [OCCUPANCYNPV_FAVICON_REPAIR_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_OCCUPANCY_BRAND_RECHECK_REQUIRED",
    }));
  }
  const existingBrandDeploy = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID);
  if (existingBrandDeploy && existingBrandDeploy.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID,
      "Isolated OccupancyNPV brand deploy + HQ Infinity OS metadata · FOUNDER_OCCUPANCY_BRAND_RECHECK_REQUIRED",
    );
    if (closed) created.push(closed);
  } else if (!already(OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID,
      mission_id: "mission:occupancynpv:brand-deploy-hq-metadata-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "DEPLOYMENT",
      title: "OccupancyNPV Brand Deploy + HQ Default Metadata Repair",
      description: "Deploy isolated OccupancyNPV logo/favicon identity and replace HQ Create Next App metadata with Infinity OS.",
      stage: "DEPLOYMENT / QC",
      status: "COMPLETED",
      assigned_rooms: ["launch_operations", "operations", "quality_control", "systems_architect"],
      assigned_workers: ["Deployment Depot", "Venture Operator", "Validation Station", "Systems Architect"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Isolated OccupancyNPV artifact + HQ Infinity OS metadata",
      latest_output: "HQ title Infinity OS — HQ · OccupancyNPV brand context only when selected · FOUNDER_OCCUPANCY_BRAND_RECHECK_REQUIRED",
      artifact_refs: [],
      evidence_refs: [
        "app/layout.tsx",
        "lib/infinity/operator-console/hq-brand-context.ts",
        "lib/infinity/venture-operating-scale/occupancynpv-brand-identity-deployment.ts",
      ],
      parent_work_id: OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID,
      traceability_links: [OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_OCCUPANCY_BRAND_RECHECK_REQUIRED",
    }));
  }
  const existingFloorWiring = listCanonicalWork().find((row) => row.work_id === HQ_LIVE_FLOOR_WIRING_REPAIR_ID);
  if (existingFloorWiring && existingFloorWiring.status !== "COMPLETED") {
    const closed = completeCanonicalWork(
      HQ_LIVE_FLOOR_WIRING_REPAIR_ID,
      existingFloorWiring.latest_output || "CanonicalActiveWorkProjection drives Command and Operating Floor · FOUNDER_LIVE_FLOOR_RECHECK_REQUIRED",
    );
    if (closed) created.push(closed);
  } else if (!already(HQ_LIVE_FLOOR_WIRING_REPAIR_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: HQ_LIVE_FLOOR_WIRING_REPAIR_ID,
      mission_id: "mission:infinity:live-operating-floor-wiring-repair-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "SYSTEM_ARCHITECTURE",
      title: "Infinity — Live Operating Floor Wiring Repair + Brand State Consolidation",
      description: "One CanonicalActiveWorkProjection drives HQ Command, Operating Floor, rooms, and workers.",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "COMPLETED",
      assigned_rooms: ["systems_architect", "quality_control", "operations"],
      assigned_workers: ["Systems Architect", "Validation Station", "Venture Operator"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Resolver + duplicate compaction + live-floor gates",
      latest_output: "HQ Command and Operating Floor read the same current work · completed/superseded work cannot stay current · FOUNDER_LIVE_FLOOR_RECHECK_REQUIRED",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/canonical-work/resolver.ts",
        "lib/infinity/canonical-work/rows.ts",
        "lib/infinity/operator-console/hq-brand-context.ts",
      ],
      parent_work_id: OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID,
      traceability_links: [OCCUPANCYNPV_BRAND_DEPLOY_HQ_METADATA_WORK_ID],
      requires_infinity_worker_execution: false,
      next_expected_transition: "FOUNDER_LIVE_FLOOR_RECHECK_REQUIRED",
    }));
  }
  if (!already(MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID)) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID,
      mission_id: "mission:infinity:mercury-stripe-financial-truth-v1",
      venture_id: null,
      work_type: "SYSTEM_ARCHITECTURE",
      title: "Infinity — Mercury + Stripe Financial Truth",
      description: "Authoritative live cash, actual economics, modeled economics, and capital authority without configuring founder capital policy.",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "COMPLETED",
      assigned_rooms: [
        "operations",
        "strategy_finance",
        "systems_architect",
        "product_lab",
        "quality_control",
        "intelligence_center",
      ],
      assigned_workers: ["Systems Architect", "Profit Lab", "Validation Station", "Venture Operator"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Mercury + Stripe + canonical ledger projected to HQ",
      latest_output: "Financial truth layers separated · Mercury unread without credentials · FOUNDER_FINANCIAL_TRUTH_RECHECK_REQUIRED",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/financial-truth/project.ts",
        "components/dashboard/operator-console/hq-financial-truth-strip.tsx",
      ],
      parent_work_id: HQ_LIVE_FLOOR_WIRING_REPAIR_ID,
      traceability_links: [HQ_LIVE_FLOOR_WIRING_REPAIR_ID],
      requires_infinity_worker_execution: false,
      classification: "SYSTEM_INFRASTRUCTURE",
      next_expected_transition: "MERCURY_CONNECTION_REQUIRED",
    }));
  }
  const existingTreasury = listCanonicalWork().find((row) => row.work_id === TREASURY_CONTROL_CENTER_WORK_ID);
  if (!existingTreasury) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: TREASURY_CONTROL_CENTER_WORK_ID,
      mission_id: "mission:infinity:live-treasury-control-center-v1",
      venture_id: null,
      work_type: "SYSTEM_ARCHITECTURE",
      title: TREASURY_CONTROL_CENTER_WORK_TITLE,
      description: "Project live Mercury treasury cash, founder capital authority, and founder-editable budget/allocation controls onto HQ Command and the Treasury Control Center.",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "COMPLETED",
      assigned_rooms: [
        "operations",
        "strategy_finance",
        "systems_architect",
        "product_lab",
        "quality_control",
        "intelligence_center",
      ],
      assigned_workers: ["Venture Operator", "Profit Lab", "Systems Architect", "Creation Lab", "Validation Station"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "CanonicalTreasuryProjection + founder budget/allocation UI",
      latest_output: "HQ and Treasury share live Mercury $50 truth · compact Financial Pulse + full Treasury retained · floor idle after complete · FOUNDER_HQ_NAVIGATION_RECHECK_REQUIRED",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/financial-truth/treasury-projection.ts",
        "components/dashboard/operator-console/treasury-control-center.tsx",
      ],
      parent_work_id: MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID,
      traceability_links: [MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID],
      requires_infinity_worker_execution: false,
      classification: "SYSTEM_INFRASTRUCTURE",
      next_expected_transition: "FOUNDER_HQ_NAVIGATION_RECHECK_REQUIRED",
    }));
  } else if (existingTreasury.status === "ACTIVE") {
    const closed = markCanonicalWorkStatus(TREASURY_CONTROL_CENTER_WORK_ID, "COMPLETED", {
      updated_at: now,
      completed_at: now,
      latest_output: `${existingTreasury.latest_output} · COMPLETED · floor idle after complete`,
      next_expected_transition: "FOUNDER_HQ_NAVIGATION_RECHECK_REQUIRED",
    });
    if (closed) created.push(closed);
  }
  const existingNav = listCanonicalWork().find((row) => row.work_id === HQ_NAVIGATION_CLEANUP_WORK_ID);
  if (!existingNav) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: HQ_NAVIGATION_CLEANUP_WORK_ID,
      mission_id: "mission:infinity:hq-navigation-cleanup-v1",
      venture_id: null,
      work_type: "SYSTEM_ARCHITECTURE",
      title: HQ_NAVIGATION_CLEANUP_WORK_TITLE,
      description: "Remove redundant top View Operations, keep Operations Room + left nav, and make the floor show every live mission or piece of work, then go idle when none remain.",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "COMPLETED",
      assigned_rooms: [
        "operations",
        "systems_architect",
        "quality_control",
        "intelligence_center",
      ],
      assigned_workers: ["Venture Operator", "Systems Architect", "Validation Station"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "Standing current-work floor: live work + autonomous missions, idle when none",
      latest_output: "Floor lights live work and autonomous missions · idle when none remain · FOUNDER_HQ_NAVIGATION_RECHECK_REQUIRED",
      artifact_refs: [],
      evidence_refs: [
        "components/dashboard/hq-operating-summary-strip.tsx",
        "lib/infinity/canonical-work/project.ts",
      ],
      parent_work_id: TREASURY_CONTROL_CENTER_WORK_ID,
      traceability_links: [TREASURY_CONTROL_CENTER_WORK_ID],
      requires_infinity_worker_execution: false,
      classification: "SYSTEM_INFRASTRUCTURE",
      next_expected_transition: "FOUNDER_HQ_NAVIGATION_RECHECK_REQUIRED",
    }));
  } else if (existingNav.status === "ACTIVE") {
    const closed = markCanonicalWorkStatus(HQ_NAVIGATION_CLEANUP_WORK_ID, "COMPLETED", {
      updated_at: now,
      completed_at: now,
      latest_output: `${existingNav.latest_output} · COMPLETED · floor idle after complete`,
      next_expected_transition: "FOUNDER_HQ_NAVIGATION_RECHECK_REQUIRED",
    });
    if (closed) created.push(closed);
  }
  const existingSpendAuthority = listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_SPEND_AUTHORITY_WORK_ID);
  if (!already(OCCUPANCYNPV_SPEND_AUTHORITY_WORK_ID) && !process.env.VITEST) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_SPEND_AUTHORITY_WORK_ID,
      mission_id: "mission:occupancynpv:governed-venture-spend-authority-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "SYSTEM_ARCHITECTURE",
      title: OCCUPANCYNPV_SPEND_AUTHORITY_WORK_TITLE,
      description: "Keep OccupancyNPV $25 allocation distinct from the founder $5 spend ceiling, $0 commitments, $0 actual spend, and $0 paid acquisition. No money movement.",
      stage: "TREASURY / POLICY / QC",
      status: "COMPLETED",
      assigned_rooms: [
        "operations",
        "strategy_finance",
        "systems_architect",
        "quality_control",
        "intelligence_center",
      ],
      assigned_workers: ["Venture Operator", "Profit Lab", "Systems Architect", "Validation Station"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: now,
      blocked_reason: null,
      authorization_state: null,
      progress: "VentureSpendAuthority + commitment architecture on live $25/$5 OccupancyNPV layers",
      latest_output: "Founder $5 budget is current spend authority · $20 unused allocation · Mercury read-only · COMPLETED · floor idle after complete",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/financial-truth/spend-authority.ts",
        "components/dashboard/operator-console/treasury-control-center.tsx",
      ],
      parent_work_id: TREASURY_CONTROL_CENTER_WORK_ID,
      traceability_links: [TREASURY_CONTROL_CENTER_WORK_ID],
      requires_infinity_worker_execution: false,
      classification: "VENTURE_FINANCIAL",
      next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
    }));
  } else if (existingSpendAuthority?.status === "ACTIVE" && !process.env.VITEST) {
    ensureVerifiedSpendAuthorityMilestone(now);
    const closed = resolveCanonicalMissionCompletions(now);
    created.push(...closed.filter((row) => row.work_id === OCCUPANCYNPV_SPEND_AUTHORITY_WORK_ID));
  }
  if (!already(OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_ID) && !process.env.VITEST) {
    created.push(upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_ID,
      mission_id: "mission:occupancynpv:venture-financial-commitment-v1",
      venture_id: CRE_VENTURE_ID,
      work_type: "SYSTEM_ARCHITECTURE",
      title: OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_TITLE,
      description: "Create OccupancyNPV financial commitments as reserved spend authority, not money movement. Preserve $25 allocated / $5 authority / $0 committed / $0 actual / $0 paid acquisition.",
      stage: "TREASURY / POLICY / QC",
      status: "ACTIVE",
      assigned_rooms: [
        "operations",
        "strategy_finance",
        "systems_architect",
        "quality_control",
        "intelligence_center",
      ],
      assigned_workers: ["Venture Operator", "Profit Lab", "Systems Architect", "Validation Station"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: now,
      updated_at: now,
      completed_at: null,
      blocked_reason: null,
      authorization_state: null,
      progress: "VentureFinancialCommitment contract, gates, Treasury UI, isolated QC",
      latest_output: "Commitment layer in progress · no money movement · Mercury read-only",
      artifact_refs: [],
      evidence_refs: [
        "lib/infinity/financial-truth/spend-authority.ts",
        "lib/infinity/financial-truth/financial-commitment-gates.ts",
        "components/dashboard/operator-console/treasury-control-center.tsx",
      ],
      parent_work_id: TREASURY_CONTROL_CENTER_WORK_ID,
      traceability_links: [TREASURY_CONTROL_CENTER_WORK_ID],
      requires_infinity_worker_execution: false,
      classification: "VENTURE_FINANCIAL",
      next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
    }));
  } else if (listCanonicalWork().find((row) => row.work_id === OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_ID)?.status === "ACTIVE" && !process.env.VITEST) {
    ensureVerifiedCommitmentMilestone(now);
    const closed = resolveCanonicalMissionCompletions(now);
    created.push(...closed.filter((row) => row.work_id === OCCUPANCYNPV_FINANCIAL_COMMITMENT_WORK_ID));
  }
  return created;
}

export function parkOccupancyNpvHeroWorkForFounderRecheck(
  output: string,
  now = new Date().toISOString(),
): CanonicalWorkExecutionContract | null {
  return markCanonicalWorkStatus(OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID, "AUTHORIZATION_REQUIRED", {
    updated_at: now,
    authorization_state: "FOUNDER_HERO_RECHECK_REQUIRED",
    progress: "Waiting on founder physical hero recheck",
    latest_output: output,
    next_expected_transition: "FOUNDER_HERO_RECHECK_REQUIRED",
  });
}

export function projectVentureCurrentWork(ventureId: string) {
  const rows = listCanonicalWork().filter((row) => row.venture_id === ventureId);
  const current = pickCurrentCanonicalWork(rows);
  const latestCompleted = pickLatestCompletedCanonicalWork(rows);
  const latestVenture = projectLatestVentureWork(rows, ventureId);
  const parked = rows.find((row) => row.status === "AUTHORIZATION_REQUIRED") ?? null;
  return {
    current_work: current?.title ?? null,
    current_mission: current?.mission_id ?? null,
    current_stage: current?.stage ?? null,
    assigned_rooms: current?.assigned_rooms.join(", ") ?? null,
    assigned_workers: current?.assigned_workers.join(", ") ?? null,
    latest_output: current?.latest_output ?? latestVenture?.latest_output ?? latestCompleted?.latest_output ?? null,
    started: current?.started_at ?? null,
    status: current?.status ?? null,
    source: current ? sourceLabel(current.source) : null,
    traceability: current?.traceability_links.join(" · ") || current?.work_id || null,
    latest_completed: latestCompleted?.title ?? null,
    latest_completed_at: latestCompleted?.completed_at ?? latestCompleted?.updated_at ?? null,
    parked_authorization: parked?.title ?? null,
    latest_venture_work: latestVenture?.mission_title ?? null,
    latest_venture_work_id: latestVenture?.work_id ?? null,
    latest_venture_work_at: latestVenture?.completed_at ?? latestVenture?.updated_at ?? null,
    latest_venture_classification: latestVenture?.classification ?? null,
    recent_venture_work: projectRecentVentureWorkHistory(rows, ventureId).map((item) => ({
      mission: item.title,
      classification: item.classification,
      status: item.status,
      completed: item.completedAt,
      latest_output: item.latestOutput,
      trace: item.trace,
    })),
    recent_system_activity: projectRecentSystemActivityHistory(listCanonicalWork()).map((item) => ({
      mission: item.title,
      classification: item.classification,
      status: item.status,
      completed: item.completedAt,
      latest_output: item.latestOutput,
      trace: item.trace,
    })),
    parked_classification: parked ? classifyCanonicalWork(parked).classification : null,
  };
}
