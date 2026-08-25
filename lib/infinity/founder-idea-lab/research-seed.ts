import type { FounderIdeaSubmission } from "./types";
import { normalizeFounderIdea } from "./normalize";

export type FounderResearchSeed = {
  submissionId: string;
  candidateId: string | null;
  ideaTitle: string;
  ideaDescription: string;
  targetCustomer: string | null;
  problem: string | null;
  businessModelHypothesis: string | null;
  pricingHypothesis: string | null;
  knownCompetitors: string[];
  notes: string | null;
  founderStatementsAreHypotheses: true;
  researchObjective: string;
  requiredDimensions: string[];
};

export function parseKnownCompetitors(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildFounderResearchSeed(
  submission: FounderIdeaSubmission,
  candidateId?: string | null,
): FounderResearchSeed {
  const thesis = normalizeFounderIdea(submission);
  const knownCompetitors = parseKnownCompetitors(submission.competitors);
  const competitorClause =
    knownCompetitors.length > 0
      ? `Treat these founder-supplied names as research leads only, not verified evidence: ${knownCompetitors.join(", ")}.`
      : "No founder-supplied competitor leads.";

  const requiredDimensions = [
    "problem/demand",
    "target customer",
    "market/category",
    "competitors",
    "existing pricing",
    "business/revenue models",
    "category monetization precedent",
    "distribution",
    "build complexity",
    "capital requirements",
    "speed to revenue",
  ];

  const researchObjective = [
    `Investigate the submitted founder idea as a specific concept, not a generic category placeholder.`,
    `Idea name: ${submission.title}`,
    `Description: ${submission.description}`,
    `Target customer (founder hypothesis): ${submission.targetCustomer ?? thesis.targetCustomer.value ?? "UNSPECIFIED"}`,
    `Problem (founder hypothesis): ${submission.problem ?? thesis.problem.value ?? "UNSPECIFIED"}`,
    `Business model hypothesis: ${submission.businessModelHypothesis ?? thesis.businessModelCandidates.values.join(", ")}`,
    `Pricing hypothesis: ${submission.pricingHypothesis ?? "UNSPECIFIED"}`,
    competitorClause,
    `Notes: ${submission.notes ?? "none"}`,
    `Research dimensions: ${requiredDimensions.join("; ")}.`,
    `Distinguish category monetization precedent from idea-specific validation and from unit economics (CAC/LTV/conversion/margin).`,
    `Do not treat founder statements as verified. Do not assume a competitor is profitable merely because it exists.`,
    `Absence of evidence is not evidence of weakness.`,
  ].join(" ");

  return {
    submissionId: submission.id,
    candidateId: candidateId ?? submission.opportunityCandidateId,
    ideaTitle: submission.title,
    ideaDescription: submission.description,
    targetCustomer: submission.targetCustomer,
    problem: submission.problem,
    businessModelHypothesis: submission.businessModelHypothesis,
    pricingHypothesis: submission.pricingHypothesis,
    knownCompetitors,
    notes: submission.notes,
    founderStatementsAreHypotheses: true,
    researchObjective,
    requiredDimensions,
  };
}
