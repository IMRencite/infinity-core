import type { LaunchReadinessReport, ZeroToProductionRun } from "./types";
import type { BuildPackageDraft } from "@/lib/infinity/company-builder/types";
import type { CommercializationPlan } from "@/lib/infinity/commercialization/types";

export function evaluateLaunchReadiness(input: {
  run: ZeroToProductionRun;
  buildPackage: BuildPackageDraft | null;
  commercializationPlan: CommercializationPlan | null;
  treasuryReady: boolean;
  domainRequirementReady: boolean;
}): LaunchReadinessReport {
  const businessDecisionValid = input.run.businessOutcome === "BUILD_AUTHORIZED";
  const ventureBlueprintReady = Boolean(input.run.ventureBlueprintId);
  const buildPackageReady = Boolean(input.buildPackage && input.buildPackage.status !== "BLOCKED");
  const buildGraphComplete = Boolean(input.run.buildGraphId);
  const qaPassed = input.run.qaPassed === true;
  const productionArtifactReady = Boolean(input.run.productionArtifactId);
  const commercializationPlanReady = Boolean(input.commercializationPlan);
  const paymentRequirementReady = Boolean(input.commercializationPlan?.paymentModel);
  const fulfillmentReady = Boolean(input.commercializationPlan?.fulfillmentModel);
  const telemetryReady = input.run.performanceHooksDeclared.length > 0;
  const hostingRequirementReady = Boolean(input.commercializationPlan?.hostingRequirements);
  const noUnresolvedHighCritical = !input.run.failureCode && input.run.stale === false;
  const checks = [
    businessDecisionValid,
    ventureBlueprintReady,
    buildPackageReady,
    buildGraphComplete,
    qaPassed,
    productionArtifactReady,
    commercializationPlanReady,
    input.treasuryReady,
    input.domainRequirementReady,
    hostingRequirementReady,
    paymentRequirementReady,
    fulfillmentReady,
    telemetryReady,
    noUnresolvedHighCritical,
  ];
  const passed = checks.every(Boolean);
  const result = passed ? "READY" : checks.filter(Boolean).length >= 8 ? "DEGRADED" : "BLOCKED";
  return {
    businessDecisionValid,
    ventureBlueprintReady,
    buildPackageReady,
    buildGraphComplete,
    qaPassed,
    productionArtifactReady,
    commercializationPlanReady,
    treasuryReady: input.treasuryReady,
    domainRequirementReady: input.domainRequirementReady,
    hostingRequirementReady,
    paymentRequirementReady,
    fulfillmentReady,
    telemetryReady,
    noUnresolvedHighCritical,
    result,
    publiclyLaunched: false,
    label: result === "READY" ? "READY_FOR_CONTROLLED_LAUNCH" : result,
  };
}
