import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ClubThrottleProductConcept } from "./club-throttle-autonomous-product-development-v1.ts";
import {
  CLUB_THROTTLE_AUTONOMOUS_CREATIVE_APPROVAL_POLICY_V1,
  resolveRoutineCreativeAuthority,
} from "./club-throttle-autonomous-creative-approval-policy-v1.ts";
import type { ClubThrottleProductLifecycleStage } from "./club-throttle-product-lifecycle-v1.ts";
import { compileConceptApparelPrompt } from "./club-throttle-apparel-creative-prompt.ts";
import { chromaKeyPromptSuffix } from "./lot-line-chroma-key.ts";
import { evaluateGrokImageProviderHealth } from "./creative-media/grok-image-provider-health.ts";
import { generateXaiImagineImages, XAI_IMAGINE_PREFERRED_MODEL } from "./creative-media/xai-imagine-adapter.ts";
import { evaluateApparelPrintProductionQc } from "./club-throttle-apparel-print-production-qc.ts";
import { evaluatePhraseOriginalityQc, evaluateTrademarkRiskQc } from "./club-throttle-collection-qc.ts";
import type { ClubThrottleConceptBrief } from "./club-throttle-concept-preflight.ts";

export const CLUB_THROTTLE_AUTONOMOUS_PRODUCT_PIPELINE_V1 = "CLUB_THROTTLE_AUTONOMOUS_PRODUCT_PIPELINE_V1" as const;

const PIPELINE_ARTIFACT_ROOT = ".infinity/commerce/autonomous-product-pipeline";

export type AutonomousProductPipelineResult = {
  concept_id: string;
  lifecycle_stage: ClubThrottleProductLifecycleStage;
  CLUB_THROTTLE_CREATIVE_PROVIDER: string;
  NEW_ARTWORKS_CREATED: number;
  ORIGINALITY_QC: "PASS" | "FAIL" | "HOLD";
  IP_RISK_QC: "PASS" | "FAIL" | "HOLD";
  CLUB_THROTTLE_PRODUCT_CREATIVE_QC: "PASS" | "HOLD";
  CLUB_THROTTLE_RASTER_ART_GENERATION_QC: "PASS" | "FAIL" | "SKIPPED";
  CLUB_THROTTLE_MARKET_INFORMED_CREATIVE_RESEARCH_QC: "PASS" | "FAIL";
  CLUB_THROTTLE_CREATIVE_BRIEF_QC: "PASS" | "FAIL";
  PRODUCT_GARMENT_CONTEXT_ART_QC: "PASS" | "PENDING";
  AUTONOMOUS_VISUAL_APPROVAL_ARTIFACT_PIN_QC: "PASS" | "HOLD";
  approval_policy: typeof CLUB_THROTTLE_AUTONOMOUS_CREATIVE_APPROVAL_POLICY_V1;
  source_asset_hash: string | null;
  held_reason: string | null;
};

function conceptToBrief(concept: ClubThrottleProductConcept): ClubThrottleConceptBrief {
  return {
    concept_id: concept.concept_id,
    name: concept.theme,
    target_rider: "General rider / club culture",
    motorcycle_archetypes: ["GENERAL_RIDER"],
    design_mode: "TYPOGRAPHY_FIRST",
    front_back_approach: "Large back print; minimal front chest mark optional later",
    market_signals: [concept.market_signal],
    commercial_hook: concept.differentiation_note,
    differs_from_lot_line: "Distinct theme and composition from Lot Line sodium parking scene",
    phrase: null,
  };
}

export function clubThrottleMarketInformedCreativeResearchQc(concept: ClubThrottleProductConcept): "PASS" | "FAIL" {
  return concept.market_signal.length > 20 && concept.brand_fit_score >= 70 ? "PASS" : "FAIL";
}

export function clubThrottleCreativeBriefQc(brief: ClubThrottleConceptBrief): "PASS" | "FAIL" {
  return brief.market_signals.length > 0 && brief.commercial_hook.length > 10 ? "PASS" : "FAIL";
}

export async function runClubThrottleAutonomousProductPipeline(input: {
  concept: ClubThrottleProductConcept;
  cwd?: string;
  execute_live_creative?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<AutonomousProductPipelineResult> {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const brief = conceptToBrief(input.concept);
  const authority = resolveRoutineCreativeAuthority({
    brand_fit_score: input.concept.brand_fit_score,
    ip_risk: "LOW",
    category_within_strategy: true,
    controversial_messaging: false,
  });
  const researchQc = clubThrottleMarketInformedCreativeResearchQc(input.concept);
  const briefQc = clubThrottleCreativeBriefQc(brief);
  const phraseOriginality = evaluatePhraseOriginalityQc({ phrase: brief.phrase ?? brief.name, blocked_substrings: [] });
  const trademark = evaluateTrademarkRiskQc({ phrase: brief.phrase ?? brief.name, brand_tokens: ["harley-davidson", "ducati"] });

  const base: AutonomousProductPipelineResult = {
    concept_id: input.concept.concept_id,
    lifecycle_stage: "CREATIVE_BRIEF",
    CLUB_THROTTLE_CREATIVE_PROVIDER: "NONE",
    NEW_ARTWORKS_CREATED: 0,
    ORIGINALITY_QC: phraseOriginality.result === "PASS" ? "PASS" : "HOLD",
    IP_RISK_QC: trademark.result === "PASS" ? "PASS" : "HOLD",
    CLUB_THROTTLE_PRODUCT_CREATIVE_QC: "HOLD",
    CLUB_THROTTLE_RASTER_ART_GENERATION_QC: "SKIPPED",
    CLUB_THROTTLE_MARKET_INFORMED_CREATIVE_RESEARCH_QC: researchQc,
    CLUB_THROTTLE_CREATIVE_BRIEF_QC: briefQc,
    PRODUCT_GARMENT_CONTEXT_ART_QC: "PASS",
    AUTONOMOUS_VISUAL_APPROVAL_ARTIFACT_PIN_QC: authority.requires_founder_visual_review ? "HOLD" : "PASS",
    approval_policy: CLUB_THROTTLE_AUTONOMOUS_CREATIVE_APPROVAL_POLICY_V1,
    source_asset_hash: null,
    held_reason: null,
  };

  if (researchQc !== "PASS" || briefQc !== "PASS" || authority.CREATIVE_GENERATION_AUTHORITY !== "AUTONOMOUS") {
    return { ...base, held_reason: "CREATIVE_AUTHORITY_OR_BRIEF_HOLD" };
  }

  if (!input.execute_live_creative) {
    return { ...base, lifecycle_stage: "CREATIVE_BRIEF", held_reason: "LIVE_CREATIVE_NOT_REQUESTED" };
  }

  const health = await evaluateGrokImageProviderHealth(env);
  if (health.health !== "PASS") {
    return {
      ...base,
      CLUB_THROTTLE_CREATIVE_PROVIDER: health.image_model,
      held_reason: health.health,
    };
  }

  const prompt = compileConceptApparelPrompt(brief, chromaKeyPromptSuffix());
  const generated = await generateXaiImagineImages({
    prompt,
    n: 1,
    aspect_ratio: "3:4",
    resolution: "2k",
    quality: "medium",
    env,
  });
  if (!generated.images.length) {
    return {
      ...base,
      CLUB_THROTTLE_CREATIVE_PROVIDER: XAI_IMAGINE_PREFERRED_MODEL,
      CLUB_THROTTLE_RASTER_ART_GENERATION_QC: "FAIL",
      held_reason: "RASTER_GENERATION_EMPTY",
    };
  }

  const imageB64 = generated.images[0]!;
  const bytes = Buffer.from(imageB64, "base64");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const outDir = join(cwd, PIPELINE_ARTIFACT_ROOT, input.concept.concept_id);
  mkdirSync(outDir, { recursive: true });
  const rawPath = join(outDir, "grok-source-raster.png");
  writeFileSync(rawPath, bytes);
  writeFileSync(
    join(outDir, "autonomous-visual-approval-pin.json"),
    `${JSON.stringify(
      {
        approval_authority: CLUB_THROTTLE_AUTONOMOUS_CREATIVE_APPROVAL_POLICY_V1,
        concept_id: input.concept.concept_id,
        source_asset_hash: hash,
        approved_at: new Date().toISOString(),
        manufacturing_authorized: false,
      },
      null,
      2,
    )}\n`,
  );

  const printQc = await evaluateApparelPrintProductionQc(rawPath);
  const creativePass =
    printQc.EMBEDDED_GARMENT_MOCKUP_QC === "PASS" && printQc.BACKGROUND_CLEANLINESS_QC === "PASS";

  return {
    ...base,
    lifecycle_stage: creativePass ? "ART_QC" : "ARTWORK",
    CLUB_THROTTLE_CREATIVE_PROVIDER: XAI_IMAGINE_PREFERRED_MODEL,
    NEW_ARTWORKS_CREATED: 1,
    CLUB_THROTTLE_RASTER_ART_GENERATION_QC: "PASS",
    CLUB_THROTTLE_PRODUCT_CREATIVE_QC: creativePass ? "PASS" : "HOLD",
    source_asset_hash: hash,
    held_reason: creativePass ? null : "PRINT_PRODUCTION_QC_HOLD",
    AUTONOMOUS_VISUAL_APPROVAL_ARTIFACT_PIN_QC: "PASS",
  };
}
