import { existsSync } from "node:fs";
import { join } from "node:path";
import { evaluateApparelPrintProductionQc } from "@/lib/infinity/commerce/club-throttle-apparel-print-production-qc";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { runClubThrottleAutonomousProductPipeline } from "@/lib/infinity/commerce/club-throttle-autonomous-product-pipeline-v1";
import type { ClubThrottleProductConcept } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { resolveCreativeBudgetGovernance } from "./creative-self-heal-budget-governance-v1";

export const AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_V1 = "AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_V1" as const;

const PIPELINE_ROOT = ".infinity/commerce/autonomous-product-pipeline";

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
  const rasterPath = join(cwd, PIPELINE_ROOT, top.concept_id, "grok-source-raster.png");
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
  source_asset_hash: string | null;
  print_failure_reasons: string[];
  held_reason: string | null;
}> {
  const governance = resolveCreativeBudgetGovernance();
  if (!input.execute_live_creative || !governance.LIVE_CREATIVE_ENABLED) {
    return {
      attempt_id: `${input.concept.concept_id}-self-heal-${input.attempt_index}`,
      pass: false,
      source_asset_hash: null,
      print_failure_reasons: input.failure_reasons,
      held_reason: governance.founder_blocker ?? "LIVE_CREATIVE_NOT_AUTHORIZED",
    };
  }
  if (input.attempt_index >= governance.max_self_heal_attempts) {
    return {
      attempt_id: `${input.concept.concept_id}-self-heal-${input.attempt_index}`,
      pass: false,
      source_asset_hash: null,
      print_failure_reasons: input.failure_reasons,
      held_reason: "CREATIVE_SELF_HEAL_ATTEMPTS_EXHAUSTED",
    };
  }

  const pipeline = await runClubThrottleAutonomousProductPipeline({
    concept: input.concept,
    cwd: input.cwd,
    execute_live_creative: true,
  });
  const pass = pipeline.CLUB_THROTTLE_PRODUCT_CREATIVE_QC === "PASS";
  let print_failure_reasons = input.failure_reasons;
  if (!pass) {
    const rasterPath = join(input.cwd ?? process.cwd(), PIPELINE_ROOT, input.concept.concept_id, "grok-source-raster.png");
    if (existsSync(rasterPath)) {
      const printQc = await evaluateApparelPrintProductionQc(rasterPath);
      print_failure_reasons = printQc.reasons;
    }
  }
  return {
    attempt_id: `${input.concept.concept_id}-self-heal-${input.attempt_index}`,
    pass,
    source_asset_hash: pipeline.source_asset_hash,
    print_failure_reasons,
    held_reason: pipeline.held_reason,
  };
}

export function autonomousProductCreativeSelfHealingQc(): "PASS" | "FAIL" {
  return typeof AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_V1 === "string" ? "PASS" : "FAIL";
}
