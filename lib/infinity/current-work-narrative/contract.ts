export const CURRENT_WORK_NARRATIVE_CONTRACT = "CurrentWorkNarrativeContract" as const;

export const HQ_CURRENT_WORK_SPECIFICITY_GATE = "HQCurrentWorkSpecificityGate" as const;
export const HQ_GENERIC_WORK_DESCRIPTION_GATE = "HQGenericWorkDescriptionGate" as const;
export const HQ_CURRENT_WORK_CANONICAL_SOURCE_GATE = "HQCurrentWorkCanonicalSourceGate" as const;
export const HQ_CURRENT_WORK_FRESHNESS_GATE = "HQCurrentWorkFreshnessGate" as const;
export const HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE = "HQCurrentWorkStateConsistencyGate" as const;
export const HQ_ROOM_CONTRIBUTION_SPECIFICITY_GATE = "HQRoomContributionSpecificityGate" as const;

export const GENERIC_NOW_PHRASES = [
  "external implementation agent",
  "working",
  "implementing",
  "running mission",
  "agent active",
  "processing task",
  "current execution",
  "development work",
] as const;

export const CURRENT_WORK_SOURCE_TYPES = [
  "SALES_ROOM",
  "SALES_FLOOR",
  "AFFILIATE_PROGRAM",
  "HQ_ROOM",
  "MISSION",
] as const;

export type CurrentWorkSourceType = (typeof CURRENT_WORK_SOURCE_TYPES)[number];
