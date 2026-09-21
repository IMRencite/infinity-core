import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROFIT_LAB_CARD_SPACING_GATE,
  PROFIT_LAB_SPACING_TOKENS,
  RENDERED_PROFIT_LAB_ECONOMICS_QUALITY_GATE,
  economicsPresentationKind,
  evaluateProfitLabCardSpacingGate,
  evaluateRenderedProfitLabEconomicsQualityGate,
  presentationClassName,
} from "../presentation";

const ROOT = process.cwd();

describe("ProfitLabCardSpacingGate", () => {
  it("requires roomier value-card padding and readable line-height", () => {
    const gate = evaluateProfitLabCardSpacingGate({
      horizontalPaddingPx: PROFIT_LAB_SPACING_TOKENS.valuePadX,
      verticalPaddingPx: PROFIT_LAB_SPACING_TOKENS.valuePadY,
      lineHeight: PROFIT_LAB_SPACING_TOKENS.lineHeight,
      textBorderGapPx: PROFIT_LAB_SPACING_TOKENS.minTextBorderGap,
      longTextInCompactPill: false,
      overflow: false,
    });
    expect(gate.gate).toBe(PROFIT_LAB_CARD_SPACING_GATE);
    expect(gate.result).toBe("PASS");
  });

  it("fails cramped pills and text-border collisions", () => {
    const gate = evaluateProfitLabCardSpacingGate({
      horizontalPaddingPx: 4,
      verticalPaddingPx: 2,
      lineHeight: 1.1,
      textBorderGapPx: 2,
      longTextInCompactPill: true,
      overflow: true,
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining([
      "HORIZONTAL_PADDING_CRAMPED",
      "VERTICAL_PADDING_CRAMPED",
      "LINE_HEIGHT_CRAMPED",
      "TEXT_BORDER_COLLISION",
      "LONG_TEXT_IN_COMPACT_PILL",
      "OVERFLOW_OR_CLIPPING",
    ]));
  });

  it("renders long UNKNOWN economics as explanation blocks, not compact pills", () => {
    const longA = "UNKNOWN — official price is contact-sales; no public rate card found";
    const longB = "UNKNOWN — spreadsheet software is general-purpose; lease-model cost is labor, not a product SKU";
    expect(economicsPresentationKind(longA)).toBe("explanation");
    expect(economicsPresentationKind(longB)).toBe("explanation");
    expect(presentationClassName("explanation")).toBe("hq-econ-explanation-body");
    expect(economicsPresentationKind("HIGH")).toBe("classification_tag");
    expect(presentationClassName("classification_tag", "HIGH")).toBe("hq-circular-orb");
    expect(economicsPresentationKind("$290/year")).toBe("economic_value");
    expect(presentationClassName("economic_value", "$290/year")).toBe("hq-circular-orb");
  });

  it("keeps OccupancyNPV prices in source economics", () => {
    const source = readFileSync(join(ROOT, "lib/infinity/venture-economics/occupancynpv.ts"), "utf8");
    expect(source).toContain("$290/year");
    expect(source).toContain("$149");
    expect(source).not.toMatch(/\$280\/year|\$199 Per-Deal/);
  });

  it("circular economics chips have inner padding so text stays inside the circle", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/\.hq-metric-badge \{[\s\S]*?padding:\s*0\.35rem\s+0\.7rem/);
    expect(css).toMatch(/\.hq-status-badge \{[\s\S]*?padding:\s*0\.35rem\s+0\.7rem/);
  });

  it("CSS value cards have 16px/12px padding and do not use pill geometry for explanations", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/\.hq-output-card,[\s\S]*?padding:\s*1\.1rem\s+1\.4rem/);
    const explanation = css.match(/\.hq-econ-explanation,\s*\.hq-econ-explanation-body \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(explanation).toMatch(/padding:\s*1\.1rem\s+1\.4rem/);
    expect(explanation).toMatch(/white-space:\s*normal/);
    expect(explanation).not.toContain("999px");
    const quality = evaluateRenderedProfitLabEconomicsQualityGate({
      source: "css_source",
      spacing: evaluateProfitLabCardSpacingGate({
        horizontalPaddingPx: 22,
        verticalPaddingPx: 18,
        lineHeight: 1.5,
        textBorderGapPx: 16,
        longTextInCompactPill: false,
        overflow: false,
      }),
      occupancynpvPricePreserved: true,
    });
    expect(quality.gate).toBe(RENDERED_PROFIT_LAB_ECONOMICS_QUALITY_GATE);
    expect(quality.result).toBe("PASS");
  });
});
