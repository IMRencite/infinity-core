import { commitMissionActivityDurably } from "./commit";
import { emitMissionActivity } from "./emit";
import { listMissionActivityEvents } from "./store";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";

export const DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID =
  "msn_cre_compile_repair_successor_deploy_v1" as const;

const TRACE = {
  missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
  artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  deploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
  provider: "vercel.com_v1",
  correlationId: "founder_ceiling_cre_compile_repair_successor_staging_v1",
};

export async function persistDeployedCompileRepairLayoutFailHistory(): Promise<{
  persisted: boolean;
  alreadyPresent: boolean;
  eventCount: number;
}> {
  const existing = listMissionActivityEvents({
    organizationId: LIVE_ORG,
    missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
  });
  if (
    existing.some(
      (event) =>
        event.traceability.deploymentId === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID &&
        event.failureCode === DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
    )
  ) {
    return { persisted: true, alreadyPresent: true, eventCount: existing.length };
  }

  const base = {
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
    missionType: "CRE_GOVERNED_COMPILE_REPAIR_SUCCESSOR_DEPLOY",
    source: "cre_compile_repair_successor_authorized_deploy_v1",
    executionClass: "VENTURE_EXECUTION" as const,
    traceability: TRACE,
  };

  const completed = emitMissionActivity({
    ...base,
    engine: "launch_gateway",
    stepType: "CREATE_DEPLOYMENT",
    eventType: "STEP_COMPLETED",
    summary: `Provider READY ${DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID}. Not a provider deployment failure.`,
  });
  const layout = emitMissionActivity({
    ...base,
    engine: "market_validation",
    stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
    eventType: "STEP_FAILED",
    startedAt: completed.startedAt,
    failureCode: DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
    technicalDetail:
      `classification=${DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD} provider=READY liveVerification=FAIL failure=FULL_BLEED_INNER_PADDING_MISSING activation=NO url=${DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL} activeArtifact=${PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID}`,
    summary: "Deployed successor remains READY. Live rendered layout below standard. Activation not authorized.",
  });

  await commitMissionActivityDurably(completed);
  await commitMissionActivityDurably(layout);

  return {
    persisted: true,
    alreadyPresent: false,
    eventCount: listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
    }).length,
  };
}
