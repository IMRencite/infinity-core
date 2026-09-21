import {
  CRE_CANDIDATE_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  SEO_GEO_SEARCH_DEPTH_REASON,
  SEO_GEO_SEARCH_DEPTH_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeSearchDepthFiles } from "./compose-search-depth";
import { reconstructCreAuthorityWidthSuccessor } from "./cre-authority-width-successor";
import { digestOfAuthorityFiles } from "./cre-successor";
import { DEPTH_QUESTION_PAGES } from "./search-demand-depth-catalog";
import { topicDepthCoverageTable } from "./search-demand-depth-research";

export async function reconstructCreSearchDepthSuccessor() {
  const predecessor = await reconstructCreAuthorityWidthSuccessor();
  if (predecessor.artifactId !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`authority_width_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`authority_width_digest_drift:${predecessor.digest}`);
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
    contract: SEO_GEO_SEARCH_DEPTH_SITE_CONTRACT,
  });
  const composed = composeSearchDepthFiles({ files: predecessor.files });
  const digest = digestOfAuthorityFiles(composed.files);
  const ready =
    composed.publishability.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.hard.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.demand.overall === "PASS" &&
    composed.discovery.overall === "PASS" &&
    composed.cannibal.overall === "PASS" &&
    composed.rhythm.overall === "PASS" &&
    composed.contrast.overall === "PASS" &&
    composed.pageLoop.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEO_GEO_SEARCH_DEPTH_REASON,
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    files: composed.files,
    routes: searchDepthRouteManifest().intendedCount,
    newStandaloneRoutes: DEPTH_QUESTION_PAGES.length,
    coverage: topicDepthCoverageTable(),
    demand: composed.demand,
    discovery: composed.discovery,
    cannibal: composed.cannibal,
    rhythm: composed.rhythm,
    contrast: composed.contrast,
    publishability: composed.publishability,
    hard: composed.hard,
    founderVisualReviewReady: ready,
    pageLoop: composed.pageLoop,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
