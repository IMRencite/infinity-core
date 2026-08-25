import { assembleBuildPackage, assembleVentureBlueprint } from "@/lib/infinity/company-builder/blueprint/assemble";
import type { LoadedVentureSelectionHandoff } from "@/lib/infinity/company-builder/types";
import { buildCanonicalVentureAssemblyIdentity } from "@/lib/infinity/venture-assembly/identity";
import { newId, type FounderIdeaStore } from "./store";
import type { FounderBuildRouteResult, FounderIdeaSubmission } from "./types";

function handoffFromSubmission(store: FounderIdeaStore, submission: FounderIdeaSubmission): LoadedVentureSelectionHandoff {
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
    recommendedProductType: "saas",
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

export function routeFounderBuild(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
): FounderBuildRouteResult {
  const approvalKey = `${submission.organizationId}:build:${submission.id}`;
  const existingId = store.approvalIdempotency.get(approvalKey);
  if (existingId) {
    const existing = store.builds.get(existingId);
    if (existing) return existing;
  }

  if (submission.founderDecision !== "BUILD" && submission.status !== "BUILD_APPROVED") {
    throw new Error("BUILD_NOT_APPROVED");
  }

  const handoff = handoffFromSubmission(store, submission);
  const blueprint = assembleVentureBlueprint({
    handoff,
    simulationOnly: true,
    sourceLineage: {
      opportunityCandidateId: submission.opportunityCandidateId,
      discoveryRunId: handoff.discoveryRunId,
      founderIdeaSubmissionId: submission.id,
      ventureOrigin: submission.origin,
      inputMode: "simulation",
    },
  });
  const blueprintId = newId();
  const buildPackage = assembleBuildPackage(blueprint, blueprintId);

  const result: FounderBuildRouteResult = {
    companyBuilderInvoked: true,
    blueprintCreated: Boolean(blueprint.core.ventureNameWorking),
    buildPackageCreated: Boolean(buildPackage),
    buildMissionCreated: true,
    codingRouterCompatible: true,
    pabReused: true,
    ventureOrigin: submission.origin,
    treasuryBypassed: false,
    publiclyDeployed: false,
    blueprintId,
    buildPackageId: `pkg:${blueprintId}`,
    missionId: `mission:founder-build:${submission.id}`,
    canonicalVentureIdentity: buildCanonicalVentureAssemblyIdentity({
      opportunityCandidateId: handoff.opportunityCandidateId,
      candidateTitle: handoff.candidateTitle ?? handoff.businessConcept,
      origin: submission.origin,
      blueprintId,
    }),
  };

  store.builds.set(result.missionId!, result);
  store.approvalIdempotency.set(approvalKey, result.missionId!);
  submission.status = "BUILDING";
  store.submissions.set(submission.id, submission);
  return result;
}
