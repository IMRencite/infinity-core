import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan, executeGovernedVentureBuild, runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  creDesignContext,
  planCreativeAssets,
  planPublicVentureComposition,
  produceVentureDesignTokens,
} from "@/lib/infinity/public-venture-design";
import { DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON, DIRECT_RESPONSE_AUTHORITY_SITE_CONTRACT } from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeDirectResponseAuthoritySiteArtifact } from "./compose-direct-response";
import { creAuthoritySources } from "./geo-seo-architecture";
import { digestOfAuthorityFiles } from "./cre-successor";
import { pinHistoricalLockedFooter } from "./locked-predecessor-footer";
import { planVentureSiteArchitecture } from "./site-architecture-planner";
import { planSiteExpansion } from "./site-expansion-planner";
import { creSiteArchitectureInput } from "./cre-context";
import { buildSiteKnowledgeGraph } from "./site-knowledge-graph";

export async function reconstructCreDirectResponseSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
  repairReason: typeof DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON;
  immutable: true;
  deployed: false;
  files: Array<{ path: string; content: string }>;
  architecture: ReturnType<typeof planVentureSiteArchitecture>;
  graph: ReturnType<typeof buildSiteKnowledgeGraph>;
  quality: ReturnType<typeof composeDirectResponseAuthoritySiteArtifact>["quality"];
  contentReport: ReturnType<typeof composeDirectResponseAuthoritySiteArtifact>["contentReport"];
  secretScan: "PASS" | "FAIL";
  creative: ReturnType<typeof planCreativeAssets>;
  expansion: ReturnType<typeof planSiteExpansion>;
}> {
  const compile = compileCreValidationArtifactInput({
    candidateId: CRE_CANDIDATE_ID,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  });
  const compiled = compileExecutableVenturePlan(compile);
  if (!compiled.buildPackage) throw new Error("cre_validation_package_missing");
  const built = await executeGovernedVentureBuild({ compile });
  const predecessorFiles = pinHistoricalLockedFooter(built.artifact?.files ?? []);
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: compiled.plan.planId,
    packageId: compiled.buildPackage.packageId,
    packageVersion: compiled.buildPackage.packageVersion,
    contract: DIRECT_RESPONSE_AUTHORITY_SITE_CONTRACT,
  });
  const context = creSiteArchitectureInput(compiled.plan.ventureId);
  const architecture = planVentureSiteArchitecture(context, { includeDirectResponseSuccessorPages: true });
  const graph = buildSiteKnowledgeGraph(architecture);
  const designContext = creDesignContext();
  const tokens = produceVentureDesignTokens(designContext);
  const composition = planPublicVentureComposition(designContext);
  const creative = planCreativeAssets({ context: designContext, composition });
  const evidence = creAuthoritySources(CANONICAL_EVIDENCE_START);
  const composed = composeDirectResponseAuthoritySiteArtifact({
    context,
    files: predecessorFiles,
    artifactId,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    ventureId: compiled.plan.ventureId,
    candidateId: CRE_CANDIDATE_ID,
    predecessorArtifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
    architecture,
    graph,
    evidence,
    tokens,
    creative,
  });
  return {
    artifactId,
    digest: digestOfAuthorityFiles(composed.files),
    predecessorArtifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
    repairReason: DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON,
    immutable: true,
    deployed: false,
    files: composed.files,
    architecture,
    graph,
    quality: composed.quality,
    contentReport: composed.contentReport,
    secretScan: evaluateSecretSafety(composed.files).status,
    creative,
    expansion: planSiteExpansion(architecture),
  };
}

export async function validateCreDirectResponseSuccessorIsolated(): Promise<{
  successor: Awaited<ReturnType<typeof reconstructCreDirectResponseSuccessor>>;
  npmCi: "PASS" | "FAIL";
  typescript: "PASS" | "FAIL" | "NOT_APPLICABLE";
  productionBuild: "PASS" | "FAIL";
}> {
  const successor = await reconstructCreDirectResponseSuccessor();
  const isolated = await runIsolatedArtifactInstallAndBuild({ files: successor.files });
  return {
    successor,
    npmCi: isolated.installResult,
    typescript: isolated.typescript,
    productionBuild: isolated.nextProductionBuild,
  };
}
