import type { ClaimSource } from "./constants";
import type { FounderIdeaSubmission, NormalizedFounderThesis, ProvenancedField } from "./types";

function field(value: string | null | undefined, inferred: string | null): ProvenancedField {
  const trimmed = value?.trim() || null;
  if (trimmed) return { value: trimmed, source: "FOUNDER_PROVIDED" };
  return { value: inferred, source: inferred ? "INFINITY_INFERRED" : "INFINITY_INFERRED" };
}

function inferMarket(description: string, customer: string | null): string {
  if (/contractor|construction|field/i.test(`${description} ${customer ?? ""}`)) return "US construction / contractor operations";
  if (/rfp|proposal/i.test(description)) return "B2B professional services";
  return "Digital / software-served small business workflows";
}

function inferModels(hypothesis: string | null, description: string): string[] {
  const text = `${hypothesis ?? ""} ${description}`.toLowerCase();
  if (/saas|subscription|software/.test(text)) return ["saas"];
  if (/marketplace/.test(text)) return ["marketplace"];
  if (/lead/.test(text)) return ["lead_generation"];
  if (/content|seo|directory/.test(text)) return ["content_business"];
  return ["saas"];
}

export function normalizeFounderIdea(submission: FounderIdeaSubmission): NormalizedFounderThesis {
  const thesis = submission.description.trim();
  const inferredSolution =
    submission.proposedSolution?.trim() ||
    `A focused product that helps ${submission.targetCustomer?.trim() || "the stated customer"} solve: ${submission.problem?.trim() || thesis}`;
  const inferredProblem = submission.problem?.trim() || `The founder described a workflow gap: ${thesis}`;
  const inferredCustomer = submission.targetCustomer?.trim() || "The customer segment implied by the idea description";

  const models = inferModels(submission.businessModelHypothesis, submission.description);
  const founderModels = Boolean(submission.businessModelHypothesis?.trim());

  const unknowns: string[] = [];
  if (!submission.targetCustomer) unknowns.push("Target customer is not founder-specified.");
  if (!submission.problem) unknowns.push("Problem statement is not founder-specified.");
  if (!submission.pricingHypothesis) unknowns.push("Pricing hypothesis is not founder-specified.");
  if (!submission.competitors) unknowns.push("Competitive set is not founder-specified.");
  unknowns.push("Grounded market evidence has not been collected unless a research run is attached.");

  const founderRisks = submission.notes?.trim()
    ? [`Founder note: ${submission.notes.trim()}`]
    : [];
  const inferredRisks = [
    "Demand, willingness to pay, and distribution remain unproven until researched.",
    "Founder-provided hypotheses are not grounded evidence.",
  ];

  return {
    businessThesis: field(thesis, null),
    problem: field(submission.problem, inferredProblem),
    targetCustomer: field(submission.targetCustomer, inferredCustomer),
    solution: field(submission.proposedSolution, inferredSolution),
    market: field(null, inferMarket(submission.description, submission.targetCustomer)),
    businessModelCandidates: {
      values: models,
      source: founderModels ? "FOUNDER_PROVIDED" : "INFINITY_INFERRED",
    },
    distributionHypotheses: {
      values: ["Self-serve digital acquisition until evidence exists"],
      source: "INFINITY_INFERRED",
    },
    risks: {
      values: [...founderRisks, ...inferredRisks],
      source: founderRisks.length > 0 ? "FOUNDER_PROVIDED" : "INFINITY_INFERRED",
    },
    unknowns: { values: unknowns, source: "INFINITY_INFERRED" },
  };
}

export function claimSourceLabel(source: ClaimSource): string {
  return source === "FOUNDER_PROVIDED" ? "FOUNDER PROVIDED" : "INFINITY INFERRED";
}
