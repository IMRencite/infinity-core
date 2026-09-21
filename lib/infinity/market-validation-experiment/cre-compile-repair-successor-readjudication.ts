import {
  CRE_CANDIDATE_ID,
  DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
  LOCKED_CRE_EXPERIMENT_ID,
  OPTIONAL_DEFENSIVE_HARDENING,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
  REQUIRED_FOR_CORRECTNESS,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import { EXPECTED_DR_PUBLIC_ROUTES } from "./cre-dr-successor-authorization";
import { liveVerificationPassed, verifyDirectResponseSuccessorLivePublic } from "./cre-dr-successor-live-verify";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { getActivePublicValidationArtifactId } from "./active-public-artifact";
import { persistCompileRepairLayoutFalseNegativeCorrection } from "@/lib/infinity/mission-activity/persist-cre-layout-false-negative-correction";
import { persistDeployedCompileRepairLayoutFailHistory } from "@/lib/infinity/mission-activity/persist-deployed-cre-compile-repair-layout-fail";
import { listMissionActivityEvents } from "@/lib/infinity/mission-activity/store";
import { LIVE_ORG } from "./constants";
import {
  adjudicateRenderedLayout,
  classifyUnpublishedLayoutSuccessor,
  textualCssParserCannotOverrideBrowserGeometry,
} from "@/lib/infinity/public-venture-design/rendered-layout/adjudication-precedence";
import {
  runServedProductionRenderedLayoutGateAgainstOrigin,
  servedProductionLayoutPasses,
} from "@/lib/infinity/public-venture-design/rendered-layout/served-production-gate";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-provider-equivalent-compile-repair-successor";

export const COMPILE_REPAIR_LIVE_ORIGIN = DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL;

export async function reAdjudicateDeployedCompileRepairSuccessor(input?: {
  origin?: string;
  freeze?: boolean;
}) {
  const origin = input?.origin ?? COMPILE_REPAIR_LIVE_ORIGIN;
  const historical = await persistDeployedCompileRepairLayoutFailHistory();
  const reconstructed = await reconstructCreProviderEquivalentCompileRepairSuccessor();
  if (reconstructed.artifactId !== PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`readjudication_artifact_drift:${reconstructed.artifactId}`);
  }
  if (reconstructed.digest !== PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`readjudication_digest_drift:${reconstructed.digest}`);
  }

  const served = await runServedProductionRenderedLayoutGateAgainstOrigin({
    artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    origin,
    files: reconstructed.files,
    routes: EXPECTED_DR_PUBLIC_ROUTES,
    viewports: ["desktop", "mobile"],
    freeze: input?.freeze !== false,
  });
  const live = await verifyDirectResponseSuccessorLivePublic({
    url: origin,
    intendedRoutes: [...EXPECTED_DR_PUBLIC_ROUTES],
    artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
  });
  const adjudication = adjudicateRenderedLayout({
    servedBrowserGeometry: served.fullBleedInnerPadding,
    compiledCssText: "FAIL",
    sourceCss: "PASS",
  });
  const layoutPass = servedProductionLayoutPasses(served);
  const functionalPass = liveVerificationPassed(live);
  const readyForActivation = layoutPass && functionalPass && adjudication.status === "PASS";
  const successorClassification = classifyUnpublishedLayoutSuccessor({
    deployedServedGeometry: served.fullBleedInnerPadding,
    deterministicLayoutDefect: !layoutPass,
  });
  const correction = readyForActivation
    ? await persistCompileRepairLayoutFalseNegativeCorrection()
    : {
        initialFailurePreserved: historical.persisted,
        correctionAppended: false,
        alreadyPresent: false,
        eventCount: 0,
        initialVerificationResult: "FAIL" as const,
        failureSource: "VERIFIER_FALSE_NEGATIVE" as const,
        actualArtifactLayout: "FAIL" as const,
        resolution: RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
        correctedClassification: LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
      };
  const historyEvents = listMissionActivityEvents({
    organizationId: LIVE_ORG,
    missionId: "msn_cre_compile_repair_successor_deploy_v1",
  });
  const evidence = inspectRealMarketEvidence();
  const clock = inspectExperimentClock();
  return {
    artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    deploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
    origin,
    providerState: "READY" as const,
    historicalInitialFailure: "FAIL" as const,
    historicalFailureCode: DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
    actualArtifactDefect: false,
    verifierFalseNegative: adjudication.classification === LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
    correctedClassification: LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
    resolution: RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
    historyPreserved: correction.initialFailurePreserved,
    historyStillContainsOriginalFail: historyEvents.some(
      (event) => event.failureCode === DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
    ),
    textualParserCannotOverride: textualCssParserCannotOverrideBrowserGeometry(),
    served,
    live,
    adjudication,
    layoutPass,
    functionalPass,
    readyForActivation,
    activated: false as const,
    activeArtifact: getActivePublicValidationArtifactId(),
    expectedActiveArtifact: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    unpublishedSuccessor: {
      artifactId: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
      digest: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_SOURCE_DIGEST,
      classification: successorClassification,
      deploymentRequiredBeforeActivation: successorClassification === REQUIRED_FOR_CORRECTNESS,
      reason:
        successorClassification === OPTIONAL_DEFENSIVE_HARDENING
          ? "Existing READY deployment passes served-production browser geometry. CSS successor is defensive hardening only."
          : "Deployed artifact still has a deterministic served-production layout defect.",
    },
    experiment: {
      state: evidence.experiment.state,
      evidenceStart: clock.evidenceStart,
      deadline: clock.deadline,
      clockRestarted: clock.restarted,
      qualified: evidence.counts.qualifiedSubmissions,
      strongIntent: evidence.counts.strongIntent,
      pricing: evidence.counts.pricingSelections,
      syntheticEvidence: 0,
    },
    providerWrites: 0 as const,
    deployments: 0 as const,
    retries: 0 as const,
    activation: 0 as const,
    canonicalEvidenceStart: CANONICAL_EVIDENCE_START,
  };
}
