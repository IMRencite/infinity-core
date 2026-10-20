import { evaluateBuildFactoryCapabilityRegressionBlocking } from "@/lib/infinity/organic-growth-engine/continuous/public-page-capability-contract-v1";
import { evaluateBuildFactoryRenderBlocking } from "@/lib/infinity/venture-website-architecture/autonomous-venture-render-quality-policy-v1";
import {
  evaluateVentureReleasePipelineComplete,
  type LiveVerifiedEvidence,
} from "./venture-production-qc-enforcement";
import type { VentureDeploymentIdentity, VentureReleasePipelineStage } from "./venture-launch-qc-contract";

export const BUILD_FACTORY_WEBSITE_LIVE_GATES_V1 = "BUILD_FACTORY_WEBSITE_LIVE_GATES_V1" as const;

export function evaluateBuildFactoryWebsiteLiveGates(input: {
  stage: VentureReleasePipelineStage;
  buildPassed: boolean;
  evidence: LiveVerifiedEvidence;
  deploymentIdentity: VentureDeploymentIdentity | null;
  ventureId?: string;
  publicBlogOrJournalCapability?: boolean;
  venture_rendered_quality_qc: "PASS" | "FAIL" | "FAIL_EVIDENCE_MISSING";
  venture_required_capability_qc: "PASS" | "FAIL";
}): {
  gate: typeof BUILD_FACTORY_WEBSITE_LIVE_GATES_V1;
  BUILD_FACTORY_QC_WIRING_QC: "PASS" | "FAIL";
  WEBSITE_LIVE_ALLOWED: boolean;
  pipeline: ReturnType<typeof evaluateVentureReleasePipelineComplete>;
  render_blocking: ReturnType<typeof evaluateBuildFactoryRenderBlocking>;
  capability_blocking: ReturnType<typeof evaluateBuildFactoryCapabilityRegressionBlocking>;
} {
  const pipeline = evaluateVentureReleasePipelineComplete({
    stage: input.stage,
    buildPassed: input.buildPassed,
    evidence: input.evidence,
    deploymentIdentity: input.deploymentIdentity,
    ventureId: input.ventureId,
    publicBlogOrJournalCapability: input.publicBlogOrJournalCapability,
  });
  const renderBlocking = evaluateBuildFactoryRenderBlocking({
    build_complete: input.buildPassed,
    venture_rendered_quality_qc: input.venture_rendered_quality_qc,
  });
  const capabilityBlocking = evaluateBuildFactoryCapabilityRegressionBlocking({
    venture_rendered_quality_qc: input.venture_rendered_quality_qc,
    venture_required_capability_qc: input.venture_required_capability_qc,
  });

  const allowed =
    pipeline.result === "PASS"
    && pipeline.launchComplete
    && renderBlocking.WEBSITE_LIVE_ALLOWED
    && capabilityBlocking.WEBSITE_LIVE_ALLOWED;

  return {
    gate: BUILD_FACTORY_WEBSITE_LIVE_GATES_V1,
    BUILD_FACTORY_QC_WIRING_QC: allowed ? "PASS" : "FAIL",
    WEBSITE_LIVE_ALLOWED: allowed,
    pipeline,
    render_blocking: renderBlocking,
    capability_blocking: capabilityBlocking,
  };
}
