import type { LoadedOpportunityCandidate } from "./types";

export function buildMonetizationResearchObjective(candidate: LoadedOpportunityCandidate): string {
  return [
    `Analyze monetization economics for this opportunity candidate.`,
    `Title: ${candidate.title}`,
    `Summary: ${candidate.summary}`,
    candidate.problem ? `Problem: ${candidate.problem}` : null,
    candidate.targetCustomer ? `Target customer: ${candidate.targetCustomer}` : null,
    candidate.market ? `Market: ${candidate.market}` : null,
    `Business model candidates: ${candidate.businessModelCandidates.join(", ") || "unknown"}`,
    `Revenue mechanism candidates: ${candidate.revenueMechanismCandidates.join(", ") || "unknown"}`,
    `Research competitor pricing, market pricing, commission/take rates, advertising/affiliate economics, SaaS pricing bands, customer acquisition economics, industry margins, and purchase behavior.`,
    `Provide source-backed evidence only. Do not recommend building a venture — only economic evidence.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMonetizationExtractionSystemInstructions(): string {
  return [
    "You are Infinity's Monetization Engine analyst.",
    "Construct real economic models, not generic business labels.",
    "Estimate pricing, customers, costs, CAC, and revenue streams using the provided grounded research.",
    "Provide multiple monetization plans when viable: primary, secondary, and future revenue streams.",
    "Do NOT compute final monetization scores or LTV/CAC ratios — provide input estimates only.",
    "Infinity code will calculate derived unit economics deterministically.",
    "Use source URLs from the research evidence when grounded.",
    "Never fabricate sources.",
    "Return valid JSON matching the schema exactly.",
  ].join(" ");
}

export function buildMonetizationExtractionPrompt(input: {
  candidate: LoadedOpportunityCandidate;
  researchSummary: string;
  researchEvidence: Array<{ claim: string; sourceUrls: string[]; grounded: boolean }>;
  researchSources: Array<{ url: string; title?: string }>;
}): string {
  return [
    `Opportunity candidate ID: ${input.candidate.id}`,
    `Title: ${input.candidate.title}`,
    `Summary: ${input.candidate.summary}`,
    input.candidate.problem ? `Problem: ${input.candidate.problem}` : null,
    input.candidate.targetCustomer ? `Target customer: ${input.candidate.targetCustomer}` : null,
    input.candidate.market ? `Market: ${input.candidate.market}` : null,
    `Existing monetization evidence: ${JSON.stringify(input.candidate.monetizationEvidence).slice(0, 4000)}`,
    `Grounded research summary: ${input.researchSummary}`,
    `Grounded research evidence: ${JSON.stringify(input.researchEvidence).slice(0, 12000)}`,
    `Research sources: ${JSON.stringify(input.researchSources).slice(0, 4000)}`,
    "Produce 1-3 monetization plans with multiple revenue streams where appropriate.",
    "Include conservative economic assumptions and validation experiment recommendations.",
    "Provide scoringAssessment values between 0 and 1 for each dimension.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
