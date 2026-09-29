export const CANONICAL_VENTURE_VIEWPORTS = {
  desktop: 1440,
  tablet: 768,
  tabletWide: 1024,
  mobile: 390,
  mobileNarrow: 375,
} as const;

export type VentureBrandAssetSpec = {
  id: string;
  path: string;
  role: "primary_logo" | "secondary_logo";
  expectedTransparency: boolean;
  minDesktopPx: { width: number; height: number };
  maxDesktopPx: { width: number; height: number };
  minTabletPx: { width: number; height: number };
  maxTabletPx: { width: number; height: number };
  minMobilePx: { width: number; height: number };
  maxMobilePx: { width: number; height: number };
};

export type VentureVisualContract = {
  ventureId: string;
  brand: {
    primaryLogo: VentureBrandAssetSpec;
    secondaryLogo?: VentureBrandAssetSpec;
  };
  layout: {
    allowedStickyElements: string[];
    allowedFixedElements: string[];
    protectedContentRegions: LayoutRegionRef[];
    sectionContainedBranding: boolean;
  };
  breakpoints: typeof CANONICAL_VENTURE_VIEWPORTS;
  criticalRoutes: string[];
  requiredQc: Array<
    | "visual"
    | "scroll"
    | "interaction"
    | "content"
    | "accessibility"
    | "post_deploy_visual"
  >;
};

export type LayoutRegionRef = "hero" | "navigation" | "sidebar" | "main" | "footer";

export const IMROS_PUBLIC_OPERATIONS_VISUAL_CONTRACT: VentureVisualContract = {
  ventureId: "imros_public_operations",
  brand: {
    primaryLogo: {
      id: "infinity_os_hero",
      path: "/brand/infinity-os-logo.png",
      role: "primary_logo",
      expectedTransparency: true,
      minDesktopPx: { width: 200, height: 50 },
      maxDesktopPx: { width: 360, height: 120 },
      minTabletPx: { width: 180, height: 45 },
      maxTabletPx: { width: 320, height: 100 },
      minMobilePx: { width: 160, height: 40 },
      maxMobilePx: { width: 280, height: 90 },
    },
    secondaryLogo: {
      id: "imr_endorsement",
      path: "/brand/imr-mark.png",
      role: "secondary_logo",
      expectedTransparency: true,
      minDesktopPx: { width: 110, height: 110 },
      maxDesktopPx: { width: 145, height: 145 },
      minTabletPx: { width: 95, height: 95 },
      maxTabletPx: { width: 125, height: 125 },
      minMobilePx: { width: 72, height: 72 },
      maxMobilePx: { width: 100, height: 100 },
    },
  },
  layout: {
    allowedStickyElements: [],
    allowedFixedElements: [],
    protectedContentRegions: ["sidebar", "main", "footer"],
    sectionContainedBranding: true,
  },
  breakpoints: CANONICAL_VENTURE_VIEWPORTS,
  criticalRoutes: ["/public/operations-room", "/public/privacy", "/public/terms"],
  requiredQc: ["visual", "scroll", "interaction", "content", "accessibility", "post_deploy_visual"],
};
