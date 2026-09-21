import {
  CRE_CANDIDATE_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  HUB_QUESTION_BOARD_LAYOUT_REPAIR_REASON,
  HUB_QUESTION_BOARD_LAYOUT_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeHubQuestionBoardLayoutRepairFiles } from "./compose-hub-question-board-layout-repair";
import { reconstructCrePricingPrerenderRepairSuccessor } from "./cre-pricing-prerender-repair-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCreHubQuestionBoardLayoutSuccessor() {
  const predecessor = await reconstructCrePricingPrerenderRepairSuccessor({
    enforceSearchDepthDigest: false,
  });
  if (predecessor.artifactId !== CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`pricing_prerender_id_drift:${predecessor.artifactId}`);
  }
  const compile = compileCreValidationArtifactInput({
    candidateId: CRE_CANDIDATE_ID,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  });
  const compiled = compileExecutableVenturePlan(compile);
  if (!compiled.buildPackage) throw new Error("cre_validation_package_missing");
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: compiled.plan.planId,
    packageId: compiled.buildPackage.packageId,
    packageVersion: compiled.buildPackage.packageVersion,
    contract: HUB_QUESTION_BOARD_LAYOUT_REPAIR_SITE_CONTRACT,
  });
  const composed = composeHubQuestionBoardLayoutRepairFiles({
    files: predecessor.files,
    artifactId,
    predecessorArtifactId: predecessor.artifactId,
    predecessorDigest: predecessor.digest,
  });
  const digest = digestOfAuthorityFiles(composed.files);
  const ready =
    composed.hard.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.publishability.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.pageLoop.overall === "PASS" &&
    composed.hookBoundary.overall === "PASS" &&
    composed.hubLayout.overall === "PASS" &&
    composed.discovery.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    repairReason: HUB_QUESTION_BOARD_LAYOUT_REPAIR_REASON,
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    files: composed.files,
    routes: predecessor.routes,
    demand: composed.demand,
    discovery: composed.discovery,
    cannibal: composed.cannibal,
    hubLayout: composed.hubLayout,
    contrast: composed.contrast,
    publishability: composed.publishability,
    hard: composed.hard,
    hookBoundary: composed.hookBoundary,
    founderVisualReviewReady: ready,
    pageLoop: composed.pageLoop,
    humanFirst: composed.humanFirst,
    hubRoutes: composed.hubRoutes,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
