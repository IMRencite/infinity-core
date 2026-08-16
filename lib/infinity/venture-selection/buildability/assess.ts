import type { BuildabilityAssessment, LoadedCandidateBundle } from "../types";

function clamp01(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;
}

function toPercentScore(value: number): number {
  return Math.round(clamp01(value) * 10000) / 100;
}

export function assessBuildability(candidate: LoadedCandidateBundle): BuildabilityAssessment {
  const plan = candidate.monetization?.primaryPlan;
  const models = candidate.businessModelCandidates.join(" ").toLowerCase();
  const title = `${candidate.title} ${candidate.summary}`.toLowerCase();

  const requiresPhysicalInventory =
    /ecommerce|inventory|physical|warehouse|shipping|print.on.demand|pod/.test(
      `${models} ${title}`,
    ) && !/digital|saas|software|api|content|directory|lead/.test(models);

  const requiresSpecializedEmployees =
    /regulated|healthcare|legal|professional|consulting|service.plus/.test(
      `${models} ${title}`,
    ) || (plan?.operationalComplexity ?? 0) > 0.7;

  const requiresLicensing =
    /regulated|finance|healthcare|insurance|legal|compliance|broker/.test(`${models} ${title}`) ||
    (plan?.regulatoryRisk ?? 0) > 0.6;

  const requiresLargeUpfrontCapital = (plan?.estimatedCapitalRequired ?? 0) > 100000;

  const dependsOnManualSales =
    /enterprise|b2b|marketplace|sales/.test(`${models} ${title}`) &&
    (plan?.customerAcquisitionDifficulty ?? 0) > 0.55;

  const dependsOnInaccessibleSystems = (plan?.platformDependencyRisk ?? 0) > 0.65;

  const canDeliverDigitally =
    /saas|software|api|content|directory|lead|digital|newsletter|affiliate|seo|data/.test(
      `${models} ${title}`,
    ) || !requiresPhysicalInventory;

  const automationPotential = plan?.automationPotential ?? 0.55;
  const technicalComplexity = plan?.technicalComplexity ?? 0.45;
  const operationalComplexity = plan?.operationalComplexity ?? 0.4;
  const platformDependency = plan?.platformDependencyRisk ?? 0.3;

  const automationScore = toPercentScore(automationPotential);
  const operationalAutonomyScore = toPercentScore(
    automationPotential * 0.5 +
      (canDeliverDigitally ? 0.25 : 0) +
      (dependsOnManualSales ? 0 : 0.15) +
      (requiresSpecializedEmployees ? 0 : 0.1) -
      operationalComplexity * 0.2,
  );
  const externalDependencyScore = toPercentScore(
    platformDependency * 0.5 +
      (dependsOnInaccessibleSystems ? 0.25 : 0) +
      (requiresPhysicalInventory ? 0.15 : 0) +
      (requiresLicensing ? 0.1 : 0),
  );

  const buildabilityScore = toPercentScore(
    automationPotential * 0.35 +
      (1 - technicalComplexity) * 0.2 +
      (1 - operationalComplexity) * 0.15 +
      (canDeliverDigitally ? 0.15 : 0) +
      (requiresLargeUpfrontCapital ? 0 : 0.1) +
      (dependsOnManualSales ? 0 : 0.05) -
      (requiresSpecializedEmployees ? 0.1 : 0) -
      (requiresPhysicalInventory ? 0.08 : 0),
  );

  const notes: string[] = [];
  if (automationPotential >= 0.7) notes.push("High software/AI automation potential.");
  if (requiresPhysicalInventory) notes.push("Requires physical inventory or fulfillment logistics.");
  if (dependsOnManualSales) notes.push("Meaningful manual sales dependency detected.");
  if (requiresLicensing) notes.push("Regulatory/licensing burden may limit autonomy.");
  if (canDeliverDigitally) notes.push("Core value can be delivered digitally.");

  return {
    buildabilityScore,
    automationScore,
    operationalAutonomyScore,
    externalDependencyScore,
    canBuildSoftware: !requiresSpecializedEmployees || technicalComplexity < 0.75,
    canAutomateAcquisition: automationPotential >= 0.5 && !dependsOnManualSales,
    canAutomateFulfillment: canDeliverDigitally && !requiresPhysicalInventory,
    canAutomateSupport: automationPotential >= 0.55 && operationalComplexity < 0.65,
    requiresPhysicalInventory,
    requiresSpecializedEmployees,
    requiresLicensing,
    requiresLargeUpfrontCapital,
    dependsOnManualSales,
    dependsOnInaccessibleSystems,
    canDeliverDigitally,
    assessmentNotes: notes,
    assessmentInputs: {
      automationPotential,
      technicalComplexity,
      operationalComplexity,
      platformDependency,
    },
  };
}

export function assessSpeedToValue(candidate: LoadedCandidateBundle): import("../types").SpeedToValueMetrics {
  const plan = candidate.monetization?.primaryPlan;
  const monthsToRevenue = plan?.estimatedMonthsToFirstRevenue ?? 4;
  const technicalComplexity = plan?.technicalComplexity ?? 0.45;

  const estimatedBuildTimeDays = Math.round(30 + technicalComplexity * 90);
  const estimatedValidationTimeDays = 21;
  const estimatedLaunchTimeDays = estimatedBuildTimeDays + 14;
  const estimatedTimeToFirstVisitorDays = estimatedLaunchTimeDays + 7;
  const estimatedTimeToFirstLeadDays = estimatedTimeToFirstVisitorDays + 14;
  const estimatedTimeToFirstTransactionDays = Math.round(monthsToRevenue * 30 * 0.8);
  const estimatedTimeToFirstRevenueDays = Math.round(monthsToRevenue * 30);
  const estimatedTimeToBreakEvenDays = Math.round(estimatedTimeToFirstRevenueDays * 2.5);

  const speedToValueScore =
    Math.round(
      Math.max(0, Math.min(1, 1 - estimatedTimeToFirstRevenueDays / 365)) * 10000,
    ) / 100;

  return {
    estimatedBuildTimeDays,
    estimatedValidationTimeDays,
    estimatedLaunchTimeDays,
    estimatedTimeToFirstVisitorDays,
    estimatedTimeToFirstLeadDays,
    estimatedTimeToFirstTransactionDays,
    estimatedTimeToFirstRevenueDays,
    estimatedTimeToBreakEvenDays,
    speedToValueScore,
  };
}
