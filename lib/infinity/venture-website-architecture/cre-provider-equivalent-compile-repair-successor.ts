import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeProviderEquivalentCompileRepairFiles } from "./compose-provider-equivalent-compile-repair";
import { reconstructCrePublicLineageQuestionIdRepairSuccessor } from "./cre-lineage-question-id-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCreProviderEquivalentCompileRepairSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: typeof PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorDigest: typeof PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  repairReason: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON;
  immutable: true;
  deployed: false;
  liveArtifactMutated: false;
  files: Array<{ path: string; content: string }>;
  architecture: Awaited<ReturnType<typeof reconstructCrePublicLineageQuestionIdRepairSuccessor>>["architecture"];
  graph: Awaited<ReturnType<typeof reconstructCrePublicLineageQuestionIdRepairSuccessor>>["graph"];
  secretScan: "PASS" | "FAIL";
}> {
  const predecessor = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
  if (predecessor.artifactId !== PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`lineage_qid_successor_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`lineage_qid_successor_digest_drift:${predecessor.digest}`);
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
    contract: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SITE_CONTRACT,
  });
  const files = composeProviderEquivalentCompileRepairFiles({
    files: predecessor.files,
    artifactId,
    predecessorArtifactId: predecessor.artifactId,
    predecessorDigest: predecessor.digest,
  });
  void LOCKED_CRE_EXPERIMENT_ID;
  return {
    artifactId,
    digest: digestOfAuthorityFiles(files),
    predecessorArtifactId: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    repairReason: PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON,
    immutable: true,
    deployed: false,
    liveArtifactMutated: false,
    files,
    architecture: predecessor.architecture,
    graph: predecessor.graph,
    secretScan: evaluateSecretSafety(files).status,
  };
}
