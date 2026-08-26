import type { NormalizedEvidenceItem, NormalizedSource, ResearchResult } from "../types";
import {
  MATERIAL_RESEARCH_DIMENSIONS,
  RESEARCH_EVIDENCE_DIMENSIONS,
  dimensionFromSignalType,
  isDirectExternalResearchUseful,
  type ResearchEvidenceDimension,
} from "./dimensions";

export type ResearchCoverageAssessment = {
  coveredDimensions: ResearchEvidenceDimension[];
  partialDimensions: ResearchEvidenceDimension[];
  unknownDimensions: ResearchEvidenceDimension[];
  researchableGaps: ResearchEvidenceDimension[];
  directEvidenceCount: number;
  derivedEvidenceCount: number;
  sourceCount: number;
  materialCoverageSufficient: boolean;
};

function knownPolarity(relevance: string): boolean {
  const value = relevance.toLowerCase();
  return value === "positive" || value === "negative" || value === "mixed";
}

export function assessGroundedResearchCoverage(input: {
  evidence: NormalizedEvidenceItem[];
  sources: NormalizedSource[];
}): ResearchCoverageAssessment {
  const covered = new Set<ResearchEvidenceDimension>();
  const partial = new Set<ResearchEvidenceDimension>();

  for (const item of input.evidence) {
    const dimension = dimensionFromSignalType(item.signalType);
    if (!dimension) continue;
    if (item.evidenceType === "direct_grounded" && item.grounded && knownPolarity(item.relevance)) {
      covered.add(dimension);
      continue;
    }
    if (item.evidenceType === "inference_from_evidence") {
      partial.add(dimension);
    }
  }

  const coveredDimensions = RESEARCH_EVIDENCE_DIMENSIONS.filter((dimension) => covered.has(dimension));
  const partialDimensions = RESEARCH_EVIDENCE_DIMENSIONS.filter(
    (dimension) => partial.has(dimension) && !covered.has(dimension),
  );
  const unknownDimensions = RESEARCH_EVIDENCE_DIMENSIONS.filter(
    (dimension) => !covered.has(dimension) && !partial.has(dimension),
  );
  const researchableGaps = MATERIAL_RESEARCH_DIMENSIONS.filter(
    (dimension) => !covered.has(dimension) && isDirectExternalResearchUseful(dimension),
  );

  return {
    coveredDimensions,
    partialDimensions,
    unknownDimensions,
    researchableGaps,
    directEvidenceCount: input.evidence.filter((item) => item.evidenceType === "direct_grounded" && item.grounded).length,
    derivedEvidenceCount: input.evidence.filter((item) => item.evidenceType === "inference_from_evidence").length,
    sourceCount: input.sources.length,
    materialCoverageSufficient: MATERIAL_RESEARCH_DIMENSIONS.every((dimension) => covered.has(dimension)),
  };
}

export function assessResearchResultCoverage(result: Pick<ResearchResult, "evidence" | "sources">): ResearchCoverageAssessment {
  return assessGroundedResearchCoverage({ evidence: result.evidence, sources: result.sources });
}
