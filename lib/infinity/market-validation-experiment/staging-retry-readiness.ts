import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  evaluateVercelSourceBundleDeploymentBody,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { evaluateVercelDeploymentTarget } from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-target";
import { currentCreValidationArtifactId } from "./current-cre-artifact";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED,
  SUCCESSOR_CRE_ARTIFACT_ID,
  validationProjectName,
} from "./constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "./artifact-authorization";
import { buildDeployableSourcePackage } from "./deployable-package";
import { executeMarketValidationExperiment } from "./execute";
import { lastConsumedSuccessorFounderAuthorization } from "./founder-authorization";
import { evaluateAnalyticsBackendReadiness, evaluateFormBackendReadiness } from "./ingest";
import { inspectFreshPlanEligibility } from "./plan-eligibility";
import { evaluateSecretSafety } from "./secret-safety";
import { evaluateSourceIntegrity, SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import { evaluateNewAttemptAuthorizationRequired } from "./attempt-financial-exposure";
import { evaluateSuccessorIsolatedBuildReadiness } from "./successor-isolated-evidence";
import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";

export async function evaluateSuccessorStagingRetryReadiness(): Promise<{
  artifact: "PASS" | "FAIL";
  digest: "PASS" | "FAIL";
  build: "PASS" | "FAIL";
  deployablePackage: "PASS" | "FAIL";
  vercelTranslation: "PASS" | "FAIL";
  targetStaging: "PASS" | "FAIL";
  previewAccepted: false;
  plan: "PASS" | "FAIL";
  commercialEligibility: "PASS" | "FAIL";
  form: "PASS" | "FAIL";
  analytics: "PASS" | "FAIL";
  secretSafety: "PASS" | "FAIL";
  founderAuthorization: "PASS" | "FAIL";
  eagBlocker: typeof NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED | string;
  technicallyReady: boolean;
  providerWrites: 0;
  artifactId: string;
  digestValue: string;
  mutated: false;
  experimentState: string;
  evidenceCollection: "NOT_STARTED";
  transport: "PROVEN";
  endToEnd: "NOT_YET_VERIFIED";
}> {
  const experiment = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
  const files = experiment.artifact?.files ?? [];
  const artifactId = experiment.artifact?.artifactId ?? "";
  const pkg = buildDeployableSourcePackage({
    artifactId,
    ventureId: experiment.experiment.ventureId,
    experimentId: experiment.experiment.experimentId,
    candidateId: CRE_CANDIDATE_ID,
    files,
  });
  const integrity = evaluateSourceIntegrity({
    pkg,
    files,
    expectedArtifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    expectedDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
  });
  const isolated = evaluateSuccessorIsolatedBuildReadiness();
  const body = buildVercelSourceBundleDeploymentBody({
    projectName: validationProjectName(LOCKED_CRE_EXPERIMENT_ID),
    files,
  });
  const translation = evaluateVercelSourceBundleDeploymentBody(body);
  const preview = evaluateVercelDeploymentTarget("preview");
  const dry = await vercelAdapter.validate({
    organizationId: "org",
    actionType: "hosting.deploy_source_bundle",
    target: validationProjectName(LOCKED_CRE_EXPERIMENT_ID),
    payload: {
      project_name: validationProjectName(LOCKED_CRE_EXPERIMENT_ID),
      production_artifact_id: SUCCESSOR_CRE_ARTIFACT_ID,
      source_digest: SUCCESSOR_CRE_SOURCE_DIGEST,
      source_type: "GENERATED_FILE_TREE",
      deployment_mode: "files",
      files,
      target: "staging",
    },
    correlationId: null,
  });
  const plan = inspectFreshPlanEligibility();
  const form = evaluateFormBackendReadiness({
    artifactFiles: files,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
  });
  const analytics = evaluateAnalyticsBackendReadiness({
    artifactFiles: files,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
  });
  const secret = evaluateSecretSafety(files);
  const blob = files.map((file) => file.content).join("\n");
  const auth = evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId,
    artifactValid: integrity.status === "PASS" && experiment.authorization.artifactValidation === "PASS",
    validationPassed: experiment.authorization.artifactValidation === "PASS",
    fullProduct: false,
    purpose: MARKET_VALIDATION_PURPOSE,
    artifactFiles: files,
    founderAuthorization: lastConsumedSuccessorFounderAuthorization(),
  });
  const nextAuth = evaluateNewAttemptAuthorizationRequired();
  const artifactPass =
    artifactId === SUCCESSOR_CRE_ARTIFACT_ID &&
    currentCreValidationArtifactId() === SUCCESSOR_CRE_ARTIFACT_ID
      ? "PASS"
      : "FAIL";
  const digestPass =
    integrity.status === "PASS" && pkg.sourceDigest === SUCCESSOR_CRE_SOURCE_DIGEST ? "PASS" : "FAIL";
  const footerPass = blob.includes(CANONICAL_FOOTER_COPY);
  const technicallyReady =
    artifactPass === "PASS" &&
    digestPass === "PASS" &&
    isolated.status === "PASS" &&
    translation.valid &&
    dry.valid &&
    body.target === "staging" &&
    !preview.valid &&
    plan.marketValidationExperiment === "PASS" &&
    plan.commercialUse === "YES" &&
    form.readyForLiveDeploy &&
    analytics.readyForLiveDeploy &&
    secret.status === "PASS" &&
    footerPass;
  return {
    artifact: artifactPass,
    digest: digestPass,
    build: isolated.status,
    deployablePackage: integrity.status,
    vercelTranslation: translation.valid && dry.valid ? "PASS" : "FAIL",
    targetStaging: body.target === "staging" && translation.valid ? "PASS" : "FAIL",
    previewAccepted: false,
    plan: plan.marketValidationExperiment,
    commercialEligibility: plan.commercialUse === "YES" ? "PASS" : "FAIL",
    form: form.readyForLiveDeploy ? "PASS" : "FAIL",
    analytics: analytics.readyForLiveDeploy ? "PASS" : "FAIL",
    secretSafety: secret.status,
    founderAuthorization: auth.approved ? "PASS" : "FAIL",
    eagBlocker: nextAuth.reason,
    technicallyReady,
    providerWrites: 0,
    artifactId,
    digestValue: pkg.sourceDigest,
    mutated: false,
    experimentState: experiment.state,
    evidenceCollection: "NOT_STARTED",
    transport: "PROVEN",
    endToEnd: "NOT_YET_VERIFIED",
  };
}
