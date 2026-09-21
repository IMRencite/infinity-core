import {
  CRE_CANDIDATE_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_REASON,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeVisualHomepageFoldFiles } from "./compose-visual-homepage-fold";
import { reconstructCreVisualTableDesignSuccessor } from "./cre-visual-table-design-successor";
import { digestOfAuthorityFiles } from "./cre-successor";
import { seoGeoPageRouteManifest } from "./digital-real-estate-catalog";

export async function reconstructCreVisualHomepageFoldSuccessor() {
  const predecessor = await reconstructCreVisualTableDesignSuccessor();
  if (predecessor.artifactId !== SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`table_design_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`table_design_digest_drift:${predecessor.digest}`);
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
    contract: SEO_GEO_VISUAL_HOMEPAGE_FOLD_SITE_CONTRACT,
  });
  const composed = composeVisualHomepageFoldFiles({ files: predecessor.files });
  const digest = digestOfAuthorityFiles(composed.files);
  const visual = {
    ...predecessor.visual,
    footer: composed.footer,
  };
  const ready =
    predecessor.publishability.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.footer.overall === "PASS" &&
    visual.tables.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEO_GEO_VISUAL_HOMEPAGE_FOLD_REASON,
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    files: composed.files,
    routes: seoGeoPageRouteManifest().pageRoutes.length,
    footer: composed.footer,
    publishability: predecessor.publishability,
    visual,
    founderVisualReviewReady: ready,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
