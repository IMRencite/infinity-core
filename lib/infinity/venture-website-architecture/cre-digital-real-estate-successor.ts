import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan, runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration";
import {
  SEO_GEO_DIGITAL_REAL_ESTATE_REPAIR_REASON,
  SEO_GEO_DIGITAL_REAL_ESTATE_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeSeoGeoDigitalRealEstateFiles } from "./compose-digital-real-estate";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "./cre-provider-equivalent-compile-repair-successor";
import { digestOfAuthorityFiles } from "./cre-successor";
import { allSeoGeoPlannedPages } from "./digital-real-estate-catalog";

export async function reconstructCreSeoGeoDigitalRealEstateSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorDigest: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  repairReason: typeof SEO_GEO_DIGITAL_REAL_ESTATE_REPAIR_REASON;
  immutable: true;
  deployed: false;
  liveArtifactMutated: false;
  files: Array<{ path: string; content: string }>;
  routes: number;
  publishability: ReturnType<typeof composeSeoGeoDigitalRealEstateFiles>["publishability"];
  secretScan: "PASS" | "FAIL";
}> {
  const predecessor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
  if (predecessor.artifactId !== PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`compile_repair_successor_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`compile_repair_successor_digest_drift:${predecessor.digest}`);
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
    contract: SEO_GEO_DIGITAL_REAL_ESTATE_SITE_CONTRACT,
  });
  const composed = composeSeoGeoDigitalRealEstateFiles({ files: predecessor.files });
  void LOCKED_CRE_EXPERIMENT_ID;
  return {
    artifactId,
    digest: digestOfAuthorityFiles(composed.files),
    predecessorArtifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEO_GEO_DIGITAL_REAL_ESTATE_REPAIR_REASON,
    immutable: true,
    deployed: false,
    liveArtifactMutated: false,
    files: composed.files,
    routes: new Set([
      ...composed.files.filter((file) => file.path.endsWith("/page.tsx") || file.path === "app/page.tsx").map((file) => file.path),
      ...allSeoGeoPlannedPages().map((page) => page.route),
    ]).size,
    publishability: composed.publishability,
    secretScan: evaluateSecretSafety(composed.files).status,
  };
}

export async function validateCreSeoGeoDigitalRealEstateSuccessorIsolated(input?: { keepRoot?: boolean }) {
  const successor = await reconstructCreSeoGeoDigitalRealEstateSuccessor();
  const isolated = await runIsolatedArtifactInstallAndBuild({ files: successor.files, keepRoot: input?.keepRoot === true });
  return { successor, isolated };
}
