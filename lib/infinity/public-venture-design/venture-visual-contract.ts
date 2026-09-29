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
  maxDesktopPx: { width: number; height: number };
  maxTabletPx: { width: number; height: number };
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
      maxDesktopPx: { width: 320, height: 82 },
      maxTabletPx: { width: 280, height: 72 },
      maxMobilePx: { width: 240, height: 62 },
    },
    secondaryLogo: {
      id: "imr_endorsement",
      path: "/brand/imr-mark.png",
      role: "secondary_logo",
      expectedTransparency: true,
      maxDesktopPx: { width: 28, height: 28 },
      maxTabletPx: { width: 26, height: 26 },
      maxMobilePx: { width: 24, height: 24 },
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
