/** CAM first-year publish metadata — leaf module (no page compose imports). */

export const OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION =
  "How should a tenant treat CAM in the first operating year?" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_PATH = "/blog/occupancy-costs/cam-first-year/" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER =
  "Treat first-year CAM as an occupancy-cost estimate that still has to sit on the occupancy-cost timeline with rent, not a finished bill. Use the lease estimate or stop language, label what is projected versus reconciled, and do not treat a first-year CAM figure as a market average or as a property cap rate." as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER = "first-year CAM belongs on the occupancy-cost timeline" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_ID = "blog-cam-first-year" as const;
export const OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_VERSION = "cam-first-year-v3" as const;

export const OCCUPANCYNPV_CAM_VISUALS = {
  featured_image: "/media/hero-interior.webp",
  featured_alt: "Empty commercial conference room with windows and a city view.",
  supporting_visual: true,
} as const;
