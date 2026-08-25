import { assembleBuildPackage, assembleVentureBlueprint } from "@/lib/infinity/company-builder/blueprint/assemble";
import type { LoadedVentureSelectionHandoff, SourceLineage } from "@/lib/infinity/company-builder/types";
import type { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import type { ZeroToProductionStore } from "./store";
import { newId } from "./store";
import type { ZtpOrigin } from "./constants";

export function handoffFromFounder(store: FounderIdeaStore, submission: FounderIdeaSubmission): LoadedVentureSelectionHandoff {
  const candidate = submission.opportunityCandidateId ? store.candidates.get(submission.opportunityCandidateId) : null;
  const grade = store.grades.get(submission.id);
  const plan = grade?.evaluation?.candidate.monetization?.primaryPlan;
  return {
    id: null,
    organizationId: submission.organizationId,
    ventureSelectionRunId: null,
    candidateSelectionEvaluationId: null,
    opportunityCandidateId: candidate?.id ?? null,
    discoveryRunId: candidate?.discoveryRunId ?? null,
    monetizationRunId: grade?.evaluation?.candidate.monetization?.monetizationRunId ?? null,
    businessConcept: candidate?.title ?? submission.title,
    targetCustomer: candidate?.targetCustomer ?? submission.targetCustomer ?? "UNSPECIFIED",
    problem: candidate?.problem ?? submission.problem ?? submission.description,
    solution: submission.proposedSolution ?? candidate?.summary ?? submission.description,
    primaryMonetizationModel: plan?.modelType ?? "saas_subscription",
    secondaryRevenueStreams: [],
    pricingStrategy: submission.pricingHypothesis ?? plan?.modelName ?? "Monthly subscription ESTIMATE",
    distributionStrategy: "Self-serve digital until evidence exists",
    recommendedProductType: plan?.modelType?.includes("lead") ? "lead_generation" : "saas",
    requiredCapabilities: ["software_development", "automated_acquisition"],
    mvpRequirements: ["Core workflow", "Auth", "Billing"],
    futureFeatures: ["Reporting"],
    economicTargets: {
      expected12MonthProfit: grade?.evaluation?.expectedValueDerived.expected12MonthProfit ?? null,
      expectedRoi: grade?.expectedRoi ?? null,
      estimatedCapitalRequired: grade?.estimatedCapitalRequired ?? null,
    },
    budgetEnvelope: {
      startupCapital: grade?.estimatedCapitalRequired ?? 18000,
      monthlyOperatingBudget: 2500,
    },
    riskConstraints: { founderIdeaSubmissionId: submission.id, ventureOrigin: submission.origin },
    validationState: submission.origin === "FOUNDER_OVERRIDE" ? "founder_override" : "founder_submitted",
    sourceEvidenceRefs: candidate?.researchSources.map((s) => s.url).filter(Boolean) as string[] ?? [],
    handoffStatus: "ready",
    decision: "BUILD",
    simulationOnly: true,
    candidateTitle: candidate?.title,
    candidateSummary: candidate?.summary,
    businessModelCandidates: candidate?.businessModelCandidates,
    monetizationScore: grade?.monetizationScore ?? null,
  };
}

export function handoffFromAutonomous(
  organizationId: string,
  candidate: OpportunityCandidate,
  grade: FounderIdeaGrade,
  origin: ZtpOrigin,
): LoadedVentureSelectionHandoff {
  const plan = grade.evaluation?.candidate.monetization?.primaryPlan;
  return {
    id: null,
    organizationId,
    ventureSelectionRunId: null,
    candidateSelectionEvaluationId: null,
    opportunityCandidateId: candidate.id,
    discoveryRunId: candidate.discoveryRunId,
    monetizationRunId: grade.evaluation?.candidate.monetization?.monetizationRunId ?? null,
    businessConcept: candidate.title,
    targetCustomer: candidate.targetCustomer,
    problem: candidate.problem,
    solution: candidate.summary,
    primaryMonetizationModel: plan?.modelType ?? "saas_subscription",
    secondaryRevenueStreams: [],
    pricingStrategy: plan?.modelName ?? "Monthly subscription ESTIMATE",
    distributionStrategy: "Self-serve digital until evidence exists",
    recommendedProductType: "saas",
    requiredCapabilities: ["software_development", "automated_acquisition"],
    mvpRequirements: ["Core workflow", "Auth", "Billing"],
    futureFeatures: ["Reporting"],
    economicTargets: {
      expected12MonthProfit: grade.evaluation?.expectedValueDerived.expected12MonthProfit ?? null,
      expectedRoi: grade.expectedRoi ?? null,
      estimatedCapitalRequired: grade.estimatedCapitalRequired ?? null,
    },
    budgetEnvelope: {
      startupCapital: grade.estimatedCapitalRequired ?? 18000,
      monthlyOperatingBudget: 2500,
    },
    riskConstraints: { ventureOrigin: origin },
    validationState: "autonomous_discovery",
    sourceEvidenceRefs: candidate.researchSources.map((s) => s.url).filter(Boolean) as string[],
    handoffStatus: "ready",
    decision: "BUILD",
    simulationOnly: true,
    candidateTitle: candidate.title,
    candidateSummary: candidate.summary,
    businessModelCandidates: candidate.businessModelCandidates,
    monetizationScore: grade.monetizationScore,
  };
}

export function assembleCanonicalBlueprint(
  ztp: ZeroToProductionStore,
  handoff: LoadedVentureSelectionHandoff,
  lineage: SourceLineage,
): { blueprintId: string; packageId: string; graphId: string } {
  const blueprint = assembleVentureBlueprint({
    handoff,
    simulationOnly: true,
    sourceLineage: lineage,
  });
  const blueprintId = newId();
  const buildPackage = assembleBuildPackage(blueprint, blueprintId);
  const packageId = `pkg:${blueprintId}`;
  const graphId = `graph:${blueprintId}`;
  ztp.blueprints.set(blueprintId, blueprint);
  ztp.packages.set(packageId, buildPackage);
  ztp.graphs.set(graphId, blueprint.buildGraph);
  return { blueprintId, packageId, graphId };
}
