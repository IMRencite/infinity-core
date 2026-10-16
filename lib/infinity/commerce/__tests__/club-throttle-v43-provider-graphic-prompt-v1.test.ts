import { describe, expect, it } from "vitest";
import {
  compileIsolatedGraphicProviderPrompt,
  creativeRetryStrategyChangedQc,
  scanProviderPromptGarmentTerms,
  v43ProviderPromptIsolationQc,
} from "../club-throttle-v43-provider-graphic-prompt-v1.ts";
import { compileConceptPrintArtOnlyPrompt } from "../club-throttle-apparel-creative-prompt.ts";
import { chromaKeyPromptSuffix } from "../lot-line-chroma-key.ts";
import { V43_AUTONOMOUS_CHROMA_KEY } from "../club-throttle-v43-print-post-process-v1.ts";
import type { ClubThrottleConceptBrief } from "../club-throttle-concept-preflight.ts";

const brief: ClubThrottleConceptBrief = {
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

describe("club-throttle-v43-provider-graphic-prompt-v1", () => {
  it("V43_PROVIDER_PROMPT_ISOLATION_QC — zero positive garment priming", () => {
    const isolated = compileIsolatedGraphicProviderPrompt(brief, V43_AUTONOMOUS_CHROMA_KEY);
    const scan = scanProviderPromptGarmentTerms(isolated);
    expect(v43ProviderPromptIsolationQc(isolated)).toBe("PASS");
    expect(scan.CT_POSITIVE_GARMENT_PRIMING_TERMS).toEqual([]);
    expect(creativeRetryStrategyChangedQc(isolated, V43_AUTONOMOUS_CHROMA_KEY)).toBe("PASS");
  });

  it("legacy print-art-only prompt contained garment priming (root cause evidence)", () => {
    const legacy = compileConceptPrintArtOnlyPrompt(brief, chromaKeyPromptSuffix(V43_AUTONOMOUS_CHROMA_KEY));
    const scan = scanProviderPromptGarmentTerms(legacy);
    expect(scan.CT_FINAL_PROVIDER_PROMPT_GARMENT_TERMS.length).toBeGreaterThan(0);
    expect(scan.CT_POSITIVE_GARMENT_PRIMING_TERMS.length).toBeGreaterThan(0);
  });
});
