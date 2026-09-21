import {
  CRE_CANDIDATE_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  SEO_GEO_FINAL_AUTHORITY_POLISH_REASON,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeAuthorityFinalPolishFiles } from "./compose-authority-final-polish";
import { reconstructCreAuthorityExpansionSuccessor } from "./cre-authority-expansion-successor";
import { digestOfAuthorityFiles } from "./cre-successor";
import { evaluateRenderedCompositionQuality, evaluateRenderedTableQuality } from "./visual-quality-gates";
import { pageContent } from "./answer-authority/page-inspect";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { authorityExpansionRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";

export async function reconstructCreAuthorityFinalPolishSuccessor() {
  const predecessor = await reconstructCreAuthorityExpansionSuccessor();
  if (predecessor.artifactId !== SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`authority_expansion_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`authority_expansion_digest_drift:${predecessor.digest}`);
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
    contract: SEO_GEO_FINAL_AUTHORITY_POLISH_SITE_CONTRACT,
  });
  const composed = composeAuthorityFinalPolishFiles({ files: predecessor.files });
  const digest = digestOfAuthorityFiles(composed.files);
  const sample = pageContent(composed.files, EXPANSION_QUESTION_PAGES[0]?.route ?? "/commercial-lease-npv/how-is-lease-npv-calculated");
  const css = composed.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const composition = evaluateRenderedCompositionQuality({ html: sample, css });
  const tables = evaluateRenderedTableQuality(sample);
  const ready =
    composed.publishability.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.footer.overall === "PASS" &&
    composed.footerAttribution.ok &&
    tables.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEO_GEO_FINAL_AUTHORITY_POLISH_REASON,
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    files: composed.files,
    routes: authorityExpansionRouteManifest().intendedCount,
    footer: composed.footer,
    footerAttribution: composed.footerAttribution,
    redundancy: composed.redundancy,
    highlights: composed.highlights,
    navigation: composed.navigation,
    publishability: composed.publishability,
    composition,
    tables,
    founderVisualReviewReady: ready,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
