import { commitMissionActivityDurably } from "./commit";
import { emitMissionActivity } from "./emit";
import { listMissionActivityEvents } from "./store";
import {
  CRE_CANDIDATE_ID,
  FAILED_LINEAGE_REPAIR_DEPLOYMENT_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE,
} from "@/lib/infinity/market-validation-experiment/constants";

export const FAILED_FINAL_REPAIR_MISSION_ID = "msn_cre_final_repair_successor_deploy_v1" as const;
export const FAILED_FINAL_REPAIR_DEPLOYMENT_ID = FAILED_LINEAGE_REPAIR_DEPLOYMENT_ID as typeof FAILED_LINEAGE_REPAIR_DEPLOYMENT_ID;

const TRACE = {
  missionId: FAILED_FINAL_REPAIR_MISSION_ID,
  artifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  deploymentId: FAILED_FINAL_REPAIR_DEPLOYMENT_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
  provider: "vercel.com_v1",
  correlationId: "founder_ceiling_cre_final_lineage_qid_successor_staging_v1",
};

export async function persistFailedFinalRepairSuccessorMissionHistory(): Promise<{
  persisted: boolean;
  alreadyPresent: boolean;
  eventCount: number;
}> {
  const existing = listMissionActivityEvents({
    organizationId: LIVE_ORG,
    missionId: FAILED_FINAL_REPAIR_MISSION_ID,
  });
  if (existing.some((event) => event.traceability.deploymentId === FAILED_FINAL_REPAIR_DEPLOYMENT_ID)) {
    return { persisted: true, alreadyPresent: true, eventCount: existing.length };
  }

  const base = {
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: FAILED_FINAL_REPAIR_MISSION_ID,
    missionType: "CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY",
    source: "cre_final_repair_successor_authorized_deploy_v1",
    executionClass: "VENTURE_EXECUTION" as const,
    traceability: TRACE,
  };

  const started = emitMissionActivity({
    ...base,
    engine: "mission_runtime",
    stepType: "ORCHESTRATE_FINAL_REPAIR_SUCCESSOR_DEPLOY",
    eventType: "MISSION_STARTED",
    summary: "Authorized final CRE repair successor deployment started",
  });
  const deploy = emitMissionActivity({
    ...base,
    engine: "launch_gateway",
    stepType: "CREATE_DEPLOYMENT",
    eventType: "STEP_STARTED",
    startedAt: started.startedAt,
    summary: "Publishing the final CRE successor to the isolated Vercel staging project.",
  });
  emitMissionActivity({
    ...base,
    engine: "launch_gateway",
    stepType: "CREATE_DEPLOYMENT",
    eventType: "STEP_FAILED",
    startedAt: deploy.startedAt,
    failureCode: TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE,
    technicalDetail:
      `classification=${TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE} Type error: Cannot find name 'VALIDATION_CANDIDATE_ID'. Command "next build" exited with 1.`,
    summary: "Vercel staging deployment ERROR. Retry is not authorized.",
  });
  const failed = emitMissionActivity({
    ...base,
    engine: "mission_runtime",
    stepType: "ORCHESTRATE_FINAL_REPAIR_SUCCESSOR_DEPLOY",
    eventType: "MISSION_FAILED",
    failureCode: "PROVIDER_NOT_READY",
    blocker: "RETRY_NOT_AUTHORIZED",
    authorizationRequired: "NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED",
    technicalDetail:
      `provider=vercel.com_v1 state=ERROR deployment=${FAILED_FINAL_REPAIR_DEPLOYMENT_ID} activeArtifact=${PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID} retry=forbidden`,
    summary: "Authorized deployment failed. Active artifact unchanged. Second write forbidden.",
  });

  await commitMissionActivityDurably(started);
  await commitMissionActivityDurably(deploy);
  await commitMissionActivityDurably(failed);

  return {
    persisted: true,
    alreadyPresent: false,
    eventCount: listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: FAILED_FINAL_REPAIR_MISSION_ID,
    }).length,
  };
}
