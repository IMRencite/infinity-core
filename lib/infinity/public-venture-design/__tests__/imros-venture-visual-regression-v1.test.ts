import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluatePublicImrBrandMarkGate } from "@/lib/infinity/public-operations-room/visual-gates";
import {
  analyzeTransparentAssetPixels,
  evaluateTransparentAssetIntegrityGate,
} from "../transparent-asset-integrity";
import {
  evaluateImrosBrokenBrandingRegressionFixtures,
  evaluateImrosDarkWordmarkContrastRegression,
  evaluateImrosWhiteBleedSymbolRegression,
  evaluateImrosTooSmallImrRegression,
  evaluateSecondaryLogoDimensionGate,
  evaluateVentureRenderedQualityGate,
} from "../venture-rendered-quality-gates";
import { IMROS_PUBLIC_OPERATIONS_VISUAL_CONTRACT } from "../venture-visual-contract";
import { evaluateVentureLaunchQcBlocking } from "@/lib/infinity/build-factory/venture-launch-qc-contract";

async function loadLogoPixels() {
  const { chromium } = await import("@playwright/test");
  const png = readFileSync(join(process.cwd(), "public/brand/infinity-os-logo.png"));
  const refPath = join(process.cwd(), "public/brand/infinity-os-logo.symbol-reference.png");
  const refPng = readFileSync(refPath);
  const b64 = png.toString("base64");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`<img id="logo" src="data:image/png;base64,${b64}" />`);
  const sample = await page.evaluate(async () => {
    const img = document.getElementById("logo") as HTMLImageElement;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, c.width, c.height);
    return { width: c.width, height: c.height, rgba: [...image.data] };
  });
  const refSample = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, c.width, c.height);
    return { width: c.width, height: c.height, rgba: [...image.data] };
  }, refPng.toString("base64"));
  await browser.close();
  const rgba = new Uint8ClampedArray(sample.rgba);
  const refRgba = new Uint8ClampedArray(refSample.rgba);
  return {
    pixels: analyzeTransparentAssetPixels({
      width: sample.width,
      height: sample.height,
      rgba,
    }),
    brandContrastRgba: { width: sample.width, height: sample.height, rgba },
    brandSymbolReferenceRgba: { width: refSample.width, height: refSample.height, rgba: refRgba },
  };
}

describe("IMROS venture visual regression v1", () => {
  it("detects the original broken branding patterns", () => {
    const broken = evaluateImrosBrokenBrandingRegressionFixtures();
    expect(broken.brokenScroll.result).toBe("FAIL");
    expect(broken.brokenSectionCss.result).toBe("FAIL");

    const blendFail = evaluateTransparentAssetIntegrityGate({
      assetPath: "/brand/infinity-os-logo.png",
      heroCss: ".heroLogo img { mix-blend-mode: lighten; }",
    });
    expect(blendFail.result).toBe("FAIL");
    expect(blendFail.reasons).toContain("HERO_BLEND_MODE_WORKAROUND_NOT_ALLOWED");

    const oversizedFail = evaluateSecondaryLogoDimensionGate(
      `.brandMark { position: fixed; width: 3.5rem; height: 3.5rem; z-index: 20; }`,
      IMROS_PUBLIC_OPERATIONS_VISUAL_CONTRACT,
    );
    expect(oversizedFail.result).toBe("FAIL");

    expect(evaluateImrosTooSmallImrRegression().result).toBe("FAIL");
    expect(evaluateImrosDarkWordmarkContrastRegression().result).toBe("FAIL");
    expect(evaluateImrosWhiteBleedSymbolRegression().result).toBe("FAIL");
  });

  it(
    "passes corrected IMROS branding and global venture rendered QC",
    async () => {
    const loaded = await loadLogoPixels();
    expect(loaded.pixels.unintendedMatteRectangle).toBe(false);
    expect(loaded.pixels.transparentPct).toBeGreaterThan(50);

    const transparency = evaluateTransparentAssetIntegrityGate({
      assetPath: "/brand/infinity-os-logo.png",
      pixelAnalysis: loaded.pixels,
      heroCss: readFileSync(
        join(process.cwd(), "components/public/operations-room/operations-room.module.css"),
        "utf8",
      ),
    });
    expect(transparency.result).toBe("PASS");

    expect(evaluatePublicImrBrandMarkGate().result).toBe("PASS");
    expect(
      evaluateVentureRenderedQualityGate({
        pixelAnalysis: loaded.pixels,
        brandContrastRgba: loaded.brandContrastRgba,
        brandSymbolReferenceRgba: loaded.brandSymbolReferenceRgba,
      }).result,
    ).toBe("PASS");
  },
    120_000,
  );

  it("blocks venture launch when only build compilation passed", () => {
    const blocked = evaluateVentureLaunchQcBlocking({
      buildPassed: true,
      renderedVisualQcPassed: false,
      scrollQcPassed: false,
      postDeployVisualQcPassed: false,
    });
    expect(blocked.result).toBe("FAIL");
    expect(blocked.reasons).toContain("BUILD_PASS_IS_NOT_VISUAL_PROOF");
  });
});
