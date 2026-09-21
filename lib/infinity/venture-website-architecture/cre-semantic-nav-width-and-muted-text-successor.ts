import {
  CRE_CANDIDATE_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_REASON,
  SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeSemanticNavWidthAndMutedTextRepairFiles } from "./compose-semantic-nav-width-and-muted-text-repair";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "./cre-homepage-hero-link-contrast-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCreSemanticNavWidthAndMutedTextSuccessor() {
  const predecessor = await reconstructCreHomepageHeroLinkContrastSuccessor();
  if (predecessor.artifactId !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`homepage_hero_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`homepage_hero_digest_drift:${predecessor.digest}`);
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
    contract: SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_SITE_CONTRACT,
  });
  const composed = composeSemanticNavWidthAndMutedTextRepairFiles({
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
    composed.discovery.overall === "PASS" &&
    composed.muted.overall === "PASS" &&
    composed.heroLinks.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_REASON,
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
    muted: composed.muted,
    heroLinks: composed.heroLinks,
    publishability: composed.publishability,
    hard: composed.hard,
    hookBoundary: composed.hookBoundary,
    founderVisualReviewReady: ready,
    pageLoop: composed.pageLoop,
    humanFirst: composed.humanFirst,
    hubRoutes: composed.hubRoutes,
    howItWorks: composed.howItWorks,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
