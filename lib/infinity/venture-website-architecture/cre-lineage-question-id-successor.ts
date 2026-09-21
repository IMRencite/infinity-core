import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composePublicLineageQuestionIdRepairFiles } from "./compose-public-lineage-question-id-repair";
import { reconstructCreRenderedLayoutRepairSuccessor } from "./cre-rendered-layout-successor";
import { digestOfAuthorityFiles } from "./cre-successor";

export async function reconstructCrePublicLineageQuestionIdRepairSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: typeof RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorDigest: typeof RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  repairReason: typeof PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON;
  immutable: true;
  deployed: false;
  liveArtifactMutated: false;
  files: Array<{ path: string; content: string }>;
  architecture: Awaited<ReturnType<typeof reconstructCreRenderedLayoutRepairSuccessor>>["architecture"];
  graph: Awaited<ReturnType<typeof reconstructCreRenderedLayoutRepairSuccessor>>["graph"];
  secretScan: "PASS" | "FAIL";
}> {
  const predecessor = await reconstructCreRenderedLayoutRepairSuccessor();
  if (predecessor.artifactId !== RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`rendered_layout_successor_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`rendered_layout_successor_digest_drift:${predecessor.digest}`);
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
    contract: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SITE_CONTRACT,
  });
  const files = composePublicLineageQuestionIdRepairFiles({
    files: predecessor.files,
    artifactId,
    predecessorArtifactId: predecessor.artifactId,
    predecessorDigest: predecessor.digest,
  });
  void LOCKED_CRE_EXPERIMENT_ID;
  return {
    artifactId,
    digest: digestOfAuthorityFiles(files),
    predecessorArtifactId: RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    repairReason: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON,
    immutable: true,
    deployed: false,
    liveArtifactMutated: false,
    files,
    architecture: predecessor.architecture,
    graph: predecessor.graph,
    secretScan: evaluateSecretSafety(files).status,
  };
}
