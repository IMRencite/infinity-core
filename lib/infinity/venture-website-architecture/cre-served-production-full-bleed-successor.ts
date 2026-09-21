import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeServedProductionFullBleedRepairFiles } from "./compose-served-production-full-bleed-repair";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "./cre-provider-equivalent-compile-repair-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCreServedProductionFullBleedRepairSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorDigest: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  repairReason: typeof SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON;
  immutable: true;
  deployed: false;
  liveArtifactMutated: false;
  files: Array<{ path: string; content: string }>;
  architecture: Awaited<ReturnType<typeof reconstructCreProviderEquivalentCompileRepairSuccessor>>["architecture"];
  graph: Awaited<ReturnType<typeof reconstructCreProviderEquivalentCompileRepairSuccessor>>["graph"];
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
    contract: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SITE_CONTRACT,
  });
  const files = composeServedProductionFullBleedRepairFiles({
    files: predecessor.files,
    artifactId,
    predecessorArtifactId: predecessor.artifactId,
    predecessorDigest: predecessor.digest,
  });
  void LOCKED_CRE_EXPERIMENT_ID;
  return {
    artifactId,
    digest: digestOfAuthorityFiles(files),
    predecessorArtifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON,
    immutable: true,
    deployed: false,
    liveArtifactMutated: false,
    files,
    architecture: predecessor.architecture,
    graph: predecessor.graph,
    secretScan: evaluateSecretSafety(files).status,
  };
}
