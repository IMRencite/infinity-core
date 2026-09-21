import { describe, expect, it, beforeEach } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { evaluateValidationArtifactDeploymentAuthorization } from "../artifact-authorization";
import { classifyValidationDeploymentCost } from "../cost";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
} from "../constants";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import {
  buildDeployableSourcePackage,
  evaluateVercelSourcePackageSupport,
} from "../deployable-package";
import { probeVercelAdapterForSourcePackage } from "../deployable-package-vercel-probe";
import { evaluateValidationExperimentEag } from "../eag-policy";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import {
  evaluateFormBackendReadiness,
  handlePublicValidationIngest,
  PUBLIC_INGEST_ROUTE_FILE,
  publicIngestState,
  resetPublicIngestRuntime,
} from "../ingest";
import { inspectHostingProviderCapability } from "../provider-capability";
import { parsePublicValidationIngest } from "../public-contract";

describe("VALIDATION EXPERIMENT PUBLIC INGEST + DEPLOY INPUT + COST CLOSURE V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
  });

  it("wires same-origin ingest into the generated artifact without HQ or localhost origins", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const files = result.artifact?.files ?? [];
    const client = files.find((file) => file.path === "app/ingest-client.ts")?.content ?? "";
    const route = files.find((file) => file.path === PUBLIC_INGEST_ROUTE_FILE)?.content ?? "";
    const blob = files.map((file) => file.content).join("\n");
    expect(client).toContain(`"/api/public/market-validation/" + VALIDATION_EXPERIMENT_ID + "/ingest"`);
    expect(client).toMatch(/fetch\(\s*VALIDATION_INGEST_PATH/);
    expect(client).not.toContain("VALIDATION_INGEST_ORIGIN");
    expect(client).not.toContain("candidateId:");
    expect(route).toContain(LOCKED_CRE_EXPERIMENT_ID);
    expect(route).not.toContain("../..");
    expect(route).not.toContain("process.env.");
    expect(route).not.toContain("Access-Control-Allow-Origin");
    expect(blob).not.toMatch(/https?:\/\/(localhost|127\.0\.0\.1|example\.com)/i);
    expect(evaluateFormBackendReadiness({ artifactFiles: files, experimentId: LOCKED_CRE_EXPERIMENT_ID }).readyForLiveDeploy).toBe(true);
    expect(result.authorization.formBackendReady).toBe(true);
    expect(result.authorization.analyticsBackendReady).toBe(true);
  });

  it("accepts a typed synthetic ingest contract into Performance Intelligence without counting production evidence", () => {
    const parsed = parsePublicValidationIngest({
      kind: "event",
      type: "PAGE_VIEW",
      candidateId: "ignored-client-id",
      synthetic: true,
    });
    expect(parsed.ok).toBe(true);
    const ingested = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", candidateId: "ignored-client-id", synthetic: true },
      byteLength: 96,
      clientKey: "pi-synthetic",
    });
    expect(ingested.ok).toBe(true);
    expect(ingested.productionAccepted).toBe(0);
    expect(publicIngestState().ingestedKeys.size).toBeGreaterThan(0);
  });

  it("builds a provider-neutral DeployableSourcePackage for the locked CRE artifact without fabricating git identity", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const pkg = buildDeployableSourcePackage({
      artifactId: result.artifact!.artifactId,
      ventureId: result.experiment.ventureId,
      experimentId: result.experiment.experimentId,
      candidateId: result.experiment.candidateId,
      files: result.artifact!.files,
    });
    expect(result.artifact!.artifactId).not.toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(result.artifact!.artifactId).toBe(currentCreValidationArtifactId());
    expect(pkg.schemaVersion).toBe("deployable_source_package_v1");
    expect(pkg.artifactId).toBe(currentCreValidationArtifactId());
    expect(pkg.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(pkg.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(pkg.sourceType).toBe("GENERATED_FILE_TREE");
    expect(pkg.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(pkg.provenance.gitRepository).toBeNull();
    expect(pkg.provenance.commitSha).toBeNull();
    expect(pkg.providerHints).toEqual({});
    expect(pkg.filesManifest.some((file) => file.path === "components/venture-footer.tsx")).toBe(true);
    expect(result.artifact!.files.some((file) => file.content.includes(CANONICAL_FOOTER_COPY))).toBe(true);
    expect(pkg.filesManifest.some((file) => file.path === "app/early-access/page.tsx")).toBe(true);
    expect(pkg.filesManifest.some((file) => file.path === PUBLIC_INGEST_ROUTE_FILE)).toBe(true);
  });

  it("keeps git hosting.deploy separate from the implemented source-bundle adapter", async () => {
    const capability = inspectHostingProviderCapability();
    expect(capability.deployInputClassVerified).toBe("GIT_SHA");
    expect(capability.deployInputClassRequired).toBe("SANDBOX_FILES");
    expect(capability.deployInputCompatible).toBe(false);
    expect(capability.newCapability).toBe("hosting.deploy_source_bundle");
    expect(capability.newCapabilityVerified).toBe(false);
    expect(capability.vercelPackageSupport).toBe("SUPPORTED");
    const pkg = buildDeployableSourcePackage({
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
      files: [{ path: "app/page.tsx", content: "landing" }],
    });
    const support = evaluateVercelSourcePackageSupport(pkg);
    expect(support.result).toBe("SUPPORTED");
    expect(support.gitDeployCompatible).toBe(false);
    expect(support.newCapabilityVerified).toBe(false);
    const { probeVercelGitDeployForSourcePackage } = await import("../deployable-package-vercel-probe");
    const git = await probeVercelGitDeployForSourcePackage(pkg);
    expect(git.result).toBe("UNSUPPORTED_CAPABILITY");
    expect(git.issues).toContain("missing_commit_sha");
    const bundle = await probeVercelAdapterForSourcePackage(pkg);
    expect(bundle.result).toBe("SUPPORTED");
    const validation = await vercelAdapter.validate({
      organizationId: "org",
      actionType: "hosting.deploy",
      target: pkg.artifactId,
      payload: { production_artifact_id: pkg.artifactId, source_digest: pkg.sourceDigest },
      correlationId: null,
    });
    expect(validation.valid).toBe(false);
  });

  it("keeps cost UNKNOWN and does not treat adapter estimate 0 as zero incremental cost", async () => {
    const cost = classifyValidationDeploymentCost();
    expect(cost.finalClassification).toBe("UNKNOWN");
    expect(cost.unknownCost).toBe(true);
    expect(cost.unknownTreatedAsZero).toBe(false);
    expect(cost.adapterEstimateAcceptedAsKnownZero).toBe(false);
    expect(cost.registryDefaultAcceptedAsKnownZero).toBe(false);
    expect(cost.estimatedAmount).toBeNull();
    const estimate = await vercelAdapter.estimate();
    expect(estimate.estimatedCostUsd).toBe(0);
    expect(cost.finalClassification).not.toBe("NO_INCREMENTAL_COST");
  });

  it("evaluates EAG from canonical policy inputs and does not hardcode DENIED or auto-authorize live deploy", async () => {
    const live = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(live.authorization.hardcodedDenied).toBe(false);
    expect(live.authorization.eagBypassed).toBe(false);
    expect(live.authorization.eag).not.toBe("APPROVED");
    expect(live.authorization.approved).toBe(false);
    expect(live.authorization.blockers).toContain("PROVIDER_CAPABILITY_REFRESH_REQUIRED");
    expect(live.authorization.blockers).toContain("UNKNOWN_COST");
    expect(live.authorization.blockers).toContain("EAG_POLICY");
    expect(live.deployed).toBe(false);
    expect(live.url).toBeNull();
    const policy = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: true,
      deployInputCompatible: false,
      newCapabilityRequired: true,
      newCapabilityVerified: false,
      formReady: true,
      analyticsReady: true,
      secretSafety: "PASS",
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
    });
    expect(policy.hardcodedDenied).toBe(false);
    expect(policy.decision).toBe("BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH");
    expect(policy.autoAuthorizeGranted).toBe(false);
    const denied = evaluateValidationArtifactDeploymentAuthorization({
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      artifactValid: true,
      validationPassed: true,
      fullProduct: false,
      purpose: MARKET_VALIDATION_PURPOSE,
      artifactFiles: live.artifact?.files,
    });
    expect(denied.eag).toBe("BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH");
  });
});
