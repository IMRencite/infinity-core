import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { chromaKeyPromptSuffix } from "../lot-line-chroma-key.ts";
import {
  chromaKeyPromptTypeContractQc,
  runClubThrottleAutonomousProductPipeline,
} from "../club-throttle-autonomous-product-pipeline-v1.ts";
import { compileIsolatedGraphicProviderPrompt, v43ProviderPromptIsolationQc } from "../club-throttle-v43-provider-graphic-prompt-v1.ts";
import type { ClubThrottleConceptBrief } from "../club-throttle-concept-preflight.ts";
import {
  postProcessClubThrottleProviderRaster,
  V43_AUTONOMOUS_CHROMA_KEY,
} from "../club-throttle-v43-print-post-process-v1.ts";
import { evaluateApparelPrintProductionQc } from "../club-throttle-apparel-print-production-qc.ts";

const briefFixture: ClubThrottleConceptBrief = {
  concept_id: "ct-merch-concept-v43-3",
  name: "After Dark Throttle",
  target_rider: "Night riders",
  motorcycle_archetypes: ["GENERAL_RIDER"],
  design_mode: "TYPOGRAPHY_FIRST",
  front_back_approach: "Large isolated back-print artwork composition",
  market_signals: ["Night ride culture signal with sufficient length for QC pass threshold."],
  commercial_hook: "Bold club throttle night energy differentiation hook.",
  differs_from_lot_line: "Not a sodium parking lot scene",
  phrase: null,
};

describe("club-throttle-autonomous-product-pipeline-v1", () => {
  it("CHROMA_KEY_PROMPT_TYPE_CONTRACT_QC — suffix never emits undefined/NaN RGB", () => {
    const bad = chromaKeyPromptSuffix("green" as unknown as typeof V43_AUTONOMOUS_CHROMA_KEY);
    expect(chromaKeyPromptTypeContractQc(bad)).toBe("FAIL");
    const good = chromaKeyPromptSuffix(V43_AUTONOMOUS_CHROMA_KEY);
    expect(chromaKeyPromptTypeContractQc(good)).toBe("PASS");
    expect(good).toMatch(/RGB\(255,0,255\)/);
  });

  it("V43_PROVIDER_PROMPT_ISOLATION_QC — provider prompt has zero garment priming", () => {
    const prompt = compileIsolatedGraphicProviderPrompt(briefFixture, V43_AUTONOMOUS_CHROMA_KEY);
    expect(v43ProviderPromptIsolationQc(prompt)).toBe("PASS");
    expect(prompt).toMatch(/standalone graphic emblem/i);
  });

  it("CT_V43_PRINT_POST_PROCESS_QC — keyed fixture yields alpha perimeter before print QC", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ct-v43-pipeline-"));
    const rawPath = join(dir, "raw-provider.png");
    const processedPath = join(dir, "post-processed.png");
    const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="rgb(255,0,255)"/>
      <circle cx="200" cy="200" r="120" fill="rgb(20,20,20)"/>
      <text x="200" y="210" text-anchor="middle" fill="white" font-size="28" font-family="sans-serif">CT</text>
    </svg>`;
    writeFileSync(rawPath, await sharp(Buffer.from(svg)).png().toBuffer());

    const post = await postProcessClubThrottleProviderRaster({ rawPath, processedPath });
    expect(post.used_native_alpha).toBe(false);

    const meta = await sharp(processedPath).metadata();
    expect(meta.hasAlpha).toBe(true);
    const { data, info } = await sharp(processedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const tl = data[3]!;
    const tr = data[(info.width - 1) * 4 + 3]!;
    expect(tl).toBe(0);
    expect(tr).toBe(0);

    const printQc = await evaluateApparelPrintProductionQc(processedPath);
    expect(printQc).toBeDefined();
  });

  it("CT_CREATIVE_PIPELINE_REGRESSION_QC — dry-run skips provider; live path uses post-processed art", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "ct-v43-dry-"));
    const concept = {
      concept_id: "ct-merch-concept-v43-3",
      theme: briefFixture.name,
      market_signal: briefFixture.market_signals[0]!,
      brand_fit_score: 85,
      differentiation_note: briefFixture.commercial_hook,
    };
    const dry = await runClubThrottleAutonomousProductPipeline({
      concept,
      cwd,
      execute_live_creative: false,
    });
    expect(dry.held_reason).toBe("LIVE_CREATIVE_NOT_REQUESTED");
    expect(dry.CLUB_THROTTLE_RASTER_ART_GENERATION_QC).toBe("SKIPPED");

    const attemptId = "fixture-attempt-0";
    const outDir = join(cwd, ".infinity/commerce/autonomous-product-pipeline", concept.concept_id);
    const attemptDir = join(outDir, "attempts", attemptId);
    mkdirSync(attemptDir, { recursive: true });
    const rawPath = join(attemptDir, "raw-provider.png");
    const processedPath = join(attemptDir, "post-processed.png");
    const svg = `<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="320" fill="rgb(255,0,255)"/>
      <rect x="80" y="60" width="160" height="200" rx="8" fill="rgb(30,30,30)"/>
    </svg>`;
    writeFileSync(rawPath, await sharp(Buffer.from(svg)).png().toBuffer(), { flag: "wx" });
    await postProcessClubThrottleProviderRaster({ rawPath, processedPath });
    const hash1 = readFileSync(processedPath).toString("hex").slice(0, 8);
    expect(existsSync(rawPath)).toBe(true);
    expect(existsSync(processedPath)).toBe(true);

    const attemptId2 = "fixture-attempt-1";
    const attemptDir2 = join(outDir, "attempts", attemptId2);
    mkdirSync(attemptDir2, { recursive: true });
    writeFileSync(join(attemptDir2, "raw-provider.png"), readFileSync(rawPath));
    await postProcessClubThrottleProviderRaster({
      rawPath: join(attemptDir2, "raw-provider.png"),
      processedPath: join(attemptDir2, "post-processed.png"),
    });
    expect(existsSync(join(attemptDir, "raw-provider.png"))).toBe(true);
    expect(existsSync(join(attemptDir2, "raw-provider.png"))).toBe(true);
    expect(hash1).toBeTruthy();
  });
});
