import {
  assertVentureReleaseStageProgression,
  evaluateVentureLaunchQcBlocking,
  type VentureDeploymentIdentity,
  type VentureReleasePipelineStage,
  VENTURE_RELEASE_PIPELINE_STAGES,
} from "./venture-launch-qc-contract";

export const VENTURE_PRODUCTION_QC_ENFORCEMENT = "VentureProductionQcEnforcement" as const;

export type LiveVerifiedEvidence = {
  canonicalSourceSha: string | null;
  deploymentSourceSha: string | null;
  deploymentProject: string | null;
  deploymentProjectId: string | null;
  deploymentId: string | null;
  productionDomain: string | null;
  routeHealth: boolean;
  desktopRenderQc: boolean;
  tabletRenderQc: boolean;
  mobileRenderQc: boolean;
  brandTransparencyQc: boolean;
  brandColorIntegrityQc: boolean;
  brandContrastQc: boolean;
  brandSizeQc: boolean;
  brandPlacementQc: boolean;
  sectionContainmentQc: boolean;
  scrollQc: boolean;
  contentQc: boolean;
  interactionQc: boolean;
  postDeployProbeEvidence: boolean;
  assetParity: boolean;
  founderOverride?: {
    operator: string;
    timestamp: string;
    failedGate: string;
    reason: string;
  };
};

const LIVE_VERIFIED_REQUIRED: Array<keyof LiveVerifiedEvidence> = [
  "canonicalSourceSha",
  "deploymentProject",
  "deploymentProjectId",
  "deploymentId",
  "productionDomain",
  "routeHealth",
  "desktopRenderQc",
  "tabletRenderQc",
  "mobileRenderQc",
  "brandTransparencyQc",
  "brandColorIntegrityQc",
  "brandContrastQc",
  "brandSizeQc",
  "brandPlacementQc",
  "sectionContainmentQc",
  "scrollQc",
  "contentQc",
  "interactionQc",
  "postDeployProbeEvidence",
  "assetParity",
];

export function evaluateLiveVerifiedNonBypassable(input: {
  currentStage: VentureReleasePipelineStage;
  evidence: LiveVerifiedEvidence;
}): {
  gate: typeof VENTURE_PRODUCTION_QC_ENFORCEMENT;
  result: "PASS" | "FAIL" | "NOT_READY";
  reasons: string[];
} {
  const toLive = assertVentureReleaseStageProgression(input.currentStage, "LIVE_VERIFIED");
  if (!toLive.ok && input.currentStage !== "PRODUCTION_BRAND_CONTRACT_QC") {
    return {
      gate: VENTURE_PRODUCTION_QC_ENFORCEMENT,
      result: "FAIL",
      reasons: [`STAGE:${toLive.reason}`],
    };
  }

  const reasons: string[] = [];
  for (const key of LIVE_VERIFIED_REQUIRED) {
    const value = input.evidence[key];
    if (value === false || value === null || value === undefined || value === "") {
      reasons.push(`MISSING_${String(key).toUpperCase()}`);
    }
  }

  if (reasons.length > 0 && input.evidence.founderOverride) {
    return {
      gate: VENTURE_PRODUCTION_QC_ENFORCEMENT,
      result: "PASS",
      reasons: [`FOUNDER_OVERRIDE:${input.evidence.founderOverride.failedGate}`],
    };
  }

  if (reasons.length > 0) {
    return {
      gate: VENTURE_PRODUCTION_QC_ENFORCEMENT,
      result: reasons.some((r) => r.startsWith("MISSING_")) ? "NOT_READY" : "FAIL",
      reasons,
    };
  }

  return {
    gate: VENTURE_PRODUCTION_QC_ENFORCEMENT,
    result: "PASS",
    reasons: [],
  };
}

export function autonomousAgentMayUseQcBypass(): false {
  return false;
}

export function evaluateVentureReleasePipelineComplete(input: {
  stage: VentureReleasePipelineStage;
  buildPassed: boolean;
  evidence: LiveVerifiedEvidence;
  deploymentIdentity: VentureDeploymentIdentity | null;
}): ReturnType<typeof evaluateVentureLaunchQcBlocking> & {
  liveVerified: ReturnType<typeof evaluateLiveVerifiedNonBypassable>;
} {
  const launch = evaluateVentureLaunchQcBlocking({
    buildPassed: input.buildPassed,
    renderedVisualQcPassed: input.evidence.desktopRenderQc && input.evidence.tabletRenderQc && input.evidence.mobileRenderQc,
    scrollQcPassed: input.evidence.scrollQc,
    postDeployVisualQcPassed: input.evidence.postDeployProbeEvidence && input.evidence.assetParity,
    previewBrandContractQcPassed: input.evidence.brandSizeQc && input.evidence.brandPlacementQc,
    productionBrandContractQcPassed:
      input.evidence.brandColorIntegrityQc &&
      input.evidence.brandContrastQc &&
      input.evidence.brandTransparencyQc,
    productionIdentityVerified: Boolean(input.evidence.deploymentId && input.evidence.deploymentProjectId),
    deploymentIdentity: input.deploymentIdentity,
  });

  const liveVerified = evaluateLiveVerifiedNonBypassable({
    currentStage: input.stage,
    evidence: input.evidence,
  });

  if (input.stage === "LIVE_VERIFIED" && liveVerified.result !== "PASS") {
    return {
      ...launch,
      result: "FAIL",
      reasons: [...launch.reasons, ...liveVerified.reasons.map((r) => `LIVE_VERIFIED:${r}`)],
      launchComplete: false,
      liveVerified,
    };
  }

  return { ...launch, liveVerified };
}

export const REQUIRED_STAGES_BEFORE_LIVE = VENTURE_RELEASE_PIPELINE_STAGES.filter(
  (s) => s !== "LIVE_QC_FAILED",
);
