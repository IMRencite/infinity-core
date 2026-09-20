import { PRODUCTION_GROWTH_RUNTIME_READINESS_GATE, type NamedGrowthGate } from "./contract";
import { evaluateLiveOutboundCommunicationPathGate } from "./path-gate";
import {
  occupancynpvGrowthSendCycle,
  occupancynpvGrowthSourcingCycle,
  readOccupancynpvFirstGrowthExperiment,
} from "./occupancynpv-experiment";
import { DEPLOYMENT_AUTHORITY } from "@/lib/infinity/production-artifact/handoff/constants";
import { liveCommercialCheckoutUnhealthy } from "./commercial-readiness";
import { occupancynpvBoundedGrowthGrantRecorded } from "./founder-grant";
import { evaluateQualifiedProspectSourceAuthorizationGate } from "./prospect-source";
import {
  evaluateIsolatedProductionArtifactContract,
  evaluateProductionArtifactContaminationGate,
} from "./isolated-artifact";
import { evaluateOutboundSchedulerWindowCoverageGate } from "./scheduler-coverage";

export type OccupancynpvGrowthOutboundAuthority = {
  routineOutboundSend: "AUTHORIZED" | "NOT_AUTHORIZED";
  deploymentAuthority: "AUTHORIZED" | "NOT_AUTHORIZED";
  reasons: string[];
  blockingAuthorization: string;
};

export type ProductionGrowthRuntimeInspection = NamedGrowthGate & {
  campaignPersisted: boolean;
  schedulerSeesCampaign: boolean;
  providerReady: boolean;
  sourcingReady: boolean;
  qualificationReady: boolean;
  sendQueueReady: boolean;
  suppressionReady: boolean;
  timingReady: boolean;
  performanceTelemetryReady: boolean;
  productionContainsRuntime: boolean;
};

export function evaluateOccupancynpvGrowthOutboundAuthority(): OccupancynpvGrowthOutboundAuthority {
  const experiment = readOccupancynpvFirstGrowthExperiment();
  const grant = occupancynpvBoundedGrowthGrantRecorded();
  const source = evaluateQualifiedProspectSourceAuthorizationGate();
  const isolation = evaluateIsolatedProductionArtifactContract();
  const contamination = evaluateProductionArtifactContaminationGate();
  const scheduler = evaluateOutboundSchedulerWindowCoverageGate({
    cronExpressions: ["0 * * * *", "0 12 * * *"],
  });
  const sourcing = occupancynpvGrowthSourcingCycle();
  const sending = occupancynpvGrowthSendCycle(experiment?.ledger ?? {
    prospectsSourced: 0,
    prospectsQualified: 0,
    attempted: 0,
    delivered: 0,
    bounced: 0,
    replied: 0,
    qualifiedReplies: 0,
    qualifiedConversations: 0,
    problemConfirmation: 0,
    pricingFeedback: 0,
    trialInterest: 0,
    purchaseIntent: 0,
    actualPurchase: 0,
  });
  const reasons: string[] = [];
  if (!grant) reasons.push("BOUNDED_GROWTH_GRANT_NOT_RECORDED");
  if (source.result !== "PASS") reasons.push("NO_AUTHORIZED_QUALIFIED_PROSPECT_SOURCE");
  if (isolation.result !== "PASS") reasons.push("ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED");
  if (contamination.result !== "PASS") reasons.push("PRODUCTION_ARTIFACT_CONTAMINATED");
  if (scheduler.result !== "PASS") reasons.push("OUTBOUND_SCHEDULER_WINDOW_COVERAGE_FAIL");
  if (sourcing.reason === "NO_AUTHORIZED_QUALIFIED_PROSPECT_SOURCE") {
    reasons.push("SOURCING_CYCLE_BLOCKED");
  }
  if (sending.sent === 0 && sending.reason !== "NO_QUALIFIED_PROSPECTS_QUEUED") {
    reasons.push("SEND_CYCLE_DOES_NOT_AUTHORIZE_PROSPECT_SEND");
  }
  reasons.push("AUTHORITY_NOT_INFERRED_FROM_CODE_OR_EXPERIMENT_FLAG");
  if (DEPLOYMENT_AUTHORITY === "NONE") reasons.push("CANONICAL_DEPLOYMENT_AUTHORITY_NONE");
  reasons.push("WORKING_TREE_CONTAINS_UNRELATED_AND_ASKREVIEW_ARTIFACTS");
  const allGates = grant
    && source.result === "PASS"
    && isolation.result === "PASS"
    && contamination.result === "PASS"
    && scheduler.result === "PASS";
  return {
    routineOutboundSend: allGates ? "AUTHORIZED" : "NOT_AUTHORIZED",
    deploymentAuthority: allGates ? "AUTHORIZED" : "NOT_AUTHORIZED",
    reasons: [...new Set(reasons)],
    blockingAuthorization: isolation.result !== "PASS"
      ? "ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED"
      : source.result !== "PASS"
        ? "GROWTH_PROSPECT_SOURCE_CONFIGURATION_REQUIRED"
        : "Bounded OccupancyNPV growth grant remains subject to isolation, source, scheduler, and per-prospect gates",
  };
}

export function evaluateProductionGrowthRuntimeReadinessGate(input: {
  productionContainsRuntime?: boolean;
  schedulerSeesCampaign?: boolean;
} = {}): ProductionGrowthRuntimeInspection {
  const experiment = readOccupancynpvFirstGrowthExperiment();
  const path = evaluateLiveOutboundCommunicationPathGate();
  const authority = evaluateOccupancynpvGrowthOutboundAuthority();
  const sourcing = occupancynpvGrowthSourcingCycle();
  const productionContainsRuntime = input.productionContainsRuntime ?? false;
  const schedulerSeesCampaign = input.schedulerSeesCampaign ?? false;
  const campaignPersisted = Boolean(experiment && experiment.status === "GROWTH_EXPERIMENT_ACTIVE");
  const providerReady = path.result === "PASS" && !liveCommercialCheckoutUnhealthy();
  const source = evaluateQualifiedProspectSourceAuthorizationGate();
  const isolation = evaluateIsolatedProductionArtifactContract();
  const sourcingReady = source.result === "PASS" && isolation.result === "PASS" && sourcing.sourced > 0;
  const qualificationReady = true;
  const sendQueueReady = authority.routineOutboundSend === "AUTHORIZED";
  const suppressionReady = path.suppression === "PASS";
  const timingReady = experiment?.timezone_strategy === "recipient_local_time";
  const performanceTelemetryReady = true;
  const reasons: string[] = [];
  if (!productionContainsRuntime) reasons.push("PRODUCTION_DOES_NOT_CONTAIN_GROWTH_RUNTIME");
  if (!schedulerSeesCampaign) reasons.push("PRODUCTION_SCHEDULER_DOES_NOT_SEE_CAMPAIGN");
  if (!campaignPersisted) reasons.push("CAMPAIGN_NOT_PERSISTED");
  if (!providerReady) reasons.push("PROVIDER_OR_CHECKOUT_NOT_READY");
  if (!sourcingReady) reasons.push("SOURCING_NOT_LIVE");
  if (!sendQueueReady) reasons.push("ROUTINE_OUTBOUND_SEND_NOT_AUTHORIZED");
  if (authority.deploymentAuthority !== "AUTHORIZED") reasons.push("GROWTH_RUNTIME_DEPLOY_NOT_AUTHORIZED");
  return {
    gate: PRODUCTION_GROWTH_RUNTIME_READINESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    campaignPersisted,
    schedulerSeesCampaign,
    providerReady,
    sourcingReady,
    qualificationReady,
    sendQueueReady,
    suppressionReady,
    timingReady,
    performanceTelemetryReady,
    productionContainsRuntime,
  };
}
