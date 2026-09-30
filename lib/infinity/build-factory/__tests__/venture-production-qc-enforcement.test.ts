import { describe, expect, it } from "vitest";
import {
  autonomousAgentMayUseQcBypass,
  evaluateLiveVerifiedNonBypassable,
  evaluateVentureReleasePipelineComplete,
} from "../venture-production-qc-enforcement";
import { assertVentureReleaseStageProgression } from "../venture-launch-qc-contract";

const fullEvidence = {
  canonicalSourceSha: "abc123",
  deploymentSourceSha: "def456",
  deploymentProject: "imros-public",
  deploymentProjectId: "prj_vFJv26Vt5w08ShcrqqBQmcHTVxcX",
  deploymentId: "dpl_test",
  productionDomain: "imros.io",
  routeHealth: true,
  desktopRenderQc: true,
  tabletRenderQc: true,
  mobileRenderQc: true,
  brandTransparencyQc: true,
  brandColorIntegrityQc: true,
  brandContrastQc: true,
  brandSizeQc: true,
  brandPlacementQc: true,
  sectionContainmentQc: true,
  scrollQc: true,
  contentQc: true,
  humanEditorialQc: true,
  interactionQc: true,
  postDeployProbeEvidence: true,
  assetParity: true,
} as const;

describe("venture production QC enforcement", () => {
  it("blocks LIVE_VERIFIED without post-deploy evidence", () => {
    const blocked = evaluateLiveVerifiedNonBypassable({
      currentStage: "PRODUCTION_BRAND_CONTRACT_QC",
      evidence: { ...fullEvidence, postDeployProbeEvidence: false },
    });
    expect(blocked.result).not.toBe("PASS");
    expect(blocked.reasons).toContain("MISSING_POSTDEPLOYPROBEEVIDENCE");
  });

  it("blocks public-content venture without editorial infrastructure", () => {
    const pipeline = evaluateVentureReleasePipelineComplete({
      stage: "PRODUCTION_BRAND_CONTRACT_QC",
      buildPassed: true,
      evidence: { ...fullEvidence, humanEditorialQc: true },
      deploymentIdentity: null,
      ventureId: "unknown-venture",
      publicBlogOrJournalCapability: true,
    });
    expect(pipeline.result).toBe("FAIL");
    expect(pipeline.reasons.some((r) => r.startsWith("EDITORIAL_INFRA:"))).toBe(true);
  });

  it("blocks wrong deployment project identity", () => {
    const pipeline = evaluateVentureReleasePipelineComplete({
      stage: "PRODUCTION_BRAND_CONTRACT_QC",
      buildPassed: true,
      evidence: fullEvidence,
      deploymentIdentity: {
        canonicalSourceProject: "infinity-core",
        deploymentSource: "imros-public-deploy",
        deploymentProject: "wrong-project",
        deploymentProjectId: "prj_x",
        productionDomain: "imros.io",
        productionBranch: "main",
        expectedReleaseSha: null,
        observedReleaseSha: null,
        mirrorStep: "scripts/mirror-imros-public-building-v2.mjs",
      },
    });
    expect(pipeline.result).toBe("FAIL");
  });

  it("allows LIVE_VERIFIED only with full evidence", () => {
    const ok = evaluateLiveVerifiedNonBypassable({
      currentStage: "PRODUCTION_BRAND_CONTRACT_QC",
      evidence: fullEvidence,
    });
    expect(ok.result).toBe("PASS");
  });

  it("forbids autonomous QC bypass helpers", () => {
    expect(autonomousAgentMayUseQcBypass()).toBe(false);
  });

  it("forbids stage skips to LIVE_VERIFIED", () => {
    expect(assertVentureReleaseStageProgression("BUILD_PASS", "LIVE_VERIFIED").ok).toBe(false);
  });
});
