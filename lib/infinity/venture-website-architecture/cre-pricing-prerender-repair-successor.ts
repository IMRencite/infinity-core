import {
  CRE_CANDIDATE_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_REASON,
  PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composePricingPrerenderRepairFiles } from "./compose-pricing-prerender-repair";
import { reconstructCreSearchDepthSuccessor } from "./cre-search-depth-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCrePricingPrerenderRepairSuccessor(input?: {
  enforceSearchDepthDigest?: boolean;
}) {
  const predecessor = await reconstructCreSearchDepthSuccessor();
  if (predecessor.artifactId !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`search_depth_id_drift:${predecessor.artifactId}`);
  }
  if (input?.enforceSearchDepthDigest !== false && predecessor.digest !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`search_depth_digest_drift:${predecessor.digest}`);
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
    contract: PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_SITE_CONTRACT,
  });
  const composed = composePricingPrerenderRepairFiles({
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
    composed.hookBoundary.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
    repairReason: PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_REASON,
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    files: composed.files,
    routes: predecessor.routes,
    demand: predecessor.demand,
    discovery: predecessor.discovery,
    cannibal: predecessor.cannibal,
    rhythm: predecessor.rhythm,
    contrast: composed.contrast,
    publishability: composed.publishability,
    hard: composed.hard,
    hookBoundary: composed.hookBoundary,
    founderVisualReviewReady: ready,
    pageLoop: composed.pageLoop,
    humanFirst: composed.humanFirst,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
