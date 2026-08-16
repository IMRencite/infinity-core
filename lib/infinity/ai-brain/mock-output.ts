import type { AiBrainObjectiveType } from "./constants";
import type { AiBrainStructuredOutput } from "./types";

export function buildMockAiBrainStructuredOutput(input?: {
  objective?: string;
  objectiveType?: AiBrainObjectiveType;
}): AiBrainStructuredOutput {
  const objective =
    input?.objective ??
    "Identify three plausible online business opportunities that a small autonomous software company could investigate with an initial operating budget below $500.";

  return {
    schemaVersion: "ai_brain_reasoning_v1",
    objective,
    objectiveType: input?.objectiveType ?? "opportunity_identification",
    summary:
      "Three low-capital software opportunities were identified for bounded autonomous investigation.",
    observations: [
      "Micro-SaaS tools for niche vertical workflows remain viable under $500 initial spend.",
      "Template marketplaces and info-products have near-zero marginal cost after build.",
      "API wrapper utilities can validate demand before deeper product investment.",
    ],
    assumptions: [
      "The operator can dedicate engineering time without additional payroll.",
      "Distribution will rely on organic channels during the validation phase.",
    ],
    unknowns: [
      "Exact customer acquisition cost for each niche remains unmeasured.",
      "Competitive saturation varies by vertical.",
    ],
    candidateActions: [
      {
        actionId: "opp_1",
        actionType: "investigate_opportunity",
        description: "Research a vertical-specific invoice reminder micro-SaaS for freelancers.",
        reason: "Clear pain point, low infrastructure cost, fast MVP potential.",
        expectedValue: "Validate willingness-to-pay within 30 days.",
        estimatedCost: 120,
        riskLevel: "low",
        confidence: 72,
        dependencies: [],
        requiredCapabilities: ["research.summarize_internal_evidence", "discovery.read"],
      },
      {
        actionId: "opp_2",
        actionType: "investigate_opportunity",
        description: "Explore a Notion-to-website template bundle for small agencies.",
        reason: "Leverages existing builder skills; distribution via marketplaces.",
        expectedValue: "Generate initial revenue signal with minimal hosting cost.",
        estimatedCost: 80,
        riskLevel: "low",
        confidence: 68,
        dependencies: [],
        requiredCapabilities: ["research.summarize_internal_evidence"],
      },
      {
        actionId: "opp_3",
        actionType: "investigate_opportunity",
        description: "Assess a webhook monitoring utility for indie SaaS developers.",
        reason: "Developer tools have strong product-led growth potential.",
        expectedValue: "Identify feature scope for a free-tier validation launch.",
        estimatedCost: 150,
        riskLevel: "medium",
        confidence: 65,
        dependencies: [],
        requiredCapabilities: ["research.summarize_internal_evidence", "validation.read"],
      },
    ],
    recommendedAction: "opp_1",
    alternativeActions: ["opp_2", "opp_3"],
    shouldAct: true,
    requiresMoreInformation: true,
    missionProposal: {
      missionType: "discover_opportunities",
      missionTitle: "Investigate Sub-$500 Software Opportunities",
      missionObjective:
        "Evaluate three low-capital online business opportunities and produce validation-ready research packets without launching ventures.",
      priority: "medium",
      successCriteria: [
        "Three opportunities documented with cost, risk, and confidence scores.",
        "Recommended opportunity identified with rationale.",
        "Validation requirements listed for each candidate.",
      ],
      constraints: [
        "Initial operating budget below $500.",
        "No venture creation or external deployment.",
        "Advisory research only.",
      ],
      proposedSteps: [
        "Gather market signals for each opportunity.",
        "Estimate MVP scope and cost for the recommended opportunity.",
        "Produce executive-ready comparison summary.",
      ],
    },
  };
}
