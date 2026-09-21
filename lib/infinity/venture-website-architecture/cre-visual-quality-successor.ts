import {
  CRE_CANDIDATE_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  SEO_GEO_VISUAL_QUALITY_REPAIR_REASON,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeVisualQualityRepairFiles } from "./compose-visual-quality-repair";
import { reconstructCreSeoGeoDigitalRealEstateSuccessor } from "./cre-digital-real-estate-successor";
import { digestOfAuthorityFiles } from "./cre-successor";
import { seoGeoPageRouteManifest } from "./digital-real-estate-catalog";

export async function reconstructCreVisualQualityRepairSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: typeof SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID;
  predecessorDigest: typeof SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST;
  repairReason: typeof SEO_GEO_VISUAL_QUALITY_REPAIR_REASON;
  immutable: true;
  deployed: false;
  liveArtifactMutated: false;
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>;
  routes: number;
  publishability: ReturnType<typeof composeVisualQualityRepairFiles>["publishability"];
  visual: ReturnType<typeof composeVisualQualityRepairFiles>["visual"];
  founderVisualReviewReady: typeof FOUNDER_VISUAL_REVIEW_READY | "NOT_READY";
  secretScan: "PASS" | "FAIL";
}> {
  const predecessor = await reconstructCreSeoGeoDigitalRealEstateSuccessor();
  if (predecessor.artifactId !== SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`seo_geo_successor_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`seo_geo_successor_digest_drift:${predecessor.digest}`);
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
    contract: SEO_GEO_VISUAL_QUALITY_REPAIR_SITE_CONTRACT,
  });
  const composed = composeVisualQualityRepairFiles({ files: predecessor.files });
  const digest = digestOfAuthorityFiles(composed.files);
  const ready =
    composed.publishability.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.visual.footer.overall === "PASS" &&
    composed.visual.tables.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : "NOT_READY";
  return {
    artifactId,
    digest,
    predecessorArtifactId: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEO_GEO_VISUAL_QUALITY_REPAIR_REASON,
    immutable: true,
    deployed: false,
    liveArtifactMutated: false,
    files: composed.files,
    routes: seoGeoPageRouteManifest().pageRoutes.length,
    publishability: composed.publishability,
    visual: composed.visual,
    founderVisualReviewReady: ready,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
