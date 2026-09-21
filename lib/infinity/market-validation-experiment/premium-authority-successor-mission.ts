import { emitMissionActivity, projectCommandActivity } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
} from "./constants";

export const PREMIUM_AUTHORITY_SUCCESSOR_PUBLICATION_MISSION =
  "PREMIUM_AUTHORITY_SITE_SUCCESSOR_PUBLICATION" as const;

const MISSION_ID = "msn_premium_authority_successor_publish_v1";

function base(input: { artifactId?: string; deploymentId?: string | null }) {
  return {
    organizationId: LIVE_ORG,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: MISSION_ID,
    missionType: PREMIUM_AUTHORITY_SUCCESSOR_PUBLICATION_MISSION,
    executionClass: "VENTURE_EXECUTION" as const,
    source: "market_validation",
    traceability: {
      missionId: MISSION_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
      artifactId: input.artifactId ?? PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
      deploymentId: input.deploymentId ?? null,
      provider: "vercel.com_v1",
    },
  };
}

export function emitPremiumAuthoritySuccessorPublicationStarted() {
  return emitMissionActivity({
    ...base({}),
    engine: "mission_runtime",
    stepType: "MARKET_VALIDATION_ACQUISITION",
    eventType: "MISSION_STARTED",
    summary: "Orchestrating successor publication",
  });
}

export function emitPremiumAuthoritySuccessorDeploymentSteps(input: {
  deploymentId?: string | null;
  ready: boolean;
}) {
  const shared = base({ deploymentId: input.deploymentId });
  emitMissionActivity({
    ...shared,
    engine: "launch_gateway",
    stepType: "PREPARE_SOURCE_BUNDLE",
    eventType: "STEP_COMPLETED",
    summary: "Preparing the authority-site source bundle",
  });
  emitMissionActivity({
    ...shared,
    engine: "launch_gateway",
    stepType: "UPLOAD_FILES",
    eventType: "STEP_COMPLETED",
    summary: "Uploading source-bundle files",
  });
  emitMissionActivity({
    ...shared,
    engine: "launch_gateway",
    stepType: "CREATE_DEPLOYMENT",
    eventType: "STEP_COMPLETED",
    summary: "Creating the staging deployment",
  });
  emitMissionActivity({
    ...shared,
    engine: "launch_gateway",
    stepType: "PROVIDER_BUILD",
    eventType: input.ready ? "STEP_COMPLETED" : "STEP_FAILED",
    summary: input.ready ? "Provider build reached READY" : "Provider build did not reach READY",
  });
  if (input.ready) {
    emitMissionActivity({
      ...shared,
      engine: "launch_gateway",
      stepType: "DEPLOYMENT_READY",
      eventType: "STEP_COMPLETED",
      summary: "The public successor deployment is ready",
    });
  }
}

export function emitPremiumAuthoritySuccessorVerification(input: {
  deploymentId?: string | null;
  liveVerified: boolean;
  instrumentationChecked: boolean;
}) {
  const shared = base({ deploymentId: input.deploymentId });
  emitMissionActivity({
    ...shared,
    engine: "market_validation",
    stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
    eventType: input.liveVerified ? "STEP_COMPLETED" : "STEP_FAILED",
    summary: "Live authority-site verification",
  });
  if (input.instrumentationChecked) {
    emitMissionActivity({
      ...shared,
      engine: "performance_intelligence",
      stepType: "EVIDENCE_MONITORING",
      eventType: "STEP_COMPLETED",
      summary: "Checking page, section, and pattern identity on the live site",
    });
  }
  emitMissionActivity({
    ...shared,
    engine: "mission_runtime",
    stepType: "MARKET_VALIDATION_ACQUISITION",
    eventType: input.liveVerified ? "MISSION_COMPLETED" : "MISSION_FAILED",
    summary: input.liveVerified
      ? "Successor publication verified. Experiment collection continues."
      : "Successor publication stopped after live verification.",
  });
  return projectCommandActivity({
    organizationId: LIVE_ORG,
    knownSteps: [
      "PREPARE_SOURCE_BUNDLE",
      "UPLOAD_FILES",
      "CREATE_DEPLOYMENT",
      "PROVIDER_BUILD",
      "DEPLOYMENT_READY",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
      "EVIDENCE_MONITORING",
    ],
  });
}
