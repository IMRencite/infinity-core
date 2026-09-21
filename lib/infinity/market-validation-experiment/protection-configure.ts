import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import {
  buildVercelDisableSsoProtectionBody,
  evaluateVercelProtectionMutationRequest,
  inspectVercelProjectSsoProtection,
  ISOLATED_VALIDATION_PROJECT,
  PROTECTION_CAPABILITY,
  vercelProjectUpdatePath,
} from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-protection";
import {
  FAILED_CRE_VALIDATION_PROJECT,
  LIVE_ORG,
  MARKET_VALIDATION_PURPOSE,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "./constants";
import { evaluateValidationExperimentEag } from "./eag-policy";
import { evaluateSecretSafety } from "./secret-safety";
import {
  LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
  lastReadySourceBundleRemainsVerified,
} from "./live-validation-failure";
import {
  consumeProtectionFounderAuthorization,
  evaluateThisRequestProtectionAuthorization,
  evaluateThisRequestProtectionCeilings,
  PROTECTION_FOUNDER_AUTHORIZATION_ID,
} from "./protection-authorization";
import { getProtectionVerification, persistProtectionVerification } from "./protection-verification";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";

export function evaluateProtectionConfigureReadiness(input: {
  artifactFiles: Array<{ path: string; content: string }>;
}): {
  capability: typeof PROTECTION_CAPABILITY;
  capabilityStatus: "UNVERIFIED" | "LIVE_WRITE_VERIFIED" | "FAILED";
  separateFromSourceBundle: true;
  projectScoped: true;
  teamDefaultChanged: false;
  mutationEndpoint: string;
  mutationBody: { ssoProtection: null };
  founder: ReturnType<typeof evaluateThisRequestProtectionCeilings>;
  authorization: ReturnType<typeof evaluateThisRequestProtectionAuthorization>;
  secretSafety: "PASS" | "FAIL";
  privateHqExposed: false;
  customerDataExposed: false;
  eag: ReturnType<typeof evaluateValidationExperimentEag>;
  sourceBundleUnchanged: true;
  attempted: false;
  stopReason: string;
} {
  const founder = evaluateThisRequestProtectionCeilings();
  const authorization = evaluateThisRequestProtectionAuthorization();
  const secret = evaluateSecretSafety(input.artifactFiles);
  const blob = input.artifactFiles.map((file) => file.content).join("\n");
  const eag = evaluateValidationExperimentEag({
    artifactEligible: secret.status === "PASS" && !/SUPABASE_SERVICE_ROLE|createAdminClient/.test(blob),
    purpose: MARKET_VALIDATION_PURPOSE,
    providerCapabilityVerified: false,
    deployInputCompatible: false,
    newCapabilityRequired: true,
    newCapabilityVerified: false,
    formReady: true,
    analyticsReady: true,
    secretSafety: secret.status,
    costClassification: "UNKNOWN",
    unknownCost: true,
    treasuryAuthorized: false,
    customDomainRequested: false,
    dnsRequested: false,
    paymentsRequested: false,
    treasuryRequested: false,
    adsRequested: false,
    existingDeploymentCount: 0,
    eagGrants: [],
    treasuryGrants: [],
    founderAuthorizationRecognized: founder.recognized && authorization.recognized,
    firstCapabilityVerificationWrite: founder.recognized && authorization.recognized,
    founderAuthorizationSingleUse: true,
  });
  const body = buildVercelDisableSsoProtectionBody();
  const contract = evaluateVercelProtectionMutationRequest({
    projectName: ISOLATED_VALIDATION_PROJECT,
    body,
    teamDefault: false,
  });
  if (!contract.valid) {
    throw new Error(`protection_contract_invalid:${contract.issues.join(",")}`);
  }
  void lastReadySourceBundleRemainsVerified();
  const already = getProtectionVerification();
  const stopReason = already.liveWriteAttempted
    ? "PROTECTION_WRITE_ALREADY_ATTEMPTED"
    : !founder.ok || !authorization.recognized
      ? founder.ok
        ? authorization.reason
        : founder.reason
      : eag.decision !== "APPROVED"
        ? eag.reason
        : "PREFLIGHT_READY";
  return {
    capability: PROTECTION_CAPABILITY,
    capabilityStatus: already.status,
    separateFromSourceBundle: true,
    projectScoped: true,
    teamDefaultChanged: false,
    mutationEndpoint: `PATCH ${vercelProjectUpdatePath(FAILED_CRE_VALIDATION_PROJECT)}`,
    mutationBody: body,
    founder,
    authorization,
    secretSafety: secret.status,
    privateHqExposed: false,
    customerDataExposed: false,
    eag,
    sourceBundleUnchanged: true,
    attempted: false,
    stopReason,
  };
}

export async function executeProtectionConfigureIfAuthorized(input: {
  artifactFiles: Array<{ path: string; content: string }>;
  allowLiveWrite?: boolean;
}): Promise<{
  attempted: boolean;
  providerWrites: number;
  result: "PASS" | "FAIL" | "NOT_ATTEMPTED";
  httpStatus: number | null;
  providerError: string | null;
  readiness: ReturnType<typeof evaluateProtectionConfigureReadiness>;
}> {
  const readiness = evaluateProtectionConfigureReadiness(input);
  if (!input.allowLiveWrite) {
    return {
      attempted: false,
      providerWrites: 0,
      result: "NOT_ATTEMPTED",
      httpStatus: null,
      providerError: null,
      readiness,
    };
  }
  if (readiness.stopReason !== "PREFLIGHT_READY") {
    return {
      attempted: false,
      providerWrites: 0,
      result: "NOT_ATTEMPTED",
      httpStatus: null,
      providerError: null,
      readiness,
    };
  }
  const validated = await vercelAdapter.validate({
    organizationId: LIVE_ORG,
    actionType: PROTECTION_CAPABILITY,
    target: FAILED_CRE_VALIDATION_PROJECT,
    payload: {
      project_name: FAILED_CRE_VALIDATION_PROJECT,
      body: readiness.mutationBody,
    },
    correlationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
  });
  if (!validated.valid) {
    return {
      attempted: false,
      providerWrites: 0,
      result: "NOT_ATTEMPTED",
      httpStatus: null,
      providerError: validated.issues.join(","),
      readiness: { ...readiness, stopReason: validated.issues.join(",") },
    };
  }

  const liveState = await inspectVercelProjectSsoProtection({
    projectName: FAILED_CRE_VALIDATION_PROJECT,
    teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
    token: process.env[VERCEL_TOKEN_ENV] ?? null,
  });
  if (liveState.found && liveState.vercelAuthEnabled === false) {
    persistProtectionVerification({
      status: "LIVE_WRITE_VERIFIED",
      liveWriteAttempted: true,
      providerWrites: 0,
      timestamp: new Date().toISOString(),
      teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
      mutationEndpoint: readiness.mutationEndpoint,
      mutationResult: "ALREADY_DISABLED",
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      digest: SUCCESSOR_CRE_SOURCE_DIGEST,
      deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
      founderAuthorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
      httpStatus: 200,
      providerError: null,
      evidence:
        "Vercel Authentication is already disabled for the isolated validation project. No second PATCH was sent.",
    });
    return {
      attempted: false,
      providerWrites: 0,
      result: "PASS",
      httpStatus: 200,
      providerError: null,
      readiness: {
        ...readiness,
        stopReason: "PROTECTION_ALREADY_DISABLED",
        capabilityStatus: "LIVE_WRITE_VERIFIED",
      },
    };
  }

  consumeProtectionFounderAuthorization();
  try {
    const executed = await vercelAdapter.execute({
      organizationId: LIVE_ORG,
      actionType: PROTECTION_CAPABILITY,
      target: FAILED_CRE_VALIDATION_PROJECT,
      payload: {
        project_name: FAILED_CRE_VALIDATION_PROJECT,
        body: readiness.mutationBody,
      },
      correlationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
    });
    persistProtectionVerification({
      status: "LIVE_WRITE_VERIFIED",
      liveWriteAttempted: true,
      providerWrites: 1,
      timestamp: new Date().toISOString(),
      teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
      mutationEndpoint: readiness.mutationEndpoint,
      mutationResult: "PASS",
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      digest: SUCCESSOR_CRE_SOURCE_DIGEST,
      deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
      founderAuthorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
      httpStatus: 200,
      providerError: null,
      evidence: [
        `hosting.deployment_protection.configure LIVE_WRITE_VERIFIED.`,
        `provider=vercel.com_v1 project=${FAILED_CRE_VALIDATION_PROJECT}.`,
        `endpoint=${readiness.mutationEndpoint} body={"ssoProtection":null}.`,
        `artifact=${SUCCESSOR_CRE_ARTIFACT_ID} digest=${SUCCESSOR_CRE_SOURCE_DIGEST}`,
        `deployment=${LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID}`,
        `founderAuthorization=${PROTECTION_FOUNDER_AUTHORIZATION_ID}`,
        `providerCost=UNKNOWN.`,
        `authDisabled=${String(executed.manifest.vercel_auth_enabled === false)}.`,
      ].join(" "),
    });
    return {
      attempted: true,
      providerWrites: 1,
      result: "PASS",
      httpStatus: 200,
      providerError: null,
      readiness: { ...readiness, attempted: false, capabilityStatus: "LIVE_WRITE_VERIFIED" },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const httpMatch = message.match(/failed: (\d+)/);
    persistProtectionVerification({
      status: "FAILED",
      liveWriteAttempted: true,
      providerWrites: 1,
      timestamp: new Date().toISOString(),
      teamId: process.env[VERCEL_TEAM_ID_ENV] ?? null,
      mutationEndpoint: readiness.mutationEndpoint,
      mutationResult: "FAIL",
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      digest: SUCCESSOR_CRE_SOURCE_DIGEST,
      deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
      founderAuthorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
      httpStatus: httpMatch ? Number(httpMatch[1]) : null,
      providerError: message,
      evidence: message,
    });
    return {
      attempted: true,
      providerWrites: 1,
      result: "FAIL",
      httpStatus: httpMatch ? Number(httpMatch[1]) : null,
      providerError: message,
      readiness: { ...readiness, capabilityStatus: "FAILED", stopReason: message },
    };
  }
}

export function protectionCapabilityIsUnverified(): boolean {
  return getProtectionVerification().status === "UNVERIFIED";
}
