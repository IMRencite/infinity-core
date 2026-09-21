import {
  CRE_CANDIDATE_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import { RENDERED_LAYOUT_REPAIR_REASON, RENDERED_LAYOUT_REPAIR_SITE_CONTRACT } from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeRenderedLayoutRepairFiles } from "./compose-rendered-layout-repair";
import { reconstructCreDirectResponseSuccessor } from "./cre-dr-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCreRenderedLayoutRepairSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: typeof DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID;
  predecessorDigest: typeof DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST;
  repairReason: typeof RENDERED_LAYOUT_REPAIR_REASON;
  immutable: true;
  deployed: false;
  liveArtifactMutated: false;
  files: Array<{ path: string; content: string }>;
  architecture: Awaited<ReturnType<typeof reconstructCreDirectResponseSuccessor>>["architecture"];
  graph: Awaited<ReturnType<typeof reconstructCreDirectResponseSuccessor>>["graph"];
  secretScan: "PASS" | "FAIL";
}> {
  const predecessor = await reconstructCreDirectResponseSuccessor();
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
    contract: RENDERED_LAYOUT_REPAIR_SITE_CONTRACT,
  });
  const files = composeRenderedLayoutRepairFiles({
    files: predecessor.files,
    artifactId,
    predecessorArtifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  });
  void LOCKED_CRE_EXPERIMENT_ID;
  return {
    artifactId,
    digest: digestOfAuthorityFiles(files),
    predecessorArtifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
    repairReason: RENDERED_LAYOUT_REPAIR_REASON,
    immutable: true,
    deployed: false,
    liveArtifactMutated: false,
    files,
    architecture: predecessor.architecture,
    graph: predecessor.graph,
    secretScan: evaluateSecretSafety(files).status,
  };
}
