import { commitMissionActivityDurably } from "./commit";
import { emitMissionActivity } from "./emit";
import { listMissionActivityEvents } from "./store";
import { persistDeployedCompileRepairLayoutFailHistory } from "./persist-deployed-cre-compile-repair-layout-fail";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
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

export async function persistCompileRepairLayoutFalseNegativeCorrection(): Promise<{
  initialFailurePreserved: boolean;
  correctionAppended: boolean;
  alreadyPresent: boolean;
  eventCount: number;
  initialVerificationResult: "FAIL";
  failureSource: "VERIFIER_FALSE_NEGATIVE";
  actualArtifactLayout: "PASS";
  resolution: typeof RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY;
  correctedClassification: typeof LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE;
}> {
  await persistDeployedCompileRepairLayoutFailHistory();
  const existing = listMissionActivityEvents({
    organizationId: LIVE_ORG,
    missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
  });
  const initialFailurePreserved = existing.some(
    (event) =>
      event.traceability.deploymentId === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID &&
      event.eventType === "STEP_FAILED" &&
      event.failureCode === DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  );
  if (!initialFailurePreserved) {
    throw new Error("initial_layout_verification_failure_missing");
  }
  if (
    existing.some(
      (event) =>
        event.traceability.deploymentId === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID &&
        event.failureCode === LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
    )
  ) {
    return {
      initialFailurePreserved: true,
      correctionAppended: false,
      alreadyPresent: true,
      eventCount: existing.length,
      initialVerificationResult: "FAIL",
      failureSource: "VERIFIER_FALSE_NEGATIVE",
      actualArtifactLayout: "PASS",
      resolution: RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
      correctedClassification: LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
    };
  }

  const correction = emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
    missionType: "CRE_GOVERNED_COMPILE_REPAIR_SUCCESSOR_DEPLOY",
    source: "cre_compile_repair_successor_live_layout_readjudication_v1",
    executionClass: "VENTURE_EXECUTION",
    engine: "market_validation",
    stepType: "SERVED_PRODUCTION_LAYOUT_GATE",
    eventType: "EVIDENCE_RECEIVED",
    failureCode: LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
    technicalDetail:
      `INITIAL_VERIFICATION_RESULT=FAIL FAILURE_SOURCE=VERIFIER_FALSE_NEGATIVE ACTUAL_ARTIFACT_LAYOUT=PASS RESOLUTION=${RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY} classification=${LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE} deployment=${DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID} url=${DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL} activeArtifact=${PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID} artifactStillBelowStandard=NO`,
    summary:
      "Old compiled-CSS lastRule verifier false-negative corrected by ServedProductionRenderedLayoutGate browser geometry. Artifact layout PASS. Historical FAIL event preserved.",
    traceability: TRACE,
  });
  await commitMissionActivityDurably(correction);

  return {
    initialFailurePreserved: true,
    correctionAppended: true,
    alreadyPresent: false,
    eventCount: listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: DEPLOYED_COMPILE_REPAIR_LAYOUT_FAIL_MISSION_ID,
    }).length,
    initialVerificationResult: "FAIL",
    failureSource: "VERIFIER_FALSE_NEGATIVE",
    actualArtifactLayout: "PASS",
    resolution: RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
    correctedClassification: LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
  };
}
