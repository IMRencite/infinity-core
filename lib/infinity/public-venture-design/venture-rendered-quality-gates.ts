import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateTransparentAssetIntegrityGate,
  TRANSPARENT_ASSET_INTEGRITY_GATE,
} from "./transparent-asset-integrity";
import {
  evaluateRenderedScrollCollisionGate,
  evaluateSectionContainedBrandingCss,
  imrosBrokenScrollCollisionFixture,
  imrosFixedScrollCollisionFixture,
  RENDERED_SCROLL_COLLISION_GATE,
} from "./rendered-scroll-collision-gate";
import { evaluateVentureZIndexContract, VENTURE_STACKING_LAYERS } from "./venture-stacking-layers";
import {
  CANONICAL_VENTURE_VIEWPORTS,
  IMROS_PUBLIC_OPERATIONS_VISUAL_CONTRACT,
  type VentureVisualContract,
} from "./venture-visual-contract";
import { CUSTOMER_FACING_VIEWPORTS } from "./rendered-layout/customer-facing-gutter";

export const VENTURE_RENDERED_QUALITY_GATE = "VentureRenderedQualityGate" as const;
export const RESPONSIVE_VENTURE_QUALITY_GATE = "ResponsiveVentureQualityGate" as const;
export const PRODUCTION_POST_DEPLOY_VISUAL_GATE = "ProductionPostDeployVisualGate" as const;

export type NamedVentureGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

function readRepo(path: string): string {
  const abs = join(process.cwd(), path);
  return existsSync(abs) ? readFileSync(abs, "utf8") : "";
}

export function evaluateSecondaryLogoDimensionGate(
  markCss: string,
  contract: VentureVisualContract,
): NamedVentureGate {
  const spec = contract.brand.secondaryLogo;
  const reasons: string[] = [];
  if (!spec) {
    return { gate: "SecondaryLogoDimensionGate", result: "PASS", reasons: ["NO_SECONDARY_LOGO"] };
  }
  const desktopMatch = markCss.match(/width:\s*([\d.]+)rem/);
  const desktopRem = desktopMatch ? Number(desktopMatch[1]) * 16 : 999;
  if (desktopRem > spec.maxDesktopPx.width + 1) reasons.push("SECONDARY_LOGO_TOO_LARGE_DESKTOP");
  if (/position:\s*fixed/i.test(markCss)) reasons.push("SECONDARY_LOGO_GLOBAL_FIXED");
  return {
    gate: "SecondaryLogoDimensionGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateResponsiveVentureQualityGate(contract: VentureVisualContract): NamedVentureGate {
  const reasons: string[] = [];
  if (contract.breakpoints.desktop < 1280) reasons.push("DESKTOP_VIEWPORT_TOO_NARROW");
  if (contract.breakpoints.mobile > 430) reasons.push("MOBILE_VIEWPORT_TOO_WIDE");
  const gutterViewports = Object.values(CUSTOMER_FACING_VIEWPORTS);
  if (gutterViewports.length < 3) reasons.push("CUSTOMER_FACING_VIEWPORT_SET_INCOMPLETE");
  return {
    gate: RESPONSIVE_VENTURE_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateProductionPostDeployVisualGate(input: {
  preDeployPassed: boolean;
  postDeployPassed: boolean;
  sameCommitSha: boolean;
}): NamedVentureGate {
  const reasons: string[] = [];
  if (!input.preDeployPassed) reasons.push("PRE_DEPLOY_VISUAL_QC_MISSING");
  if (!input.postDeployPassed) reasons.push("POST_DEPLOY_RENDER_FAILED");
  if (!input.sameCommitSha) reasons.push("DEPLOY_SHA_DRIFT");
  return {
    gate: PRODUCTION_POST_DEPLOY_VISUAL_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateVentureRenderedQualityGate(input: {
  contract?: VentureVisualContract;
  cwd?: string;
  pixelAnalysis?: Parameters<typeof evaluateTransparentAssetIntegrityGate>[0]["pixelAnalysis"];
}): {
  gate: typeof VENTURE_RENDERED_QUALITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  gates: NamedVentureGate[];
} {
  const contract = input.contract ?? IMROS_PUBLIC_OPERATIONS_VISUAL_CONTRACT;
  const markCss = readRepo("components/public/operations-room/imr-brand-mark.module.css");
  const markTsx = readRepo("components/public/operations-room/imr-brand-mark.tsx");
  const heroCss = readRepo("components/public/operations-room/operations-room.module.css");
  const opsCss = heroCss;
  const gates: NamedVentureGate[] = [];

  const transparency = evaluateTransparentAssetIntegrityGate({
    assetPath: contract.brand.primaryLogo.path,
    pixelAnalysis: input.pixelAnalysis ?? null,
    heroCss,
  });
  gates.push({ gate: TRANSPARENT_ASSET_INTEGRITY_GATE, result: transparency.result, reasons: transparency.reasons });

  const sectionBrand = evaluateSectionContainedBrandingCss(markCss, markTsx);
  gates.push({
    gate: "SectionContainedBrandingGate",
    result: sectionBrand.result,
    reasons: sectionBrand.reasons,
  });

  gates.push(evaluateSecondaryLogoDimensionGate(markCss, contract));

  const zIndex = evaluateVentureZIndexContract(markCss + opsCss);
  gates.push({
    gate: "VentureZIndexContractGate",
    result: zIndex.result,
    reasons: zIndex.reasons,
  });

  const scroll = evaluateRenderedScrollCollisionGate({
    scrollSamples: [
      { scrollPct: 0, elements: imrosFixedScrollCollisionFixture() },
      { scrollPct: 50, elements: imrosFixedScrollCollisionFixture() },
    ],
  });
  gates.push({
    gate: RENDERED_SCROLL_COLLISION_GATE,
    result: scroll.result,
    reasons: scroll.reasons,
  });

  gates.push(evaluateResponsiveVentureQualityGate(contract));

  const reasons = gates.flatMap((g) => g.reasons.map((r) => `${g.gate}:${r}`));
  return {
    gate: VENTURE_RENDERED_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    gates,
  };
}

export function evaluateImrosBrokenBrandingRegressionFixtures(): {
  brokenScroll: ReturnType<typeof evaluateRenderedScrollCollisionGate>;
  brokenSectionCss: ReturnType<typeof evaluateSectionContainedBrandingCss>;
} {
  return {
    brokenScroll: evaluateRenderedScrollCollisionGate({
      scrollSamples: [{ scrollPct: 50, elements: imrosBrokenScrollCollisionFixture() }],
    }),
    brokenSectionCss: evaluateSectionContainedBrandingCss(
      `.brandMark { position: fixed; top: 2rem; right: 2rem; z-index: 20; width: 3.5rem; }`,
      `<a data-imr-brand-mark="true">`,
    ),
  };
}

export { VENTURE_STACKING_LAYERS, IMROS_PUBLIC_OPERATIONS_VISUAL_CONTRACT };
