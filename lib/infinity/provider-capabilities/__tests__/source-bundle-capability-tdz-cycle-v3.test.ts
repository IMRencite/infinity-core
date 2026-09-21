import { describe, expect, it } from "vitest";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { VERCEL_ADAPTER_SUPPORTED_ACTIONS } from "@/lib/infinity/provider-capabilities/vercel-adapter-actions";
import { getSourceBundleVerification } from "@/lib/infinity/market-validation-experiment/source-bundle-verification";
import { inspectHostingProviderCapability } from "@/lib/infinity/market-validation-experiment/provider-capability";
import { evaluateValidationArtifactDeploymentAuthorization } from "@/lib/infinity/market-validation-experiment/artifact-authorization";
import { EXPECTED_DR_PUBLIC_ROUTES } from "@/lib/infinity/market-validation-experiment/cre-dr-successor-authorization";
import {
  INTENDED_PUBLIC_PAGE_ROUTES,
  ProviderEquivalentArtifactBuildGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import * as deployablePackage from "@/lib/infinity/market-validation-experiment/deployable-package";

describe("SOURCE_BUNDLE_CAPABILITY TDZ CYCLE HARD REPAIR V3", () => {
  it("loads the leaf capability without TDZ", () => {
    expect(SOURCE_BUNDLE_CAPABILITY).toBe("hosting.deploy_source_bundle");
    expect(VERCEL_ADAPTER_SUPPORTED_ACTIONS.includes(SOURCE_BUNDLE_CAPABILITY)).toBe(true);
  });

  it("loads source-bundle-verification without TDZ", () => {
    const record = getSourceBundleVerification();
    expect(record.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(record.status).toBe("UNVERIFIED");
    expect(record.liveWriteAttempted).toBe(false);
  });

  it("loads provider-capability without TDZ", () => {
    expect(inspectHostingProviderCapability().newCapability).toBe(SOURCE_BUNDLE_CAPABILITY);
  });

  it("loads artifact-authorization without unexpected execution", () => {
    expect(typeof evaluateValidationArtifactDeploymentAuthorization).toBe("function");
  });

  it("loads CRE authorization without TDZ", () => {
    expect(EXPECTED_DR_PUBLIC_ROUTES).toHaveLength(17);
  });

  it("loads the provider-equivalent build gate independently from CRE authorization", () => {
    expect(ProviderEquivalentArtifactBuildGate).toBe("ProviderEquivalentArtifactBuildGate");
    expect(INTENDED_PUBLIC_PAGE_ROUTES).toHaveLength(17);
  });

  it("loads the Vercel adapter as an execution layer", () => {
    expect(vercelAdapter.capabilities.supportedActions).toContain(SOURCE_BUNDLE_CAPABILITY);
  });

  it("loads deployable-package without a local capability definition", () => {
    expect("SOURCE_BUNDLE_CAPABILITY" in deployablePackage).toBe(false);
    expect(deployablePackage.evaluateVercelSourcePackageSupport({} as never).newCapability).toBe(
      SOURCE_BUNDLE_CAPABILITY,
    );
  });

  it("keeps one canonical capability value across consumers", () => {
    expect(getSourceBundleVerification().capability).toBe("hosting.deploy_source_bundle");
    expect(inspectHostingProviderCapability().newCapability).toBe("hosting.deploy_source_bundle");
    expect(deployablePackage.evaluateVercelSourcePackageSupport({} as never).newCapability).toBe(
      "hosting.deploy_source_bundle",
    );
  });
});
