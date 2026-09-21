import { HQ_FIRST_CLASS_ROOMS } from "@/lib/infinity/hq-first-class-room/registry";

export const HQ_CARD_CONTENT_SPACING_CONTRACT = "HQCardContentSpacingContract" as const;
export const HQ_LONG_CONTENT_PRESENTATION_GATE = "HQLongContentPresentationGate" as const;
export const HQ_FIRST_CLASS_ROOM_RENDERED_QUALITY_GATE = "HQFirstClassRoomRenderedQualityGate" as const;
export const HQ_FIRST_CLASS_ROOM_RENDERED_QC_REGISTRY = "HQFirstClassRoomRenderedQCRegistry" as const;
export const HQ_TEXT_COLLISION_GATE = "HQTextCollisionGate" as const;
export const HQ_CONTENT_OVERFLOW_GATE = "HQContentOverflowGate" as const;
export const HQ_ROOM_CONTENT_RHYTHM_GATE = "HQRoomContentRhythmGate" as const;
export const HQ_ROOM_STATE_CONTENT_CONSISTENCY_GATE = "HQRoomStateContentConsistencyGate" as const;
export const HQ_ROOM_OUTPUT_COUNT_CONSISTENCY_GATE = "HQRoomOutputCountConsistencyGate" as const;
export const GROWTH_NEXUS_COMPLETENESS_GATE = "GrowthNexusCompletenessGate" as const;
export const REPEATED_HQ_VISUAL_DEFECT_PROMOTION_GATE = "RepeatedHQVisualDefectPromotionGate" as const;
export const REPEATED_VISUAL_DEFECT_ESCAPED_QC = "REPEATED_VISUAL_DEFECT_ESCAPED_QC" as const;
export const GLOBAL_SHARED_COMPONENT_DEFECT = "GLOBAL_SHARED_COMPONENT_DEFECT" as const;

export const HQ_STATUS_BADGE = "HQStatusBadge" as const;
export const HQ_METRIC_BADGE = "HQMetricBadge" as const;
export const HQ_OUTPUT_CARD = "HQOutputCard" as const;
export const HQ_CIRCULAR_OUTPUT_CARD = "HQCircularOutputCard" as const;
export const HQ_OPPORTUNITY_ORB = "HQOpportunityOrb" as const;
export const VENTURE_RADAR_CIRCULAR_GEOMETRY_GATE = "VentureRadarCircularGeometryGate" as const;
export const VENTURE_RADAR_ORB_READABILITY_GATE = "VentureRadarOrbReadabilityGate" as const;
export const VENTURE_RADAR_OPPORTUNITY_CONTENT_GATE = "VentureRadarOpportunityContentGate" as const;
export const VENTURE_RADAR_SELECTION_VISIBILITY_GATE = "VentureRadarSelectionVisibilityGate" as const;
export const HQ_OUTPUT_DETAIL = "HQOutputDetail" as const;
export const HQ_EVIDENCE_CARD = "HQEvidenceCard" as const;
export const HQ_ACTION_CARD = "HQActionCard" as const;
export const HQ_LONG_FORM_VALUE = "HQLongFormValue" as const;

export const HQ_CIRCULAR_OUTPUT_PRESENTATION_CONTRACT = "HQCircularOutputPresentationContract" as const;
export const HQ_CIRCULAR_GEOMETRY_GATE = "HQCircularGeometryGate" as const;
export const HQ_CIRCULAR_CONTENT_SPACING_GATE = "HQCircularContentSpacingGate" as const;
export const HQ_CIRCULAR_RENDERED_QUALITY_GATE = "HQCircularRenderedQualityGate" as const;
export const HQ_VISUAL_DESIGN_INTENT_GATE = "HQVisualDesignIntentGate" as const;

export const HQ_CIRCLE_ELIGIBILITY = {
  STATUS_NODE: "circular_allowed",
  METRIC_NODE: "circular_allowed",
  DECISION_SUMMARY_NODE: "circular_if_compact",
  LONG_EXPLANATION: "not_compact_circular",
  EVIDENCE_BODY: "not_compact_circular",
  ACTION_BODY: "not_compact_circular",
} as const;

export const HQ_CIRCULAR_GEOMETRY = {
  aspectRatio: 1,
  maxAspectDelta: 0.08,
  borderRadiusPercent: 50,
  minDiameterPx: 116,
  padPx: 18,
  lineHeight: 1.35,
} as const;

export const COMPACT_DECISION_TOKENS = ["BUILD", "VALIDATE", "REJECT", "HOLD"] as const;

export const HQ_CARD_SPACING = {
  padX: 22,
  padY: 18,
  lineHeight: 1.5,
  titleBodyGap: 8,
  metadataGap: 8,
  cardRadius: 14,
  minTextBorderGap: 16,
  rowGap: 12,
  sectionGap: 16,
} as const;

export const HQ_LONG_CONTENT_THRESHOLD = 36;

export type HqPresentationKind =
  | typeof HQ_STATUS_BADGE
  | typeof HQ_METRIC_BADGE
  | typeof HQ_OUTPUT_CARD
  | typeof HQ_CIRCULAR_OUTPUT_CARD
  | typeof HQ_OPPORTUNITY_ORB
  | typeof HQ_OUTPUT_DETAIL
  | typeof HQ_EVIDENCE_CARD
  | typeof HQ_ACTION_CARD
  | typeof HQ_LONG_FORM_VALUE;

export type HqCircleEligibility =
  | keyof typeof HQ_CIRCLE_ELIGIBILITY;

export type HqVisualForm = "CIRCULAR_OUTPUT" | "CARD" | "PILL" | "BODY";

export type NamedPresentationGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function hqFirstClassRoomRenderedQCRegistry(): readonly string[] {
  return HQ_FIRST_CLASS_ROOMS.map((room) => room.id);
}
