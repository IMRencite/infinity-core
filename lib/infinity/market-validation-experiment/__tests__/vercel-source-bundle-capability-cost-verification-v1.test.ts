import { describe, expect, it, beforeEach } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  rejectFabricatedGitIdentity,
  sha1Hex,
  VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { VERCEL_LIVE_ALLOWED_ACTIONS } from "@/lib/infinity/governed-deployment-execution/vercel-live";
import { ACTION_TYPE_REGISTRY_V1 } from "@/lib/infinity/launch-gateway/action-registry";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "../artifact-authorization";
import { classifyValidationDeploymentCost } from "../cost";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  UNVERIFIED_HOSTING_CAPABILITIES,
  VERIFIED_HOSTING_CAPABILITIES,
} from "../constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  buildDeployableSourcePackage,
  evaluateVercelSourcePackageSupport,
} from "../deployable-package";
import {
  probeVercelAdapterForSourcePackage,
  probeVercelGitDeployForSourcePackage,
} from "../deployable-package-vercel-probe";
import { evaluateValidationExperimentEag } from "../eag-policy";
import { executeMarketValidationExperiment, rememberValidationDeployment, resetExperimentRuntime } from "../execute";
import { handlePublicValidationIngest, resetPublicIngestRuntime } from "../ingest";
import { inspectHostingProviderCapability } from "../provider-capability";
import {
  buildDeploySourceBundleRequest,
  evaluateSourceIntegrity,
  LOCKED_CRE_SOURCE_DIGEST,
} from "../source-bundle-request";
import {
  evaluateSourceBundleLiveWriteGate,
  getSourceBundleVerification,
  persistSourceBundleVerification,
  resetSourceBundleVerification,
} from "../source-bundle-verification";
import type { ActionAuthorityGrant, TreasuryActionGrant } from "@/lib/infinity/governed-deployment-execution/types";

function files(): Array<{ path: string; content: string }> {
  return [{ path: "app/page.tsx", content: "Request Pilot Access" }];
}

function eagGrant(): ActionAuthorityGrant {
  return { actionType: "DEPLOY_APPLICATION", authorizationId: "eag_bundle", decision: "AUTO_AUTHORIZE" };
}

function treasuryGrant(): TreasuryActionGrant {
  return {
    actionType: "DEPLOY_APPLICATION",
    authorizationId: "tr_bundle",
    decision: "AUTO_AUTHORIZE",
    authorizedAmountUsd: 5,
    costActuality: "ESTIMATE",
    reservationId: null,
  };
}

describe("VERCEL SOURCE-BUNDLE CAPABILITY + DEPLOYMENT COST VERIFICATION V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
    resetSourceBundleVerification();
  });

  it("defines a provider-neutral DeploySourceBundleRequest and preserves digest integrity", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const pkg = buildDeployableSourcePackage({
      artifactId: result.artifact!.artifactId,
      ventureId: result.experiment.ventureId,
      experimentId: result.experiment.experimentId,
      candidateId: result.experiment.candidateId,
      files: result.artifact!.files,
    });
    const request = buildDeploySourceBundleRequest({ pkg, files: result.artifact!.files });
    expect(request.schemaVersion).toBe("deploy_source_bundle_request_v1");
    expect(request.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(request.artifactId).toBe(result.artifact!.artifactId);
    expect(request.artifactId).not.toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(request.sourceDigest).toBe(pkg.sourceDigest);
    expect(request.sourceDigest).not.toBe(LOCKED_CRE_SOURCE_DIGEST);
    expect(request.environmentClass).toBe("TEMPORARY_PROVIDER_URL");
    expect(JSON.stringify(request)).not.toMatch(/VERCEL_TOKEN|Bearer /);
    const integrity = evaluateSourceIntegrity({
      pkg,
      files: result.artifact!.files,
      expectedArtifactId: pkg.artifactId,
      expectedDigest: pkg.sourceDigest,
    });
    expect(integrity.status).toBe("PASS");
    expect(integrity.digestMatch).toBe(true);
    expect(integrity.secretScan).toBe("PASS");
    expect(result.artifact!.files.some((file) => file.content.includes(CANONICAL_FOOTER_COPY))).toBe(true);
  });

  it("translates the package into Vercel files[] + SHA1 without fabricating git identity", () => {
    const body = buildVercelSourceBundleDeploymentBody({
      projectName: "infinity-validation-cre-lease-npv-e72beb7b",
      files: files(),
    });
    expect(body.target).toBe("staging");
    expect(body.projectSettings.framework).toBe("nextjs");
    expect(body.projectSettings.buildCommand).toBe("next build");
    expect(body.files[0]?.sha).toBe(sha1Hex("Request Pilot Access"));
    expect(body.files[0]?.sha).toHaveLength(40);
    expect(JSON.stringify(body)).not.toContain("commit_sha");
    expect(JSON.stringify(body)).not.toContain("gitSource");
    expect(rejectFabricatedGitIdentity({ commit_sha: "abc", repository_full_name: "org/repo" })).toEqual([
      "fake_git_sha_forbidden",
      "fake_git_repository_forbidden",
    ]);
  });

  it("accepts hosting.deploy_source_bundle on the adapter and keeps hosting.deploy git-SHA only", async () => {
    const pkg = buildDeployableSourcePackage({
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
      files: files(),
    });
    const bundle = await probeVercelAdapterForSourcePackage(pkg);
    const git = await probeVercelGitDeployForSourcePackage(pkg);
    expect(bundle.result).toBe("SUPPORTED");
    expect(git.result).toBe("UNSUPPORTED_CAPABILITY");
    const fakeSha = await vercelAdapter.validate({
      organizationId: "org",
      actionType: SOURCE_BUNDLE_CAPABILITY,
      target: pkg.artifactId,
      payload: {
        production_artifact_id: pkg.artifactId,
        source_digest: pkg.sourceDigest,
        files: files(),
        commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      correlationId: null,
    });
    expect(fakeSha.valid).toBe(false);
    expect(fakeSha.issues).toContain("fake_git_sha_forbidden");
    const gitMode = await vercelAdapter.validate({
      organizationId: "org",
      actionType: "hosting.deploy",
      target: pkg.artifactId,
      payload: {
        production_artifact_id: pkg.artifactId,
        commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        repository_full_name: "org/repo",
        deployment_mode: VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE,
      },
      correlationId: null,
    });
    expect(gitMode.valid).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect(vercelAdapter.capabilities.supportedActions).toContain(SOURCE_BUNDLE_CAPABILITY);
  });

  it("does not treat adapter implementation as LIVE_WRITE_VERIFIED or inflate hosting.deploy", () => {
    const persisted = persistSourceBundleVerification({
      status: "UNVERIFIED",
      timestamp: null,
      liveWriteAttempted: false,
      providerCalls: 0,
    });
    expect(persisted.status).toBe("UNVERIFIED");
    expect(persisted.freshness).toBe("NOT_VERIFIED");
    expect(persisted.unrelatedCapabilitiesGranted).toBe(false);
    expect(persisted.scope.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    const cap = inspectHostingProviderCapability();
    expect(cap.newCapabilityVerified).toBe(false);
    expect(cap.verifiedCapabilities.includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect(UNVERIFIED_HOSTING_CAPABILITIES.includes("billing.manage")).toBe(true);
    expect(VERIFIED_HOSTING_CAPABILITIES.includes(SOURCE_BUNDLE_CAPABILITY as never)).toBe(false);
    expect(getSourceBundleVerification().liveWriteAttempted).toBe(false);
  });

  it("fails closed on UNKNOWN cost and does not accept estimate 0 as proof", async () => {
    const cost = classifyValidationDeploymentCost();
    expect(cost.finalClassification).toBe("UNKNOWN");
    expect(cost.readOnlyBillingAction).toBe("NONE");
    expect(cost.adapterEstimateAcceptedAsKnownZero).toBe(false);
    expect(cost.registryDefaultAcceptedAsKnownZero).toBe(false);
    expect(ACTION_TYPE_REGISTRY_V1[SOURCE_BUNDLE_CAPABILITY]?.estimatedCostUsd).toBe(0);
    const estimate = await vercelAdapter.estimate();
    expect(estimate.estimatedCostUsd).toBe(0);
    const gate = evaluateSourceBundleLiveWriteGate({
      adapterImplemented: true,
      capabilityVerified: false,
      unknownCost: true,
      eagApproved: false,
      sourceIntegrity: "PASS",
      secretSafety: "PASS",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.liveVerificationAttempted).toBe(false);
    expect(gate.state).toBe("CAPABILITY_IMPLEMENTED_BUT_COST_BLOCKED");
  });

  it("lets EAG approve only when source-bundle capability and known cost are explicit inputs", () => {
    const blocked = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: true,
      deployInputCompatible: true,
      newCapabilityRequired: true,
      newCapabilityVerified: false,
      formReady: true,
      analyticsReady: true,
      secretSafety: "PASS",
      costClassification: "BOUNDED",
      unknownCost: false,
      treasuryAuthorized: true,
      customDomainRequested: false,
      dnsRequested: false,
      paymentsRequested: false,
      treasuryRequested: false,
      adsRequested: false,
      existingDeploymentCount: 0,
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(blocked.decision).toBe("BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH");
    expect(blocked.hardcodedDenied).toBe(false);

    const approved = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: true,
      deployInputCompatible: true,
      newCapabilityRequired: true,
      newCapabilityVerified: true,
      formReady: true,
      analyticsReady: true,
      secretSafety: "PASS",
      costClassification: "BOUNDED",
      unknownCost: false,
      treasuryAuthorized: true,
      customDomainRequested: false,
      dnsRequested: false,
      paymentsRequested: false,
      treasuryRequested: false,
      adsRequested: false,
      existingDeploymentCount: 0,
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(approved.decision).toBe("APPROVED");
  });

  it("keeps live CRE execution fail-closed with same-origin ingest and synthetic isolation", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.authorization.requiredCapability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(result.authorization.newCapabilityVerified).toBe(false);
    expect(result.authorization.costClassification).toBe("UNKNOWN");
    expect(result.authorization.eag).toBe("BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH");
    expect(result.authorization.economicState).toBe("CAPABILITY_IMPLEMENTED_BUT_COST_BLOCKED");
    expect(result.deployed).toBe(false);
    expect(result.url).toBeNull();
    expect(result.customDomain).toBe(false);
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(result.counts.qualifiedVisitors).toBe(0);
    expect(result.counts.strongIntent).toBe(0);
    expect(result.counts.qualifiedSubmissions).toBe(0);
    const synthetic = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
      byteLength: 64,
      clientKey: "bundle-synthetic",
    });
    expect(synthetic.ok).toBe(true);
    expect(synthetic.productionAccepted).toBe(0);
    const first = rememberValidationDeployment({
      provider: "vercel",
      project: "infinity-validation-cre-lease-npv-e72beb7b",
      deploymentId: "dpl_replay",
      url: "https://example.vercel.app",
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    const second = rememberValidationDeployment({ ...first, deploymentId: "dpl_other" });
    expect(second.deploymentId).toBe("dpl_replay");
    const auth = evaluateValidationArtifactDeploymentAuthorization({
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      artifactValid: true,
      validationPassed: true,
      fullProduct: false,
      purpose: MARKET_VALIDATION_PURPOSE,
      customDomainRequested: true,
      artifactFiles: result.artifact?.files,
    });
    expect(auth.customDomainAllowed).toBe(false);
    expect(auth.approved).toBe(false);
    expect(evaluateVercelSourcePackageSupport(buildDeployableSourcePackage({
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      files: files(),
    })).adapterImplemented).toBe(true);
  });
});
