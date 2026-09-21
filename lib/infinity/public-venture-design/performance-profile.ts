import type { DesignPatternPerformanceProfile, SectionType } from "./types";

export function emptyPatternPerformanceProfile(patternId: string, sectionType?: SectionType): DesignPatternPerformanceProfile {
  return {
    patternId,
    sectionType,
    uses: 0,
    qualifiedVisits: 0,
    ctaInteractions: 0,
    formStarts: 0,
    submissions: 0,
    strongIntent: 0,
    conversionRate: null,
    segment: null,
    ventureCategory: null,
    confidence: "INSUFFICIENT",
  };
}

export function mayClaimPatternSuperiority(profile: DesignPatternPerformanceProfile): boolean {
  return profile.confidence !== "INSUFFICIENT" && (profile.submissions > 0 || profile.strongIntent > 0);
}

export function performanceLineageAttributes(input: {
  artifactId: string;
  sectionId: string;
  sectionType: SectionType;
  patternId: string;
  cta: string | null;
  experimentId: string;
  ventureId: string;
}): Record<string, string> {
  return {
    "data-artifact-id": input.artifactId,
    "data-section-id": input.sectionId,
    "data-section-type": input.sectionType,
    "data-pattern-id": input.patternId,
    "data-cta": input.cta ?? "",
    "data-experiment-id": input.experimentId,
    "data-venture-id": input.ventureId,
  };
}
