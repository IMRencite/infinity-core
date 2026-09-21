import { describe, expect, it, beforeEach, vi } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelDisableSsoProtectionBody,
  evaluateVercelProtectionMutationRequest,
  inspectVercelProjectSsoProtection,
  ISOLATED_VALIDATION_PROJECT,
  PROTECTION_CAPABILITY,
  VERCEL_DISABLE_SSO_PROTECTION_BODY,
  VERCEL_PROJECT_UPDATE_METHOD,
  VERCEL_PROJECT_UPDATE_PATH,
  vercelProjectUpdatePath,
} from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-protection";
import { ACTION_TYPE_REGISTRY_V1 } from "@/lib/infinity/launch-gateway/action-registry";
import { VERCEL_LIVE_ALLOWED_ACTIONS } from "@/lib/infinity/governed-deployment-execution/vercel-live";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  CRE_CANDIDATE_ID,
  FAILED_CRE_VALIDATION_PROJECT,
  SUCCESSOR_CRE_ARTIFACT_ID,
  UNVERIFIED_HOSTING_CAPABILITIES,
} from "../constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { lastConsumedSuccessorFounderAuthorization } from "../founder-authorization";
import {
  HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
  LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
  LAST_READY_SOURCE_BUNDLE_URL,
  classifyLiveHttpResponse,
  evaluateGeneratedArtifactApplicationReadiness,
  inspectGeneratedArtifactRuntimeDependencies,
  lastReadySourceBundleRemainsVerified,
} from "../live-validation-failure";
import {
  evaluateProtectionConfigureReadiness,
  executeProtectionConfigureIfAuthorized,
} from "../protection-configure";
import {
  activateProtectionRuntimeAuthorization,
  evaluateProtectionRuntimeAuthorization,
  evaluateThisRequestProtectionAuthorization,
  evaluateThisRequestProtectionCeilings,
  FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
  FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
  PROTECTION_FOUNDER_AUTHORIZATION_ID,
  resetProtectionAuthorization,
} from "../protection-authorization";
import {
  getProtectionVerification,
  persistProtectionVerification,
  resetProtectionVerification,
} from "../protection-verification";
import { capabilityIsVerified, inspectHostingProviderCapability } from "../provider-capability";
import { evaluateRuntimeAuthorizationState } from "../runtime-authorization-state";
import { evaluateSecretSafety } from "../secret-safety";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import {
  getSourceBundleVerification,
  persistSourceBundleVerification,
  resetSourceBundleVerification,
} from "../source-bundle-verification";

describe("VERCEL DEPLOYMENT PROTECTION CONFIGURATION V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetProtectionVerification();
    resetProtectionAuthorization();
    resetSourceBundleVerification();
  });

  it("models a project-scoped protection capability separate from deployment and environment", () => {
    expect(PROTECTION_CAPABILITY).toBe("hosting.deployment_protection.configure");
    expect(PROTECTION_CAPABILITY).not.toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(PROTECTION_CAPABILITY).not.toBe("hosting.environment.configure");
    expect(PROTECTION_CAPABILITY).not.toBe("hosting.custom_domain");
    expect(PROTECTION_CAPABILITY).not.toBe("billing.manage");
    expect(ACTION_TYPE_REGISTRY_V1[PROTECTION_CAPABILITY]?.actionType).toBe(PROTECTION_CAPABILITY);
    expect(ACTION_TYPE_REGISTRY_V1[PROTECTION_CAPABILITY]?.estimatedCostUsd).toBe(0);
    expect(vercelAdapter.capabilities.supportedActions).toContain(PROTECTION_CAPABILITY);
    expect(vercelAdapter.capabilities.supportedActions).toContain(SOURCE_BUNDLE_CAPABILITY);
    expect(vercelAdapter.capabilities.supportedActions).not.toContain("hosting.environment.configure");
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(PROTECTION_CAPABILITY)).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect((UNVERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(PROTECTION_CAPABILITY)).toBe(true);
  });

  it("stays UNVERIFIED before any live protection mutation", () => {
    expect(getProtectionVerification().status).toBe("UNVERIFIED");
    expect(getProtectionVerification().liveWriteAttempted).toBe(false);
    expect(getProtectionVerification().providerWrites).toBe(0);
    expect(getProtectionVerification().unrelatedCapabilitiesGranted).toBe(false);
    persistSourceBundleVerification({
      status: "LIVE_WRITE_VERIFIED",
      timestamp: "2026-08-29T00:00:00.000Z",
      liveWriteAttempted: true,
      providerCalls: 1,
      deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
      sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    });
    expect(getSourceBundleVerification().status).toBe("LIVE_WRITE_VERIFIED");
    expect(capabilityIsVerified(inspectHostingProviderCapability(), PROTECTION_CAPABILITY)).toBe(false);
    expect(capabilityIsVerified(inspectHostingProviderCapability(), SOURCE_BUNDLE_CAPABILITY)).toBe(true);
  });

  it("translates disable-auth to PATCH /v9/projects/{idOrName} with ssoProtection null only", async () => {
    expect(VERCEL_PROJECT_UPDATE_METHOD).toBe("PATCH");
    expect(VERCEL_PROJECT_UPDATE_PATH).toBe("/v9/projects");
    expect(vercelProjectUpdatePath(ISOLATED_VALIDATION_PROJECT)).toBe(
      `/v9/projects/${ISOLATED_VALIDATION_PROJECT}`,
    );
    expect(buildVercelDisableSsoProtectionBody()).toEqual({ ssoProtection: null });
    expect(VERCEL_DISABLE_SSO_PROTECTION_BODY).toEqual({ ssoProtection: null });
    expect(ISOLATED_VALIDATION_PROJECT).toBe(FAILED_CRE_VALIDATION_PROJECT);
    const ok = evaluateVercelProtectionMutationRequest({
      projectName: FAILED_CRE_VALIDATION_PROJECT,
      body: { ssoProtection: null },
    });
    expect(ok).toEqual({ valid: true, issues: [] });
    expect(
      evaluateVercelProtectionMutationRequest({
        projectName: "infinity-core",
        body: { ssoProtection: null },
      }).issues,
    ).toContain("PROJECT_SCOPE_FORBIDDEN");
    expect(
      evaluateVercelProtectionMutationRequest({
        projectName: FAILED_CRE_VALIDATION_PROJECT,
        body: { ssoProtection: null },
        teamDefault: true,
      }).issues,
    ).toContain("TEAM_WIDE_MUTATION_FORBIDDEN");
    expect(
      evaluateVercelProtectionMutationRequest({
        projectName: FAILED_CRE_VALIDATION_PROJECT,
        body: { ssoProtection: { deploymentType: "preview" } },
      }).issues,
    ).toContain("SSO_PROTECTION_MUST_BE_NULL");
    expect(
      evaluateVercelProtectionMutationRequest({
        projectName: FAILED_CRE_VALIDATION_PROJECT,
        body: { ssoProtection: null, passwordProtection: null },
      }).issues,
    ).toContain("INVENTED_PROTECTION_FIELD");
    const bypass = await vercelAdapter.validate({
      organizationId: "org",
      actionType: PROTECTION_CAPABILITY,
      target: FAILED_CRE_VALIDATION_PROJECT,
      payload: {
        project_name: FAILED_CRE_VALIDATION_PROJECT,
        body: { ssoProtection: null },
        "x-vercel-protection-bypass": "secret",
      },
      correlationId: null,
    });
    expect(bypass.valid).toBe(false);
    expect(bypass.issues).toContain("PROTECTION_BYPASS_FORBIDDEN");
    const scoped = await vercelAdapter.validate({
      organizationId: "org",
      actionType: PROTECTION_CAPABILITY,
      target: FAILED_CRE_VALIDATION_PROJECT,
      payload: {
        project_name: FAILED_CRE_VALIDATION_PROJECT,
        body: { ssoProtection: null },
      },
      correlationId: null,
    });
    expect(scoped.valid).toBe(true);
  });

  it("recognizes explicit $5/$10 single-use protection authorization without reusing consumed deploy IDs", async () => {
    const consumed = lastConsumedSuccessorFounderAuthorization();
    expect(consumed.executionsConsumed).toBe(1);
    expect(consumed.authorizationId).not.toBe(PROTECTION_FOUNDER_AUTHORIZATION_ID);
    expect(FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD).toBe(5);
    expect(FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD).toBe(10);
    const ceilings = evaluateThisRequestProtectionCeilings();
    expect(ceilings.ok).toBe(true);
    expect(ceilings.recognized).toBe(true);
    const founder = evaluateThisRequestProtectionAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.authorizationId).toBe(PROTECTION_FOUNDER_AUTHORIZATION_ID);
    expect(founder.fiveDollarsRecordedAsSpend).toBe(false);
    expect(founder.providerCostState).toBe("UNKNOWN");
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const readiness = evaluateProtectionConfigureReadiness({ artifactFiles: result.artifact!.files });
    expect(readiness.founder.ok).toBe(true);
    expect(readiness.eag.decision).toBe("APPROVED");
    expect(readiness.eag.hardcodedDenied).toBe(false);
    expect(readiness.eag.bypassed).toBe(false);
    expect(readiness.attempted).toBe(false);
    expect(readiness.stopReason).toBe("PREFLIGHT_READY");
    expect(readiness.mutationEndpoint).toBe(`PATCH /v9/projects/${FAILED_CRE_VALIDATION_PROJECT}`);
    expect(readiness.mutationBody).toEqual({ ssoProtection: null });
    expect(readiness.projectScoped).toBe(true);
    expect(readiness.teamDefaultChanged).toBe(false);
    expect(readiness.capabilityStatus).toBe("UNVERIFIED");
    expect(readiness.sourceBundleUnchanged).toBe(true);
    expect(evaluateProtectionRuntimeAuthorization().activated).toBe(false);
  });

  it("validates artifact public-safety and does not mutate Vercel without allowLiveWrite", async () => {
    const executeSpy = vi.spyOn(vercelAdapter, "execute");
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.artifact?.artifactId).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const files = result.artifact!.files;
    expect(evaluateSecretSafety(files).status).toBe("PASS");
    const deps = inspectGeneratedArtifactRuntimeDependencies(files);
    expect(deps.hqDatabaseDependency).toBe(false);
    expect(deps.supabaseDependency).toBe(false);
    expect(deps.requiredServerSecrets).toEqual([]);
    const app = evaluateGeneratedArtifactApplicationReadiness(files);
    expect(app.landing).toBe("PASS");
    expect(app.annual).toBe("PASS");
    expect(app.perDeal).toBe("PASS");
    const executed = await executeProtectionConfigureIfAuthorized({ artifactFiles: files });
    expect(executed.attempted).toBe(false);
    expect(executed.providerWrites).toBe(0);
    expect(executed.result).toBe("NOT_ATTEMPTED");
    expect(executeSpy).not.toHaveBeenCalled();
    expect(getProtectionVerification().status).toBe("UNVERIFIED");
    persistProtectionVerification({ status: "UNVERIFIED" });
    expect(getProtectionVerification().unrelatedCapabilitiesGranted).toBe(false);
    const verified = lastReadySourceBundleRemainsVerified();
    expect(verified.deploymentId).toBe(LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID);
    expect(verified.status).toBe("LIVE_WRITE_VERIFIED");
    expect(verified.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(verified.digest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(verified.capabilityChanged).toBe(false);
    expect(evaluateRuntimeAuthorizationState().activated).toBe(false);
    expect(evaluateProtectionRuntimeAuthorization().activated).toBe(false);
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    const stillProtected = classifyLiveHttpResponse({
      status: 401,
      body: '{"error":{"code":"401","message":"Protected deployment"},"protection":{"vercel_auth_enabled":true,"password_enabled":false}}',
    });
    expect(stillProtected.classification).toBe("PROTECTION");
    expect(stillProtected.reachedApplication).toBe(false);
    expect(LAST_READY_SOURCE_BUNDLE_URL).toContain(FAILED_CRE_VALIDATION_PROJECT);
    executeSpy.mockRestore();
  });

  it("verifies capability only after a successful mutation and activates runtime only on COLLECTING", async () => {
    expect(getProtectionVerification().status).toBe("UNVERIFIED");
    expect(capabilityIsVerified(inspectHostingProviderCapability(), PROTECTION_CAPABILITY)).toBe(false);
    persistProtectionVerification({
      status: "LIVE_WRITE_VERIFIED",
      liveWriteAttempted: true,
      providerWrites: 1,
      founderAuthorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
    });
    expect(getProtectionVerification().status).toBe("LIVE_WRITE_VERIFIED");
    expect(capabilityIsVerified(inspectHostingProviderCapability(), PROTECTION_CAPABILITY)).toBe(true);
    expect(capabilityIsVerified(inspectHostingProviderCapability(), SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    persistSourceBundleVerification({
      status: "LIVE_WRITE_VERIFIED",
      timestamp: "2026-08-29T00:00:00.000Z",
      liveWriteAttempted: true,
      providerCalls: 1,
      deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
      sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    });
    expect(capabilityIsVerified(inspectHostingProviderCapability(), SOURCE_BUNDLE_CAPABILITY)).toBe(true);
    expect(evaluateProtectionRuntimeAuthorization().activated).toBe(false);
    activateProtectionRuntimeAuthorization("2026-08-29T15:00:00.000Z");
    const runtime = evaluateProtectionRuntimeAuthorization();
    expect(runtime.activated).toBe(true);
    expect(runtime.activationTime).toBe("2026-08-29T15:00:00.000Z");
    expect(runtime.runtimeCeilingUsd).toBe(10);
    expect(evaluateRuntimeAuthorizationState().activated).toBe(false);
  });

  it("keeps GET project inspection read-only and does not invent a team-wide path", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          name: FAILED_CRE_VALIDATION_PROJECT,
          ssoProtection: { deploymentType: "preview" },
          passwordProtection: null,
        }),
        { status: 200 },
      ),
    );
    const inspected = await inspectVercelProjectSsoProtection({
      projectName: FAILED_CRE_VALIDATION_PROJECT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(inspected.method).toBe("GET");
    expect(inspected.mutated).toBe(false);
    expect(inspected.vercelAuthEnabled).toBe(true);
    expect(inspected.passwordEnabled).toBe(false);
    expect(String(fetchImpl.mock.calls[0]?.[1]?.method)).toBe("GET");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(`/v9/projects/${FAILED_CRE_VALIDATION_PROJECT}`);
    expect(HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE).toBe(PROTECTION_CAPABILITY);
  });
});
