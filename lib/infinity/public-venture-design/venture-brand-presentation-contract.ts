import { PUBLIC_IMROS_PROJECT } from "@/lib/infinity/hq-production-deployment/contract";

export const VENTURE_BRAND_PRESENTATION_CONTRACT = "VentureBrandPresentationContract" as const;
export const BRAND_ASSET_CONTRAST_GATE = "BrandAssetContrastGate" as const;
export const BRAND_COLOR_INTEGRITY_GATE = "BrandColorIntegrityGate" as const;

export type BrandAssetRole = "PRIMARY" | "SECONDARY" | "ENDORSEMENT" | "PARTNER" | "DECORATIVE";
export type BrandPlacement =
  | "HERO_LEFT"
  | "HERO_CENTER"
  | "HERO_TOP_RIGHT"
  | "HEADER_LEFT"
  | "HEADER_RIGHT"
  | "FOOTER";
export type BrandPositionBehavior = "STATIC" | "RELATIVE" | "SECTION_ABSOLUTE" | "STICKY" | "FIXED";
export type BrandContrastExpectation = "LIGHT_ON_DARK" | "DARK_ON_LIGHT" | "ADAPTIVE";
export type BrandScrollBehavior = "EXIT_WITH_SECTION" | "PERSISTENT_HEADER";

export type VentureBrandAssetPresentation = {
  id: string;
  path: string;
  role: BrandAssetRole;
  placement: BrandPlacement;
  containingSection: "HERO" | "HEADER" | "FOOTER" | "PAGE";
  positionBehavior: BrandPositionBehavior;
  scrollBehavior: BrandScrollBehavior;
  transparency: "REQUIRED" | "OPTIONAL" | "FORBIDDEN";
  contrast: BrandContrastExpectation;
  colorIntegrity?: {
    primarySymbol: "BLUE_CYAN";
    wordmark: "WHITE";
    endorsement: "LIGHT_GRAY";
    background: "TRANSPARENT";
  };
  preferredDesktopPx: { width: number; height: number };
  minDesktopPx: { width: number; height: number };
  maxDesktopPx: { width: number; height: number };
  minTabletPx: { width: number; height: number };
  maxTabletPx: { width: number; height: number };
  minMobilePx: { width: number; height: number };
  maxMobilePx: { width: number; height: number };
  heroRightZoneMinCenterRatio?: number;
};

export type VentureDeploymentLineage = {
  canonicalSource: "infinity-core";
  deploymentSource: "imros-public-deploy";
  deploymentProject: typeof PUBLIC_IMROS_PROJECT;
  deploymentProjectId: "prj_vFJv26Vt5w08ShcrqqBQmcHTVxcX";
  productionDomain: "imros.io";
  mirrorScript: "scripts/mirror-imros-public-building-v2.mjs";
  deployScript: "scripts/imros-public-isolated-deploy.mjs";
};

export const IMROS_PUBLIC_OPERATIONS_DEPLOYMENT_LINEAGE: VentureDeploymentLineage = {
  canonicalSource: "infinity-core",
  deploymentSource: "imros-public-deploy",
  deploymentProject: PUBLIC_IMROS_PROJECT,
  deploymentProjectId: "prj_vFJv26Vt5w08ShcrqqBQmcHTVxcX",
  productionDomain: "imros.io",
  mirrorScript: "scripts/mirror-imros-public-building-v2.mjs",
  deployScript: "scripts/imros-public-isolated-deploy.mjs",
};

export const IMROS_BRAND_PRESENTATION: VentureBrandAssetPresentation[] = [
  {
    id: "infinity_os_hero",
    path: "/brand/infinity-os-logo.png",
    role: "PRIMARY",
    placement: "HERO_LEFT",
    containingSection: "HERO",
    positionBehavior: "STATIC",
    scrollBehavior: "EXIT_WITH_SECTION",
    transparency: "REQUIRED",
    contrast: "LIGHT_ON_DARK",
    colorIntegrity: {
      primarySymbol: "BLUE_CYAN",
      wordmark: "WHITE",
      endorsement: "LIGHT_GRAY",
      background: "TRANSPARENT",
    },
    preferredDesktopPx: { width: 320, height: 82 },
    minDesktopPx: { width: 200, height: 50 },
    maxDesktopPx: { width: 360, height: 120 },
    minTabletPx: { width: 180, height: 45 },
    maxTabletPx: { width: 320, height: 100 },
    minMobilePx: { width: 160, height: 40 },
    maxMobilePx: { width: 280, height: 90 },
  },
  {
    id: "imr_endorsement",
    path: "/brand/imr-mark.png",
    role: "ENDORSEMENT",
    placement: "HERO_TOP_RIGHT",
    containingSection: "HERO",
    positionBehavior: "SECTION_ABSOLUTE",
    scrollBehavior: "EXIT_WITH_SECTION",
    transparency: "REQUIRED",
    contrast: "LIGHT_ON_DARK",
    preferredDesktopPx: { width: 133, height: 133 },
    minDesktopPx: { width: 110, height: 110 },
    maxDesktopPx: { width: 145, height: 145 },
    minTabletPx: { width: 95, height: 95 },
    maxTabletPx: { width: 125, height: 125 },
    minMobilePx: { width: 72, height: 72 },
    maxMobilePx: { width: 100, height: 100 },
    heroRightZoneMinCenterRatio: 0.62,
  },
];

export function evaluateRenderedBrandSizeGate(input: {
  assetId: string;
  viewport: "desktop" | "tablet" | "mobile";
  widthPx: number;
  heightPx: number;
  contract?: VentureBrandAssetPresentation[];
}): { result: "PASS" | "FAIL"; reasons: string[] } {
  const contract = input.contract ?? IMROS_BRAND_PRESENTATION;
  const spec = contract.find((row) => row.id === input.assetId);
  if (!spec) return { result: "FAIL", reasons: ["UNKNOWN_ASSET"] };
  const min =
    input.viewport === "desktop"
      ? spec.minDesktopPx
      : input.viewport === "tablet"
        ? spec.minTabletPx
        : spec.minMobilePx;
  const max =
    input.viewport === "desktop"
      ? spec.maxDesktopPx
      : input.viewport === "tablet"
        ? spec.maxTabletPx
        : spec.maxMobilePx;
  const reasons: string[] = [];
  if (input.widthPx < min.width || input.heightPx < min.height) {
    reasons.push(`BELOW_MIN:${input.widthPx}x${input.heightPx}`);
  }
  if (input.widthPx > max.width || input.heightPx > max.height) {
    reasons.push(`ABOVE_MAX:${input.widthPx}x${input.heightPx}`);
  }
  return { result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateBrandPlacementGate(input: {
  assetId: string;
  heroBounds: { left: number; top: number; width: number; height: number };
  markBounds: { left: number; top: number; width: number; height: number };
  contract?: VentureBrandAssetPresentation[];
}): { result: "PASS" | "FAIL"; reasons: string[] } {
  const spec = (input.contract ?? IMROS_BRAND_PRESENTATION).find((row) => row.id === input.assetId);
  if (!spec) return { result: "FAIL", reasons: ["UNKNOWN_ASSET"] };
  const reasons: string[] = [];
  const markCenterX = input.markBounds.left + input.markBounds.width / 2;
  const heroRight = input.heroBounds.left + input.heroBounds.width;
  if (spec.placement === "HERO_TOP_RIGHT") {
    const minCenter = input.heroBounds.left + input.heroBounds.width * (spec.heroRightZoneMinCenterRatio ?? 0.62);
    if (markCenterX < minCenter) reasons.push("NOT_IN_HERO_RIGHT_ZONE");
    if (input.markBounds.top < input.heroBounds.top - 4) reasons.push("ABOVE_HERO");
    if (input.markBounds.left + input.markBounds.width > heroRight + 8) reasons.push("OUTSIDE_HERO_RIGHT");
  }
  return { result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}
