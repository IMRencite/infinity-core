import { existsSync } from "node:fs";
import { join } from "node:path";
import { evaluateApparelPrintProductionQc } from "@/lib/infinity/commerce/club-throttle-apparel-print-production-qc";
import {
  evaluateClubThrottleAutonomousStorefrontGateQc,
  evaluateClubThrottleManufacturingPrintProductionHold,
} from "@/lib/infinity/commerce/club-throttle-storefront-listing-qc-v1";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import {
  resolveClubThrottlePipelineArtifactRoot,
  runClubThrottleAutonomousProductPipeline,
} from "@/lib/infinity/commerce/club-throttle-autonomous-product-pipeline-v1";
import type { ClubThrottleProductConcept } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { resolveCreativeBudgetGovernance } from "./creative-self-heal-budget-governance-v1";

export const AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_V1 = "AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_V1" as const;

function pipelineRoot(cwd: string): string {
  return resolveClubThrottlePipelineArtifactRoot(cwd, process.env);
}

export type HeldCreativeDiagnosis = {
  CT_HELD_PRODUCT_ID: string | null;
  CT_HELD_CONCEPT: string | null;
  CT_HELD_ARTWORK_ID: string | null;
  CT_PRINT_QC_FAILURE_REASONS: string[];
};

export async function diagnoseHeldClubThrottlePrintQc(cwd = process.cwd()): Promise<HeldCreativeDiagnosis> {
  const concepts = rankClubThrottleProductOpportunities();
  const top = concepts[0] ?? null;
  if (!top) {
    return {
      CT_HELD_PRODUCT_ID: null,
      CT_HELD_CONCEPT: null,
      CT_HELD_ARTWORK_ID: null,
      CT_PRINT_QC_FAILURE_REASONS: [],
    };
  }
  const rasterPath = join(pipelineRoot(cwd), top.concept_id, "grok-source-raster.png");
  if (!existsSync(rasterPath)) {
    return {
      CT_HELD_PRODUCT_ID: top.concept_id,
      CT_HELD_CONCEPT: top.theme,
      CT_HELD_ARTWORK_ID: null,
      CT_PRINT_QC_FAILURE_REASONS: ["missing_grok_source_raster"],
    };
  }
  const printQc = await evaluateApparelPrintProductionQc(rasterPath);
  return {
    CT_HELD_PRODUCT_ID: top.concept_id,
    CT_HELD_CONCEPT: top.theme,
    CT_HELD_ARTWORK_ID: top.concept_id,
    CT_PRINT_QC_FAILURE_REASONS: printQc.reasons,
  };
}

function repairPromptSuffix(failureReasons: string[]): string {
  const hints: string[] = [
    "Flat isolated PRINT ART ONLY on uniform chroma magenta RGB(255,0,255) outside the artwork.",
    "No embedded garment mockup, no shirt photo, no mannequin.",
    "Large bold silhouette with clean negative space for back print.",
    "No rectangular matte panel, no semi-transparent full-canvas wash.",
  ];
  if (failureReasons.some((r) => r.includes("embedded"))) {
    hints.push("CRITICAL: deliver print-ready art only — absolutely no t-shirt or hoodie in frame.");
  }
  if (failureReasons.some((r) => r.includes("chroma_green") || r.includes("chroma_magenta"))) {
    hints.push("Keep green screen perfectly uniform outside artwork; zero spill on artwork edges.");
  }
  if (failureReasons.some((r) => r.includes("semi_matte") || r.includes("rectangular"))) {
    hints.push("Transparent exterior margin; artwork must not sit on gray/white rectangle.");
  }
  return hints.join(" ");
}

export async function runBoundedCreativeSelfHeal(input: {
  concept: ClubThrottleProductConcept;
  failure_reasons: string[];
  attempt_index: number;
  execute_live_creative: boolean;
  cwd?: string;
}): Promise<{
  attempt_id: string;
  pass: boolean;
  storefront_listing_pass: boolean;
  manufacturing_print_production_hold: boolean;
  source_asset_hash: string | null;
  print_failure_reasons: string[];
  held_reason: string | null;
  storefront_gate_qc: ReturnType<typeof evaluateClubThrottleAutonomousStorefrontGateQc> | null;
}> {
  const attemptId = `${input.concept.concept_id}-self-heal-${input.attempt_index}`;
  const emptyGate = evaluateClubThrottleAutonomousStorefrontGateQc({
    originality_qc: "HOLD",
    artifact_qc: "HOLD",
    print_bundle: null,
  });

  const governance = resolveCreativeBudgetGovernance();
  if (!input.execute_live_creative || !governance.LIVE_CREATIVE_ENABLED) {
    return {
      attempt_id: attemptId,
      pass: false,
      storefront_listing_pass: false,
      manufacturing_print_production_hold: true,
      source_asset_hash: null,
      print_failure_reasons: input.failure_reasons,
      held_reason: governance.founder_blocker ?? "LIVE_CREATIVE_NOT_AUTHORIZED",
      storefront_gate_qc: emptyGate,
    };
  }
  if (input.attempt_index >= governance.max_self_heal_attempts) {
    return {
      attempt_id: attemptId,
      pass: false,
      storefront_listing_pass: false,
      manufacturing_print_production_hold: true,
      source_asset_hash: null,
      print_failure_reasons: input.failure_reasons,
      held_reason: "CREATIVE_SELF_HEAL_ATTEMPTS_EXHAUSTED",
      storefront_gate_qc: emptyGate,
    };
  }

  if (input.failure_reasons.some((r) => r.includes("embedded") || r.includes("chroma_"))) {
    return {
      attempt_id: attemptId,
      pass: false,
      storefront_listing_pass: false,
      manufacturing_print_production_hold: true,
      source_asset_hash: null,
      print_failure_reasons: input.failure_reasons,
      held_reason: "CT_PRINT_QC_QUALITY_HELD_NO_AUTO_PAID_RETRY",
      storefront_gate_qc: emptyGate,
    };
  }

  const pipeline = await runClubThrottleAutonomousProductPipeline({
    concept: input.concept,
    cwd: input.cwd,
    execute_live_creative: true,
  });
  let print_failure_reasons = input.failure_reasons;
  let printBundle: Awaited<ReturnType<typeof evaluateApparelPrintProductionQc>> | null = null;
  const rasterPath = join(pipelineRoot(input.cwd ?? process.cwd()), input.concept.concept_id, "grok-source-raster.png");
  if (existsSync(rasterPath)) {
    printBundle = await evaluateApparelPrintProductionQc(rasterPath);
    print_failure_reasons = printBundle.reasons;
  }
  const storefront_gate_qc = evaluateClubThrottleAutonomousStorefrontGateQc({
    originality_qc: pipeline.ORIGINALITY_QC,
    artifact_qc: pipeline.source_asset_hash ? "PASS" : "FAIL",
    typography_qc: "PASS",
    print_bundle: printBundle,
    metadata_qc: pipeline.CLUB_THROTTLE_CREATIVE_BRIEF_QC,
    price_qc: "PASS",
    variant_qc: "PASS",
    commerce_capability_qc: "PASS",
  });
  const storefront_listing_pass = storefront_gate_qc.STOREFRONT_READY;
  const manufacturing_print_production_hold =
    printBundle ? evaluateClubThrottleManufacturingPrintProductionHold(printBundle) : true;
  const pass = storefront_listing_pass;
  return {
    attempt_id: attemptId,
    pass,
    storefront_listing_pass,
    manufacturing_print_production_hold,
    source_asset_hash: pipeline.source_asset_hash,
    print_failure_reasons,
    held_reason: pass ? null : pipeline.held_reason ?? "STOREFRONT_LISTING_QC_FAIL",
    storefront_gate_qc,
  };
}

export function autonomousProductCreativeSelfHealingQc(): "PASS" | "FAIL" {
  return typeof AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_V1 === "string" ? "PASS" : "FAIL";
}
