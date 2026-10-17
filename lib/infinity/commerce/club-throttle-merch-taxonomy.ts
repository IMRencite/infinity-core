export type MotorcycleArchetype =
  | "SPORT_BIKE"
  | "SUPERSPORT"
  | "NAKED_STREETFIGHTER"
  | "CRUISER"
  | "BAGGER"
  | "CAFE_RETRO"
  | "ADVENTURE"
  | "TOURING"
  | "DUAL_SPORT"
  | "TRACK_PERFORMANCE"
  | "CUSTOM_BUILD"
  | "GENERAL_RIDER";

export type MerchDesignMode =
  | "ILLUSTRATION_FIRST"
  | "PHRASE_FIRST"
  | "TYPOGRAPHY_FIRST"
  | "MINIMAL_MARK"
  | "FRONT_BACK_SYSTEM";

export type MerchVisualStyle =
  | "CINEMATIC_PAINTERLY"
  | "CLEAN_TECHNICAL"
  | "DISTRESSED_RETRO"
  | "LINE_ART"
  | "MINIMAL_TYPE"
  | "BADGE_MARK";

export type MerchPlacementPattern =
  | "BACK_ONLY"
  | "LARGE_BACK_SMALL_FRONT"
  | "FRONT_ONLY"
  | "CHEST_AND_BACK";

export type ClubThrottleDesignTaxonomy = {
  concept_id: string;
  motorcycle_archetypes: MotorcycleArchetype[];
  design_mode: MerchDesignMode;
  visual_style: MerchVisualStyle;
  placement: MerchPlacementPattern;
  audience: string[];
  market_signals: string[];
  originality_lineage: string[];
  collection_similarity?: {
    gate: string;
    result: "PASS" | "FAIL" | "WARN";
    reasons: string[];
  };
};

export const CT_LOT_LINE_1_TAXONOMY: ClubThrottleDesignTaxonomy = {
  concept_id: "ct-lot-line-1",
  motorcycle_archetypes: ["CAFE_RETRO", "NAKED_STREETFIGHTER", "GENERAL_RIDER"],
  design_mode: "ILLUSTRATION_FIRST",
  visual_style: "CINEMATIC_PAINTERLY",
  placement: "LARGE_BACK_SMALL_FRONT",
  audience: ["STREET_RIDER", "BIKE_NIGHT", "NIGHT_COMMUTER"],
  market_signals: [
    "large_back_prevalence",
    "night_palette_demand",
    "small_chest_plus_back_pattern",
  ],
  originality_lineage: ["original_lot_scene", "no_competitor_trace"],
};
