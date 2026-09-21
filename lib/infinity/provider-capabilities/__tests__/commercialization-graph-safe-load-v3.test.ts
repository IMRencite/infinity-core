import { describe, expect, it } from "vitest";
import { inspectHostingProviderCapability } from "@/lib/infinity/market-validation-experiment/provider-capability";
import { getSourceBundleVerification } from "@/lib/infinity/market-validation-experiment/source-bundle-verification";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { getCanonicalActivePublicValidationState } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";

describe("commercialization graph safe load after TDZ repair", () => {
  it("loads deployment/commercialization modules without writes or TDZ", () => {
    const capability = inspectHostingProviderCapability();
    const verification = getSourceBundleVerification();
    expect(capability.newCapability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(verification.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(vercelAdapter.capabilities.supportedActions).toContain(SOURCE_BUNDLE_CAPABILITY);
    expect(verification.liveWriteAttempted).toBe(false);
  });

  it("preserves the already-activated CRE public artifact", () => {
    const active = getCanonicalActivePublicValidationState();
    const clock = inspectExperimentClock();
    const evidence = inspectRealMarketEvidence();
    expect(active.activeArtifactId).toBe("art_e6d2a3a1f46d117d61c9");
    expect(active.activeDeploymentId).toBe("dpl_5zWCLA1rQLVLXed4Wi2ypvk9tfFj");
    expect(active.activeUrl).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-kd9ktl3qy.vercel.app",
    );
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(clock.restarted).toBe(false);
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
  });
});
