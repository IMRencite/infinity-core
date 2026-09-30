import { CLUB_THROTTLE_EDITORIAL_PROFILE, OCCUPANCY_EDITORIAL_PROFILE } from "./venture-editorial-profiles";

export const VENTURE_EDITORIAL_EXPERIENCE_CONTRACT = "VentureEditorialExperienceContract" as const;

export const DEFAULT_VENTURE_EDITORIAL_GATES = [
  "BlogConsumerEditorialQualityGate",
  "BlogHumanReadabilityGate",
  "BlogStatementDensityGate",
  "BlogNarrativeFlowGate",
  "BlogReaderMomentumGate",
  "BlogSectionProgressionGate",
  "BlogSemanticRepetitionGate",
  "BlogActionabilityGate",
  "BlogShareabilityGate",
  "HolisticEditorialJudge",
  "HumanFirstEditorialQc",
  "HumanFirstEditorialQcV2",
  "EditorialNarrativeArchitectureGate",
  "BlogHeadingDensityGate",
  "BlogTransitionContinuityGate",
  "HolisticPublicationQualityJudge",
  "RenderedEditorialQualityGate",
] as const;

export const VENTURE_EDITORIAL_EXPERIENCE_BY_ID = {
  "club-throttle": {
    contract: VENTURE_EDITORIAL_EXPERIENCE_CONTRACT,
    profile: CLUB_THROTTLE_EDITORIAL_PROFILE,
    required_gates: DEFAULT_VENTURE_EDITORIAL_GATES,
    publish_requires_human_qc: true,
  },
  occupancynpv: {
    contract: VENTURE_EDITORIAL_EXPERIENCE_CONTRACT,
    profile: OCCUPANCY_EDITORIAL_PROFILE,
    required_gates: DEFAULT_VENTURE_EDITORIAL_GATES,
    publish_requires_human_qc: true,
  },
} as const;

export function ventureInheritsEditorialQc(ventureId: string): boolean {
  return ventureId in VENTURE_EDITORIAL_EXPERIENCE_BY_ID;
}
